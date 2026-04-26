import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';

const Newsreel = () => {
    const { currentUser, isGuest, logout, recentActivity, localActivities, pendingApprovalCount } = useAuth();
    const navigate = useNavigate();
    
    const [index, setIndex] = useState(0);
    const [announcements, setAnnouncements] = useState([]);

    useEffect(() => {
        let unsubscribe = null;

        const subscribe = () => {
            if (unsubscribe) unsubscribe();
            unsubscribe = db.collection('announcements')
                .where('status', '==', 'active')
                .onSnapshot(snap => {
                    setAnnouncements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                }, err => {
                    console.warn("Announcements sub failed:", err);
                    setAnnouncements([]);
                });
        };

        // Initial sub
        subscribe();

        // Resumption Guard: Re-subscribe when user returns to tab
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log("📡 NEWSREEL: Tab visible, refreshing stream...");
                subscribe();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            if (unsubscribe) unsubscribe();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Build the queue of messages to rotate through
    const getRotationQueue = () => {
        const queue = [];

        // 1. Supervisor Alert (Always included if pending)
        if (pendingApprovalCount > 0) {
            queue.push({
                text: `⚠️ Supervisor Alert: ${pendingApprovalCount} pending audits require your approval.`,
                type: 'alert',
                action: () => navigate('/audit-hub')
            });
        }

        // 2. Live Platform Announcements
        announcements
            .filter(a => !a.targetEmail || a.targetEmail === currentUser?.email)
            .forEach(a => {
                queue.push({
                    text: `📣 ${a.message}`,
                    type: a.type || 'info',
                    action: a.link ? () => {
                        if (a.link.startsWith('http')) window.open(a.link, '_blank');
                        else navigate(a.link);
                    } : null
                });
            });

        // 2. Personal Status Message
        if (isGuest) {
            queue.push({
                text: "🔍 Exploring Mode: Join the Network to earn status & privileges.",
                type: 'guest',
                action: () => logout() // Legacy exit guest mode
            });
        } else if (currentUser?.name === 'Explorer') {
            queue.push({
                text: "Introduce yourself to the network with a nickname.",
                type: 'onboarding',
                action: () => navigate('/settings')
            });
        } else if (currentUser) {
            queue.push({
                text: `✨ Welcome back, ${currentUser.nickname || currentUser.name || 'Explorer'}! Your support strengthens the Conviction Network.`,
                type: 'welcome',
                action: null
            });
        }

        // 3. Activity Feed (Sanitized Public Activities)
        // Merge server activities with local instant injections
        const allActivity = [...localActivities, ...recentActivity];
        
        allActivity.forEach(act => {
            queue.push({
                text: act.text || "Momentum in the network...",
                type: act.type || 'activity',
                action: () => navigate(`/directory`)
            });
        });

        return queue;
    };

    const queue = getRotationQueue();

    useEffect(() => {
        if (queue.length <= 1) return;
        const interval = setInterval(() => {
            setIndex(prev => (prev + 1) % queue.length);
        }, 8000);
        return () => clearInterval(interval);
    }, [queue.length]);

    if (queue.length === 0) return <div className="newsreel hidden"></div>;

    const current = queue[index % queue.length];

    return (
        <div 
            className={`newsreel ${current?.type === 'alert' ? 'alert-mode' : ''}`}
            style={{ cursor: current?.action ? 'pointer' : 'default' }}
            onClick={() => current?.action && current.action()}
        >
            <div className="newsreel-scroll">
                {current?.text}
            </div>
        </div>
    );
};

export default Newsreel;
