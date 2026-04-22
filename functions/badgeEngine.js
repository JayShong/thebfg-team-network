
/**
 * Configuration for the Conviction Network Badge System
 * Note: Keep in sync with src/utils/badgeLogic.js
 */
const BADGES_CONFIG = [
    // SEEN
    { 
        id: 'seen_first_step', title: 'The First Step', category: 'Seen',
        condition: (u, logs) => (u.checkins || 0) + (u.purchases || 0) >= 1
    },
    { 
        id: 'seen_explorer', title: 'The Explorer', category: 'Seen',
        condition: (u, logs) => new Set(logs.map(l => l.bizId)).size >= 3
    },
    { 
        id: 'seen_pathfinder', title: 'The Pathfinder', category: 'Seen',
        condition: (u, logs) => new Set(logs.map(l => l.bizId)).size >= 7
    },
    { 
        id: 'seen_cartographer', title: 'The Cartographer', category: 'Seen',
        condition: (u, logs) => new Set(logs.map(l => l.bizId)).size >= 15
    },
    { 
        id: 'seen_nomad', title: 'Neighborhood Nomad', category: 'Seen',
        condition: (u, logs) => new Set(logs.filter(l => l.bizLocation).map(l => l.bizLocation)).size >= 3
    },
    { 
        id: 'seen_sector_specialist', title: 'Sector Specialist', category: 'Seen',
        condition: (u, logs) => new Set(logs.filter(l => l.bizIndustry).map(l => l.bizIndustry)).size >= 3
    },
    { 
        id: 'seen_night_owl', title: 'Night Owl', category: 'Seen',
        condition: (u, logs) => logs.some(l => {
            const date = l.createdAt?.toDate ? l.createdAt.toDate() : new Date(l.createdAt);
            return date.getHours() >= 20;
        })
    },
    { 
        id: 'seen_early_bird', title: 'Early Bird', category: 'Seen',
        condition: (u, logs) => logs.some(l => {
            const date = l.createdAt?.toDate ? l.createdAt.toDate() : new Date(l.createdAt);
            return date.getHours() < 9;
        })
    },

    // VERIFIED
    { 
        id: 'verified_zero_waste', title: 'Zero Waste Partner', category: 'Verified',
        condition: (u, logs) => logs.filter(l => l.type === 'checkin').length >= 5
    },
    
    // VALUED
    { 
        id: 'valued_consummate', title: 'Consummate Supporter', category: 'Valued',
        condition: (u, logs) => (u.purchases || 0) >= 10
    },
    { 
        id: 'valued_local_legend', title: 'Local Legend', category: 'Valued',
        condition: (u, logs) => {
            const counts = {};
            logs.filter(l => l.type === 'checkin').forEach(l => counts[l.bizId] = (counts[l.bizId] || 0) + 1);
            return Math.max(0, ...Object.values(counts)) >= 5;
        }
    },
    { 
        id: 'valued_monday_motivator', title: 'Monday Motivator', category: 'Valued',
        condition: (u, logs) => logs.some(l => {
            const date = l.createdAt?.toDate ? l.createdAt.toDate() : new Date(l.createdAt);
            return date.getDay() === 1;
        })
    },
    { 
        id: 'valued_weekend', title: 'Weekend Philanthropist', category: 'Valued',
        condition: (u, logs) => logs.some(l => {
            const date = l.createdAt?.toDate ? l.createdAt.toDate() : new Date(l.createdAt);
            return date.getDay() === 0 || date.getDay() === 6;
        })
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

module.exports = {
    BADGES_CONFIG,
    evaluateTier
};
