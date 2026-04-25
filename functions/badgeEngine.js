/**
 * JOURNEY_MAP: Defines the 4-stage journey names for all 19 industry sectors (Visits/Check-ins).
 */
const JOURNEY_MAP = {
    'Arts & Culture': ['Curiosity', 'Patron', 'Visionary', 'Cultural Custodian'],
    'Business Support Services': ['Associate', 'Partner', 'Architect', 'Alliance Builder'],
    'Cafe and Restaurants': ['Taster', 'Regular', 'Connoisseur', 'Dining Diplomat'],
    'Community': ['Neighbor', 'Participant', 'Steward', 'Community Anchor'],
    'Ecological Stewardship': ['Green Shoot', 'Deep Root', 'Canopy Guardian', 'Forest Sovereign'],
    'Education & Talent': ['Learner', 'Mentee', 'Scholar', 'Talent Luminary'],
    'Finance': ['Saver', 'Investor', 'Wealth Weaver', 'Economic Architect'],
    'Food Systems': ['Harvester', 'Provisioner', 'Nutritionist', 'System Sower'],
    'Gifts & Crafts': ['Collector', 'Appreciator', 'Artisan Ally', 'Master Craftsperson'],
    'Health & Wellness': ['Seeker', 'Practitioner', 'Healer', 'Vitality Vanguard'],
    'Housing & Living': ['Resident', 'Homemaker', 'Habitat Hero', 'Living Legend'],
    'Manufacturing & Logistics': ['Maker', 'Fabricator', 'Industrialist', 'Logistics Lord'],
    'Personal Support Services': ['Friend', 'Caregiver', 'Guardian', 'Empathy Engine'],
    'Pets': ['Animal Lover', 'Pet Parent', 'Wildlife Warrior', 'Species Steward'],
    'Repairs, Recycling & Sharing': ['Fixer', 'Mender', 'Resource Weaver', 'Circular Champion'],
    'Social Events': ['Guest', 'Attendee', 'Host', 'Event Maestro'],
    'Sports': ['Player', 'Athlete', 'Champion', 'Sportsmanship Sovereign'],
    'Tourism & Nature': ['Traveler', 'Explorer', 'Wayfinder', 'Nature Nomad'],
    'Transportation & Mobility': ['Commuter', 'Navigator', 'Transit Titan', 'Mobility Master']
};

/**
 * PURCHASE_JOURNEY_MAP: Defines the 4-stage journey names for financial commitment (Verified Purchases).
 */
const PURCHASE_JOURNEY_MAP = {
    'Arts & Culture': ['Arts Ally', 'Benefactor', 'Creative Catalyst', 'Patron of the Arts'],
    'Business Support Services': ['Client', 'Contractor', 'Strategy Partner', 'Economic Engine'],
    'Cafe and Restaurants': ['Diner', 'Gastronome', 'Epicurean', 'Culinary Pillar'],
    'Community': ['Donor', 'Sponsor', 'Civic Stakeholder', 'Community Benefactor'],
    'Ecological Stewardship': ['Eco-Contributor', 'Regenerative Investor', 'Climate Stakeholder', 'Earth Benefactor'],
    'Education & Talent': ['Student', 'Knowledge Seeker', 'Scholarship Endower', 'Knowledge Pillar'],
    'Finance': ['Capital Contributor', 'Active Investor', 'Capital Architect', 'Market Maker'],
    'Food Systems': ['Market Member', 'Provisioner', 'Nutrition Architect', 'System Stakeholder'],
    'Gifts & Crafts': ['Guild Member', 'Artisan Patron', 'Heritage Collector', 'Legacy Guardian'],
    'Health & Wellness': ['Wellness Ally', 'Vitality Investor', 'Longevity Leader', 'Wellness Pillar'],
    'Housing & Living': ['Resident Ally', 'Property Partner', 'Housing Hero', 'Estate Elder'],
    'Manufacturing & Logistics': ['Supply Supporter', 'Manufacturer', 'Industrial Pillar', 'Logistics Mogul'],
    'Personal Support Services': ['Care Contributor', 'Personal Partner', 'Empathy Investor', 'Support Sovereign'],
    'Pets': ['Pet Provider', 'Animal Advocate', 'Vet Vanguard', 'Species Savior'],
    'Repairs, Recycling & Sharing': ['Circularity Supporter', 'Repair Investor', 'Sharing Sage', 'Circular Titan'],
    'Social Events': ['Event Sponsor', 'Social Stakeholder', 'Gathering Grandmaster', 'Festive Pillar'],
    'Sports': ['Sports Sponsor', 'Athletic Investor', 'Performance Pillar', 'Sportsmanship Legend'],
    'Tourism & Nature': ['Nature Patron', 'Exploration Investor', 'Eco-Tourist', 'Nature Navigator'],
    'Transportation & Mobility': ['Transit Supporter', 'Mobility Investor', 'Connectivity Catalyst', 'Mobility Master']
};

