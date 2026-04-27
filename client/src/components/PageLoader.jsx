import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Logo from './Logo';

export default function PageLoader() {
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsLoading(true);
    
    // Simulate loading time (e.g. 1.2 seconds)
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200); 

    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (!isLoading) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'loaderFadeOut 0.3s ease forwards',
      animationDelay: '0.9s', 
    }}>
      <Logo size={100} showText={false} isAnimating={true} />
      
      <div className="neu-text" style={{ 
        marginTop: '40px', 
        fontSize: '1rem', 
        fontWeight: 800, 
        color: 'var(--text-primary)',
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
        animation: 'pulseText 1.5s ease-in-out infinite'
      }}>
        Initializing
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes loaderFadeOut {
          to { opacity: 0; pointer-events: none; }
        }
        @keyframes pulseText {
          0%, 100% { opacity: 0.4; filter: drop-shadow(0px 0px 2px transparent); }
          50% { opacity: 1; filter: drop-shadow(0px 0px 8px var(--color-secondary)); }
        }
      `}} />
    </div>
  );
}
