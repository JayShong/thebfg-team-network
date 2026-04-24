
/**
 * Configuration for the Conviction Network Badge System
 * SCALE-FIRST: Uses the localStorage scorecard (O(1)) for instant UX feedback.
 * Note: Permanent data writes are now handled SECURELY by Cloud Functions.
 */
const BADGES_CONFIG = [
    // Seen (Visibility)
    { 
        id: 'seen_first_step', title: 'The First Step', category: 'Seen', 
        condition: (u, stats) => (stats.totalCheckins || 0) + (stats.totalPurchases || 0) >= 1 
    },
    { 
        id: 'seen_explorer', title: 'The Explorer', category: 'Seen', 
        condition: (u, stats) => Object.keys(stats.uniqueBizIds || {}).length >= 3 
    },
    { 
        id: 'seen_pathfinder', title: 'The Pathfinder', category: 'Seen', 
        condition: (u, stats) => Object.keys(stats.uniqueBizIds || {}).length >= 7 
    },
    { 
        id: 'seen_cartographer', title: 'The Cartographer', category: 'Seen', 
        condition: (u, stats) => Object.keys(stats.uniqueBizIds || {}).length >= 15 
    },
    { 
        id: 'seen_nomad', title: 'Neighborhood Nomad', category: 'Seen', 
        condition: (u, stats) => Object.keys(stats.uniqueLocations || {}).length >= 3 
    },
    { 
        id: 'seen_sector_specialist', title: 'Sector Specialist', category: 'Seen', 
        condition: (u, stats) => Object.keys(stats.uniqueIndustries || {}).length >= 3 
    },
    
    { 
        id: 'seen_night_owl', title: 'Night Owl', category: 'Seen', 
        condition: () => new Date().getHours() >= 20 
    },
    { 
        id: 'seen_early_bird', title: 'Early Bird', category: 'Seen', 
        condition: () => new Date().getHours() < 9 
    },

    // Verified (Verification)
    { 
        id: 'verified_zero_waste', title: 'Zero Waste Partner', category: 'Verified', 
        condition: (u, stats) => (stats.totalCheckins || 0) >= 5 
    },
    
    // Valued (Appreciation)
    { 
        id: 'valued_consummate', title: 'Consummate Supporter', category: 'Valued', 
        condition: (u, stats) => (stats.totalPurchases || 0) >= 10 
    },
    { 
        id: 'valued_local_legend', title: 'Local Legend', category: 'Valued', 
        condition: (u, stats) => {
            // This would need specific per-biz counters in stats to be accurate locally
            return false; // Handled by server for final word
        }
    },
    { 
        id: 'valued_monday_motivator', title: 'Monday Motivator', category: 'Valued', 
        condition: () => new Date().getDay() === 1 
    },
    { 
        id: 'valued_weekend', title: 'Weekend Philanthropist', category: 'Valued', 
        condition: () => [0, 6].includes(new Date().getDay()) 
    }
];

/**
 * Client-side badge evaluation for INSTANT UX feedback.
 * Uses localStorage to avoid expensive Firestore reads.
 */
export const evaluateBadges = async (user) => {
    if (!user) return [];
    
    try {
        const saved = localStorage.getItem('bfg_personal_stats');
        if (!saved) return [];

        const stats = JSON.parse(saved);
        const currentBadges = user.badges || {};
        const newlyUnlocked = [];

        BADGES_CONFIG.forEach(badge => {
            // If the user doesn't have it yet and they meet the criteria based on local stats
            if (!currentBadges[badge.id] && badge.condition(user, stats)) {
                newlyUnlocked.push(badge.title);
            }
        });

        // NOTE: We do NOT write to the database here. 
        // The Cloud Function will securely handle the permanent unlock.
        return newlyUnlocked;

    } catch (e) {
        console.error("Local badge evaluation failed:", e);
    }
    return [];
};
