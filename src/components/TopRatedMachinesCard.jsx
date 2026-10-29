import React from 'react';
import { 
  Trophy, 
  Star, 
  Fuel, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Sparkles, 
  Droplets, 
  Wind, 
  Users,
  ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const calculateMachineRating = (machine, machineAlerts = []) => {
  let score = 5.0;

  // Active or recorded alerts deduction
  const mId = String(machine.name || machine.id || '').trim().toLowerCase();
  const matchedAlerts = (machineAlerts || []).filter(a => {
    const aId = String(a.machineName || a.machineId || a.machine_id || '').trim().toLowerCase();
    if (!aId || !mId) return false;
    return aId === mId || (aId.replace(/\D/g, '') !== '' && aId.replace(/\D/g, '') === mId.replace(/\D/g, ''));
  });

  matchedAlerts.forEach(a => {
    const sev = String(a.severity || '').toLowerCase();
    if (sev === 'danger' || sev === 'critical') {
      score -= 0.6;
    } else {
      score -= 0.25;
    }
  });

  // Odour / NH3 penalty if above threshold
  const odour = parseFloat(String(machine.live_odour || machine.liveOdour || '0').replace(/[^0-9.]/g, '')) || 0;
  if (odour > 70) score -= 0.8;
  else if (odour > 50) score -= 0.4;
  else if (odour > 40) score -= 0.2;

  const nh3 = parseFloat(String(machine.live_nh3 || machine.liveNh3 || '0').replace(/[^0-9.]/g, '')) || 0;
  if (nh3 > 45) score -= 0.5;
  else if (nh3 > 25 && odour > 40) score -= 0.2;

  const h2s = parseFloat(String(machine.live_h2s || machine.liveH2s || '0').replace(/[^0-9.]/g, '')) || 0;
  if (h2s > 18) score -= 0.5;
  else if (h2s > 10 && odour > 40) score -= 0.2;

  // Water level penalty if low or empty
  const water = String(machine.live_water || machine.liveWater || '').toLowerCase();
  if (water.includes('empty') || (water.includes('low') && !water.includes('normal'))) {
    score -= 0.4;
  }

  score = Math.max(2.5, Math.min(5.0, score));
  return Math.round(score * 10) / 10;
};

const TopRatedMachinesCard = ({ 
  machines = [], 
  ros = [], 
  omcs = [], 
  alerts = [], 
  maxDisplay = 10,
  title = "Top 10 High Rated Clean Machines"
}) => {
  // Helper to get RO name
  const getRoName = (machine) => {
    if (machine.roName) return machine.roName;
    const rId = String(machine.ro_id || machine.roId || '');
    if (rId) {
      const match = ros.find(r => String(r.id) === rId || String(r.db_id) === rId);
      if (match?.name) return match.name;
    }
    return 'RO Location';
  };

  // Helper to get OMC name
  const getOmcName = (machine) => {
    if (machine.omcName) return machine.omcName;
    const rId = String(machine.ro_id || machine.roId || '');
    if (rId) {
      const matchRo = ros.find(r => String(r.id) === rId || String(r.db_id) === rId);
      if (matchRo) {
        const oId = String(matchRo.omc_id || matchRo.omcId || '');
        const matchOmc = omcs.find(o => String(o.id) === oId || String(o.db_id) === oId);
        if (matchOmc?.name) return matchOmc.name;
        if (matchRo.omcName) return matchRo.omcName;
      }
    }
    return '';
  };

  // Process & Sort Top Machines
  const ratedMachines = machines.map(m => {
    const mId = String(m.name || m.id || '').trim().toLowerCase();
    const mAlerts = (alerts || []).filter(a => {
      const aId = String(a.machineName || a.machineId || a.machine_id || '').trim().toLowerCase();
      if (!aId || !mId) return false;
      return aId === mId || (aId.replace(/\D/g, '') !== '' && aId.replace(/\D/g, '') === mId.replace(/\D/g, ''));
    });
    const rating = calculateMachineRating(m, mAlerts);
    const visits = Number(m.visits || m.usage || 0);

    return {
      ...m,
      rating,
      alertCount: mAlerts.length,
      roNameResolved: getRoName(m),
      omcNameResolved: getOmcName(m),
      visits
    };
  });

  // Sort descending: highest rating first, zero alerts first, highest visits first
  ratedMachines.sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    if (a.alertCount !== b.alertCount) return a.alertCount - b.alertCount;
    return b.visits - a.visits;
  });

  const topList = ratedMachines.slice(0, maxDisplay);

  // Render star ratings
  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.3;
    const stars = [];

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(
          <Star key={i} size={15} fill="#f59e0b" color="#f59e0b" style={{ marginRight: '1px' }} />
        );
      } else if (i === fullStars + 1 && hasHalf) {
        stars.push(
          <span key={i} style={{ position: 'relative', display: 'inline-block', marginRight: '1px', width: '15px', height: '15px' }}>
            <Star size={15} color="#d1d5db" style={{ position: 'absolute', top: 0, left: 0 }} />
            <span style={{ position: 'absolute', top: 0, left: 0, width: '50%', overflow: 'hidden' }}>
              <Star size={15} fill="#f59e0b" color="#f59e0b" />
            </span>
          </span>
        );
      } else {
        stars.push(
          <Star key={i} size={15} color="#d1d5db" style={{ marginRight: '1px' }} />
        );
      }
    }
    return stars;
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ 
            width: '44px', 
            height: '44px', 
            borderRadius: '12px', 
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
            flexShrink: 0
          }}>
            <Trophy size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>
                {title}
              </h3>
              <span style={{ 
                background: 'rgba(245, 158, 11, 0.12)', 
                color: '#d97706', 
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '0.15rem 0.55rem',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}>
                <Sparkles size={11} /> 100% Cleanliness Verified
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Real-time hygiene performance based on zero alerts, fresh odour levels and regular maintenance
            </p>
          </div>
        </div>

        <Link 
          to="/machine" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            fontSize: '0.875rem', 
            color: '#3b82f6', 
            fontWeight: '600', 
            textDecoration: 'none',
            padding: '0.5rem 1rem', 
            borderRadius: '8px', 
            background: 'rgba(59, 130, 246, 0.08)',
            transition: 'background 0.2s'
          }}
          className="hover-lift"
        >
          View All Machines <ArrowRight size={16} />
        </Link>
      </div>

      {/* Content Table / Cards */}
      {topList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-secondary)' }}>
          <ShieldCheck size={40} color="#10b981" style={{ marginBottom: '0.75rem' }} />
          <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '1rem' }}>No Machine Data Available</div>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>Machines will appear here as telemetry data arrives.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', width: '70px', textAlign: 'center' }}>Rank</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Machine ID</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Petrol Pump (RO)</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Hygiene Rating</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Clean Status</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Air & Sensors</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', textAlign: 'right' }}>Footfall</th>
              </tr>
            </thead>
            <tbody>
              {topList.map((m, index) => {
                const rank = index + 1;
                const isTop1 = rank === 1;
                const isTop2 = rank === 2;
                const isTop3 = rank === 3;

                // Live sensors summary
                let odourVal = m.live_odour || m.liveOdour || '--';
                if (odourVal === '0' || odourVal === '0 PPM') odourVal = '20';
                let waterVal = m.live_water || m.liveWater || 'Normal';
                if (waterVal === '0') waterVal = 'Normal';
                const isWaterOk = !String(waterVal).toLowerCase().includes('low') && !String(waterVal).toLowerCase().includes('empty');

                return (
                  <tr 
                    key={m.id || m.db_id || index}
                    style={{ 
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.15s',
                      background: isTop1 ? 'rgba(245, 158, 11, 0.04)' : 'transparent'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg, rgba(243, 244, 246, 0.5))'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isTop1 ? 'rgba(245, 158, 11, 0.04)' : 'transparent'}
                  >
                    {/* Rank */}
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {isTop1 && (
                        <span style={{ 
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: '30px', height: '30px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                          color: '#ffffff', fontWeight: '800', fontSize: '0.85rem',
                          boxShadow: '0 2px 6px rgba(245, 158, 11, 0.4)'
                        }}>
                          🥇 1
                        </span>
                      )}
                      {isTop2 && (
                        <span style={{ 
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: '30px', height: '30px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
                          color: '#ffffff', fontWeight: '800', fontSize: '0.85rem'
                        }}>
                          🥈 2
                        </span>
                      )}
                      {isTop3 && (
                        <span style={{ 
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: '30px', height: '30px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                          color: '#ffffff', fontWeight: '800', fontSize: '0.85rem'
                        }}>
                          🥉 3
                        </span>
                      )}
                      {!isTop1 && !isTop2 && !isTop3 && (
                        <span style={{ 
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: '26px', height: '26px', borderRadius: '6px',
                          background: 'var(--surface-bg)', border: '1px solid var(--border-color)',
                          color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.8rem'
                        }}>
                          #{rank}
                        </span>
                      )}
                    </td>

                    {/* Machine ID */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ 
                          padding: '0.3rem 0.65rem', 
                          borderRadius: '8px', 
                          background: 'rgba(99, 102, 241, 0.1)', 
                          color: '#6366f1', 
                          fontSize: '0.85rem', 
                          fontWeight: '700',
                          letterSpacing: '0.5px'
                        }}>
                          {m.name || m.id}
                        </span>
                      </div>
                    </td>

                    {/* Petrol Pump (RO) */}
                    <td style={{ padding: '1rem', color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: '600' }}>{m.roNameResolved}</span>
                        {m.omcNameResolved && (
                          <span style={{ 
                            fontSize: '0.72rem', 
                            fontWeight: '700', 
                            color: '#3b82f6',
                            textTransform: 'uppercase'
                          }}>
                            {m.omcNameResolved}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Rating */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {renderStars(m.rating)}
                        </div>
                        <span style={{ 
                          padding: '0.15rem 0.5rem', 
                          borderRadius: '6px', 
                          background: m.rating >= 4.8 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.12)', 
                          color: m.rating >= 4.8 ? '#d97706' : '#10b981',
                          fontWeight: '800', 
                          fontSize: '0.8rem'
                        }}>
                          {m.rating.toFixed(1)}
                        </span>
                      </div>
                    </td>

                    {/* Clean Status */}
                    <td style={{ padding: '1rem' }}>
                      {m.alertCount === 0 ? (
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.35rem',
                          padding: '0.25rem 0.7rem', 
                          borderRadius: '999px',
                          background: 'rgba(16, 185, 129, 0.12)', 
                          color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          fontSize: '0.75rem', 
                          fontWeight: '700'
                        }}>
                          <CheckCircle2 size={13} />
                          0 Alerts • Flawless Clean
                        </span>
                      ) : (
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.35rem',
                          padding: '0.25rem 0.7rem', 
                          borderRadius: '999px',
                          background: 'rgba(245, 158, 11, 0.12)', 
                          color: '#f59e0b',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          fontSize: '0.75rem', 
                          fontWeight: '700'
                        }}>
                          <AlertTriangle size={13} />
                          {m.alertCount} Recent Alert{m.alertCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </td>

                    {/* Air & Sensors */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.25rem',
                          color: 'var(--text-secondary)',
                          background: 'var(--surface-bg)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)'
                        }}>
                          <Wind size={12} color="#8b5cf6" />
                          Odour: <strong style={{ color: 'var(--text-primary)' }}>{odourVal}</strong>
                        </span>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.25rem',
                          color: isWaterOk ? '#10b981' : '#ef4444',
                          background: isWaterOk ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          border: `1px solid ${isWaterOk ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                        }}>
                          <Droplets size={12} />
                          Water: <strong>{waterVal}</strong>
                        </span>
                      </div>
                    </td>

                    {/* Footfall */}
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.35rem', 
                        color: 'var(--text-primary)', 
                        fontWeight: '700',
                        fontSize: '0.85rem' 
                      }}>
                        <Users size={14} color="#3b82f6" />
                        {m.visits || 0} <span style={{ fontWeight: 'normal', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>visits</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TopRatedMachinesCard;
