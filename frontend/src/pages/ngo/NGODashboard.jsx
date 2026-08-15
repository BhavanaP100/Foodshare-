import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiFilter, FiSearch, FiRefreshCw, FiStar, FiMapPin, FiUserCheck } from 'react-icons/fi';
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

  const fetchNeedsVolunteer = () => {
    api.get('/donations/my') // not ideal source, but matchedNGO donations aren't in a dedicated endpoint
      .catch(() => {}); // placeholder removed below — see note
  };

  // Fetch donations this NGO has accepted (status 'matched') that still
  // need a volunteer, via the admin-style all-donations isn't accessible to
  // NGOs, so we filter from /donations/available is wrong too (that's only
  // pending). Simplest reliable source: donations where matchedNGO === me
  // and status === 'matched' — fetched through a lightweight filter on the
  // existing /donations/all is admin-only, so instead we track this from
  // the accept action itself and re-derive via getDonationById per id is
  // heavy. Pragmatic approach: keep a local list populated right when NGO
  // accepts a donation (see handleAccept), and re-fetch recommendations
  // for each entry still in that list.
  useEffect(() => { fetchDonations(); }, []);

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
      alert(err.response?.data?.message || 'Failed to accept');
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
  const accepted = filtered.filter(d => d.status !== 'pending');

  return (
    <DashboardLayout title="NGO Dashboard">
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
        <StatCard icon="✅" label="Accepted" value={accepted.length} color="#0ea5e9" delay={0.1} />
        <StatCard icon="🔴" label="Critical / Urgent" value={donations.filter(d => d.urgencyLevel === 'critical').length} color="#ef4444" delay={0.2} />
        <StatCard icon="📍" label={`Within ${filters.maxDistance} km`} value={donations.length} color="#f59e0b" delay={0.3} />
      </div>

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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {recommendations[d._id].slice(0, 4).map((v) => (
                      <div key={v._id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#f9fafb' }}>
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                            {v.name?.[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-gray-800 truncate">{v.name}</div>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <span className="flex items-center gap-0.5"><FiMapPin size={10} /> {v.distance} km</span>
                              <span className="flex items-center gap-0.5"><FiStar size={10} /> {v.rating?.toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => handleAssign(d._id, v._id)}
                          disabled={assigning === d._id}
                          className="flex items-center gap-1 text-xs font-medium text-white bg-blue-600 px-3 py-1.5 rounded-lg flex-shrink-0"
                        >
                          <FiUserCheck size={12} /> Assign
                        </motion.button>
                      </div>
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