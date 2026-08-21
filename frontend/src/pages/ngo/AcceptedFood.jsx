import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMapPin, FiStar, FiUserCheck, FiArrowRight } from 'react-icons/fi';
import DashboardLayout from '../../layouts/DashboardLayout';
import { StatusBadge, FreshnessBadge, EmptyState, Spinner, SectionHeader } from '../../components/common/UIComponents';
import api from '../../services/api';

export default function AcceptedFood() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState({});
  const [assigning, setAssigning] = useState(null);

  const fetchAccepted = () => {
    setLoading(true);
    api.get('/donations/my-accepted')
      .then(({ data }) => { if (data.success) setDonations(data.donations); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAccepted(); }, []);

  const loadRecommendations = async (donationId) => {
    try {
      const { data } = await api.get(`/tracking/recommend/${donationId}`);
      if (data.success) {
        setRecommendations(prev => ({ ...prev, [donationId]: data.recommendations }));
      }
    } catch (err) {
      // ignore — NGO can still assign manually elsewhere
    }
  };

  const handleAssign = async (donationId, volunteerId) => {
    setAssigning(donationId);
    try {
      const { data } = await api.post('/tracking/assign', { donationId, volunteerId });
      if (data.success) fetchAccepted();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign volunteer');
    } finally {
      setAssigning(null);
    }
  };

  // matched = accepted but not yet assigned a volunteer; everything else
  // (assigned/picked_up/in_transit/delivered/verified) is already in motion.
  const needsVolunteer = donations.filter(d => d.status === 'matched');
  const inProgress = donations.filter(d => !['matched'].includes(d.status));

  return (
    <DashboardLayout title="Accepted Food">
      <div className="space-y-8">
        

        {/* In progress / delivered / verified */}
        <div>
          <SectionHeader title="📦 In Progress & Completed" sub={`${inProgress.length} accepted donations`} />
          {!loading && inProgress.length === 0 ? (
            <EmptyState icon="📦" message="No other accepted donations yet." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {inProgress.map((d) => (
                <div key={d._id} className="bg-white rounded-2xl p-4" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-semibold text-sm text-gray-800">{d.foodName}</span>
                    <StatusBadge status={d.status} />
                  </div>
                  <p className="text-xs text-gray-400 mb-2 capitalize">{d.category} • {d.quantity} {d.quantityUnit}</p>
                  {d.assignedVolunteer && (
                    <div className="text-xs text-gray-500 mb-3">
                      Volunteer: <span className="font-medium text-gray-700">{d.assignedVolunteer.name}</span>
                    </div>
                  )}
                  <Link to={`/volunteer/track/${d._id}`}>
                    <button className="w-full flex items-center justify-center gap-1 text-xs font-medium text-white bg-green-600 px-3 py-2 rounded-lg">
                      Track / Review <FiArrowRight size={12} />
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}