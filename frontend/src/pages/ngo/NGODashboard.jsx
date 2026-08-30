

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

  // Real accepted-donations source — /donations/available only ever
  // returns pending donations, so "accepted" can't be derived from it.
  const [acceptedDonations, setAcceptedDonations] = useState([]);

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

  const fetchAccepted = () => {
    api.get('/donations/my-accepted')
      .then(({ data }) => { if (data.success) setAcceptedDonations(data.donations); })
      .catch(() => {});
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
    fetchAccepted();
    fetchPendingReview();
  }, []);

  // Join this NGO's personal notification room so we hear about deliveries
  // the moment a volunteer marks them delivered. Also re-fetches the
  // persistent pending-review + accepted lists so nothing is ever stale.
  useEffect(() => {
    if (!user?._id) return;
    const socket = io('http://localhost:5000');
    socket.emit('join_ngo_room', user._id);
    socket.on('delivery_ready_for_review', (payload) => {
      setReviewNotification(payload);
      fetchPendingReview();
      fetchAccepted();
    });
    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const handleAccept = async (id) => {
    setAccepting(id);
    try {
      await api.post(`/donations/${id}/accept`);
      setDonations(prev => prev.filter(d => d._id !== id));
      fetchAccepted();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept');
    } finally {
      setAccepting(null);
    }
  };

  const filtered = donations.filter(d => d.foodName?.toLowerCase().includes(search.toLowerCase()));
  const pending = filtered.filter(d => d.status === 'pending');
  const needsVolunteerCount = acceptedDonations.filter(d => d.status === 'matched').length;

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
        <StatCard icon="✅" label="Accepted" value={acceptedDonations.length} color="#0ea5e9" delay={0.1} />
        <StatCard icon="🔴" label="Critical / Urgent" value={donations.filter(d => d.urgencyLevel === 'critical').length} color="#ef4444" delay={0.2} />
        <StatCard icon="📍" label={`Within ${filters.maxDistance} km`} value={donations.length} color="#f59e0b" delay={0.3} />
      </div>

      {/* Awaiting Review — persistent list, survives refresh, this is the
          real source of truth (not just the live toast above) */}
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

      {/* Nudge card to Accepted Food page */}
      {acceptedDonations.length > 0 && (
        <div className="mb-6">
          <Link to="/ngo/accepted">
            <motion.div
              whileHover={{ scale: 1.01 }}
              className="rounded-2xl p-5 flex items-center justify-between cursor-pointer"
              style={{ background: '#eff6ff', border: '1.5px solid #93c5fd' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🚴</span>
                <div>
                  <div className="text-sm font-semibold text-blue-900">
                    {needsVolunteerCount > 0
                      ? `${needsVolunteerCount} accepted donation${needsVolunteerCount !== 1 ? 's' : ''} need a volunteer`
                      : `${acceptedDonations.length} accepted donation${acceptedDonations.length !== 1 ? 's' : ''} in progress`}
                  </div>
                  <div className="text-xs text-blue-700 mt-0.5">Track accepted donations and assign volunteers</div>
                </div>
              </div>
              <FiArrowRight className="text-blue-600" size={18} />
            </motion.div>
          </Link>
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