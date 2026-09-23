import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck } from 'react-icons/fi';
import DashboardLayout from '../../layouts/DashboardLayout';
import { EmptyState, Spinner, SectionHeader } from '../../components/common/UIComponents';
import api from '../../services/api';

const RECOVERY_MAP = {
  compost: { bg: '#dcfce7', color: '#15803d', icon: '🌱', label: 'Compost' },
  animal_feed: { bg: '#fef3c7', color: '#92400e', icon: '🐄', label: 'Animal Feed' },
  biogas: { bg: '#ede9fe', color: '#5b21b6', icon: '⚡', label: 'Biogas' },
  discard_safely: { bg: '#f3f4f6', color: '#6b7280', icon: '🗑️', label: 'Safe Disposal' },
};

export default function ExpiredDonations() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState(null);

  useEffect(() => {
    api.get('/donations/my')
      .then(({ data }) => { if (data.success) setDonations(data.donations); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Only show expired donations whose recovery action hasn't been taken yet
  // — once confirmed, they disappear from this list.
  const expired = donations.filter(d => d.status === 'expired' && !d.recoveryActionTaken);

  const handleTakeAction = async (id) => {
    setActingOn(id);
    try {
      const { data } = await api.put(`/donations/${id}/recovery-action`);
      if (data.success) {
        setDonations(prev => prev.map(d => d._id === id ? { ...d, recoveryActionTaken: true } : d));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record action');
    } finally {
      setActingOn(null);
    }
  };

  return (
    <DashboardLayout title="Expired Food">
      <div className="bg-white rounded-2xl p-5" style={{ border: '1.5px solid #fee2e2', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
        <SectionHeader
          title="⚠️ Expired / Needs Recovery"
          sub={`${expired.length} listings missed pickup or spoiled in transit`}
        />
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : expired.length === 0 ? (
          <EmptyState icon="🎉" message="Nothing needs recovery action right now." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {expired.map((d) => {
                const s = RECOVERY_MAP[d.recoveryOption] || RECOVERY_MAP.discard_safely;
                return (
                  <motion.div
                    key={d._id}
                    layout
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.3 }}
                    className="rounded-2xl p-4"
                    style={{ border: '1.5px solid #fee2e2', background: '#fff7f7' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-gray-800">{d.foodName}</span>
                      <span className="text-xs text-red-500 font-medium">
                        {d.spoiledStage === 'in_delivery' ? 'Spoiled in transit' : 'Missed pickup'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-3 capitalize">{d.category} • {d.quantity} {d.quantityUnit}</p>

                    <div className="rounded-xl p-3 flex items-start gap-2 mb-3" style={{ background: s.bg }}>
                      <span className="text-lg leading-none">{s.icon}</span>
                      <div>
                        <div className="text-xs font-bold" style={{ color: s.color }}>Recommended: {s.label}</div>
                        {d.recoveryReason && (
                          <div className="text-xs mt-0.5" style={{ color: s.color, opacity: 0.85 }}>{d.recoveryReason}</div>
                        )}
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleTakeAction(d._id)}
                      disabled={actingOn === d._id}
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2.5 rounded-xl"
                      style={{
                        background: actingOn === d._id ? '#bb1b15' : 'linear-gradient(135deg, #e23720, #d80c0c)',
                        color: '#fff',
                      }}
                    >
                      <FiCheck size={14} />
                      {actingOn === d._id ? 'Confirming…' : `Mark as ${s.label} — Done`}
                    </motion.button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}