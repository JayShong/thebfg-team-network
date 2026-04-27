/**
 * Impact Engine
 * 
 * This module handles the proportional logic for calculating environmental and community 
 * impact based on purchase value. This abstraction allows for "Impact Tracking" 
 * without per-unit SKU tracking.
 */

export const calculatePurchaseImpact = (business, amount) => {
    const impact = {
        wasteKg: 0,
        treesPlanted: 0,
        familiesSupported: 0,
        proportion: 0
    };

    if (!business || !business.yearlyAssessments || !amount) return impact;

    const assessments = Array.isArray(business.yearlyAssessments)
        ? business.yearlyAssessments
        : Object.values(business.yearlyAssessments);

    let latestRev = 0;
    let latestWaste = 0;
    let latestTrees = 0;

    // Find the latest assessment data (highest revenue usually correlates to latest year in current data structure)
    // Note: In future, this should use a 'year' or 'timestamp' field.
    assessments.forEach(ya => {
        const rev = parseFloat(ya.revenue?.toString().replace(/,/g, '')) || 0;
        if (rev > latestRev) {
            latestRev = rev;
            latestWaste = parseFloat(ya.wasteKg?.toString().replace(/,/g, '')) || 0;
            latestTrees = parseFloat(ya.treesPlanted?.toString().replace(/,/g, '')) || 0;
        }
    });

    if (latestRev > 0) {
        impact.proportion = parseFloat(amount) / latestRev;
        impact.wasteKg = impact.proportion * latestWaste;
        impact.treesPlanted = impact.proportion * latestTrees;
        // Community impact (Families) is often a static property of the business in current schema
        impact.familiesSupported = parseInt(business.impactJobs) || 0;
    }

    return impact;
};

/**
 * Updates a local statistics object with new activity.
 * Designed to be shared between Scanner and ReceiptLogger.
 */
export const updateLocalStatsBuffer = (currentStats, type, business, amount) => {
    const pStats = { ...currentStats };
    
    // Ensure structure
    if (!pStats.uniqueBizIds) pStats.uniqueBizIds = {};
    if (!pStats.uniqueLocations) pStats.uniqueLocations = {};
    if (!pStats.uniqueIndustries) pStats.uniqueIndustries = {};
    
    // Sector-specific unique trackers
    if (!pStats.sectorMetrics) pStats.sectorMetrics = {};

    if (business) {
        const isNewBiz = !pStats.uniqueBizIds[business.id];
        if (isNewBiz) {
            pStats.uniqueBizIds[business.id] = true;
            pStats.totalFamilies = (pStats.totalFamilies || 0) + (parseInt(business.impactJobs) || 0);
        }

        if (business.location) {
            pStats.uniqueLocations[business.location] = true;
        }
        
        if (business.industry) {
            pStats.uniqueIndustries[business.industry] = true;
            
            // Initialize sector metrics if missing
            if (!pStats.sectorMetrics[business.industry]) {
                pStats.sectorMetrics[business.industry] = { seen: {}, valued: {} };
            }

            if (type === 'checkin') {
                pStats.sectorMetrics[business.industry].seen[business.id] = true;
            } else if (type === 'purchase') {
                pStats.sectorMetrics[business.industry].valued[business.id] = true;
            }
        }
    }

    if (type === 'checkin') {
        pStats.totalCheckins = (pStats.totalCheckins || 0) + 1;
        pStats.lastCheckin = new Date().toISOString();
    } else if (type === 'purchase') {
        pStats.totalPurchases = (pStats.totalPurchases || 0) + 1;
        
        if (business && amount) {
            const impact = calculatePurchaseImpact(business, amount);
            pStats.totalWaste = (pStats.totalWaste || 0) + impact.wasteKg;
            pStats.totalTrees = (pStats.totalTrees || 0) + impact.treesPlanted;
        }
    }

    return pStats;
};
