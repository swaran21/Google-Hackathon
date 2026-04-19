import { useNavigate } from 'react-router-dom';
import { User, Building2, Ambulance, ChevronRight, Shield } from 'lucide-react';

const ROLES = [
  {
    key: 'user',
    label: 'Patient / User',
    description: 'Report emergencies and track ambulance in real time',
    icon: User,
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.2)',
    route: '/user-login',
  },
  {
    key: 'hospital',
    label: 'Hospital',
    description: 'Manage bed capacity and receive incoming critical patients',
    icon: Building2,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.2)',
    route: '/hospital-login',
  },
  {
    key: 'driver',
    label: 'Ambulance Driver',
    description: 'Accept dispatches and stream live GPS to the command centre',
    icon: Ambulance,
    color: '#f97316',
    bg: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.2)',
    route: '/driver-login',
  },
];

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="page-enter" style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at 50% 20%, rgba(239,68,68,0.05) 0%, transparent 55%)' }} />

      <div style={{ width: '100%', maxWidth: '540px', position: 'relative', zIndex: 10 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '20px', margin: '0 auto 18px',
            background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={30} style={{ color: '#ef4444' }} />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '8px' }}>
            Welcome to <span className="gradient-text">ResQNet</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 500 }}>
            Select your role to continue
          </p>
        </div>

        {/* Role cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {ROLES.map((role) => {
            const Icon = role.icon;
            return (
              <button
                key={role.key}
                onClick={() => navigate(role.route)}
                className="glass-card cursor-pointer"
                style={{
                  padding: '22px 24px', borderRadius: '20px', border: `1px solid var(--border-glass)`,
                  background: 'var(--bg-glass)', display: 'flex', alignItems: 'center',
                  gap: '18px', width: '100%', textAlign: 'left',
                  transition: 'all 0.25s', cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = role.border;
                  e.currentTarget.style.background = role.bg;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 8px 32px ${role.color}20`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-glass)';
                  e.currentTarget.style.background = 'var(--bg-glass)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Icon */}
                <div style={{
                  width: '52px', height: '52px', borderRadius: '16px', flexShrink: 0,
                  background: role.bg, border: `1px solid ${role.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={26} style={{ color: role.color }} />
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '3px', color: 'var(--text-primary)' }}>
                    {role.label}
                  </p>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.4, fontWeight: 500 }}>
                    {role.description}
                  </p>
                </div>

                {/* Arrow */}
                <ChevronRight size={20} style={{ color: 'var(--text-muted)', flexShrink: 0, transition: 'color 0.2s' }} />
              </button>
            );
          })}
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', marginTop: '32px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Emergency responders only · All access is role-verified
        </p>
      </div>
    </div>
  );
}
