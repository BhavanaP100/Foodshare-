
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiClock, FiMapPin, FiZap, FiMoon, FiStar, FiPackage } from 'react-icons/fi';
import api from '../services/api';
import { FreshnessBadge, Spinner } from '../components/common/UIComponents';
import { useAuth } from '../context/AuthContext';

function CountdownTimer({ deadline }) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    const calc = () => setLeft(Math.max(0, Math.round((new Date(deadline) - Date.now()) / 60000)));
    calc();
    const t = setInterval(calc, 30000);
    return () => clearInterval(t);
  }, [deadline]);

  const hrs = Math.floor(left / 60);
  const mins = left % 60;
  const urgent = left < 60;

  return (
    <div className={`flex items-center gap-1.5 text-sm font-bold ${urgent ? 'text-red-500' : 'text-amber-600'}`}>
      <FiClock size={14} className={urgent ? 'animate-pulse' : ''} />
      {hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`} left
    </div>
  );
}

export default function LateNightRescue() {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLateNight, setIsLateNight] = useState(false);
  const [accepting, setAccepting] = useState(null);

  useEffect(() => {
    const hour = new Date().getHours();
    setIsLateNight(hour >= 22 || hour < 5);

    Promise.all([
      api.get('/donations/late-night'),
      api.get('/volunteer/leaderboard'),
    ])
      .then(([d, l]) => {
        if (d.data.success) setDonations(d.data.donations);
        if (l.data.success) setLeaderboard(l.data.volunteers);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAccept = async (id) => {
    if (!user) return;
    setAccepting(id);
    try {
      await api.post(`/donations/${id}/accept`);
      setDonations(prev => prev.map(d => d._id === id ? { ...d, status: 'matched' } : d));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    } finally {
      setAccepting(null);
    }
  };

  const urgent = donations.filter(d => d.urgencyLevel === 'critical' && d.status === 'pending');
  const soon = donations.filter(d => d.urgencyLevel === 'high' && d.status === 'pending');
  // Everything else pending (e.g. Fresh/Good donations) — previously counted
  // in "Total Listings" but never actually rendered anywhere.
  const others = donations.filter(
    d => d.status === 'pending' && d.urgencyLevel !== 'critical' && d.urgencyLevel !== 'high'
  );
  const available = donations.filter(d => d.status === 'pending');

  return (
    <div className="min-h-screen" style={{ background: '#0a0d12', color: '#e8f4f0' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(0,255,180,0.1)', background: 'rgba(5,11,20,0.9)', backdropFilter: 'blur(16px)' }}>
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl">🌿</span>
          <span style={{ fontFamily: 'Syne', fontWeight: 800, color: '#e8f4f0' }}>
            FoodShare <span style={{ color: '#22c55e' }}>Nexus</span>
          </span>
        </Link>
        <div className="flex items-center gap-2 text-sm" style={{ color: '#00ffb4' }}>
          <FiMoon size={16} />
          Late Night Mode
          {isLateNight && <span className="ml-1 w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />}
        </div>
        {user ? (
          <Link to={`/${user.role}`}><button className="btn-primary text-sm py-2 px-4">Dashboard</button></Link>
        ) : (
          <Link to="/login"><button className="btn-primary text-sm py-2 px-4">Sign In</button></Link>
        )}
      </nav>

      {/* Hero */}
      <section className="text-center py-16 px-6 relative overflow-hidden">
        {/* Animated stars */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div key={i} className="absolute rounded-full" style={{ width: Math.random() * 3 + 1, height: Math.random() * 3 + 1, background: '#00ffb4', left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, opacity: 0.4 }}
            animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: Math.random() * 3 + 2, repeat: Infinity, delay: Math.random() * 3 }} />
        ))}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-6xl mb-4">🌙</div>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 'clamp(2rem,4vw,3rem)', marginBottom: 12 }}>
            Late Night <span style={{ color: '#00ffb4' }}>Rescue</span>
          </h1>
          <p style={{ color: 'rgba(200,230,220,0.7)', maxWidth: 520, margin: '0 auto 20px', lineHeight: 1.7 }}>
            Because hunger doesn't sleep. These food donations need urgent attention right now.
          </p>
          {isLateNight ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium" style={{ background: 'rgba(0,255,180,0.1)', border: '1px solid rgba(0,255,180,0.3)', color: '#00ffb4' }}>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Active — Late Night Mode is ON
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(200,230,220,0.5)' }}>
              Night mode activates 10 PM – 5 AM. Showing critical listings.
            </div>
          )}
        </motion.div>
      </section>

      <div className="max-w-6xl mx-auto px-6 pb-16">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: '🔴', label: 'Critical', value: urgent.length },
            { icon: '🟡', label: 'Use Soon', value: soon.length },
            { icon: '📦', label: 'Total Listings', value: available.length },
          ].map(s => (
            <div key={s.label} className="text-center py-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-3xl mb-1">{s.icon}</div>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '2rem', color: '#00ffb4' }}>{s.value}</div>
              <div style={{ color: 'rgba(200,230,220,0.5)', fontSize: '0.8rem' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner color="#00ffb4" size={10} /></div>
        ) : (
          <>
            {/* Critical / Urgent */}
            {urgent.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <FiZap className="text-red-400" size={18} />
                  <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1.1rem', color: '#ef4444' }}>
                    Critical — Expiring Soon
                  </h2>
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {urgent.map((d, i) => (
                    <LateNightCard key={d._id} donation={d} onAccept={handleAccept} accepting={accepting} delay={i * 0.06} urgent />
                  ))}
                </div>
              </div>
            )}

            {/* Use Soon */}
            {soon.length > 0 && (
              <div className="mb-8">
                <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1.1rem', color: '#f59e0b', marginBottom: 16 }}>
                  ⚠️ Use Soon
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {soon.map((d, i) => (
                    <LateNightCard key={d._id} donation={d} onAccept={handleAccept} accepting={accepting} delay={i * 0.06} />
                  ))}
                </div>
              </div>
            )}

            {/* Other available donations (Fresh / Good) */}
            {others.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <FiPackage className="text-green-300" size={18} />
                  <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1.1rem', color: '#00ffb4' }}>
                    Other Available Donations
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {others.map((d, i) => (
                    <LateNightCard key={d._id} donation={d} onAccept={handleAccept} accepting={accepting} delay={i * 0.06} />
                  ))}
                </div>
              </div>
            )}

            {available.length === 0 && (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🌙</div>
                <p style={{ color: 'rgba(200,230,220,0.5)' }}>No late-night donations right now. Check back soon.</p>
              </div>
            )}

          </>
        )}

        {/* Volunteer Safety Section */}
        <div className="my-10 rounded-3xl p-8" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,255,180,0.15)' }}>
          <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1.2rem', color: '#00ffb4', marginBottom: 20 }}>
            🛡️ Volunteer Safety Guidelines
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: '📱', title: 'Share Your Route', desc: 'Always share your live location with a trusted contact before pickup.' },
              { icon: '👥', title: 'Buddy System', desc: 'For late-night rescues, pair up with another volunteer when possible.' },
              { icon: '🔦', title: 'Stay Lit', desc: 'Carry a flashlight and ensure your vehicle has working lights.' },
            ].map(tip => (
              <div key={tip.title} className="p-4 rounded-2xl" style={{ background: 'rgba(0,255,180,0.05)', border: '1px solid rgba(0,255,180,0.1)' }}>
                <div className="text-2xl mb-2">{tip.icon}</div>
                <div className="font-semibold text-sm mb-1" style={{ color: '#e8f4f0' }}>{tip.title}</div>
                <div className="text-xs" style={{ color: 'rgba(200,230,220,0.6)', lineHeight: 1.6 }}>{tip.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Night Hero Leaderboard */}
        <div className="rounded-3xl p-8" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1.2rem', marginBottom: 20 }}>
            🏆 Night Hero Leaderboard
          </h2>
          <div className="space-y-3">
            {leaderboard.slice(0, 5).map((v, i) => (
              <motion.div key={v._id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="text-xl">{['🥇','🥈','🥉','4️⃣','5️⃣'][i]}</div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                  {v.name?.[0]}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{v.name}</div>
                  <div className="text-xs" style={{ color: 'rgba(200,230,220,0.5)' }}>{v.completedDeliveries} deliveries</div>
                </div>
                <div className="flex items-center gap-1 text-amber-400 text-sm">
                  <FiStar size={13} /> {v.rating?.toFixed(1)}
                </div>
                <div className="flex gap-1">
                  {(v.badges || []).slice(0, 2).map(b => (
                    <span key={b} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,255,180,0.1)', color: '#00ffb4' }}>
                      {b === 'Night Hero' ? '🌙' : '🏅'} {b}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
            {leaderboard.length === 0 && <p className="text-center py-8" style={{ color: 'rgba(200,230,220,0.4)' }}>Be the first Night Hero!</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function LateNightCard({ donation, onAccept, accepting, delay, urgent = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -5 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: urgent ? 'linear-gradient(135deg, rgba(80,0,0,0.6), rgba(30,10,10,0.9))' : 'rgba(255,255,255,0.05)',
        border: urgent ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.1)',
        boxShadow: urgent ? '0 0 20px rgba(239,68,68,0.15)' : 'none',
      }}
    >
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold" style={{ color: '#e8f4f0' }}>{donation.foodName}</h3>
            <p className="text-xs mt-0.5 capitalize" style={{ color: 'rgba(200,230,220,0.5)' }}>
              {donation.category} • {donation.quantity} {donation.quantityUnit}
            </p>
          </div>
          <FreshnessBadge badge={donation.freshnessBadge} score={donation.freshnessScore} />
        </div>
        <CountdownTimer deadline={donation.pickupDeadline} />
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-center gap-2 text-xs mb-3" style={{ color: 'rgba(200,230,220,0.5)' }}>
          <FiMapPin size={12} />
          <span className="truncate">{donation.pickupAddress || donation.donor?.address}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs" style={{ color: '#00ffb4' }}>
            🍽️ {donation.mealsEquivalent} meals
          </div>
          {donation.status === 'pending' ? (
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => onAccept(donation._id)}
              disabled={accepting === donation._id}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl"
              style={{ background: urgent ? '#ef4444' : '#22c55e', color: '#fff', opacity: accepting === donation._id ? 0.6 : 1 }}
            >
              <FiZap size={12} /> {accepting === donation._id ? '…' : 'Accept Now'}
            </motion.button>
          ) : (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
              Claimed ✓
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}