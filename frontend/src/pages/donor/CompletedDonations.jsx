import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { FoodCard, EmptyState, Spinner, SectionHeader } from '../../components/common/UIComponents';
import api from '../../services/api';

export default function CompletedDonations() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/donations/my')
      .then(({ data }) => { if (data.success) setDonations(data.donations); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const completed = donations.filter(d => d.status === 'verified');
  const totalMeals = completed.reduce((s, d) => s + (d.mealsEquivalent || 0), 0);

  return (
    <DashboardLayout title="Donated Food">
      <div className="bg-white rounded-2xl p-5" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
        <SectionHeader
          title="✅ Successfully Donated"
          sub={`${completed.length} completed listings · ${totalMeals} meals delivered`}
        />
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : completed.length === 0 ? (
          <EmptyState icon="✅" message="No completed donations yet. Once a delivery is verified by an NGO, it'll show up here." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {completed.map((d, i) => (
              <FoodCard key={d._id} donation={d} delay={i * 0.04} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}