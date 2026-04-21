import React, { useState } from 'react';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import firebase from 'firebase/compat/app';

const ReceiptLogger = ({ businesses }) => {
    const { currentUser } = useAuth();
    const [bizId, setBizId] = useState('');
    const [receipt, setReceipt] = useState('');
    const [amount, setAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!currentUser) return;
        if (!bizId || !receipt || !amount) {
            setMessage({ text: 'Please fill out all fields.', type: 'error' });
            return;
        }

        setIsSubmitting(true);
        setMessage({ text: '', type: '' });

        try {
            await db.collection('transactions').add({
                type: 'purchase',
                bizId: bizId,
                userId: currentUser.uid,
                userNickname: currentUser.name || 'Anonymous',
                receipt: receipt,
                amount: parseFloat(amount),
                status: 'pending',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            setMessage({ text: 'Purchase logged successfully! Awaiting verification.', type: 'success' });
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
        <div className="glass-card slide-up" style={{ marginTop: '1rem' }}>
            <h3 style={{ color: '#ffffff' }}><i className="fa-solid fa-receipt" style={{color: 'var(--primary)'}}></i> Log a Purchase</h3>
            <p style={{color: 'var(--text-secondary)', marginBottom: '1.5rem'}}>
                Submit your receipts from Conviction Network businesses to earn Economic Force badges.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="search-bar">
                    <i className="fa-solid fa-store" style={{color: 'var(--text-secondary)'}}></i>
                    <select 
                        value={bizId}
                        onChange={(e) => setBizId(e.target.value)}
                        style={{width: '100%', background: 'none', border: 'none', color: '#ffffff', outline: 'none', padding: '0.5rem'}}
                    >
                        <option value="" style={{color: '#000'}}>Select Business...</option>
                        {businesses?.map(b => (
                            <option key={b.id} value={b.id} style={{color: '#000'}}>{b.name}</option>
                        ))}
                    </select>
                </div>

                <div className="search-bar">
                    <i className="fa-solid fa-hashtag" style={{color: 'var(--text-secondary)'}}></i>
                    <input 
                        type="text" 
                        placeholder="Receipt Number" 
                        value={receipt}
                        onChange={(e) => setReceipt(e.target.value)}
                        style={{width: '100%', background: 'none', border: 'none', color: '#ffffff', outline: 'none', padding: '0.5rem'}}
                    />
                </div>

                <div className="search-bar">
                    <span style={{color: 'var(--text-secondary)', paddingLeft: '0.5rem'}}>RM</span>
                    <input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        style={{width: '100%', background: 'none', border: 'none', color: '#ffffff', outline: 'none', padding: '0.5rem'}}
                    />
                </div>

                {message.text && (
                    <div style={{
                        color: message.type === 'error' ? 'var(--accent)' : 'var(--primary)', 
                        textAlign: 'center', fontSize: '0.9rem'
                    }}>
                        {message.text}
                    </div>
                )}

                <button 
                    type="submit" 
                    className="nav-btn active" 
                    disabled={isSubmitting}
                    style={{width: '100%', justifyContent: 'center', background: 'var(--primary)', color: '#ffffff'}}
                >
                    {isSubmitting ? 'Submitting...' : 'Log Purchase'}
                </button>
            </form>
        </div>
    );
};

export default ReceiptLogger;
