import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Newsreel = () => {
    const { currentUser, isGuest, logout, recentActivity, pendingApprovalCount } = useAuth();
    const navigate = useNavigate();
    
    const [index, setIndex] = useState(0);
    const [displayMessage, setDisplayMessage] = useState("");
    const [clickAction, setClickAction] = useState(null);

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
                text: `✨ Welcome back, ${currentUser.name}! Your support strengthens the Empathy Economy.`,
                type: 'welcome',
                action: null
            });
        }

        // 3. Activity Feed (The 20 pulled transactions)
        recentActivity.forEach(act => {
            // Defensive mapping for inconsistent legacy field names
            const uName = act.userName || act.user_name || act.name || 'Someone';
            const bName = act.bizName || act.business_name || act.biz_name || 'Business';
            
            // Handle Firestore Timestamp vs ISO String
            let timeStr = "";
            try {
                const dateObj = act.timestamp?.seconds 
                    ? new Date(act.timestamp.seconds * 1000) 
                    : (act.timestamp ? new Date(act.timestamp) : null);
                
                if (dateObj && !isNaN(dateObj.getTime())) {
                    timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
            } catch (e) {
                console.warn("Invalid date for activity:", act.timestamp);
            }

            if (act.type === 'purchase') {
                queue.push({
                    text: `💳 ${uName} supported ${bName} ${timeStr ? `@ ${timeStr}` : ''}`,
                    type: 'activity',
                    action: () => navigate(`/directory`)
                });
            } else {
                queue.push({
                    text: `📍 ${uName} checked-in at ${bName} ${timeStr ? `@ ${timeStr}` : ''}`,
                    type: 'activity',
                    action: () => navigate(`/directory`)
                });
            }
        });

        return queue;
    };

    const queue = getRotationQueue();

    useEffect(() => {
        if (queue.length === 0) return;

        // Ensure index is within bounds if queue size changes
        const safeIndex = index % queue.length;
        const current = queue[safeIndex];
        
        setDisplayMessage(current.text);
        setClickAction(() => current.action);

        const interval = setInterval(() => {
            setIndex(prev => (prev + 1) % queue.length);
        }, 8000); // 8 second rotation

        return () => clearInterval(interval);
    }, [index, recentActivity, pendingApprovalCount, isGuest, currentUser]);

    if (queue.length === 0) return <div className="newsreel hidden"></div>;

    return (
        <div 
            className={`newsreel ${queue[index % queue.length]?.type === 'alert' ? 'alert-mode' : ''}`}
            style={{ cursor: clickAction ? 'pointer' : 'default' }}
            onClick={() => clickAction && clickAction()}
        >
            {displayMessage}
        </div>
    );
};

export default Newsreel;
