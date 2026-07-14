import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import DonorDashboard from './pages/donor/DonorDashboard';
import AddFood from './pages/donor/AddFood';
import NGODashboard from './pages/ngo/NGODashboard';
import AvailableDonations from './pages/ngo/AvailableDonations';
import VolunteerDashboard from './pages/volunteer/VolunteerDashboard';
import DeliveryTracking from './pages/volunteer/DeliveryTracking';
import AdminDashboard from './pages/admin/AdminDashboard';
import ImpactDashboard from './pages/ImpactDashboard';
import LateNightRescue from './pages/LateNightRescue';
import Settings from './pages/Settings';

// Protected route wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-green-600 text-lg">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/impact" element={<ImpactDashboard />} />
      <Route path="/late-night" element={<LateNightRescue />} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

      {/* Donor */}
      <Route path="/donor" element={<ProtectedRoute allowedRoles={['donor']}><DonorDashboard /></ProtectedRoute>} />
      <Route path="/donor/add" element={<ProtectedRoute allowedRoles={['donor']}><AddFood /></ProtectedRoute>} />

      {/* NGO */}
      <Route path="/ngo" element={<ProtectedRoute allowedRoles={['ngo']}><NGODashboard /></ProtectedRoute>} />
      <Route path="/ngo/donations" element={<ProtectedRoute allowedRoles={['ngo']}><AvailableDonations /></ProtectedRoute>} />

      {/* Volunteer */}
      <Route path="/volunteer" element={<ProtectedRoute allowedRoles={['volunteer']}><VolunteerDashboard /></ProtectedRoute>} />
      <Route path="/volunteer/track/:id" element={<ProtectedRoute allowedRoles={['volunteer', 'ngo', 'donor']}><DeliveryTracking /></ProtectedRoute>} />

      {/* Admin */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
