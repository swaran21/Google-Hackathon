import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Ambulance, Lock, Mail, Eye, EyeOff, LogIn, ChevronLeft, AlertCircle, Hash, User, Phone, Activity, UserPlus, Loader2 } from 'lucide-react';
import api from '../services/api';

const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', maxLen: 10 },
  { code: '+1',  flag: '🇺🇸', maxLen: 10 },
  { code: '+44', flag: '🇬🇧', maxLen: 10 },
  { code: '+61', flag: '🇦🇺', maxLen: 9  },
];

const inputStyle = {
  width: '100%', padding: '14px 16px 14px 48px', borderRadius: '14px',
  background: 'var(--bg-input)', border: '1px solid var(--border-input)',
  color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none',
  fontFamily: 'var(--font-family)', transition: 'all 0.2s', boxSizing: 'border-box',
};

const focus = (e) => { e.target.style.borderColor = 'var(--bg-card)'; e.target.style.boxShadow = '0 0 0 3px var(--bg-card)'; };
const blur  = (e) => { e.target.style.borderColor = 'var(--border-input)'; e.target.style.boxShadow = 'none'; };

function Field({ icon: Icon, label, ...props }) {
  return (
    <div>
      {label && <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        <Icon size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input {...props} style={inputStyle} onFocus={focus} onBlur={blur} />
      </div>
    </div>
  );
}

export default function DriverLoginPage() {
  const [tab, setTab] = useState('login');

  // Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Signup
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [equipmentLevel, setEquipmentLevel] = useState('basic');
  const [signupEmail, setSignupEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPass, setShowSignupPass] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const lang = navigator.language || '';
    if (lang.startsWith('en-IN') || lang.startsWith('hi')) setCountryCode('+91');
    else if (lang.startsWith('en-US')) setCountryCode('+1');
    else if (lang.startsWith('en-GB')) setCountryCode('+44');
  }, []);

  const maxLen = COUNTRY_CODES.find((c) => c.code === countryCode)?.maxLen ?? 15;
  const handlePhone = (v) => setSignupPhone(v.replace(/\D/g, '').slice(0, maxLen));

  const handleLogin = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const user = await login(loginEmail, loginPassword);
      if (user.role !== 'driver') {
        setError('This portal is for ambulance drivers only.');
        setLoading(false);
        return;
      }
      navigate('/driver');
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally { setLoading(false); }
  };

  const handleSignup = async (e) => {
    e.preventDefault(); setError('');
    if (!vehicleNumber.trim() || !driverName.trim()) { setError('All fields are required.'); return; }
    if (signupPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    
    const cleanPhone = signupPhone.replace(/\D/g, '');
    if (countryCode === '+91' && cleanPhone.length !== 10) { setError('Indian phone number must be exactly 10 digits.'); return; }

    setLoading(true);
    try {
      const res = await api.post('/auth/register-ambulance', {
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        driverName: driverName.trim(),
        email: signupEmail,
        password: signupPassword,
        phone: `${countryCode} ${cleanPhone}`,
        equipmentLevel,
      });
      const { token } = res.data.data;
      localStorage.setItem('resqnet_token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      window.location.href = '/driver';
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const eyeBtn = (show, toggle) => (
    <button type="button" onClick={toggle} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
      {show ? <EyeOff size={17} /> : <Eye size={17} />}
    </button>
  );

  return (
    <div className="page-enter" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at 50% 0%, var(--bg-card) 0%, transparent 50%)' }} />

      <div style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 10 }}>
        
        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', marginBottom: '24px', transition: 'color 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <ChevronLeft size={16} /> Back to role selection
        </Link>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '18px', margin: '0 auto 14px',
            background: 'var(--bg-card)', border: '1px solid var(--bg-card)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ambulance size={28} style={{ color: '#f97316' }} />
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '4px' }}>
            Driver <span style={{ color: '#f97316' }}>Portal</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            {tab === 'login' ? 'Sign in to manage dispatches' : 'Register a new ambulance'}
          </p>
        </div>

        <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: '14px', padding: '4px', marginBottom: '20px', border: '1px solid transparent' }}>
          {['login', 'signup'].map((t) => (
            <button key={t} type="button" onClick={() => { setTab(t); setError(''); }} className="neu-button" style={{
              flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
              background: tab === t ? 'var(--bg-card)' : 'transparent',
              color: tab === t ? '#f97316' : 'var(--text-muted)',
              fontWeight: 700, fontSize: '0.88rem', fontFamily: 'var(--font-family)',
              transition: 'all 0.25s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {t === 'login' ? <><LogIn size={14} /> Log In</> : <><UserPlus size={14} /> Sign Up</>}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', background: 'var(--bg-card)', border: '1px solid var(--bg-card)', color: '#fca5a5', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
          </div>
        )}

        {tab === 'login' && (
          <form onSubmit={handleLogin} className="neu-card" style={{ padding: '28px', borderRadius: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Field label="Driver Email" icon={Mail} type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="Email" required />
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Password</label>
              <Lock size={18} style={{ position: 'absolute', left: '16px', top: 'calc(50% + 10px)', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input type={showLoginPass ? 'text' : 'password'} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Password" required style={{ ...inputStyle, paddingRight: '48px' }} onFocus={focus} onBlur={blur} />
              {eyeBtn(showLoginPass, () => setShowLoginPass((p) => !p))}
            </div>

            <button type="submit" disabled={loading} className="neu-button" style={{
              width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
              background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff',
              fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '8px', fontFamily: 'var(--font-family)',
              boxShadow: '0 6px 24px var(--bg-card)', opacity: loading ? 0.7 : 1, transition: 'all 0.2s', marginTop: '8px'
            }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {loading ? <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} /> : <><LogIn size={18} /> Sign In</>}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Got a new vehicle?{' '}
              <button type="button" onClick={() => { setTab('signup'); setError(''); }} style={{ background: 'none', border: 'none', color: '#f97316', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-family)' }}>Register Ambulance</button>
            </p>
          </form>
        )}

        {tab === 'signup' && (
          <form onSubmit={handleSignup} className="neu-card" style={{ padding: '28px', borderRadius: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Field label="Vehicle Registration Number" icon={Hash} type="text" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())} placeholder="e.g. MH12 AB 1234" required />
            <Field label="Driver Full Name" icon={User} type="text" value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Name" required />
            
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ambulance Type</label>
              <div style={{ position: 'relative' }}>
                <Activity size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <select value={equipmentLevel} onChange={(e) => setEquipmentLevel(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' }} onFocus={focus} onBlur={blur}>
                  <option value="basic">Basic Life Support</option>
                  <option value="advanced">Advanced Life Support</option>
                  <option value="critical_care">ICU / Critical Care</option>
                </select>
              </div>
            </div>

            <Field label="Driver Email" icon={Mail} type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="Email" required />

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Phone Number</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select value={countryCode} onChange={(e) => { setCountryCode(e.target.value); setSignupPhone(''); }} style={{ ...inputStyle, width: '118px', flexShrink: 0, padding: '14px 8px', cursor: 'pointer', appearance: 'none', textAlign: 'center' }} onFocus={focus} onBlur={blur}>
                  {COUNTRY_CODES.map(({ code, flag }) => <option key={code} value={code}>{flag} {code}</option>)}
                </select>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Phone size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input type="tel" value={signupPhone} onChange={(e) => handlePhone(e.target.value)} placeholder={`Phone (${maxLen} digits)`} required maxLength={maxLen} style={inputStyle} onFocus={focus} onBlur={blur} />
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input type={showSignupPass ? 'text' : 'password'} value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder="Password (min 6 chars)" required style={{ ...inputStyle, paddingRight: '48px' }} onFocus={focus} onBlur={blur} />
                {eyeBtn(showSignupPass, () => setShowSignupPass((p) => !p))}
              </div>
            </div>

            <button type="submit" disabled={loading} className="neu-button" style={{
              width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
              background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff',
              fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '8px', fontFamily: 'var(--font-family)',
              boxShadow: '0 6px 24px var(--bg-card)', opacity: loading ? 0.7 : 1, transition: 'all 0.2s', marginTop: '8px'
            }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {loading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <><UserPlus size={18} /> Register Ambulance</>}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Already registered?{' '}
              <button type="button" onClick={() => { setTab('login'); setError(''); }} style={{ background: 'none', border: 'none', color: '#f97316', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-family)' }}>Log in</button>
            </p>
          </form>
        )}

      </div>
    </div>
  );
}
