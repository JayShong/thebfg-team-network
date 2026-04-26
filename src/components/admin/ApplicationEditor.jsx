import React, { useState } from 'react';

const INDUSTRIES = [
    'Arts & Culture',
    'Business Support Services',
    'Cafe and Restaurants',
    'Community',
    'Ecological Stewardship',
    'Education & Talent',
    'Finance',
    'Food Systems',
    'Gifts & Crafts',
    'Health & Wellness',
    'Housing & Living',
    'Manufacturing & Logistics',
    'Personal Support Services',
    'Pets',
    'Repairs, Recycling & Sharing',
    'Social Events',
    'Sports',
    'Tourism & Nature',
    'Transportation & Mobility'
];

const ApplicationEditor = ({ application, onClose, onSave, isSaving, readOnly = false }) => {
    const [formData, setFormData] = useState({
        name: application.name || '',
        registrationNumber: application.registrationNumber || '',
        founder: application.founder || '',
        address: application.address || '',
        phone: application.phone || '',
        email: application.email || '',
        industry: application.industry || '',
        location: application.location || '',
        story: application.story || '',
        purposeStatement: application.purposeStatement || '',
        googleMapsUrl: application.googleMapsUrl || '',
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Shop / Brand Name</label>
                            <input type="text" name="name" className="input-modern" value={formData.name} onChange={handleChange} placeholder="Publicly visible name" required disabled={readOnly} />
                        </div>
                        <div className="form-group">
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Founder Name</label>
                            <input type="text" name="founder" className="input-modern" value={formData.founder} onChange={handleChange} placeholder="Founder / Owner name" disabled={readOnly} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Industry</label>
                            <select name="industry" className="input-modern" value={formData.industry} onChange={handleChange} disabled={readOnly}>
                                <option value="">Select an Industry</option>
                                {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Company Registration No.</label>
                            <input type="text" name="registrationNumber" className="input-modern" value={formData.registrationNumber} onChange={handleChange} placeholder="SSM / Legal Registration" disabled={readOnly} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Location / Area</label>
                        <input type="text" name="location" className="input-modern" value={formData.location} onChange={handleChange} placeholder="e.g. Bangsar" disabled={readOnly} />
                    </div>

                    <div className="form-group">
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Google Maps Link</label>
                        <input type="url" name="googleMapsUrl" className="input-modern" value={formData.googleMapsUrl} onChange={handleChange} placeholder="https://maps.google.com/..." disabled={readOnly} />
                    </div>

                    <div className="form-group">
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Full Address</label>
                        <textarea name="address" className="input-modern" value={formData.address} onChange={handleChange} rows="2" disabled={readOnly} />
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
                        <textarea name="purposeStatement" className="input-modern" value={formData.purposeStatement} onChange={handleChange} placeholder="What is the core purpose of this business?" rows="2" disabled={readOnly} />
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
