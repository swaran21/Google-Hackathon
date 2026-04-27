import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, User, Lock, Mail, Phone, UserPlus, Eye, EyeOff, ChevronLeft } from 'lucide-react';

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
  fontFamily: 'var(--font-family)', transition: 'all 0.2s',
};

const focus = (e) => { e.target.style.borderColor = 'var(--bg-card)'; e.target.style.boxShadow = '0 0 0 3px var(--bg-card)'; };
const blur  = (e) => { e.target.style.borderColor = 'var(--border-input)'; e.target.style.boxShadow = 'none'; };

function Field({ icon: Icon, ...props }) {
  return (
    <div style={{ position: 'relative' }}>
      <Icon size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
      <input {...props} style={inputStyle} onFocus={focus} onBlur={blur} />
    </div>
  );
}

export default function UserLoginPage() {
  const [tab, setTab] = useState('login');

  // Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Signup
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [showSignupPass, setShowSignupPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
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
      const routes = { admin: '/admin', driver: '/driver-login', hospital: '/hospital' };
      navigate(routes[user.role] || '/sos');
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally { setLoading(false); }
  };

  const handleSignup = async (e) => {
    e.preventDefault(); setError('');
    if (!signupName.trim()) { setError('Full name is required.'); return; }
    if (signupPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (signupPassword !== signupConfirm) { setError('Passwords do not match.'); return; }
    const clean = signupPhone.replace(/\D/g, '');
    if (countryCode === '+91' && clean.length !== 10) { setError('Indian phone number must be exactly 10 digits.'); return; }
    setLoading(true);
    try {
      const user = await register({ name: signupName.trim(), email: signupEmail, password: signupPassword, phone: `${countryCode} ${clean}` });
      navigate('/sos');
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

        {/* Back */}
        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', marginBottom: '24px', transition: 'color 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <ChevronLeft size={16} /> Back to role selection
        </Link>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '16px', margin: '0 auto 12px', background: 'var(--bg-card)', border: '1px solid var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={26} style={{ color: '#ef4444' }} />
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '4px' }}>
            {tab === 'login' ? 'Welcome Back' : <>Create <span className="gradient-text">Account</span></>}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            {tab === 'login' ? 'Sign in to your ResQNet account' : 'Register as a user on ResQNet'}
          </p>
        </div>

        {/* Tab */}
        <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: '14px', padding: '4px', marginBottom: '20px', border: '1px solid transparent' }}>
          {['login', 'signup'].map((t) => (
            <button key={t} type="button" onClick={() => { setTab(t); setError(''); }} className="neu-button" style={{
              flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
              background: tab === t ? 'var(--bg-card)' : 'transparent',
              color: tab === t ? '#ef4444' : 'var(--text-muted)',
              fontWeight: 700, fontSize: '0.88rem', fontFamily: 'var(--font-family)',
              transition: 'all 0.25s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {t === 'login' ? <><LogIn size={14} /> Log In</> : <><UserPlus size={14} /> Sign Up</>}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', background: 'var(--bg-card)', border: '1px solid var(--bg-card)', color: '#fca5a5', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Login form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="neu-card" style={{ padding: '28px', borderRadius: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Field icon={Mail} type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="Email address" required />
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input type={showLoginPass ? 'text' : 'password'} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Password" required style={{ ...inputStyle, paddingRight: '48px' }} onFocus={focus} onBlur={blur} />
              {eyeBtn(showLoginPass, () => setShowLoginPass((p) => !p))}
            </div>
            <button type="submit" disabled={loading} className="neu-button" style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'var(--font-family)', boxShadow: '0 6px 24px var(--bg-card)', opacity: loading ? 0.7 : 1, transition: 'all 0.2s' }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {loading ? <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} /> : <><LogIn size={18} /> Sign In</>}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              No account?{' '}
              <button type="button" onClick={() => { setTab('signup'); setError(''); }} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-family)' }}>Sign up</button>
            </p>
          </form>
        )}

        {/* Signup form */}
        {tab === 'signup' && (
          <form onSubmit={handleSignup} className="neu-card" style={{ padding: '28px', borderRadius: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Field icon={User} type="text" value={signupName} onChange={(e) => setSignupName(e.target.value)} placeholder="Full Name *" required />
            <Field icon={Mail} type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="Email Address *" required />

            {/* Phone */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <select value={countryCode} onChange={(e) => { setCountryCode(e.target.value); setSignupPhone(''); }}
                style={{ ...inputStyle, width: '118px', flexShrink: 0, padding: '14px 8px', cursor: 'pointer', appearance: 'none', textAlign: 'center' }}>
                {COUNTRY_CODES.map(({ code, flag }) => <option key={code} value={code}>{flag} {code}</option>)}
              </select>
              <div style={{ position: 'relative', flex: 1 }}>
                <Phone size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input type="tel" value={signupPhone} onChange={(e) => handlePhone(e.target.value)} placeholder={`Phone (${maxLen} digits) *`} required maxLength={maxLen} style={inputStyle} onFocus={focus} onBlur={blur} />
              </div>
            </div>

            {/* Password */}
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input type={showSignupPass ? 'text' : 'password'} value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder="Password (min 6 chars) *" required style={{ ...inputStyle, paddingRight: '48px' }} onFocus={focus} onBlur={blur} />
              {eyeBtn(showSignupPass, () => setShowSignupPass((p) => !p))}
            </div>

            {/* Confirm */}
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input type={showConfirmPass ? 'text' : 'password'} value={signupConfirm} onChange={(e) => setSignupConfirm(e.target.value)} placeholder="Confirm Password *" required
                style={{ ...inputStyle, paddingRight: '48px', borderColor: signupConfirm && signupPassword !== signupConfirm ? 'var(--bg-card)' : undefined }}
                onFocus={focus}
                onBlur={(e) => { e.target.style.borderColor = signupPassword !== e.target.value ? 'var(--bg-card)' : 'var(--border-input)'; e.target.style.boxShadow = 'none'; }}
              />
              {eyeBtn(showConfirmPass, () => setShowConfirmPass((p) => !p))}
              {signupConfirm && signupPassword !== signupConfirm && <p style={{ color: '#fca5a5', fontSize: '11px', marginTop: '4px' }}>Passwords do not match</p>}
            </div>

            <button type="submit" disabled={loading} className="neu-button" style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'var(--font-family)', boxShadow: '0 6px 24px var(--bg-card)', opacity: loading ? 0.7 : 1, transition: 'all 0.2s' }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {loading ? <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} /> : <><UserPlus size={18} /> Create Account</>}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <button type="button" onClick={() => { setTab('login'); setError(''); }} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-family)' }}>Log in</button>
            </p>
          </form>
        )}

      </div>
    </div>
  );
}
