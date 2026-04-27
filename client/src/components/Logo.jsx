import React from 'react';

export default function Logo({ size = 36, showText = true, isAnimating = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div className="neu-card" style={{
        width: size, height: size, borderRadius: '12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        boxShadow: 'inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light)' }}>
        <svg
          width={size * 0.65}
          height={size * 0.65}
          viewBox="0 0 100 100"
          style={{ overflow: 'visible' }}
        >
          {isAnimating && (
            <circle cx="50" cy="50" r="30" fill="var(--color-danger)" opacity="0.2">
              <animate attributeName="r" values="30;50;30" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
            </circle>
          )}

          <polygon 
            points="50,5 90,25 90,75 50,95 10,75 10,25" 
            fill="none" 
            stroke="var(--color-secondary)" 
            strokeWidth="5"
            strokeDasharray={isAnimating ? "300" : "none"}
            strokeDashoffset={isAnimating ? "300" : "0"}
            style={{ 
              transition: 'all 0.5s ease',
              animation: isAnimating ? 'dashDraw 2s ease forwards, rotateHex 10s linear infinite' : 'none',
              transformOrigin: '50% 50%'
            }} 
          />

          <path 
            d="M 42 30 L 58 30 L 58 42 L 70 42 L 70 58 L 58 58 L 58 70 L 42 70 L 42 58 L 30 58 L 30 42 L 42 42 Z" 
            fill="var(--color-danger)" 
            style={{ 
              filter: 'drop-shadow(0px 0px 4px var(--color-danger))',
              animation: isAnimating ? 'pulseCore 1.5s ease-in-out infinite' : 'none',
              transformOrigin: '50% 50%'
            }}
          />

          <path 
            d="M 10 50 L 35 50 L 45 20 L 55 80 L 65 50 L 90 50" 
            fill="none" 
            stroke="var(--bg-primary)" 
            strokeWidth="4" 
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              filter: 'drop-shadow(0px 0px 2px #000)',
              animation: isAnimating ? 'ekgDash 1.5s linear infinite' : 'none',
              strokeDasharray: isAnimating ? '200' : 'none',
              strokeDashoffset: isAnimating ? '200' : '0'
            }}
          />
        </svg>

        <style dangerouslySetInnerHTML={{__html: `
          @keyframes dashDraw {
            to { stroke-dashoffset: 0; }
          }
          @keyframes rotateHex {
            100% { transform: rotate(360deg); }
          }
          @keyframes pulseCore {
            0% { transform: scale(0.9); opacity: 0.8; }
            50% { transform: scale(1.1); opacity: 1; filter: drop-shadow(0px 0px 8px var(--color-danger)); }
            100% { transform: scale(0.9); opacity: 0.8; }
          }
          @keyframes ekgDash {
            0% { stroke-dashoffset: 200; }
            50% { stroke-dashoffset: 0; }
            100% { stroke-dashoffset: -200; }
          }
        `}} />
      </div>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="neu-text" style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.95rem', lineHeight: 1, letterSpacing: '-0.01em', transition: 'color 0.3s' }}>
            ResQ<span style={{ color: 'var(--color-danger)' }}>Net</span>
          </span>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', transition: 'color 0.3s' }}>
            Systems
          </span>
        </div>
      )}
    </div>
  );
}
