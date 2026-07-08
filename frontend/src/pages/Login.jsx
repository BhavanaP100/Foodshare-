import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';

const ROLE_REDIRECTS = {
  donor: '/donor',
  ngo: '/ngo',
  volunteer: '/volunteer',
  admin: '/admin',
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      if (data.success) {
        navigate(ROLE_REDIRECTS[data.user.role] || '/');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const demoLogins = [
    { label: 'Donor Demo', email: 'donor@demo.com', color: '#22c55e' },
    { label: 'NGO Demo', email: 'ngo@demo.com', color: '#0ea5e9' },
    { label: 'Volunteer Demo', email: 'volunteer@demo.com', color: '#f59e0b' },
    { label: 'Admin Demo', email: 'admin@demo.com', color: '#8b5cf6' },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: '#f0fdf4' }}>
      {/* Left illustration */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12" style={{ background: 'linear-gradient(135deg, #050b14, #071018)' }}>
        <div className="text-center">
          <div className="text-7xl mb-6">🌿</div>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '2.5rem', color: '#fff', lineHeight: 1.1 }}>
            Reduce Waste.<br />
            <span style={{ color: '#22c55e' }}>Feed Lives.</span>
          </h1>
          <p className="text-green-300 mt-4 text-base max-w-sm mx-auto">
            Join our platform and help redistribute surplus food to communities in need.
          </p>
          <div className="flex justify-center gap-4 mt-8">
            {['🍎', '🥦', '🌽', '📦', '🥕'].map((e, i) => (
              <motion.div key={i} animate={{ y: [0, -10, 0] }} transition={{ duration: 3, delay: i * 0.5, repeat: Infinity }}>
                <span className="text-3xl">{e}</span>
              </motion.div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 mt-10 max-w-xs mx-auto">
            {[['12,450+', 'Meals Donated'], ['850+', 'Active NGOs'], ['320+', 'Tons Saved'], ['18,200+', 'Lives Impacted']].map(([v, l]) => (
              <div key={l} className="rounded-xl p-3 text-center" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <div style={{ fontFamily: 'Syne', fontWeight: 800, color: '#22c55e', fontSize: '1.2rem' }}>{v}</div>
                <div className="text-xs text-green-400">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-3xl p-8 shadow-xl" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}>
            <div className="flex items-center gap-3 mb-8">
              <div className="text-3xl">🌿</div>
              <div>
                <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1.4rem', color: '#14532d' }}>Welcome back</h2>
                <p className="text-gray-400 text-sm">Sign in to your account</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-green-400 focus:outline-none text-sm transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:border-green-400 focus:outline-none text-sm transition-colors"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPw ? <FiEyeOff size={17} /> : <FiEye size={17} />}
                  </button>
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all"
                style={{ background: loading ? '#86efac' : 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 4px 16px rgba(34,197,94,0.3)' }}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </motion.button>
            </form>

            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center mb-3">Quick demo access</p>
              <div className="grid grid-cols-2 gap-2">
                {demoLogins.map((d) => (
                  <button
                    key={d.email}
                    onClick={() => setForm({ email: d.email, password: 'demo123' })}
                    className="py-2 px-3 rounded-xl text-xs font-medium border transition-all hover:scale-105"
                    style={{ borderColor: `${d.color}40`, color: d.color, background: `${d.color}08` }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-center text-sm text-gray-400 mt-5">
              Don't have an account?{' '}
              <Link to="/register" className="text-green-600 font-semibold hover:underline">Register</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
