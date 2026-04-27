import { useNavigate } from 'react-router-dom';
import { User, Building2, Ambulance, ChevronRight, Shield } from 'lucide-react';

const ROLES = [
  {
    key: 'user',
    label: 'Patient / User',
    description: 'Report emergencies and track ambulance in real time',
    icon: User,
    color: 'var(--color-danger)',
    route: '/user-login',
  },
  {
    key: 'hospital',
    label: 'Hospital',
    description: 'Manage bed capacity and receive incoming critical patients',
    icon: Building2,
    color: 'var(--color-secondary)',
    route: '/hospital-login',
  },
  {
    key: 'driver',
    label: 'Ambulance Driver',
    description: 'Accept dispatches and stream live GPS to the command centre',
    icon: Ambulance,
    color: 'var(--color-warning)',
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

      <div style={{ width: '100%', maxWidth: '540px', position: 'relative', zIndex: 10 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div className="neu-card" style={{
            width: '64px', height: '64px', borderRadius: '20px', margin: '0 auto 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light)',
          }}>
            <Shield size={32} style={{ color: 'var(--color-danger)' }} />
          </div>
          <h1 className="neu-text" style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '8px' }}>
            Welcome to <span style={{ color: 'var(--color-secondary)' }}>ResQNet</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 600 }}>
            Select your role to continue
          </p>
        </div>

        {/* Role cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {ROLES.map((role) => {
            const Icon = role.icon;
            return (
              <button
                key={role.key}
                onClick={() => navigate(role.route)}
                className="neu-card neu-card-hover"
                style={{
                  padding: '22px 24px', borderRadius: '20px',
                  display: 'flex', alignItems: 'center',
                  gap: '18px', width: '100%', textAlign: 'left',
                  cursor: 'pointer',
                  background: 'var(--bg-card)',
                  border: 'none'
                }}
              >
                {/* Icon */}
                <div className="neu-card" style={{
                  width: '52px', height: '52px', borderRadius: '16px', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'inset 2px 2px 5px var(--shadow-dark), inset -2px -2px 5px var(--shadow-light)',
                }}>
                  <Icon size={26} style={{ color: role.color }} />
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '4px', color: 'var(--text-primary)' }}>
                    {role.label}
                  </p>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.4, fontWeight: 500 }}>
                    {role.description}
                  </p>
                </div>

                {/* Arrow */}
                <ChevronRight size={20} style={{ color: 'var(--color-secondary)', flexShrink: 0, transition: 'color 0.2s' }} />
              </button>
            );
          })}
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', marginTop: '32px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          Emergency responders only · All access is role-verified
        </p>
      </div>
    </div>
  );
}
