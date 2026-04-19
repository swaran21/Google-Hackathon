import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Home, AlertCircle, Navigation, Activity,
  Building2, LayoutDashboard, LogOut, User as UserIcon,
  Sun, Moon
} from 'lucide-react';

const NAV_LINKS = [
  { path: '/', label: 'Home', Icon: Home, public: true },
  { path: '/sos', label: 'SOS', Icon: AlertCircle, public: true },
  { path: '/tracking', label: 'Live Track', Icon: Navigation, public: true },
  { path: '/driver', label: 'Driver', Icon: Activity, roles: ['driver', 'admin'] },
  { path: '/hospital', label: 'Hospital', Icon: Building2, roles: ['hospital', 'admin'] },
  { path: '/admin', label: 'Dashboard', Icon: LayoutDashboard, roles: ['admin'] },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const demoLinks = isAuthenticated ? NAV_LINKS : NAV_LINKS.filter((l) => l.public);

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      background: 'var(--nav-bg)', backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderBottom: '1px solid var(--nav-border)',
      transition: 'background 0.3s, border-color 0.3s',
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>

          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px', background: '#dc2626',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 15px rgba(220, 38, 38, 0.4)',
            }}>
              <Activity size={18} color="#fff" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.875rem', lineHeight: 1, letterSpacing: '-0.01em', transition: 'color 0.3s' }}>
                ResQ<span style={{ color: '#ef4444' }}>Net</span>
              </span>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', transition: 'color 0.3s' }}>
                Systems
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {demoLinks.map(({ path, label, Icon }) => {
              const isActive = pathname === path;
              return (
                <Link key={path} to={path} style={{
                  position: 'relative', display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 16px', borderRadius: '12px', fontSize: '0.875rem',
                  fontWeight: 500, textDecoration: 'none', transition: 'all 0.3s',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--bg-hover)' : 'transparent',
                }}
                  onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-glass)'; }}}
                  onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}}
                >
                  <Icon size={18} style={{ color: isActive ? '#ef4444' : 'var(--text-muted)', transition: 'color 0.3s' }} />
                  <span className="hidden sm:inline">{label}</span>
                  {isActive && (
                    <div style={{
                      position: 'absolute', bottom: '-17px', left: '50%', transform: 'translateX(-50%)',
                      width: '32px', height: '2px', borderRadius: '2px',
                      background: '#ef4444', boxShadow: '0 0 10px #ef4444',
                    }} />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right section: Theme Toggle + Auth */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Theme Toggle */}
            <button onClick={toggleTheme} className="cursor-pointer" title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              style={{
                padding: '8px', borderRadius: '10px', border: 'none',
                background: 'var(--bg-hover)', color: 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.3s', position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = isDark ? '#facc15' : '#3b82f6'; e.currentTarget.style.background = 'var(--bg-glass-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {isAuthenticated ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                paddingLeft: '16px', borderLeft: '1px solid var(--border-glass)',
              }}>
                <div className="hidden sm:flex" style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#ef4444' }}>
                    {user?.role} Access
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, transition: 'color 0.3s' }}>{user?.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'rgba(37, 99, 235, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa',
                  }}>
                    <UserIcon size={16} />
                  </div>
                  <button onClick={logout} title="Logout" className="cursor-pointer"
                    style={{
                      padding: '8px', borderRadius: '10px', border: 'none',
                      background: 'transparent', color: 'var(--text-muted)', transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/login" style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 20px', borderRadius: '9999px',
                background: isDark ? '#fff' : '#1e293b', color: isDark ? '#000' : '#fff',
                fontSize: '12px', fontWeight: 700, textDecoration: 'none', transition: 'all 0.2s',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}