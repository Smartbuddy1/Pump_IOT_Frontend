import React, { useState, useEffect } from 'react';
import { 
  MapPin, Cpu, Bell, TrendingUp, ArrowRight, Users, Droplets, Thermometer, Wind, CloudRain, AlertTriangle, CheckCircle, MessageSquare
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell
} from 'recharts';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';
import { getConsolidatedAlerts } from '../utils/alertUtils';
import TopRatedMachinesCard from '../components/TopRatedMachinesCard';


const OMCDashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [omcList, setOmcList] = useState([]);
  const [selectedOmc, setSelectedOmc] = useState('All');
  const [allRos, setAllRos] = useState([]);
  const [allMachines, setAllMachines] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [liveTodayUsers, setLiveTodayUsers] = useState(0);
  const [todayFeedbacksCount, setTodayFeedbacksCount] = useState(0);
  const [dailyFootfallData, setDailyFootfallData] = useState([]);
  
  const { socket } = useSocket();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [omcsRes, rosRes, machinesRes, alertsRes, statsRes, feedbackRes] = await Promise.all([
          api.get('/omc').catch(() => ({ data: { data: [] } })),
          api.get('/ro').catch(() => ({ data: { data: [] } })),
          api.get('/machines').catch(() => ({ data: { data: [] } })),
          api.get('/alerts').catch(() => ({ data: { data: [] } })),
          api.get('/analytics/dashboard-stats').catch(() => ({ data: { data: { todayUsers: 0, dailyFootfall: [] } } })),
          api.get('/feedback').catch(() => ({ data: { data: [] } }))
        ]);

        const rawOmcs = omcsRes.data?.data || (Array.isArray(omcsRes.data) ? omcsRes.data : []);
        const rawRos = rosRes.data?.data || (Array.isArray(rosRes.data) ? rosRes.data : []);
        const rawMachines = machinesRes.data?.data || (Array.isArray(machinesRes.data) ? machinesRes.data : []);
        const rawAlerts = Array.isArray(alertsRes.data?.data)
          ? alertsRes.data.data
          : (Array.isArray(alertsRes.data) ? alertsRes.data : []);
        const statsData = statsRes.data?.data || { todayUsers: 0, dailyFootfall: [] };

        const allFeedbacks = feedbackRes.data?.data || (Array.isArray(feedbackRes.data) ? feedbackRes.data : []);
        const todayDateStr = new Date().toDateString();
        const todayFbCount = Array.isArray(allFeedbacks)
          ? allFeedbacks.filter(fb => {
              if (!fb) return false;
              const dt = new Date(fb.created_at || fb.createdAt || fb.date);
              return !isNaN(dt.getTime()) && dt.toDateString() === todayDateStr;
            }).length
          : 0;
        setTodayFeedbacksCount(todayFbCount);

        setOmcList(rawOmcs);
        setAllRos(rawRos);
        setLiveTodayUsers(statsData.todayUsers ?? 0);
        if (statsData.dailyFootfall && statsData.dailyFootfall.length > 0) {
          setDailyFootfallData(statsData.dailyFootfall);
        }

        const savedMachines = rawMachines.map(m => {
          const rawWater = String(m.live_water ?? m.liveWater ?? 'Normal').replace('%', '').trim().toLowerCase();
          const numWater = parseInt(rawWater, 10);
          const isWaterEmpty = rawWater.includes('empty') || numWater === 0;
          const isWaterLow = isWaterEmpty || rawWater.includes('low') || (!isNaN(numWater) && numWater <= 25);
          const waterDisplay = isWaterEmpty ? 'Empty' : (isWaterLow ? 'Low' : 'Normal');

          const rawOdour = m.live_odour ?? m.liveOdour ?? '--';
          const cleanOdour = String(rawOdour).replace(/[^0-9.-]/g, '');
          const odourDisplay = cleanOdour ? `${cleanOdour} PPM` : (String(rawOdour).includes('PPM') ? rawOdour : `${rawOdour}`);

          return {
            ...m,
            db_id: m.id || m.db_id,
            id: m.name || m.id,
            name: m.name || `Machine ${m.id}`,
            ro_id: m.ro_id || m.roId,
            roId: m.ro_id || m.roId,
            type: m.type || 'Dispenser',
            status: (rawRos.find(r => String(r.id) === String(m.ro_id || m.roId))?.status?.toLowerCase() === 'inactive') ? 'Inactive' : (m.status || 'ACTIVE'),
            isWaterLow,
            liveTemp: m.live_temp ?? m.liveTemp ?? '--',
            liveWater: waterDisplay,
            liveHumidity: m.live_humidity ?? m.liveHumidity ?? '--',
            liveOdour: odourDisplay
          };
        });
        setAllMachines(savedMachines);

        const alertsList = getConsolidatedAlerts({
          rawAlerts,
          machines: savedMachines,
          ros: rawRos,
          omcs: rawOmcs,
          user
        });
        setRecentAlerts(alertsList);

      } catch (err) {
        console.error('Error fetching data for OMCDashboard:', err);
      }
    };
    fetchData();

    const handleDataChanged = () => {
      fetchData();
    };

    window.addEventListener('app_data_updated', handleDataChanged);
    window.addEventListener('storage', handleDataChanged);
    window.addEventListener('focus', handleDataChanged);
    window.addEventListener('pageshow', handleDataChanged);

    // High-performance real-time telemetry state update without server re-fetching
    const handleLiveTelemetry = (data) => {
      if (!data || !data.machineId) return;
      setRawMachines(prev => (Array.isArray(prev) ? prev : []).map(m => {
        if (m.name?.toLowerCase() === String(data.machineId).toLowerCase()) {
          return {
            ...m,
            live_temp: data.temperature || m.live_temp,
            live_water: data.water || m.live_water,
            live_humidity: data.humidity || m.live_humidity,
            live_odour: data.odour || m.live_odour,
            live_nh3: data.nh3 || m.live_nh3,
            live_h2s: data.h2s || m.live_h2s,
            status: 'Running'
          };
        }
        return m;
      }));
    };

    let debounceTimer = null;
    const debouncedFetchData = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchData();
      }, 2000);
    };

    socket.on('live_data_update', handleLiveTelemetry);
    socket.on('new_alert', debouncedFetchData);
    socket.on('new_feedback', debouncedFetchData);

    return () => {
      window.removeEventListener('app_data_updated', handleDataChanged);
      window.removeEventListener('storage', handleDataChanged);
      window.removeEventListener('focus', handleDataChanged);
      window.removeEventListener('pageshow', handleDataChanged);
      socket.off('live_data_update', handleLiveTelemetry);
      socket.off('new_alert', debouncedFetchData);
      socket.off('new_feedback', debouncedFetchData);
    };
  }, [location.key, location.pathname, user, socket]);

  // Resolve assigned OMC for the logged-in OMC Admin
  const isOmcAdmin = String(user?.role || '').toLowerCase().includes('omc');
  const userOmcId = user?.omcId || user?.omc_id;

  const assignedOmc = React.useMemo(() => {
    if (!isOmcAdmin) return null;
    if (userOmcId) {
      const match = omcList.find(o => String(o.id) === String(userOmcId) || String(o.db_id) === String(userOmcId));
      if (match) return match;
    }
    const userContact = String(user?.mobile || user?.username || '').trim();
    if (userContact) {
      const match = omcList.find(o => 
        String(o.contact || '').trim() === userContact ||
        String(o.credentials?.username || '').trim() === userContact
      );
      if (match) return match;
    }
    const fallbackIocl = omcList.find(o => String(o.id) === '1' || String(o.name).toLowerCase() === 'iocl');
    if (fallbackIocl) return fallbackIocl;
    if (omcList.length > 0) return omcList[0];
    return { id: 1, name: 'iocl' };
  }, [isOmcAdmin, userOmcId, user, omcList]);

  const targetOmcId = isOmcAdmin && assignedOmc ? assignedOmc.id : (isOmcAdmin ? userOmcId : (selectedOmc === 'All' ? null : selectedOmc));

  // Scoped filtering strictly for this assigned OMC
  const filteredROs = targetOmcId
    ? allRos.filter(r => r && (String(r.omc_id) === String(targetOmcId) || String(r.omcId) === String(targetOmcId)))
    : (isOmcAdmin ? [] : allRos);

  const starterRo = filteredROs.length > 0 ? filteredROs[0] : null;
  const actualRoName = starterRo?.name || 'Retail Outlet';
  const targetRoId = starterRo ? String(starterRo.id) : '';

  const validRoIds = new Set(filteredROs.filter(Boolean).map(r => String(r.id)));
  filteredROs.forEach(r => {
    if (r?.db_id) validRoIds.add(String(r.db_id));
    if (r?.name) validRoIds.add(String(r.name).toLowerCase());
  });

  let activeMachines = targetOmcId
    ? allMachines.filter(m => {
        if (!m) return false;
        const mRo = String(m.ro_id || m.roId || '');
        const mRoName = String(m.roName || m.ro_name || '').toLowerCase();
        return validRoIds.has(mRo) || validRoIds.has(mRoName);
      })
    : allMachines;

  if (activeMachines.length === 0 && allMachines.length > 0 && filteredROs.length === 0) {
    activeMachines = allMachines;
  }

  const filteredMachines = activeMachines;

  const validMachineIds = new Set();
  const validMachineNames = new Set();
  filteredMachines.forEach(m => {
    if (m.id) {
      validMachineIds.add(String(m.id).toLowerCase());
      validMachineNames.add(String(m.id).toLowerCase());
    }
    if (m.db_id) {
      validMachineIds.add(String(m.db_id).toLowerCase());
    }
    if (m.name) {
      validMachineIds.add(String(m.name).toLowerCase());
      validMachineNames.add(String(m.name).toLowerCase());
    }
  });

  const filteredAlerts = recentAlerts;

  const activeROsCount = filteredROs.filter(r => r && String(r.status || 'Active').toLowerCase() === 'active').length;
  const activeMachinesCount = filteredMachines.filter(m => {
    if (!m) return false;
    const s = String(m.status || '').trim().toUpperCase();
    return s === 'ACTIVE' || s === 'ONLINE' || s === 'RUNNING' || s === 'OPERATIONAL' || (s !== 'INACTIVE' && s !== 'OFFLINE' && s !== 'DISABLED' && s !== '');
  }).length;
  const inactiveMachinesCount = filteredMachines.length - activeMachinesCount;
  
  const activeAlerts = filteredAlerts.filter(a => a.status !== 'Resolved');
  const activeAlertsCount = activeAlerts.length;

  // Accurate live users count from database telemetry for this OMC's machines
  const usersToday = liveTodayUsers;

  // 7-day footfall ending TODAY with accurate match to database telemetry
  const chartFootfallData = dailyFootfallData.length > 0 ? dailyFootfallData : (() => {
    const baseDate = new Date();
    const list = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const dayLabel = `${monthNames[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;
      const dayName = dayNames[d.getDay()];
      const shortDay = dayName.slice(0, 3);
      list.push({
        day: dayLabel,
        fullDay: `${dayLabel} (${shortDay})`,
        users: i === 0 ? usersToday : 0
      });
    }
    return list;
  })();

  const offlineCount = inactiveMachinesCount;

  const waterAlertCount = filteredMachines.filter(m => {
    const cleanW = String(m.live_water || m.liveWater || '').replace('%', '').trim().toLowerCase();
    const numW = parseInt(cleanW, 10);
    const isWTrigger = String(m.waterLevelTrigger ?? m.waterLimitLow ?? 'Low').toLowerCase() !== 'disabled';
    const isWLowOrEmpty = isWTrigger && (cleanW.includes('low') || cleanW.includes('empty') || (!isNaN(numW) && numW <= 25));
    const hasWaterAlert = filteredAlerts.some(a => 
      (String(a.machineId || a.machine_id).toLowerCase() === String(m.name || m.id).toLowerCase()) &&
      a.type === 'Water' && a.status !== 'Resolved'
    );
    return isWLowOrEmpty || hasWaterAlert;
  }).length;

  const machineStatusData = [
    { name: 'Active', value: activeMachinesCount, color: '#10b981' },
    { name: 'Inactive', value: offlineCount, color: '#ef4444' },
  ].filter(item => item.value > 0);

  const statusSummaryBoxes = [
    { 
      name: 'Active', 
      value: activeMachinesCount, 
      color: '#10b981', 
      bg: 'rgba(16, 185, 129, 0.1)', 
      border: 'rgba(16, 185, 129, 0.25)', 
      link: '/machine?status=ACTIVE' 
    },
    { 
      name: 'Inactive', 
      value: offlineCount, 
      color: '#ef4444', 
      bg: 'rgba(239, 68, 68, 0.1)', 
      border: 'rgba(239, 68, 68, 0.25)', 
      link: '/machine?status=INACTIVE' 
    },
    { 
      name: 'Water Alert', 
      value: waterAlertCount, 
      color: '#0284c7', 
      bg: 'rgba(59, 130, 246, 0.1)', 
      border: 'rgba(59, 130, 246, 0.25)', 
      link: '/alerts?type=Water' 
    },
  ];

  const stats = [
    { 
      title: 'Total ROs', 
      value: filteredROs.length.toString(), 
      icon: MapPin, 
      color: '#f59e0b', 
      badgeText: `${activeROsCount} Active`, 
      badgeColor: '#10b981', 
      badgeBg: 'rgba(16,185,129,0.15)', 
      link: '/ro' 
    },
    { 
      title: 'Total Machines', 
      value: filteredMachines.length.toString(), 
      icon: Cpu, 
      color: '#8b5cf6', 
      badgeText: `${activeMachinesCount} Active`, 
      badgeColor: '#10b981', 
      badgeBg: 'rgba(16,185,129,0.15)', 
      link: '/machine' 
    },
    { 
      title: 'Machine Alerts', 
      value: activeAlertsCount.toString(), 
      icon: Bell, 
      color: '#ef4444', 
      badgeText: activeAlertsCount > 0 ? 'Needs Attention' : 'All Clear', 
      badgeColor: activeAlertsCount > 0 ? '#ef4444' : '#10b981', 
      badgeBg: activeAlertsCount > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', 
      link: '/alerts' 
    },
    { 
      title: 'Today\'s Users', 
      value: usersToday.toLocaleString(), 
      icon: Users, 
      color: '#0ea5e9', 
      badgeText: 'Live Footfall', 
      badgeColor: '#10b981', 
      badgeBg: 'rgba(16,185,129,0.15)', 
      link: '/reports?tab=Usage Analytics&range=7days' 
    },
    { 
      title: 'Today Feedbacks', 
      value: todayFeedbacksCount.toString(), 
      icon: MessageSquare, 
      color: '#10b981', 
      badgeText: `${todayFeedbacksCount} Received`, 
      badgeColor: '#10b981', 
      badgeBg: 'rgba(16,185,129,0.15)', 
      link: '/feedbacks' 
    },
  ];

  const quickActions = [
    { title: 'Create RO', desc: 'Add new retail outlet', icon: MapPin, color: '#3b82f6', link: '/ro?action=add' },
    { title: 'Link Machine', desc: 'Deploy machine at RO', icon: Cpu, color: '#f97316', link: '/machine?action=add' },
  ];

  return (
    <div style={{ padding: '0.5rem 2rem 2rem 2rem', animation: 'fadeIn 0.5s ease-in', maxWidth: '1400px', margin: '0 auto', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            OMC <span style={{ color: '#3b82f6' }}>Dashboard</span>
          </h1>
        </div>
      </div>


      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {stats.map((stat, idx) => (
          <Link to={stat.link} key={idx} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ 
              background: 'var(--surface-bg)', 
              borderRadius: '12px', 
              padding: '1.5rem', 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', 
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              minHeight: '120px',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }} className="hover-lift">
              <div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>{stat.title}</h3>
                <p style={{ fontSize: '2rem', fontWeight: '700', margin: '0 0 0.75rem 0', color: 'var(--text-primary)' }}>{stat.value}</p>
                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.25rem', 
                  padding: '0.2rem 0.5rem', 
                  borderRadius: '999px', 
                  background: stat.badgeBg, 
                  color: stat.badgeColor, 
                  fontSize: '0.75rem', 
                  fontWeight: '700' 
                }}>
                  <TrendingUp size={12} /> {stat.badgeText}
                </div>
              </div>
              <div style={{ 
                width: '56px', 
                height: '56px', 
                borderRadius: '12px', 
                background: stat.color, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#ffffff'
              }}>
                <stat.icon size={28} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 1.5rem 0' }}>OMC Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {quickActions.map((action, idx) => (
            <Link to={action.link} key={idx} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ 
                background: 'var(--surface-bg)', 
                borderRadius: '12px', 
                padding: '1.25rem 1.5rem', 
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02), 0 1px 3px rgba(0, 0, 0, 0.03)', 
                border: '1px solid var(--border-color)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                minHeight: '90px',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }} className="hover-lift">
                <div style={{ 
                  width: '52px', 
                  height: '52px', 
                  borderRadius: '12px', 
                  background: action.color, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#ffffff',
                  flexShrink: 0
                }}>
                  <action.icon size={26} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 0.25rem 0' }}>{action.title}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>{action.desc}</p>
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>
                  <ArrowRight size={20} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Daily Footfall Trends */}
        <div className="glass-panel" style={{ padding: '1.5rem', flex: '1', minWidth: '350px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                <Users color="#3b82f6" size={20} />
                Daily Users
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>Footfall across your ROs</p>
            </div>
            <Link to="/reports?tab=Usage Analytics&range=7days" style={{ fontSize: '0.875rem', color: 'var(--primary-color)', fontWeight: '500', textDecoration: 'none' }}>View All</Link>
          </div>
          <Link 
            to="/reports?tab=Usage Analytics&range=7days" 
            style={{ textDecoration: 'none', display: 'block', cursor: 'pointer' }}
            title="Click to view detailed 7-day Usage Analytics Report"
          >
            <div style={{ height: '280px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartFootfallData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                  <RechartsTooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                    contentStyle={{ backgroundColor: 'var(--surface-bg)', borderRadius: '8px', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="users" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Link>
        </div>

        {/* Machine Status */}
        <div className="glass-panel" style={{ padding: '1.5rem', flex: '1', minWidth: '350px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
                Machine Status Distribution
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>Live operational status of all registered machines</p>
            </div>
            <Link to="/machine" style={{ fontSize: '0.875rem', color: 'var(--primary-color)', fontWeight: '500', textDecoration: 'none' }}>View All</Link>
          </div>
          
          <Link to="/machine?status=ACTIVE" style={{ textDecoration: 'none', display: 'block', cursor: 'pointer' }} title="Click to view Active Machines">
            <div style={{ height: '220px', width: '100%', position: 'relative', marginBottom: '1rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie data={machineStatusData} cx="50%" cy="50%" innerRadius={70} outerRadius={92} paddingAngle={4} dataKey="value">
                    {machineStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', background: 'var(--surface-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                </RechartsPieChart>
              </ResponsiveContainer>
              
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)', lineHeight: '1' }}>{filteredMachines.length}</div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Total Machines</div>
              </div>
            </div>
          </Link>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.65rem' }}>
            {statusSummaryBoxes.map((item, idx) => (
              <Link
                key={idx}
                to={item.link}
                style={{ 
                  textDecoration: 'none',
                  background: item.bg, 
                  border: `1px solid ${item.border}`,
                  borderRadius: '12px',
                  padding: '0.85rem 0.5rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s'
                }}
                className="hover-lift"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: item.color }}></div>
                  <span style={{ fontSize: '0.85rem', fontWeight: '700', color: item.color }}>{item.name}</span>
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 'bold', color: 'var(--text-primary)', lineHeight: 1 }}>{item.value}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Top 10 High Rated Clean Machines */}
      <TopRatedMachinesCard 
        machines={filteredMachines}
        ros={filteredROs}
        omcs={omcList}
        alerts={recentAlerts}
        maxDisplay={10}
        title="Top 10 High Rated Clean Machines"
      />

      {/* Recent Alerts Section */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              width: '40px', height: '40px', borderRadius: '10px', 
              background: activeAlertsCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: activeAlertsCount > 0 ? '#ef4444' : '#10b981'
            }}>
              <Bell size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', margin: '0 0 0.2rem 0', color: 'var(--text-primary)' }}>
                Recent Alerts
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                {activeAlertsCount > 0 ? `${activeAlertsCount} active alert${activeAlertsCount > 1 ? 's' : ''} require attention` : 'All machines operating within normal parameters'}
              </p>
            </div>
          </div>
          <Link 
            to="/alerts" 
            style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              fontSize: '0.875rem', color: '#3b82f6', fontWeight: '600', textDecoration: 'none',
              padding: '0.5rem 1rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.08)'
            }}
          >
            View All Alerts <ArrowRight size={16} />
          </Link>
        </div>

        {filteredAlerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-secondary)' }}>
            <CheckCircle size={40} color="#10b981" style={{ marginBottom: '0.75rem' }} />
            <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '1rem' }}>No Active Alerts</div>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>All machines and sensors under your ROs are reporting normal status.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Machine</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>RO Name</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Type</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Severity</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Message / Issue</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Date & Time</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.slice(0, 5).map((alert, idx) => {
                  const isWater = alert.type === 'Water';
                  const isTemp = alert.type === 'Temperature';
                  const isOdour = alert.type === 'Odour';
                  const isHumid = alert.type === 'Humidity';
                  const typeIcon = isWater ? <Droplets size={16} color="#3b82f6" /> :
                                   isTemp ? <Thermometer size={16} color="#f97316" /> :
                                   isOdour ? <Wind size={16} color="#8b5cf6" /> :
                                   isHumid ? <CloudRain size={16} color="#0ea5e9" /> :
                                   <AlertTriangle size={16} color="#ef4444" />;

                  const severityColor = (alert.severity === 'Danger' || alert.severity === 'Critical' || alert.severity === 'High') ? '#ef4444' :
                                        alert.severity === 'Medium' ? '#f59e0b' : '#3b82f6';

                  const formatAlertTime = () => {
                    if (alert.date && alert.time) return `${alert.date} ${alert.time}`;
                    const ts = alert.timestamp || alert.created_at;
                    if (!ts) return '--';
                    const d = new Date(ts);
                    if (isNaN(d.getTime())) return ts;
                    return d.toLocaleString('en-GB', { 
                      day: '2-digit', month: '2-digit', year: 'numeric', 
                      hour: '2-digit', minute: '2-digit', hour12: true 
                    }).toUpperCase();
                  };

                  return (
                    <tr key={alert.id || idx} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                        <span style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', fontSize: '0.8rem', fontWeight: '700' }}>
                          {alert.machineName || alert.machineId || 'Machine'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                        {alert.roName || 'RO Location'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: '500' }}>
                          {typeIcon}
                          <span>{alert.type}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ 
                          padding: '0.2rem 0.55rem', borderRadius: '999px', 
                          background: `${severityColor}20`, color: severityColor,
                          fontWeight: '700', fontSize: '0.75rem'
                        }}>
                          {alert.severity}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-primary)', maxWidth: '350px' }}>
                        {alert.issue}
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {formatAlertTime()}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          background: alert.status === 'Resolved' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: alert.status === 'Resolved' ? '#10b981' : '#ef4444'
                        }}>
                          {alert.status || 'Open'}
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
    </div>
  );
};

export default OMCDashboard;
