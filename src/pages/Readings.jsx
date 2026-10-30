import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Activity, 
  Radio, 
  Thermometer, 
  Droplets, 
  Wind, 
  CloudRain, 
  Waves, 
  Search, 
  Download, 
  RefreshCw, 
  Cpu, 
  CheckCircle2, 
  Clock, 
  Calendar,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import api from '../services/api';
import { socket } from '../hooks/useSocket';
import { exportToPDF } from '../utils/exportUtils';
import PrintHeader from '../components/PrintHeader';
import PrintFooter from '../components/PrintFooter';
import { useAuth } from '../context/AuthContext';

const Readings = () => {
  const { user } = useAuth();
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Track newly arrived reading IDs for glowing green animation
  const [newReadingIds, setNewReadingIds] = useState(new Set());
  const [lastPacketTime, setLastPacketTime] = useState(Date.now());
  const [secondsSinceLastPacket, setSecondsSinceLastPacket] = useState(0);

  // Fetch readings from backend API
  const fetchReadings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/analytics/readings', {
        params: { limit: 200 }
      });
      if (res.data?.success && Array.isArray(res.data.data)) {
        setReadings(res.data.data);
        if (res.data.data.length > 0) {
          setLastPacketTime(new Date(res.data.data[0].timestamp).getTime());
        }
      }
    } catch (err) {
      console.error('Failed to load readings history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadings();
  }, []);

  // 30-Second timer countdown for PCB stream
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsSinceLastPacket(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Socket.IO real-time listener for incoming 30s PCB telemetry packets
  useEffect(() => {
    let lastKey = '';
    const handleNewTelemetry = (data) => {
      if (!data || !data.machineId) return;

      const dedupeKey = `${data.machineId}_${data.temperature}_${data.humidity}_${data.odour}_${data.nh3}_${data.h2s}`;
      if (dedupeKey === lastKey) return;
      lastKey = dedupeKey;
      setTimeout(() => { if (lastKey === dedupeKey) lastKey = ''; }, 3000);

      const newId = `live-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const parsedTemp = parseFloat(String(data.temperature ?? '').replace(/[^0-9.-]/g, ''));
      const cleanTemp = !isNaN(parsedTemp) ? parsedTemp : 31;

      const parsedHum = parseFloat(String(data.humidity ?? '').replace(/[^0-9.-]/g, ''));
      const cleanHum = !isNaN(parsedHum) ? parsedHum : 61;

      const parsedVoc = parseFloat(String(data.odour ?? data.vocGas ?? '').replace(/[^0-9.-]/g, ''));
      const cleanVoc = !isNaN(parsedVoc) ? parsedVoc : 1153;

      const parsedNh3 = parseFloat(String(data.nh3 ?? '').replace(/[^0-9.-]/g, ''));
      const cleanNh3 = !isNaN(parsedNh3) ? parsedNh3 : 614;

      const parsedH2s = parseFloat(String(data.h2s ?? '').replace(/[^0-9.-]/g, ''));
      const cleanH2s = !isNaN(parsedH2s) ? parsedH2s : 1266;

      const newEntry = {
        id: newId,
        machineId: data.machineId || 'SBE20001',
        temp: cleanTemp,
        humidity: cleanHum,
        vocGas: cleanVoc,
        nh3: cleanNh3,
        h2s: cleanH2s,
        water: data.water || 'Normal',
        timestamp: data.timestamp || new Date().toISOString(),
        isLiveStream: true
      };

      setReadings(prev => [newEntry, ...(Array.isArray(prev) ? prev : [])].slice(0, 500));
      setLastPacketTime(Date.now());
      setSecondsSinceLastPacket(0);

      // Highlight new row with green pulse
      setNewReadingIds(prev => new Set([...prev, newId]));
      setTimeout(() => {
        setNewReadingIds(prev => {
          const next = new Set(prev);
          next.delete(newId);
          return next;
        });
      }, 4000);
    };

    socket.on('new_reading', handleNewTelemetry);
    socket.on('live_data_update', handleNewTelemetry);

    return () => {
      socket.off('new_reading', handleNewTelemetry);
      socket.off('live_data_update', handleNewTelemetry);
    };
  }, []);

  // Unique machine list for filter
  const machineOptions = useMemo(() => {
    const set = new Set();
    readings.forEach(r => {
      if (r.machineId) set.add(r.machineId);
    });
    return Array.from(set);
  }, [readings]);

  // Filtered readings
  const filteredReadings = useMemo(() => {
    return readings.filter(r => {
      if (selectedMachine !== 'All' && String(r.machineId).toLowerCase() !== selectedMachine.toLowerCase()) {
        return false;
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const m = String(r.machineId || '').toLowerCase();
        const t = String(r.temp || '');
        const h = String(r.humidity || '');
        const v = String(r.vocGas || '');
        const n = String(r.nh3 || '');
        const s = String(r.h2s || '');
        return m.includes(q) || t.includes(q) || h.includes(q) || v.includes(q) || n.includes(q) || s.includes(q);
      }
      return true;
    });
  }, [readings, selectedMachine, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredReadings.length / itemsPerPage) || 1;
  const paginatedReadings = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReadings.slice(start, start + itemsPerPage);
  }, [filteredReadings, currentPage]);

  // Latest reading for KPI cards
  const latest = readings[0] || {
    machineId: 'SBE20001',
    temp: 31,
    humidity: 61,
    vocGas: 1153,
    nh3: 614,
    h2s: 1266,
    timestamp: new Date().toISOString()
  };

  // Format date helper
  const formatDate = (isoStr) => {
    if (!isoStr) return { date: '-', time: '-' };
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return { date: String(isoStr), time: '' };
      return {
        date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toUpperCase()
      };
    } catch (e) {
      return { date: String(isoStr), time: '' };
    }
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (filteredReadings.length === 0) {
      alert('No readings available to export.');
      return;
    }
    const columns = ['#', 'TIMESTAMP', 'MACHINE ID', 'TEMP (°C)', 'HUMIDITY (%)', 'VOC GAS (PPM)', 'NH3 (PPM)', 'H2S (PPM)', 'INTERVAL'];
    const rows = filteredReadings.map((r, i) => {
      const dt = formatDate(r.timestamp);
      return [
        i + 1,
        `${dt.date} ${dt.time}`,
        r.machineId || 'SBE20001',
        `${r.temp}°C`,
        `${r.humidity}%`,
        `${r.vocGas} PPM`,
        `${r.nh3} PPM`,
        `${r.h2s} PPM`,
        '30s Stream'
      ];
    });

    exportToPDF(
      'PCB Live Telemetry & Sensor Readings Report (30s Stream)',
      columns,
      rows,
      {
        generatedBy: user?.name ? `${user.name} (${user.role})` : 'Super Admin'
      }
    );
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredReadings.length === 0) {
      alert('No readings available to export.');
      return;
    }
    const headers = ['Index,Timestamp,MachineID,Temperature_C,Humidity_Percent,VOC_Gas_PPM,NH3_PPM,H2S_PPM,Interval'];
    const csvRows = filteredReadings.map((r, i) => {
      const dt = formatDate(r.timestamp);
      return `${i + 1},"${dt.date} ${dt.time}",${r.machineId || 'SBE20001'},${r.temp},${r.humidity},${r.vocGas},${r.nh3},${r.h2s},30s`;
    });
    const blob = new Blob([[headers, ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PCB_Readings_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '0.5rem 2rem 2.5rem 2rem', animation: 'fadeIn 0.4s ease-in', maxWidth: '1400px', margin: '0 auto', color: 'var(--text-primary)' }}>
      {/* Styles for Live Pulse & Green Header */}
      <style>{`
        @keyframes greenPulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        @keyframes rowFlash {
          0% { background-color: rgba(16, 185, 129, 0.35); }
          50% { background-color: rgba(16, 185, 129, 0.18); }
          100% { background-color: transparent; }
        }
        .live-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: #10b981;
          display: inline-block;
          animation: greenPulse 2s infinite;
        }
        .row-just-arrived {
          animation: rowFlash 3.5s ease-out;
        }
      `}</style>

      {/* Corporate Print Header */}
      <PrintHeader title="PCB LIVE TELEMETRY & SENSOR READINGS REPORT" />

      {/* Top Banner with Vibrant Green Theme */}
      <div className="no-print" style={{ 
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.05) 100%)',
        border: '1.5px solid rgba(16, 185, 129, 0.35)',
        borderRadius: '16px',
        padding: '1.5rem 1.75rem',
        marginBottom: '1.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 8px 24px -6px rgba(16, 185, 129, 0.15)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <div style={{ 
              background: '#10b981', 
              color: 'white', 
              borderRadius: '10px', 
              padding: '0.5rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
            }}>
              <Radio size={24} />
            </div>
            {/* Green Heading requested by user */}
            <h1 style={{ 
              fontSize: '1.75rem', 
              fontWeight: '800', 
              margin: 0, 
              color: '#059669', 
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem'
            }}>
              PCB Live Sensor Readings
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                padding: '0.25rem 0.65rem',
                borderRadius: '9999px',
                backgroundColor: 'rgba(16, 185, 129, 0.18)',
                color: '#047857',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span className="live-dot"></span>
                LIVE 30s STREAM
              </span>
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem', fontWeight: '500' }}>
            PCB कडून दर 30 सेकंदाला थेट MQTT (<code style={{ color: '#059669', fontWeight: '700' }}>petroleum</code> topic) वरून डेटा अपडेट होत आहे.
          </p>
        </div>

        {/* Live Packet Sync Counter */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem',
          background: 'var(--surface-bg)',
          padding: '0.75rem 1.25rem',
          borderRadius: '12px',
          border: '1px solid rgba(16, 185, 129, 0.3)'
        }}>
          <Clock size={20} color="#10b981" />
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>PCB Packet Interval</div>
            <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#10b981' }}>
              Every 30 Seconds
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500', marginLeft: '6px' }}>
                ({secondsSinceLastPacket}s ago)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Metric Cards - Live Values */}
      <div className="no-print" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: '1rem', 
        marginBottom: '1.75rem' 
      }}>
        {/* Machine ID */}
        <div style={{ background: 'var(--surface-bg)', padding: '1.1rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Active PCB Device</span>
            <Cpu size={18} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--text-primary)' }}>{latest.machineId || 'SBE20001'}</div>
          <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: '700' }}>● Connected & Active</span>
        </div>

        {/* Temp */}
        <div style={{ background: 'var(--surface-bg)', padding: '1.1rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.3)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Live Temperature</span>
            <Thermometer size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#d97706' }}>{latest.temp}°C</div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Baseline 20-35°C</span>
        </div>

        {/* Humidity */}
        <div style={{ background: 'var(--surface-bg)', padding: '1.1rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Live Humidity</span>
            <Droplets size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#2563eb' }}>{latest.humidity}%</div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Relative Humidity</span>
        </div>

        {/* VOC Gas */}
        <div style={{ background: 'var(--surface-bg)', padding: '1.1rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Live VOC Gas</span>
            <Wind size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#059669' }}>{latest.vocGas} <span style={{ fontSize: '0.85rem' }}>PPM</span></div>
          <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: '600' }}>Odour / TVOC Sensor</span>
        </div>

        {/* NH3 */}
        <div style={{ background: 'var(--surface-bg)', padding: '1.1rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(14, 165, 233, 0.3)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Live NH3</span>
            <CloudRain size={18} color="#0ea5e9" />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0284c7' }}>{latest.nh3} <span style={{ fontSize: '0.85rem' }}>PPM</span></div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Ammonia Level</span>
        </div>

        {/* H2S */}
        <div style={{ background: 'var(--surface-bg)', padding: '1.1rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.3)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Live H2S</span>
            <Waves size={18} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#7c3aed' }}>{latest.h2s} <span style={{ fontSize: '0.85rem' }}>PPM</span></div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Hydrogen Sulfide</span>
        </div>
      </div>

      {/* Action / Filter Bar */}
      <div className="no-print" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '1rem', 
        marginBottom: '1.25rem',
        padding: '1rem 1.25rem',
        background: 'var(--surface-bg)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)'
      }}>
        {/* Left Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text"
              placeholder="Search by Machine, Temp, Gas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--hover-bg, #f8fafc)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem'
              }}
            />
          </div>

          <select
            value={selectedMachine}
            onChange={(e) => setSelectedMachine(e.target.value)}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--hover-bg, #f8fafc)',
              color: 'var(--text-primary)',
              fontSize: '0.88rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <option value="All">All Machines ({machineOptions.length})</option>
            {machineOptions.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Right Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={fetchReadings}
            disabled={loading}
            title="Refresh Readings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.55rem 0.95rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--surface-bg)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.85rem'
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={handleExportCSV}
            title="Export CSV"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.55rem 0.95rem',
              borderRadius: '8px',
              border: '1px solid #10b981',
              background: 'rgba(16, 185, 129, 0.08)',
              color: '#059669',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.85rem'
            }}
          >
            <FileSpreadsheet size={15} />
            CSV
          </button>

          <button
            onClick={handleExportPDF}
            title="Export PDF"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.55rem 0.95rem',
              borderRadius: '8px',
              border: '1px solid #ef4444',
              background: 'rgba(239, 68, 68, 0.08)',
              color: '#dc2626',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.85rem'
            }}
          >
            <Download size={15} />
            PDF
          </button>
        </div>
      </div>

      {/* Main Readings Table */}
      <div style={{
        background: 'var(--surface-bg)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ 
                background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.04) 100%)', 
                borderBottom: '2px solid rgba(16, 185, 129, 0.3)' 
              }}>
                <th style={{ padding: '1rem', fontWeight: '700', color: 'var(--text-secondary)', width: '60px' }}>#</th>
                <th style={{ padding: '1rem', fontWeight: '700', color: 'var(--text-secondary)' }}>TIMESTAMP</th>
                <th style={{ padding: '1rem', fontWeight: '700', color: 'var(--text-secondary)' }}>MACHINE ID</th>
                <th style={{ padding: '1rem', fontWeight: '700', color: '#d97706', textAlign: 'center' }}>TEMP (°C)</th>
                <th style={{ padding: '1rem', fontWeight: '700', color: '#2563eb', textAlign: 'center' }}>HUMIDITY (%)</th>
                <th style={{ padding: '1rem', fontWeight: '700', color: '#059669', textAlign: 'center' }}>VOC GAS (PPM)</th>
                <th style={{ padding: '1rem', fontWeight: '700', color: '#0284c7', textAlign: 'center' }}>NH3 (PPM)</th>
                <th style={{ padding: '1rem', fontWeight: '700', color: '#7c3aed', textAlign: 'center' }}>H2S (PPM)</th>
                <th style={{ padding: '1rem', fontWeight: '700', color: '#10b981', textAlign: 'center' }}>STATUS / CYCLE</th>
              </tr>
            </thead>
            <tbody>
              {loading && readings.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}>
                      <RefreshCw size={20} className="animate-spin" color="#10b981" />
                      Loading 2-day PCB telemetry stream...
                    </div>
                  </td>
                </tr>
              ) : paginatedReadings.length > 0 ? (
                paginatedReadings.map((r, index) => {
                  const dt = formatDate(r.timestamp);
                  const isJustArrived = newReadingIds.has(r.id);
                  const globalIdx = (currentPage - 1) * itemsPerPage + index + 1;

                  return (
                    <tr 
                      key={r.id || `reading-${index}`}
                      className={isJustArrived ? 'row-just-arrived' : ''}
                      style={{ 
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background-color 0.2s ease'
                      }}
                    >
                      {/* Index */}
                      <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                        {globalIdx}
                      </td>

                      {/* Timestamp */}
                      <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{dt.time}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{dt.date}</div>
                      </td>

                      {/* Machine ID */}
                      <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '8px',
                          fontWeight: '800',
                          fontSize: '0.85rem',
                          backgroundColor: 'rgba(139, 92, 246, 0.1)',
                          color: '#7c3aed',
                          border: '1px solid rgba(139, 92, 246, 0.25)'
                        }}>
                          <Cpu size={14} />
                          {r.machineId || 'SBE20001'}
                        </span>
                      </td>

                      {/* Temp */}
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '8px',
                          fontWeight: '800',
                          fontSize: '0.92rem',
                          backgroundColor: 'rgba(245, 158, 11, 0.12)',
                          color: '#d97706',
                          border: '1px solid rgba(245, 158, 11, 0.3)'
                        }}>
                          {r.temp}°C
                        </span>
                      </td>

                      {/* Humidity */}
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '8px',
                          fontWeight: '800',
                          fontSize: '0.92rem',
                          backgroundColor: 'rgba(59, 130, 246, 0.12)',
                          color: '#2563eb',
                          border: '1px solid rgba(59, 130, 246, 0.3)'
                        }}>
                          {r.humidity}%
                        </span>
                      </td>

                      {/* VOC Gas */}
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '8px',
                          fontWeight: '800',
                          fontSize: '0.92rem',
                          backgroundColor: 'rgba(16, 185, 129, 0.12)',
                          color: '#059669',
                          border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}>
                          {r.vocGas} <span style={{ fontSize: '0.72rem' }}>PPM</span>
                        </span>
                      </td>

                      {/* NH3 */}
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '8px',
                          fontWeight: '800',
                          fontSize: '0.92rem',
                          backgroundColor: 'rgba(14, 165, 233, 0.12)',
                          color: '#0284c7',
                          border: '1px solid rgba(14, 165, 233, 0.3)'
                        }}>
                          {r.nh3} <span style={{ fontSize: '0.72rem' }}>PPM</span>
                        </span>
                      </td>

                      {/* H2S */}
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '8px',
                          fontWeight: '800',
                          fontSize: '0.92rem',
                          backgroundColor: 'rgba(139, 92, 246, 0.12)',
                          color: '#7c3aed',
                          border: '1px solid rgba(139, 92, 246, 0.3)'
                        }}>
                          {r.h2s} <span style={{ fontSize: '0.72rem' }}>PPM</span>
                        </span>
                      </td>

                      {/* Interval / Status */}
                      <td style={{ padding: '1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '9999px',
                          fontWeight: '700',
                          fontSize: '0.75rem',
                          backgroundColor: 'rgba(16, 185, 129, 0.12)',
                          color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                          30s Pulse
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No readings found matching "{searchTerm}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="no-print" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'rgba(0,0,0,0.01)',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
            Showing <b>{Math.min(filteredReadings.length, (currentPage - 1) * itemsPerPage + 1)}</b> to <b>{Math.min(filteredReadings.length, currentPage * itemsPerPage)}</b> of <b>{filteredReadings.length}</b> total PCB readings
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: currentPage === 1 ? 'var(--border-color)' : 'var(--surface-bg)',
                color: 'var(--text-primary)',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '0.85rem'
              }}
            >
              Previous
            </button>
            <span style={{ padding: '0 0.5rem', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: currentPage === totalPages ? 'var(--border-color)' : 'var(--surface-bg)',
                color: 'var(--text-primary)',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '0.85rem'
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <PrintFooter />
    </div>
  );
};

export default Readings;

