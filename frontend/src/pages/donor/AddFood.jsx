import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUploadCloud, FiMapPin, FiClock, FiThermometer, FiAlertCircle, FiEdit3, FiCheckCircle } from 'react-icons/fi';
import DashboardLayout from '../../layouts/DashboardLayout';
import { FreshnessBar } from '../../components/common/UIComponents';
import LocationPicker from '../../components/common/LocationPicker';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const CATEGORIES = ['cooked', 'raw', 'packaged', 'beverages', 'dairy', 'bakery', 'other'];
const STORAGE = [
  { value: 'room_temp', label: 'Room Temperature', icon: '🌡️' },
  { value: 'refrigerated', label: 'Refrigerated', icon: '❄️' },
  { value: 'frozen', label: 'Frozen', icon: '🧊' },
];

// Client-side freshness estimate
const estimateFreshness = (form) => {
  if (!form.cookedTime || !form.category) return 100;
  const hoursElapsed = (Date.now() - new Date(form.cookedTime).getTime()) / 3.6e6;
  const maxHours = { cooked: 6, dairy: 8, bakery: 12, raw: 24, beverages: 48, packaged: 720, other: 12 };
  const max = maxHours[form.category] || 12;
  const storage = form.storageCondition === 'frozen' ? 0.2 : form.storageCondition === 'refrigerated' ? 0.5 : 1.0;
  return Math.max(0, Math.round((1 - (hoursElapsed * storage) / max) * 100));
};