/**
 * UNIVERSAL_JOURNEYS: Multi-stage journeys that are not sector-specific.
 */
const UNIVERSAL_JOURNEYS = [
    {
        id: 'journey_verified_universal',
        titles: ['The Impact Seeker', 'Verified Voyager', 'Transparency Trailblazer', 'Paradigm Pioneer'],
        category: 'Verified',
        condition: (index, stats, seasonalThresholds) => {
            const totalVerified = (seasonalThresholds && seasonalThresholds['totalVerified']) || 10;
            const ratios = [0.05, 0.25, 0.50, 0.85];
            const target = Math.max(2, Math.ceil(totalVerified * ratios[index]));
            return Object.keys(stats.uniqueVerifiedBizIds || {}).length >= target;
        }
    },
    {
        id: 'journey_ambassador',
        titles: ['The Scout', 'The Envoy', 'The Architect', 'The Network Legend'],
        category: 'Seen',
        condition: (index, stats) => {
            const targets = [1, 3, 7, 15];
            return Object.keys(stats.uniqueRecommendedBizIds || {}).length >= targets[index];
        }
    }
];

/**
 * Generate 156+ unique badges.
 */
const GENERATED_BADGES = [];
const RATIOS = [0.05, 0.25, 0.50, 0.85];
const MINS = [2, 5, 12, 25];

// 1. Generate Presence Badges (Visits)
Object.entries(JOURNEY_MAP).forEach(([sector, titles]) => {
    titles.forEach((title, index) => {
        GENERATED_BADGES.push({
            id: `journey_seen_${sector.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${index}`,
            title, sector, category: 'Seen',
            condition: (txn, stats, seasonalThresholds) => {
                const sectorTotal = (seasonalThresholds && seasonalThresholds[sector]) || 10;
                const target = Math.max(MINS[index], Math.ceil(sectorTotal * RATIOS[index]));
                return Object.keys(stats.bizVisits || {}).length >= target;
            }
        });
    });
});

// 2. Generate Financial Badges (Purchases)
Object.entries(PURCHASE_JOURNEY_MAP).forEach(([sector, titles]) => {
    titles.forEach((title, index) => {
        GENERATED_BADGES.push({
            id: `journey_valued_${sector.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${index}`,
            title, sector, category: 'Valued',
            condition: (txn, stats, seasonalThresholds) => {
                const sectorTotal = (seasonalThresholds && seasonalThresholds[sector]) || 10;
                const target = Math.max(MINS[index], Math.ceil(sectorTotal * RATIOS[index]));
                return Object.keys(stats.bizPurchases || {}).length >= target;
            }
        });
    });
});

// 3. Generate Universal Badges
UNIVERSAL_JOURNEYS.forEach(journey => {
    journey.titles.forEach((title, index) => {
        GENERATED_BADGES.push({
            id: `${journey.id}_${index}`,
            title, category: journey.category,
            condition: (txn, stats, seasonalThresholds) => journey.condition(index, stats, seasonalThresholds)
        });
    });
});

const BADGES_CONFIG = [
    ...GENERATED_BADGES,
    { 
        id: 'impact_carbon_crusader', title: 'Carbon Crusader', category: 'Verified',
        condition: (txn, stats) => (stats.totalTrees || 0) >= 10
    },
    { 
        id: 'impact_waste_warrior', title: 'Waste Warrior', category: 'Verified',
        condition: (txn, stats) => (stats.totalWaste || 0) >= 50
    }
];

/**
 * Evaluates tiers based on badge counts
 */
const evaluateTier = (userBadges) => {
    const totalUnlocked = Object.values(userBadges || {}).filter(b => b.unlocked).length;
    
    // Tier boundaries (Scaled for 152+ badges)
    if (totalUnlocked >= 100) return 'Legend';
    if (totalUnlocked >= 40) return 'Guardian';
    if (totalUnlocked >= 10) return 'Steward';
    return 'Scout';
};

/**
 * Pure function to evaluate which badges should be unlocked.
 */
const evaluateBadges = (txn, stats, currentBadges = {}, seasonalThresholds = {}) => {
    const newlyUnlocked = [];
    const updatedBadges = { ...currentBadges };

    BADGES_CONFIG.forEach(badge => {
        if (!updatedBadges[badge.id] && badge.condition(txn, stats, seasonalThresholds)) {
            updatedBadges[badge.id] = {
                unlocked: true,
                date: new Date().toISOString(),
                title: badge.title,
                sector: badge.sector,
                category: badge.category
            };
            newlyUnlocked.push(badge.title);
        }
    });

    return { 
        updatedBadges, 
        newlyUnlocked,
        tier: evaluateTier(updatedBadges)
    };
};

module.exports = {
    BADGES_CONFIG,
    evaluateTier,
    evaluateBadges
};
