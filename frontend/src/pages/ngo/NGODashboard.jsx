import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiFilter, FiSearch, FiRefreshCw } from 'react-icons/fi';
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

  const fetchDonations = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.isVeg !== '') params.append('isVeg', filters.isVeg);
    params.append('maxDistance', filters.maxDistance);

    api.get(`/donations/available?${params}`)
      .then(({ data }) => { if (data.success) setDonations(data.donations); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDonations(); }, []);

  const handleAccept = async (id) => {
    setAccepting(id);
    try {
      await api.post(`/donations/${id}/accept`);
      setDonations(prev => prev.map(d => d._id === id ? { ...d, status: 'matched' } : d));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept');
    } finally {
      setAccepting(null);
    }
  };

  const filtered = donations.filter(d => d.foodName?.toLowerCase().includes(search.toLowerCase()));
  const pending = filtered.filter(d => d.status === 'pending');
  const accepted = filtered.filter(d => d.status !== 'pending');

  return (
    <DashboardLayout title="NGO Dashboard">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon="🍽️" label="Available Now" value={pending.length} color="#22c55e" delay={0} />
        <StatCard icon="✅" label="Accepted" value={accepted.length} color="#0ea5e9" delay={0.1} />
        <StatCard icon="🔴" label="Critical / Urgent" value={donations.filter(d => d.urgencyLevel === 'critical').length} color="#ef4444" delay={0.2} />
        <StatCard icon="📍" label="Within 20km" value={donations.length} color="#f59e0b" delay={0.3} />
      </div>

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
        <select value={filters.maxDistance} onChange={(e) => setFilters({ ...filters, maxDistance: e.target.value })} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none">
          <option value="5">Within 5 km</option>
          <option value="10">Within 10 km</option>
          <option value="20">Within 20 km</option>
          <option value="50">Within 50 km</option>
        </select>
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
              <FoodCard key={d._id} donation={d} showAccept onAccept={handleAccept} showDistance delay={i * 0.05} />
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
              <FoodCard key={d._id} donation={d} showAccept onAccept={handleAccept} showDistance delay={i * 0.05} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
