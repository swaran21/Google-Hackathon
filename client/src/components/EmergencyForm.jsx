import { useState, useEffect } from 'react';
import { User, Phone, FileText, AlertCircle } from 'lucide-react';

const inputBase = {
  width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-input)',
  borderRadius: '16px', padding: '16px 16px 16px 48px', fontSize: '0.9rem',
  color: 'var(--text-primary)', outline: 'none', transition: 'all 0.2s', fontFamily: 'var(--font-family)',
};

const InputWithIcon = ({ icon: Icon, ...props }) => (
  <div style={{ position: 'relative' }}>
    <Icon size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', transition: 'color 0.2s', pointerEvents: 'none' }} />
    <input {...props} style={inputBase}
      onFocus={(e) => { e.target.style.borderColor = 'rgba(239,68,68,0.5)'; e.target.style.boxShadow = '0 0 0 4px rgba(239,68,68,0.08)'; e.target.previousSibling.style.color = '#ef4444'; }}
      onBlur={(e) => { e.target.style.borderColor = 'var(--border-input)'; e.target.style.boxShadow = 'none'; e.target.previousSibling.style.color = 'var(--text-muted)'; }}
    />
  </div>
);

export default function EmergencyForm({ type, typeInfo, geo, onSubmit, onBack, error }) {
  const [form, setForm] = useState({ patientName: '', patientPhone: '', description: '' });
  const [countryCode, setCountryCode] = useState('+91');
  const [localError, setLocalError] = useState('');

  // Infer default country code based on location bounds
  useEffect(() => {
    if (geo && !geo.loading && geo.latitude !== null && geo.longitude !== null) {
      const lat = geo.latitude;
      const lng = geo.longitude;
      if (lat >= 8 && lat <= 37 && lng >= 68 && lng <= 97) setCountryCode('+91'); // India
      else if (lat >= 24 && lat <= 49 && lng >= -125 && lng <= -66) setCountryCode('+1'); // USA
      else if (lat >= 49 && lat <= 61 && lng >= -8 && lng <= 2) setCountryCode('+44'); // UK
      else if (lat >= -43 && lat <= -10 && lng >= 112 && lng <= 153) setCountryCode('+61'); // Australia
    }
  }, [geo]);

  const handleChange = (e) => {
    let { name, value } = e.target;

    // Restrict phone input to numeric values only
    if (name === 'patientPhone') {
      value = value.replace(/\D/g, '');
      // Enforce 10-digit limit manually in state for India
      if (countryCode === '+91' && value.length > 10) {
        value = value.slice(0, 10);
      }
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e) => { 
    e.preventDefault(); 
    setLocalError('');
    
    // Strip non-digit chars from input
    const cleanPhone = form.patientPhone.replace(/\D/g, '');
    
    if (countryCode === '+91' && cleanPhone.length !== 10) {
      setLocalError('Indian phone numbers must be exactly 10 digits.');
      return;
    }

    onSubmit({ ...form, patientPhone: `${countryCode} ${cleanPhone}` });
  };

  const displayError = localError || error;

  return (
    <div className="page-enter" style={{ width: '100%', maxWidth: '520px' }}>
      <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderRadius: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px', borderRadius: '14px', background: 'rgba(220,38,38,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{typeInfo.icon}</div>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', transition: 'color 0.3s' }}>Selected Nature</p>
            <h3 style={{ fontWeight: 700, fontSize: '1.05rem', lineHeight: 1 }}>{typeInfo.label}</h3>
          </div>
        </div>
        <button onClick={onBack} className="cursor-pointer" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-family)', transition: 'color 0.2s', padding: '8px 12px' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >Change</button>
      </div>

      <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '32px', borderRadius: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={20} style={{ color: '#ef4444' }} /> Patient Record
        </h2>
        
        {displayError && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '14px 18px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '10px', color: '#fca5a5', fontSize: '0.875rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} /> {displayError}
          </div>
        )}
        
        <InputWithIcon icon={User} name="patientName" value={form.patientName} onChange={handleChange} placeholder="Patient Full Name *" required />
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', width: '130px' }}>
            <select 
              value={countryCode} 
              onChange={(e) => setCountryCode(e.target.value)}
              style={{ ...inputBase, paddingLeft: '16px', paddingRight: '12px', cursor: 'pointer', appearance: 'none', textAlign: 'center' }}
            >
              <option value="+91">🇮🇳 +91</option>
              <option value="+1">🇺🇸 +1</option>
              <option value="+44">🇬🇧 +44</option>
              <option value="+61">🇦🇺 +61</option>
            </select>
          </div>
          <div style={{ position: 'relative', flex: 1 }}>
            <Phone size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', transition: 'color 0.2s', pointerEvents: 'none' }} />
            <input 
              type="tel"
              name="patientPhone"
              value={form.patientPhone}
              onChange={handleChange}
              placeholder="Contact Number *"
              required
              maxLength={countryCode === '+91' ? 10 : 15}
              style={inputBase}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(239,68,68,0.5)'; e.target.style.boxShadow = '0 0 0 4px rgba(239,68,68,0.08)'; e.target.previousSibling.style.color = '#ef4444'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border-input)'; e.target.style.boxShadow = 'none'; e.target.previousSibling.style.color = 'var(--text-muted)'; }}
            />
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <textarea name="description" value={form.description} onChange={handleChange} placeholder="Incident Details..." rows={3}
            style={{ ...inputBase, paddingLeft: '16px', resize: 'none', minHeight: '90px' }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(239,68,68,0.5)'; e.target.style.boxShadow = '0 0 0 4px rgba(239,68,68,0.08)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border-input)'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
        
        <button type="submit" className="cursor-pointer" style={{
          width: '100%', padding: '16px', borderRadius: '16px', border: 'none', background: '#dc2626', color: '#fff',
          fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          boxShadow: '0 8px 24px rgba(220,38,38,0.3)', transition: 'all 0.3s', fontFamily: 'var(--font-family)', letterSpacing: '0.05em',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >TRANSMIT SOS <AlertCircle size={18} /></button>
      </form>
    </div>
  );
}