import React, { useState } from 'react';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import firebase from 'firebase/compat/app';
import { updateLocalStatsBuffer } from '../../utils/impactEngine';

const ReceiptLogger = ({ businesses }) => {
    const { currentUser, isGuest, guestId, addLocalActivity } = useAuth();
    const [bizId, setBizId] = useState('');
    const [receipt, setReceipt] = useState('');
    const [amount, setAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const updateLocalStats = (type, amt = 0) => {
        const key = isGuest ? 'bfg_guest_personal_stats' : 'bfg_personal_stats';
        const personalSaved = localStorage.getItem(key);
        let currentStats = { totalCheckins: 0, totalPurchases: 0 };
        try {
            if (personalSaved) currentStats = JSON.parse(personalSaved);
        } catch (e) {}

        const business = (businesses || []).find(b => b.id === bizId);
        const pStats = updateLocalStatsBuffer(currentStats, type, business, amt);
        
        localStorage.setItem(key, JSON.stringify(pStats));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!currentUser && !isGuest) return;
        if (!bizId || !receipt || !amount) {
            setMessage({ text: 'Please fill out all fields.', type: 'error' });
            return;
        }

        setIsSubmitting(true);
        setMessage({ text: '', type: '' });

        try {
            const bizName = (businesses || []).find(b => b.id === bizId)?.name || 'Unknown Business';

            if (isGuest) {
                const guestPurchase = firebase.functions().httpsCallable('recordguestpurchase');
                const result = await guestPurchase({ 
                    bizId, 
                    guestId, 
                    amount: parseFloat(amount), 
                    receiptId: receipt 
                });
 
                if (result.data.success) {
                    setMessage({ text: 'Guest Purchase logged! Accept the Invitation to claim your status.', type: 'success' });
                    updateLocalStats('purchase', parseFloat(amount));
                    addLocalActivity(`💳 Guest Supporter supported ${bizName}`);
                } else {
                    setMessage({ text: result.data.message || 'Failed to log purchase.', type: 'error' });
                }
            } else {
                await db.collection('transactions').add({
                    type: 'purchase',
                    bizId: bizId,
                    bizName: bizName,
                    userId: currentUser.uid,
                    userNickname: currentUser.nickname || currentUser.name || 'Ambassador',
                    isGuest: false,
                    receiptId: receipt,
                    amount: parseFloat(amount),
                    status: 'pending',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                setMessage({ text: 'Purchase logged successfully! Awaiting verification.', type: 'success' });
                updateLocalStats('purchase', parseFloat(amount));
                addLocalActivity(`💳 ${currentUser.nickname || currentUser.name || 'Ambassador'} supported ${bizName}`);
            }

            setBizId('');
            setReceipt('');
            setAmount('');
        } catch (err) {
            console.error("Purchase log failed:", err);
            setMessage({ text: 'Network error. Could not log purchase.', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="glass-card slide-up" style={{ 
            marginTop: '1.5rem', 
            background: 'linear-gradient(145deg, rgba(59, 130, 246, 0.1), rgba(0,0,0,0.4))',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            padding: '1.8rem'
        }}>
            <h3 style={{ color: '#ffffff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fa-solid fa-receipt" style={{color: 'var(--accent-secondary)'}}></i> 
                Log a Purchase
            </h3>
            <p style={{color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.8rem', lineHeight: '1.5'}}>
                Submit your receipts from Conviction Network businesses to earn Economic Force badges and support the mission.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div className="search-bar" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                    <i className="fa-solid fa-store" style={{color: 'var(--accent-secondary)', marginLeft: '12px'}}></i>
                    <select 
                        value={bizId}
                        onChange={(e) => setBizId(e.target.value)}
                        style={{width: '100%', background: 'none', border: 'none', color: '#ffffff', outline: 'none', padding: '0.8rem', fontSize: '0.9rem'}}
                    >
                        <option value="" style={{color: '#000'}}>Select Business...</option>
                        {businesses?.map(b => (
                            <option key={b.id} value={b.id} style={{color: '#000'}}>{b.name}</option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.8rem' }}>
                    <div className="search-bar" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                        <i className="fa-solid fa-hashtag" style={{color: 'var(--text-secondary)', marginLeft: '12px'}}></i>
                        <input 
                            type="text" 
                            placeholder="Receipt #" 
                            value={receipt}
                            onChange={(e) => setReceipt(e.target.value)}
                            style={{width: '100%', background: 'none', border: 'none', color: '#ffffff', outline: 'none', padding: '0.8rem', fontSize: '0.9rem'}}
                        />
                    </div>

                    <div className="search-bar" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                        <span style={{color: 'var(--accent-success)', paddingLeft: '12px', fontWeight: '800', fontSize: '0.8rem'}}>RM</span>
                        <input 
                            type="number" 
                            step="0.01"
                            placeholder="0.00" 
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            style={{width: '100%', background: 'none', border: 'none', color: '#ffffff', outline: 'none', padding: '0.8rem', fontSize: '0.9rem', fontWeight: '700'}}
                        />
                    </div>
                </div>

                {message.text && (
                    <div className="slide-up" style={{
                        padding: '0.8rem',
                        borderRadius: '8px',
                        background: message.type === 'error' ? 'rgba(244, 67, 54, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: message.type === 'error' ? '#f87171' : '#34d399', 
                        textAlign: 'center', 
                        fontSize: '0.85rem',
                        border: `1px solid ${message.type === 'error' ? 'rgba(244, 67, 54, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                    }}>
                        <i className={`fa-solid ${message.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i> {message.text}
                    </div>
                )}

                <button 
                    type="submit" 
                    className="nav-btn" 
                    disabled={isSubmitting}
                    style={{
                        width: '100%', 
                        justifyContent: 'center', 
                        height: '55px',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid var(--accent-secondary)',
                        color: 'var(--accent-secondary)',
                        fontSize: '1rem',
                        fontWeight: '700',
                        marginTop: '0.5rem'
                    }}
                >
                    {isSubmitting ? (
                        <><i className="fa-solid fa-spinner fa-spin"></i> Processing...</>
                    ) : (
                        <><i className="fa-solid fa-cloud-upload"></i> Submit for Verification</>
                    )}
                </button>
            </form>
        </div>
    );
};

export default ReceiptLogger;
