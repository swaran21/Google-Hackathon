import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Home, AlertCircle, Navigation, Activity,
  Building2, LayoutDashboard, LogOut, User as UserIcon,
  Sun, Moon, ClipboardList, X, ShieldAlert
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

function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)'
    }}>
      <div className="neu-card" style={{
        padding: '32px', maxWidth: '400px', width: '90%', textAlign: 'center',
        display: 'flex', flexDirection: 'column', gap: '20px', borderRadius: '24px'
      }}>
        <div className="neu-inner" style={{
          width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-danger)'
        }}>
          <ShieldAlert size={32} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '8px' }}>Security Logout</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>
            Are you sure you want to end your secure session?
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onCancel} className="neu-button" style={{ flex: 1 }}>
            Cancel
          </button>
          <button onClick={onConfirm} className="neu-button danger" style={{ 
            flex: 1, color: 'white', background: 'var(--color-danger)', boxShadow: '0 4px 12px rgba(255, 33, 87, 0.4)' 
          }}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Navbar() {
  const { pathname } = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const demoLinks = NAV_LINKS.filter((link) => {
    if (!isAuthenticated) return !!link.public;
    if (link.roles) return link.roles.includes(user?.role);
    return true;
  });

  return (
    <>
      {showLogoutConfirm && <LogoutModal onConfirm={logout} onCancel={() => setShowLogoutConfirm(false)} />}
      
      <nav style={{
        position: 'fixed', top: '12px', left: '12px', right: '12px', zIndex: 50,
        background: 'var(--bg-primary)',
        borderRadius: '20px',
        boxShadow: '8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px' }}>

            {/* Logo Section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <Link to="/" style={{ textDecoration: 'none' }}>
                <Logo size={40} isAnimating={false} />
              </Link>
              <div className="hidden lg:block neu-inner" style={{ height: '32px', width: '1px' }} />
              <div className="hidden lg:flex" style={{ flexDirection: 'column' }}>
                <span style={{ fontSize: '9px', fontWeight: 900, color: 'var(--color-danger)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  ResQNet AI
                </span>
                <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Secure Emergency Mesh
                </span>
              </div>
            </div>

            {/* Navigation Links Tray */}
            <div className="neu-inner" style={{ 
              display: 'flex', alignItems: 'center', gap: '4px', 
              padding: '6px', borderRadius: '16px' 
            }}>
              {demoLinks.map(({ path, label, Icon }) => {
                const isActive = pathname === path;
                return (
                  <Link 
                    key={path} 
                    to={path} 
                    className={isActive ? 'neu-card' : ''} 
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 16px', borderRadius: '12px', fontSize: '0.75rem',
                      fontWeight: 800, textDecoration: 'none', transition: 'all 0.3s',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      background: isActive ? 'var(--bg-card)' : 'transparent',
                      color: isActive ? 'var(--color-danger)' : 'var(--text-secondary)' 
                    }}
                  >
                    <Icon size={16} style={{ 
                      color: isActive ? 'var(--color-danger)' : 'var(--text-muted)', 
                      transition: 'color 0.3s' 
                    }} />
                    <span className="hidden xl:inline">{label}</span>
                  </Link>
                );
              })}
            </div>

            {/* User Actions Section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button 
                onClick={toggleTheme} 
                className="neu-button" 
                style={{
                  width: '40px', height: '40px', padding: 0, borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isDark ? '#fbbf24' : '#6366f1'
                }}
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {isAuthenticated ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="hidden sm:flex neu-inner" style={{ 
                    padding: '6px 14px', borderRadius: '12px', 
                    alignItems: 'center', gap: '10px'
                  }}>
                    <UserIcon size={14} style={{ color: 'var(--color-danger)' }} />
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {user?.name.split(' ')[0]}
                    </span>
                  </div>
                  
                  <button 
                    onClick={() => setShowLogoutConfirm(true)} 
                    className="neu-button"
                    style={{ 
                      width: '40px', height: '40px', padding: 0, borderRadius: '12px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--text-muted)' 
                    }}
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              ) : (
                <Link to="/login" className="neu-button primary" style={{
                  padding: '10px 24px', borderRadius: '14px', textDecoration: 'none',
                  fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em'
                }}>
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}