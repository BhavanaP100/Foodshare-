import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  FiGrid, FiPlusCircle, FiPackage, FiMapPin, FiBarChart2,
  FiMoon, FiLogOut, FiMenu, FiX, FiUser, FiBell, FiSettings
} from 'react-icons/fi';

const NAV_BY_ROLE = {
  donor: [
    { label: 'Dashboard', icon: FiGrid, path: '/donor' },
    { label: 'Add Donation', icon: FiPlusCircle, path: '/donor/add' },
    { label: 'Impact', icon: FiBarChart2, path: '/impact' },
    { label: 'Late Night', icon: FiMoon, path: '/late-night' },
  ],
  ngo: [
    { label: 'Dashboard', icon: FiGrid, path: '/ngo' },
    { label: 'Available Food', icon: FiPackage, path: '/ngo/donations' },
    { label: 'Impact', icon: FiBarChart2, path: '/impact' },
    { label: 'Late Night', icon: FiMoon, path: '/late-night' },
  ],
  volunteer: [
    { label: 'Dashboard', icon: FiGrid, path: '/volunteer' },
    { label: 'Late Night', icon: FiMoon, path: '/late-night' },
    { label: 'Impact', icon: FiBarChart2, path: '/impact' },
  ],
  admin: [
    { label: 'Dashboard', icon: FiGrid, path: '/admin' },
    { label: 'Impact', icon: FiBarChart2, path: '/impact' },
    { label: 'Late Night', icon: FiMoon, path: '/late-night' },
  ],
};

export default function DashboardLayout({ children, title }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifs] = useState(3);

  const nav = NAV_BY_ROLE[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const roleColors = {
    donor: '#22c55e',
    ngo: '#0ea5e9',
    volunteer: '#f59e0b',
    admin: '#8b5cf6',
  };
  const roleColor = roleColors[user?.role] || '#22c55e';

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 h-full z-40 flex flex-col"
            style={{ width: 260, background: '#fff', borderRight: '1.5px solid #f0fdf4', boxShadow: '4px 0 24px rgba(0,0,0,0.06)' }}
          >
            {/* Brand */}
            <div className="flex items-center gap-3 px-6 py-5 border-b border-green-50">
              <div className="text-2xl">🌿</div>
              <div>
                <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1rem', color: '#14532d' }}>
                  FoodShare <span style={{ color: '#22c55e' }}>Nexus</span>
                </div>
                <div style={{ fontSize: '0.62rem', color: '#86efac', letterSpacing: '0.1em' }}>
                  {user?.role?.toUpperCase()} PORTAL
                </div>
              </div>
            </div>

            {/* User profile chip */}
            <div className="mx-4 mt-4 mb-2 p-3 rounded-xl" style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: roleColor }}>
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-sm text-green-900 leading-tight">{user?.name}</div>
                  <div className="text-xs text-green-500 capitalize">{user?.role}</div>
                </div>
              </div>
            </div>

            {/* Nav links */}
            <nav className="flex-1 px-3 mt-2 space-y-1">
              {nav.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`sidebar-link ${active ? 'active' : ''}`}
                    style={active ? { background: '#dcfce7', color: '#15803d', fontWeight: 600 } : {}}
                  >
                    <Icon size={18} />
                    {item.label}
                    {active && <div className="ml-auto w-1.5 h-5 rounded-full" style={{ background: '#22c55e' }} />}
                  </Link>
                );
              })}
            </nav>

            {/* Bottom actions */}
            <div className="px-3 pb-6 space-y-1 border-t border-green-50 pt-3 mt-2">
              <Link to="/" className="sidebar-link">
                <FiSettings size={17} /> Settings
              </Link>
              <button
                onClick={handleLogout}
                className="sidebar-link w-full text-left"
                style={{ color: '#ef4444' }}
              >
                <FiLogOut size={17} /> Sign Out
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div
        className="flex-1 flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? 260 : 0 }}
      >
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4" style={{ background: '#fff', borderBottom: '1.5px solid #f0fdf4', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-green-50 text-green-700 transition-colors">
              {sidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>
            <h1 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1.15rem', color: '#14532d' }}>{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-green-50 text-green-600 transition-colors">
              <FiBell size={19} />
              {notifs > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-white text-xs flex items-center justify-center" style={{ background: '#22c55e', fontSize: 10 }}>{notifs}</span>
              )}
            </button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: roleColor }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
