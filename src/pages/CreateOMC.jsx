import React, { useState, useEffect } from 'react';
import { Users, Search, Edit, Trash2, Plus, Building, Eye, EyeOff, X, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';

const CreateOMC = () => {
  const navigate = useNavigate();
  const [openedFromDashboard, setOpenedFromDashboard] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('action') === 'add');
  const [activeTab, setActiveTab] = useState('OMCs');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states - synchronously initialized from URL to eliminate header/footer flash
  const [modalType, setModalType] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'add') return 'add';
    }
    return null;
  });
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({ id: '', name: '', location: '', contact: '', contact_password: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [loading, setLoading] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const [showViewPassword, setShowViewPassword] = useState(false);
  const [showFormPassword, setShowFormPassword] = useState(false);

  const [omcs, setOmcs] = useState([]);
  const [ros, setRos] = useState([]);

  useEffect(() => {
    fetchOMCs();
  }, []);

  const fetchOMCs = async () => {
    try {
      setLoading(true);
      const [omcRes, roRes] = await Promise.all([
        api.get('/omc'),
        api.get('/ro').catch(() => ({ data: { success: false, data: [] } }))
      ]);
      if (omcRes.data.success) {
        // Auto-clean any duplicates from state & storage
        const rawOmcs = omcRes.data.data || [];
        const seen = new Set();
        const cleaned = [];
        for (const o of rawOmcs) {
          const c = String(o.contact || '').replace(/\D/g, '').trim();
          if (!c || !seen.has(c)) {
            if (c) seen.add(c);
            cleaned.push(o);
          }
        }
        const withDisplayIds = cleaned.map((o, idx) => ({
          ...o,
          displayId: idx + 1
        }));
        setOmcs(withDisplayIds);
      }
      if (roRes.data?.success && Array.isArray(roRes.data.data)) {
        setRos(roRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching OMCs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOMCs = (() => {
    const rawTerm = searchTerm.trim();
    if (!rawTerm) return omcs;

    const term = rawTerm.toLowerCase();
    const cleanNum = term.replace(/^[#idomc\s:\-_]+/i, '').trim();
    const isNumericSearch = /^\d+$/.test(cleanNum);

    // If user is searching specifically by ID / number (e.g. "1", "2", "3", "#2", "id 1", "omc 2")
    if (isNumericSearch && cleanNum.length <= 3) {
      return omcs.filter(omc => {
        const displayIdStr = String(omc.displayId || '');
        const nameStr = String(omc.name || '').toLowerCase();
        return cleanNum === displayIdStr || nameStr === term;
      });
    }

    // General search across all fields (name, location, full contact, or visible table ID)
    return omcs.filter(omc => {
      const displayIdStr = String(omc.displayId || '');
      const nameStr = String(omc.name || '').toLowerCase();
      const locStr = String(omc.location || '').toLowerCase();
      const contactStr = String(omc.contact || '').replace(/\D/g, '');

      // Direct visible ID match
      if (cleanNum && cleanNum === displayIdStr) {
        return true;
      }
      if (term === displayIdStr) {
        return true;
      }

      // Name or location match
      if (nameStr.includes(term)) return true;
      if (locStr.includes(term)) return true;

      // Contact match ONLY if search term has at least 4 digits (prevents single digit matching all phone numbers)
      if (cleanNum.length >= 4 && contactStr.includes(cleanNum)) {
        return true;
      }

      // Multi-word search
      const searchWords = term.split(/\s+/).filter(Boolean);
      if (searchWords.length > 1) {
        return searchWords.every(word => {
          const cw = word.replace(/^[#idomc\s:\-_]+/i, '').trim();
          if (cw && cw === displayIdStr) return true;
          if (nameStr.includes(word)) return true;
          if (locStr.includes(word)) return true;
          if (cw.length >= 4 && contactStr.includes(cw)) return true;
          return false;
        });
      }

      return false;
    });
  })();

  // Pagination logic
  const totalPages = Math.ceil(filteredOMCs.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOMCs = filteredOMCs.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const openModal = (type, item = null) => {
    setModalType(type);
    setSelectedItem(item);
    setShowViewPassword(false);
    setShowFormPassword(false);
    if (type === 'edit' && item) {
      setFormData({
        ...item,
        contact_password: item.contact_password || item.credentials?.password || 'password123'
      });
    } else {
      setFormData({ id: '', name: '', location: '', contact: '', contact_password: '' });
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedItem(null);
    setOpenedFromDashboard(false);
    setShowViewPassword(false);
    setShowFormPassword(false);
    setFormData({ id: '', name: '', location: '', contact: '', contact_password: '' });
  };

  // Live duplicate phone detection
  const cleanPhoneInput = String(formData.contact || '').replace(/\D/g, '').trim();
  const dupOmc = cleanPhoneInput.length === 10 ? omcs.find(o => 
    String(o.contact || '').replace(/\D/g, '').trim() === cleanPhoneInput && 
    (modalType === 'add' || String(o.id) !== String(selectedItem?.id))
  ) : null;
  const dupRo = cleanPhoneInput.length === 10 ? ros.find(r => 
    String(r.contact || '').replace(/\D/g, '').trim() === cleanPhoneInput
  ) : null;
  const isDuplicateContact = Boolean(dupOmc || dupRo);

  const handleSave = async () => {
    if (!formData.name || !formData.name.trim()) {
      alert('Please provide an OMC Name');
      return;
    }
    if (!formData.location || !formData.location.trim()) {
      alert('Please provide OMC Location');
      return;
    }
    const cleanContact = String(formData.contact || '').replace(/\D/g, '').trim();
    if (!cleanContact || cleanContact.length !== 10) {
      alert('Mobile number must be exactly 10 digits');
      return;
    }

    // Disallow duplicate phone numbers across OMCs and ROs
    if (dupOmc) {
      alert(`Mobile number ${cleanContact} is already registered with OMC "${dupOmc.name}". Duplicate phone number is strictly prohibited!`);
      return;
    }
    if (dupRo) {
      alert(`Mobile number ${cleanContact} is already registered with RO "${dupRo.name}". Duplicate phone number is strictly prohibited!`);
      return;
    }

    if (!formData.contact_password || !formData.contact_password.trim()) {
      alert('Password is required. Please enter a password.');
      return;
    }

    try {
      if (modalType === 'add') {
        const res = await api.post('/omc', {
          name: formData.name.trim(),
          location: formData.location,
          contact: cleanContact,
          contact_password: formData.contact_password.trim()
        });
        if (res.data && res.data.success) {
          await fetchOMCs();
          window.dispatchEvent(new CustomEvent('app_data_updated', { detail: { resource: 'omc', method: 'post' } }));
          window.dispatchEvent(new Event('storage'));
          toast.success(`OMC "${formData.name}" created successfully!`);
        } else {
          alert(res.data?.message || 'Error saving OMC details');
          return;
        }
      } else if (modalType === 'edit') {
        const res = await api.put(`/omc/${selectedItem.id}`, {
          name: formData.name.trim(),
          location: formData.location,
          contact: cleanContact,
          contact_password: formData.contact_password.trim()
        });
        if (res.data && res.data.success) {
          await fetchOMCs();
          window.dispatchEvent(new CustomEvent('app_data_updated', { detail: { resource: 'omc', method: 'put' } }));
          window.dispatchEvent(new Event('storage'));
          toast.success(`OMC "${formData.name}" updated successfully!`);
        } else {
          alert(res.data?.message || 'Error updating OMC details');
          return;
        }
      }
      closeModal();
      if (openedFromDashboard) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error saving OMC:', error);
      const msg = error.response?.data?.message || error.message || 'Error saving OMC details';
      alert(msg);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const handleDelete = async (omcToDelete = null) => {
    const item = omcToDelete || selectedItem;
    if (!item) return;
    try {
      await api.delete(`/omc/${item.id}`);
      await fetchOMCs();
      window.dispatchEvent(new CustomEvent('app_data_updated', { detail: { resource: 'omc', method: 'delete' } }));
      window.dispatchEvent(new Event('storage'));
      toast.success(`OMC "${item.name}" deleted successfully!`);
      closeModal();
    } catch (error) {
      console.error('Error deleting OMC:', error);
      toast.error('Failed to delete OMC.');
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'add') {
      setOpenedFromDashboard(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  return (
    <div style={{ padding: '0.5rem 2rem 2rem 2rem', maxWidth: '1400px', margin: '0 auto', color: 'var(--text-primary)', position: 'relative' }}>
      
      {/* Background content - hidden during instant action modal to prevent header/footer flash */}
      <div style={{ opacity: (modalType && openedFromDashboard) ? 0 : 1, transition: 'opacity 0.2s' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>
            <Users color="#6366f1" size={32} />
            OMC Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Manage all Oil Marketing Companies in the system.</p>
        </div>

      {/* Tabs & Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div 
            onClick={() => setActiveTab('OMCs')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', 
              color: activeTab === 'OMCs' ? '#6366f1' : 'var(--text-secondary)',
              fontWeight: activeTab === 'OMCs' ? '600' : '500',
              borderBottom: activeTab === 'OMCs' ? '2px solid #6366f1' : 'none',
              paddingBottom: '0.5rem',
              marginBottom: '-0.6rem'
            }}
          >
            <Building size={18} />
            OMC List
          </div>
        </div>
        <button onClick={() => openModal('add')} style={{ 
          display: 'flex', alignItems: 'center', gap: '0.5rem', 
          backgroundColor: '#6366f1', color: 'white', border: 'none', 
          padding: '0.6rem 1.25rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '500' 
        }} className="hover-lift">
          <Plus size={18} />
          Add OMC
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search OMCs by ID, Name, or Location..." 
          autoComplete="off"
          style={{ 
            width: '100%', padding: '0.85rem 2.5rem 0.85rem 3rem', 
            borderRadius: '0.5rem', border: '1px solid var(--border-color)', 
            backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)', outline: 'none'
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

      {/* Table Section */}
      <div style={{ backgroundColor: 'var(--surface-bg)', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--hover-bg)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-secondary)' }}>ID</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-secondary)' }}>OMC Name</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Location</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Contact</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading OMCs...</td>
                </tr>
              ) : currentOMCs.length > 0 ? currentOMCs.map((omc, idx) => {
                const displayId = omc.displayId || (indexOfFirstItem + idx + 1);
                return (
                <tr key={omc.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }} className="table-row-hover">
                  <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-primary)' }}>{displayId}</td>
                  <td style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', fontWeight: 'bold' }}>
                      {omc.name.charAt(0)}
                    </div>
                    {omc.name}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{omc.location || 'N/A'}</td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{omc.contact || 'N/A'}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button onClick={() => openModal('view', { ...omc, displayId })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6' }} title="View Details">
                        <Eye size={18} />
                      </button>
                      <button onClick={() => openModal('edit', { ...omc, displayId })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981' }} title="Edit OMC">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => openModal('delete', { ...omc, displayId })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }} title="Delete OMC">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );}) : (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No OMCs found. Click "Add OMC" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-bg)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Showing {filteredOMCs.length === 0 ? 0 : indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredOMCs.length)} of {filteredOMCs.length} entries
          </div>
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
      </div>

      {/* Modal Overlay - instant top-level rendering with backdrop blur */}
      {modalType && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface-bg)', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', border: '1px solid var(--border-color)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>
                {modalType === 'add' && 'Add New OMC'}
                {modalType === 'edit' && 'Edit OMC Details'}
                {modalType === 'view' && 'OMC Information'}
                {modalType === 'delete' && 'Confirm Deletion'}
              </h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            {(modalType === 'add' || modalType === 'edit') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>OMC Details</h3>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  {modalType === 'edit' && (
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>ID</label>
                      <input type="text" value={selectedItem?.displayId || formData.displayId || formData.id} disabled style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--border-color)', color: 'var(--text-secondary)', cursor: 'not-allowed' }} />
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>OMC Name *</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Enter OMC Name" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Location *</label>
                    <input type="text" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} placeholder="Enter OMC Location" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Contact (Mobile) *</label>
                    <input 
                      type="text" 
                      maxLength="10" 
                      value={formData.contact || ''} 
                      onChange={(e) => setFormData({...formData, contact: e.target.value.replace(/\D/g, '')})} 
                      placeholder="Enter 10-digit Mobile Number" 
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem 1rem', 
                        borderRadius: '8px', 
                        border: isDuplicateContact && cleanPhoneInput.length === 10
                          ? '2px solid #ef4444' 
                          : '1px solid var(--border-color)', 
                        backgroundColor: 'var(--surface-bg)', 
                        color: 'var(--text-primary)' 
                      }} 
                    />
                    {dupOmc && (
                      <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '600' }}>
                        ⚠️ Duplicate! Phone number {cleanPhoneInput} is already used by OMC "{dupOmc.name}".
                      </span>
                    )}
                    {dupRo && (
                      <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '600' }}>
                        ⚠️ Duplicate! Phone number {cleanPhoneInput} is already used by RO "{dupRo.name}".
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Password *</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setShowFormPassword(!showFormPassword)}
                        style={{
                          position: 'absolute',
                          left: '12px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          color: showFormPassword ? '#4f46e5' : 'var(--text-secondary)',
                          zIndex: 1
                        }}
                        title={showFormPassword ? "Hide password" : "Show password"}
                      >
                        {showFormPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      <input 
                        type={showFormPassword ? "text" : "password"} 
                        value={formData.contact_password || ''} 
                        onChange={(e) => setFormData({...formData, contact_password: e.target.value})} 
                        placeholder="Enter Password" 
                        style={{ 
                          width: '100%', 
                          padding: '0.75rem 1rem 0.75rem 2.5rem', 
                          borderRadius: '8px', 
                          border: '1px solid var(--border-color)', 
                          backgroundColor: 'var(--surface-bg)', 
                          color: 'var(--text-primary)' 
                        }} 
                      />
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button onClick={closeModal} style={{ padding: '0.6rem 1.5rem', border: '1px solid var(--border-color)', background: 'var(--surface-bg)', borderRadius: '999px', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.9rem' }}>Cancel</button>
                  <button 
                    onClick={handleSave} 
                    disabled={Boolean(isDuplicateContact || cleanPhoneInput.length !== 10 || !formData.name?.trim() || !formData.location?.trim() || !formData.contact_password?.trim())}
                    style={{ 
                      padding: '0.6rem 1.5rem', 
                      border: 'none', 
                      background: (isDuplicateContact || cleanPhoneInput.length !== 10 || !formData.name?.trim() || !formData.location?.trim() || !formData.contact_password?.trim()) ? '#9ca3af' : '#6366f1', 
                      color: '#ffffff', 
                      borderRadius: '999px', 
                      cursor: (isDuplicateContact || cleanPhoneInput.length !== 10 || !formData.name?.trim() || !formData.location?.trim() || !formData.contact_password?.trim()) ? 'not-allowed' : 'pointer', 
                      fontWeight: '600', 
                      fontSize: '0.9rem',
                      opacity: (isDuplicateContact || cleanPhoneInput.length !== 10 || !formData.name?.trim() || !formData.location?.trim() || !formData.contact_password?.trim()) ? 0.6 : 1
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {modalType === 'view' && selectedItem && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '1rem 1.25rem', background: 'var(--surface-bg)' }}>
                    <div style={{ flex: '0 0 35%', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>OMC ID</div>
                    <div style={{ flex: '1', color: 'var(--text-primary)', fontSize: '0.875rem' }}>{selectedItem.displayId || selectedItem.id}</div>
                  </div>
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '1rem 1.25rem', background: 'var(--surface-bg)' }}>
                    <div style={{ flex: '0 0 35%', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Name</div>
                    <div style={{ flex: '1', color: 'var(--text-primary)', fontSize: '0.875rem' }}>{selectedItem.name}</div>
                  </div>
                  <div style={{ display: 'flex', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'var(--surface-bg)' }}>
                    <div style={{ flex: '0 0 35%', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Location</div>
                    <div style={{ flex: '1', color: 'var(--text-primary)', fontSize: '0.875rem' }}>{selectedItem.location || 'N/A'}</div>
                  </div>
                  <div style={{ display: 'flex', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'var(--surface-bg)' }}>
                    <div style={{ flex: '0 0 35%', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Contact</div>
                    <div style={{ flex: '1', color: 'var(--text-primary)', fontSize: '0.875rem' }}>{selectedItem.contact || 'N/A'}</div>
                  </div>
                  <div style={{ display: 'flex', padding: '1rem 1.25rem', background: 'var(--surface-bg)', alignItems: 'center' }}>
                    <div style={{ flex: '0 0 35%', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Password</div>
                    <div style={{ flex: '1', display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                      <button
                        type="button"
                        onClick={() => setShowViewPassword(!showViewPassword)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: showViewPassword ? '#4f46e5' : 'var(--text-secondary)',
                          borderRadius: '4px',
                          transition: 'color 0.2s'
                        }}
                        title={showViewPassword ? "Hide Password" : "Show Password"}
                      >
                        {showViewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      <span style={{ 
                        fontFamily: showViewPassword ? 'inherit' : 'monospace', 
                        letterSpacing: showViewPassword ? 'normal' : '2px', 
                        fontWeight: showViewPassword ? '600' : 'bold',
                        fontSize: showViewPassword ? '0.875rem' : '1.1rem'
                      }}>
                        {showViewPassword ? (selectedItem.contact_password || '********') : '••••••••'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {modalType === 'delete' && selectedItem && (
              <div style={{ textAlign: 'center', padding: '1rem 0 0.5rem 0' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
                  <AlertTriangle size={30} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>
                  Delete OMC Confirmation
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0 0 1.5rem 0', lineHeight: '1.5' }}>
                  Are you sure you want to delete OMC <strong style={{ color: 'var(--text-primary)' }}>"{selectedItem.name}"</strong>? All associated ROs and machines may be affected. This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button 
                    onClick={closeModal} 
                    style={{ padding: '0.65rem 1.5rem', border: '1px solid var(--border-color)', background: 'var(--surface-bg)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: '600' }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleDelete(selectedItem)} 
                    style={{ padding: '0.65rem 1.5rem', border: 'none', background: '#ef4444', color: '#ffffff', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Trash2 size={16} /> Yes, Delete OMC
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}



    </div>
  );
};

export default CreateOMC;
