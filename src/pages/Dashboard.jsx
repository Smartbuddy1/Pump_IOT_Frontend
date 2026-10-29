import React, { useState, useEffect } from 'react';
import { 
  Building, MapPin, Cpu, Bell, Activity, Droplet, Fuel, 
  AlertTriangle, CheckCircle, TrendingUp, BarChart3, Wind, Power, ArrowRight, Users, WifiOff, Wrench,
  Droplets, Thermometer, MessageSquare
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import OMCDashboard from './OMCDashboard';
import IOCLDashboard from './IOCLDashboard';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart as RechartsPieChart, Pie, Cell
} from 'recharts';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';
import { getConsolidatedAlerts } from '../utils/alertUtils';
import TopRatedMachinesCard from '../components/TopRatedMachinesCard';

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const location = useLocation();

  const [timeRange, setTimeRange] = useState('Today');
  const [omcsCount, setOmcsCount] = useState(0);
  const [rosCount, setRosCount] = useState(0);
  const [machinesCount, setMachinesCount] = useState(0);
  const [machinesList, setMachinesList] = useState([]);
  const [rosList, setRosList] = useState([]);
  const [omcsList, setOmcsList] = useState([]);
  const [activeMachinesCount, setActiveMachinesCount] = useState(0);
  const [inactiveMachinesCount, setInactiveMachinesCount] = useState(0);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [liveTodayUsers, setLiveTodayUsers] = useState(0);
  const [todayFeedbacksCount, setTodayFeedbacksCount] = useState(0);
  const [dailyFootfallData, setDailyFootfallData] = useState([]);
  const [sensorHealthData, setSensorHealthData] = useState([
    { name: 'Water Level', value: 0 },
    { name: 'Temperature', value: 0 },
    { name: 'Humidity', value: 0 },
    { name: 'Odour', value: 0 },
  ]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  
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

        const savedOMCs = omcsRes.data?.data || omcsRes.data || [];
        const savedROs = rosRes.data?.data || rosRes.data || [];
        const savedMachines = machinesRes.data?.data || machinesRes.data || [];
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
        
        setOmcsCount(savedOMCs.length);
        setRosCount(savedROs.length);
        setMachinesCount(savedMachines.length);
        setMachinesList(savedMachines);
        setOmcsList(savedOMCs);
        setRosList(savedROs);
        setLiveTodayUsers(statsData.todayUsers ?? 0);
        if (statsData.dailyFootfall && statsData.dailyFootfall.length > 0) {
          setDailyFootfallData(statsData.dailyFootfall);
        }

        const activeCount = savedMachines.filter(m => {
          const parentRo = savedROs.find(r => String(r.id) === String(m.ro_id || m.roId));
          const isRoInactive = parentRo && String(parentRo.status || '').toLowerCase() === 'inactive';
          if (isRoInactive) return false;
          const s = String(m.status || '').trim().toUpperCase();
          return s === 'ACTIVE' || s === 'ONLINE' || s === 'RUNNING' || s === 'OPERATIONAL';
        }).length;
        setActiveMachinesCount(activeCount);
        setInactiveMachinesCount(savedMachines.length - activeCount);
        
        const unassigned = savedMachines.filter(m => !m.ro_id).length;
        setUnassignedCount(unassigned);

        if (savedMachines.length > 0) {
          let totalWater = 0;
          let totalTemp = 0;
          let totalHumidity = 0;
          let totalOdourScore = 0;
          
          savedMachines.forEach(m => {
             const cleanW = String(m.live_water || '').replace('%', '').trim().toLowerCase();
             const isLow = cleanW === 'low' || (parseInt(cleanW, 10) <= 20 && !isNaN(parseInt(cleanW, 10)));
             totalWater += isLow ? 15 : 100;
             totalTemp += parseInt(m.live_temp) || 0;
             totalHumidity += parseInt(m.live_humidity) || 0;
             
             if (m.live_odour === 'Normal') totalOdourScore += 100;
             else if (m.live_odour === 'Low') totalOdourScore += 75;
             else if (m.live_odour === 'Medium') totalOdourScore += 40;
             else if (m.live_odour === 'Danger') totalOdourScore += 10;
             else totalOdourScore += 100; // Default or parsed num
          });
          
          const count = savedMachines.length;
          setSensorHealthData([
            { name: 'Water Level', value: Math.round(totalWater / count) },
            { name: 'Temperature', value: Math.round(totalTemp / count) },
            { name: 'Humidity', value: Math.round(totalHumidity / count) },
            { name: 'Odour', value: Math.round(totalOdourScore / count) },
          ]);
        }
        
        const rawAlerts = Array.isArray(alertsRes.data?.data)
          ? alertsRes.data.data
          : (Array.isArray(alertsRes.data) ? alertsRes.data : []);

        const alertsList = getConsolidatedAlerts({
          rawAlerts,
          machines: savedMachines,
          ros: savedROs,
          omcs: savedOMCs,
          user
        });
        setRecentAlerts(alertsList);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
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
      setMachinesList(prev => (Array.isArray(prev) ? prev : []).map(m => {
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
  }, [location.key, location.pathname, socket]);

  const activeAlerts = recentAlerts.filter(a => a.status !== 'Resolved');
  const activeAlertsCount = activeAlerts.length;

  const currentMachines = machinesList;

  // Today's total users accurately retrieved live from database telemetry
  const usersToday = liveTodayUsers;

  // Fallback 7-day footfall ending TODAY if no history yet
  const chartFootfallData = dailyFootfallData.length > 0 ? dailyFootfallData : (() => {
    const baseDate = new Date();
    const fallbackList = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const dayLabel = `${monthNames[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;
      const dayName = dayNames[d.getDay()];
      const shortDay = dayName.slice(0, 3);
      fallbackList.push({
        day: dayLabel,
        fullDay: `${dayLabel} (${shortDay})`,
        users: i === 0 ? usersToday : 0
      });
    }
    return fallbackList;
  })();

  const cleanlinessScore = sensorHealthData.find(s => s.name === 'Odour')?.value || 0;

  const stats = [
    { title: 'Total OMCs', value: omcsCount.toString(), icon: Building, color: '#3b82f6', badgeText: 'Registered', badgeColor: '#10b981', badgeBg: 'rgba(16,185,129,0.15)', link: '/omc' },
    { title: 'Total ROs', value: rosCount.toString(), icon: MapPin, color: '#f59e0b', badgeText: 'Registered', badgeColor: '#10b981', badgeBg: 'rgba(16,185,129,0.15)', link: '/ro' },
    { title: 'Total Machines', value: machinesCount.toString(), icon: Cpu, color: '#8b5cf6', badgeText: 'Deployed', badgeColor: '#10b981', badgeBg: 'rgba(16,185,129,0.15)', link: '/machine' },
    { title: 'System Alerts', value: activeAlertsCount.toString(), icon: Bell, color: '#ef4444', badgeText: activeAlertsCount > 0 ? 'Active Issues' : 'All Clear', badgeColor: activeAlertsCount > 0 ? '#ef4444' : '#10b981', badgeBg: activeAlertsCount > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', link: '/alerts' },
    { title: 'Today\'s Machine Users', value: usersToday.toLocaleString(), icon: Users, color: '#0ea5e9', badgeText: 'Total Visits', badgeColor: '#10b981', badgeBg: 'rgba(16,185,129,0.15)', link: '/reports?tab=Usage Analytics&range=7days' },
    { title: 'Today Feedbacks', value: todayFeedbacksCount.toString(), icon: MessageSquare, color: '#10b981', badgeText: `${todayFeedbacksCount} Received`, badgeColor: '#10b981', badgeBg: 'rgba(16,185,129,0.15)', link: '/feedbacks' },
  ];

  const quickActions = [
    { title: 'Create OMC', desc: 'Register a new OMC profile', icon: Building, color: '#10b981', link: '/omc?action=add' },
    { title: 'Create RO', desc: 'Create a RO and assign sites', icon: MapPin, color: '#3b82f6', link: '/ro?action=add' },
    { title: 'Machines', desc: 'Link machines to active ROs', icon: Cpu, color: '#f97316', link: '/machine?action=add' },
  ];

  const offlineCount = inactiveMachinesCount;
  // Calculate machines currently having low water level (<= 20% or 'low')
  const waterLowCount = machinesList.filter(m => {
    const cleanW = String(m.live_water || m.liveWater || '').replace('%', '').trim().toLowerCase();
    const numW = parseInt(cleanW, 10);
    return cleanW === 'low' || (!isNaN(numW) && numW <= 20);
  }).length;

  // Active machines shown in emerald green, Inactive in red (matching OMC Admin dashboard)
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
      value: waterLowCount, 
      color: '#0284c7', 
      bg: 'rgba(2, 132, 199, 0.1)', 
      border: 'rgba(2, 132, 199, 0.25)', 
      link: '/alerts' 
    },
  ];

  const healthConditionData = [
    { name: 'Good', value: machinesCount > 0 ? Math.max(machinesCount - activeAlerts.length, 0) : 0, color: '#10b981' },
    { name: 'Average', value: activeAlerts.filter(a => a.severity !== 'Critical').length || 0, color: '#f59e0b' },
    { name: 'Bad', value: activeAlerts.filter(a => a.severity === 'Critical').length || 0, color: '#ef4444' }
  ];
  let recentLogs = machinesList.slice(0, 5).map(m => ({
    id: m.name,
    status: 'Fixed',
    by: 'Admin - PCB: Good',
    date: new Date().toLocaleDateString('en-GB'),
    type: 'success'
  }));

  if (recentLogs.length === 0) {
    recentLogs = [
      { id: 'System', status: 'Ready', by: 'Auto', date: new Date().toLocaleDateString('en-GB'), type: 'success' }
    ];
  }

  return (
    <div style={{ padding: '0.5rem 2rem 2rem 2rem', animation: 'fadeIn 0.5s ease-in', maxWidth: '1400px', margin: '0 auto', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Superadmin <span style={{ color: '#3b82f6' }}>Dashboard</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1.05rem', fontWeight: '400' }}>
          Hello {user?.role || 'Super Admin'}, here is your system overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
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
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 1.5rem 0' }}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
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
                Daily Users (Footfall)
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>Number of people using the toilets daily</p>
            </div>
            <Link to="/reports?tab=Usage Analytics&range=7days" style={{ fontSize: '0.875rem', color: 'var(--primary-color)', fontWeight: '500', textDecoration: 'none' }}>View All</Link>
          </div>
          <div style={{ height: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyFootfallData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
        </div>

        {/* Machine Status (Moved to Right) */}
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
            
            {/* Center Text */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)', lineHeight: '1' }}>{machinesCount}</div>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Total Machines</div>
            </div>
          </div>

          {/* Custom Summary Boxes (Active, Inactive, Water Low) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
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
        machines={machinesList}
        ros={rosList}
        omcs={omcsList}
        alerts={recentAlerts}
        maxDisplay={10}
        title="Top 10 High Rated Clean Machines"
      />

      {/* Recent System Alerts Section */}
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
                Recent System Alerts
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

        {recentAlerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-secondary)' }}>
            <CheckCircle size={40} color="#10b981" style={{ marginBottom: '0.75rem' }} />
            <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '1rem' }}>No Active Alerts</div>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>All machines and sensors are reporting normal status.</p>
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
                </tr>
              </thead>
              <tbody>
                {recentAlerts.slice(0, 5).map((alert, idx) => {
                  const isWater = alert.type === 'Water';
                  const isTemp = alert.type === 'Temperature';
                  const isOdour = alert.type === 'Odour';
                  const typeIcon = isWater ? <Droplets size={16} color="#3b82f6" /> :
                                   isTemp ? <Thermometer size={16} color="#f97316" /> :
                                   isOdour ? <Wind size={16} color="#8b5cf6" /> :
                                   <AlertTriangle size={16} color="#ef4444" />;

                  const severityColor = alert.severity === 'Critical' || alert.severity === 'High' ? '#ef4444' :
                                        alert.severity === 'Medium' ? '#f59e0b' : '#3b82f6';

                  const formatAlertTime = (timestamp) => {
                    if (!timestamp) return '--';
                    const d = new Date(timestamp);
                    if (isNaN(d.getTime())) return timestamp;
                    return d.toLocaleString('en-GB', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      year: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit', 
                      hour12: true 
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
                        {alert.roName || 'Unassigned'}
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
                        {formatAlertTime(alert.timestamp)}
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

const Dashboard = () => {
  const { user } = useAuth();
  const role = String(user?.role || '').toLowerCase();

  if (role.includes('omc')) {
    return <OMCDashboard />;
  }

  if (role.includes('ro') || role.includes('iocl')) {
    return <IOCLDashboard />;
  }

  return <SuperAdminDashboard />;
};

export default Dashboard;
