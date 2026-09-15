import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiPlusCircle, FiPackage, FiTrendingUp, FiClock, FiHeart, FiArrowRight, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';
import DashboardLayout from '../../layouts/DashboardLayout';
import { StatCard, FoodCard, SectionHeader, EmptyState, Spinner } from '../../components/common/UIComponents';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function DonorDashboard() {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historical, setHistorical] = useState(null);

  useEffect(() => {
    api.get('/donations/my')
      .then(({ data }) => { if (data.success) setDonations(data.donations); })
      .catch((err) => {
        console.log("Failed to fetch donation",err);
      })
      .finally(() => setLoading(false));

    // Phase 2 — rule-based historical analysis, scoped to this donor's own
    // organization (backend filters by donor: req.user._id).
    api.get('/analytics/historical')
      .then(({ data }) => { if (data.success) setHistorical(data.analysis); })
      .catch(() => {});
  }, []);

  const active = donations.filter(d => ['pending', 'matched', 'assigned', 'picked_up', 'in_transit'].includes(d.status));
  const completed = donations.filter(d => d.status === 'verified');
  const expired = donations.filter(d => d.status === 'expired');
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

      {/* Stats Grid — each links to its own dedicated section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="📦" label="Total Donations" value={donations.length} sub="All time" delay={0} />
        <StatCard icon="🔄" label="Active Posts" value={active.length} sub="Live" color="#0ea5e9" delay={0.1} />
        <Link to="/donor/completed">
          <StatCard icon="✅" label="Donated Food" value={completed.length} sub="Verified" color="#8b5cf6" delay={0.2} />
        </Link>
        <Link to="/donor/expired">
          <StatCard icon="⚠️" label="Expired Food" value={expired.length} sub="Needs recovery" color="#ef4444" delay={0.3} />
        </Link>
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

      {/* Active Donations only — completed/expired now live in their own sidebar sections */}
      <div className="bg-white rounded-2xl p-5" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
        <SectionHeader
          title="Active Donations"
          sub={`${active.length} in progress`}
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
        ) : active.length === 0 ? (
          <EmptyState
            icon="📦"
            message="No active donations right now."
            action={
              <Link to="/donor/add">
                <button className="btn-primary text-sm py-2 px-5">Add a Donation</button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {active.map((d, i) => (
              <FoodCard key={d._id} donation={d} delay={i * 0.05} />
            ))}
          </div>
        )}
      </div>

      {/* Historical Analysis — Phase 2 (rule-based, scoped to this organization's own donation history) */}
      <div className="bg-white rounded-2xl p-5 mt-6" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
        <SectionHeader
          title="Historical Analysis"
          sub="Rule-Based Recommendations — based on your organization's own donation history"
        />

        {!historical && (
          <p className="text-center text-gray-400 text-sm py-8">Loading historical analysis…</p>
        )}

        {historical?.insufficientData && (
          <p className="text-center text-gray-400 text-sm py-8">
            Insufficient historical data to generate a reliable recommendation
            ({historical.recordCount} of {historical.minimumRequired} minimum donation records collected so far).
          </p>
        )}

        {historical && !historical.insufficientData && (
          <>
            {/* Historical Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="p-3 rounded-xl text-center" style={{ background: '#f9fafb' }}>
                <div className="text-lg font-bold text-gray-800">{historical.recordCount}</div>
                <div className="text-[11px] text-gray-400">Total Donations</div>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: '#f0fdf4' }}>
                <div className="text-lg font-bold text-green-700">{historical.outcomeBreakdown.verified}</div>
                <div className="text-[11px] text-gray-400">Successful</div>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: '#fef2f2' }}>
                <div className="text-lg font-bold text-red-600">{historical.outcomeBreakdown.expired}</div>
                <div className="text-[11px] text-gray-400">Expired</div>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: '#f9fafb' }}>
                <div className="text-lg font-bold text-gray-800 capitalize">{historical.categoryDistribution[0]?.category || '—'}</div>
                <div className="text-[11px] text-gray-400">Dominant Category</div>
              </div>
            </div>

            {/* Detected Patterns */}
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Detected Patterns</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 text-sm">
              <div className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: '#f9fafb' }}>
                <span className="text-gray-600">Recurring category</span>
                <span className="font-medium text-gray-800 capitalize">
                  {historical.categoryDistribution[0]?.category} ({Math.round((historical.categoryDistribution[0]?.share || 0) * 100)}%)
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: '#f9fafb' }}>
                <span className="text-gray-600">Recurring time period</span>
                <span className="font-medium text-gray-800">
                  {historical.timeWindowDistribution[0]?.label} ({Math.round((historical.timeWindowDistribution[0]?.share || 0) * 100)}%)
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: '#f9fafb' }}>
                <span className="text-gray-600">Overall success rate</span>
                <span className="font-medium text-gray-800">{Math.round(historical.outcomeBreakdown.successRate * 100)}%</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: '#f9fafb' }}>
                <span className="text-gray-600">Quantity trend ({historical.quantityTrend.windowDays}d)</span>
                <span className="font-medium text-gray-800">
                  {historical.quantityTrend.changeRatio === null
                    ? 'Not enough prior-period data'
                    : `${historical.quantityTrend.changeRatio >= 0 ? '+' : ''}${Math.round(historical.quantityTrend.changeRatio * 100)}%`}
                </span>
              </div>
            </div>

            {/* Actionable Recommendations */}
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Actionable Recommendations</h4>
            <div className="space-y-2">
              {historical.recommendations.map((r, i) => (
                <div key={i} className="p-3 rounded-xl" style={{ background: '#f0fdf4', border: '1px solid #dcfce7' }}>
                  <div className="text-sm text-gray-800 mb-1">{r.recommendation}</div>
                  <div className="text-xs text-gray-400">{r.basis}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}