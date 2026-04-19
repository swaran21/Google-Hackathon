import { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import api from '../services/api';
import socket from '../services/socket';
import { useSocket } from '../hooks/useSocket';
import { showToast } from '../components/Toast';
import { useTheme } from '../context/ThemeContext';
import { Navigation, CheckCircle2, XCircle, Play, Pause, MapPin, Activity, Shield, Radio, Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const createMarkerIcon = (emoji, color, glowing = false) => L.divIcon({
  html: `<div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:#0a0a0f;border-radius:10px;border:2px solid ${color};box-shadow:0 0 ${glowing ? '14px' : '8px'} ${color}50;font-size:16px;">${emoji}</div>`,
  className: '', iconSize: [36, 36], iconAnchor: [18, 18],
});
const ambIcon = createMarkerIcon('🚑', '#ef4444', true);
const emIcon = createMarkerIcon('🆘', '#f97316', true);
const hospIcon = createMarkerIcon('🏥', '#3b82f6');

function RecenterMap({ center }) { const map = useMap(); useEffect(() => { if (center) map.setView(center, 15); }, [center, map]); return null; }

export default function DriverPage() {
  const [ambulances, setAmbulances] = useState([]);
  const [selectedAmb, setSelectedAmb] = useState(null);
  const [driverData, setDriverData] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const simRef = useRef(null);
  const { isDark } = useTheme();

  useEffect(() => { api.get('/ambulance').then((res) => setAmbulances(res.data.data)).catch(console.error); }, []);

  const fetchDriverStatus = async (ambId) => { try { const res = await api.get(`/driver/status?ambulanceId=${ambId}`); setDriverData(res.data.data); } catch { showToast('Telemetry sync failed', 'error'); } };
  const selectAmbulance = (amb) => { setSelectedAmb(amb); fetchDriverStatus(amb._id); };
  const handleAction = async (endpoint, payload, message, type = 'success') => { try { await api.post(`/driver/${endpoint}`, payload); showToast(message, type); fetchDriverStatus(selectedAmb._id); refreshAmbulances(); } catch (err) { showToast(err.response?.data?.message || 'Action failed', 'error'); } };

  const startSimulation = () => {
    setSimulating(true); showToast('GPS Stream Active: Unit in motion', 'info');
    simRef.current = setInterval(async () => {
      try { const res = await api.post('/driver/simulate-move', { ambulanceId: selectedAmb._id }); const { arrived } = res.data.data; fetchDriverStatus(selectedAmb._id); refreshAmbulances(); if (arrived) { clearInterval(simRef.current); setSimulating(false); showToast('Arrival Confirmed: Unit at scene', 'success'); } } catch { stopSimulation(); }
    }, 5000);
  };
  const stopSimulation = () => { clearInterval(simRef.current); setSimulating(false); showToast('GPS Stream Paused', 'warning'); };
  const refreshAmbulances = () => { api.get('/ambulance').then((res) => setAmbulances(res.data.data)).catch(console.error); };

  useSocket(socket, 'ambulance:location-update', (data) => {
    setAmbulances((prev) => prev.map((a) => a._id === data.ambulanceId ? { ...a, location: data.location, status: data.status } : a));
    if (selectedAmb?._id === data.ambulanceId) setSelectedAmb(prev => prev ? { ...prev, location: data.location, status: data.status } : prev);
  });

  const amb = driverData?.ambulance;
  const em = driverData?.emergency;
  const coords = useMemo(() => ({ amb: amb ? [amb.location.coordinates[1], amb.location.coordinates[0]] : null, em: em ? [em.location.coordinates[1], em.location.coordinates[0]] : null, hosp: em?.assignedHospital ? [em.assignedHospital.location.coordinates[1], em.assignedHospital.location.coordinates[0]] : null }), [amb, em]);

  const tileUrl = isDark ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const actionBtn = (onClick, bg, color, icon, label, extra = {}) => (
    <button onClick={onClick} className="cursor-pointer" style={{ padding: '12px 28px', borderRadius: '14px', border: 'none', background: bg, color, fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', fontFamily: 'var(--font-family)', ...extra }}>{icon} {label}</button>
  );

  return (
    <div className="page-enter" style={{ minHeight: '100vh', padding: '80px 24px 24px' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Radio size={14} style={{ color: '#ef4444', animation: 'pulse-glow 2s ease-in-out infinite' }} />
              <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)' }}>Field Simulation Protocol</span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.03em' }}>Driver <span style={{ color: '#dc2626' }}>Terminal</span></h1>
          </div>
          <div className="glass-card" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '10px', borderRadius: '14px' }}>
            <Activity size={16} style={{ color: '#22c55e' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>System Ready</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '75vh' }}>
            <h3 style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px' }}><Shield size={12} /> Active Fleet</h3>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
              {ambulances.map((a) => {
                const active = selectedAmb?._id === a._id;
                return (
                  <button key={a._id} onClick={() => selectAmbulance(a)} className="cursor-pointer" style={{
                    width: '100%', padding: '14px', borderRadius: '18px', textAlign: 'left', transition: 'all 0.3s',
                    border: `1px solid ${active ? '#ef4444' : 'var(--border-glass)'}`,
                    background: active ? 'rgba(220,38,38,0.08)' : 'var(--bg-glass)',
                    fontFamily: 'var(--font-family)',
                  }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = 'var(--border-glass)'; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.875rem', color: active ? '#ef4444' : 'var(--text-primary)' }}>{a.vehicleNumber}</span>
                      <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 8px', borderRadius: '9999px', textTransform: 'uppercase', background: a.status === 'available' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: a.status === 'available' ? '#22c55e' : '#ef4444' }}>{a.status}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}><Activity size={10} /> {a.equipmentLevel?.replace('_', ' ')}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0 }}>
            <div style={{ position: 'relative', flex: 1, borderRadius: '28px', overflow: 'hidden', border: '1px solid var(--border-glass)', minHeight: '400px' }}>
              <MapContainer center={[17.385, 78.4867]} zoom={12} zoomControl={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer url={tileUrl} />
                {coords.amb && <RecenterMap center={coords.amb} />}
                {coords.amb && <Marker position={coords.amb} icon={ambIcon} />}
                {coords.em && <Marker position={coords.em} icon={emIcon} />}
                {coords.hosp && <Marker position={coords.hosp} icon={hospIcon} />}
                {coords.amb && coords.em && <Polyline positions={[coords.amb, coords.em]} pathOptions={{ color: '#ef4444', weight: 3, dashArray: '10, 10', opacity: 0.5 }} />}
              </MapContainer>
              {selectedAmb && coords.amb && (
                <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 1000, background: isDark ? 'rgba(10,10,15,0.85)' : 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-glass)', padding: '12px 16px', borderRadius: '14px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '4px' }}>Satellite Lock</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444', animation: 'pulse-glow 2s ease-in-out infinite' }} />
                    <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700 }}>{coords.amb[0].toFixed(5)}, {coords.amb[1].toFixed(5)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="glass-card" style={{ padding: '28px', borderRadius: '24px' }}>
              {selectedAmb ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}><Navigation size={28} /></div>
                    <div>
                      <h3 style={{ fontSize: '1.35rem', fontWeight: 900 }}>{selectedAmb.vehicleNumber}</h3>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>{selectedAmb.driverName}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                    {amb?.status === 'dispatched' && (<>
                      {actionBtn(() => handleAction('accept', { ambulanceId: amb._id }, 'Mission Accepted'), '#16a34a', '#fff', <CheckCircle2 size={16} />, 'ACCEPT DISPATCH')}
                      {actionBtn(() => handleAction('reject', { ambulanceId: amb._id }, 'Mission Rejected', 'warning'), 'var(--bg-glass)', 'var(--text-secondary)', <XCircle size={16} />, 'REJECT', { border: '1px solid var(--border-glass)' })}
                    </>)}
                    {amb?.status === 'en_route' && (<>
                      {actionBtn(simulating ? stopSimulation : startSimulation, simulating ? 'rgba(234,179,8,0.12)' : '#2563eb', simulating ? '#eab308' : '#fff', simulating ? <Pause size={16} /> : <Play size={16} />, simulating ? 'PAUSE GPS' : 'ENGAGE AUTO-NAV', simulating ? { border: '1px solid rgba(234,179,8,0.3)' } : {})}
                      {actionBtn(() => handleAction('update-status', { ambulanceId: amb._id, status: 'at_scene' }, 'Unit At Scene'), 'var(--bg-glass)', 'var(--text-primary)', <MapPin size={16} />, 'MARK AT SCENE', { border: '1px solid var(--border-glass)' })}
                    </>)}
                    {amb?.status === 'at_scene' && actionBtn(() => handleAction('update-status', { ambulanceId: amb._id, status: 'available' }, 'Emergency Resolved'), '#16a34a', '#fff', <Shield size={16} />, 'COMPLETE MISSION & RETURN')}
                    {!em && amb?.status === 'available' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 24px', borderRadius: '9999px', background: 'var(--bg-glass)', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)' }}>
                        <Loader2 size={14} style={{ color: '#ef4444', animation: 'spin 1s linear infinite' }} /> Monitoring Emergency Frequencies...
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.15em' }}>Select Unit to Initiate Terminal</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}