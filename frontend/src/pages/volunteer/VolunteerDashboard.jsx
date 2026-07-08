import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiStar, FiTruck, FiAward, FiCheckCircle, FiClock, FiArrowRight } from 'react-icons/fi';
import DashboardLayout from '../../layouts/DashboardLayout';
import { StatCard, StatusBadge, FreshnessBadge, SectionHeader, EmptyState, Spinner } from '../../components/common/UIComponents';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const FSM_STEPS = ['requested','accepted','picked_up','in_transit','delivered','verified'];
const FSM_LABELS = { requested:'Requested', accepted:'Accepted', picked_up:'Picked Up', in_transit:'In Transit', delivered:'Delivered', verified:'Verified ✓' };

function FSMProgress({ current }) {
  const idx = FSM_STEPS.indexOf(current);
  return (
    <div className="flex items-center gap-0 mt-3">
      {FSM_STEPS.map((s, i) => (
        <div key={s} className="flex items-center flex-1">
          <div className="flex flex-col items-center" style={{ flex: 'none' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={{ background: i <= idx ? '#22c55e' : '#f0fdf4', color: i <= idx ? '#fff' : '#86efac', border: i === idx ? '2px solid #16a34a' : 'none' }}>
              {i < idx ? '✓' : i + 1}
            </div>
            <span className="text-xs text-gray-400 mt-1 whitespace-nowrap" style={{ fontSize: 9 }}>{FSM_LABELS[s]}</span>
          </div>
          {i < FSM_STEPS.length - 1 && (
            <div className="flex-1 h-0.5 mx-0.5 mb-4" style={{ background: i < idx ? '#22c55e' : '#e5e7eb' }} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function VolunteerDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState({ active: [], completed: [] });
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/volunteer/tasks'),
      api.get('/volunteer/leaderboard'),
    ])
      .then(([t, l]) => {
        if (t.data.success) setTasks(t.data);
        if (l.data.success) setLeaderboard(l.data.volunteers);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const BADGE_ICONS = { 'First Delivery': '🥇', 'Speed Star': '⚡', 'Night Hero': '🌙', '10 Deliveries': '🏅', '50 Deliveries': '🏆' };

  return (
    <DashboardLayout title="Volunteer Dashboard">
      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 mb-6 flex items-center justify-between flex-wrap gap-4"
        style={{ background: 'linear-gradient(135deg, #0c4a6e, #0369a1)', color: '#fff' }}
      >
        <div>
          <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1.3rem' }}>
            Hey {user?.name?.split(' ')[0]}! 🚴 Ready to deliver?
          </h2>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-blue-200 text-sm">⭐ {user?.rating?.toFixed(1) || '5.0'} rating</span>
            <span className="text-blue-200 text-sm">📦 {user?.completedDeliveries || 0} deliveries</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(user?.badges || []).map(b => (
            <span key={b} className="bg-blue-500 bg-opacity-30 text-blue-100 text-xs px-2.5 py-1 rounded-full border border-blue-400 border-opacity-30">
              {BADGE_ICONS[b] || '🏅'} {b}
            </span>
          ))}
          {(!user?.badges?.length) && <span className="text-blue-300 text-sm">Complete deliveries to earn badges!</span>}
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon="🚀" label="Active Tasks" value={tasks.active?.length || 0} color="#0ea5e9" delay={0} />
        <StatCard icon="✅" label="Completed" value={user?.completedDeliveries || 0} color="#22c55e" delay={0.1} />
        <StatCard icon="⭐" label="Rating" value={`${user?.rating?.toFixed(1) || '5.0'}`} color="#f59e0b" delay={0.2} />
        <StatCard icon="🏅" label="Badges" value={user?.badges?.length || 0} color="#8b5cf6" delay={0.3} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Active Tasks */}
        <div className="xl:col-span-2">
          <SectionHeader title="Active Deliveries" sub={`${tasks.active?.length || 0} in progress`} />
          {loading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : tasks.active?.length === 0 ? (
            <EmptyState icon="🚴" message="No active tasks. Check the Late Night Rescue page for urgent pickups!" />
          ) : (
            <div className="space-y-4">
              {tasks.active.map((task, i) => (
                <motion.div key={task._id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  className="bg-white rounded-2xl p-5" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-800 text-sm">{task.donation?.foodName}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">{task.donation?.pickupAddress}</p>
                    </div>
                    <StatusBadge status={task.currentStatus} />
                  </div>
                  <FSMProgress current={task.currentStatus} />
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                    <div className="text-xs text-gray-500">
                      📍 NGO: <span className="font-medium text-gray-700">{task.ngo?.ngoName || task.ngo?.name}</span>
                    </div>
                    <Link to={`/volunteer/track/${task.donation?._id}`}>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
                        Track <FiArrowRight size={13} />
                      </motion.button>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div>
          <SectionHeader title="🏆 Leaderboard" sub="Top volunteers this month" />
          <div className="bg-white rounded-2xl p-4" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            {leaderboard.slice(0, 8).map((v, i) => (
              <div key={v._id} className={`flex items-center gap-3 py-2.5 ${i < leaderboard.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: i === 0 ? '#fef3c7' : i === 1 ? '#f1f5f9' : i === 2 ? '#fef0e6' : '#f9fafb', color: i === 0 ? '#92400e' : '#6b7280' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-bold">
                  {v.name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-800 truncate">{v.name}</div>
                  <div className="text-xs text-gray-400">{v.completedDeliveries} deliveries</div>
                </div>
                <div className="flex items-center gap-0.5 text-xs font-medium text-amber-500">
                  <FiStar size={11} /> {v.rating?.toFixed(1)}
                </div>
              </div>
            ))}
            {leaderboard.length === 0 && <p className="text-center text-gray-400 text-sm py-6">No data yet</p>}
          </div>

          {/* Recent completed */}
          {tasks.completed?.length > 0 && (
            <div className="mt-5">
              <SectionHeader title="Recent Deliveries" />
              <div className="space-y-2">
                {tasks.completed.slice(0, 3).map(t => (
                  <div key={t._id} className="bg-white rounded-xl p-3 flex items-center gap-3" style={{ border: '1.5px solid #f0fdf4' }}>
                    <div className="text-2xl">✅</div>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-800">{t.donation?.foodName}</div>
                      <div className="text-xs text-gray-400">{new Date(t.verifiedAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
