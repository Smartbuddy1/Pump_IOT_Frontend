import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Shield, FileText, RefreshCw, Mail, Phone, MapPin, ArrowLeft, Building2 } from 'lucide-react';
import logoImg from '../assets/e2t_logo.jpeg';

const LegalPolicy = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL path
  const getTabFromPath = (path) => {
    if (path.includes('privacy')) return 'privacy';
    if (path.includes('refund')) return 'refund';
    if (path.includes('contact')) return 'contact';
    return 'terms';
  };

  const [activeTab, setActiveTab] = useState(getTabFromPath(location.pathname));

  useEffect(() => {
    setActiveTab(getTabFromPath(location.pathname));
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const tabs = [
    { id: 'terms', label: 'Terms & Conditions', icon: FileText, path: '/terms-conditions' },
    { id: 'privacy', label: 'Privacy Policy', icon: Shield, path: '/privacy-policy' },
    { id: 'refund', label: 'Refund Policy', icon: RefreshCw, path: '/refund-policy' },
    { id: 'contact', label: 'Contact Us', icon: Mail, path: '/contact-us' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#e2e8f0',
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      padding: '2rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* Header Container */}
      <div style={{
        maxWidth: '960px',
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        paddingBottom: '1.25rem',
        borderBottom: '1px solid rgba(148, 163, 184, 0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src={logoImg} alt="SmartBuddy" style={{ height: '44px', borderRadius: '8px' }} />
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0, color: '#f8fafc', letterSpacing: '-0.02em' }}>
              SmartBuddy <span style={{ color: '#38bdf8' }}>Petroleum IoT</span>
            </h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>Enterprise Compliance & Legal Documentation</p>
          </div>
        </div>

        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            color: '#cbd5e1',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontWeight: '600',
            transition: 'all 0.2s'
          }}
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        maxWidth: '960px',
        width: '100%',
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '2rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem'
      }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              to={tab.path}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                borderRadius: '10px',
                fontSize: '0.92rem',
                fontWeight: '600',
                textDecoration: 'none',
                transition: 'all 0.2s',
                backgroundColor: isActive ? '#0284c7' : '#1e293b',
                color: isActive ? '#ffffff' : '#94a3b8',
                border: isActive ? '1px solid #38bdf8' : '1px solid #334155',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Content Body */}
      <div style={{
        maxWidth: '960px',
        width: '100%',
        backgroundColor: '#1e293b',
        borderRadius: '16px',
        padding: '2.5rem',
        border: '1px solid #334155',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
        lineHeight: 1.7
      }}>
        {activeTab === 'terms' && (
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#f8fafc', marginBottom: '1rem' }}>
              Terms & Conditions
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Last updated: October 2026</p>
            <hr style={{ borderColor: '#334155', margin: '1.5rem 0' }} />
            <h3 style={{ fontSize: '1.15rem', color: '#38bdf8', marginTop: '1.5rem' }}>1. Platform Usage & Scope</h3>
            <p style={{ color: '#cbd5e1' }}>
              SmartBuddy Petroleum IoT Platform provides industrial telemetry, hygiene tracking, odor monitoring, and hardware diagnostics for petroleum retail outlets (ROs) and Oil Marketing Companies (OMCs). Access is restricted to authorized enterprise personnel, registered OMC Administrators, and RO Managers.
            </p>
            <h3 style={{ fontSize: '1.15rem', color: '#38bdf8', marginTop: '1.5rem' }}>2. Account Security & Responsibilities</h3>
            <p style={{ color: '#cbd5e1' }}>
              Users are responsible for safeguarding login credentials and ensuring that authorized personnel only operate the machine threshold triggers and diagnostics interface. Unauthorized access, reverse engineering of MQTT broker endpoints, or automated scrapers are strictly prohibited.
            </p>
            <h3 style={{ fontSize: '1.15rem', color: '#38bdf8', marginTop: '1.5rem' }}>3. IoT Sensor Telemetry & Service Uptime</h3>
            <p style={{ color: '#cbd5e1' }}>
              While the platform strives for 99.9% uptime, industrial environmental sensors are subject to on-site power conditions, SIM network coverage, and local hardware calibration. Telemetry reports are provided as operational intelligence.
            </p>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#f8fafc', marginBottom: '1rem' }}>
              Privacy Policy
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Last updated: October 2026</p>
            <hr style={{ borderColor: '#334155', margin: '1.5rem 0' }} />
            <h3 style={{ fontSize: '1.15rem', color: '#38bdf8', marginTop: '1.5rem' }}>1. Data Collection</h3>
            <p style={{ color: '#cbd5e1' }}>
              We collect contact information (corporate phone number, organization name, RO location) strictly for authentication and tenant isolation. For public customer feedback submitted via machine QR codes, ratings and optional feedback comments are recorded anonymously without tracking personal identity.
            </p>
            <h3 style={{ fontSize: '1.15rem', color: '#38bdf8', marginTop: '1.5rem' }}>2. IoT Telemetry Storage</h3>
            <p style={{ color: '#cbd5e1' }}>
              Environmental telemetry metrics (temperature, humidity, ammonia NH3, hydrogen sulfide H2S, and water levels) are stored securely in cloud-hosted encrypted databases for analytics, compliance reports, and preventive maintenance triggers.
            </p>
            <h3 style={{ fontSize: '1.15rem', color: '#38bdf8', marginTop: '1.5rem' }}>3. Data Protection & Non-Disclosure</h3>
            <p style={{ color: '#cbd5e1' }}>
              Enterprise data is strictly partitioned by tenant ID (OMC / RO hierarchy). No proprietary operational data is shared or sold to third-party marketing entities.
            </p>
          </div>
        )}

        {activeTab === 'refund' && (
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#f8fafc', marginBottom: '1rem' }}>
              Refund & Cancellation Policy
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Last updated: October 2026</p>
            <hr style={{ borderColor: '#334155', margin: '1.5rem 0' }} />
            <h3 style={{ fontSize: '1.15rem', color: '#38bdf8', marginTop: '1.5rem' }}>1. Enterprise Hardware & SaaS Subscriptions</h3>
            <p style={{ color: '#cbd5e1' }}>
              SmartBuddy IoT devices, controller gateways, and annual platform subscriptions are provisioned under B2B enterprise service level agreements (SLAs).
            </p>
            <h3 style={{ fontSize: '1.15rem', color: '#38bdf8', marginTop: '1.5rem' }}>2. Hardware Warranty & Replacement</h3>
            <p style={{ color: '#cbd5e1' }}>
              All IoT field controller units and sensor modules are backed by manufacturer warranty against defects. Faulty or non-responsive sensor units verified during remote diagnostics will be scheduled for on-site replacement by certified technicians.
            </p>
            <h3 style={{ fontSize: '1.15rem', color: '#38bdf8', marginTop: '1.5rem' }}>3. Service Cancellations</h3>
            <p style={{ color: '#cbd5e1' }}>
              Enterprise contract cancellations must be submitted in writing with 30 days notice through authorized OMC procurement channels.
            </p>
          </div>
        )}

        {activeTab === 'contact' && (
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#f8fafc', marginBottom: '1rem' }}>
              Contact Us
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>24/7 Enterprise Technical Assistance & Support</p>
            <hr style={{ borderColor: '#334155', margin: '1.5rem 0' }} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
              <div style={{ backgroundColor: '#0f172a', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#38bdf8', marginBottom: '0.5rem' }}>
                  <Building2 size={20} />
                  <strong style={{ fontSize: '1.05rem', color: '#f8fafc' }}>Corporate Office</strong>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.92rem', margin: 0 }}>
                  Aarya Innovtech Pvt Ltd<br />
                  Maharashtra, India
                </p>
              </div>

              <div style={{ backgroundColor: '#0f172a', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f97316', marginBottom: '0.5rem' }}>
                  <Phone size={20} />
                  <strong style={{ fontSize: '1.05rem', color: '#f8fafc' }}>Technical Helpline</strong>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.92rem', margin: 0 }}>
                  Direct: <a href="tel:9359604384" style={{ color: '#f97316', textDecoration: 'none', fontWeight: '700' }}>9359604384</a><br />
                  Available 24x7 for urgent retail pump alerts
                </p>
              </div>

              <div style={{ backgroundColor: '#0f172a', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#10b981', marginBottom: '0.5rem' }}>
                  <Mail size={20} />
                  <strong style={{ fontSize: '1.05rem', color: '#f8fafc' }}>Online Portal</strong>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.92rem', margin: 0 }}>
                  Website: <a href="https://aaryainnovtech.com" target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: '600' }}>aaryainnovtech.com</a>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: '3rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
        © {new Date().getFullYear()} SmartBuddy Petroleum IoT Platform • Architected by Aarya Innovtech
      </div>
    </div>
  );
};

export default LegalPolicy;
