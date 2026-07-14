import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiSearch, FiRefreshCw, FiMapPin, FiClock } from 'react-icons/fi';
import DashboardLayout from '../../layouts/DashboardLayout';
import { FoodCard, EmptyState, Spinner, FreshnessBadge } from '../../components/common/UIComponents';
import api from '../../services/api';

export default function AvailableDonations() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('freshness');
  const [filters, setFilters] = useState({ category: '', isVeg: '', maxDistance: '20' });
  const [locationMissing, setLocationMissing] = useState(false);

  const fetch = () => {
    setLoading(true);
    setLocationMissing(false);
    const p = new URLSearchParams(filters);
    api.get(`/donations/available?${p}`)
      .then(({ data }) => { if (data.success) setDonations(data.donations); })
      .catch((err) => {
        if (err.response?.data?.code === 'NGO_LOCATION_MISSING') setLocationMissing(true);
        else{
          alert("unable to load donation ")
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const handleAccept = async (id) => {
    try {
      await api.post(`/donations/${id}/accept`);
      setDonations(prev => prev.map(d => d._id === id ? { ...d, status: 'matched' } : d));
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  let displayed = donations.filter(d => d.foodName?.toLowerCase().includes(search.toLowerCase()));
  if (sort === 'freshness') displayed = [...displayed].sort((a, b) => b.freshnessScore - a.freshnessScore);
  if (sort === 'distance') displayed = [...displayed].sort((a, b) => a.distance - b.distance);
  if (sort === 'newest') displayed = [...displayed].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (sort === 'meals') displayed = [...displayed].sort((a, b) => b.mealsEquivalent - a.mealsEquivalent);

  return (
    <DashboardLayout title="Available Donations">
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

      {/* Toolbar */}
      <div className="bg-white rounded-2xl p-4 mb-5 flex flex-wrap gap-3" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
        <div className="relative flex-1 min-w-40">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-green-400 focus:outline-none" />
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none">
          <option value="freshness">Sort: Freshest First</option>
          <option value="distance">Sort: Nearest First</option>
          <option value="newest">Sort: Newest</option>
          <option value="meals">Sort: Most Meals</option>
        </select>
        <select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none">
          <option value="">All Categories</option>
          {['cooked','raw','packaged','beverages','dairy','bakery','other'].map(c =>
            <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
        </select>
        <select value={filters.isVeg} onChange={e => setFilters({ ...filters, isVeg: e.target.value })} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none">
          <option value="">All Types</option>
          <option value="true">🟢 Veg</option>
          <option value="false">🔴 Non-Veg</option>
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
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={fetch} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium">
          <FiRefreshCw size={14} /> Refresh
        </motion.button>
      </div>

      {/* Count bar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{displayed.length} donation{displayed.length !== 1 ? 's' : ''} found</p>
        <div className="flex gap-2 text-xs">
          {['Critical','Use Soon','Good','Fresh'].map(b => (
            <span key={b} className={`px-2 py-1 rounded-full font-medium badge-${b.toLowerCase().replace(' ','-')}`}>
              {b}: {donations.filter(d => d.freshnessBadge === b).length}
            </span>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : displayed.length === 0 ? (
        <EmptyState icon="🍽️" message="No donations match your filters. Try expanding the distance or removing filters." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayed.map((d, i) => (
            <FoodCard key={d._id} donation={d} showAccept onAccept={handleAccept} showDistance delay={i * 0.04} />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
