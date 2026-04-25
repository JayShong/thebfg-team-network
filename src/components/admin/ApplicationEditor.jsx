import React, { useState } from 'react';

const ApplicationEditor = ({ application, onClose, onSave, isSaving, readOnly = false }) => {
    const [formData, setFormData] = useState({
        name: application.name || '',
        address: application.address || '',
        phone: application.phone || '',
        email: application.email || '',
        industry: application.industry || '',
        location: application.location || '',
        story: application.story || '',
        purpose: application.purpose || '',
        mission: application.mission || '',
        category: application.category || 'Standard'
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
            <div className="glass-card slide-up" style={{ width: '100%', maxWidth: '600px', height: 'fit-content', position: 'relative', border: '1px solid var(--primary-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>
                        <i className={`fa-solid ${readOnly ? 'fa-box-archive' : 'fa-pen-nib'}`} style={{ color: 'var(--primary-light)' }}></i> 
                        {readOnly ? ' Historical Application Record' : ' Edit Onboarding Draft'}
                    </h3>
                    <button onClick={onClose} className="btn-icon"><i className="fa-solid fa-xmark"></i></button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div className="form-group">
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Business Name</label>
                        <input type="text" name="name" className="input-modern" value={formData.name} onChange={handleChange} required disabled={readOnly} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Industry</label>
                            <input type="text" name="industry" className="input-modern" value={formData.industry} onChange={handleChange} placeholder="e.g. Cafe" required disabled={readOnly} />
                        </div>
                        <div className="form-group">
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Location / Area</label>
                            <input type="text" name="location" className="input-modern" value={formData.location} onChange={handleChange} placeholder="e.g. Bangsar" required disabled={readOnly} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Address</label>
                        <textarea name="address" className="input-modern" value={formData.address} onChange={handleChange} rows="2" required disabled={readOnly} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Contact Phone</label>
                            <input type="text" name="phone" className="input-modern" value={formData.phone} onChange={handleChange} required disabled={readOnly} />
                        </div>
                        <div className="form-group">
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Registered Email</label>
                            <input type="email" name="email" className="input-modern" value={formData.email} onChange={handleChange} disabled />
                            <small style={{ color: '#ffb84d', fontSize: '0.65rem' }}>Read-only: Tied to owner account.</small>
                        </div>
                    </div>

                    <div className="form-group">
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>The Purpose Statement</label>
                        <textarea name="purpose" className="input-modern" value={formData.purpose} onChange={handleChange} placeholder="What is the core purpose of this business?" rows="2" disabled={readOnly} />
                    </div>

                    <div className="form-group">
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>The Founder's Story</label>
                        <textarea name="story" className="input-modern" value={formData.story} onChange={handleChange} placeholder="Tell us about the journey and convictions..." rows="4" disabled={readOnly} />
                    </div>

                    <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                        <button type="button" onClick={onClose} className="nav-btn" style={{ flex: 1, justifyContent: 'center' }}>
                            {readOnly ? 'Close' : 'Cancel'}
                        </button>
                        {!readOnly && (
                            <button type="submit" className="nav-btn active" style={{ flex: 2, justifyContent: 'center' }} disabled={isSaving}>
                                {isSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-floppy-disk"></i> Save Draft</>}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ApplicationEditor;