export default function AddFood() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const savedLocation = user?.defaultPickupLocation;
  const hasSavedLocation = !!(savedLocation?.lat && savedLocation?.lng);

  const [form, setForm] = useState({
    foodName: '', category: 'cooked', isVeg: true, quantity: '', quantityUnit: 'kg',
    cookedTime: '', storageCondition: 'room_temp',
    pickupDeadline: '', pickupAddress: '', description: '',
    location: { lat: '', lng: '' },
  });
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Whether this donation should use the saved default pickup location, or
  // a one-time override. Defaults to "use saved" whenever one exists.
  const [overridingLocation, setOverridingLocation] = useState(!hasSavedLocation);

  // Pre-fill from the donor's saved default pickup location on load.
  useEffect(() => {
    if (hasSavedLocation && !overridingLocation) {
      setForm((f) => ({
        ...f,
        pickupAddress: savedLocation.address || '',
        location: { lat: savedLocation.lat, lng: savedLocation.lng },
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const freshnessScore = estimateFreshness(form);
  const freshnessBadge = freshnessScore >= 75 ? 'Fresh' : freshnessScore >= 50 ? 'Good' : freshnessScore >= 25 ? 'Use Soon' : 'Critical';

  const handleImages = (e) => {
    const files = Array.from(e.target.files).slice(0,5);
    setImages(files);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const toggleOverride = () => {
    setOverridingLocation((prev) => {
      const next = !prev;
      if (!next && hasSavedLocation) {
        // Switching back to "use saved" — restore saved values.
        setForm((f) => ({
          ...f,
          pickupAddress: savedLocation.address || '',
          location: { lat: savedLocation.lat, lng: savedLocation.lng },
        }));
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.location.lat || !form.location.lng || !form.pickupAddress) {
      return setError('Please provide a pickup location — search an address or select on the map.');
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'location') {
          fd.append('location[lat]', v.lat);
          fd.append('location[lng]', v.lng);
        } else {
          fd.append(k, v);
        }
      });
      images.forEach((img) => fd.append('images', img));

      const { data } = await api.post('/donations/add', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.success) navigate('/donor');
      else setError(data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit donation');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-400 focus:outline-none text-sm transition-colors bg-white";

  return (
    <DashboardLayout title="Add Food Donation">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Freshness Preview */}
          <div className="bg-white rounded-2xl p-5 mb-6" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Live Freshness Estimate</h3>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full badge-${freshnessBadge.toLowerCase().replace(' ', '-')}`}>
                {freshnessBadge}
              </span>
            </div>
            <FreshnessBar score={freshnessScore} />
            <p className="text-xs text-gray-400 mt-2">Based on food type, time cooked, and storage. Updates as you fill the form.</p>
          </div>

          {error && <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Basic Info */}
            <div className="bg-white rounded-2xl p-6" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <h3 className="font-semibold text-gray-800 mb-4 text-sm">Food Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Food Name *</label>
                  <input type="text" required value={form.foodName} onChange={(e) => setForm({ ...form, foodName: e.target.value })} placeholder="e.g., Biryani, Rice & Dal, Bread loaves" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Category *</label>
                  <select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Type</label>
                  <div className="flex gap-3">
                    {[{ v: true, l: '🟢 Vegetarian' }, { v: false, l: '🔴 Non-Veg' }].map(({ v, l }) => (
                      <button
                        type="button" key={String(v)}
                        onClick={() => setForm({ ...form, isVeg: v })}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-all ${form.isVeg === v ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Quantity *</label>
                  <div className="flex gap-2">
                    <input type="number" required min={0.1} step={0.1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0.0" className={`${inputClass} flex-1`} />
                    <select value={form.quantityUnit} onChange={(e) => setForm({ ...form, quantityUnit: e.target.value })} className="px-3 py-3 rounded-xl border border-gray-200 focus:outline-none text-sm">
                      {['kg', 'litres', 'servings', 'packets'].map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Cooked / Prepared Time *</label>
                  <input type="datetime-local" required value={form.cookedTime} onChange={(e) => setForm({ ...form, cookedTime: e.target.value })} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Storage & Pickup */}
            <div className="bg-white rounded-2xl p-6" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <h3 className="font-semibold text-gray-800 mb-4 text-sm">Storage & Pickup</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Storage Condition</label>
                  <div className="grid grid-cols-3 gap-2">
                    {STORAGE.map((s) => (
                      <button
                        type="button" key={s.value}
                        onClick={() => setForm({ ...form, storageCondition: s.value })}
                        className={`py-2 px-2 rounded-xl text-xs text-center border transition-all ${form.storageCondition === s.value ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}
                      >
                        <div className="text-lg mb-0.5">{s.icon}</div>
                        <div className={form.storageCondition === s.value ? 'text-green-700 font-medium' : 'text-gray-500'}>{s.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Pickup Deadline *</label>
                  <input type="datetime-local" required value={form.pickupDeadline} onChange={(e) => setForm({ ...form, pickupDeadline: e.target.value })} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-white rounded-2xl p-6" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800 text-sm">Pickup Location</h3>
                {hasSavedLocation && (
                  <motion.button
                    type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={toggleOverride}
                    className="flex items-center gap-1.5 text-xs text-green-600 font-medium bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 hover:bg-green-100 transition-colors"
                  >
                    {overridingLocation ? <><FiCheckCircle size={14} /> Use Saved Location</> : <><FiEdit3 size={14} /> Override for This Donation</>}
                  </motion.button>
                )}
              </div>

              {hasSavedLocation && !overridingLocation ? (
                <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0' }}>
                  <FiMapPin className="text-green-600 mt-0.5" size={18} />
                  <div>
                    {savedLocation.name && <div className="text-sm font-semibold text-green-900">{savedLocation.name}</div>}
                    <div className="text-xs text-green-700 mt-0.5">{savedLocation.address}</div>
                    <div className="text-xs text-green-500 mt-1">{Number(savedLocation.lat).toFixed(4)}, {Number(savedLocation.lng).toFixed(4)}</div>
                  </div>
                </div>
              ) : (
                <>
                  {!hasSavedLocation && (
                    <p className="text-xs text-gray-400 mb-3">
                      You don't have a default pickup location saved yet. Search for the address or pick it on the map below —
                      or set a default in <Link to ="/settings" className="text-green-600 font-medium hover:underline">Settings</Link> so it auto-fills next time.
                    </p>
                  )}
                  <LocationPicker
                    value={{ address: form.pickupAddress, lat: form.location.lat, lng: form.location.lng }}
                    onChange={({ address, lat, lng }) =>
                      setForm((f) => ({ ...f, pickupAddress: address ?? f.pickupAddress, location: { lat: lat ?? f.location.lat, lng: lng ?? f.location.lng } }))
                    }
                    addressLabel="Pickup Address for This Donation"
                  />
                </>
              )}
            </div>

            {/* Images */}
            <div className="bg-white rounded-2xl p-6" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <h3 className="font-semibold text-gray-800 mb-4 text-sm">Food Images</h3>
              <label className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed border-green-200 cursor-pointer hover:border-green-400 hover:bg-green-50 transition-all">
                <FiUploadCloud size={32} className="text-green-400" />
                <div className="text-sm text-gray-500">Click to upload or drag & drop</div>
                <div className="text-xs text-gray-400">PNG, JPG up to 5MB each (max 5 photos)</div>
                <input type="file" multiple accept="image/*" onChange={handleImages} className="hidden" />
              </label>
              {previews.length > 0 && (
                <div className="flex gap-3 mt-4 flex-wrap">
                  {previews.map((src, i) => (
                    <img key={i} src={src} alt="" className="w-20 h-20 rounded-xl object-cover border-2 border-green-100" />
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl p-6" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Additional Notes</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Any special instructions, allergens, or packaging details…" rows={3} className={`${inputClass} resize-none`} />
            </div>

            <div className="flex gap-4">
              <button type="button" onClick={() => navigate('/donor')} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex-2 flex-1 py-3 rounded-xl text-white font-semibold text-sm"
                style={{ background: loading ? '#86efac' : 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 4px 16px rgba(34,197,94,0.35)', flex: 2 }}
              >
                {loading ? 'Submitting…' : '🌿 Submit Donation'}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
