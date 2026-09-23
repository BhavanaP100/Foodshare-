import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../services/api';

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
export function FoodCard({ donation, onAccept, showAccept = false, showDistance = false, showMatchScore = false, delay = 0 }) {
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

        {showMatchScore && donation.matchScore !== undefined && (
          <div className="mb-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${donation.matchScore}%`,
                  background: donation.matchScore >= 75 ? '#22c55e' : donation.matchScore >= 50 ? '#0ea5e9' : '#f59e0b',
                }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Match: {donation.matchScore}</span>
          </div>
        )}

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

        {/* Recovery recommendation -- shown when a donation could no longer
            be safely redistributed. This is a recommendation only; the
            platform does not claim to physically route the food anywhere. */}
        {donation.status === 'expired' && donation.recoveryRecommendation?.needed && (
          <div className="mt-3 pt-3 border-t border-gray-50 text-xs text-amber-700 bg-amber-50 rounded-lg p-2.5">
            <span className="font-semibold">♻️ Recommended recovery pathway: {donation.recoveryRecommendation.pathway}</span>
            <div className="text-amber-600 mt-0.5">{donation.recoveryRecommendation.reason}</div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Accepted Donation Card ─────────────────────────────────────
// Used on the NGO's "Accepted Donations" page. Reuses FoodCard's visual
// language. For donations awaiting a volunteer, it fetches a ranked,
// explainable recommendation list (GET /tracking/recommend/:id) rather
// than just offering a flat dropdown of every volunteer -- the NGO sees
// WHY each candidate is suggested (distance, availability, verification)
// and picks from there.
const STATUS_STEP_LABEL = {
  matched: 'Waiting for Volunteer',
  assigned: 'Volunteer Assigned',
  picked_up: 'Picked Up',
  in_transit: 'On the Way',
  delivered: 'Delivered',
  verified: 'Delivered & Verified',
};

export function AcceptedFoodCard({ donation, onAssigned, delay = 0 }) {
  const [showRecs, setShowRecs] = useState(false);
  const [recs, setRecs] = useState(null);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const [assignError, setAssignError] = useState('');

  const canAssign = donation.status === 'matched';
  const hasVolunteer = !!donation.assignedVolunteer;
  const hasTracking = donation.status !== 'matched'; // a DeliveryLog exists once assigned

  const loadRecommendations = async () => {
    setShowRecs(true);
    if (recs) return; // already loaded
    setLoadingRecs(true);
    try {
      const { data } = await api.get(`/tracking/recommend/${donation._id}`);
      if (data.success) setRecs(data.recommendations);
    } catch {
      setRecs([]);
    } finally {
      setLoadingRecs(false);
    }
  };

  const handleAssign = async (volunteerId) => {
    setAssigningId(volunteerId);
    setAssignError('');
    try {
      await api.post('/tracking/assign', { donationId: donation._id, volunteerId });
      const v = recs?.find((r) => r.volunteer._id === volunteerId)?.volunteer;
      setShowRecs(false);
      onAssigned?.(donation._id, v);
    } catch (err) {
      setAssignError(err.response?.data?.message || 'Failed to assign volunteer');
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(0,0,0,0.1)' }}
      className="bg-white rounded-2xl overflow-hidden"
      style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}
    >
      {/* Image / header — same treatment as FoodCard */}
      <div className="h-32 flex items-center justify-center relative" style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)' }}>
        {donation.images?.[0] ? (
          <img src={donation.images[0]} alt={donation.foodName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl filter drop-shadow-lg">{donation.isVeg ? '🥗' : '🍖'}</span>
        )}
        <div className="absolute top-3 left-3">
          <FreshnessBadge badge={donation.freshnessBadge} score={donation.freshnessScore} />
        </div>
        <div className="absolute top-3 right-3">
          <StatusBadge status={donation.status} />
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight">{donation.foodName}</h3>
          {donation.isVeg
            ? <span className="text-xs text-green-600 border border-green-300 px-1.5 py-0.5 rounded font-medium">VEG</span>
            : <span className="text-xs text-red-500 border border-red-200 px-1.5 py-0.5 rounded font-medium">NON-VEG</span>}
        </div>
        <p className="text-xs text-gray-400 mb-1">from {donation.donor?.name || 'Donor'}</p>
        <p className="text-xs text-gray-400 mb-2">📍 {donation.pickupAddress}</p>

        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>{donation.quantity} {donation.quantityUnit} • {donation.mealsEquivalent} meals equiv.</span>
          {donation.distance !== undefined && <span>📏 {donation.distance} km</span>}
        </div>
        {donation.matchedAt && (
          <p className="text-xs text-gray-400 mb-3">Accepted {new Date(donation.matchedAt).toLocaleString()}</p>
        )}

        {/* Reserved 4-slot delivery-pipeline footer */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-50">
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Volunteer</div>
            <div className="text-xs font-medium text-gray-700">
              {hasVolunteer ? donation.assignedVolunteer.name : <span className="text-gray-400">Not Assigned Yet</span>}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Status</div>
            <div className="text-xs font-medium text-gray-700">{STATUS_STEP_LABEL[donation.status] || donation.status}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Tracking</div>
            {hasTracking ? (
              <Link to={`/volunteer/track/${donation._id}`} className="text-xs font-medium text-blue-600 hover:underline">
                View Tracking →
              </Link>
            ) : (
              <div className="text-xs font-medium text-gray-400">Unavailable</div>
            )}
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">ETA</div>
            <div className="text-xs font-medium text-gray-400">—</div>
          </div>
        </div>

        {/* Find & assign a volunteer (rule-based, ranked, explainable) */}
        {canAssign && !showRecs && (
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={loadRecommendations}
            className="w-full mt-3 py-2.5 rounded-xl text-xs font-semibold text-white"
            style={{ background: '#0ea5e9' }}
          >
            🔍 Find Recommended Volunteers
          </motion.button>
        )}

        {canAssign && showRecs && (
          <div className="mt-3 pt-3 border-t border-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">Recommended Volunteers</span>
              <button onClick={() => setShowRecs(false)} className="text-xs text-gray-400 hover:text-gray-600">Close</button>
            </div>
            {assignError && <div className="text-xs text-red-600 bg-red-50 rounded-lg p-2 mb-2">{assignError}</div>}
            {loadingRecs ? (
              <div className="flex justify-center py-4"><Spinner size={6} /></div>
            ) : recs?.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">No verified + available volunteers found right now. Try again once someone is available.</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {recs?.map((r) => (
                  <div key={r.volunteer._id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl" style={{ background: '#f9fafb' }}>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-800 truncate">{r.volunteer.name}</div>
                      <div className="text-xs text-gray-400 truncate">{r.reasons.join(' • ')}</div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      disabled={assigningId === r.volunteer._id}
                      onClick={() => handleAssign(r.volunteer._id)}
                      className="text-xs font-medium text-white px-3 py-1.5 rounded-lg flex-shrink-0 disabled:opacity-50"
                      style={{ background: '#22c55e' }}
                    >
                      {assigningId === r.volunteer._id ? '…' : 'Assign'}
                    </motion.button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
// ─── Recovery Recommendation Badge ───────────────────────────────
export function RecoveryBadge({ option, reason }) {
  const map = {
    compost: { bg: '#dcfce7', color: '#15803d', icon: '🌱', label: 'Compost' },
    animal_feed: { bg: '#fef3c7', color: '#92400e', icon: '🐄', label: 'Animal Feed' },
    biogas: { bg: '#ede9fe', color: '#5b21b6', icon: '⚡', label: 'Biogas' },
    discard_safely: { bg: '#f3f4f6', color: '#6b7280', icon: '🗑️', label: 'Safe Disposal' },
  };
  const s = map[option] || map.discard_safely;
  return (
    <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: s.bg }}>
      <span className="text-lg leading-none">{s.icon}</span>
      <div>
        <div className="text-xs font-bold" style={{ color: s.color }}>Recommended: {s.label}</div>
        {reason && <div className="text-xs mt-0.5" style={{ color: s.color, opacity: 0.85 }}>{reason}</div>}
      </div>
    </div>
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