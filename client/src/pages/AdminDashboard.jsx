import { useState, useEffect, useCallback } from 'react';
import { getDashboard } from '../services/api';
import socket from '../services/socket';
import { useSocket } from '../hooks/useSocket';
import { AlertCircle, Activity, Bed, Building2, RefreshCw, LayoutDashboard } from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="glass-card" style={{ padding: '24px', borderRadius: '20px', borderLeft: `3px solid ${color}`, boxShadow: `inset 0 1px 0 ${color}30, 0 0 30px ${color}08` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <Icon size={20} style={{ color }} />
        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '4px' }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{sub}</div>}
    </div>
  );
}

function EmergencyRow({ emergency }) {
  const typeIcons = { accident: '🚗', cardiac: '❤️', fire: '🔥', flood: '🌊', breathing: '🫁', stroke: '🧠', other: '⚠️' };
  return (
    <div className="glass-card" style={{ padding: '14px 18px', borderRadius: '14px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: 'var(--bg-glass)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '1.2rem' }}>{typeIcons[emergency.type] || '⚠️'}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{emergency.patientName}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{emergency.type.charAt(0).toUpperCase() + emergency.type.slice(1)} • {emergency.patientPhone}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {emergency.assignedAmbulance && <span style={{ fontSize: '11px', fontFamily: 'monospace', padding: '4px 10px', borderRadius: '8px', background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>🚑 {emergency.assignedAmbulance.vehicleNumber}</span>}
        <span className={`status-badge status-${emergency.status}`}>{emergency.status}</span>
      </div>
    </div>
  );
}

function HospitalRow({ hospital }) {
  const bedPct = hospital.totalBeds > 0 ? Math.round((hospital.availableBeds / hospital.totalBeds) * 100) : 0;
  const icuPct = hospital.icuTotal > 0 ? Math.round((hospital.icuAvailable / hospital.icuTotal) * 100) : 0;
  const barColor = (pct) => pct > 30 ? '#22c55e' : pct > 10 ? '#eab308' : '#ef4444';
  return (
    <div className="glass-card" style={{ padding: '16px 18px', borderRadius: '14px', background: 'var(--bg-glass)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div><div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{hospital.name}</div><div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{hospital.address}</div></div>
        {hospital.emergencyDepartment && <span style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '9999px', background: 'rgba(34,197,94,0.1)', color: '#4ade80', fontWeight: 700 }}>ER ✓</span>}
      </div>
      {[{ label: 'Beds', pct: bedPct, val: `${hospital.availableBeds}/${hospital.totalBeds}`, isBed: true }, { label: 'ICU', pct: icuPct, val: `${hospital.icuAvailable}/${hospital.icuTotal}`, isBed: false }].map((item) => (
        <div key={item.label} style={{ marginBottom: item.isBed ? '10px' : 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
            <span style={{ color: 'var(--text-muted)' }}>{item.label}</span><span style={{ color: 'var(--text-secondary)' }}>{item.val}</span>
          </div>
          <div style={{ height: '6px', borderRadius: '4px', overflow: 'hidden', background: 'var(--bg-glass)' }}>
            <div style={{ height: '100%', width: `${item.pct}%`, background: barColor(item.pct), borderRadius: '4px', transition: 'all 0.5s' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => { try { const res = await getDashboard(); setDashboard(res.data.data); } catch (err) { console.error('Failed to load:', err); } finally { setLoading(false); } };
  useEffect(() => { fetchDashboard(); socket.emit('admin:join'); }, []);
  const handleRefresh = useCallback(() => { fetchDashboard(); }, []);
  useSocket(socket, 'emergency:new', handleRefresh);
  useSocket(socket, 'emergency:status-change', handleRefresh);
  useSocket(socket, 'ambulance:status-change', handleRefresh);

  if (loading) return <div className="page-enter" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}><div className="spinner" /><span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3em', color: 'var(--text-muted)' }}>Loading Command Center</span></div>;
  if (!dashboard) return <div className="page-enter" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--text-muted)' }}>Failed to load dashboard data.</p></div>;

  const { emergencies, ambulances, hospitals, recentEmergencies } = dashboard;

  return (
    <div className="page-enter" style={{ minHeight: '100vh', padding: '96px 24px 48px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <LayoutDashboard size={14} style={{ color: '#f97316' }} />
              <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>Command Center</span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.03em' }}>Admin <span className="gradient-text">Dashboard</span></h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Real-time overview of all emergency operations</p>
          </div>
          <button onClick={fetchDashboard} className="cursor-pointer" style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', fontFamily: 'var(--font-family)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-glass-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-glass)'; }}
          ><RefreshCw size={14} /> Refresh</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <StatCard icon={AlertCircle} label="Active Emergencies" value={emergencies.active} sub={`${emergencies.total} total`} color="#ef4444" />
          <StatCard icon={Activity} label="Available Ambulances" value={ambulances.available} sub={`${ambulances.total} total`} color="#3b82f6" />
          <StatCard icon={Bed} label="Available Beds" value={hospitals.beds?.availableBeds || 0} sub={`${hospitals.beds?.totalBeds || 0} total capacity`} color="#22c55e" />
          <StatCard icon={Building2} label="ICU Available" value={hospitals.beds?.availableICU || 0} sub={`${hospitals.beds?.totalICU || 0} total ICU`} color="#f97316" />
        </div>

        {emergencies.byType?.length > 0 && (
          <div className="glass-card" style={{ padding: '20px', borderRadius: '18px', marginBottom: '28px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '14px' }}>Emergency Breakdown</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {emergencies.byType.map((item) => (
                <div key={item._id} style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)' }}>
                  <span style={{ fontWeight: 800, color: '#f97316' }}>{item.count}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{item._id}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
          <div>
            <h3 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '14px' }}>Recent Emergencies</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentEmergencies?.length > 0 ? recentEmergencies.map((em) => <EmergencyRow key={em._id} emergency={em} />) : (
                <div className="glass-card" style={{ padding: '32px', textAlign: 'center', borderRadius: '16px' }}>
                  <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>✅</span>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No emergencies recorded yet</p>
                </div>
              )}
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '14px' }}>Hospital Capacity</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}><HospitalCapacitySection /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HospitalCapacitySection() {
  const [hospitals, setHospitals] = useState([]);
  useEffect(() => { (async () => { try { const { getAdminHospitals } = await import('../services/api'); const res = await getAdminHospitals(); setHospitals(res.data.data); } catch (err) { console.error(err); } })(); }, []);
  if (hospitals.length === 0) return <div className="glass-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', borderRadius: '14px' }}>Loading hospital data...</div>;
  return hospitals.map((h) => <HospitalRow key={h._id} hospital={h} />);
}
