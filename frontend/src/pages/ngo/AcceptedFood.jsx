import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMapPin, FiStar, FiUserCheck, FiArrowRight } from 'react-icons/fi';
import DashboardLayout from '../../layouts/DashboardLayout';
import { StatusBadge, FreshnessBadge, EmptyState, Spinner, SectionHeader } from '../../components/common/UIComponents';
import api from '../../services/api';

export default function AcceptedFood() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState({});
  const [assigning, setAssigning] = useState(null);

  const fetchAccepted = () => {
    setLoading(true);
    api.get('/donations/my-accepted')
      .then(({ data }) => { if (data.success) setDonations(data.donations); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAccepted(); }, []);

  const loadRecommendations = async (donationId) => {
    try {
      const { data } = await api.get(`/tracking/recommend/${donationId}`);
      if (data.success) {
        setRecommendations(prev => ({ ...prev, [donationId]: data.recommendations }));
      }
    } catch (err) {
      // ignore — NGO can still assign manually elsewhere
    }
  };

  const handleAssign = async (donationId, volunteerId) => {
    setAssigning(donationId);
    try {
      const { data } = await api.post('/tracking/assign', { donationId, volunteerId });
      if (data.success) fetchAccepted();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign volunteer');
    } finally {
      setAssigning(null);
    }
  };

  // matched = accepted but not yet assigned a volunteer; everything else
  // (assigned/picked_up/in_transit/delivered/verified) is already in motion.
  const needsVolunteer = donations.filter(d => d.status === 'matched');

  const inProgress = donations.filter(d => !['matched', 'expired'].includes(d.status));

  return (
    <DashboardLayout title="Accepted Food">
      <div className="space-y-8">
        {/* Needs a volunteer */}
        <div>
          <SectionHeader title="🚴 Needs a Volunteer" sub={`${needsVolunteer.length} accepted, awaiting pickup assignment`} />
          {loading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : needsVolunteer.length === 0 ? (
            <EmptyState icon="✅" message="Nothing waiting on a volunteer right now." />
          ) : (
            <div className="space-y-4">
              {needsVolunteer.map((d) => (
                <div key={d._id} className="bg-white rounded-2xl p-5" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-semibold text-sm text-gray-800">{d.foodName}</div>
                      <div className="text-xs text-gray-400">{d.pickupAddress}</div>
                    </div>
                    <FreshnessBadge badge={d.freshnessBadge} score={d.freshnessScore} />
                  </div>

                  {!recommendations[d._id] ? (
                    <button
                      onClick={() => loadRecommendations(d._id)}
                      className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-2 rounded-lg"
                    >
                      Find Recommended Volunteers →
                    </button>
                  ) : recommendations[d._id].length === 0 ? (
                    <p className="text-xs text-gray-400">No verified volunteers available nearby right now.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {recommendations[d._id].slice(0, 4).map((v, idx) => (
                        <motion.div
                          key={v._id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="p-3 rounded-xl relative"
                          style={{ background: idx === 0 ? '#eff6ff' : '#f9fafb', border: idx === 0 ? '1.5px solid #93c5fd' : '1.5px solid transparent' }}
                        >
                          {idx === 0 && (
                            <span className="absolute -top-2 left-3 text-xs font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">Best Match</span>
                          )}
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                              {v.name?.[0]}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium text-gray-800 truncate">{v.name}</div>
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span className="flex items-center gap-0.5"><FiMapPin size={10} /> {v.distance} km</span>
                                <span className="flex items-center gap-0.5"><FiStar size={10} /> {v.rating?.toFixed(1)}</span>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-blue-600">{v.score}</span>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={() => handleAssign(d._id, v._id)}
                            disabled={assigning === d._id}
                            className="flex items-center justify-center gap-1 text-xs font-medium text-white bg-blue-600 px-3 py-1.5 rounded-lg w-full"
                          >
                            <FiUserCheck size={12} /> Assign
                          </motion.button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* In progress / delivered / verified */}
        <div>
          <SectionHeader title="📦 In Progress & Completed" sub={`${inProgress.length} accepted donations`} />
          {!loading && inProgress.length === 0 ? (
            <EmptyState icon="📦" message="No other accepted donations yet." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {inProgress.map((d) => (
                <div key={d._id} className="bg-white rounded-2xl p-4" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-semibold text-sm text-gray-800">{d.foodName}</span>
                    <StatusBadge status={d.status} />
                  </div>
                  <p className="text-xs text-gray-400 mb-2 capitalize">{d.category} • {d.quantity} {d.quantityUnit}</p>
                  {d.assignedVolunteer && (
                    <div className="text-xs text-gray-500 mb-3">
                      Volunteer: <span className="font-medium text-gray-700">{d.assignedVolunteer.name}</span>
                    </div>
                  )}
                  <Link to={`/volunteer/track/${d._id}`}>
                    <button className="w-full flex items-center justify-center gap-1 text-xs font-medium text-white bg-green-600 px-3 py-2 rounded-lg">
                      Track / Review <FiArrowRight size={12} />
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}