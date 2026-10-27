import React, { useState, useEffect } from 'react';
import { 
  Star, 
  MessageSquare, 
  Smile, 
  Frown, 
  Meh, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Fuel, 
  Filter, 
  ThumbsUp,
  RefreshCw,
  QrCode
} from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';

const RecentFeedbackCard = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // 'ALL', '5', '4', '3', 'LOW'
  const { socket } = useSocket();

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/feedback');
      if (res.data?.data) {
        setFeedbacks(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching feedbacks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();

    if (socket) {
      socket.on('new_feedback', (newFb) => {
        setFeedbacks((prev) => [newFb, ...prev]);
      });
    }

    return () => {
      if (socket) {
        socket.off('new_feedback');
      }
    };
  }, [socket]);

  // Calculations
  const totalCount = feedbacks.length;
  const avgRating = totalCount > 0 
    ? (feedbacks.reduce((acc, f) => acc + Number(f.rating || 0), 0) / totalCount).toFixed(1)
    : '5.0';

  const happyCount = feedbacks.filter(f => Number(f.rating) >= 4).length;
  const csatPercentage = totalCount > 0 ? Math.round((happyCount / totalCount) * 100) : 100;

  // Filtered List
  const filteredFeedbacks = feedbacks.filter(f => {
    const r = Number(f.rating);
    if (selectedFilter === '5') return r === 5;
    if (selectedFilter === '4') return r === 4;
    if (selectedFilter === '3') return r === 3;
    if (selectedFilter === 'LOW') return r <= 2;
    return true;
  });

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffSecs = Math.floor((now - d) / 1000);
      if (diffSecs < 60) return 'Just now';
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    } catch (e) {
      return 'Recently';
    }
  };

  return (
    <div className="glass-panel" style={{
      padding: '1.5rem',
      borderRadius: '16px',
      marginBottom: '2rem',
      background: 'var(--surface-bg)',
      border: '1px solid var(--border-color)',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)'
    }}>
      {/* Header with Title and Overall CSAT Score */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <MessageSquare size={22} color="#8b5cf6" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                Live Customer Hygiene Ratings & Feedback Logs
              </h2>
              <span style={{
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Sparkles size={12} /> {csatPercentage}% CSAT
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Real-time public reviews scanned via QR codes across all petrol pump eco-toilets
            </p>
          </div>
        </div>

        {/* Quick Filter Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: `All (${totalCount})` },
            { id: '5', label: '5★ Excellent' },
            { id: '4', label: '4★ Good' },
            { id: '3', label: '3★ Average' },
            { id: 'LOW', label: '1-2★ Issues' }
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setSelectedFilter(btn.id)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: '600',
                cursor: 'pointer',
                border: selectedFilter === btn.id 
                  ? '1px solid #8b5cf6' 
                  : '1px solid var(--border-color)',
                background: selectedFilter === btn.id 
                  ? 'rgba(139, 92, 246, 0.15)' 
                  : 'var(--surface-bg)',
                color: selectedFilter === btn.id ? '#8b5cf6' : 'var(--text-secondary)',
                transition: 'all 0.15s ease'
              }}
            >
              {btn.label}
            </button>
          ))}
          
          <button
            onClick={fetchFeedbacks}
            title="Refresh Feedbacks"
            style={{
              padding: '0.35rem 0.5rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        <div style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.2)',
          borderRadius: '12px',
          padding: '0.85rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'rgba(245, 158, 11, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Star size={20} fill="#f59e0b" color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#d97706' }}>Average Customer Rating</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-primary)' }}>
              {avgRating} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>/ 5.0</span>
            </div>
          </div>
        </div>

        <div style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '12px',
          padding: '0.85rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Smile size={20} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#10b981' }}>Customer Satisfaction (CSAT)</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-primary)' }}>
              {csatPercentage}% <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Happy Visitors</span>
            </div>
          </div>
        </div>

        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '12px',
          padding: '0.85rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <AlertTriangle size={20} color="#ef4444" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#ef4444' }}>Low Ratings (1-2★ Complaints)</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-primary)' }}>
              {feedbacks.filter(f => Number(f.rating) <= 2).length} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Complaints</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feedbacks Log Table / List */}
      {filteredFeedbacks.length === 0 ? (
        <div style={{
          padding: '2.5rem 1rem',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          background: 'rgba(0, 0, 0, 0.02)',
          borderRadius: '12px',
          border: '1px dashed var(--border-color)'
        }}>
          <MessageSquare size={36} color="var(--text-secondary)" style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
          <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>No customer feedbacks found</div>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem' }}>
            When visitors scan the QR code at petrol pump toilets, their ratings will appear here live.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', width: '140px' }}>Rating</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Machine ID & RO Location</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Customer Reasons / Suggestions</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Comment / Note</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: '600', textAlign: 'right', width: '120px' }}>Logged Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredFeedbacks.map((fb, idx) => {
                const r = Number(fb.rating || 5);
                const isLow = r <= 2;
                const isHigh = r >= 4;
                const machineId = fb.display_machine_name || fb.machine_name || (fb.machine_id ? `SBP2T${fb.machine_id}` : 'SBP2T501');

                return (
                  <tr
                    key={fb.id || idx}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.15s ease',
                      backgroundColor: isLow ? 'rgba(239, 68, 68, 0.03)' : 'transparent'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isLow ? 'rgba(239, 68, 68, 0.06)' : 'var(--hover-bg, rgba(243, 244, 246, 0.5))'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isLow ? 'rgba(239, 68, 68, 0.03)' : 'transparent'}
                  >
                    {/* Rating Stars & Badge */}
                    <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginBottom: '4px' }}>
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star 
                            key={s} 
                            size={14} 
                            fill={s <= r ? '#f59e0b' : 'none'} 
                            color={s <= r ? '#f59e0b' : '#cbd5e1'} 
                          />
                        ))}
                      </div>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        backgroundColor: isLow 
                          ? 'rgba(239, 68, 68, 0.15)' 
                          : isHigh 
                            ? 'rgba(16, 185, 129, 0.15)' 
                            : 'rgba(245, 158, 11, 0.15)',
                        color: isLow ? '#ef4444' : isHigh ? '#10b981' : '#d97706'
                      }}>
                        {isLow ? <AlertTriangle size={11} /> : isHigh ? <CheckCircle2 size={11} /> : <Meh size={11} />}
                        {r}.0 / 5.0 Star
                      </span>
                    </td>

                    {/* Machine ID & RO Location */}
                    <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                        <span style={{
                          fontWeight: '800',
                          color: '#8b5cf6',
                          background: 'rgba(139, 92, 246, 0.12)',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          fontSize: '0.85rem'
                        }}>
                          {machineId}
                        </span>
                        {fb.omc_name && (
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: '600',
                            color: '#3b82f6',
                            background: 'rgba(59, 130, 246, 0.1)',
                            padding: '0.1rem 0.45rem',
                            borderRadius: '4px'
                          }}>
                            {fb.omc_name}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                        {fb.ro_name || 'Retail Outlet Pump'}
                        {fb.ro_location ? ` • ${fb.ro_location}` : ''}
                      </div>
                    </td>

                    {/* Reasons Tags */}
                    <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                      {fb.reasons ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                          {String(fb.reasons).split(',').map((reason, rIdx) => {
                            const trimmed = reason.trim();
                            if (!trimmed) return null;
                            return (
                              <span
                                key={rIdx}
                                style={{
                                  background: isLow 
                                    ? 'rgba(239, 68, 68, 0.1)' 
                                    : 'rgba(16, 185, 129, 0.1)',
                                  color: isLow ? '#ef4444' : '#10b981',
                                  border: isLow 
                                    ? '1px solid rgba(239, 68, 68, 0.25)' 
                                    : '1px solid rgba(16, 185, 129, 0.25)',
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '6px',
                                  fontSize: '0.74rem',
                                  fontWeight: '600'
                                }}
                              >
                                {trimmed}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>-</span>
                      )}
                    </td>

                    {/* Comment */}
                    <td style={{ padding: '1rem', verticalAlign: 'top', maxWidth: '280px' }}>
                      {fb.comment ? (
                        <div style={{
                          fontStyle: 'italic',
                          color: 'var(--text-primary)',
                          lineHeight: 1.4,
                          fontSize: '0.82rem'
                        }}>
                          "{fb.comment}"
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>No comment</span>
                      )}
                      {fb.user_phone && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          📱 {fb.user_phone}
                        </div>
                      )}
                    </td>

                    {/* Time */}
                    <td style={{ padding: '1rem', verticalAlign: 'top', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                        <Clock size={12} />
                        {formatTimeAgo(fb.created_at)}
                      </div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.85, marginTop: '2px', color: '#6366f1', fontWeight: '500' }}>
                        {fb.created_at ? new Date(fb.created_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase() : ''}
                      </div>
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

export default RecentFeedbackCard;
