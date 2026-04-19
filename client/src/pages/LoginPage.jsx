import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Shield, User, Lock, ChevronRight } from 'lucide-react';

const DEMO_PRESETS = [
  { role: 'Admin', email: 'admin@resqnet.com', password: 'admin123', color: '#ef4444' },
  { role: 'Driver', email: 'driver@resqnet.com', password: 'driver123', color: '#f97316' },
  { role: 'Hospital', email: 'hospital@resqnet.com', password: 'hospital123', color: '#3b82f6' },
  { role: 'User', email: 'user@resqnet.com', password: 'user123', color: '#22c55e' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await login(email, password);
      const role = res.data.data.user.role;
      const routes = { admin: '/admin', driver: '/driver', hospital: '/hospital' };
      navigate(routes[role] || '/sos');
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally { setLoading(false); }
  };

  const fillPreset = (p) => { setEmail(p.email); setPassword(p.password); setError(''); };

  const inputStyle = {
    width: '100%', padding: '14px 16px 14px 48px', borderRadius: '14px',
    background: 'var(--bg-input)', border: '1px solid var(--border-input)',
    color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none',
    fontFamily: 'var(--font-family)', transition: 'all 0.2s',
  };

  return (
    <div className="page-enter" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
      position: 'relative',
    }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at 50% 0%, rgba(239,68,68,0.06) 0%, transparent 50%)' }} />

      <div style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 10 }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '18px', margin: '0 auto 16px',
            background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={28} style={{ color: '#ef4444' }} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '6px' }}>
            Access <span className="gradient-text">Portal</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', transition: 'color 0.3s' }}>Authenticate to access the command center</p>
        </div>

        {/* Quick presets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '24px' }}>
          {DEMO_PRESETS.map((p) => (
            <button key={p.role} onClick={() => fillPreset(p)} className="cursor-pointer"
              style={{
                padding: '10px 8px', borderRadius: '12px', border: '1px solid var(--border-glass)',
                background: 'var(--bg-glass)', color: 'var(--text-secondary)',
                fontSize: '11px', fontWeight: 700, transition: 'all 0.2s',
                fontFamily: 'var(--font-family)', textAlign: 'center',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${p.color}50`; e.currentTarget.style.color = p.color; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-glass)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              {p.role}
            </button>
          ))}
        </div>

        {error && (
          <div style={{
            padding: '12px 16px', borderRadius: '12px', marginBottom: '16px',
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#fca5a5', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px',
          }}>⚠️ {error}</div>
        )}

        <form onSubmit={handleSubmit} className="glass-card" style={{
          padding: '28px', borderRadius: '22px', display: 'flex', flexDirection: 'column', gap: '16px',
        }}>
          <div style={{ position: 'relative' }}>
            <User size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', transition: 'color 0.3s', pointerEvents: 'none' }} />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(239,68,68,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.08)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border-input)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', transition: 'color 0.3s', pointerEvents: 'none' }} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(239,68,68,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.08)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border-input)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
          <button type="submit" disabled={loading} className="cursor-pointer" style={{
            width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff',
            fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '8px', fontFamily: 'var(--font-family)',
            boxShadow: '0 6px 24px rgba(239,68,68,0.3)', opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
          }}
            onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; }}}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {loading ? <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} /> : <><LogIn size={18} /> Authenticate</>}
          </button>
        </form>
      </div>
    </div>
  );
}