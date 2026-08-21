import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { FiFilter, FiSearch, FiRefreshCw, FiStar, FiMapPin, FiUserCheck, FiBell, FiArrowRight, FiCheckCircle } from 'react-icons/fi';
import DashboardLayout from '../../layouts/DashboardLayout';
import { StatCard, FoodCard, SectionHeader, EmptyState, Spinner } from '../../components/common/UIComponents';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function NGODashboard() {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ category: '', isVeg: '', maxDistance: '20' });
  const [search, setSearch] = useState('');
  const [accepting, setAccepting] = useState(null);
  const [locationMissing, setLocationMissing] = useState(false);

  // Donations this NGO has accepted but not yet assigned a volunteer to,
  // plus recommended volunteers for each.
  const [needsVolunteer, setNeedsVolunteer] = useState([]);
  const [recommendations, setRecommendations] = useState({}); // donationId -> [{ _id, name, distance, score, ... }]
  const [assigning, setAssigning] = useState(null);

  // Deliveries marked "delivered" by a volunteer, awaiting this NGO's
  // review/verification — fetched from a real endpoint so it survives
  // refreshes and doesn't depend on catching a live socket event.
  const [pendingReview, setPendingReview] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(true);

  // Live toast — just a nudge that something new landed; the persistent
  // list above is the actual source of truth.
  const [reviewNotification, setReviewNotification] = useState(null);

  const fetchDonations = () => {
    setLoading(true);
    setLocationMissing(false);
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.isVeg !== '') params.append('isVeg', filters.isVeg);
    params.append('maxDistance', filters.maxDistance);

    api.get(`/donations/available?${params}`)
      .then(({ data }) => { if (data.success) setDonations(data.donations); })
      .catch((err) => {
        if (err.response?.data?.code === 'NGO_LOCATION_MISSING') {
          setLocationMissing(true);
        } else {
          alert("Unable to load donations")
        }
      })
      .finally(() => setLoading(false));
  };

  const fetchPendingReview = () => {
    setReviewLoading(true);
    api.get('/tracking/pending-review')
      .then(({ data }) => { if (data.success) setPendingReview(data.logs); })
      .catch(() => {})
      .finally(() => setReviewLoading(false));
  };

  useEffect(() => {
    fetchDonations();
    fetchPendingReview();
  }, []);

  // Join this NGO's personal notification room so we hear about deliveries
  // the moment a volunteer marks them delivered. Also re-fetches the
  // persistent pending-review list so it's never stale/missed.
  useEffect(() => {
    if (!user?._id) return;
    const socket = io('http://localhost:5000');
    socket.emit('join_ngo_room', user._id);
    socket.on('delivery_ready_for_review', (payload) => {
      setReviewNotification(payload);
      fetchPendingReview();
    });
    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const handleAccept = async (id) => {
    setAccepting(id);
    try {
      const { data } = await api.post(`/donations/${id}/accept`);
      setDonations(prev => prev.map(d => d._id === id ? { ...d, status: 'matched' } : d));
      if (data.success && data.donation) {
        setNeedsVolunteer(prev => [...prev, data.donation]);
        loadRecommendations(data.donation._id);
      }
    } catch (err) {
      if (err.response?.data?.code === 'DONATION_EXPIRED') {
        alert('This donation expired between listing and acceptance and is no longer available. Refreshing the list…');
        setDonations(prev => prev.filter(d => d._id !== id));
      } else {
        alert(err.response?.data?.message || 'Failed to accept');
      }
    } finally {
      setAccepting(null);
    }
  };

  const loadRecommendations = async (donationId) => {
    try {
      const { data } = await api.get(`/tracking/recommend/${donationId}`);
      if (data.success) {
        setRecommendations(prev => ({ ...prev, [donationId]: data.recommendations }));
      }
    } catch (err) {
      // silently ignore — NGO can still assign manually via /volunteer/available if this fails
    }
  };

  const handleAssign = async (donationId, volunteerId) => {
    setAssigning(donationId);
    try {
      const { data } = await api.post('/tracking/assign', { donationId, volunteerId });
      if (data.success) {
        setNeedsVolunteer(prev => prev.filter(d => d._id !== donationId));
        setRecommendations(prev => {
          const next = { ...prev };
          delete next[donationId];
          return next;
        });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign volunteer');
    } finally {
      setAssigning(null);
    }
  };

  const filtered = donations.filter(d => d.foodName?.toLowerCase().includes(search.toLowerCase()));
  const pending = filtered.filter(d => d.status === 'pending');

  return (
    <DashboardLayout title="NGO Dashboard">
      {/* Delivery ready for review notification (live nudge) */}
      <AnimatePresence>
        {reviewNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="rounded-2xl p-4 mb-6 flex items-center gap-3"
            style={{ background: '#dbeafe', border: '1.5px solid #93c5fd' }}
          >
            <FiBell className="text-blue-600 flex-shrink-0" size={20} />
            <div className="flex-1">
              <div className="text-sm font-semibold text-blue-900">Delivery ready for review!</div>
              <div className="text-xs text-blue-700 mt-0.5">
                {reviewNotification.volunteerName} delivered {reviewNotification.foodName}. Confirm receipt and rate them.
              </div>
            </div>
            <Link to={`/volunteer/track/${reviewNotification.donationId}`}>
              <button className="flex items-center gap-1 text-xs font-medium text-white bg-blue-600 px-3 py-1.5 rounded-lg">
                Review <FiArrowRight size={12} />
              </button>
            </Link>
            <button onClick={() => setReviewNotification(null)} className="text-blue-400 hover:text-blue-600 text-xs font-medium ml-1">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {locationMissing && (
        <div className="rounded-2xl p-5 mb-6 flex items-center justify-between flex-wrap gap-3" style={{ background: '#fef3c7', border: '1.5px solid #fde68a' }}>
          <div>
            <div className="text-sm font-semibold text-amber-900">Set your organization location to see nearby donations</div>
            <div className="text-xs text-amber-700 mt-0.5">We use it to match and rank donations by distance.</div>
          </div>
          <Link to="/settings">
            <button className="btn-primary text-xs py-2 px-4">Go to Settings</button>
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon="🍽️" label="Available Now" value={pending.length} color="#22c55e" delay={0} />
        <StatCard icon="✅" label="Accepted" value={acceptedCount} color="#0ea5e9" delay={0.1} />
        <StatCard icon="🔴" label="Critical / Urgent" value={donations.filter(d => d.urgencyLevel === 'critical').length} color="#ef4444" delay={0.2} />
        <StatCard icon="📍" label={`Within ${filters.maxDistance} km`} value={donations.length} color="#f59e0b" delay={0.3} />
      </div>

      {/* Awaiting Review — persistent list, survives refresh */}
      {!reviewLoading && pendingReview.length > 0 && (
        <div className="mb-6">
          <SectionHeader title="📋 Awaiting Your Review" sub={`${pendingReview.length} delivered — confirm receipt & rate`} />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pendingReview.map((log) => (
              <div key={log._id} className="bg-white rounded-2xl p-4" style={{ border: '1.5px solid #dbeafe', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-sm text-gray-800">{log.donation?.foodName}</div>
                    <div className="text-xs text-gray-400">{log.donation?.pickupAddress}</div>
                  </div>
                  <FiCheckCircle className="text-blue-500 flex-shrink-0" size={18} />
                </div>
                <div className="text-xs text-gray-500 mb-3">
                  Delivered by <span className="font-medium text-gray-700">{log.volunteer?.name}</span>
                  {log.deliveredAt && <> · {new Date(log.deliveredAt).toLocaleTimeString()}</>}
                </div>
                <Link to={`/volunteer/track/${log.donation?._id}`}>
                  <button className="w-full flex items-center justify-center gap-1 text-xs font-medium text-white bg-blue-600 px-3 py-2 rounded-lg">
                    Confirm & Rate <FiArrowRight size={12} />
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Needs Volunteer — recommendation panel */}
{needsVolunteer.length > 0 && (
  <div className="mb-6">
    <SectionHeader title="🚴 Needs a Volunteer" sub="Accepted donations awaiting pickup assignment" />
    <div className="space-y-4">
      {needsVolunteer.map((d) => (
        <div key={d._id} className="bg-white rounded-2xl p-5" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-semibold text-sm text-gray-800">{d.foodName}</div>
              <div className="text-xs text-gray-400">{d.pickupAddress}</div>
            </div>
          </div>
          {!recommendations[d._id] ? (
            <div className="flex justify-center py-4"><Spinner size={6} /></div>
          ) : recommendations[d._id].length === 0 ? (
            <p className="text-xs text-gray-400">No verified volunteers available nearby right now.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recommendations[d._id].slice(0, 4).map((v, idx) => (
                <motion.div
                  key={v._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -2, boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-3 rounded-xl relative"
                  style={{ background: idx === 0 ? '#eff6ff' : '#f9fafb', border: idx === 0 ? '1.5px solid #93c5fd' : '1.5px solid transparent' }}
                >
                  {idx === 0 && (
                    <span className="absolute -top-2 left-3 text-xs font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                      Best Match
                    </span>
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
                        {v.isAvailable && <span className="text-green-500">● Available</span>}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-blue-600">{v.score}</span>
                  </div>

                  {/* Score breakdown bars — makes the recommendation transparent */}
                  <div className="space-y-1 mb-2">
                    {[
                      ['Distance', v.distanceScore, '#22c55e'],
                      ['Rating', v.ratingScore, '#f59e0b'],
                      ['Availability', v.availabilityScore, '#0ea5e9'],
                    ].map(([label, val, color]) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-16 flex-shrink-0">{label}</span>
                        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${val}%`, background: color }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {v.badges?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {v.badges.slice(0, 2).map(b => (
                        <span key={b} className="text-xs px-1.5 py-0.5 rounded-full bg-white text-gray-500 border border-gray-100">🏅 {b}</span>
                      ))}
                    </div>
                  )}

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
  </div>
)}
      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 mb-6 flex flex-wrap gap-3 items-center" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
        <div className="relative flex-1 min-w-48">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search food…" className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-green-400 focus:outline-none" />
        </div>
        <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none">
          <option value="">All Categories</option>
          {['cooked', 'raw', 'packaged', 'beverages', 'dairy', 'bakery'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <select value={filters.isVeg} onChange={(e) => setFilters({ ...filters, isVeg: e.target.value })} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none">
          <option value="">Veg + Non-Veg</option>
          <option value="true">🟢 Veg Only</option>
          <option value="false">🔴 Non-Veg Only</option>
        </select>
       <div className="flex items-center gap-2">
  <input
    type="number"
    min="1"
    value={filters.maxDistance}
    onChange={(e) =>
      setFilters({ ...filters, maxDistance: e.target.value })
    }
    className="w-24 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none"
    placeholder="KM"
  />
  <span className="text-sm text-gray-500">km</span>
</div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={fetchDonations} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium">
          <FiRefreshCw size={15} /> Apply
        </motion.button>
      </div>

      {/* Accepted donations now live on their own page (find/assign a
          volunteer, track a delivery) -- this is a quick link in. */}
      {acceptedCount > 0 && (
        <div className="rounded-2xl p-5 mb-6 flex items-center justify-between flex-wrap gap-3" style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0' }}>
          <div>
            <div className="text-sm font-semibold text-green-900">{acceptedCount} accepted donation{acceptedCount !== 1 ? 's' : ''} in progress</div>
            <div className="text-xs text-green-700 mt-0.5">Find and assign volunteers, track deliveries, from Accepted Donations.</div>
          </div>
          <Link to="/ngo/accepted">
            <button className="btn-primary text-xs py-2 px-4">View Accepted Donations →</button>
          </Link>
        </div>
      )}

      {/* Urgent / Critical section */}
      {donations.filter(d => d.urgencyLevel === 'critical' && d.status === 'pending').length > 0 && (
        <div className="mb-6">
          <SectionHeader title="🔴 Urgent — Act Now" sub="These will expire soon" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {donations.filter(d => d.urgencyLevel === 'critical' && d.status === 'pending').map((d, i) => (
              <FoodCard key={d._id} donation={d} showAccept onAccept={handleAccept} showDistance showMatchScore delay={i * 0.05} />
            ))}
          </div>
        </div>
      )}

      {/* All available */}
      <div>
        <SectionHeader
          title="Available Donations"
          sub={`${pending.length} listings near you`}
          action={<Link to="/ngo/donations"><button className="text-xs text-green-600 font-medium hover:underline">View All →</button></Link>}
        />
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : pending.length === 0 ? (
          <EmptyState icon="🍽️" message="No donations available in your area right now. Check back soon!" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pending.map((d, i) => (
              <FoodCard key={d._id} donation={d} showAccept onAccept={handleAccept} showDistance showMatchScore delay={i * 0.05} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}