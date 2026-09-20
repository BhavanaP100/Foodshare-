import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { AcceptedFoodCard, SectionHeader, EmptyState, Spinner } from '../../components/common/UIComponents';
import api from '../../services/api';

export default function AcceptedDonations() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAccepted = () => {
    setLoading(true);
    setError('');
    api.get('/donations/accepted')
      .then(({ data }) => { if (data.success) setDonations(data.donations); })
      .catch(() => setError('Failed to load accepted donations.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAccepted(); }, []);

  const handleAssigned = (donationId, volunteer) => {
    setDonations((prev) =>
      prev.map((d) => (d._id === donationId ? { ...d, status: 'assigned', assignedVolunteer: volunteer } : d))
    );
  };

  const waitingCount = donations.filter((d) => d.status === 'matched').length;
  const inProgressCount = donations.length - waitingCount;

  return (
    <DashboardLayout title="Accepted Donations">
      <SectionHeader
        title="Accepted Donations"
        sub={`${donations.length} total • ${waitingCount} waiting for a volunteer • ${inProgressCount} in progress`}
      />

      {error && <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">{error}</div>}

      {loading ? (
        <div className="py-20 flex justify-center"><Spinner /></div>
      ) : donations.length === 0 ? (
        <EmptyState
          icon="📦"
          message="You haven't accepted any donations yet. Head to Available Food to accept one."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {donations.map((d, i) => (
            <AcceptedFoodCard
              key={d._id}
              donation={d}
              onAssigned={handleAssigned}
              delay={i * 0.05}
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
