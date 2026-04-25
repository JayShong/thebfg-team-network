import React, { useState } from 'react';
import { db } from '../../services/firebase';
import firebase from 'firebase/compat/app';

const FeedbackModal = ({ business, currentUser, onClose }) => {
    const [type, setType] = useState('General Feedback');
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!feedback.trim()) return;

        setIsSubmitting(true);
        setError(null);

        try {
            await db.collection('feedback').add({
                bizId: business.id,
                bizName: business.name,
                userId: currentUser?.uid || 'guest',
                userNickname: currentUser?.nickname || currentUser?.name || 'Explorer',
                type,
                text: feedback,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'pending'
            });

            setSuccess(true);
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (err) {
            console.error("Feedback submission error:", err);
            setError("Failed to submit feedback. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const FEEDBACK_TYPES = [
        { label: 'General Feedback', icon: 'fa-comment-dots', color: '#3B82F6' },
        { label: 'Impact Observation', icon: 'fa-binoculars', color: '#10B981' },
        { label: 'Unseen Contribution', icon: 'fa-leaf', color: '#F59E0B' },
        { label: 'Report Concern', icon: 'fa-triangle-exclamation', color: '#EF4444' }
    ];

    return (
        <div className="modal flex-center" style={{ display: 'flex', background: 'rgba(0,0,0,0.9)', zIndex: 11000 }}>
            <div className="modal-content glass-card slide-up" style={{ maxWidth: '450px', width: '95%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Share Your Observation</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                        <i className="fa-solid fa-times"></i>
                    </button>
                </div>

                {success ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <div style={{ width: '60px', height: '60px', background: 'var(--accent-success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                            <i className="fa-solid fa-check fa-2x" style={{ color: '#fff' }}></i>
                        </div>
                        <h3 style={{ color: '#fff' }}>Observation Recorded</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Thank you for contributing to the Living Signal. The network values your conviction.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            Your feedback helps refine the <strong>Living Signal</strong> for {business.name}. Be the eyes and ears of the movement.
                        </p>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Type of Observation
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                {FEEDBACK_TYPES.map(ft => (
                                    <button
                                        key={ft.label}
                                        type="button"
                                        onClick={() => setType(ft.label)}
                                        style={{
                                            background: type === ft.label ? `${ft.color}22` : 'rgba(255,255,255,0.05)',
                                            border: `1px solid ${type === ft.label ? ft.color : 'rgba(255,255,255,0.1)'}`,
                                            padding: '0.75rem',
                                            borderRadius: '10px',
                                            color: type === ft.label ? ft.color : 'var(--text-secondary)',
                                            fontSize: '0.75rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            cursor: 'pointer',
                                            textAlign: 'left'
                                        }}
                                    >
                                        <i className={`fa-solid ${ft.icon}`}></i>
                                        {ft.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Your Note
                            </label>
                            <textarea
                                className="input-modern"
                                style={{ width: '100%', minHeight: '120px', resize: 'none', padding: '1rem' }}
                                placeholder="What did you notice? Any impact stories or concerns to share with the network?"
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                required
                            />
                        </div>

                        {error && (
                            <p style={{ color: 'var(--accent-danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                <i className="fa-solid fa-triangle-exclamation"></i> {error}
                            </p>
                        )}

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn btn-secondary"
                                style={{ flex: 1 }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ flex: 2 }}
                                disabled={isSubmitting || !feedback.trim()}
                            >
                                {isSubmitting ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Submit Observation'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default FeedbackModal;
