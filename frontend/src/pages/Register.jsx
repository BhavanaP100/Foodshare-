import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { FiUser, FiMail, FiLock, FiPhone, FiMapPin, FiChevronRight } from 'react-icons/fi';
import LocationPicker from '../components/common/LocationPicker';

const ROLES = [
  { value: 'donor', label: 'Food Donor', icon: '📦', desc: 'Share surplus food from restaurants, homes, or events', color: '#22c55e' },
  { value: 'ngo', label: 'NGO / Shelter', icon: '🏠', desc: 'Receive food donations for your community', color: '#0ea5e9' },
  { value: 'volunteer', label: 'Volunteer', icon: '🚴', desc: 'Pick up and deliver food to those in need', color: '#f59e0b' },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: '', phone: '', address: '', ngoName: '', registrationNumber: '',
    ngoLocation: { address: '', lat: '', lng: '' },
    defaultPickupLocation: { name: '', address: '', lat: '', lng: '' },
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const ROLE_REDIRECTS = { donor: '/donor', ngo: '/ngo', volunteer: '/volunteer' };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.role === 'ngo' && (!form.ngoLocation.lat || !form.ngoLocation.lng)) {
      setError('Please set your organization location — this is used to match you with nearby donations.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name, email: form.email, password: form.password, role: form.role,
        phone: form.phone, address: form.address,
        ngoName: form.ngoName, registrationNumber: form.registrationNumber,
      };

      if (form.role === 'ngo') {
        payload.location = { lat: form.ngoLocation.lat, lng: form.ngoLocation.lng };
        payload.address = form.ngoLocation.address || form.address;
      }

      if (form.role === 'donor' && form.defaultPickupLocation.lat && form.defaultPickupLocation.lng) {
        payload.defaultPickupLocation = form.defaultPickupLocation;
      }

      const data = await register(payload);
      if (data.success) {
        navigate(ROLE_REDIRECTS[data.user.role] || '/');
      } else {
        setError(data.message);
        setStep(2);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg"
      >
        <div className="bg-white rounded-3xl p-8" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}>
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-4xl mb-2">🌿</div>
            <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1.5rem', color: '#14532d' }}>Join FoodShare Nexus</h1>
            <p className="text-gray-400 text-sm mt-1">Create your account in 2 steps</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                  style={{ background: step >= s ? '#22c55e' : '#f0fdf4', color: step >= s ? '#fff' : '#86efac' }}
                >
                  {s}
                </div>
                <span className="text-xs text-gray-400">{s === 1 ? 'Choose Role' : 'Your Details'}</span>
                {s < 2 && <div className="flex-1 h-0.5 bg-green-100" />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Role selection */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <h3 className="text-sm font-semibold text-gray-700 mb-4">I want to join as a…</h3>
                <div className="space-y-3">
                  {ROLES.map((r) => (
                    <motion.button
                      key={r.value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { setForm({ ...form, role: r.value }); setStep(2); }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all"
                      style={{ borderColor: form.role === r.value ? r.color : '#f0fdf4', background: form.role === r.value ? `${r.color}08` : '#fafaf8' }}
                    >
                      <div className="text-3xl">{r.icon}</div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-gray-800">{r.label}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{r.desc}</div>
                      </div>
                      <FiChevronRight className="text-gray-300" size={18} />
                    </motion.button>
                  ))}
                </div>
                <p className="text-center text-sm text-gray-400 mt-6">
                  Already have an account? <Link to="/login" className="text-green-600 font-semibold hover:underline">Sign in</Link>
                </p>
              </motion.div>
            )}

            {/* Step 2: Details */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {error && <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <div className="relative">
                        <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full Name" className="w-full pl-9 pr-3 py-3 rounded-xl border border-gray-200 focus:border-green-400 focus:outline-none text-sm" />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="relative">
                        <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email Address" className="w-full pl-9 pr-3 py-3 rounded-xl border border-gray-200 focus:border-green-400 focus:outline-none text-sm" />
                      </div>
                    </div>
                    <div className="relative">
                      <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" className="w-full pl-9 pr-3 py-3 rounded-xl border border-gray-200 focus:border-green-400 focus:outline-none text-sm" />
                    </div>
                    <div className="relative">
                      <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone (optional)" className="w-full pl-9 pr-3 py-3 rounded-xl border border-gray-200 focus:border-green-400 focus:outline-none text-sm" />
                    </div>
                    <div className="col-span-2 relative">
                      <FiMapPin className="absolute left-3 top-3 text-gray-400" size={16} />
                      <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" rows={2} className="w-full pl-9 pr-3 py-3 rounded-xl border border-gray-200 focus:border-green-400 focus:outline-none text-sm resize-none" />
                    </div>

                    {form.role === 'ngo' && (
                      <>
                        <div className="col-span-2">
                          <input type="text" required value={form.ngoName} onChange={(e) => setForm({ ...form, ngoName: e.target.value })} placeholder="NGO / Organization Name" className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:border-green-400 focus:outline-none text-sm" />
                        </div>
                        <div className="col-span-2">
                          <input type="text" value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} placeholder="Registration Number (optional)" className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:border-green-400 focus:outline-none text-sm" />
                        </div>
                        <div className="col-span-2 pt-2">
                          <p className="text-xs font-semibold text-gray-700 mb-2">Organization Location *</p>
                          <p className="text-xs text-gray-400 mb-3">Required — this is how we match you with nearby donations.</p>
                          <LocationPicker
                            value={form.ngoLocation}
                            onChange={(loc) => setForm({ ...form, ngoLocation: { ...form.ngoLocation, ...loc } })}
                            addressLabel="Organization Address"
                          />
                        </div>
                      </>
                    )}

                    {form.role === 'donor' && (
                      <div className="col-span-2 pt-2">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Default Pickup Location (optional)</p>
                        <p className="text-xs text-gray-400 mb-3">
                          If your food usually gets picked up from a restaurant, bakery, or venue rather than your home, save it here.
                          You can also add or change this later in Settings, and override it any time when posting a donation.
                        </p>
                        <input
                          type="text"
                          value={form.defaultPickupLocation.name}
                          onChange={(e) => setForm({ ...form, defaultPickupLocation: { ...form.defaultPickupLocation, name: e.target.value } })}
                          placeholder="e.g., Green Leaf Bakery, Taj Banquet Hall (optional)"
                          className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:border-green-400 focus:outline-none text-sm mb-3"
                        />
                        <LocationPicker
                          value={form.defaultPickupLocation}
                          onChange={(loc) => setForm({ ...form, defaultPickupLocation: { ...form.defaultPickupLocation, ...loc } })}
                          addressLabel="Pickup Address"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50">Back</button>
                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex-1 py-3 rounded-xl text-white font-semibold text-sm"
                      style={{ background: loading ? '#86efac' : 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 4px 16px rgba(34,197,94,0.3)' }}
                    >
                      {loading ? 'Creating…' : 'Create Account'}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
