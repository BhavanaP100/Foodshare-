import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardLayout from '../../layouts/DashboardLayout';
import { EmptyState, Spinner, SectionHeader, RecoveryBadge } from '../../components/common/UIComponents';
import api from '../../services/api';

export default function ExpiredFood() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/donations/my-accepted')
      .then(({ data }) => { if (data.success) setDonations(data.donations); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Donations this NGO accepted, but which expired before a volunteer
  // picked them up (missed_pickup) or spoiled mid-delivery (in_delivery).
  const expired = donations.filter(d => d.status === 'expired');

  return (
    <DashboardLayout title="Expired Food">
      <div className="bg-white rounded-2xl p-5" style={{ border: '1.5px solid #fee2e2', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
        <SectionHeader
          title="⚠️ Expired Accepted Donations"
          sub={`${expired.length} accepted donations that missed pickup or spoiled in transit`}
        />
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : expired.length === 0 ? (
          <EmptyState icon="🎉" message="None of your accepted donations have expired." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {expired.map((d, i) => (
              <motion.div
                key={d._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl p-4"
                style={{ border: '1.5px solid #fee2e2', background: '#fff7f7' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm text-gray-800">{d.foodName}</span>
                 

                  <span className="text-xs text-red-500 font-medium">
  {d.spoiledStage === 'in_delivery'
    ? 'Spoiled in transit'
    : d.spoiledStage === 'awaiting_pickup'
    ? 'Expired before volunteer pickup'
    : 'Missed pickup'}
</span>
                </div>
                <p className="text-xs text-gray-400 mb-2 capitalize">{d.category} • {d.quantity} {d.quantityUnit}</p>

                {d.donor?.name && (
                  <div className="text-xs text-gray-500 mb-1">
                    Donor: <span className="font-medium text-gray-700">{d.donor.name}</span>
                  </div>
                )}
                {d.assignedVolunteer?.name && (
                  <div className="text-xs text-gray-500 mb-3">
                    Volunteer: <span className="font-medium text-gray-700">{d.assignedVolunteer.name}</span>
                  </div>
                )}

                {d.recoveryOption && (
                  <RecoveryBadge option={d.recoveryOption} reason={d.recoveryReason} />
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}