import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { EmptyState, Spinner, SectionHeader, RecoveryBadge } from '../../components/common/UIComponents';
import api from '../../services/api';

export default function ExpiredDonations() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/donations/my')
      .then(({ data }) => { if (data.success) setDonations(data.donations); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const expired = donations.filter(d => d.status === 'expired');

  return (
    <DashboardLayout title="Expired Food">
      <div className="bg-white rounded-2xl p-5" style={{ border: '1.5px solid #fee2e2', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
        <SectionHeader
          title="⚠️ Expired / Needs Recovery"
          sub={`${expired.length} listings missed pickup or spoiled in transit`}
        />
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : expired.length === 0 ? (
          <EmptyState icon="🎉" message="No expired donations — everything you've posted has been picked up in time." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {expired.map((d) => (
              <div key={d._id} className="rounded-2xl p-4" style={{ border: '1.5px solid #fee2e2', background: '#fff7f7' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm text-gray-800">{d.foodName}</span>
                  <span className="text-xs text-red-500 font-medium">
                    {d.spoiledStage === 'in_delivery' ? 'Spoiled in transit' : 'Missed pickup'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-3 capitalize">{d.category} • {d.quantity} {d.quantityUnit}</p>
                {d.recoveryOption && <RecoveryBadge option={d.recoveryOption} reason={d.recoveryReason} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}