import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, Folder, Monitor, LogOut, FileText, Sun, Moon, Settings, User, Phone, Shield, Menu, X, Activity, PieChart, Tag, ClipboardList, Radio, Building, MapPin, Cpu, Bell, TrendingUp, AlertTriangle, MessageSquare } from 'lucide-react';
import Footer from './Footer';
import { LOGO_LEFT_BASE64 } from '../utils/logoAssets';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Click outside to close profile dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileRef]);

  // Close sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getUserDisplayName = (usr) => {
    if (!usr) return 'Super Admin';
    const roleLower = String(usr.role || '').toLowerCase();
    if (roleLower.includes('super')) {
      return 'Super Admin';
    } else if (roleLower.includes('omc')) {
      return 'OMC Admin';
    } else if (roleLower.includes('ro') || roleLower.includes('manager')) {
      return 'RO Manager';
    }
    return usr.role || 'Super Admin';
  };

  const getUserPhone = (usr) => {
    if (!usr) return '9284188705';
    if (usr.mobile && String(usr.mobile).trim()) return String(usr.mobile).trim();
    if (usr.username && String(usr.username).trim() && !isNaN(Number(String(usr.username).trim()))) {
      return String(usr.username).trim();
    }
    const roleLower = String(usr.role || '').toLowerCase();
    if (roleLower.includes('omc')) return '8010209984';
    if (roleLower.includes('ro') || roleLower.includes('manager')) return '8010209983';
    return '9284188705';
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['Admin', 'User', 'Super Admin'] },
    { name: 'Create OMC', href: '/omc', icon: Building, roles: ['Admin', 'User', 'Super Admin'] },
    { name: 'Create RO', href: '/ro', icon: MapPin, roles: ['Admin', 'User', 'Super Admin'] },
    { name: 'Machines', href: '/machine', icon: Cpu, roles: ['Admin', 'User', 'Super Admin'] },
    { name: 'Alerts', href: '/alerts', icon: Bell, roles: ['Admin', 'User', 'Super Admin'] },
    { name: 'Reports', href: '/reports', icon: FileText, roles: ['Admin', 'User', 'Super Admin'] },
    { name: 'Analysis', href: '/analysis', icon: PieChart, roles: ['Admin', 'User', 'Super Admin'] },
    { name: 'Feedbacks', href: '/feedbacks', icon: MessageSquare, roles: ['Admin', 'User', 'Super Admin'] },
  ];

  return (
    <div className="app-layout">
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} 
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header" style={{ minHeight: '82px', height: '82px', padding: '0.6rem 0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', position: 'relative' }}>
          <div style={{ 
            backgroundColor: '#ffffff', 
            padding: '0.4rem 0.85rem', 
            borderRadius: '10px', 
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '100%',
            maxWidth: '228px',
            margin: '0 auto'
          }}>
            <img 
              src={LOGO_LEFT_BASE64 || `${import.meta.env.BASE_URL}logo_left.jpeg`} 
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = LOGO_LEFT_BASE64; }} 
              alt="E2Toilet SmartBuddy Logo" 
              style={{ 
                width: '100%', 
                height: 'auto', 
                maxHeight: '56px', 
                objectFit: 'contain',
                display: 'block'
              }} 
            />
          </div>
          <button
            className="mobile-sidebar-close"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close menu"
            style={{
              display: 'none',
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '6px',
              color: '#cbd5e1',
              cursor: 'pointer',
              padding: '0.35rem',
              position: 'absolute',
              right: '0.6rem',
              top: '50%',
              transform: 'translateY(-50%)'
            }}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="sidebar-nav">
          <div className="sidebar-nav-title">Main Menu</div>
          <nav>
            {navigation
              .filter(item => {
                const isOmc = user?.role === 'OMC Admin';
                const isIocl = user?.role === 'RO Manager';
                
                if (isOmc || isIocl) {
                  // Common hidden for both
                  if (item.name === 'Create OMC') return false;
                  // Specifically hidden for IOCL
                  if (isIocl && item.name === 'Create RO') return false;
                }
                return true;
              })
              .map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <Icon className="sidebar-link-icon" size={20} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar" style={{ overflow: 'hidden', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {user?.logo ? (
                <img src={user?.logo?.startsWith('http') ? user.logo : `${import.meta.env.VITE_SERVER_URL}${user.logo}`} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover', backgroundColor: 'white' }} />
              ) : (
                String(getUserPhone(user) || '9').charAt(0)
              )}
            </div>
            <div className="user-details">
              <p className="user-name">
                {String(getUserPhone(user))}
              </p>
              <p className="user-role">{String(getUserDisplayName(user) || user?.role || 'Super Admin')}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-btn" title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <button 
              className="hamburger-menu"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open menu"
              style={{ display: 'none', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '0.5rem', flexShrink: 0 }}
            >
              <Menu size={24} />
            </button>
            <h1 className="page-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {navigation.find(n => location.pathname.startsWith(n.href))?.name || 'Dashboard'}
            </h1>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
            <button 
              onClick={toggleTheme} 
              style={{ 
                background: 'transparent', 
                border: 'none', 
                color: 'var(--slate-400)', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.4rem'
              }}
              title={`Switch Theme`}
              aria-label="Switch Theme"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            
            <div style={{ height: '20px', width: '1px', backgroundColor: 'var(--border-color)' }}></div>
            
            <div 
              ref={profileRef}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', position: 'relative' }}
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              <span className="user-header-name" style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                {String(getUserDisplayName(user) || 'Super Admin')}
              </span>
              <div style={{ 
                width: '36px', height: '36px', borderRadius: '50%', 
                backgroundColor: 'var(--slate-200)', display: 'flex', 
                alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px solid var(--primary-color)',
                flexShrink: 0
              }}>
                {user?.logo ? (
                  <img src={user?.logo?.startsWith('http') ? user.logo : `${import.meta.env.VITE_SERVER_URL}${user.logo}`} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover', backgroundColor: 'white' }} />
                ) : (
                  <User size={22} color="var(--slate-600)" />
                )}
              </div>

              {/* PROFILE DROPDOWN CARD */}
              {isProfileOpen && (
                <div className="profile-dropdown-card" style={{ 
                  position: 'absolute', top: '50px', right: '0', width: '320px', 
                  backgroundColor: 'var(--surface-bg)', borderRadius: '12px', 
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)', overflow: 'hidden', zIndex: 1000,
                  border: '1px solid var(--border-color)'
                }}>
                  {/* Top Blue Section */}
                  <div style={{ backgroundColor: '#3b82f6', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ 
                      width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#cbd5e1', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem',
                      border: '3px solid rgba(255,255,255,0.4)', overflow: 'hidden'
                    }}>
                      {user?.logo ? (
                        <img src={user?.logo?.startsWith('http') ? user.logo : `${import.meta.env.VITE_SERVER_URL}${user.logo}`} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover', backgroundColor: 'white' }} />
                      ) : (
                        <User size={40} color="#475569" />
                      )}
                    </div>
                    <h3 style={{ color: 'white', fontSize: '1.1rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>
                      {String(getUserDisplayName(user) || 'Super Admin').toUpperCase()}
                    </h3>
                    <span style={{ backgroundColor: 'rgba(255,255,255,0.3)', color: 'white', padding: '0.2rem 1rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      {String(user?.role || 'Super Admin').toUpperCase()}
                    </span>
                  </div>

                  {/* Middle Dark Section */}
                  <div style={{ backgroundColor: '#1e293b', padding: '1.5rem' }}>
                    <p style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '1rem', letterSpacing: '1px' }}>ACCOUNT DETAILS</p>
                    
                    <div style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                      <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', padding: '0.5rem', borderRadius: '50%' }}>
                        <Phone size={18} color="#3b82f6" />
                      </div>
                      <div>
                        <p style={{ color: 'white', fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.1rem' }}>
                          {String(user?.mobile || user?.username || (user?.role === 'OMC Admin' ? '8767955438' : user?.role === 'RO Manager' ? '8010209983' : '9284188705'))}
                        </p>
                        <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>User ID / Mobile</p>
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', padding: '0.5rem', borderRadius: '50%' }}>
                        <Shield size={18} color="#10b981" />
                      </div>
                      <div>
                        <p style={{ color: 'white', fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.1rem' }}>{String(user?.role || 'User')} Access</p>
                        <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Security Level</p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Logout Section */}
                  <div style={{ backgroundColor: '#0f172a', padding: '1rem', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'center' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      <LogOut size={18} /> Secure Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="page-content" style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)' }}>
          <div style={{ flex: '1 0 auto', minHeight: 'calc(100vh - 120px)' }}>
            <Outlet />
          </div>
          {!location.search?.includes('action=add') && <Footer />}
        </div>
      </main>
    </div>
  );
};

export default Layout;
