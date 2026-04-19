import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, MapPin, Shield, Activity, ChevronRight } from 'lucide-react';

// ─── Animated Counter Hook ──────────────────────────────────────
function useCounter(target, duration = 2000) {
  const [count, setCount] = useState(0);
  const rafRef = useRef();

  useEffect(() => {
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return count;
}

export default function LandingPage() {
  const stats = [
    { label: 'Lives Saved', value: 12480 },
    { label: 'Response Time', value: 4, unit: 'min avg' },
    { label: 'Active Ambulances', value: 340 },
    { label: 'Cities Covered', value: 28 },
  ];

  return (
    <div className="page-enter" style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '32px 24px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(239, 68, 68, 0.07) 0%, transparent 60%)',
      }} />

      {/* Content */}
      <div style={{ maxWidth: '700px', textAlign: 'center', position: 'relative', zIndex: 10 }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '10px',
          padding: '8px 20px', borderRadius: '9999px', marginBottom: '28px',
          background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
          fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)',
          transition: 'all 0.3s',
        }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e',
            boxShadow: '0 0 8px #22c55e',
            animation: 'pulse-glow 2s ease-in-out infinite',
          }} />
          AI + OSRM Powered Emergency Response
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '20px' }}>
          Emergency Response{' '}
          <span className="gradient-text">Reimagined</span>
          <span style={{ color: '#ef4444' }}>.</span>
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '550px', margin: '0 auto 40px', transition: 'color 0.3s' }}>
          AI-powered triage, real-time fleet tracking, and optimized hospital allocation—saving lives when every second counts.
        </p>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '56px' }}>
          <Link to="/sos" style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            padding: '16px 36px', borderRadius: '16px', textDecoration: 'none',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff',
            fontWeight: 700, fontSize: '1rem', boxShadow: '0 8px 30px rgba(239,68,68,0.3)',
            transition: 'all 0.2s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(239,68,68,0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(239,68,68,0.3)'; }}
          >
            <AlertCircle size={20} /> Emergency SOS
          </Link>
          <Link to="/tracking" style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            padding: '16px 36px', borderRadius: '16px', textDecoration: 'none',
            background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
            color: 'var(--text-primary)', fontWeight: 600, fontSize: '1rem', transition: 'all 0.2s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-glass-hover)'; e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-glass)'; e.currentTarget.style.borderColor = 'var(--border-glass)'; }}
          >
            <MapPin size={20} /> Live Tracking
          </Link>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '16px', marginBottom: '40px',
        }}>
          {stats.map((s) => (
            <StatBlock key={s.label} {...s} />
          ))}
        </div>

        {/* Features */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
          {[
            { icon: <Activity size={24} />, title: 'AI Triage', desc: 'Gemini-powered severity analysis in real-time' },
            { icon: <MapPin size={24} />, title: 'OSRM Routing', desc: 'Optimal ambulance dispatch within seconds' },
            { icon: <Shield size={24} />, title: 'Smart Allocation', desc: 'Hospital bed matching and priority queuing' },
          ].map((f) => (
            <div key={f.title} className="glass-card glass-card-hover" style={{
              padding: '24px', borderRadius: '20px', textAlign: 'left',
            }}>
              <div style={{
                marginBottom: '14px', color: '#ef4444', width: '44px', height: '44px',
                borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, marginBottom: '6px', fontSize: '1rem' }}>{f.title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5, transition: 'color 0.3s' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatBlock({ label, value, unit }) {
  const count = useCounter(value);
  return (
    <div className="glass-card" style={{ padding: '20px', borderRadius: '16px', textAlign: 'center' }}>
      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', transition: 'color 0.3s' }}>
        {count.toLocaleString()}{unit && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: '4px', fontWeight: 700, transition: 'color 0.3s' }}>{unit}</span>}
      </div>
      <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', marginTop: '6px', transition: 'color 0.3s' }}>{label}</p>
    </div>
  );
}