 import { motion } from 'framer-motion';

// ─── Stat Card ─────────────────────────────────────────────────
export function StatCard({ icon, label, value, sub, color = '#22c55e', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.1)' }}
      className="bg-white rounded-2xl p-5"
      style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl" style={{ background: `${color}15` }}>
          {icon}
        </div>
        {sub && <span className="text-xs text-green-500 font-medium bg-green-50 px-2 py-1 rounded-full">{sub}</span>}
      </div>
      <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1.75rem', color: '#14532d', lineHeight: 1 }}>{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </motion.div>
  );
}

// ─── Freshness Badge ────────────────────────────────────────────
export function FreshnessBadge({ badge, score }) {
  const map = {
    Fresh: { bg: '#dcfce7', color: '#15803d', dot: '#22c55e' },
    Good: { bg: '#d1fae5', color: '#065f46', dot: '#10b981' },
    'Use Soon': { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
    Critical: { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
  };
  const s = map[badge] || map.Fresh;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: s.bg, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: s.dot }} />
      {badge} {score !== undefined && `(${score})`}
    </span>
  );
}

// ─── Status Badge ───────────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
    matched: { bg: '#dbeafe', color: '#1e40af', label: 'Matched' },
    assigned: { bg: '#ede9fe', color: '#5b21b6', label: 'Assigned' },
    picked_up: { bg: '#fce7f3', color: '#9d174d', label: 'Picked Up' },
    in_transit: { bg: '#ffedd5', color: '#9a3412', label: 'In Transit' },
    delivered: { bg: '#d1fae5', color: '#065f46', label: 'Delivered' },
    verified: { bg: '#dcfce7', color: '#14532d', label: '✓ Verified' },
    expired: { bg: '#fee2e2', color: '#991b1b', label: 'Expired' },
    cancelled: { bg: '#f3f4f6', color: '#6b7280', label: 'Cancelled' },
  };
  const s = map[status] || map.pending;
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// ─── Food Donation Card ─────────────────────────────────────────
export function FoodCard({ donation, onAccept, showAccept = false, showDistance = false, delay = 0 }) {
  const timeLeft = donation.minutesLeft !== undefined
    ? donation.minutesLeft < 60
      ? `${donation.minutesLeft}m left`
      : `${Math.round(donation.minutesLeft / 60)}h left`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(0,0,0,0.1)' }}
      className="bg-white rounded-2xl overflow-hidden"
      style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', cursor: 'pointer' }}
    >
      {/* Image or colored header */}
      <div className="h-36 flex items-center justify-center relative" style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)' }}>
        <span className="text-5xl filter drop-shadow-lg">
          {donation.isVeg ? '🥗' : '🍖'}
        </span>
        <div className="absolute top-3 left-3">
          <FreshnessBadge badge={donation.freshnessBadge} score={donation.freshnessScore} />
        </div>
        {donation.urgencyLevel === 'critical' && (
          <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
            URGENT
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight">{donation.foodName}</h3>
          {donation.isVeg
            ? <span className="text-xs text-green-600 border border-green-300 px-1.5 py-0.5 rounded font-medium">VEG</span>
            : <span className="text-xs text-red-500 border border-red-200 px-1.5 py-0.5 rounded font-medium">NON-VEG</span>
          }
        </div>
        <p className="text-xs text-gray-400 capitalize mb-2">{donation.category} • {donation.quantity} {donation.quantityUnit}</p>

        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          {showDistance && donation.distance !== undefined && (
            <span className="flex items-center gap-1">📍 {donation.distance} km away</span>
          )}
          {timeLeft && (
            <span className={`flex items-center gap-1 font-medium ${donation.urgencyLevel === 'critical' ? 'text-red-500' : 'text-amber-600'}`}>
              ⏱ {timeLeft}
            </span>
          )}
          <span>{donation.mealsEquivalent} meals equiv.</span>
        </div>

        <div className="flex items-center justify-between">
          <StatusBadge status={donation.status} />
          {showAccept && donation.status === 'pending' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onAccept?.(donation._id)}
              className="btn-primary text-xs py-2 px-4"
            >
              Accept
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Section Header ─────────────────────────────────────────────
export function SectionHeader({ title, sub, action }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1.1rem', color: '#14532d' }}>{title}</h2>
        {sub && <p className="text-sm text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────
export function EmptyState({ icon, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <p className="text-gray-400 text-sm mb-4">{message}</p>
      {action}
    </div>
  );
}

// ─── Loading Spinner ────────────────────────────────────────────
export function Spinner({ size = 8, color = '#22c55e' }) {
  return (
    <div className={`w-${size} h-${size} border-4 border-green-100 border-t-green-500 rounded-full animate-spin`}
      style={{ borderTopColor: color }} />
  );
}

// ─── Freshness Progress Bar ─────────────────────────────────────
export function FreshnessBar({ score }) {
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#10b981' : score >= 25 ? '#f59e0b' : '#ef4444';
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Freshness</span>
        <span style={{ color }}>{score}/100</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}
