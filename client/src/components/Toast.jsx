import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, Navigation, X } from 'lucide-react';

let toastId = 0;
let globalAddToast = null;

export const showToast = (message, type = 'info') => {
  if (globalAddToast) globalAddToast(message, type);
};

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    setTimeout(() => { setToasts((prev) => prev.filter((t) => t.id !== id)); }, duration);
  }, []);

  useEffect(() => { globalAddToast = addToast; }, [addToast]);
  const removeToast = (id) => { setToasts((prev) => prev.filter((t) => t.id !== id)); };

  const config = {
    success: { icon: <CheckCircle2 size={18} />, color: '#4ade80', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)' },
    error:   { icon: <XCircle size={18} />,      color: '#fca5a5', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)' },
    warning: { icon: <AlertTriangle size={18} />, color: '#facc15', bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.25)' },
    info:    { icon: <Info size={18} />,          color: '#60a5fa', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)' },
    dispatch:{ icon: <Navigation size={18} />,    color: '#fb923c', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.25)' },
  };

  return (
    <>
      {children}
      <div style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px', width: '100%', pointerEvents: 'none' }}>
        {toasts.map((toast) => {
          const theme = config[toast.type] || config.info;
          return (
            <div key={toast.id} onClick={() => removeToast(toast.id)} style={{
              background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '16px 18px',
              backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', animation: 'fadeIn 0.3s ease-out',
              display: 'flex', alignItems: 'flex-start', gap: '14px', pointerEvents: 'auto', cursor: 'pointer',
              position: 'relative', overflow: 'hidden', boxShadow: `var(--shadow-card), 0 0 20px ${theme.border}`, fontFamily: 'var(--font-family)',
            }}>
              <div style={{ color: theme.color, flexShrink: 0, marginTop: '2px' }}>{theme.icon}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)', marginBottom: '4px' }}>System Alert</p>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>{toast.message}</p>
              </div>
              <div style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '2px', transition: 'color 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
              ><X size={14} /></div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, height: '2px', width: '100%', background: 'var(--bg-glass)' }}>
                <div style={{ height: '100%', background: theme.color, animation: `shrinkWidth ${toast.duration}ms linear forwards` }} />
              </div>
            </div>
          );
        })}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shrinkWidth { from { width: 100%; } to { width: 0%; } }
        @keyframes shake { 10%,90%{transform:translate3d(-1px,0,0)} 20%,80%{transform:translate3d(2px,0,0)} 30%,50%,70%{transform:translate3d(-4px,0,0)} 40%,60%{transform:translate3d(4px,0,0)} }
        .animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
      `}} />
    </>
  );
}
