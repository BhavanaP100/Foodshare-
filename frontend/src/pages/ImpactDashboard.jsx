import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../services/api';
import { Spinner } from '../components/common/UIComponents';
import { useAuth } from '../context/AuthContext';

function CountUp({ target, suffix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    const end = parseInt(String(target).replace(/\D/g, ''));
    let start = 0;
    const step = Math.ceil(end / 60);
    const t = setInterval(() => { start = Math.min(start + step, end); setCount(start); if (start >= end) clearInterval(t); }, 25);
    return () => clearInterval(t);
  }, [inView, target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

const COLORS = ['#22c55e','#0ea5e9','#f59e0b','#8b5cf6','#ef4444','#10b981'];

export default function ImpactDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historical, setHistorical] = useState(null);
  const [historicalScope, setHistoricalScope] = useState(null);
  const [reportTotals, setReportTotals] = useState(null);

  useEffect(() => {
    api.get('/analytics/impact')
      .then(({ data }) => { if (data.success) setData(data); })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Reuses the SAME historical-analysis endpoint/algorithm used on the
    // donor dashboard and admin dashboard. Public route (optionalAuth on
    // the backend) — automatically scoped to the logged-in donor's own
    // organization if a donor is logged in, otherwise platform-wide.
    api.get('/analytics/historical')
      .then(({ data }) => {
        if (data.success) {
          setHistorical(data.analysis);
          setHistoricalScope(data.scope);
          setReportTotals(data.totals);
        }
      })
      .catch(() => {});
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Spinner size={12} />
    </div>
  );

  const ov = data?.overview || {};
  const charts = data?.charts || {};

  // Real data only — no fabricated fallback numbers. If there isn't enough
  // activity yet to show a meaningful trend/breakdown, we say so instead of
  // rendering invented figures that don't reflect this organization's data.
  const trendData = (charts.dailyTrend || []).map(d => ({ ...d, meals: d.meals || 0 }));
  const categoryData = charts.categoryBreakdown || [];
  const hasTrendData = trendData.length > 0;
  const hasCategoryData = categoryData.length > 0;

  const impactCards = [
    { icon: '🍽️', label: 'Meals Redistributed', value: ov.mealsRedistributed || 0, suffix: '+', color: '#22c55e', bg: '#dcfce7' },
    { icon: '♻️', label: 'Food Saved (kg)', value: ov.foodSavedKg || 0, suffix: ' kg', color: '#0ea5e9', bg: '#dbeafe' },
    { icon: '🌍', label: 'CO₂ Reduced (kg)', value: ov.co2ReducedKg || 0, suffix: ' kg', color: '#10b981', bg: '#d1fae5' },
    { icon: '❤️', label: 'Lives Impacted', value: ov.livesImpacted || 0, suffix: '+', color: '#f59e0b', bg: '#fef3c7' },
    { icon: '🏢', label: 'Active NGOs', value: ov.ngos || 0, suffix: '+', color: '#8b5cf6', bg: '#ede9fe' },
    { icon: '🚴', label: 'Volunteers', value: ov.volunteers || 0, suffix: '+', color: '#ef4444', bg: '#fee2e2' },
  ];

  const isOrgReport = historicalScope === 'organization' && reportTotals;

  // No-library print: build a plain, self-contained HTML document in a new
  // tab and trigger the browser's native print dialog there (user can
  // "Save as PDF" from that dialog). Avoids pulling in a PDF library for a
  // one-off report.
  const handlePrintReport = () => {
    if (!reportTotals) return;
    const rec = historical?.recommendations?.[0];
    const win = window.open('', '_blank');
    if (!win) return;
    const rows = [
      ['Total donations recorded', reportTotals.totalDonations],
      ['Successfully redistributed', reportTotals.successfulDonations],
      ['Redistribution/success rate', reportTotals.redistributionRate !== null ? `${Math.round(reportTotals.redistributionRate * 100)}%` : 'N/A'],
      ['Total quantity donated', `${reportTotals.totalQuantityKg} kg`],
      ['Estimated meals equivalent', reportTotals.totalMealsEquivalent],
      ['Estimated CO₂ saved', `${reportTotals.totalCO2SavedKg} kg`],
    ];
    win.document.write(`
      <html><head><title>Food Redistribution Impact Report — ${user?.name || 'Organization'}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #14532d; padding: 40px; max-width: 700px; margin: 0 auto; }
        h1 { font-size: 1.4rem; margin-bottom: 4px; }
        .sub { color: #6b7280; font-size: 0.85rem; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        td { padding: 8px 4px; border-bottom: 1px solid #e5e7eb; font-size: 0.9rem; }
        td:last-child { text-align: right; font-weight: 600; }
        .rec { background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 8px; padding: 14px; font-size: 0.85rem; }
        .disclaimer { font-size: 0.72rem; color: #9ca3af; margin-top: 30px; line-height: 1.5; }
      </style></head><body>
        <h1>Food Redistribution Impact &amp; CSR-Support Report</h1>
        <div class="sub">${user?.name || 'Organization'} · Generated ${new Date().toLocaleDateString()}</div>
        <table>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>
        ${rec ? `<div class="rec"><strong>Recurring pattern &amp; recommendation</strong><br/>${rec.recommendation}<br/><span style="color:#6b7280;font-size:0.8rem">${rec.basis}</span></div>` : ''}
        <div class="disclaimer">
          This is an internal impact summary generated from this organization's own FoodShare activity records.
          It is not a certified or legally recognized CSR compliance document, and does not constitute tax, GST,
          or legal advice. Figures are estimates derived from recorded donation quantities using fixed conversion
          factors, not independently audited measurements.
        </div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="min-h-screen" style={{ background: '#f0fdf4' }}>
      {/* Nav */}
      <nav className="bg-white border-b border-green-50 px-6 py-4 flex items-center justify-between sticky top-0 z-10" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🌿</span>
          <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1rem', color: '#14532d' }}>
            FoodShare <span className="text-green-500">Nexus</span>
          </span>
        </Link>
        <div className="flex gap-3">
          <Link to="/late-night"><button className="text-sm text-gray-500 hover:text-green-600 transition-colors">🌙 Late Night</button></Link>
          <Link to="/login"><button className="btn-primary text-sm py-2 px-4">Dashboard</button></Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center py-16 px-6" style={{ background: 'linear-gradient(135deg, #14532d, #166534)' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-4xl mb-3">📊</div>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 'clamp(2rem,4vw,3rem)', color: '#fff', marginBottom: 12 }}>
            Our Collective Impact
          </h1>
          <p className="text-green-200 text-base max-w-xl mx-auto">
            Every donation, every delivery, every meal — here's the difference we're making together.
          </p>
        </motion.div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Big stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
          {impactCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -5, boxShadow: '0 16px 40px rgba(0,0,0,0.1)' }}
              className="bg-white rounded-2xl p-6 text-center"
              style={{ border: `1.5px solid ${card.color}20`, boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3" style={{ background: card.bg }}>
                {card.icon}
              </div>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '2rem', color: card.color, lineHeight: 1 }}>
                <CountUp target={card.value} suffix={card.suffix} />
              </div>
              <div className="text-gray-500 text-sm mt-1">{card.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          {/* Area chart - trend */}
          <div className="bg-white rounded-2xl p-6" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontFamily: 'Syne', fontWeight: 700, color: '#14532d', fontSize: '1rem', marginBottom: 20 }}>
              📈 Donation Trend (Last 7 Days)
            </h3>
            {hasTrendData ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="donGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="mealGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
                  <XAxis dataKey="_id" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #dcfce7', fontSize: 12 }} />
                  <Legend />
                  <Area type="monotone" dataKey="count" stroke="#22c55e" fill="url(#donGrad)" strokeWidth={2} name="Donations" dot={{ fill: '#22c55e', r: 4 }} />
                  <Area type="monotone" dataKey="meals" stroke="#0ea5e9" fill="url(#mealGrad)" strokeWidth={2} name="Meals" dot={{ fill: '#0ea5e9', r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-sm text-gray-400 text-center px-6">
                No donation activity in the last 7 days yet.
              </div>
            )}
          </div>

          {/* Pie - categories */}
          <div className="bg-white rounded-2xl p-6" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontFamily: 'Syne', fontWeight: 700, color: '#14532d', fontSize: '1rem', marginBottom: 20 }}>
              🍱 Food Categories Donated
            </h3>
            {hasCategoryData ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={200}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="count" nameKey="_id" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                      {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {categoryData.map((c, i) => (
                    <div key={c._id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-gray-600 capitalize">{c._id}</span>
                      </div>
                      <span className="font-semibold text-gray-800">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-gray-400 text-center px-6">
                No donations recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Environmental impact bar */}
        <div className="bg-white rounded-2xl p-6 mb-8" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontFamily: 'Syne', fontWeight: 700, color: '#14532d', fontSize: '1rem', marginBottom: 4 }}>
            🌍 Environmental Impact Breakdown
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            Estimated from redistributed food weight using fixed conversion factors — a rough planning estimate, not a certified environmental audit.
          </p>
          <div className="space-y-4">
            {[
              { label: 'CO₂ Emissions Prevented', value: ov.co2ReducedKg || 0, max: 20000, unit: 'kg', color: '#22c55e' },
              { label: 'Water Saved (estimated)', value: Math.round((ov.foodSavedKg || 0) * 1500), max: 10000000, unit: 'L', color: '#0ea5e9' },
              { label: 'Land Use Saved', value: Math.round((ov.foodSavedKg || 0) * 0.5), max: 5000, unit: 'm²', color: '#f59e0b' },
            ].map(bar => (
              <div key={bar.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-600">{bar.label}</span>
                  <span className="font-semibold text-gray-800">{bar.value.toLocaleString()} {bar.unit}</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (bar.value / bar.max) * 100)}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                    className="h-full rounded-full"
                    style={{ background: bar.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Historical Insights — concise, reuses the same historical-analysis
            endpoint/algorithm as the donor and admin dashboards. Auto-scoped:
            org-specific if a donor is logged in, platform-wide otherwise. */}
        <div className="bg-white rounded-2xl p-6 mb-8" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontFamily: 'Syne', fontWeight: 700, color: '#14532d', fontSize: '1rem', marginBottom: 4 }}>
            🔍 Historical Insights <span className="text-xs font-normal text-gray-400">({historicalScope === 'organization' ? 'Your Organization' : 'Platform-Wide'})</span>
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            Rule-Based Historical Analysis — explainable pattern detection over recorded donation data, not predictive AI.
          </p>

          {!historical && (
            <p className="text-center text-gray-400 text-sm py-6">Loading…</p>
          )}

          {historical?.insufficientData && (
            <p className="text-center text-gray-400 text-sm py-6">
              Insufficient historical data to generate a reliable recommendation
              ({historical.recordCount} of {historical.minimumRequired} minimum donation records collected so far).
            </p>
          )}

          {historical && !historical.insufficientData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-sm">
              <div className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: '#f9fafb' }}>
                <span className="text-gray-600">Dominant category</span>
                <span className="font-medium text-gray-800 capitalize">{historical.categoryDistribution[0]?.category}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: '#f9fafb' }}>
                <span className="text-gray-600">Dominant time period</span>
                <span className="font-medium text-gray-800">{historical.timeWindowDistribution[0]?.label}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: '#f9fafb' }}>
                <span className="text-gray-600">Success / expiry pattern</span>
                <span className="font-medium text-gray-800">{Math.round(historical.outcomeBreakdown.successRate * 100)}% success rate</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: '#f9fafb' }}>
                <span className="text-gray-600">Quantity trend ({historical.quantityTrend.windowDays}d)</span>
                <span className="font-medium text-gray-800">
                  {historical.quantityTrend.changeRatio === null ? 'N/A' : `${historical.quantityTrend.changeRatio >= 0 ? '+' : ''}${Math.round(historical.quantityTrend.changeRatio * 100)}%`}
                </span>
              </div>
            </div>
          )}

          {historical && !historical.insufficientData && historical.recommendations[0] && (
            <div className="p-3 rounded-xl" style={{ background: '#f0fdf4', border: '1px solid #dcfce7' }}>
              <div className="text-sm text-gray-800 mb-1">{historical.recommendations[0].recommendation}</div>
              <div className="text-xs text-gray-400">{historical.recommendations[0].basis}</div>
            </div>
          )}
        </div>

        {/* Impact / CSR-Support Report — organization-specific, only shown to a
            logged-in donor viewing their own data. Reuses stored mealsEquivalent/
            co2Saved values already computed on each donation; no new calculation
            system introduced. */}
        {isOrgReport && (
          <div className="bg-white rounded-2xl p-6 mb-8" style={{ border: '1.5px solid #f0fdf4', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center justify-between mb-1">
              <h3 style={{ fontFamily: 'Syne', fontWeight: 700, color: '#14532d', fontSize: '1rem' }}>
                📋 Impact / CSR-Support Report
              </h3>
              <button onClick={handlePrintReport} className="text-xs font-medium px-3 py-1.5 rounded-lg text-green-700 hover:bg-green-50 transition-colors" style={{ border: '1px solid #dcfce7' }}>
                🖨️ Print / Save as PDF
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              A summary of {user?.name || 'your organization'}'s own recorded FoodShare activity — not a certified or legally recognized CSR compliance document.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                ['Total Donations', reportTotals.totalDonations],
                ['Successfully Redistributed', reportTotals.successfulDonations],
                ['Redistribution Rate', reportTotals.redistributionRate !== null ? `${Math.round(reportTotals.redistributionRate * 100)}%` : 'N/A'],
                ['Total Quantity', `${reportTotals.totalQuantityKg} kg`],
                ['Meals Equivalent', reportTotals.totalMealsEquivalent],
                ['CO₂ Saved (est.)', `${reportTotals.totalCO2SavedKg} kg`],
              ].map(([label, val]) => (
                <div key={label} className="p-3 rounded-xl text-center" style={{ background: '#f9fafb' }}>
                  <div className="text-lg font-bold text-gray-800">{val}</div>
                  <div className="text-[11px] text-gray-400">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="text-center py-10 rounded-3xl" style={{ background: 'linear-gradient(135deg, #14532d, #166534)' }}>
          <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1.8rem', color: '#fff', marginBottom: 12 }}>
            Be Part of the Impact
          </h2>
          <p className="text-green-200 mb-6">Join thousands of donors, volunteers, and NGOs making a difference every day.</p>
          <div className="flex justify-center gap-4">
            <Link to="/register">
              <motion.button whileHover={{ scale: 1.05 }} className="btn-primary px-6 py-3 text-sm">
                Join Now →
              </motion.button>
            </Link>
            <Link to="/">
              <button className="px-6 py-3 text-sm rounded-xl border-2 border-green-400 text-green-200 hover:bg-green-800 transition-colors">
                Learn More
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
