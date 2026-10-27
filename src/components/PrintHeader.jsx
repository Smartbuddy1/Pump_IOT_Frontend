import React from 'react';

const PrintHeader = ({ title = 'Telemetry Report', subtitle, clientName, roName, machineName, dateRange }) => {
  const currentDate = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
  const reportId = `RPT-${Math.floor(10000000 + Math.random() * 90000000)}`;

  return (
    <div className="print-only" style={{ display: 'none', width: '100%', marginBottom: '20px', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        {/* Left Side: Client / OMC Logo */}
        <div style={{ width: '160px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
          <img src="/logo_left.jpeg" alt="Client Logo" style={{ maxHeight: '60px', maxWidth: '150px', objectFit: 'contain' }} />
        </div>

        {/* Center: Title & Details */}
        <div style={{ textAlign: 'center', flexGrow: 1, padding: '0 15px' }}>
          <h2 style={{ margin: '0 0 4px 0', color: '#059669', fontSize: '16pt', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            SMARTBUDDY PETROLEUM IOT PLATFORM
          </h2>
          <h3 style={{ margin: '0 0 6px 0', color: '#1e293b', fontSize: '13pt', fontWeight: '700', textTransform: 'uppercase' }}>
            {title}
          </h3>
          <div style={{ color: '#475569', fontSize: '9pt', fontWeight: '600', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {clientName && clientName !== 'All' && <span>OMC: <strong style={{ color: '#0f172a' }}>{clientName}</strong></span>}
            {roName && roName !== 'All' && <span>RO: <strong style={{ color: '#0f172a' }}>{roName}</strong></span>}
            {machineName && machineName !== 'All' && <span>Machine: <strong style={{ color: '#0f172a' }}>{machineName}</strong></span>}
            {dateRange && <span>Period: <strong style={{ color: '#0f172a' }}>{dateRange}</strong></span>}
          </div>
          <div style={{ fontSize: '8pt', color: '#64748b', marginTop: '4px', fontWeight: '500' }}>
            Report ID: <span style={{ fontFamily: 'monospace' }}>{reportId}</span> &nbsp;|&nbsp; Generated: {currentDate} &nbsp;|&nbsp; Role: SuperAdmin
          </div>
        </div>

        {/* Right Side: SmartBuddy HD Logo */}
        <div style={{ width: '160px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <img src="/logo_new.png" alt="SmartBuddy Logo" style={{ maxHeight: '60px', maxWidth: '150px', objectFit: 'contain' }} />
        </div>
      </div>
      <div style={{ borderBottom: '2.5px solid #1d4ed8' }}></div>
    </div>
  );
};

export default PrintHeader;
