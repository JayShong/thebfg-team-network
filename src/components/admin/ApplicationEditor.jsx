import React, { useState } from 'react';

const INDUSTRIES = [
    'Arts & Culture', 'Business Support Services', 'Cafe and Restaurants',
    'Community', 'Ecological Stewardship', 'Education & Talent',
    'Finance', 'Food Systems', 'Gifts & Crafts', 'Health & Wellness',
    'Housing & Living', 'Manufacturing & Logistics', 'Personal Support Services',
    'Pets', 'Repairs, Recycling & Sharing', 'Social Events',
    'Sports', 'Tourism & Nature', 'Transportation & Mobility'
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

    const SectionHeader = ({ icon, title }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', marginTop: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
            <i className={`fa-solid ${icon}`} style={{ color: 'var(--accent-primary)', fontSize: '0.9rem' }}></i>
            <h4 style={{ margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>{title}</h4>
        </div>
    );

    return (
        <div className="glass-card slide-up" style={{ 
            width: '100%', 
            maxWidth: '800px', 
            maxHeight: '90vh', 
            display: 'flex', 
            flexDirection: 'column', 
            padding: 0, 
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}>
            {/* Modal Header */}
            <div style={{ padding: '1.5rem 2rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800' }}>
                        {readOnly ? 'Identity Record' : 'Strategic Profile Editor'}
                    </h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {readOnly ? 'Historical verification data' : 'Refine the business narrative and core metadata'}
                    </p>
                </div>
                <button onClick={onClose} className="icon-btn" style={{ fontSize: '1.5rem', opacity: 0.6 }}><i className="fa-solid fa-times"></i></button>
            </div>

            {/* Scrollable Content */}
            <form onSubmit={handleSubmit} style={{ padding: '2rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                {/* 1. Core Identity */}
                <div>
                    <SectionHeader icon="fa-fingerprint" title="Core Identity" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label className="label-modern">Shop / Brand Name</label>
                            <input type="text" name="name" className="input-modern" style={{ fontSize: '1rem' }} value={formData.name} onChange={handleChange} placeholder="Publicly visible name" required disabled={readOnly} />
                        </div>
                        <div className="form-group">
                            <label className="label-modern">Founder Name</label>
                            <input type="text" name="founder" className="input-modern" style={{ fontSize: '1rem' }} value={formData.founder} onChange={handleChange} placeholder="Founder / Owner" disabled={readOnly} />
                        </div>
                    </div>
                </div>

                {/* 2. Classification & Governance */}
                <div>
                    <SectionHeader icon="fa-tags" title="Classification" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label className="label-modern">Industry Sector</label>
                            <select name="industry" className="input-modern" style={{ fontSize: '1rem', height: '52px' }} value={formData.industry} onChange={handleChange} disabled={readOnly}>
                                <option value="">Select Sector</option>
                                {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="label-modern">Company Registration No.</label>
                            <input type="text" name="registrationNumber" className="input-modern" style={{ fontSize: '1rem' }} value={formData.registrationNumber} onChange={handleChange} placeholder="SSM / Legal ID" disabled={readOnly} />
                        </div>
                    </div>
                </div>

                {/* 3. Physical Presence */}
                <div>
                    <SectionHeader icon="fa-location-dot" title="Location & Access" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label className="label-modern">Area / Neighborhood</label>
                            <input type="text" name="location" className="input-modern" style={{ fontSize: '1rem' }} value={formData.location} onChange={handleChange} placeholder="e.g. Bangsar, KL" disabled={readOnly} />
                        </div>
                        <div className="form-group">
                            <label className="label-modern">Google Maps URL</label>
                            <input type="url" name="googleMapsUrl" className="input-modern" style={{ fontSize: '1rem' }} value={formData.googleMapsUrl} onChange={handleChange} placeholder="https://maps.google.com/..." disabled={readOnly} />
                        </div>
                        <div className="form-group">
                            <label className="label-modern">Full Physical Address</label>
                            <textarea name="address" className="input-modern" style={{ fontSize: '1rem' }} value={formData.address} onChange={handleChange} rows="2" disabled={readOnly} />
                        </div>
                    </div>
                </div>

                {/* 4. Contact & Communication */}
                <div>
                    <SectionHeader icon="fa-headset" title="Communication" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label className="label-modern">Direct Contact Phone</label>
                            <input type="text" name="phone" className="input-modern" style={{ fontSize: '1rem' }} value={formData.phone} onChange={handleChange} required disabled={readOnly} />
                        </div>
                        <div className="form-group">
                            <label className="label-modern">Registered Email (Immutable)</label>
                            <input type="email" name="email" className="input-modern" style={{ fontSize: '1rem', opacity: 0.6 }} value={formData.email} disabled />
                        </div>
                    </div>
                </div>

                {/* 5. The Narrative (Story & Purpose) */}
                <div>
                    <SectionHeader icon="fa-feather-pointed" title="Network Narrative" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label className="label-modern">Purpose Statement (The "Why")</label>
                            <textarea name="purposeStatement" className="input-modern" style={{ fontSize: '1.05rem', lineHeight: '1.6' }} value={formData.purposeStatement} onChange={handleChange} placeholder="What is the core purpose of this business?" rows="3" disabled={readOnly} />
                        </div>
                        <div className="form-group">
                            <label className="label-modern">The Founder's Story</label>
                            <textarea name="story" className="input-modern" style={{ fontSize: '1.05rem', lineHeight: '1.6' }} value={formData.story} onChange={handleChange} placeholder="The journey, the convictions, the future..." rows="6" disabled={readOnly} />
                        </div>
                    </div>
                </div>
            </form>

            {/* Modal Footer */}
            <div style={{ padding: '1.5rem 2rem', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={onClose} className="btn glass-card" style={{ flex: 1, height: '52px', fontSize: '1rem', fontWeight: '600' }}>
                    {readOnly ? 'Close Record' : 'Discard Changes'}
                </button>
                {!readOnly && (
                    <button type="submit" onClick={handleSubmit} className="btn btn-primary" style={{ flex: 2, height: '52px', fontSize: '1.1rem', fontWeight: '800' }} disabled={isSaving}>
                        {isSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-floppy-disk"></i> Commit Profile Updates</>}
                    </button>
                )}
            </div>
        </div>
    );
};

export default ApplicationEditor;
