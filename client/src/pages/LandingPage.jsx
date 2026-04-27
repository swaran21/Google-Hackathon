import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, MapPin, Shield, Activity } from 'lucide-react';

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

      {/* Content */}
      <div style={{ maxWidth: '700px', textAlign: 'center', position: 'relative', zIndex: 10 }}>
        {/* Badge */}
        <div className="neu-card" style={{
          display: 'inline-flex', alignItems: 'center', gap: '10px',
          padding: '8px 20px', borderRadius: '9999px', marginBottom: '28px',
          fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)',
        }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-secondary)',
            boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.8), inset -1px -1px 2px rgba(0,0,0,0.2)',
          }} />
          AI + OSRM Powered Emergency Response
        </div>

        {/* Headline */}
        <h1 className="neu-text" style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '20px' }}>
          Emergency Response{' '}
          <span style={{ color: 'var(--color-secondary)' }}>Reimagined</span>
          <span style={{ color: 'var(--color-danger)' }}>.</span>
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '550px', margin: '0 auto 40px', transition: 'color 0.3s' }}>
          AI-powered triage, real-time fleet tracking, and optimized hospital allocation—saving lives when every second counts.
        </p>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '56px' }}>
          <Link to="/sos" className="sos-button" style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            padding: '16px 36px', borderRadius: '16px', textDecoration: 'none',
            fontWeight: 700, fontSize: '1rem'
          }}>
            <AlertCircle size={20} /> Emergency SOS
          </Link>
          <Link to="/tracking" className="neu-button" style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            padding: '16px 36px', borderRadius: '16px', textDecoration: 'none',
            fontWeight: 700, fontSize: '1rem',
          }}>
            <MapPin size={20} /> Live Tracking
          </Link>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '24px', marginBottom: '40px',
        }}>
          {stats.map((s) => (
            <StatBlock key={s.label} {...s} />
          ))}
        </div>

        {/* Features */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
          {[
            { icon: <Activity size={24} />, title: 'AI Triage', desc: 'Gemini-powered severity analysis in real-time', color: 'var(--color-secondary)' },
            { icon: <MapPin size={24} />, title: 'OSRM Routing', desc: 'Optimal ambulance dispatch within seconds', color: 'var(--text-primary)' },
            { icon: <Shield size={24} />, title: 'Smart Allocation', desc: 'Hospital bed matching and priority queuing', color: 'var(--text-primary)' },
          ].map((f) => (
            <div key={f.title} className="neu-card neu-card-hover" style={{
              padding: '24px', borderRadius: '20px', textAlign: 'left',
            }}>
              <div className="neu-card" style={{
                marginBottom: '16px', color: f.color, width: '48px', height: '48px',
                borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'inset 4px 4px 8px var(--shadow-dark), inset -4px -4px 8px var(--shadow-light)'
              }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, marginBottom: '8px', fontSize: '1rem' }}>{f.title}</h3>
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
    <div className="neu-card" style={{ padding: '24px', borderRadius: '16px', textAlign: 'center' }}>
      <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)', transition: 'color 0.3s' }}>
        {count.toLocaleString()}{unit && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px', fontWeight: 700, transition: 'color 0.3s' }}>{unit}</span>}
      </div>
      <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', marginTop: '8px', transition: 'color 0.3s' }}>{label}</p>
    </div>
  );
}