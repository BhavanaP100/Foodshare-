import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiUser, FiPhone, FiMapPin, FiHome, FiCheckCircle } from 'react-icons/fi';
import DashboardLayout from '../layouts/DashboardLayout';
import LocationPicker from '../components/common/LocationPicker';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-400 focus:outline-none text-sm transition-colors bg-white";
const cardClass = "bg-white rounded-2xl p-6";
const cardStyle = { border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' };

export default function Settings() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    // NGO
    ngoName: user?.ngoName || '',
    registrationNumber: user?.registrationNumber || '',
    capacity: user?.capacity ?? 100,
    ngoLocation: user?.location?.coordinates
      ? { address: user.address || '', lat: user.location.coordinates[1], lng: user.location.coordinates[0] }
      : { address: user?.address || '', lat: '', lng: '' },
    // Donor
    defaultPickupLocation: user?.defaultPickupLocation || { name: '', address: '', lat: '', lng: '' },
    // Volunteer
    isAvailable: user?.isAvailable ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        address: form.address,
      };

      if (user?.role === 'ngo') {
        payload.ngoName = form.ngoName;
        payload.registrationNumber = form.registrationNumber;
        payload.capacity = form.capacity;
        if (form.ngoLocation.lat && form.ngoLocation.lng) {
          payload.location = { lat: form.ngoLocation.lat, lng: form.ngoLocation.lng };
          payload.address = form.ngoLocation.address || form.address;
        }
      }

      if (user?.role === 'donor') {
        if (form.defaultPickupLocation.lat && form.defaultPickupLocation.lng) {
          payload.defaultPickupLocation = form.defaultPickupLocation;
        }
      }

      if (user?.role === 'volunteer') {
        payload.isAvailable = form.isAvailable;
      }

      const { data } = await api.put('/auth/profile', payload);
     if (data.success) {
  updateUser(data.user);
  setSaved(true);

  setTimeout(() => {
    if (user?.role === 'donor') {
      navigate('/donor');
    } else if (user?.role === 'ngo') {
      navigate('/ngo');
    } else if (user?.role === 'volunteer') {
      navigate('/volunteer');
    } else {
      navigate('/admin');
    }
  }, 1500);

} else {
  setError(data.message || 'Failed to save changes');
}
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="Settings">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {error && <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">{error}</div>}
          {saved && (
            <div className="mb-4 p-3 rounded-xl bg-green-50 text-green-700 text-sm border border-green-100 flex items-center gap-2">
              <FiCheckCircle size={16} /> Profile updated successfully.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Basic profile — all roles */}
            <div className={cardClass} style={cardStyle}>
              <h3 className="font-semibold text-gray-800 mb-4 text-sm">Profile Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Full Name</label>
                  <div className="relative">
                    <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`${inputClass} pl-9`} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone</label>
                  <div className="relative">
                    <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={`${inputClass} pl-9`} />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
                  <input value={user?.email || ''} disabled className={`${inputClass} bg-gray-50 text-gray-400 cursor-not-allowed`} />
                </div>
                {user?.role !== 'donor' && user?.role !== 'ngo' && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Address</label>
                    <div className="relative">
                      <FiHome className="absolute left-3 top-3 text-gray-400" size={15} />
                      <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className={`${inputClass} pl-9 resize-none`} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Donor: default pickup location */}
            {user?.role === 'donor' && (
              <div className={cardClass} style={cardStyle}>
                <h3 className="font-semibold text-gray-800 mb-1 text-sm">Default Pickup Location</h3>
                <p className="text-xs text-gray-400 mb-4">
                  The place your food is actually picked up from — a restaurant, bakery, wedding hall, or office. This is used automatically
                  every time you post a new donation. You can still override it for a one-time donation.
                </p>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Restaurant / Hotel/ Organization Name</label>
                  <input
                    value={form.defaultPickupLocation.name}
                    onChange={(e) => setForm({ ...form, defaultPickupLocation: { ...form.defaultPickupLocation, name: e.target.value } })}
                    placeholder="e.g., Green Leaf Bakery, Taj Banquet Hall"
                    className={inputClass}
                  />
                </div>
                <LocationPicker
                  value={form.defaultPickupLocation}
                  onChange={(loc) => setForm({ ...form, defaultPickupLocation: { ...form.defaultPickupLocation, ...loc } })}
                  addressLabel="Pickup Address"
                />
              </div>
            )}

            {/* NGO: organization location */}
            {user?.role === 'ngo' && (
              <div className={cardClass} style={cardStyle}>
                <h3 className="font-semibold text-gray-800 mb-1 text-sm">Organization Details</h3>
                <p className="text-xs text-gray-400 mb-4">
                  Your saved location is used to find and rank nearby donations by distance.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">NGO / Organization Name</label>
                    <input value={form.ngoName} onChange={(e) => setForm({ ...form, ngoName: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Registration Number</label>
                    <input value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Capacity (meals/day)</label>
                    <input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className={inputClass} />
                  </div>
                </div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Organization Location</label>
                <LocationPicker
                  value={form.ngoLocation}
                  onChange={(loc) => setForm({ ...form, ngoLocation: { ...form.ngoLocation, ...loc } })}
                  addressLabel="Organization Address"
                />
              </div>
            )}

            {/* Volunteer: availability */}
            {user?.role === 'volunteer' && (
              <div className={cardClass} style={cardStyle}>
                <h3 className="font-semibold text-gray-800 mb-4 text-sm">Availability</h3>
                <div className="flex gap-3">
                  {[{ v: true, l: '🟢 Available for deliveries' }, { v: false, l: '⏸️ Not available right now' }].map(({ v, l }) => (
                    <button
                      type="button" key={String(v)}
                      onClick={() => setForm({ ...form, isAvailable: v })}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-all ${form.isAvailable === v ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Admin: nothing role-specific beyond basic profile */}

            <motion.button
              type="submit"
              disabled={saving}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm"
              style={{ background: saving ? '#86efac' : 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 4px 16px rgba(34,197,94,0.35)' }}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
