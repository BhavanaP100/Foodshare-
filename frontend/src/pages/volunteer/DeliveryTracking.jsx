import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { io } from 'socket.io-client';
import DashboardLayout from '../../layouts/DashboardLayout';
import { StatusBadge, Spinner } from '../../components/common/UIComponents';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createColoredIcon = (color, emoji) => L.divIcon({
  html: `<div style="background:${color};width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 3px 12px rgba(0,0,0,0.3);border:3px solid white;">${emoji}</div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const FSM_TRANSITIONS = {
  accepted: { label: 'Mark as Picked Up', next: 'picked_up', color: '#f59e0b' },
  picked_up: { label: 'Mark In Transit', next: 'in_transit', color: '#0ea5e9' },
  in_transit: { label: 'Mark as Delivered', next: 'delivered', color: '#22c55e' },
  delivered: { label: 'Verify Delivery', next: 'verified', color: '#8b5cf6' },
};

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(positions, { padding: [50, 50] });
    }
  }, [positions]);
  return null;
}

export default function DeliveryTracking() {
  const { id } = useParams();
  const { user } = useAuth();
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const socketRef = useRef(null);
  const [volunteerPos, setVolunteerPos] = useState(null);

  useEffect(() => {
    api.get(`/tracking/${id}`)
      .then(({ data }) => { if (data.success) setLog(data.log); })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Socket.io for real-time
    socketRef.current = io('http://localhost:5000');
    socketRef.current.emit('join_room', `donation_${id}`);
    socketRef.current.on('status_update', ({ status }) => {
      setLog(prev => prev ? { ...prev, currentStatus: status } : prev);
    });
    socketRef.current.on('location_update', ({ lat, lng }) => {
      setVolunteerPos([lat, lng]);
    });

    return () => socketRef.current?.disconnect();
  }, [id]);

  const updateStatus = async () => {
    const transition = FSM_TRANSITIONS[log?.currentStatus];
    if (!transition) return;
    setUpdating(true);
    try {
      const { data } = await api.put('/tracking/status', {
        donationId: id,
        newStatus: transition.next,
        note: `Status updated to ${transition.next}`,
      });
      if (data.success) setLog(data.log);
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const shareLocation = () => {
    navigator.geolocation?.watchPosition(async ({ coords }) => {
      const pos = [coords.latitude, coords.longitude];
      setVolunteerPos(pos);
      await api.put('/tracking/location', {
        donationId: id,
        lat: coords.latitude,
        lng: coords.longitude,
      });
    });
  };

  if (loading) return (
    <DashboardLayout title="Delivery Tracking">
      <div className="flex justify-center py-24"><Spinner size={12} /></div>
    </DashboardLayout>
  );

  if (!log) return (
    <DashboardLayout title="Delivery Tracking">
      <div className="text-center py-24 text-gray-400">No tracking data found for this delivery.</div>
    </DashboardLayout>
  );

  const donorCoords = log.donor?.location?.coordinates;
  const ngoCoords = log.ngo?.location?.coordinates;
  const volCoords = volunteerPos || (log.volunteerLocation ? [log.volunteerLocation.lat, log.volunteerLocation.lng] : null);

  const mapPositions = [
    donorCoords ? [donorCoords[1], donorCoords[0]] : null,
    ngoCoords ? [ngoCoords[1], ngoCoords[0]] : null,
    volCoords || null,
  ].filter(Boolean);

  const defaultCenter = mapPositions[0] || [12.9716, 77.5946];

  const FSM_STEPS = ['requested','accepted','picked_up','in_transit','delivered','verified'];
  const currentIdx = FSM_STEPS.indexOf(log.currentStatus);
  const transition = FSM_TRANSITIONS[log.currentStatus];

  return (
    <DashboardLayout title="Live Delivery Tracking">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Map */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', height: 460 }}>
            <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />

              {donorCoords && (
                <Marker position={[donorCoords[1], donorCoords[0]]} icon={createColoredIcon('#22c55e', '📦')}>
                  <Popup><strong>Pickup Point</strong><br />{log.donor?.name}<br />{log.donor?.address}</Popup>
                </Marker>
              )}

              {ngoCoords && (
                <Marker position={[ngoCoords[1], ngoCoords[0]]} icon={createColoredIcon('#0ea5e9', '🏠')}>
                  <Popup><strong>Drop-off: {log.ngo?.ngoName}</strong><br />{log.ngo?.address}</Popup>
                </Marker>
              )}

              {volCoords && (
                <Marker position={volCoords} icon={createColoredIcon('#f59e0b', '🚴')}>
                  <Popup><strong>Volunteer</strong><br />{log.volunteer?.name}</Popup>
                </Marker>
              )}

              {mapPositions.length > 1 && (
                <Polyline positions={mapPositions} color="#22c55e" weight={3} dashArray="6 6" opacity={0.7} />
              )}

              <FitBounds positions={mapPositions} />
            </MapContainer>
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-3 flex-wrap">
            {[['#22c55e','📦','Pickup (Donor)'],['#0ea5e9','🏠','Drop-off (NGO)'],['#f59e0b','🚴','Volunteer']].map(([c,e,l]) => (
              <div key={l} className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-sm" style={{ background: c }}>{e}</div>
                {l}
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Donation info */}
          <div className="bg-white rounded-2xl p-5" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1rem', color: '#14532d', marginBottom: 12 }}>
              {log.donation?.foodName}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Status</span><StatusBadge status={log.currentStatus} /></div>
              <div className="flex justify-between"><span className="text-gray-400">Volunteer</span><span className="font-medium text-gray-700">{log.volunteer?.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Rating</span><span className="text-amber-500">⭐ {log.volunteer?.rating?.toFixed(1)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Donor</span><span className="font-medium text-gray-700">{log.donor?.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">NGO</span><span className="font-medium text-gray-700">{log.ngo?.ngoName || log.ngo?.name}</span></div>
            </div>
          </div>

          {/* FSM Progress */}
          <div className="bg-white rounded-2xl p-5" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
            <h4 className="text-sm font-semibold text-gray-700 mb-4">Delivery Progress</h4>
            <div className="space-y-2">
              {FSM_STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: i < currentIdx ? '#dcfce7' : i === currentIdx ? '#22c55e' : '#f9fafb', color: i < currentIdx ? '#15803d' : i === currentIdx ? '#fff' : '#d1d5db' }}>
                    {i < currentIdx ? '✓' : i + 1}
                  </div>
                  <span className="text-sm capitalize" style={{ color: i <= currentIdx ? '#15803d' : '#9ca3af', fontWeight: i === currentIdx ? 600 : 400 }}>
                    {s.replace('_', ' ')}
                  </span>
                  {i === currentIdx && <div className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          {user?.role === 'volunteer' && (
            <div className="space-y-3">
              {transition && (
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={updateStatus}
                  disabled={updating}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm"
                  style={{ background: updating ? '#86efac' : `linear-gradient(135deg, ${transition.color}, ${transition.color}cc)`, boxShadow: `0 4px 16px ${transition.color}40` }}
                >
                  {updating ? 'Updating…' : transition.label}
                </motion.button>
              )}
              {log.currentStatus === 'accepted' && (
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={shareLocation}
                  className="w-full py-3 rounded-xl text-green-600 font-medium text-sm border-2 border-green-200 bg-green-50"
                >
                  📍 Share Live Location
                </motion.button>
              )}
              {log.currentStatus === 'verified' && (
                <div className="text-center py-4 text-green-600 font-semibold">
                  🎉 Delivery Verified! Great work!
                </div>
              )}
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-2xl p-5" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Timeline</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {log.statusHistory?.slice().reverse().map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-700 capitalize">{h.status?.replace('_', ' ')}</span>
                    <span className="text-gray-400 ml-2">{new Date(h.timestamp).toLocaleTimeString()}</span>
                    {h.note && <div className="text-gray-400">{h.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
