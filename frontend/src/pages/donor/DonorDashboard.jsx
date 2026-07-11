import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiPlusCircle, FiPackage, FiTrendingUp, FiClock, FiHeart, FiArrowRight } from 'react-icons/fi';
import DashboardLayout from '../../layouts/DashboardLayout';
import { StatCard, FoodCard, SectionHeader, EmptyState, Spinner } from '../../components/common/UIComponents';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function DonorDashboard() {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/donations/my')
      .then(({ data }) => { if (data.success) setDonations(data.donations); })
      .catch((err) => {
        console.log("Failed to fetch donation",err);
      })
      .finally(() => setLoading(false));
  }, []);

  const active = donations.filter(d => ['pending', 'matched', 'assigned', 'picked_up', 'in_transit'].includes(d.status));
  const completed = donations.filter(d => d.status === 'verified');
  const totalMeals = donations.reduce((s, d) => s + (d.mealsEquivalent || 0), 0);

  return (
    <DashboardLayout title="Donor Dashboard">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 mb-6 flex items-center justify-between flex-wrap gap-4"
        style={{ background: 'linear-gradient(135deg, #14532d, #15803d)', color: '#fff' }}
      >
        <div>
          <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1.4rem' }}>
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h2>
          <p className="text-green-200 text-sm mt-1">You've helped save {totalMeals} meals so far. Keep it up!</p>
        </div>
        <Link to="/donor/add">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm"
            style={{ background: '#22c55e', color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}
          >
            <FiPlusCircle size={18} /> Add New Donation
          </motion.button>
        </Link>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="📦" label="Total Donations" value={donations.length} sub="All time" delay={0} />
        <StatCard icon="🔄" label="Active Posts" value={active.length} sub="Live" color="#0ea5e9" delay={0.1} />
        <StatCard icon="🍽️" label="Meals Donated" value={totalMeals} sub="Est." color="#f59e0b" delay={0.2} />
        <StatCard icon="✅" label="Completed" value={completed.length} sub="Verified" color="#8b5cf6" delay={0.3} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { icon: '➕', label: 'Add Donation', desc: 'Post surplus food quickly', path: '/donor/add', color: '#22c55e' },
          { icon: '📊', label: 'View Impact', desc: 'See your contribution stats', path: '/impact', color: '#0ea5e9' },
          { icon: '🌙', label: 'Late Night Rescue', desc: 'Urgent food listings', path: '/late-night', color: '#8b5cf6' },
        ].map((a, i) => (
          <motion.div key={a.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
            <Link to={a.path} className="block">
              <div
                className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all"
                style={{ background: `${a.color}0d`, border: `1.5px solid ${a.color}20` }}
              >
                <div className="text-3xl">{a.icon}</div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-gray-800">{a.label}</div>
                  <div className="text-xs text-gray-400">{a.desc}</div>
                </div>
                <FiArrowRight size={16} style={{ color: a.color }} />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Recent Donations */}
      <div className="bg-white rounded-2xl p-5" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
        <SectionHeader
          title="My Donations"
          sub={`${donations.length} total listings`}
          action={
            <Link to="/donor/add">
              <button className="btn-primary text-xs py-2 px-4 flex items-center gap-1">
                <FiPlusCircle size={14} /> Add New
              </button>
            </Link>
          }
        />

        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : donations.length === 0 ? (
          <EmptyState
            icon="📦"
            message="You haven't added any donations yet."
            action={
              <Link to="/donor/add">
                <button className="btn-primary text-sm py-2 px-5">Add Your First Donation</button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {donations.map((d, i) => (
              <FoodCard key={d._id} donation={d} delay={i * 0.05} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
