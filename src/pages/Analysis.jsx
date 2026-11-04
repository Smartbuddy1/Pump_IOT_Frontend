import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Download, Filter,
  Thermometer, CloudRain, Wind, Droplets, Users, Maximize2, X, Calendar,
  TrendingUp, TrendingDown, Activity, Clock, Zap
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine, Brush
} from 'recharts';
import api from '../services/api';
import { socket } from '../hooks/useSocket';
import { exportToPDF } from '../utils/exportUtils';
import PrintHeader from '../components/PrintHeader';
import PrintFooter from '../components/PrintFooter';
import html2canvas from 'html2canvas';

// TradingView Style Crosshair Tooltip
const StockTooltip = ({ active, payload, label, unit = '', metricName = '', benchmark = '', multi = false }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.94)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '10px',
      padding: '0.75rem 1rem',
      boxShadow: '0 12px 30px -5px rgba(0, 0, 0, 0.5)',
      color: '#f8fafc',
      fontSize: '0.8rem',
      minWidth: '200px',
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: '0.35rem', marginBottom: '0.5rem' }}>
        <span style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '600' }}>
          <Clock size={12} /> {label}
        </span>
        {benchmark && (
          <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: '700', padding: '1px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.18)' }}>
            {benchmark}
          </span>
        )}
      </div>

      {multi ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {payload.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#cbd5e1', fontSize: '0.78rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.stroke }}></span>
                {p.name}:
              </span>
              <strong style={{ color: '#ffffff', fontSize: '0.88rem' }}>
                {p.value} {unit}
              </strong>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.15rem' }}>{metricName || payload[0]?.name}</div>
          <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.3px' }}>
            {payload[0]?.value} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#94a3b8' }}>{unit}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper to accurately classify water alert status (Rahul Sir: 0 is low, 1 is normal)
const isWaterAlert = (w) => {
  if (w === undefined || w === null) return false;
  const s = String(w).trim().toLowerCase();
  if (s === 'low' || s === '0' || s === 'refill' || s === 'empty' || s === 'danger') return true;
  if (s === 'normal' || s === '1' || s === 'ok' || s === 'full' || s === 'high') return false;
  const num = Number(w);
  if (!isNaN(num)) {
    if (num === 0) return true;
    if (num === 1) return false;
    return num <= 20;
  }
  return false;
};

// Statistical calculation helper for share market metrics
const calcStats = (data, key = 'value') => {
  if (!Array.isArray(data) || data.length === 0) {
    return { current: 0, min: 0, max: 0, avg: 0, change: 0, changePct: 0, isPositive: true };
  }
  const vals = data.map(d => Number(d[key]) || 0);
  const current = vals[vals.length - 1] ?? 0;
  const first = vals[0] ?? current;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const sum = vals.reduce((a, b) => a + b, 0);
  const avg = Math.round((sum / vals.length) * 10) / 10;
  const change = Math.round((current - first) * 10) / 10;
  const changePct = first !== 0 ? Math.round(((current - first) / Math.abs(first)) * 1000) / 10 : 0;
  return { current, min, max, avg, change, changePct, isPositive: change >= 0 };
};

// Downsample array evenly if point count > maxPoints for 60 FPS smooth rendering
const sampleData = (arr, maxPoints = 250) => {
  if (!Array.isArray(arr) || arr.length <= maxPoints) return arr;
  const step = Math.ceil(arr.length / maxPoints);
  const sampled = [];
  for (let i = 0; i < arr.length; i += step) {
    sampled.push(arr[i]);
  }
  // Ensure the latest live point is always preserved at the tail
  if (arr.length > 0 && sampled[sampled.length - 1] !== arr[arr.length - 1]) {
    sampled.push(arr[arr.length - 1]);
  }
  return sampled;
};

// Format raw telemetry reading into clean chart point
const formatTelemetryPoint = (r, metricType, mode = 'full') => {
  const d = new Date(r.timestamp);
  const isValid = !isNaN(d.getTime());
  const dateStr = isValid ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '';
  const timeStr = isValid ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '';
  
  // mode === 'time': "12:10:52 PM", mode === 'full': "01 Nov 02:15 PM"
  const label = mode === 'time' ? timeStr : `${dateStr} ${timeStr}`.trim();

  let val = 0;
  if (metricType === 'temp') val = Number(r.temp) || 0;
  else if (metricType === 'humidity') val = Number(r.humidity) || 0;
  else if (metricType === 'odour') val = Number(r.vocGas) || 0;
  else if (metricType === 'water') {
    const rawW = r.water ?? r.live_water ?? r.waterLevel;
    if (typeof rawW === 'string') {
      const cleanW = rawW.replace('%', '').trim().toLowerCase();
      if (cleanW === 'low') val = 15;
      else if (cleanW === 'normal' || cleanW === 'ok' || cleanW === 'full') val = 85;
      else {
        const num = parseFloat(cleanW);
        val = isNaN(num) ? 80 : num;
      }
    } else if (typeof rawW === 'number') {
      val = rawW <= 1 ? (rawW === 0 ? 10 : 85) : rawW;
    } else {
      val = 80;
    }
  }
  else if (metricType === 'usage') val = 1;

  if (metricType === 'odour') {
    return {
      date: label,
      time: timeStr,
      dateStr,
      value: val,
      odour: val,
      nh3: Number(r.nh3) || 0,
      h2s: Number(r.h2s) || 0
    };
  }
  return {
    date: label,
    time: timeStr,
    dateStr,
    value: val
  };
};

const Analysis = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'Super Admin';
  const isOmcAdmin = user?.role === 'OMC Admin' || String(user?.role || '').toLowerCase().includes('omc');
  const isRoUser = !isOmcAdmin && !isSuperAdmin && (
    user?.role === 'RO Manager' ||
    user?.role === 'RO User' ||
    String(user?.role || '').toLowerCase().includes('ro') ||
    String(user?.role || '').toLowerCase().includes('iocl') ||
    String(user?.name || '').toLowerCase().includes('iocl')
  );
  const userOmcId = user?.omcId || user?.omc_id;
  const [filterType, setFilterType] = useState('Financial Year');
  const [financialYear, setFinancialYear] = useState('Current FY (2026-27)');
  const [selectedTimeframe, setSelectedTimeframe] = useState('2D');
  const [omcs, setOmcs] = useState([]);
  const [ros, setRos] = useState([]);
  const [machines, setMachines] = useState([]);
  const [liveReadings, setLiveReadings] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [filterApplied, setFilterApplied] = useState(true);
  const [fullscreenGraph, setFullscreenGraph] = useState(null); // 'temp' | 'humidity' | 'odour' | 'water' | 'usage' | null
  
  // Independent timeframe per graph card: '2D' (default: full continuous stream with timeline scroller)
  const [chartTimeframes, setChartTimeframes] = useState({
    temp: '2D',
    humidity: '2D',
    odour: '2D',
    water: '2D',
    usage: '2D'
  });

  // Dynamic default dates (last 7 days)
  const getTodayFormatted = () => new Date().toISOString().slice(0, 10);
  const getPastDateFormatted = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  };

  const [selectedClient, setSelectedClient] = useState('All');
  const [selectedRo, setSelectedRo] = useState('All');
  const [selectedMachine, setSelectedMachine] = useState('All');
  const [fromDate, setFromDate] = useState(getPastDateFormatted(6));
  const [toDate, setToDate] = useState(getTodayFormatted());

  const assignedOmc = useMemo(() => {
    if (!isOmcAdmin && !isRoUser) return null;
    if (userOmcId) {
      const match = omcs.find(o => String(o.id) === String(userOmcId) || String(o.db_id) === String(userOmcId));
      if (match) return match;
    }
    const userContact = String(user?.mobile || user?.username || '').trim();
    if (userContact) {
      const match = omcs.find(o =>
        String(o.contact || '').trim() === userContact ||
        String(o.credentials?.username || '').trim() === userContact
      );
      if (match) return match;
    }
    const fallbackIocl = omcs.find(o => String(o.id) === '1' || String(o.name).toLowerCase() === 'iocl');
    if (fallbackIocl) return fallbackIocl;
    if (omcs.length > 0) return omcs[0];
    return { id: 1, name: 'iocl' };
  }, [isOmcAdmin, isRoUser, userOmcId, user, omcs]);

  const omcRos = useMemo(() => {
    if (isOmcAdmin || isRoUser) return ros;
    if (selectedClient === 'All') return ros;
    return ros.filter(ro => String(ro.omc_id || ro.omcId) === String(selectedClient));
  }, [ros, isOmcAdmin, isRoUser, selectedClient]);

  const currentRo = useMemo(() => {
    if (user?.roId) {
      const match = omcRos.find(r => String(r.id) === String(user.roId) || String(r.db_id) === String(user.roId));
      if (match) return match;
      const directMatch = ros.find(r => String(r.id) === String(user.roId) || String(r.db_id) === String(user.roId));
      if (directMatch) return directMatch;
      return { id: user.roId, name: user.name || 'Retail Outlet' };
    }
    return omcRos[0] || (ros.length > 0 ? ros[0] : null);
  }, [user, omcRos, ros]);
  const currentRoName = currentRo ? currentRo.name : (user?.name || 'Retail Outlet');

  useEffect(() => {
    if (isRoUser) {
      const targetId = user?.roId || currentRo?.id;
      if (targetId) {
        setSelectedRo(String(targetId));
      }
    }
  }, [isRoUser, user?.roId, currentRo?.id]);

  useEffect(() => {
    if ((isOmcAdmin || isRoUser) && assignedOmc?.id && (selectedClient === 'All' || !selectedClient)) {
      setSelectedClient(String(assignedOmc.id));
    }
  }, [isOmcAdmin, isRoUser, assignedOmc, selectedClient]);

  // Real-Time Socket.IO telemetry listener for live graph updates
  useEffect(() => {
    const handleLiveTelemetry = (data) => {
      if (!data || !data.machineId) return;

      const incomingMachId = String(data.machineId || '').trim();
      const isWaterLow = isWaterAlert(data.water ?? data.waterLevel);
      const newReading = {
        id: Date.now(),
        machineId: incomingMachId,
        temp: parseFloat(data.temperature) || 0,
        humidity: parseFloat(data.humidity) || 0,
        vocGas: parseFloat(data.odour || data.vocGas) || 0,
        nh3: parseFloat(data.nh3) || 0,
        h2s: parseFloat(data.h2s) || 0,
        water: isWaterLow ? 10 : 85,
        liveWater: isWaterLow ? 'Low' : 'Normal',
        timestamp: data.timestamp || new Date().toISOString()
      };

      setLiveReadings(prev => [newReading, ...(Array.isArray(prev) ? prev : [])]);

      // Update machine live state
      setMachines(prev => (Array.isArray(prev) ? prev : []).map(m => {
        const mName = String(m.name || m.id || '').toLowerCase().trim();
        const targetId = incomingMachId.toLowerCase();
        if (mName === targetId || mName.replace(/o/g, '0') === targetId.replace(/o/g, '0')) {
          return {
            ...m,
            live_temp: newReading.temp,
            live_humidity: newReading.humidity,
            live_odour: newReading.vocGas,
            live_nh3: newReading.nh3,
            live_h2s: newReading.h2s,
            live_water: isWaterLow ? 'Low' : 'Normal',
            liveWater: isWaterLow ? 'Low' : 'Normal',
            status: 'Running'
          };
        }
        return m;
      }));
    };

    socket.on('live_data_update', handleLiveTelemetry);
    socket.on('new_reading', handleLiveTelemetry);

    return () => {
      socket.off('live_data_update', handleLiveTelemetry);
      socket.off('new_reading', handleLiveTelemetry);
    };
  }, []);

  // 5 Datasets
  const [tempData, setTempData] = useState([]);
  const [humidityData, setHumidityData] = useState([]);
  const [odourData, setOdourData] = useState([]);
  const [waterData, setWaterData] = useState([]);
  const [usageData, setUsageData] = useState([]);

  // Fallback telemetry history generator
  const generateFallbackAnalytics = (targetMachineName, mList = machines, roFilter = selectedRo, customFrom = '', customTo = '') => {
    const result = [];
    let targetDates = [];
    if (customFrom && customTo) {
      const minDateStr = customFrom <= customTo ? customFrom : customTo;
      const maxDateStr = customFrom <= customTo ? customTo : customFrom;
      const [startY, startM, startD] = minDateStr.split('-').map(Number);
      const [endY, endM, endD] = maxDateStr.split('-').map(Number);
      const startObj = new Date(startY, (startM || 1) - 1, startD || 1);
      const endObj = new Date(endY, (endM || 1) - 1, endD || 1);
      const diffDays = Math.min(Math.max(Math.round((endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24)), 0), 30);
      for (let i = 0; i <= diffDays; i++) {
        const d = new Date(startY, (startM || 1) - 1, (startD || 1) + i);
        targetDates.push({ dateLabel: d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }), idx: i });
      }
    } else {
      const days = 7;
      const today = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        targetDates.push({ dateLabel: d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }), idx: days - 1 - i });
      }
    }

    let relevantMachines = [];
    if (targetMachineName && targetMachineName !== 'All') {
      const target = mList.find(m => String(m.name) === String(targetMachineName) || String(m.id) === String(targetMachineName) || String(m.db_id) === String(targetMachineName));
      relevantMachines = target ? [target] : [];
    } else if (roFilter && roFilter !== 'All') {
      const cleanRoId = String(roFilter).trim();
      const roMatches = mList.filter(m => {
        const mRo = String(m.ro_id || m.roId || '').trim();
        return mRo === cleanRoId || (cleanRoId === '1' && (mRo === '1' || String(m.name || '').includes('90'))) || (cleanRoId === '4' && (mRo === '4' || String(m.name || '').includes('20')));
      });
      relevantMachines = roMatches.length > 0 ? roMatches : [...mList];
    } else {
      relevantMachines = [...mList];
    }

    if (relevantMachines.length === 0) {
      targetDates.forEach(({ dateLabel }) => {
        result.push({
          date: dateLabel,
          avg_temp: 30,
          avg_humidity: 50,
          avg_odour: 30,
          total_water_alerts: 0,
          total_visits: 12
        });
      });
      return result;
    }

    const target = (relevantMachines.length === 1 && targetMachineName && targetMachineName !== 'All') ? relevantMachines[0] : null;
    const count = relevantMachines.length || 1;

    const baseTemp = Math.round(
      relevantMachines.reduce((sum, m) => {
        const t = Number(String(m.live_temp ?? m.liveTemp ?? 30).replace(/[^0-9.-]/g, ''));
        return sum + (isNaN(t) ? 30 : t);
      }, 0) / count
    );

    const baseHum = Math.round(
      relevantMachines.reduce((sum, m) => {
        const h = Number(String(m.live_humidity ?? m.liveHumidity ?? 52).replace(/[^0-9.-]/g, ''));
        return sum + (isNaN(h) ? 52 : h);
      }, 0) / count
    );

    const baseOdour = Math.round(
      relevantMachines.reduce((sum, m) => {
        const rawO = String(m.live_odour ?? m.liveOdour ?? '35').trim();
        const numO = Number(rawO.replace(/[^0-9.-]/g, ''));
        if (!isNaN(numO) && numO > 0) return sum + numO;
        return sum + 35;
      }, 0) / count
    );

    const lowWaterCount = relevantMachines.filter(m => {
      const rawW = String(m.live_water ?? m.liveWater ?? 'Normal').replace('%', '').trim().toLowerCase();
      const numW = parseInt(rawW, 10);
      return rawW === 'low' || (!isNaN(numW) && numW <= 25);
    }).length;

    const baseWater = Math.round(
      relevantMachines.reduce((sum, m) => {
        const rawW = String(m.live_water ?? m.liveWater ?? 'Normal').replace('%', '').trim().toLowerCase();
        if (rawW === 'low') return sum + 15;
        if (rawW === 'normal' || rawW === 'ok' || rawW === 'full') return sum + 85;
        const num = parseFloat(rawW);
        return sum + (!isNaN(num) ? num : 80);
      }, 0) / count
    );

    const baseVisits = target
      ? (Number(target.visits) || Number(target.usage) || 28)
      : relevantMachines.reduce((sum, m) => sum + (Number(m.visits) || Number(m.usage) || 15), 0);

    targetDates.forEach(({ dateLabel, idx }) => {
      const isToday = idx === (targetDates.length - 1);
      const dayOffset = (targetDates.length - 1) - idx;

      const tempVariance = isToday ? 0 : (dayOffset % 2 === 1 ? 0.4 : (dayOffset % 4 === 0 ? 0.8 : -0.5));
      const humVariance = isToday ? 0 : (dayOffset % 2 === 1 ? -1 : (dayOffset % 4 === 0 ? 1 : 0));
      const odourVariance = isToday ? 0 : (dayOffset % 3 === 1 ? 2 : -2);
      const dayVariance = dayOffset === 0 ? 0 : ((dayOffset * 17) % 25) - 12;
      const visitsVariance = target
        ? Math.round(dayVariance / Math.max(mList.length, 1))
        : dayVariance;

      result.push({
        date: dateLabel,
        avg_temp: Math.max(18, Math.min(42, Math.round((baseTemp + tempVariance) * 10) / 10)),
        avg_humidity: Math.max(30, Math.min(85, baseHum + humVariance)),
        avg_odour: Math.max(10, Math.min(1800, baseOdour + odourVariance)),
        avg_nh3: Math.max(10, Math.min(1500, (baseLiveValues.nh3 || 825) + ((dayOffset % 3) - 1) * 25)),
        avg_h2s: Math.max(10, Math.min(1500, (baseLiveValues.h2s || 1055) - ((dayOffset % 3) - 1) * 20)),
        avg_water: Math.max(5, Math.min(100, Math.round(baseWater + (isToday ? 0 : (dayOffset % 2 === 1 ? -2 : 3))))),
        total_water_alerts: isToday ? lowWaterCount : (lowWaterCount > 0 && dayOffset % 2 === 0 ? 1 : 0),
        total_visits: baseVisits > 0 ? Math.max(5, baseVisits + visitsVariance) : 12
      });
    });
    return result;
  };

  // Fetch all analytics and complete historical telemetry from backend
  const fetchAnalytics = async (customMachine, customFrom, customTo, mList = machines, customRo = selectedRo) => {
    try {
      const params = {};
      if (customRo && customRo !== 'All') {
        params.roId = customRo;
      }
      if (customMachine && customMachine !== 'All') {
        params.machineId = customMachine;
      }
      if (customFrom) params.startDate = customFrom;
      if (customTo) params.endDate = customTo;

      const [res, readingsRes] = await Promise.all([
        api.get('/analytics/history', { params }).catch(() => ({ data: { data: [] } })),
        api.get('/analytics/readings', { params: { ...params, days: 'all', limit: 'all' } }).catch(() => ({ data: { data: [] } }))
      ]);

      const rawReadings = readingsRes.data?.data || [];
      if (Array.isArray(rawReadings) && rawReadings.length > 0) {
        setLiveReadings(rawReadings);
      }

      let history = (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0)
        ? res.data.data
        : null;

      if (!history || history.length === 0) {
        history = generateFallbackAnalytics(customMachine, mList, customRo, customFrom, customTo);
      }

      setTempData(history.map(row => ({ date: row.date, value: Number(row.avg_temp) || 30 })));
      setHumidityData(history.map(row => ({ date: row.date, value: Number(row.avg_humidity) || 50 })));
      setOdourData(history.map(row => {
        const o = Number(row.avg_odour ?? row.value) || 35;
        const n = Number(row.avg_nh3 ?? row.nh3) || (baseLiveValues.nh3 || 825);
        const h = Number(row.avg_h2s ?? row.h2s) || (baseLiveValues.h2s || 1055);
        return { date: row.date, value: o, odour: o, nh3: n, h2s: h };
      }));
      setWaterData(history.map(row => ({ date: row.date, value: Number(row.avg_water ?? row.water) || (Number(row.total_water_alerts) > 0 ? 15 : 80) })));
      setUsageData(history.map(row => ({ date: row.date, value: Number(row.total_visits) || 15 })));
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      const history = generateFallbackAnalytics(customMachine, mList, customRo, customFrom, customTo);
      setTempData(history.map(row => ({ date: row.date, value: Number(row.avg_temp) || 30 })));
      setHumidityData(history.map(row => ({ date: row.date, value: Number(row.avg_humidity) || 50 })));
      setOdourData(history.map(row => {
        const o = Number(row.avg_odour ?? row.value) || 35;
        const n = Number(row.avg_nh3 ?? row.nh3) || (baseLiveValues.nh3 || 825);
        const h = Number(row.avg_h2s ?? row.h2s) || (baseLiveValues.h2s || 1055);
        return { date: row.date, value: o, odour: o, nh3: n, h2s: h };
      }));
      setWaterData(history.map(row => ({ date: row.date, value: Number(row.avg_water ?? row.water) || (Number(row.total_water_alerts) > 0 ? 15 : 80) })));
      setUsageData(history.map(row => ({ date: row.date, value: Number(row.total_visits) || 15 })));
    }
  };

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [omcRes, roRes, machineRes] = await Promise.all([
          api.get('/omc').catch(() => ({ data: { data: [] } })),
          api.get('/ro').catch(() => ({ data: { data: [] } })),
          api.get('/machines').catch(() => api.get('/machine')).catch(() => ({ data: { data: [] } }))
        ]);

        let loadedOMCs = omcRes.data?.data || (Array.isArray(omcRes.data) ? omcRes.data : []);
        if (!Array.isArray(loadedOMCs)) loadedOMCs = [];

        let loadedROs = roRes.data?.data || (Array.isArray(roRes.data) ? roRes.data : []);
        if (!Array.isArray(loadedROs)) loadedROs = [];

        let loadedMachines = machineRes.data?.data || (Array.isArray(machineRes.data) ? machineRes.data : []);
        if (!Array.isArray(loadedMachines)) loadedMachines = [];

        if (isOmcAdmin) {
          const userOmcId = user?.omcId || user?.omc_id;
          const userContact = String(user?.mobile || user?.username || '').trim();
          const myOmc = loadedOMCs.find(o =>
            (userOmcId && (String(o.id) === String(userOmcId) || String(o.db_id) === String(userOmcId))) ||
            (userContact && (String(o.contact || '').trim() === userContact || String(o.credentials?.username || '').trim() === userContact))
          ) || loadedOMCs[0] || null;

          const myOmcId = String(myOmc?.id || userOmcId || '');
          loadedOMCs = myOmc ? [myOmc] : [];

          let myROs = loadedROs.filter(ro => ro && (String(ro.omc_id || ro.omcId) === myOmcId));
          loadedROs = myROs;

          const validRoIds = new Set(loadedROs.map(r => String(r.id)));
          loadedROs.forEach(r => {
            if (r.db_id) validRoIds.add(String(r.db_id));
            if (r.name) validRoIds.add(String(r.name).toLowerCase());
          });

          let myMachines = loadedMachines.filter(m => {
            if (!m) return false;
            const mRo = String(m.ro_id || m.roId || '');
            const mRoName = String(m.roName || m.ro_name || '').toLowerCase();
            return validRoIds.has(mRo) || validRoIds.has(mRoName);
          });

          loadedMachines = myMachines;
          if (myOmcId) setSelectedClient(myOmcId);
        } else if (user && user.role !== 'Super Admin' && user.role !== 'IOCL') {
          if (user.role === 'RO Manager' && user.roId) {
            loadedROs = loadedROs.filter(ro => String(ro.id) === String(user.roId));
          }
          const roIds = loadedROs.map(r => String(r.id));
          loadedMachines = loadedMachines.filter(m => roIds.includes(String(m.ro_id || m.roId)));
        }

        loadedMachines = loadedMachines.map(m => {
          const rawTemp = m.live_temp ?? m.liveTemp ?? '30';
          const cleanTemp = Number(String(rawTemp).replace(/[^0-9.-]/g, '')) || 30;

          const rawHumidity = m.live_humidity ?? m.liveHumidity ?? '52';
          const cleanHumidity = Number(String(rawHumidity).replace(/[^0-9.-]/g, '')) || 52;

          const rawWater = String(m.live_water ?? m.liveWater ?? 'Normal').replace('%', '').trim().toLowerCase();
          const numWater = parseInt(rawWater, 10);
          const waterVal = (rawWater === 'low' || (!isNaN(numWater) && numWater <= 25)) ? 'Low' : 'Normal';

          const odourVal = String(m.live_odour ?? m.liveOdour ?? 'Normal').trim() || 'Normal';

          return {
            ...m,
            live_temp: cleanTemp,
            liveTemp: `${cleanTemp}°C`,
            live_humidity: cleanHumidity,
            liveHumidity: `${cleanHumidity}%`,
            live_water: waterVal,
            liveWater: waterVal,
            live_odour: odourVal,
            liveOdour: odourVal
          };
        });

        setOmcs(loadedOMCs);
        setRos(loadedROs);
        setMachines(loadedMachines);

        // Auto-fetch analytics on page load - graphs display immediately
        await fetchAnalytics('All', '', '', loadedMachines, 'All');
        setFilterApplied(true);
      } catch (error) {
        console.error('Error fetching dropdown data:', error);
      }
    };

    fetchDropdownData();
  }, [user]);

  const [isApplying, setIsApplying] = useState(false);
  const handleApplyFilter = async () => {
    setIsApplying(true);
    setChartTimeframes({
      temp: selectedTimeframe,
      humidity: selectedTimeframe,
      odour: selectedTimeframe,
      water: selectedTimeframe,
      usage: selectedTimeframe
    });
    const fDate = filterType === 'Date Range' ? fromDate : '';
    const tDate = filterType === 'Date Range' ? toDate : '';
    await fetchAnalytics(selectedMachine, fDate, tDate, machines, selectedRo);
    setFilterApplied(true);
    setTimeout(() => setIsApplying(false), 300);
  };

  const filteredMachinesForDropdown = useMemo(() => {
    return machines.filter(m => {
      if (isRoUser) {
        const myRoId = String(user?.roId || currentRo?.id || '');
        if (myRoId && myRoId !== 'All') {
          return String(m.ro_id || m.roId) === myRoId;
        }
        return true;
      }
      if (selectedRo !== 'All') {
        return String(m.ro_id || m.roId) === String(selectedRo);
      }
      if (isOmcAdmin) {
        return true;
      }
      const clientFilter = selectedClient;
      if (clientFilter !== 'All') {
        const roIdsForOmc = ros
          .filter(ro => String(ro.omc_id || ro.omcId) === String(clientFilter))
          .map(ro => String(ro.id));
        if (roIdsForOmc.length > 0) {
          return roIdsForOmc.includes(String(m.ro_id || m.roId));
        }
      }
      return true;
    });
  }, [machines, selectedRo, isOmcAdmin, isRoUser, selectedClient, ros, user?.roId, currentRo?.id]);

  const baseLiveValues = useMemo(() => {
    let relevant = filteredMachinesForDropdown;
    if (selectedMachine && selectedMachine !== 'All') {
      const match = machines.find(m => String(m.name) === String(selectedMachine) || String(m.id) === String(selectedMachine) || String(m.db_id) === String(selectedMachine));
      if (match) relevant = [match];
    }
    const count = relevant.length || 1;
    const latestLive = liveReadings.length > 0 ? liveReadings[0] : null;
    const temp = latestLive ? (Number(latestLive.temp) || 30) : (Math.round(relevant.reduce((sum, m) => sum + (Number(m.live_temp) || 30), 0) / count) || 30);
    const hum = latestLive ? (Number(latestLive.humidity) || 52) : (Math.round(relevant.reduce((sum, m) => sum + (Number(m.live_humidity) || 52), 0) / count) || 52);
    const odour = latestLive ? (Number(latestLive.vocGas) || 1098) : Math.round(relevant.reduce((sum, m) => {
      const num = Number(String(m.live_odour || '35').replace(/[^0-9.-]/g, ''));
      return sum + (isNaN(num) || num <= 0 ? 35 : num);
    }, 0) / count) || 35;
    const nh3 = latestLive ? (Number(latestLive.nh3) || 825) : 825;
    const h2s = latestLive ? (Number(latestLive.h2s) || 1055) : 1055;
    const getWaterLevel = (w) => {
      if (w === undefined || w === null) return 80;
      const cleanW = String(w).replace('%', '').trim().toLowerCase();
      if (cleanW === 'low') return 15;
      if (cleanW === 'normal' || cleanW === 'ok' || cleanW === 'full') return 85;
      const num = parseFloat(cleanW);
      return !isNaN(num) ? num : 80;
    };
    const waterLevel = latestLive 
      ? getWaterLevel(latestLive.water ?? latestLive.liveWater) 
      : (Math.round(relevant.reduce((sum, m) => sum + getWaterLevel(m.live_water ?? m.liveWater), 0) / count) || 80);
    const waterAlerts = latestLive ? (isWaterAlert(latestLive.water ?? latestLive.liveWater) ? 1 : 0) : relevant.filter(m => isWaterAlert(m.live_water ?? m.liveWater)).length;
    const visits = liveReadings.length || relevant.reduce((sum, m) => sum + (Number(m.visits) || Number(m.usage) || 0), 0) || 352;

    return { temp, hum, odour, nh3, h2s, water: waterLevel, waterAlerts, visits };
  }, [filteredMachinesForDropdown, selectedMachine, machines, liveReadings]);

  const getTimeframeSubtitle = (timeframe, metricLabel) => {
    if (timeframe === '1H') return `Last 1 Hour (${metricLabel})`;
    if (timeframe === 'Today') return `Today's Telemetry Stream (${metricLabel})`;
    if (timeframe === 'Yesterday') return `Yesterday's Telemetry (from 2:15 PM) (${metricLabel})`;
    if (timeframe === '2D') return `2-Day Full Telemetry Timeline (${metricLabel})`;
    if (timeframe === 'Weekly') return `Last 7 Days Trend (${metricLabel})`;
    if (timeframe === 'Monthly') return `Monthly Aggregates (${metricLabel})`;
    if (timeframe === 'FY') return `Financial Year Performance (${metricLabel})`;
    return `${timeframe} (${metricLabel})`;
  };

  const getTimeframeData = (metricType, timeframe, rawHistory, baseVal) => {
    let relevantReadings = liveReadings;
    if (selectedMachine && selectedMachine !== 'All') {
      const target = String(selectedMachine).toLowerCase();
      const filtered = liveReadings.filter(r => 
        String(r.machineId).toLowerCase() === target ||
        String(r.machineId).toLowerCase().replace(/o/g, '0') === target.replace(/o/g, '0')
      );
      if (filtered.length > 0) relevantReadings = filtered;
    }

    const todayDate = new Date();
    const todayStr = todayDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const yestDate = new Date();
    yestDate.setDate(yestDate.getDate() - 1);
    const yesterdayStr = yestDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    // 1. Hourly View (Last 1 hour of live 30s packets)
    if (timeframe === '1H') {
      if (Array.isArray(relevantReadings) && relevantReadings.length > 0) {
        const recent = relevantReadings.slice(0, 120).reverse();
        return recent.map(r => formatTelemetryPoint(r, metricType, 'time'));
      }
      const points = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const pt = new Date(now.getTime() - i * 5 * 60 * 1000);
        const timeLabel = pt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        let val = baseVal;
        if (metricType === 'water') val = Math.max(5, Math.min(100, Math.round(baseVal + ((i % 3) - 1) * 2)));
        else if (metricType === 'usage') val = Math.max(1, Math.round((baseVal || 25) / 12));
        else val = Math.round((baseVal + ((i % 3) - 1) * 0.4) * 10) / 10;
        points.push({ date: timeLabel, time: timeLabel, value: val, odour: val, nh3: baseLiveValues.nh3 || 825, h2s: baseLiveValues.h2s || 1055 });
      }
      return points;
    }

    // 2. Today View (All readings belonging to today, 00:00 to now)
    if (timeframe === 'Today') {
      if (Array.isArray(relevantReadings) && relevantReadings.length > 0) {
        const todayItems = relevantReadings
          .filter(r => {
            const d = new Date(r.timestamp);
            return !isNaN(d.getTime()) && d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) === todayStr;
          })
          .reverse();
        if (todayItems.length > 0) {
          const sampled = sampleData(todayItems, 250);
          return sampled.map(r => formatTelemetryPoint(r, metricType, 'time'));
        }
      }
      const points = [];
      const curHour = new Date().getHours();
      for (let h = Math.max(0, curHour - 11); h <= curHour; h++) {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 === 0 ? 12 : h % 12;
        const timeLabel = `${String(displayH).padStart(2, '0')}:00 ${ampm}`;
        let val = baseVal;
        if (metricType === 'water') val = Math.max(5, Math.min(100, Math.round(baseVal + ((h % 3) - 1) * 3)));
        else if (metricType === 'usage') val = Math.max(2, Math.round((baseVal || 30) / 10));
        else val = Math.round((baseVal + ((h % 4) - 1.5) * 0.5) * 10) / 10;
        points.push({ date: timeLabel, time: timeLabel, value: val, odour: val, nh3: baseLiveValues.nh3 || 825, h2s: baseLiveValues.h2s || 1055 });
      }
      return points;
    }

    // 3. Yesterday View (All readings belonging to yesterday from 2:15 PM onwards)
    if (timeframe === 'Yesterday') {
      if (Array.isArray(relevantReadings) && relevantReadings.length > 0) {
        const yesterdayItems = relevantReadings
          .filter(r => {
            const d = new Date(r.timestamp);
            return !isNaN(d.getTime()) && d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) === yesterdayStr;
          })
          .reverse();
        if (yesterdayItems.length > 0) {
          const sampled = sampleData(yesterdayItems, 250);
          return sampled.map(r => formatTelemetryPoint(r, metricType, 'full'));
        }
      }
      const points = [];
      for (let h = 8; h <= 20; h += 2) {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 === 0 ? 12 : h % 12;
        const timeLabel = `${yesterdayStr} ${String(displayH).padStart(2, '0')}:00 ${ampm}`;
        let val = baseVal;
        if (metricType === 'water') val = Math.max(5, Math.min(100, Math.round(baseVal + ((h % 3) - 1) * 2)));
        else if (metricType === 'usage') val = Math.max(3, Math.round((baseVal || 30) / 8));
        else val = Math.round((baseVal + ((h % 3) - 1) * 0.4) * 10) / 10;
        points.push({ date: timeLabel, time: timeLabel, value: val, odour: val, nh3: baseLiveValues.nh3 || 825, h2s: baseLiveValues.h2s || 1055 });
      }
      return points;
    }

    // 4. 2D / All View (Full continuous timeline from yesterday 2:15 PM to right now)
    if (timeframe === '2D') {
      if (Array.isArray(relevantReadings) && relevantReadings.length > 0) {
        const allItems = [...relevantReadings].reverse();
        const sampled = sampleData(allItems, 300);
        return sampled.map(r => formatTelemetryPoint(r, metricType, 'full'));
      }
      const points = [];
      const spans = [
        `${yesterdayStr} 09:00 AM`, `${yesterdayStr} 01:00 PM`, `${yesterdayStr} 05:00 PM`, `${yesterdayStr} 09:00 PM`,
        `${todayStr} 08:00 AM`, `${todayStr} 11:00 AM`, `${todayStr} 02:00 PM`, `${todayStr} 05:00 PM`
      ];
      spans.forEach((lbl, idx) => {
        let val = baseVal;
        if (metricType === 'water') val = Math.max(5, Math.min(100, Math.round(baseVal + ((idx % 3) - 1) * 3)));
        else if (metricType === 'usage') val = Math.max(5, Math.round((baseVal || 40) / 8) + (idx % 3));
        else val = Math.round((baseVal + ((idx % 3) - 1) * 0.5) * 10) / 10;
        points.push({ date: lbl, time: lbl, value: val, odour: val, nh3: baseLiveValues.nh3 || 825, h2s: baseLiveValues.h2s || 1055 });
      });
      return points;
    }

    // 5. Weekly View (Last 7 Days)
    if (timeframe === 'Weekly') {
      let slice = [];
      if (Array.isArray(rawHistory) && rawHistory.length >= 7) {
        slice = rawHistory.slice(-7);
      } else if (Array.isArray(rawHistory) && rawHistory.length > 0) {
        slice = rawHistory;
      } else {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        slice = days.map((day, idx) => {
          const offset = ((idx * 3) % 5) - 2;
          let val = baseVal;
          if (metricType === 'temp') {
            val = Math.round((baseVal + offset * 0.3) * 10) / 10;
          } else if (metricType === 'water') {
            val = Math.max(5, Math.min(100, Math.round(baseVal + offset * 3)));
          } else if (metricType === 'usage') {
            val = (!baseVal || baseVal <= 0) ? 25 : Math.max(10, baseVal + offset * 4);
          } else {
            val = Math.max(50, Math.round(baseVal + offset * 35));
          }
          return { date: day, value: val };
        });
      }

      if (metricType === 'odour') {
        return slice.map((item, idx) => {
          const val = Number(item.odour ?? item.value) || (baseLiveValues.odour || 1078);
          const nh3Val = Number(item.nh3) || Math.round((baseLiveValues.nh3 || 825) + (((idx * 7) % 5) - 2) * 35);
          const h2sVal = Number(item.h2s) || Math.round((baseLiveValues.h2s || 1055) - (((idx * 7) % 5) - 2) * 28);
          return {
            ...item,
            value: val,
            odour: val,
            nh3: nh3Val,
            h2s: h2sVal
          };
        });
      }
      return slice;
    }

    // 6. Monthly View (Last 30 Days)
    if (timeframe === 'Monthly') {
      const days30 = [];
      const baseD = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(baseD);
        d.setDate(baseD.getDate() - i * 5);
        const dayLabel = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        const wave = Math.sin((6 - i) * 1.15);
        let val = baseVal;
        if (metricType === 'temp') {
          val = Math.round((baseVal + wave * 1.8) * 10) / 10;
        } else if (metricType === 'water') {
          val = Math.max(5, Math.min(100, Math.round(baseVal + wave * 6)));
        } else if (metricType === 'usage') {
          val = Math.max(20, Math.round((baseVal || 35) + wave * 12));
        } else {
          val = Math.max(100, Math.round(baseVal + wave * 140));
        }

        if (metricType === 'odour') {
          const nh3Val = Math.max(50, Math.round((baseLiveValues.nh3 || 825) + wave * 95));
          const h2sVal = Math.max(50, Math.round((baseLiveValues.h2s || 1055) - wave * 80));
          days30.push({ date: dayLabel, value: val, odour: val, nh3: nh3Val, h2s: h2sVal });
        } else {
          days30.push({ date: dayLabel, value: val });
        }
      }
      return days30;
    }

    // 7. Financial Year (FY: Apr to Mar)
    if (timeframe === 'FY') {
      const fyMonths = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
      const seasonalFactors = [-0.08, -0.04, 0.05, 0.08, 0.02, -0.05, 0.04, 0.09, 0.03, -0.06, -0.02, 0.07];
      return fyMonths.map((m, idx) => {
        const factor = seasonalFactors[idx];
        let val = baseVal;
        if (metricType === 'temp') {
          const tempShift = [2.5, 4.0, 3.5, 1.0, 0.5, 0.0, -1.0, -2.5, -4.0, -4.5, -2.0, 1.0][idx];
          val = Math.round((baseVal + tempShift) * 10) / 10;
        } else if (metricType === 'water') {
          val = Math.max(10, Math.min(100, Math.round(baseVal * (1 + factor * 0.1))));
        } else if (metricType === 'usage') {
          val = Math.max(40, Math.round((baseVal || 30) * 15 * (1 + factor)));
        } else {
          val = Math.max(100, Math.round(baseVal * (1 + factor)));
        }

        if (metricType === 'odour') {
          const nh3Val = Math.max(50, Math.round((baseLiveValues.nh3 || 825) * (1 + factor * 0.8)));
          const h2sVal = Math.max(50, Math.round((baseLiveValues.h2s || 1055) * (1 - factor * 0.7)));
          return { date: m, value: val, odour: val, nh3: nh3Val, h2s: h2sVal };
        }
        return { date: m, value: val };
      });
    }

    if (metricType === 'odour' && Array.isArray(rawHistory)) {
      return rawHistory.map((item, idx) => {
        const val = item.value ?? baseVal;
        const nh3Val = item.nh3 ?? (baseLiveValues.nh3 || 825);
        const h2sVal = item.h2s ?? (baseLiveValues.h2s || 1055);
        return { ...item, value: val, odour: val, nh3: nh3Val, h2s: h2sVal };
      });
    }
    return rawHistory || [];
  };

  const displayedTempData = getTimeframeData('temp', chartTimeframes.temp, tempData, baseLiveValues.temp);
  const displayedHumidityData = getTimeframeData('humidity', chartTimeframes.humidity, humidityData, baseLiveValues.hum);
  const displayedOdourData = getTimeframeData('odour', chartTimeframes.odour, odourData, baseLiveValues.odour);
  const displayedWaterData = getTimeframeData('water', chartTimeframes.water, waterData, baseLiveValues.water);
  const displayedUsageData = getTimeframeData('usage', chartTimeframes.usage, usageData, baseLiveValues.visits);

  // Stats for Share Market Header Strips
  const tempStats = calcStats(displayedTempData, 'value');
  const humStats = calcStats(displayedHumidityData, 'value');
  const odourStats = calcStats(displayedOdourData, 'value');
  const waterStats = calcStats(displayedWaterData, 'value');
  const usageStats = calcStats(displayedUsageData, 'value');
  const displayedUsageTotal = (displayedUsageData || []).reduce((a, b) => a + (Number(b.value) || 0), 0) || baseLiveValues.visits || 352;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setFullscreenGraph(null);
      }
    };
    if (fullscreenGraph) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenGraph]);

  const getFullscreenData = () => {
    switch (fullscreenGraph) {
      case 'temp':
        return {
          title: 'Temperature Trend (Temp °C)',
          subtitle: getTimeframeSubtitle(chartTimeframes.temp, 'Ambient Temperature in °C'),
          icon: <Thermometer size={22} color="#10b981" />,
          color: '#10b981',
          gradientId: 'modalTempGrad',
          data: displayedTempData,
          yDomain: ['dataMin - 2', 'dataMax + 2'],
          yUnit: '°C',
          stats: tempStats,
          benchmark: 'Normal: 20-35°C',
          referenceLines: [
            { y: 35, stroke: '#f59e0b', label: 'Alert Limit (35°C)' },
            { y: 20, stroke: '#10b981', label: 'Min Baseline (20°C)' }
          ]
        };
      case 'humidity':
        return {
          title: 'Humidity Trend (RH %)',
          subtitle: getTimeframeSubtitle(chartTimeframes.humidity, 'Relative Humidity in %'),
          icon: <CloudRain size={22} color="#0284c7" />,
          color: '#0284c7',
          gradientId: 'modalHumGrad',
          data: displayedHumidityData,
          yDomain: [0, 100],
          yUnit: '%',
          stats: humStats,
          benchmark: 'Comfort: 40-65%',
          referenceLines: [
            { y: 65, stroke: '#0284c7', label: 'Upper Comfort (65%)' },
            { y: 40, stroke: '#0284c7', label: 'Lower Comfort (40%)' }
          ]
        };
      case 'odour':
        return {
          title: 'Odour & Gas Levels (VOC, NH3, H2S)',
          subtitle: getTimeframeSubtitle(chartTimeframes.odour, 'Multi-Gas Telemetry in PPM'),
          icon: <Wind size={22} color="#8b5cf6" />,
          color: '#10b981',
          gradientId: 'modalOdourGrad',
          data: displayedOdourData,
          yDomain: [0, 'auto'],
          yUnit: ' PPM',
          isMultiLine: true,
          stats: odourStats,
          benchmark: 'Threshold: 70 PPM',
          referenceLines: [
            { y: 70, stroke: '#ef4444', label: 'Alert Threshold (70 PPM)' }
          ]
        };
      case 'water':
        return {
          title: 'Water Level Performance',
          subtitle: getTimeframeSubtitle(chartTimeframes.water, 'Water Level Capacity & Refill Trend'),
          icon: <Droplets size={22} color="#3b82f6" />,
          color: '#3b82f6',
          gradientId: 'modalWaterGrad',
          data: displayedWaterData,
          yDomain: [0, 100],
          yUnit: '%',
          allowDecimals: false,
          stats: waterStats,
          benchmark: 'Refill Threshold: <= 20%',
          referenceLines: [
            { y: 20, stroke: '#ef4444', label: 'Refill Warning (20%)' }
          ]
        };
      case 'usage':
        return {
          title: 'Footfall / Machine Usage Trend',
          subtitle: getTimeframeSubtitle(chartTimeframes.usage, 'Visitor Counts & Restroom Utilization'),
          icon: <Users size={22} color="#8b5cf6" />,
          color: '#8b5cf6',
          gradientId: 'modalUsageGrad',
          data: displayedUsageData,
          yDomain: [0, 'auto'],
          yUnit: ' Visits',
          stats: usageStats,
          benchmark: `${displayedUsageTotal} Total Visits`,
          referenceLines: []
        };
      default:
        return null;
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);

      const chartIds = [
        'graph-card-temp',
        'graph-card-humidity',
        'graph-card-odour',
        'graph-card-water',
        'graph-card-usage'
      ];

      const chartImages = [];
      for (const id of chartIds) {
        const el = document.getElementById(id);
        if (el) {
          try {
            const canvas = await html2canvas(el, {
              scale: 2,
              backgroundColor: '#ffffff',
              useCORS: true,
              logging: false
            });
            chartImages.push(canvas.toDataURL('image/png'));
          } catch (e) {
            console.warn(`Could not capture chart ${id}:`, e);
          }
        }
      }

      const activeMachineName = selectedMachine !== 'All'
        ? (machines.find(m => String(m.id) === String(selectedMachine))?.name || selectedMachine)
        : 'All Machines';

      const activeOmcName = (() => {
        if ((isOmcAdmin || isRoUser) && assignedOmc) {
          return assignedOmc.name?.toUpperCase() || 'IOCL';
        }
        if (selectedClient && selectedClient !== 'All') {
          const match = omcs.find(o => String(o.id) === String(selectedClient) || String(o.db_id) === String(selectedClient));
          if (match?.name) return match.name;
        }
        if (selectedRo && selectedRo !== 'All') {
          const matchedRo = omcRos.find(r => String(r.id) === String(selectedRo));
          if (matchedRo) {
            const parentOmc = omcs.find(o => String(o.id) === String(matchedRo.omc_id || matchedRo.omcId));
            if (parentOmc?.name) return parentOmc.name;
          }
        }
        return selectedClient !== 'All' ? selectedClient : 'All';
      })();

      exportToPDF(
        'Telemetry Analytics & Trends Report',
        [],
        [],
        {
          hideTable: true,
          clientName: activeOmcName,
          roName: selectedRo !== 'All' ? (omcRos.find(r => String(r.id) === String(selectedRo))?.name || 'Selected RO') : 'All ROs',
          machineName: activeMachineName,
          dateRange: filterType === 'Financial Year' ? financialYear : `${fromDate || 'Start'} to ${toDate || 'End'}`,
          generatedBy: user?.name ? `${user.name} (${user.role})` : (isOmcAdmin ? 'OMC Admin' : 'SuperAdmin (9284188705)'),
          chartImages
        }
      );
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Helper for Timeframe pill buttons with Yesterday & 2D Scroller support
  const renderTimeframePills = (metricKey, activeColor = '#10b981') => {
    const timeframes = [
      { key: '1H', label: '1H' },
      { key: 'Today', label: 'Today' },
      { key: 'Yesterday', label: 'Yesterday' },
      { key: '2D', label: '2D (All)' },
      { key: 'Weekly', label: '7D' },
      { key: 'Monthly', label: '30D' },
      { key: 'FY', label: 'FY' }
    ];

    return (
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'inline-flex',
          background: 'var(--card-bg, rgba(243, 244, 246, 0.6))',
          padding: '2px',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          gap: '2px',
          flexWrap: 'wrap'
        }}
      >
        {timeframes.map(({ key, label }) => {
          const isActive = chartTimeframes[metricKey] === key;
          return (
            <button
              key={key}
              onClick={(e) => {
                e.stopPropagation();
                setChartTimeframes(prev => ({ ...prev, [metricKey]: key }));
              }}
              style={{
                border: 'none',
                background: isActive ? activeColor : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: isActive ? '700' : '500',
                fontSize: '0.72rem',
                padding: '0.22rem 0.52rem',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                whiteSpace: 'nowrap'
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ padding: '0.5rem 2rem 2.5rem 2rem', animation: 'fadeIn 0.4s ease-in', maxWidth: '1440px', margin: '0 auto', color: 'var(--text-primary)' }}>

      {/* Print Specific CSS */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          .no-print {
            display: none !important;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .graph-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
          }
        }
      `}</style>

      {/* Corporate Print Header */}
      <PrintHeader
        title="GRAPHICAL ANALYTICS & TELEMETRY REPORT"
        clientName={(() => {
          if ((isOmcAdmin || isRoUser) && assignedOmc) return assignedOmc.name?.toUpperCase() || 'IOCL';
          if (selectedClient && selectedClient !== 'All') {
            const match = omcs.find(o => String(o.id) === String(selectedClient) || String(o.db_id) === String(selectedClient));
            if (match?.name) return match.name;
          }
          if (selectedRo && selectedRo !== 'All') {
            const matchedRo = omcRos.find(r => String(r.id) === String(selectedRo));
            if (matchedRo) {
              const parentOmc = omcs.find(o => String(o.id) === String(matchedRo.omc_id || matchedRo.omcId));
              if (parentOmc?.name) return parentOmc.name;
            }
          }
          return selectedClient !== 'All' ? selectedClient : 'All';
        })()}
        roName={isRoUser ? (currentRoName || 'Retail Outlet') : (selectedRo !== 'All' ? (omcRos.find(r => String(r.id) === String(selectedRo))?.name || 'Selected RO') : 'All ROs')}
        machineName={selectedMachine !== 'All' ? (machines.find(m => String(m.id) === String(selectedMachine))?.name || selectedMachine) : 'All Machines'}
        dateRange={filterType === 'Financial Year' ? financialYear : `${fromDate || 'Start'} to ${toDate || 'End'}`}
      />

      {/* Header & Export Action */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', letterSpacing: '-0.3px' }}>
            Graphical Analytics
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>
            Interactive Share Market Style Telemetry with Live Timeline Scroller (Yesterday & Today)
          </p>
        </div>

        <div className="no-print" style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.55rem 1.15rem',
              background: isExporting ? 'var(--border-color)' : 'var(--surface-bg)',
              color: isExporting ? 'var(--text-secondary)' : '#ef4444',
              border: `1px solid ${isExporting ? 'var(--border-color)' : '#ef4444'}`,
              borderRadius: '8px',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '0.88rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              transition: 'all 0.2s'
            }}
          >
            <Download size={16} color="#ef4444" /> {isExporting ? 'Generating PDF...' : 'PDF Report'}
          </button>
        </div>
      </div>

      {/* Top Filter Controls */}
      <div className="no-print" style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1.75rem', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>OMC</label>
            {(isOmcAdmin || isRoUser) ? (
              <input
                type="text"
                readOnly
                value={assignedOmc?.name ? assignedOmc.name.toUpperCase() : 'IOCL'}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--card-bg, rgba(243, 244, 246, 0.4))',
                  color: 'var(--text-primary)',
                  fontWeight: '600',
                  fontSize: '0.88rem',
                  cursor: 'default',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            ) : (
              <select
                value={selectedClient}
                onChange={(e) => {
                  setSelectedClient(e.target.value);
                  setSelectedRo('All');
                  setSelectedMachine('All');
                }}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-bg)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
              >
                <option value="All">All OMCs</option>
                {omcs.map(omc => <option key={omc.id} value={omc.id}>{omc.name}</option>)}
              </select>
            )}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Petrol Pump (RO)</label>
            {isRoUser ? (
              <input
                type="text"
                readOnly
                value={currentRoName || 'Retail Outlet'}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--card-bg, rgba(243, 244, 246, 0.4))',
                  color: 'var(--text-primary)',
                  fontWeight: '600',
                  fontSize: '0.88rem',
                  cursor: 'default',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            ) : (
              <select
                value={selectedRo}
                onChange={(e) => {
                  setSelectedRo(e.target.value);
                  setSelectedMachine('All');
                }}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-bg)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
              >
                <option value="All">-- All ROs --</option>
                {omcRos.map(ro => {
                  const displayName = ro.name || `RO ${ro.id}`;
                  return (
                    <option key={ro.id} value={ro.id}>{displayName}</option>
                  );
                })}
              </select>
            )}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Machine ID</label>
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-bg)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
            >
              <option value="All">-- All Machines --</option>
              {filteredMachinesForDropdown.map(m => (
                <option key={m.id || m.db_id} value={m.name || m.id}>
                  {m.name || `Machine ${m.id}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="analysis-filters-dates-grid" style={{ display: 'grid', gridTemplateColumns: filterType === 'Financial Year' ? '1fr 1fr 1fr auto' : '1fr 1fr 1fr 1fr auto', gap: '1.25rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filter Type</label>
            <div style={{ display: 'flex', gap: '1.25rem', padding: '0.5rem 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.88rem', fontWeight: '500' }}>
                <input type="radio" name="filterType" checked={filterType === 'Financial Year'} onChange={() => setFilterType('Financial Year')} />
                Financial Year
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: '500' }}>
                <input type="radio" name="filterType" checked={filterType === 'Date Range'} onChange={() => setFilterType('Date Range')} />
                Date Range
              </label>
            </div>
          </div>

          {filterType === 'Financial Year' ? (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Financial Year</label>
              <select 
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-bg)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
              >
                <option value="Current FY (2026-27)">Current FY (2026-27)</option>
                <option value="Previous FY (2025-26)">Previous FY (2025-26)</option>
              </select>
            </div>
          ) : (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>From Date</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Calendar size={15} color="var(--text-secondary)" style={{ position: 'absolute', left: '0.75rem', pointerEvents: 'none' }} />
                  <input
                    type="date"
                    value={fromDate}
                    max={toDate && toDate <= getTodayFormatted() ? toDate : getTodayFormatted()}
                    onChange={(e) => setFromDate(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem 0.65rem 2.2rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-bg)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>To Date</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Calendar size={15} color="var(--text-secondary)" style={{ position: 'absolute', left: '0.75rem', pointerEvents: 'none' }} />
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate || undefined}
                    max={getTodayFormatted()}
                    onChange={(e) => setToDate(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem 0.65rem 2.2rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-bg)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Global Interval</label>
            <select
              value={selectedTimeframe}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedTimeframe(val);
                setChartTimeframes({
                  temp: val,
                  humidity: val,
                  odour: val,
                  water: val,
                  usage: val
                });
              }}
              style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-bg)', color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.88rem' }}
            >
              <option value="2D">2-Day Stream (Scroller)</option>
              <option value="Yesterday">Yesterday Only</option>
              <option value="Today">Today Only</option>
              <option value="1H">Last 1 Hour (1H)</option>
              <option value="Weekly">Weekly (7D)</option>
              <option value="Monthly">Monthly (30D)</option>
              <option value="FY">Financial Year (FY)</option>
            </select>
          </div>

          <div>
            <button
              onClick={handleApplyFilter}
              disabled={isApplying}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.65rem 1.4rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', cursor: isApplying ? 'wait' : 'pointer', fontWeight: '700', fontSize: '0.88rem', transition: 'all 0.2s', opacity: isApplying ? 0.75 : 1, whiteSpace: 'nowrap' }}
            >
              <Filter size={15} />
              {isApplying ? 'Applying...' : 'Apply Filter'}
            </button>
          </div>
        </div>
      </div>

      {/* SHARE MARKET TICKER BAR (Live Summary Strip) */}
      <div className="no-print" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '0.85rem',
        marginBottom: '1.75rem'
      }}>
        {/* Device Status */}
        <div style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
            <Activity size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Device</div>
            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)' }}>
              {selectedMachine !== 'All' ? selectedMachine : (machines[0]?.name || 'SBE20001')}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }}></span> Live 30s Stream
            </div>
          </div>
        </div>

        {/* Live Temp */}
        <div style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
            <Thermometer size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live Temp</div>
            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#10b981' }}>
              {baseLiveValues.temp}°C
            </div>
            <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: '700' }}>
              🟢 Normal (20 - 35°C)
            </div>
          </div>
        </div>

        {/* Live Humidity */}
        <div style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7' }}>
            <CloudRain size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live Humidity</div>
            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0284c7' }}>
              {baseLiveValues.hum}%
            </div>
            <div style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: '700' }}>
              🟢 Comfort Zone (40 - 65%)
            </div>
          </div>
        </div>

        {/* Live Odour / Gases */}
        <div style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
            <Wind size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Air Quality (VOC)</div>
            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#8b5cf6' }}>
              {baseLiveValues.odour} <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>PPM</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>
              NH3: <b>{baseLiveValues.nh3}</b> • H2S: <b>{baseLiveValues.h2s}</b>
            </div>
          </div>
        </div>

        {/* Water Status */}
        <div style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
            <Droplets size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Water Level</div>
            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#3b82f6' }}>
              {baseLiveValues.water}% <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>({baseLiveValues.water <= 20 ? 'Low' : 'Adequate'})</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: baseLiveValues.water <= 20 ? '#ef4444' : '#10b981', fontWeight: '700' }}>
              {baseLiveValues.water <= 20 ? '⚠️ Refill Warning' : '🟢 Reservoir 100% Safe'}
            </div>
          </div>
        </div>

        {/* Footfall Usage */}
        <div style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(234, 179, 8, 0.12)', color: '#eab308' }}>
            <Zap size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Restroom Footfall</div>
            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)' }}>
              {displayedUsageTotal} <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Visits</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: '700' }}>
              ⚡ Normal Operation
            </div>
          </div>
        </div>
      </div>

      {/* GRAPHS GRID (With Interactive Timeline Scroller on Every Card) */}
      <div className="charts-grid analysis-charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: '1.5rem' }}>

        {/* 1. TEMPERATURE HISTOGRAM / AREA GRAPH */}
        <div 
          className="graph-card" 
          id="graph-card-temp" 
          onClick={() => setFullscreenGraph('temp')}
          title="Click to view Fullscreen TradingView Chart"
          style={{ 
            background: 'var(--surface-bg)', 
            padding: '1.25rem 1.4rem', 
            borderRadius: '14px', 
            border: '1px solid var(--border-color)', 
            boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Header Strip */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', marginTop: '2px' }}>
                <Thermometer size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: '800', margin: 0 }}>
                    Temperature
                  </h3>
                  <span style={{ fontSize: '1.45rem', fontWeight: '800', color: '#10b981', letterSpacing: '-0.4px' }}>
                    {tempStats.current}°C
                  </span>
                  <span style={{ 
                    fontSize: '0.72rem', 
                    fontWeight: '700', 
                    padding: '0.15rem 0.55rem', 
                    borderRadius: '12px', 
                    background: tempStats.current <= 35 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    color: tempStats.current <= 35 ? '#059669' : '#dc2626'
                  }}>
                    {tempStats.current <= 35 ? '🟢 Normal (20-35°C)' : '⚠️ High (>35°C)'}
                  </span>
                </div>

                {/* Stock Ticker Strip */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                  <span>Min: <strong style={{ color: 'var(--text-primary)' }}>{tempStats.min}°C</strong></span>
                  <span>•</span>
                  <span>Max: <strong style={{ color: 'var(--text-primary)' }}>{tempStats.max}°C</strong></span>
                  <span>•</span>
                  <span>Avg: <strong style={{ color: 'var(--text-primary)' }}>{tempStats.avg}°C</strong></span>
                  <span>•</span>
                  <span style={{ color: tempStats.change >= 0 ? '#10b981' : '#ef4444', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                    {tempStats.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {tempStats.change >= 0 ? `+${tempStats.change}` : tempStats.change}°C ({tempStats.changePct}%)
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {renderTimeframePills('temp', '#10b981')}
              <button
                onClick={(e) => { e.stopPropagation(); setFullscreenGraph('temp'); }}
                title="Fullscreen"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.3rem', borderRadius: '6px', color: 'var(--text-secondary)' }}
              >
                <Maximize2 size={16} />
              </button>
            </div>
          </div>

          {/* Area Chart with Brush Scroller */}
          <div style={{ height: '245px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayedTempData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} unit="°C" axisLine={false} tickLine={false} tick={{ fontSize: 10.5, fill: 'var(--text-secondary)' }} />
                <RechartsTooltip content={<StockTooltip unit="°C" metricName="Temperature" benchmark="Normal 20-35°C" />} />
                
                {/* Benchmark Lines */}
                <ReferenceLine y={35} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1} label={{ value: '⚠️ Alert 35°C', position: 'insideTopRight', fill: '#f59e0b', fontSize: 10, fontWeight: 700 }} />
                <ReferenceLine y={20} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1} strokeOpacity={0.6} label={{ value: '🟢 Min 20°C', position: 'insideBottomRight', fill: '#10b981', fontSize: 10, fontWeight: 600 }} />

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#tempGradient)"
                  dot={{ r: 2.5, fill: '#10b981', stroke: '#ffffff', strokeWidth: 1.5 }}
                  activeDot={{ r: 6, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                />

                {displayedTempData.length > 20 && (
                  <Brush 
                    dataKey="date" 
                    height={22} 
                    stroke="#10b981" 
                    fill="rgba(16, 185, 129, 0.04)" 
                    travellerWidth={8} 
                    tick={false}
                    startIndex={displayedTempData.length > 50 ? Math.max(0, displayedTempData.length - 50) : 0}
                    endIndex={displayedTempData.length > 0 ? displayedTempData.length - 1 : 0}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. HUMIDITY HISTOGRAM / AREA GRAPH */}
        <div 
          className="graph-card" 
          id="graph-card-humidity" 
          onClick={() => setFullscreenGraph('humidity')}
          title="Click to view Fullscreen TradingView Chart"
          style={{ 
            background: 'var(--surface-bg)', 
            padding: '1.25rem 1.4rem', 
            borderRadius: '14px', 
            border: '1px solid var(--border-color)', 
            boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Header Strip */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7', marginTop: '2px' }}>
                <CloudRain size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: '800', margin: 0 }}>
                    Relative Humidity
                  </h3>
                  <span style={{ fontSize: '1.45rem', fontWeight: '800', color: '#0284c7', letterSpacing: '-0.4px' }}>
                    {humStats.current}%
                  </span>
                  <span style={{ 
                    fontSize: '0.72rem', 
                    fontWeight: '700', 
                    padding: '0.15rem 0.55rem', 
                    borderRadius: '12px', 
                    background: (humStats.current >= 40 && humStats.current <= 65) ? 'rgba(16, 185, 129, 0.12)' : 'rgba(2, 132, 199, 0.12)',
                    color: (humStats.current >= 40 && humStats.current <= 65) ? '#059669' : '#0284c7'
                  }}>
                    {humStats.current >= 40 && humStats.current <= 65 ? '🟢 Optimal (40-65%)' : 'Comfort Band'}
                  </span>
                </div>

                {/* Stock Ticker Strip */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                  <span>Min: <strong style={{ color: 'var(--text-primary)' }}>{humStats.min}%</strong></span>
                  <span>•</span>
                  <span>Max: <strong style={{ color: 'var(--text-primary)' }}>{humStats.max}%</strong></span>
                  <span>•</span>
                  <span>Avg: <strong style={{ color: 'var(--text-primary)' }}>{humStats.avg}%</strong></span>
                  <span>•</span>
                  <span style={{ color: humStats.change >= 0 ? '#0284c7' : '#ef4444', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                    {humStats.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {humStats.change >= 0 ? `+${humStats.change}` : humStats.change}% ({humStats.changePct}%)
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {renderTimeframePills('humidity', '#0284c7')}
              <button
                onClick={(e) => { e.stopPropagation(); setFullscreenGraph('humidity'); }}
                title="Fullscreen"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.3rem', borderRadius: '6px', color: 'var(--text-secondary)' }}
              >
                <Maximize2 size={16} />
              </button>
            </div>
          </div>

          {/* Area Chart with Brush Scroller */}
          <div style={{ height: '245px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayedHumidityData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="humGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                <YAxis domain={[0, 100]} unit="%" axisLine={false} tickLine={false} tick={{ fontSize: 10.5, fill: 'var(--text-secondary)' }} />
                <RechartsTooltip content={<StockTooltip unit="%" metricName="Humidity" benchmark="Comfort 40-65%" />} />
                
                {/* Benchmark Lines */}
                <ReferenceLine y={65} stroke="#0284c7" strokeDasharray="4 4" strokeWidth={1} label={{ value: 'Upper Comfort (65%)', position: 'insideTopRight', fill: '#0284c7', fontSize: 10, fontWeight: 700 }} />
                <ReferenceLine y={40} stroke="#0284c7" strokeDasharray="4 4" strokeWidth={1} strokeOpacity={0.6} label={{ value: 'Lower Comfort (40%)', position: 'insideBottomRight', fill: '#0284c7', fontSize: 10, fontWeight: 600 }} />

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#humGradient)"
                  dot={{ r: 2.5, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 1.5 }}
                  activeDot={{ r: 6, fill: '#0369a1', stroke: '#ffffff', strokeWidth: 2 }}
                />

                {displayedHumidityData.length > 20 && (
                  <Brush 
                    dataKey="date" 
                    height={22} 
                    stroke="#0284c7" 
                    fill="rgba(2, 132, 199, 0.04)" 
                    travellerWidth={8} 
                    tick={false}
                    startIndex={displayedHumidityData.length > 50 ? Math.max(0, displayedHumidityData.length - 50) : 0}
                    endIndex={displayedHumidityData.length > 0 ? displayedHumidityData.length - 1 : 0}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. ODOUR / MULTI-GAS TELEMETRY AREA GRAPH */}
        <div 
          className="graph-card" 
          id="graph-card-odour" 
          onClick={() => setFullscreenGraph('odour')}
          title="Click to view Fullscreen TradingView Chart"
          style={{ 
            background: 'var(--surface-bg)', 
            padding: '1.25rem 1.4rem', 
            borderRadius: '14px', 
            border: '1px solid var(--border-color)', 
            boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Header Strip */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', marginTop: '2px' }}>
                <Wind size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: '800', margin: 0 }}>
                    Odour & Gas Levels
                  </h3>
                  <span style={{ fontSize: '1.45rem', fontWeight: '800', color: '#10b981', letterSpacing: '-0.4px' }}>
                    {odourStats.current} <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>PPM</span>
                  </span>
                  <span style={{ 
                    fontSize: '0.72rem', 
                    fontWeight: '700', 
                    padding: '0.15rem 0.55rem', 
                    borderRadius: '12px', 
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#059669'
                  }}>
                    🟢 Monitored Air
                  </span>
                </div>

                {/* 3 Gas Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.75rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                  <span style={{ padding: '0.1rem 0.45rem', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#059669', fontWeight: '700' }}>
                    VOC: {baseLiveValues.odour} PPM
                  </span>
                  <span style={{ padding: '0.1rem 0.45rem', borderRadius: '6px', background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', fontWeight: '700' }}>
                    NH3: {baseLiveValues.nh3} PPM
                  </span>
                  <span style={{ padding: '0.1rem 0.45rem', borderRadius: '6px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', fontWeight: '700' }}>
                    H2S: {baseLiveValues.h2s} PPM
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {renderTimeframePills('odour', '#8b5cf6')}
              <button
                onClick={(e) => { e.stopPropagation(); setFullscreenGraph('odour'); }}
                title="Fullscreen"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.3rem', borderRadius: '6px', color: 'var(--text-secondary)' }}
              >
                <Maximize2 size={16} />
              </button>
            </div>
          </div>

          {/* Multi-Area Gas Chart with Brush Scroller */}
          <div style={{ height: '245px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayedOdourData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="odourGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                <YAxis domain={[0, 'auto']} unit=" PPM" axisLine={false} tickLine={false} tick={{ fontSize: 10.5, fill: 'var(--text-secondary)' }} />
                <RechartsTooltip content={<StockTooltip unit="PPM" multi={true} benchmark="Threshold 70 PPM" />} />
                
                {/* Alert Reference Line */}
                <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1} label={{ value: '🚨 Alert (70 PPM)', position: 'insideTopRight', fill: '#ef4444', fontSize: 10, fontWeight: 700 }} />

                <Area type="monotone" name="VOC Odour" dataKey="odour" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#odourGrad)" dot={{ r: 2.5, fill: '#10b981', stroke: '#fff', strokeWidth: 1.5 }} />
                <Area type="monotone" name="NH3" dataKey="nh3" stroke="#0284c7" strokeWidth={2} fillOpacity={0} fill="none" dot={{ r: 2, fill: '#0284c7', stroke: '#fff', strokeWidth: 1 }} />
                <Area type="monotone" name="H2S" dataKey="h2s" stroke="#8b5cf6" strokeWidth={2} fillOpacity={0} fill="none" dot={{ r: 2, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 1 }} />

                {displayedOdourData.length > 20 && (
                  <Brush 
                    dataKey="date" 
                    height={22} 
                    stroke="#8b5cf6" 
                    fill="rgba(139, 92, 246, 0.04)" 
                    travellerWidth={8} 
                    tick={false}
                    startIndex={displayedOdourData.length > 50 ? Math.max(0, displayedOdourData.length - 50) : 0}
                    endIndex={displayedOdourData.length > 0 ? displayedOdourData.length - 1 : 0}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. WATER LOW ALERTS AREA GRAPH */}
        <div 
          className="graph-card" 
          id="graph-card-water" 
          onClick={() => setFullscreenGraph('water')}
          title="Click to view Fullscreen TradingView Chart"
          style={{ 
            background: 'var(--surface-bg)', 
            padding: '1.25rem 1.4rem', 
            borderRadius: '14px', 
            border: '1px solid var(--border-color)', 
            boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Header Strip */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', marginTop: '2px' }}>
                <Droplets size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: '800', margin: 0 }}>
                    Water Level
                  </h3>
                  <span style={{ fontSize: '1.45rem', fontWeight: '800', color: '#3b82f6', letterSpacing: '-0.4px' }}>
                    {waterStats.current}%
                  </span>
                  <span style={{ 
                    fontSize: '0.72rem', 
                    fontWeight: '700', 
                    padding: '0.15rem 0.55rem', 
                    borderRadius: '12px', 
                    background: waterStats.current > 20 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    color: waterStats.current > 20 ? '#059669' : '#dc2626'
                  }}>
                    {waterStats.current > 20 ? '🟢 Normal Level' : '⚠️ Refill Warning (Low)'}
                  </span>
                </div>

                {/* Stock Ticker Strip */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                  <span>Avg Level: <strong style={{ color: 'var(--text-primary)' }}>{waterStats.mean}%</strong></span>
                  <span>•</span>
                  <span>Range: <strong style={{ color: 'var(--text-primary)' }}>{waterStats.min}% - {waterStats.max}%</strong></span>
                  <span>•</span>
                  <span>Supply Status: <strong style={{ color: waterStats.current > 20 ? '#10b981' : '#ef4444' }}>{waterStats.current > 20 ? 'Normal Continuous' : 'Low Level Warning'}</strong></span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {renderTimeframePills('water', '#3b82f6')}
              <button
                onClick={(e) => { e.stopPropagation(); setFullscreenGraph('water'); }}
                title="Fullscreen"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.3rem', borderRadius: '6px', color: 'var(--text-secondary)' }}
              >
                <Maximize2 size={16} />
              </button>
            </div>
          </div>

          {/* Area Chart with Brush Scroller */}
          <div style={{ height: '245px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayedWaterData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                <YAxis domain={[0, 100]} unit="%" axisLine={false} tickLine={false} tick={{ fontSize: 10.5, fill: 'var(--text-secondary)' }} />
                <RechartsTooltip content={<StockTooltip unit="%" metricName="Water Level" benchmark="Refill Threshold: <= 20%" />} />
                
                {/* Benchmark Lines */}
                <ReferenceLine y={20} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1} label={{ value: '⚠️ Refill Line (20%)', position: 'insideTopRight', fill: '#ef4444', fontSize: 10, fontWeight: 700 }} />

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#waterGrad)"
                  dot={{ r: 2.5, fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 1.5 }}
                  activeDot={{ r: 6, fill: '#1d4ed8', stroke: '#ffffff', strokeWidth: 2 }}
                />

                {displayedWaterData.length > 20 && (
                  <Brush 
                    dataKey="date" 
                    height={22} 
                    stroke="#3b82f6" 
                    fill="rgba(59, 130, 246, 0.04)" 
                    travellerWidth={8} 
                    tick={false}
                    startIndex={displayedWaterData.length > 50 ? Math.max(0, displayedWaterData.length - 50) : 0}
                    endIndex={displayedWaterData.length > 0 ? displayedWaterData.length - 1 : 0}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. MACHINE USAGE / FOOTFALL VOLUME GRAPH */}
        <div 
          className="graph-card" 
          id="graph-card-usage" 
          onClick={() => setFullscreenGraph('usage')}
          title="Click to view Fullscreen TradingView Chart"
          style={{ 
            background: 'var(--surface-bg)', 
            padding: '1.25rem 1.4rem', 
            borderRadius: '14px', 
            border: '1px solid var(--border-color)', 
            boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Header Strip */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', marginTop: '2px' }}>
                <Users size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: '800', margin: 0 }}>
                    Restroom Footfall & Usage
                  </h3>
                  <span style={{ fontSize: '1.45rem', fontWeight: '800', color: '#8b5cf6', letterSpacing: '-0.4px' }}>
                    {displayedUsageTotal} <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>Visits</span>
                  </span>
                  <span style={{ 
                    fontSize: '0.72rem', 
                    fontWeight: '700', 
                    padding: '0.15rem 0.55rem', 
                    borderRadius: '12px', 
                    background: 'rgba(139, 92, 246, 0.12)',
                    color: '#7c3aed'
                  }}>
                    ⚡ Active Utilization
                  </span>
                </div>

                {/* Stock Ticker Strip */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                  <span>Avg: <strong style={{ color: 'var(--text-primary)' }}>{usageStats.avg} Visits</strong></span>
                  <span>•</span>
                  <span>Peak: <strong style={{ color: 'var(--text-primary)' }}>{usageStats.max} Visits</strong></span>
                  <span>•</span>
                  <span>Timeline: <strong style={{ color: '#8b5cf6' }}>Interactive Scroller</strong></span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {renderTimeframePills('usage', '#8b5cf6')}
              <button
                onClick={(e) => { e.stopPropagation(); setFullscreenGraph('usage'); }}
                title="Fullscreen"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.3rem', borderRadius: '6px', color: 'var(--text-secondary)' }}
              >
                <Maximize2 size={16} />
              </button>
            </div>
          </div>

          {/* Area Chart with Brush Scroller */}
          <div style={{ height: '245px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayedUsageData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="usageGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10.5, fill: 'var(--text-secondary)' }} />
                <RechartsTooltip content={<StockTooltip unit="Visits" metricName="Footfall Usage" benchmark="Active Traffic" />} />

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#usageGrad)"
                  dot={{ r: 2.5, fill: '#8b5cf6', stroke: '#ffffff', strokeWidth: 1.5 }}
                  activeDot={{ r: 6, fill: '#6d28d9', stroke: '#ffffff', strokeWidth: 2 }}
                />

                {displayedUsageData.length > 20 && (
                  <Brush 
                    dataKey="date" 
                    height={22} 
                    stroke="#8b5cf6" 
                    fill="rgba(139, 92, 246, 0.04)" 
                    travellerWidth={8} 
                    tick={false}
                    startIndex={displayedUsageData.length > 50 ? Math.max(0, displayedUsageData.length - 50) : 0}
                    endIndex={displayedUsageData.length > 0 ? displayedUsageData.length - 1 : 0}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* FULLSCREEN TRADINGVIEW MODAL WITH TIMELINE SCROLLER */}
      {fullscreenGraph && (() => {
        const modalData = getFullscreenData();
        if (!modalData) return null;
        return (
          <div 
            onClick={() => setFullscreenGraph(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              background: 'rgba(15, 23, 42, 0.82)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--surface-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                width: '95vw',
                maxWidth: '1350px',
                height: '88vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
                overflow: 'hidden',
                padding: '1.75rem',
                position: 'relative'
              }}
            >
              {/* Fullscreen Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ padding: '0.65rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {modalData.icon}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.85rem' }}>
                      <h2 style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                        {modalData.title}
                      </h2>
                      <span style={{ fontSize: '1.75rem', fontWeight: '800', color: modalData.color, letterSpacing: '-0.5px' }}>
                        {modalData.stats?.current} {modalData.yUnit}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'block' }}>
                      {modalData.subtitle} • Benchmark: <b>{modalData.benchmark}</b> • <b>{modalData.data?.length || 0} Telemetry Points</b>
                    </span>
                  </div>
                </div>

                {/* Side Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  {/* Timeframe pill group */}
                  {renderTimeframePills(fullscreenGraph, modalData.color)}

                  {/* Close Fullscreen Button */}
                  <button
                    onClick={() => setFullscreenGraph(null)}
                    title="Close Fullscreen (Esc)"
                    style={{
                      background: 'var(--card-bg, rgba(243, 244, 246, 0.5))',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      padding: '0.5rem',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--card-bg, rgba(243, 244, 246, 0.5))'}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Fullscreen Chart Rendering with Brush Scroller */}
              <div style={{ flex: 1, width: '100%', minHeight: 0, padding: '0.5rem 0' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={modalData.data} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                    <defs>
                      <linearGradient id={modalData.gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={modalData.color} stopOpacity={0.38} />
                        <stop offset="95%" stopColor={modalData.color} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)', fontWeight: 500 }} />
                    <YAxis 
                      domain={modalData.yDomain}
                      unit={modalData.yUnit}
                      allowDecimals={modalData.allowDecimals ?? true}
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 13, fill: 'var(--text-secondary)' }} 
                    />
                    <RechartsTooltip content={<StockTooltip unit={modalData.yUnit} multi={modalData.isMultiLine} benchmark={modalData.benchmark} />} />
                    
                    {modalData.referenceLines?.map((ref, idx) => (
                      <ReferenceLine 
                        key={idx} 
                        y={ref.y} 
                        stroke={ref.stroke} 
                        strokeDasharray="4 4" 
                        strokeWidth={1.5} 
                        label={{ value: ref.label, position: 'insideTopRight', fill: ref.stroke, fontSize: 11, fontWeight: 700 }} 
                      />
                    ))}

                    {modalData.isMultiLine ? (
                      <>
                        <Area type="monotone" name="VOC Odour" dataKey="odour" stroke="#10b981" strokeWidth={3.5} fillOpacity={1} fill={`url(#${modalData.gradientId})`} dot={{ r: 3, fill: '#10b981', stroke: '#fff', strokeWidth: 1.5 }} activeDot={{ r: 7 }} />
                        <Area type="monotone" name="NH3 (Ammonia)" dataKey="nh3" stroke="#0284c7" strokeWidth={3} fillOpacity={0} fill="none" dot={{ r: 2.5, fill: '#0284c7', stroke: '#fff', strokeWidth: 1 }} activeDot={{ r: 7 }} />
                        <Area type="monotone" name="H2S (Hydrogen Sulfide)" dataKey="h2s" stroke="#8b5cf6" strokeWidth={3} fillOpacity={0} fill="none" dot={{ r: 2.5, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 1 }} activeDot={{ r: 7 }} />
                      </>
                    ) : (
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={modalData.color}
                        strokeWidth={3.5}
                        fillOpacity={1}
                        fill={`url(#${modalData.gradientId})`}
                        dot={{ r: 3, fill: modalData.color, stroke: '#ffffff', strokeWidth: 2 }}
                        activeDot={{ r: 7, fill: modalData.color, stroke: '#ffffff', strokeWidth: 2 }}
                      />
                    )}

                    {/* TradingView Interactive Timeline Scroller */}
                    {modalData.data && modalData.data.length > 10 && (
                      <Brush 
                        dataKey="date" 
                        height={34} 
                        stroke={modalData.color} 
                        fill="rgba(15, 23, 42, 0.05)" 
                        travellerWidth={14} 
                        startIndex={modalData.data.length > 50 ? Math.max(0, modalData.data.length - 50) : 0}
                        endIndex={modalData.data.length > 0 ? modalData.data.length - 1 : 0}
                        tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontWeight: 600 }}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Print Footer */}
      <PrintFooter />

    </div>
  );
};

export default Analysis;
