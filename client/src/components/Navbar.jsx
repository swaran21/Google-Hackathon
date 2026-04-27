import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Home, AlertCircle, Navigation, Activity,
  Building2, LayoutDashboard, LogOut, User as UserIcon,
  Sun, Moon, ClipboardList
} from 'lucide-react';
import Logo from './Logo';

const NAV_LINKS = [
  { path: '/', label: 'Home', Icon: Home, public: true },
  { path: '/sos', label: 'SOS', Icon: AlertCircle, roles: ['user'] },
  { path: '/bookings', label: 'My Bookings', Icon: ClipboardList, roles: ['user'] },
  { path: '/tracking', label: 'Live Track', Icon: Navigation, public: true },
  { path: '/driver', label: 'Driver Dashboard', Icon: Activity, roles: ['driver', 'admin'] },
  { path: '/driver/bookings', label: 'Mission History', Icon: ClipboardList, roles: ['driver'] },
  { path: '/hospital', label: 'Hospital', Icon: Building2, roles: ['hospital', 'admin'] },
  { path: '/admin', label: 'Dashboard', Icon: LayoutDashboard, roles: ['admin'] },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const demoLinks = NAV_LINKS.filter((link) => {
    if (!isAuthenticated) return !!link.public;
    if (link.roles) return link.roles.includes(user?.role);
    return true;
  });

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      background: 'var(--bg-primary)',
      boxShadow: '0 4px 10px var(--bg-card)', // Subtle drop shadow for navbar separation instead of glassmorphism
      transition: 'background 0.3s' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>

          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Logo size={36} isAnimating={false} />
          </Link>

          {/* Navigation Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {demoLinks.map(({ path, label, Icon }) => {
              const isActive = pathname === path;
              return (
                <Link key={path} to={path} className={isActive ? 'neu-card neu-pressed' : ''} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 16px', borderRadius: '12px', fontSize: '0.875rem',
                  fontWeight: 600, textDecoration: 'none', transition: 'all 0.3s',
                  color: isActive ? 'var(--color-secondary)' : 'var(--text-secondary)' }}
                  onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.color = 'var(--text-primary)'; }}}
                  onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.color = 'var(--text-secondary)'; }}}
                >
                  <Icon size={18} style={{ color: isActive ? 'var(--color-secondary)' : 'var(--text-muted)', transition: 'color 0.3s' }} />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right section: Theme Toggle + Auth */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Theme Toggle */}
            <button onClick={toggleTheme} className="neu-button" title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              style={{
                padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isDark ? 'var(--color-warning)' : 'var(--color-secondary)'
              }}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="hidden sm:flex" style={{ flexDirection: 'column', alignItems: 'flex-end', marginRight: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--color-danger)' }}>
                    {user?.role} Access
                  </span>
                  <span className="neu-text" style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600, transition: 'color 0.3s' }}>{user?.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="neu-card" style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-secondary)' }}>
                    <UserIcon size={16} />
                  </div>
                  <button onClick={logout} title="Logout" className="neu-button"
                    style={{ padding: '8px', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/login" className="neu-button" style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 24px', textDecoration: 'none' }}>
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}