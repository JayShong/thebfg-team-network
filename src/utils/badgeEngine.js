import { db } from '../services/firebase';
import firebase from 'firebase/compat/app';

const BADGES_CONFIG = [
    // Seen (Visibility)
    { id: 'seen_first_step', title: 'The First Step', category: 'Seen', condition: (u, logs) => (u.checkins || 0) + (u.purchases || 0) >= 1 },
    { id: 'seen_explorer', title: 'The Explorer', category: 'Seen', condition: (u, logs) => new Set(logs.map(l => l.bizId)).size >= 3 },
    { id: 'seen_pathfinder', title: 'The Pathfinder', category: 'Seen', condition: (u, logs) => new Set(logs.map(l => l.bizId)).size >= 7 },
    { id: 'seen_cartographer', title: 'The Cartographer', category: 'Seen', condition: (u, logs) => new Set(logs.map(l => l.bizId)).size >= 15 },
    
    // Verified (Verification)
    { id: 'verified_zero_waste', title: 'Zero Waste Partner', category: 'Verified', condition: (u, logs) => logs.filter(l => l.type === 'checkin').length >= 5 },
    
    // Valued (Appreciation)
    { id: 'valued_consummate', title: 'Consummate Supporter', category: 'Valued', condition: (u, logs) => (u.purchases || 0) >= 10 },
    { id: 'valued_local_legend', title: 'Local Legend', category: 'Valued', condition: (u, logs) => {
        const counts = {};
        logs.filter(l => l.type === 'checkin').forEach(l => counts[l.bizId] = (counts[l.bizId] || 0) + 1);
        return Math.max(0, ...Object.values(counts)) >= 5;
    }}
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
