import { useState, useEffect } from 'react';
import api from '../services/api';
import socket from '../services/socket';
import { showToast } from '../components/Toast';
import { Building2, Bed, ShieldCheck, Plus, Minus, Stethoscope, Loader2 } from 'lucide-react';

export default function HospitalPage() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/hospitals').then((res) => { setHospitals(res.data.data); setLoading(false); }).catch(() => { showToast('Failed to load telemetry', 'error'); setLoading(false); });
  }, []);

  const updateBeds = async (hospitalId, field, value) => {
    try {
      const update = { [field]: parseInt(value) };
      const res = await api.patch(`/hospitals/${hospitalId}/beds`, update);
      setHospitals((prev) => prev.map((h) => h._id === hospitalId ? res.data.data : h));
      showToast(`${field === 'availableBeds' ? 'Bed' : 'ICU'} synchronization successful`, 'success');
    } catch (err) { showToast(err.response?.data?.message || 'Update failed', 'error'); }
  };

  if (loading) return (
    <div className="page-enter" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <Loader2 size={32} style={{ color: '#22c55e', animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3em', color: 'var(--text-muted)' }}>Initializing Medical Portal</span>
    </div>
  );

  return (
    <div className="page-enter" style={{ minHeight: '100vh', padding: '96px 24px 48px' }}>
      <div style={{ maxWidth: '1024px', margin: '0 auto' }}>
        <div style={{ marginBottom: '40px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e', animation: 'pulse-glow 2s ease-in-out infinite' }} />
              <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#22c55e' }}>Internal Resource Network</span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.03em' }}>Facility <span style={{ color: '#22c55e', fontStyle: 'italic' }}>Inventory</span></h1>
          </div>
          <div className="glass-card" style={{ padding: '10px 18px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Monitored</p>
              <p style={{ fontSize: '0.875rem', fontWeight: 700 }}>{hospitals.length} Facilities</p>
            </div>
            <Building2 size={20} style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {hospitals.map((h) => <HospitalCard key={h._id} hospital={h} onUpdate={updateBeds} />)}
        </div>
      </div>
    </div>
  );
}

function HospitalCard({ hospital, onUpdate }) {
  const [beds, setBeds] = useState(hospital.availableBeds);
  const [icu, setIcu] = useState(hospital.icuAvailable);
  const bedPct = hospital.totalBeds > 0 ? (beds / hospital.totalBeds) * 100 : 0;
  const icuPct = hospital.icuTotal > 0 ? (icu / hospital.icuTotal) * 100 : 0;
  const getStatusColor = (pct) => pct > 50 ? '#22c55e' : pct > 20 ? '#eab308' : '#ef4444';
  const barStyle = (pct) => ({ position: 'absolute', top: 0, left: 0, height: '100%', width: `${pct}%`, background: getStatusColor(pct), borderRadius: '4px', transition: 'all 0.5s' });

  return (
    <div className="glass-card" style={{ borderRadius: '28px', overflow: 'hidden' }}>
      <div style={{ padding: '32px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', marginBottom: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--icon-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Building2 size={24} /></div>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 900, letterSpacing: '-0.02em' }}>{hospital.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{hospital.address}</span>
                  {hospital.emergencyDepartment && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '6px', fontSize: '9px', fontWeight: 800, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', textTransform: 'uppercase' }}>
                      <ShieldCheck size={10} /> ER ACTIVE
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
              {hospital.specialties?.map((s) => (
                <span key={s} style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 700, background: 'var(--bg-badge)', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{s}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {[{ label: 'General Beds', val: beds, pct: bedPct }, { label: 'ICU Units', val: icu, pct: icuPct }].map((item) => (
              <div key={item.label} style={{ background: 'var(--bg-glass)', padding: '14px 20px', borderRadius: '14px', minWidth: '110px', textAlign: 'center', border: '1px solid var(--border-glass)' }}>
                <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>{item.label}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'monospace', color: getStatusColor(item.pct) }}>{item.val}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '40px', marginBottom: '32px' }}>
          {[{ icon: <Bed size={16} />, label: 'General Capacity', val: beds, max: hospital.totalBeds, pct: bedPct, field: 'availableBeds', setter: setBeds },
            { icon: <Stethoscope size={16} />, label: 'Critical ICU Care', val: icu, max: hospital.icuTotal, pct: icuPct, field: 'icuAvailable', setter: setIcu }].map((ctrl) => (
            <div key={ctrl.label} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{ctrl.icon}</span>
                  <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>{ctrl.label}</span>
                </div>
                <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700 }}>{ctrl.val} / {ctrl.max}</span>
              </div>
              <div style={{ position: 'relative', height: '6px', width: '100%', background: 'var(--bg-glass)', borderRadius: '4px', overflow: 'hidden' }}><div style={barStyle(ctrl.pct)} /></div>
              <input type="range" min="0" max={ctrl.max} value={ctrl.val}
                onChange={(e) => ctrl.setter(parseInt(e.target.value))}
                onMouseUp={() => onUpdate(hospital._id, ctrl.field, ctrl.val)}
                onTouchEnd={() => onUpdate(hospital._id, ctrl.field, ctrl.val)}
                className="cursor-pointer" style={{ width: '100%', opacity: 0.4, transition: 'opacity 0.2s', accentColor: '#22c55e' }}
                onMouseEnter={(e) => { e.target.style.opacity = 1; }} onMouseLeave={(e) => { e.target.style.opacity = 0.4; }}
              />
            </div>
          ))}
        </div>

        <div style={{ paddingTop: '24px', borderTop: '1px solid var(--border-glass)' }}>
          <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '14px' }}>Tactical Adjustments</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {[
              { label: 'Admit Patient', field: 'beds', val: -1, icon: <Minus size={14} /> },
              { label: 'Release Patient', field: 'beds', val: 1, icon: <Plus size={14} /> },
              { label: 'ICU Intake', field: 'icu', val: -1, icon: <Minus size={14} /> },
              { label: 'ICU Discharge', field: 'icu', val: 1, icon: <Plus size={14} /> },
            ].map((btn) => (
              <button key={btn.label} className="cursor-pointer" onClick={() => {
                if (btn.field === 'beds') { const next = Math.max(0, Math.min(hospital.totalBeds, beds + btn.val)); setBeds(next); onUpdate(hospital._id, 'availableBeds', next); }
                else { const next = Math.max(0, Math.min(hospital.icuTotal, icu + btn.val)); setIcu(next); onUpdate(hospital._id, 'icuAvailable', next); }
              }} style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px',
                border: '1px solid var(--border-glass)', background: 'var(--bg-glass)', color: 'var(--text-secondary)',
                fontSize: '12px', fontWeight: 700, transition: 'all 0.2s', fontFamily: 'var(--font-family)',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.08)'; e.currentTarget.style.borderColor = 'rgba(34,197,94,0.2)'; e.currentTarget.style.color = '#22c55e'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-glass)'; e.currentTarget.style.borderColor = 'var(--border-glass)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >{btn.icon} {btn.label}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}