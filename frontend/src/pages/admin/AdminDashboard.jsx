import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { FiUsers, FiPackage, FiTruck, FiTrendingUp, FiToggleRight, FiToggleLeft } from 'react-icons/fi';
import DashboardLayout from '../../layouts/DashboardLayout';
import { StatCard, StatusBadge, Spinner } from '../../components/common/UIComponents';
import api from '../../services/api';

const COLORS = ['#22c55e','#0ea5e9','#f59e0b','#8b5cf6','#ef4444','#10b981'];

export default function AdminDashboard() {
  const [impact, setImpact] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    Promise.all([
      api.get('/analytics/impact'),
      api.get('/analytics/admin'),
      api.get('/admin/users'),
    ])
      .then(([imp, adm, usr]) => {
        if (imp.data.success) setImpact(imp.data);
        if (adm.data.success) setAdminStats(adm.data);
        if (usr.data.success) setUsers(usr.data.users);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleUser = async (id) => {
    try {
      const { data } = await api.put(`/admin/users/${id}/toggle`);
      if (data.success) setUsers(prev => prev.map(u => u._id === id ? data.user : u));
    } catch { }
  };

  const TABS = ['overview','users','donations','charts'];

  if (loading) return <DashboardLayout title="Admin Dashboard"><div className="flex justify-center py-24"><Spinner size={12} /></div></DashboardLayout>;

  const ov = impact?.overview || {};
  const charts = impact?.charts || {};

  return (
    <DashboardLayout title="Admin Dashboard">
      {/* Tab bar */}
      <div className="flex gap-2 mb-6 bg-white p-1.5 rounded-2xl w-fit" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all"
            style={{ background: tab === t ? '#22c55e' : 'transparent', color: tab === t ? '#fff' : '#6b7280' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon="👥" label="Total Users" value={ov.totalUsers || 0} delay={0} />
            <StatCard icon="📦" label="Total Donations" value={ov.totalDonations || 0} color="#0ea5e9" delay={0.1} />
            <StatCard icon="🚚" label="Active Deliveries" value={adminStats?.activeDeliveries || 0} color="#f59e0b" delay={0.2} />
            <StatCard icon="🍽️" label="Meals Saved" value={(ov.mealsRedistributed || 0).toLocaleString()} color="#8b5cf6" delay={0.3} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon="🏢" label="NGOs" value={ov.ngos || 0} color="#0ea5e9" delay={0} />
            <StatCard icon="🚴" label="Volunteers" value={ov.volunteers || 0} color="#f59e0b" delay={0.1} />
            <StatCard icon="♻️" label="Food Saved (kg)" value={ov.foodSavedKg || 0} color="#22c55e" delay={0.2} />
            <StatCard icon="🌍" label="CO₂ Reduced (kg)" value={ov.co2ReducedKg || 0} color="#10b981" delay={0.3} />
          </div>

          {/* Recent donations */}
          <div className="bg-white rounded-2xl p-5" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontFamily: 'Syne', fontWeight: 700, color: '#14532d', fontSize: '1rem', marginBottom: 14 }}>Recent Donations</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
                    <th className="pb-3 font-medium">Food</th><th className="pb-3 font-medium">Donor</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(adminStats?.recentDonations || []).map(d => (
                    <tr key={d._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 font-medium text-gray-800">{d.foodName}</td>
                      <td className="py-3 text-gray-500">{d.donor?.name}</td>
                      <td className="py-3"><StatusBadge status={d.status} /></td>
                      <td className="py-3 text-gray-400">{new Date(d.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Users tab */}
      {tab === 'users' && (
        <div className="bg-white rounded-2xl p-5" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontFamily: 'Syne', fontWeight: 700, color: '#14532d', fontSize: '1rem', marginBottom: 14 }}>
            All Users ({users.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Joined</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold">{u.name?.[0]}</div>
                        <span className="font-medium text-gray-800">{u.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-gray-500">{u.email}</td>
                    <td className="py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize
                        ${u.role==='donor'?'bg-green-50 text-green-700':u.role==='ngo'?'bg-blue-50 text-blue-700':u.role==='volunteer'?'bg-amber-50 text-amber-700':'bg-purple-50 text-purple-700'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {u.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="py-3">
                      <button onClick={() => toggleUser(u._id)}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${u.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                        {u.isActive ? <><FiToggleLeft size={14} /> Suspend</> : <><FiToggleRight size={14} /> Activate</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts tab */}
      {tab === 'charts' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Daily trend */}
          <div className="bg-white rounded-2xl p-5" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <h4 style={{ fontFamily: 'Syne', fontWeight: 700, color: '#14532d', fontSize: '0.95rem', marginBottom: 16 }}>Donations (Last 7 Days)</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={charts.dailyTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
                <XAxis dataKey="_id" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #dcfce7', fontSize: 12 }} />
                <Bar dataKey="count" fill="#22c55e" radius={[6, 6, 0, 0]} name="Donations" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category breakdown */}
          <div className="bg-white rounded-2xl p-5" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <h4 style={{ fontFamily: 'Syne', fontWeight: 700, color: '#14532d', fontSize: '0.95rem', marginBottom: 16 }}>Donation Categories</h4>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={charts.categoryBreakdown || []} dataKey="count" nameKey="_id" cx="50%" cy="50%" outerRadius={80} label={({ _id, percent }) => `${_id} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {(charts.categoryBreakdown || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Volunteer leaderboard chart */}
          <div className="bg-white rounded-2xl p-5 xl:col-span-2" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <h4 style={{ fontFamily: 'Syne', fontWeight: 700, color: '#14532d', fontSize: '0.95rem', marginBottom: 16 }}>Top Volunteer Deliveries</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={(adminStats?.volunteerLeaderboard || []).map(v => ({ name: v.name.split(' ')[0], deliveries: v.completedDeliveries, rating: v.rating }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #dcfce7', fontSize: 12 }} />
                <Bar dataKey="deliveries" fill="#0ea5e9" radius={[6,6,0,0]} name="Deliveries" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
