import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  Search, 
  Filter, 
  Activity, 
  ShieldAlert, 
  CheckSquare, 
  FileText, 
  Download, 
  X, 
  Droplets, 
  Wind, 
  Thermometer, 
  CloudRain, 
  Waves, 
  Send, 
  Check 
} from 'lucide-react';
import api from '../services/api';
import { exportToPDF } from '../utils/exportUtils';
import PrintHeader from '../components/PrintHeader';
import PrintFooter from '../components/PrintFooter';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { getConsolidatedAlerts } from '../utils/alertUtils';
import { matchesMachineQuery } from '../utils/machineSearchUtils';

const Alerts = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
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

  const [alerts, setAlerts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All'); // 'All', 'Critical', 'High', 'Medium', 'Resolved'
  const [machineFilter, setMachineFilter] = useState('All');
  const [roFilter, setRoFilter] = useState('All');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [allMachines, setAllMachines] = useState([]);

  const fetchAlerts = async () => {
    try {
      const [alertsRes, machinesRes, rosRes, omcsRes] = await Promise.all([
        api.get('/alerts').catch(() => ({ data: { data: [] } })),
        api.get('/machines').catch(() => ({ data: { data: [] } })),
        api.get('/ro').catch(() => ({ data: { data: [] } })),
        api.get('/omc').catch(() => ({ data: { data: [] } }))
      ]);

      let rawAlerts = Array.isArray(alertsRes.data?.data)
        ? alertsRes.data.data
        : (Array.isArray(alertsRes.data) ? alertsRes.data : []);
      let machines = Array.isArray(machinesRes.data?.data)
        ? machinesRes.data.data
        : (Array.isArray(machinesRes.data) ? machinesRes.data : []);
      let ros = Array.isArray(rosRes.data?.data)
        ? rosRes.data.data
        : (Array.isArray(rosRes.data) ? rosRes.data : []);
      let omcs = Array.isArray(omcsRes.data?.data)
        ? omcsRes.data.data
        : (Array.isArray(omcsRes.data) ? omcsRes.data : []);

      // Ensure machines is an array; do not inject dummy machines if database is empty
      if (!Array.isArray(machines)) {
        machines = [];
      }

      setAllMachines(machines);

      const finalAlerts = getConsolidatedAlerts({
        rawAlerts,
        machines,
        ros,
        omcs,
        user
      });
      
      setAlerts(finalAlerts);
    } catch (err) {
      console.error("Error fetching alerts:", err);
    }
  };



  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);

    const params = new URLSearchParams(window.location.search);
    const filterParam = params.get('filter') || params.get('severity') || params.get('type') || params.get('level');
    if (filterParam) {
      const cap = filterParam.charAt(0).toUpperCase() + filterParam.slice(1).toLowerCase();
      if (['Danger', 'Low', 'Neutral', 'Critical', 'High'].includes(cap)) {
        setActiveFilter(cap === 'Critical' || cap === 'High' ? 'Danger' : cap);
      } else if (filterParam.toLowerCase().includes('water')) {
        setSearchTerm('Water');
      } else if (filterParam.toLowerCase().includes('odour')) {
        setSearchTerm('Odour');
      }
    }

    const handleSocketAlert = () => {
      fetchAlerts();
    };

    if (socket) {
      socket.on('new_alert', handleSocketAlert);
      socket.on('machine_status_update', handleSocketAlert);
    }

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('new_alert', handleSocketAlert);
        socket.off('machine_status_update', handleSocketAlert);
      }
    };
  }, [socket]);

  const updateAlertStatus = async (id, newStatus) => {
    try {
      await api.put(`/alerts/${id}`, { status: newStatus });
      const updated = alerts.map(a => a.id === id ? { ...a, status: newStatus } : a);
      setAlerts(updated);
      setSelectedAlert(null);
    } catch (err) {
      console.error("Error updating alert status:", err);
    }
  };

  const resolveAlert = (id) => updateAlertStatus(id, 'Resolved');
  const acknowledgeAlert = (id) => updateAlertStatus(id, 'In Progress');

  const filteredAlerts = alerts.filter(alert => {
    const searchString = searchTerm.trim().toLowerCase();
    let matchesSearch = true;
    if (searchString) {
      const cleanNum = searchString.replace(/^(?:#|id[:\s_-]*)/i, '').trim();
      const alertId = String(alert.id || '');
      const mId = String(alert.machineId || '').toLowerCase();
      const mName = String(alert.machineName || '').toLowerCase();
      const ro = String(alert.ro || alert.roName || '').toLowerCase();
      const omc = String(alert.omcName || alert.omc || '').toLowerCase();
      const type = String(alert.type || '').toLowerCase();
      const issue = String(alert.issue || '').toLowerCase();
      const severity = String(alert.severity || '').toLowerCase();
      const status = String(alert.status || '').toLowerCase();
      const date = String(alert.date || alert.time || '').toLowerCase();

      const isBoilerplate = /^(s|p|sb|bp|2t|2p)$/i.test(searchString);

      if (omc && (omc === searchString || omc.includes(searchString) || (searchString.length >= 2 && omc.startsWith(searchString)))) {
        matchesSearch = true;
      } else if (cleanNum && /^\d+$/.test(cleanNum) && (cleanNum === alertId || cleanNum === mId || cleanNum === mName || mName.endsWith(cleanNum))) {
        matchesSearch = true;
      } else if (matchesMachineQuery(mId, searchString) || matchesMachineQuery(mName, searchString)) {
        matchesSearch = true;
      } else if (mId === searchString || mName === searchString || (!isBoilerplate && (mId.includes(searchString) || mName.includes(searchString))) || ro.includes(searchString) || type.includes(searchString) || issue.includes(searchString) || severity.includes(searchString) || status.includes(searchString) || date.includes(searchString)) {
        matchesSearch = true;
      } else {
        const searchWords = searchString.split(/\s+/).filter(Boolean);
        matchesSearch = searchWords.every(word => {
          const cw = word.replace(/^(?:#|id[:\s_-]*)/i, '').trim();
          const isBp = /^(s|p|sb|bp|2t|2p)$/i.test(word);
          if (omc && (omc.includes(word) || (word.length >= 2 && omc.startsWith(word)))) return true;
          if (cw && /^\d+$/.test(cw) && (cw === alertId || cw === mId || cw === mName || mName.endsWith(cw))) return true;
          if (matchesMachineQuery(mId, word) || matchesMachineQuery(mName, word) || (cw && (matchesMachineQuery(mId, cw) || matchesMachineQuery(mName, cw)))) return true;
          return (mId === word || mName === word || (!isBp && (mId.includes(word) || mName.includes(word)))) || ro.includes(word) || type.includes(word) || issue.includes(word) || severity.includes(word) || status.includes(word);
        });
      }
    }

    // 2. Check Active Card Filter
    let matchesFilter = true;
    if (activeFilter === 'All') {
      matchesFilter = alert.status !== 'Resolved';
    } else if (activeFilter === 'Danger' || activeFilter === 'High' || activeFilter === 'Critical') {
      matchesFilter = (alert.severity === 'Danger' || alert.severity === 'Critical' || alert.severity === 'High') && alert.status !== 'Resolved';
    } else if (activeFilter === 'Low' || activeFilter === 'Info') {
      matchesFilter = (alert.severity === 'Low' || alert.severity === 'Info') && alert.status !== 'Resolved';
    } else if (activeFilter === 'Neutral') {
      // Neutral range produces ZERO alerts as configured
      matchesFilter = false;
    } else if (activeFilter === 'Resolved') {
      matchesFilter = alert.status === 'Resolved';
    }

    // 3. Check RO Filter
    const matchesRo = roFilter === 'All' || 
      String(alert.ro || alert.roName || '').toLowerCase() === String(roFilter).toLowerCase() ||
      String(alert.ro_id || alert.roId || '') === String(roFilter);

    // 4. Check Machine Filter
    const matchesMachine = machineFilter === 'All' || 
      String(alert.machineId).toLowerCase() === String(machineFilter).toLowerCase() ||
      String(alert.machineName || '').toLowerCase() === String(machineFilter).toLowerCase();

    return matchesSearch && matchesFilter && matchesRo && matchesMachine;
  });

  // Pagination logic (10 per page limit)
  const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAlerts = filteredAlerts.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeFilter, machineFilter, roFilter]);

  // Calculate stats for Summary Cards (scoped to selected RO if roFilter is active)
  const roScopedAlerts = alerts.filter(a => {
    if (roFilter === 'All') return true;
    return String(a.ro || a.roName || '').toLowerCase() === String(roFilter).toLowerCase() ||
           String(a.ro_id || a.roId || '') === String(roFilter);
  });
  const activeAlerts = roScopedAlerts.filter(a => a.status !== 'Resolved');
  const totalAlerts = activeAlerts.length;
  const lowAlerts = activeAlerts.filter(a => a.severity === 'Low' || a.severity === 'Info').length;
  const dangerAlerts = activeAlerts.filter(a => a.severity === 'Danger' || a.severity === 'Critical' || a.severity === 'High').length;

  const uniqueRos = Array.from(new Set([
    ...allMachines.map(m => m.roName || m.ro).filter(Boolean),
    ...alerts.map(a => a.ro || a.roName).filter(Boolean)
  ])).filter(name => {
    const clean = String(name).toLowerCase().trim();
    return clean && clean !== 'unassigned' && clean !== 'hwejjk' && clean !== 'iocl';
  });

  const uniqueMachines = Array.from(new Set([
    ...allMachines.map(m => m.name || m.id),
    ...alerts.map(a => a.machineName || a.machineId)
  ])).filter(m => m && isNaN(Number(m)));

  // Helper to render type icon
  const renderAlertIcon = (type) => {
    switch (type) {
      case 'Water':
        return <Droplets size={16} color="#3b82f6" />;
      case 'Flush':
        return <Waves size={16} color="#06b6d4" />;
      case 'Temperature':
        return <Thermometer size={16} color="#ef4444" />;
      case 'Humidity':
        return <CloudRain size={16} color="#0ea5e9" />;
      case 'Odour':
        return <Wind size={16} color="#8b5cf6" />;
      default:
        return <AlertTriangle size={16} color="#f59e0b" />;
    }
  };

  // Helper to format Date & Time consistently
  const formatDateDisplay = (dateVal, timeVal) => {
    try {
      let y, m, d, time = timeVal;
      let dateStr = dateVal;

      if (dateStr && dateStr.includes(',')) {
        const parts = dateStr.split(',');
        dateStr = parts[0].trim();
        if (!time || time === '--' || time === dateVal) {
          time = parts[1].trim();
        }
      }

      if (dateStr && dateStr.includes('/')) {
        const parts = dateStr.split('/');
        d = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10) - 1;
        y = parseInt(parts[2], 10);
      } else if (dateStr && dateStr.includes('-')) {
        const parts = dateStr.split('-');
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10) - 1;
        d = parseInt(parts[2], 10);
      }

      if (y && m !== undefined && !isNaN(m) && d) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dayFormatted = String(d).padStart(2, '0');
        const formattedDate = `${dayFormatted} ${monthNames[m]} ${y}`;
        const cleanTime = (time && time !== '--' && !time.includes('/')) ? time : '10:30 AM';

        return {
          formatted: formattedDate,
          sub: cleanTime
        };
      }
    } catch (e) {}

    return { 
      formatted: dateVal || 'N/A', 
      sub: timeVal || '10:30 AM' 
    };
  };

  // High-Definition PDF Export with Logos
  const handleExportPDF = () => {
    if (filteredAlerts.length === 0) {
      alert('No alerts data available to export PDF.');
      return;
    }

    const columns = ['MACHINE ID', 'DATE & TIME', 'RO NAME', 'SEVERITY', 'SENSOR ALERT'];
    const rows = filteredAlerts.map(alert => {
      const dateInfo = formatDateDisplay(alert.rawDate || alert.date || alert.time, alert.rawTime || alert.time);
      const displayMac = (!isNaN(Number(alert.machineId))
        ? (allMachines.find(m => String(m.id) === String(alert.machineId) || String(m.db_id) === String(alert.machineId))?.name || alert.machineName || alert.machineId)
        : (alert.machineName || alert.machineId));
      return [
        displayMac || 'Machine',
        `${dateInfo.formatted} (${dateInfo.sub})`,
        alert.ro || alert.roName || '-',
        alert.severity || 'Low',
        alert.issue || alert.message || 'Telemetry Alert'
      ];
    });

    exportToPDF(
      'System Telemetry Alerts Report',
      columns,
      rows,
      {
        machineName: machineFilter !== 'All' ? machineFilter : 'All Machines',
        dateRange: `Severity Filter: ${activeFilter}`,
        generatedBy: 'SuperAdmin (9284188705)'
      }
    );
  };

  return (
    <div style={{ padding: '0.5rem 2rem 2rem 2rem', animation: 'fadeIn 0.5s ease-in', maxWidth: '1400px', margin: '0 auto', color: 'var(--text-primary)' }}>
      
      {/* Print Specific CSS */}
      <style>{`
        @media screen {
          .print-only-table {
            display: none !important;
          }
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          .no-print {
            display: none !important;
          }
          .screen-table-body {
            display: none !important;
          }
          .print-only-table {
            display: table-row-group !important;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #cbd5e1 !important;
            padding: 8px !important;
          }
        }
      `}</style>

      {/* Corporate Print Header with Logos */}
      <PrintHeader 
        title="SYSTEM TELEMETRY ALERTS REPORT"
        machineName={machineFilter !== 'All' ? machineFilter : 'All Machines'}
        dateRange={`Severity: ${activeFilter}`}
      />

      {/* Header */}
      <div className="no-print" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)', margin: '0 0 0.5rem 0', flexWrap: 'wrap' }}>
            <Bell color="#f59e0b" size={32} />
            Live System Alerts
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.45rem', 
              fontSize: '0.75rem', 
              padding: '0.2rem 0.65rem', 
              borderRadius: '9999px', 
              background: 'rgba(239, 68, 68, 0.1)', 
              color: '#ef4444', 
              border: '1px solid rgba(239, 68, 68, 0.25)', 
              fontWeight: '700',
              letterSpacing: '0.05em'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', boxShadow: '0 0 6px #ef4444' }}></span>
              LIVE MONITORING
            </span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Active real-time telemetry alerts for Temperature, Humidity, Odour (NH3), and Water Level. Auto-updates every 10 seconds.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={handleExportPDF} 
            title="Export High-Definition PDF Report with Logos"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--surface-bg)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
          >
            <Download size={16} color="#ef4444" /> PDF
          </button>
        </div>
      </div>

      {/* Summary Cards Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Card 1: Total Alerts */}
        <div 
          onClick={() => {
            setActiveFilter('All');
            setCurrentPage(1);
          }}
          style={{ 
            background: activeFilter === 'All' ? 'rgba(139, 92, 246, 0.08)' : 'var(--surface-bg)', 
            border: activeFilter === 'All' ? '2px solid #8b5cf6' : '1px solid var(--border-color)', 
            borderRadius: '12px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', 
            boxShadow: activeFilter === 'All' ? '0 4px 12px rgba(139, 92, 246, 0.15)' : '0 2px 4px rgba(0, 0, 0, 0.04)', 
            cursor: 'pointer', transition: 'all 0.2s', userSelect: 'none'
          }}
        >
          <div style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', padding: '1rem', borderRadius: '50%' }}>
            <Activity size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Total Alerts</p>
              {activeFilter === 'All' && (
                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#8b5cf6', background: 'rgba(139,92,246,0.12)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Active</span>
              )}
            </div>
            <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{totalAlerts}</h2>
          </div>
        </div>

        {/* Card 2: Low Alerts */}
        <div 
          onClick={() => {
            setActiveFilter(prev => prev === 'Low' ? 'All' : 'Low');
            setCurrentPage(1);
          }}
          style={{ 
            background: activeFilter === 'Low' ? 'rgba(59, 130, 246, 0.08)' : 'var(--surface-bg)', 
            border: activeFilter === 'Low' ? '2px solid #3b82f6' : '1px solid rgba(59, 130, 246, 0.2)', 
            borderRadius: '12px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', 
            boxShadow: activeFilter === 'Low' ? '0 4px 12px rgba(59, 130, 246, 0.15)' : '0 2px 4px rgba(59, 130, 246, 0.04)', 
            cursor: 'pointer', transition: 'all 0.2s', userSelect: 'none'
          }}
        >
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '1rem', borderRadius: '50%' }}>
            <AlertTriangle size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Low</p>
              {activeFilter === 'Low' && (
                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#2563eb', background: 'rgba(59,130,246,0.12)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Active</span>
              )}
            </div>
            <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 'bold', color: '#3b82f6' }}>{lowAlerts}</h2>
          </div>
        </div>

        {/* Card 3: Danger Alerts */}
        <div 
          onClick={() => {
            setActiveFilter(prev => (prev === 'Danger' || prev === 'High') ? 'All' : 'Danger');
            setCurrentPage(1);
          }}
          style={{ 
            background: (activeFilter === 'Danger' || activeFilter === 'High') ? 'rgba(239, 68, 68, 0.08)' : 'var(--surface-bg)', 
            border: (activeFilter === 'Danger' || activeFilter === 'High') ? '2px solid #ef4444' : '1px solid rgba(239, 68, 68, 0.2)', 
            borderRadius: '12px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', 
            boxShadow: (activeFilter === 'Danger' || activeFilter === 'High') ? '0 4px 12px rgba(239, 68, 68, 0.15)' : '0 2px 4px rgba(239, 68, 68, 0.04)', 
            cursor: 'pointer', transition: 'all 0.2s', userSelect: 'none'
          }}
        >
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '50%' }}>
            <ShieldAlert size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Danger</p>
              {(activeFilter === 'Danger' || activeFilter === 'High') && (
                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#ef4444', background: 'rgba(239,68,68,0.12)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Active</span>
              )}
            </div>
            <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 'bold', color: '#ef4444' }}>{dangerAlerts}</h2>
          </div>
        </div>

      </div>

      {/* Search and Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search alerts by Machine ID, RO Name, Sensor, or Severity..." 
            autoComplete="off"
            style={{ 
              width: '100%', 
              padding: '0.85rem 2.5rem 0.85rem 3rem', 
              borderRadius: '0.5rem', 
              border: '1px solid var(--border-color)', 
              backgroundColor: 'var(--surface-bg)', 
              color: 'var(--text-primary)', 
              outline: 'none',
              fontSize: '0.9rem'
            }} 
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>


        {/* RO Filter */}
        {uniqueRos.length > 0 && (
          <select 
            value={roFilter} 
            onChange={(e) => setRoFilter(e.target.value)}
            style={{ 
              padding: '0.85rem 1.25rem', 
              borderRadius: '0.5rem', 
              border: '1px solid var(--border-color)', 
              backgroundColor: 'var(--surface-bg)', 
              color: 'var(--text-primary)', 
              outline: 'none', 
              cursor: 'pointer', 
              minWidth: '150px',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}
          >
            <option value="All">All ROs</option>
            {uniqueRos.map(rName => (
              <option key={rName} value={rName}>{rName}</option>
            ))}
          </select>
        )}

        {/* Machine Filter */}
        <select 
          value={machineFilter} 
          onChange={(e) => setMachineFilter(e.target.value)}
          style={{ 
            padding: '0.85rem 1.25rem', 
            borderRadius: '0.5rem', 
            border: '1px solid var(--border-color)', 
            backgroundColor: 'var(--surface-bg)', 
            color: 'var(--text-primary)', 
            outline: 'none', 
            cursor: 'pointer', 
            minWidth: '160px',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}
        >
          <option value="All">All Machines</option>
          {uniqueMachines.map(id => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>
      </div>

      {/* Alerts Table */}
      <div style={{ background: 'var(--surface-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', backgroundColor: 'rgba(0,0,0,0.02)' }}>
              <th style={{ padding: '1.25rem 1.5rem', fontWeight: '700' }}>MACHINE ID</th>
              <th style={{ padding: '1.25rem 1.5rem', fontWeight: '700' }}>DATE & TIME</th>
              <th style={{ padding: '1.25rem 1.5rem', fontWeight: '700' }}>RO NAME</th>
              <th style={{ padding: '1.25rem 1.5rem', fontWeight: '700', textAlign: 'center' }}>SEVERITY</th>
              <th style={{ padding: '1.25rem 1.5rem', fontWeight: '700' }}>SENSOR ALERT</th>
            </tr>
          </thead>
          <tbody className="screen-table-body">
            {currentAlerts.length > 0 ? currentAlerts.map((alert, idx) => {
              const dateInfo = formatDateDisplay(alert.rawDate || alert.date || alert.time, alert.rawTime || alert.time);
              const sev = alert.severity || 'Low';
              const sevColor = (sev === 'Danger' || sev === 'Critical' || sev === 'High') ? '#ef4444' :
                               (sev === 'Medium' || sev === 'Warning') ? '#f59e0b' : '#3b82f6';
              const displayMac = (!isNaN(Number(alert.machineId))
                ? (allMachines.find(m => String(m.id) === String(alert.machineId) || String(m.db_id) === String(alert.machineId))?.name || alert.machineName || alert.machineId)
                : (alert.machineName || alert.machineId));
              return (
                <tr 
                  key={idx} 
                  style={{ 
                    borderBottom: '1px solid var(--border-color)', 
                    transition: 'background 0.2s', 
                    backgroundColor: alert.status === 'Open' ? (alert.severity === 'Danger' || alert.severity === 'High' || alert.severity === 'Critical' ? 'rgba(239, 68, 68, 0.04)' : alert.severity === 'Low' || alert.severity === 'Info' ? 'rgba(59, 130, 246, 0.04)' : 'transparent') : 'transparent' 
                  }}
                >
                  <td style={{ padding: '1.25rem 1.5rem', fontWeight: 'bold', color: '#8b5cf6' }}>{displayMac}</td>
                  <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        {dateInfo.formatted}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {dateInfo.sub}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-primary)', fontWeight: '600' }}>{alert.ro}</td>
                  <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '0.25rem 0.65rem', 
                      borderRadius: '999px', 
                      background: `${sevColor}18`, 
                      color: sevColor,
                      border: `1px solid ${sevColor}33`,
                      fontWeight: '700', 
                      fontSize: '0.75rem',
                      display: 'inline-block'
                    }}>
                      {sev}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {renderAlertIcon(alert.type)}
                      <span>{alert.issue}</span>
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  {activeFilter === 'Neutral' 
                    ? 'No Alerts — Neutral operating range is normal & safe (Alerts trigger only for Low and Danger).' 
                    : (searchTerm ? `No Alerts found matching "${searchTerm}"` : 'No active alerts found')}
                </td>
              </tr>
            )}
          </tbody>

          {/* Full dataset for @media print (All PDF & Print Records) */}
          <tbody className="print-only-table">
            {filteredAlerts.length > 0 ? filteredAlerts.map((alert, idx) => {
              const dateInfo = formatDateDisplay(alert.rawDate || alert.date || alert.time, alert.rawTime || alert.time);
              const displayMac = (!isNaN(Number(alert.machineId))
                ? (allMachines.find(m => String(m.id) === String(alert.machineId) || String(m.db_id) === String(alert.machineId))?.name || alert.machineName || alert.machineId)
                : (alert.machineName || alert.machineId));
              return (
                <tr key={`print-alert-${idx}`} style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#1e293b', fontSize: '9pt' }}>{displayMac}</td>
                  <td style={{ padding: '8px 12px', color: '#334155', fontSize: '9pt' }}>{dateInfo.formatted} ({dateInfo.sub})</td>
                  <td style={{ padding: '8px 12px', color: '#334155', fontSize: '9pt' }}>{alert.ro}</td>
                  <td style={{ padding: '8px 12px', color: (alert.severity === 'Danger' || alert.severity === 'Critical' || alert.severity === 'High') ? '#e11d48' : '#2563eb', fontWeight: 'bold', fontSize: '9pt', textAlign: 'center' }}>{alert.severity || 'Low'}</td>
                  <td style={{ padding: '8px 12px', color: '#1e293b', fontSize: '9pt' }}>{alert.issue}</td>
                </tr>
              );
            }) : null}
          </tbody>
        </table>
        
        {/* Pagination Controls */}
        <div className="no-print" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', borderTop: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.01)' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={{ padding: '0.5rem 1rem', border: '1px solid var(--border-color)', borderRadius: '6px', background: currentPage === 1 ? 'var(--border-color)' : 'var(--surface-bg)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: 'var(--text-primary)', fontWeight: '500' }}
            >
              Previous
            </button>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem', fontWeight: '600', color: 'var(--text-primary)' }}>
              {currentPage} / {Math.max(totalPages, 1)}
            </div>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              style={{ padding: '0.5rem 1rem', border: '1px solid var(--border-color)', borderRadius: '6px', background: currentPage === totalPages || totalPages === 0 ? 'var(--border-color)' : 'var(--surface-bg)', cursor: currentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer', color: 'var(--text-primary)', fontWeight: '500' }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Print Footer with Organization & Signature Credentials */}
      <PrintFooter />

    </div>
  );
};

export default Alerts;
