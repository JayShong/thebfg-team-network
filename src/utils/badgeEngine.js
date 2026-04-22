import { db } from '../services/firebase';
import firebase from 'firebase/compat/app';

const BADGES_CONFIG = [
    // Seen (Visibility)
    { id: 'seen_first_step', title: 'The First Step', category: 'Seen', condition: (u, logs) => (u.checkins || 0) + (u.purchases || 0) >= 1 },
    { id: 'seen_explorer', title: 'The Explorer', category: 'Seen', condition: (u, logs) => new Set(logs.map(l => l.bizId)).size >= 3 },
    { id: 'seen_pathfinder', title: 'The Pathfinder', category: 'Seen', condition: (u, logs) => new Set(logs.map(l => l.bizId)).size >= 7 },
    { id: 'seen_cartographer', title: 'The Cartographer', category: 'Seen', condition: (u, logs) => new Set(logs.map(l => l.bizId)).size >= 15 },
    { id: 'seen_nomad', title: 'Neighborhood Nomad', category: 'Seen', condition: (u, logs) => new Set(logs.filter(l => l.bizLocation).map(l => l.bizLocation)).size >= 3 },
    { id: 'seen_sector_specialist', title: 'Sector Specialist', category: 'Seen', condition: (u, logs) => new Set(logs.filter(l => l.bizIndustry).map(l => l.bizIndustry)).size >= 3 },
    
    { id: 'seen_night_owl', title: 'Night Owl', category: 'Seen', condition: (u, logs) => logs.some(l => {
        const date = l.timestamp?.toDate ? l.timestamp.toDate() : new Date(l.timestamp);
        return date.getHours() >= 20;
    })},
    { id: 'seen_early_bird', title: 'Early Bird', category: 'Seen', condition: (u, logs) => logs.some(l => {
        const date = l.timestamp?.toDate ? l.timestamp.toDate() : new Date(l.timestamp);
        return date.getHours() < 9;
    })},

    // Verified (Verification)
    { id: 'verified_zero_waste', title: 'Zero Waste Partner', category: 'Verified', condition: (u, logs) => logs.filter(l => l.type === 'checkin').length >= 5 },
    
    // Valued (Appreciation)
    { id: 'valued_consummate', title: 'Consummate Supporter', category: 'Valued', condition: (u, logs) => (u.purchases || 0) >= 10 },
    { id: 'valued_local_legend', title: 'Local Legend', category: 'Valued', condition: (u, logs) => {
        const counts = {};
        logs.filter(l => l.type === 'checkin').forEach(l => counts[l.bizId] = (counts[l.bizId] || 0) + 1);
        return Math.max(0, ...Object.values(counts)) >= 5;
    }},
    { id: 'valued_monday_motivator', title: 'Monday Motivator', category: 'Valued', condition: (u, logs) => logs.some(l => {
        const date = l.timestamp?.toDate ? l.timestamp.toDate() : new Date(l.timestamp);
        return date.getDay() === 1; // 1 = Monday
    })},
    { id: 'valued_weekend', title: 'Weekend Philanthropist', category: 'Valued', condition: (u, logs) => logs.some(l => {
        const date = l.timestamp?.toDate ? l.timestamp.toDate() : new Date(l.timestamp);
        return date.getDay() === 0 || date.getDay() === 6; // 0 = Sunday, 6 = Saturday
    })}
];

export const evaluateBadges = async (user) => {
    if (!user) return;
    
    try {
        // Fetch recent activity for condition checking
        const transSnap = await db.collection('transactions')
            .where('userId', '==', user.uid)
            .get();
        
        const logs = transSnap.docs.map(doc => doc.data());
        const currentBadges = user.badges || {};
        const newlyUnlocked = [];

        BADGES_CONFIG.forEach(badge => {
            if (!currentBadges[badge.id] && badge.condition(user, logs)) {
                currentBadges[badge.id] = {
                    unlocked: true,
                    date: new Date().toISOString(),
                    title: badge.title
                };
                newlyUnlocked.push(badge.title);
            }
        });

        if (newlyUnlocked.length > 0) {
            await db.collection('users').doc(user.uid).update({
                badges: currentBadges
            });
            return newlyUnlocked;
        }
    } catch (e) {
        console.error("Badge evaluation failed:", e);
    }
    return [];
};
