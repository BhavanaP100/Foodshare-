import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiPlusCircle,
  FiPackage,
  FiBarChart2,
  FiMoon,
  FiArrowRight
} from 'react-icons/fi';

import DashboardLayout from '../../layouts/DashboardLayout';
import {
  StatCard,
  FoodCard,
  SectionHeader,
  EmptyState,
  Spinner
} from '../../components/common/UIComponents';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function DonorDashboard() {
  const { user } = useAuth();

  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/donations/my')
      .then(({ data }) => {
        if (data.success) {
          setDonations(data.donations);
        }
      })
      .catch((err) => {
        console.log('Failed to fetch donations', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Active donations
  const active = donations.filter((d) =>
    [
      'pending',
      'matched',
      'assigned',
      'picked_up',
      'in_transit'
    ].includes(d.status)
  );

  // Completed donations
  const completed = donations.filter(
    (d) => d.status === 'verified'
  );

  // Expired donations
  const expired = donations.filter(
    (d) => d.status === 'expired'
  );

  // Total meals saved
  const totalMeals = donations.reduce(
    (sum, d) => sum + (d.mealsEquivalent || 0),
    0
  );

  return (
    <DashboardLayout title="Donor Dashboard">

      {/* =====================================================
          WELCOME BANNER
      ===================================================== */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 mb-6 flex items-center justify-between flex-wrap gap-4"
        style={{
          background: 'linear-gradient(135deg, #14532d, #15803d)',
          color: '#fff'
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: 'Syne',
              fontWeight: 800,
              fontSize: '1.4rem'
            }}
          >
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h2>

          <p className="text-green-200 text-sm mt-1">
            You've helped save {totalMeals} meals so far. Keep it up!
          </p>
        </div>

        <Link to="/donor/add">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm"
            style={{
              background: '#22c55e',
              color: '#fff',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
            }}
          >
            <FiPlusCircle size={18} />
            Add New Donation
          </motion.button>
        </Link>
      </motion.div>


      {/* =====================================================
          STATISTICS
      ===================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

        {/* Total Donations */}
        <StatCard
          icon="📦"
          label="Total Donations"
          value={donations.length}
          sub="All time"
          delay={0}
        />

        {/* Active Donations */}
        <StatCard
          icon="🔄"
          label="Active Posts"
          value={active.length}
          sub="Live"
          color="#0ea5e9"
          delay={0.1}
        />

        {/* Completed Donations */}
        <Link to="/donor/completed">
          <StatCard
            icon="✅"
            label="Donated Food"
            value={completed.length}
            sub="Verified"
            color="#8b5cf6"
            delay={0.2}
          />
        </Link>

        {/* Expired Donations */}
        <Link to="/donor/expired">
          <StatCard
            icon="⚠️"
            label="Expired Food"
            value={expired.length}
            sub="Needs recovery"
            color="#ef4444"
            delay={0.3}
          />
        </Link>

      </div>


      {/* =====================================================
          QUICK ACTIONS
      ===================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

        {[
          {
            icon: '➕',
            label: 'Add Donation',
            desc: 'Post surplus food quickly',
            path: '/donor/add',
            color: '#22c55e'
          },
          {
            icon: '📊',
            label: 'View Impact',
            desc: 'See your contribution stats',
            path: '/impact',
            color: '#0ea5e9'
          },
          {
            icon: '🌙',
            label: 'Late Night Rescue',
            desc: 'Urgent food listings',
            path: '/late-night',
            color: '#8b5cf6'
          }
        ].map((action, index) => (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
          >
            <Link
              to={action.path}
              className="block"
            >
              <div
                className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all"
                style={{
                  background: `${action.color}0d`,
                  border: `1.5px solid ${action.color}20`
                }}
              >

                <div className="text-3xl">
                  {action.icon}
                </div>

                <div className="flex-1">
                  <div className="font-semibold text-sm text-gray-800">
                    {action.label}
                  </div>

                  <div className="text-xs text-gray-400">
                    {action.desc}
                  </div>
                </div>

                <FiArrowRight
                  size={16}
                  style={{ color: action.color }}
                />

              </div>
            </Link>
          </motion.div>
        ))}

      </div>


      {/* =====================================================
          ACTIVE DONATIONS
      ===================================================== */}
      <div
        className="bg-white rounded-2xl p-5"
        style={{
          border: '1.5px solid #f0fdf4',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
        }}
      >

        <SectionHeader
          title="Active Donations"
          sub={`${active.length} in progress`}
          action={
            <Link to="/donor/add">
              <button className="btn-primary text-xs py-2 px-4 flex items-center gap-1">
                <FiPlusCircle size={14} />
                Add New
              </button>
            </Link>
          }
        />


        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (

          /* No active donations */
          active.length === 0 ? (
            <EmptyState
              icon="📦"
              message="No active donations right now."
              action={
                <Link to="/donor/add">
                  <button className="btn-primary text-sm py-2 px-5">
                    Add a Donation
                  </button>
                </Link>
              }
            />
          ) : (

            /* Active donation cards */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

              {active.map((donation, index) => (
                <FoodCard
                  key={donation._id}
                  donation={donation}
                  delay={index * 0.05}
                />
              ))}

            </div>
          )
        )}

      </div>

    </DashboardLayout>
  );
}