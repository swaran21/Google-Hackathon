import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Cpu, Navigation, Building2, MessageSquare, ShieldAlert, Map as MapIcon } from 'lucide-react';

const SEV = {
  1: { color: '#4ade80', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', label: 'LOW' },
  2: { color: '#60a5fa', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', label: 'MODERATE' },
  3: { color: '#facc15', bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.2)', label: 'HIGH' },
  4: { color: '#fb923c', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)', label: 'CRITICAL' },
  5: { color: '#fca5a5', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', label: 'EXTREME' },
};

export default function SOSResult({ result, onReset }) {
  const navigate = useNavigate();
  const { emergency, triage, ambulance, suggestedHospitals, notifications } = result;
  const topHospital = suggestedHospitals?.[0]?.hospital;
  const sev = SEV[triage?.severity] || SEV[3];

  return (
    <div className="page-enter" style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Success Banner */}
      <div style={{ textAlign: 'center', paddingBottom: '28px', borderBottom: '1px solid var(--border-glass)' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 20px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(16,185,129,0.12)' }}>
          <CheckCircle2 size={36} style={{ color: '#22c55e' }} />
        </div>
        <h2 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '8px' }}>Response Active</h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase', transition: 'color 0.3s' }}>Emergency ID</span>
          <span style={{ padding: '4px 12px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#ef4444', fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 900, textTransform: 'uppercase' }}>{emergency._id.slice(-8)}</span>
        </div>
      </div>

      {/* AI Triage */}
      <div style={{ position: 'relative', overflow: 'hidden', padding: '32px', background: 'var(--bg-glass)', border: `1px solid ${sev.border}`, borderRadius: '28px' }}>
        <div style={{ position: 'absolute', top: '24px', right: '24px', opacity: 0.04, pointerEvents: 'none' }}><Cpu size={120} /></div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', borderRadius: '12px', background: sev.bg, color: sev.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Cpu size={22} /></div>
              <h3 style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: sev.color }}>AI Triage Analysis</h3>
            </div>
            <span style={{ padding: '6px 16px', borderRadius: '9999px', fontSize: '11px', fontWeight: 900, background: sev.bg, border: `1px solid ${sev.border}`, color: sev.color }}>
              SEVERITY LEVEL {triage?.severity} • {sev.label}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '24px', fontWeight: 500, fontStyle: 'italic', transition: 'color 0.3s' }}>"{triage?.reasoning}"</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-glass)' }}>
            {[
              { label: 'Confidence', value: `${Math.round((triage?.confidence || 0) * 100)}%` },
              { label: 'Resource', value: triage?.responseLevel || '—' },
              { label: 'Equipment', value: triage?.recommendedEquipment?.replace('_', ' ') || '—' },
              { label: 'Engine', value: triage?.aiModel || '—', small: true },
            ].map((item) => (
              <div key={item.label}>
                <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>{item.label}</p>
                <p style={{ fontSize: item.small ? '10px' : '1.1rem', fontWeight: 800, textTransform: 'capitalize', fontFamily: item.small ? 'monospace' : 'inherit', opacity: item.small ? 0.5 : 1 }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '28px', borderRadius: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(37,99,235,0.1)', color: '#3b82f6', display: 'flex' }}><Navigation size={22} /></div>
            <h3 style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#3b82f6' }}>Unit Deployment</h3>
          </div>
          {ambulance ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: '14px', borderBottom: '1px solid var(--border-glass)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Fleet Unit</span>
                <span style={{ fontSize: '1.25rem', fontFamily: 'monospace', fontWeight: 900 }}>{ambulance.vehicleNumber}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '14px', background: 'var(--bg-glass)', borderRadius: '14px', textAlign: 'center' }}>
                  <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>ETA</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 900, color: '#22c55e' }}>{ambulance.eta}m</p>
                </div>
                <div style={{ padding: '14px', background: 'var(--bg-glass)', borderRadius: '14px', textAlign: 'center' }}>
                  <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Dist</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 900 }}>{ambulance.distance}km</p>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'rgba(249,115,22,0.06)', borderRadius: '14px', color: '#f97316' }}>
              <ShieldAlert size={20} /><p style={{ fontSize: '12px', fontWeight: 700 }}>Queueing for available fleet...</p>
            </div>
          )}
        </div>
        <div className="glass-card" style={{ padding: '28px', borderRadius: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', display: 'flex' }}><Building2 size={22} /></div>
            <h3 style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#22c55e' }}>Facility Triage</h3>
          </div>
          {topHospital ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.3 }}>{topHospital.name}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '14px', background: 'var(--bg-glass)', borderRadius: '14px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Emergency Beds</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 900, color: '#22c55e' }}>{topHospital.availableBeds}</p>
                </div>
                <div style={{ padding: '14px', background: 'var(--bg-glass)', borderRadius: '14px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>ICU Capacity</p>
                  <p style={{ fontSize: '1.25rem', fontWeight: 900, color: topHospital.icuAvailable > 0 ? '#22c55e' : '#ef4444' }}>{topHospital.icuAvailable}</p>
                </div>
              </div>
            </div>
          ) : <p style={{ color: 'var(--text-muted)' }}>No hospital data</p>}
        </div>
      </div>

      {/* Log */}
      {notifications?.length > 0 && (
        <div className="glass-card" style={{ padding: '28px', borderRadius: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <MessageSquare size={18} style={{ color: 'var(--text-muted)' }} />
            <h4 style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)' }}>Alert Propagation Log</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {notifications.map((n, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '14px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>{n.to}</span>
                </div>
                <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{n.provider} SYNC SUCCESS</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', paddingTop: '16px' }}>
        <button onClick={() => navigate('/tracking')} className="cursor-pointer" style={{ padding: '14px 28px', background: '#2563eb', color: '#fff', borderRadius: '16px', fontWeight: 700, border: 'none', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 8px 24px rgba(37,99,235,0.25)', transition: 'all 0.3s', fontFamily: 'var(--font-family)' }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        ><MapIcon size={18} /> Satellite Track</button>
        <button onClick={() => navigate('/driver')} className="cursor-pointer" style={{ padding: '14px 28px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '16px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.3s', fontFamily: 'var(--font-family)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-glass-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-glass)'; }}
        ><Navigation size={18} /> Driver Dashboard</button>
        <button onClick={onReset} className="cursor-pointer" style={{ padding: '14px 28px', background: 'transparent', color: 'var(--text-muted)', borderRadius: '16px', fontWeight: 700, border: 'none', transition: 'color 0.2s', fontFamily: 'var(--font-family)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
        >Dismiss Call</button>
      </div>
    </div>
  );
}