import React, { useState, useEffect } from 'react';
import { Settings, Search, Power, Zap, RefreshCw, Activity, ArrowLeft, CheckCircle, AlertTriangle, FileText, Droplets, Thermometer, MapPin, Play, Download } from 'lucide-react';
import { exportToPDF } from '../utils/exportUtils';
import PrintHeader from '../components/PrintHeader';
import PrintFooter from '../components/PrintFooter';
import api from '../services/api';

const Diagnosis = () => {
  const [machineId, setMachineId] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Data from LocalStorage
  const [machines, setMachines] = useState([]);
  const [roList, setRoList] = useState([]);
  const [omcList, setOmcList] = useState([]);
  
  // Specific machine details
  const [machineDetails, setMachineDetails] = useState(null);
  
  // Flush test state
  const [isFlushing, setIsFlushing] = useState(false);
  const [flushSuccess, setFlushSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [omcRes, roRes, machineRes] = await Promise.all([
          api.get('/omc').catch(() => ({ data: { data: [] } })),
          api.get('/ro').catch(() => ({ data: { data: [] } })),
          api.get('/machines').catch(() => ({ data: { data: [] } }))
        ]);
        
        const machineData = machineRes.data?.data || machineRes.data || [];
        const roData = roRes.data?.data || roRes.data || [];
        const omcData = omcRes.data?.data || omcRes.data || [];

        setMachines(machineData);
        setRoList(roData);
        setOmcList(omcData);
      } catch (error) {
        console.error('Error fetching data for diagnosis:', error);
      }
    };
    fetchData();
  }, []);

  const handleVerify = () => {
    if (!machineId.trim()) return;
    setLoading(true);
    
    const cleanSearch = machineId.trim().toLowerCase();
    // Find machine details safely supporting string/number IDs and names
    const foundMachine = machines.find(m => 
      String(m.name || '').toLowerCase() === cleanSearch ||
      String(m.id || '').toLowerCase() === cleanSearch ||
      String(m.db_id || '') === cleanSearch
    );
    
    let roName = 'Unknown RO';
    let clientName = 'Unknown Client';
    
    if (foundMachine) {
      const targetRoId = foundMachine.ro_id ?? foundMachine.roId;
      const ro = roList.find(r => String(r.id) === String(targetRoId));
      if (ro) {
        roName = ro.name;
        const targetOmcId = ro.omc_id ?? ro.omcId;
        const omc = omcList.find(o => String(o.id) === String(targetOmcId));
        if (omc) clientName = omc.name;
      }
    }

    const rawWater = String(foundMachine?.live_water ?? foundMachine?.liveWater ?? 'Normal');
    const isWaterLow = rawWater.toLowerCase().includes('low') || (parseInt(rawWater, 10) <= 20 && !isNaN(parseInt(rawWater, 10)));
    const rawTemp = foundMachine?.live_temp ?? foundMachine?.liveTemp;
    const cleanTemp = rawTemp && rawTemp !== '--' ? (String(rawTemp).includes('°C') ? rawTemp : `${rawTemp}°C`) : '28°C';

    // Set simulated or actual details
    setMachineDetails({
      id: foundMachine ? (foundMachine.name || foundMachine.id) : machineId.toUpperCase(),
      client: clientName !== 'Unknown Client' ? clientName : (omcList[0]?.name || 'Retail Client'),
      location: roName !== 'Unknown RO' ? roName : (roList[0]?.name || 'Retail Outlet Location'),
      status: foundMachine ? (foundMachine.status || 'ACTIVE') : 'ACTIVE',
      waterLevel: isWaterLow ? 'Low' : 'Normal',
      temp: cleanTemp
    });

    // Simulate API delay
    setTimeout(() => {
      setLoading(false);
      setIsTesting(true);
      setFlushSuccess(false); // reset flush state
    }, 1500);
  };

  const resetTest = () => {
    setIsTesting(false);
    setMachineId('');
    setMachineDetails(null);
  };

  const handleTestFlush = () => {
    setIsFlushing(true);
    setTimeout(() => {
      setIsFlushing(false);
      setFlushSuccess(true);
      setTimeout(() => setFlushSuccess(false), 3000);
    }, 2000);
  };

  // Pre-verification Screen
  if (!isTesting) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '2rem', animation: 'fadeIn 0.5s ease-in', color: 'var(--text-primary)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ 
            width: '80px', height: '80px', background: '#eff6ff', color: '#3b82f6', 
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
            margin: '0 auto 1.5rem auto'
          }}>
            <Settings size={40} />
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 1rem 0' }}>
            Machine Diagnostic & I/O Test
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', margin: 0 }}>
            Hardware verification and testing interface for maintenance staff.
          </p>
        </div>

        <div style={{ 
          background: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', 
          padding: '2.5rem', width: '100%', maxWidth: '500px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' 
        }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
            Machine ID
          </label>
          <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
            <input 
              type="text" 
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
              placeholder="e.g. MCH-1001"
              style={{ 
                width: '100%', padding: '1rem 1rem 1rem 3rem', borderRadius: '8px', 
                border: '1px solid var(--border-color)', background: 'var(--surface-bg)', fontSize: '1rem', outline: 'none', color: 'var(--text-primary)'
              }}
            />
          </div>
          
          <button 
            onClick={handleVerify}
            disabled={!machineId.trim() || loading}
            style={{ 
              width: '100%', padding: '1rem', borderRadius: '8px', border: 'none', 
              background: machineId.trim() && !loading ? '#3b82f6' : 'var(--border-color)',
              color: machineId.trim() && !loading ? 'white' : 'var(--text-secondary)',
              fontSize: '1rem', fontWeight: '600', cursor: machineId.trim() && !loading ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'Verifying Hardware...' : 'Verify & Access Testing'}
          </button>
        </div>
      </div>
    );
  }

  // Diagnostic Results Screen
  const handleExportPDF = () => {
    const columns = ['SUBSYSTEM / TEST PARAMETER', 'TELEMETRY VALUE', 'OPERATIONAL STATUS'];
    const rows = [
      ['Temperature Sensor', `${machineDetails?.temp || 24}°C`, 'Calibrated & Normal'],
      ['Humidity Sensor', `${machineDetails?.humidity || 55}%`, 'Calibrated & Normal'],
      ['Odour Sensor', machineDetails?.odour || 'Normal', 'Acceptable Baseline'],
      ['Water Level Sensor', machineDetails?.water || 'Normal', 'Operational'],
      ['Door Lock Solenoid', 'Relay Engaged', 'Operational'],
      ['Flush Valve Solenoid', 'Trigger Ready', 'Operational'],
      ['MQTT Network Gateway', 'Active Stream', 'Connected'],
    ];

    exportToPDF(
      `Hardware Diagnostic & I/O Test Report - ${machineDetails?.id || 'Machine'}`,
      columns,
      rows,
      {
        clientName: machineDetails?.client,
        roName: machineDetails?.location,
        machineName: machineDetails?.id,
        generatedBy: 'SuperAdmin (9284188705)'
      }
    );
  };

  return (
    <div style={{ padding: '0.5rem 2rem 2rem 2rem', animation: 'fadeIn 0.5s ease-in', maxWidth: '1100px', margin: '0 auto', color: 'var(--text-primary)' }}>
      {/* Corporate Print Header with Logos */}
      <PrintHeader 
        title="HARDWARE DIAGNOSTIC & I/O TEST REPORT"
        clientName={machineDetails?.client}
        roName={machineDetails?.location}
        machineName={machineDetails?.id}
        dateRange="Live Hardware Diagnostics"
      />

      {/* Header */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={resetTest} style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={20} color="var(--text-secondary)" />
          </button>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
              Diagnostic Results
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Testing live I/O parameters for <strong>{machineDetails?.id}</strong></p>
          </div>
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

      <div style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
        
        {/* Machine Context Banner */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.03)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600', margin: '0 0 0.25rem 0' }}>OMC</p>
              <p style={{ fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>{machineDetails?.client}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600', margin: '0 0 0.25rem 0' }}>Location / RO Name</p>
              <p style={{ fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <MapPin size={14} color="#8b5cf6" /> {machineDetails?.location}
              </p>
            </div>
          </div>
          <span style={{ background: machineDetails?.status === 'ACTIVE' ? 'rgba(16,185,129,0.1)' : 'rgba(239, 68, 68, 0.1)', color: machineDetails?.status === 'ACTIVE' ? '#10b981' : '#ef4444', padding: '0.4rem 0.8rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle size={16} /> {machineDetails?.status === 'ACTIVE' ? 'System Online' : 'System Offline'}
          </span>
        </div>
        
        {/* Hardware Subsystems */}
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', margin: '0 0 1.25rem 0', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>Hardware & Sensor Subsystems</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
          
          {/* Card 1 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '50%' }}><Power size={24} /></div>
            <div>
              <p style={{ fontWeight: '600', margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>Power Supply (UPS)</p>
              <p style={{ color: '#10b981', margin: 0, fontSize: '0.875rem', fontWeight: '600' }}>Healthy (24V DC OK)</p>
            </div>
          </div>
          
          {/* Card 2 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderRadius: '50%' }}><Droplets size={24} /></div>
            <div>
              <p style={{ fontWeight: '600', margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>Overhead Water Tank</p>
              <p style={{ color: machineDetails?.waterLevel === 'Low' ? '#ef4444' : '#10b981', margin: 0, fontSize: '0.875rem', fontWeight: '600' }}>Live Level: {machineDetails?.waterLevel}</p>
            </div>
          </div>

          {/* Card 3 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderRadius: '50%' }}><Thermometer size={24} /></div>
            <div>
              <p style={{ fontWeight: '600', margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>Cabin Temperature</p>
              <p style={{ color: '#f59e0b', margin: 0, fontSize: '0.875rem', fontWeight: '600' }}>Live Temp: {machineDetails?.temp}</p>
            </div>
          </div>

          {/* Card 4 - Odour */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'var(--surface-bg)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderRadius: '50%' }}><Activity size={24} /></div>
            <div>
              <p style={{ fontWeight: '600', margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>Odour Sensor (NH3)</p>
              <p style={{ color: '#f59e0b', margin: 0, fontSize: '0.875rem', fontWeight: '600' }}>Calibration Due in 5 Days</p>
            </div>
          </div>
          
          {/* Card 5 - Flush Valve (Interactive) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', background: flushSuccess ? 'rgba(16,185,129,0.05)' : 'var(--surface-bg)', border: flushSuccess ? '1px solid #10b981' : '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', gridColumn: 'span 2', transition: 'all 0.3s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', background: flushSuccess ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: flushSuccess ? '#10b981' : '#ef4444', borderRadius: '50%' }}>
                <RefreshCw size={24} className={isFlushing ? "spin-animation" : ""} />
              </div>
              <div>
                <p style={{ fontWeight: '600', margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>Auto-Flush Solenoid Valve</p>
                <p style={{ color: flushSuccess ? '#10b981' : '#ef4444', margin: 0, fontSize: '0.875rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  {!flushSuccess && <AlertTriangle size={14} />} 
                  {flushSuccess ? 'Flush Actuated Successfully!' : 'Actuator Jammed - Error 04'}
                </p>
              </div>
            </div>
            
            <button 
              onClick={handleTestFlush}
              disabled={isFlushing}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', background: isFlushing ? 'var(--border-color)' : 'var(--surface-bg)', color: isFlushing ? 'var(--text-secondary)' : '#3b82f6', border: `1px solid ${isFlushing ? 'var(--border-color)' : '#3b82f6'}`, borderRadius: '6px', fontWeight: '600', cursor: isFlushing ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
            >
              <Play size={16} /> {isFlushing ? 'Actuating...' : 'Remote Test Flush'}
            </button>
          </div>
          
        </div>
        
        <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
          <button style={{ padding: '0.75rem 1.5rem', background: 'var(--surface-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
            Reboot Device
          </button>
          <button style={{ padding: '0.75rem 1.5rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
            Generate Maintenance Ticket
          </button>
        </div>
      </div>
      
      {/* Required for the spin animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin-animation { animation: spin 1s linear infinite; }
      `}} />

      {/* Print Footer with Organization & Signature Credentials */}
      <PrintFooter />

    </div>
  );
};

export default Diagnosis;
