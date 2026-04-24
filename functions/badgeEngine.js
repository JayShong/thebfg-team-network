
/**
 * Configuration for the Conviction Network Badge System
 * SCALE-FIRST: Uses incremental stats (O(1)) instead of historical scans (O(N)).
 */
const BADGES_CONFIG = [
    // SEEN
    { 
        id: 'seen_first_step', title: 'The First Step', category: 'Seen',
        condition: (txn, stats) => (stats.totalCheckins || 0) + (stats.totalPurchases || 0) >= 1
    },
    { 
        id: 'seen_explorer', title: 'The Explorer', category: 'Seen',
        condition: (txn, stats) => Object.keys(stats.uniqueBizIds || {}).length >= 3
    },
    { 
        id: 'seen_pathfinder', title: 'The Pathfinder', category: 'Seen',
        condition: (txn, stats) => Object.keys(stats.uniqueBizIds || {}).length >= 7
    },
    { 
        id: 'seen_cartographer', title: 'The Cartographer', category: 'Seen',
        condition: (txn, stats) => Object.keys(stats.uniqueBizIds || {}).length >= 15
    },
    { 
        id: 'seen_nomad', title: 'Neighborhood Nomad', category: 'Seen',
        condition: (txn, stats) => Object.keys(stats.uniqueLocations || {}).length >= 3
    },
    { 
        id: 'seen_sector_specialist', title: 'Sector Specialist', category: 'Seen',
        condition: (txn, stats) => Object.keys(stats.uniqueIndustries || {}).length >= 3
    },
    { 
        id: 'seen_night_owl', title: 'Night Owl', category: 'Seen',
        condition: (txn) => {
            const date = txn.timestamp?.toDate ? txn.timestamp.toDate() : new Date();
            return date.getHours() >= 20;
        }
    },
    { 
        id: 'seen_early_bird', title: 'Early Bird', category: 'Seen',
        condition: (txn) => {
            const date = txn.timestamp?.toDate ? txn.timestamp.toDate() : new Date();
            return date.getHours() < 9;
        }
    },

    // VERIFIED
    { 
        id: 'verified_zero_waste', title: 'Zero Waste Partner', category: 'Verified',
        condition: (txn, stats) => (stats.totalCheckins || 0) >= 5
    },
    
    // VALUED
    { 
        id: 'valued_consummate', title: 'Consummate Supporter', category: 'Valued',
        condition: (txn, stats) => (stats.totalPurchases || 0) >= 10
    },
    { 
        id: 'valued_local_legend', title: 'Local Legend', category: 'Valued',
        condition: (txn, stats) => (stats.bizVisits?.[txn.bizId] || 0) >= 5
    },
    { 
        id: 'valued_monday_motivator', title: 'Monday Motivator', category: 'Valued',
        condition: (txn) => {
            const date = txn.timestamp?.toDate ? txn.timestamp.toDate() : new Date();
            return date.getDay() === 1; // 1 = Monday
        }
    },
    { 
        id: 'valued_weekend', title: 'Weekend Philanthropist', category: 'Valued',
        condition: (txn) => {
            const date = txn.timestamp?.toDate ? txn.timestamp.toDate() : new Date();
            return [0, 6].includes(date.getDay()); // 0 = Sunday, 6 = Saturday
        }
    }
];

/**
 * Evaluates tiers based on badge categories
 */
const evaluateTier = (userBadges) => {
    let totalUnlocked = 0;
    const categoryCounts = { 'Seen': 0, 'Verified': 0, 'Valued': 0 };
    
    BADGES_CONFIG.forEach(b => {
        if (userBadges && userBadges[b.id] && userBadges[b.id].unlocked) {
            totalUnlocked++;
            if (categoryCounts[b.category] !== undefined) {
                categoryCounts[b.category]++;
            }
        }
    });

    const isMastery = (cat) => categoryCounts[cat] >= 3;

    if (totalUnlocked >= 30) return 'Platinum';
    if (totalUnlocked >= 15 && isMastery('Seen') && isMastery('Verified') && isMastery('Valued')) return 'Gold';
    if (totalUnlocked >= 5 && isMastery('Seen')) return 'Silver';
    return 'Blue';
};

/**
 * Server-side badge evaluation (O(1))
 * Triggered by transaction creation
 */
const evaluateBadges = async (txn, stats, userDoc) => {
    const currentBadges = userDoc.data().badges || {};
    const newlyUnlocked = [];

    BADGES_CONFIG.forEach(badge => {
        if (!currentBadges[badge.id] && badge.condition(txn, stats)) {
            currentBadges[badge.id] = {
                unlocked: true,
                date: new Date().toISOString(),
                title: badge.title
            };
            newlyUnlocked.push(badge.title);
        }
    });

    if (newlyUnlocked.length > 0) {
        const tier = evaluateTier(currentBadges);
        await userDoc.ref.update({
            badges: currentBadges,
            tier: tier
        });
        return newlyUnlocked;
    }
    return [];
};

module.exports = {
    BADGES_CONFIG,
    evaluateTier,
    evaluateBadges
};
