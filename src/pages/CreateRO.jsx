import React, { useState, useEffect } from 'react';
import { MapPin, Search, Edit, Trash2, Plus, Building, Eye, EyeOff, X, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import api from '../services/api';

const CreateRO = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [openedFromDashboard, setOpenedFromDashboard] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('action') === 'add');
  const [activeTab, setActiveTab] = useState('ROs');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOmcId, setFilterOmcId] = useState('All');
  
  // Modal states - synchronously initialized from URL to eliminate header/footer flash
  const [modalType, setModalType] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'add') return 'add';
    }
    return null;
  });
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({ id: '', omc_id: '', name: '', location: '', status: 'Active', contact: '', contact_password: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [loading, setLoading] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const [showViewPassword, setShowViewPassword] = useState(false);
  const [showFormPassword, setShowFormPassword] = useState(false);

  const [omcList, setOmcList] = useState([]);
  const [ros, setRos] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [omcRes, roRes] = await Promise.all([
        api.get('/omc'),
        api.get('/ro')
      ]);
      if (omcRes.data.success) setOmcList(omcRes.data.data);
      if (roRes.data.success) {
        const sorted = (roRes.data.data || []).map(r => {
          const num = parseInt(String(r.id).replace(/[^0-9]/g, ''), 10);
          return {
            ...r,
            id: (!isNaN(num) && num > 0) ? num : r.id
          };
        }).sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
        const withDisplayIds = sorted.map((r, idx) => ({
          ...r,
          displayId: idx + 1
        }));
        setRos(withDisplayIds);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get OMC Name
  const getOmcName = (omcId) => {
    const omc = omcList.find(o => String(o.id) === String(omcId));
    return omc ? omc.name : 'Unassigned';
  };

  const isOmcAdmin = user?.role === 'OMC Admin';
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

  const filteredROs = (() => {
    // First apply OMC filter (locked to assigned OMC for OMC Admin)
    const baseList = ros.filter(ro => {
      if (isOmcAdmin && assignedOmc) {
        return String(ro.omc_id) === String(assignedOmc.id);
      }
      return filterOmcId === 'All' || String(ro.omc_id) === String(filterOmcId);
    });

    const rawTerm = searchTerm.trim();
    if (!rawTerm) return baseList;

    const term = rawTerm.toLowerCase();
    const cleanNum = term.replace(/^[#idro\s:\-_]+/i, '').trim();
    const isNumericSearch = /^\d+$/.test(cleanNum);

    // If user is searching specifically by ID / number (e.g. "1", "2", "3", "#2", "id 1", "ro 2")
    if (isNumericSearch && cleanNum.length <= 3) {
      return baseList.filter(ro => {
        const displayIdStr = String(ro.displayId || '');
        const nameStr = String(ro.name || '').toLowerCase();
        return cleanNum === displayIdStr || nameStr === term;
      });
    }

    return baseList.filter(ro => {
      const displayIdStr = String(ro.displayId || '');
      const nameStr = String(ro.name || '').toLowerCase();
      const locStr = String(ro.location || '').toLowerCase();
      const contactStr = String(ro.contact || '').replace(/\D/g, '');
      const statusStr = String(ro.status || '').toLowerCase();
      const omcName = String(getOmcName(ro.omc_id) || '').toLowerCase();

      // Direct visible ID match
      if (cleanNum && cleanNum === displayIdStr) {
        return true;
      }
      if (term === displayIdStr) {
        return true;
      }

      // Check fields
      if (nameStr.includes(term)) return true;
      if (locStr.includes(term)) return true;
      if (omcName.includes(term)) return true;
      if (statusStr.includes(term)) return true;

      // Contact match ONLY if search term has at least 4 digits
      if (cleanNum.length >= 4 && contactStr.includes(cleanNum)) {
        return true;
      }

      // Multi-word search
      const searchWords = term.split(/\s+/).filter(Boolean);
      if (searchWords.length > 1) {
        return searchWords.every(word => {
          const cw = word.replace(/^[#idro\s:\-_]+/i, '').trim();
          if (cw && cw === displayIdStr) return true;
          if (nameStr.includes(word)) return true;
          if (locStr.includes(word)) return true;
          if (cw.length >= 4 && contactStr.includes(cw)) return true;
          if (omcName.includes(word)) return true;
          if (statusStr.includes(word)) return true;
          return false;
        });
      }

      return false;
    });
  })();

  // Pagination logic
  const totalPages = Math.ceil(filteredROs.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentROs = filteredROs.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterOmcId]);

  const openModal = (type, item = null) => {
    setModalType(type);
    setSelectedItem(item);
    setShowViewPassword(false);
    setShowFormPassword(false);
    const defaultOmcId = (isOmcAdmin && assignedOmc) ? String(assignedOmc.id) : '';
    if (type === 'edit' && item) {
      setFormData({
        ...item,
        omc_id: isOmcAdmin && assignedOmc ? String(assignedOmc.id) : String(item.omc_id || ''),
        contact_password: item.contact_password || item.credentials?.password || 'password123'
      });
    } else {
      setFormData({ 
        id: '', 
        omc_id: defaultOmcId, 
        name: '', 
        location: '', 
        status: 'Active', 
        contact: '', 
        contact_password: '' 
      });
    }
  };

  // Keep formData.omc_id in sync for OMC Admin
  useEffect(() => {
    if (isOmcAdmin && assignedOmc && modalType === 'add') {
      setFormData(prev => {
        if (String(prev.omc_id) !== String(assignedOmc.id)) {
          return { ...prev, omc_id: String(assignedOmc.id) };
        }
        return prev;
      });
    }
  }, [isOmcAdmin, assignedOmc, modalType]);

  const closeModal = () => {
    setModalType(null);
    setSelectedItem(null);
    setOpenedFromDashboard(false);
    setShowViewPassword(false);
    setShowFormPassword(false);
    setFormData({ id: '', omc_id: '', name: '', location: '', status: 'Active', contact: '', contact_password: '' });
  };

  // Live duplicate phone detection across ROs and OMCs
  const cleanPhoneInput = String(formData.contact || '').replace(/\D/g, '').trim();
  const dupRo = cleanPhoneInput.length === 10 ? ros.find(r => 
    String(r.contact || '').replace(/\D/g, '').trim() === cleanPhoneInput && 
    (modalType === 'add' || String(r.id) !== String(selectedItem?.id))
  ) : null;
  const dupOmc = cleanPhoneInput.length === 10 ? omcList.find(o => 
    String(o.contact || '').replace(/\D/g, '').trim() === cleanPhoneInput
  ) : null;
  const isDuplicateContact = Boolean(dupRo || dupOmc);

  const handleSave = async () => {
    const targetOmcId = (isOmcAdmin && assignedOmc) ? assignedOmc.id : formData.omc_id;

    if (!targetOmcId) {
      alert('Please select an OMC');
      return;
    }
    if (!formData.name || !formData.name.trim()) {
      alert('Please enter a RO Name');
      return;
    }
    if (!formData.location || !formData.location.trim()) {
      alert('Please enter RO Location');
      return;
    }
    const cleanContact = String(formData.contact || '').replace(/\D/g, '').trim();
    if (!cleanContact || cleanContact.length !== 10) {
      alert('Mobile number must be exactly 10 digits');
      return;
    }

    // Disallow duplicate phone numbers across ROs and OMCs
    if (dupRo) {
      alert(`Mobile number ${cleanContact} is already registered with RO "${dupRo.name}". Duplicate phone number is strictly prohibited!`);
      return;
    }
    if (dupOmc) {
      alert(`Mobile number ${cleanContact} is already registered with OMC "${dupOmc.name}". Duplicate phone number is strictly prohibited!`);
      return;
    }

    if (!formData.contact_password || !formData.contact_password.trim()) {
      alert('Password is required. Please enter a password.');
      return;
    }

    try {
      if (modalType === 'add') {
        const res = await api.post('/ro', {
          name: formData.name.trim(),
          omc_id: targetOmcId,
          location: formData.location,
          status: formData.status,
          contact: cleanContact,
          contact_password: formData.contact_password.trim()
        });
        if (res.data && res.data.success) {
          await fetchData();
          window.dispatchEvent(new CustomEvent('app_data_updated', { detail: { resource: 'ro', method: 'post' } }));
          window.dispatchEvent(new Event('storage'));
          toast.success(`RO "${formData.name}" created successfully!`);
        } else {
          alert(res.data?.message || 'Error saving RO details');
          return;
        }
      } else if (modalType === 'edit') {
        const res = await api.put(`/ro/${selectedItem.id}`, {
          name: formData.name.trim(),
          omc_id: targetOmcId,
          location: formData.location,
          status: formData.status,
          contact: cleanContact,
          contact_password: formData.contact_password.trim()
        });
        if (res.data && res.data.success) {
          await fetchData();
          window.dispatchEvent(new CustomEvent('app_data_updated', { detail: { resource: 'ro', method: 'put' } }));
          window.dispatchEvent(new Event('storage'));
          toast.success(`RO "${formData.name}" updated successfully!`);
        } else {
          alert(res.data?.message || 'Error updating RO details');
          return;
        }
      }
      closeModal();
      if (openedFromDashboard) {
        navigate(user?.role === 'OMC Admin' ? '/omc-dashboard' : '/dashboard');
      }
    } catch (error) {
      console.error('Error saving RO:', error);
      const msg = error.response?.data?.message || error.message || 'Error saving RO details';
      alert(msg);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const handleDelete = async (roToDelete = null) => {
    const item = roToDelete || selectedItem;
    if (!item) return;
    try {
      await api.delete(`/ro/${item.id}`);
      await fetchData();
      window.dispatchEvent(new CustomEvent('app_data_updated', { detail: { resource: 'ro', method: 'delete' } }));
      window.dispatchEvent(new Event('storage'));
      toast.success(`RO "${item.name}" deleted successfully!`);
      closeModal();
    } catch (error) {
      console.error('Error deleting RO:', error);
      toast.error('Failed to delete RO.');
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
            <MapPin color="#6366f1" size={32} />
            RO Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Manage Retail Outlets and assign them to Oil Marketing Companies (OMC).</p>
        </div>

      {/* Tabs & Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div 
            onClick={() => setActiveTab('ROs')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', 
              color: activeTab === 'ROs' ? '#6366f1' : 'var(--text-secondary)',
              fontWeight: activeTab === 'ROs' ? '600' : '500',
              borderBottom: activeTab === 'ROs' ? '2px solid #6366f1' : 'none',
              paddingBottom: '0.5rem',
              marginBottom: '-0.6rem'
            }}
          >
            <MapPin size={18} />
            Retail Outlets
          </div>
        </div>
        <button onClick={() => openModal('add')} style={{ 
          display: 'flex', alignItems: 'center', gap: '0.5rem', 
          backgroundColor: '#6366f1', color: 'white', border: 'none', 
          padding: '0.6rem 1.25rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '500' 
        }} className="hover-lift">
          <Plus size={18} />
          Add RO
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} size={20} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Retail Outlets by ID, Name, Location, or OMC..." 
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
        
        {!isOmcAdmin && (
          <select 
            value={filterOmcId} 
            onChange={(e) => setFilterOmcId(e.target.value)}
            style={{ 
              padding: '0.85rem 1rem', borderRadius: '0.5rem', 
              border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-bg)', 
              color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', minWidth: '200px'
            }}
          >
            <option value="All">All OMCs</option>
            {omcList.map(omc => (
              <option key={omc.id} value={omc.id.toString()}>{omc.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', backgroundColor: 'rgba(0,0,0,0.02)' }}>
              <th style={{ padding: '1.25rem 1.5rem', fontWeight: '600' }}>ID</th>
              <th style={{ padding: '1.25rem 1.5rem', fontWeight: '600' }}>ASSIGNED OMC</th>
              <th style={{ padding: '1.25rem 1.5rem', fontWeight: '600' }}>RO NAME</th>
              <th style={{ padding: '1.25rem 1.5rem', fontWeight: '600' }}>LOCATION</th>
              <th style={{ padding: '1.25rem 1.5rem', fontWeight: '600' }}>CONTACT</th>
              <th style={{ padding: '1.25rem 1.5rem', fontWeight: '600' }}>STATUS</th>
              <th style={{ padding: '1.25rem 1.5rem', fontWeight: '600', textAlign: 'center' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading ROs...</td>
              </tr>
            ) : currentROs.length > 0 ? currentROs.map((ro, idx) => {
              const displayId = ro.displayId || (indexOfFirstItem + idx + 1);
              return (
              <tr key={ro.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-primary)', fontWeight: '600' }}>{displayId}</td>
                <td style={{ padding: '1.25rem 1.5rem' }}>
                  <span style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' }}>
                    {getOmcName(ro.omc_id) || 'Unassigned'}
                  </span>
                </td>
                <td style={{ padding: '1.25rem 1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', fontWeight: 'bold' }}>
                      {ro.name?.charAt(0) || 'R'}
                    </div>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{ro.name}</span>
                  </div>
                </td>
                <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)' }}>{ro.location || 'N/A'}</td>
                <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)' }}>{ro.contact || 'N/A'}</td>
                <td style={{ padding: '1.25rem 1.5rem' }}>
                  <span style={{ 
                    backgroundColor: ro.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                    color: ro.status === 'Active' ? '#10b981' : '#ef4444', 
                    padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' 
                  }}>
                    {ro.status || 'Active'}
                  </span>
                </td>
                <td style={{ padding: '1.25rem 1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                    <button onClick={() => openModal('view', { ...ro, displayId })} title="View Details" style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.35rem', cursor: 'pointer', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                      <Eye size={16} />
                    </button>
                    <button onClick={() => openModal('edit', { ...ro, displayId })} title="Edit" style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.35rem', cursor: 'pointer', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                      <Edit size={16} />
                    </button>
                    <button onClick={() => openModal('delete', { ...ro, displayId })} title="Delete" style={{ background: '#ef4444', border: 'none', borderRadius: '4px', padding: '0.35rem', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );}) : (
              <tr>
                <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No ROs found matching "{searchTerm}"
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', borderTop: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.01)' }}>
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
          <div style={{ background: 'var(--surface-bg)', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '500px', maxHeight: '95vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', border: '1px solid var(--border-color)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>
                {modalType === 'add' && 'Add New RO'}
                {modalType === 'edit' && 'Edit RO Details'}
                {modalType === 'view' && 'RO Information'}
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
                  <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>RO Details</h3>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  {modalType === 'edit' && (
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>ID</label>
                      <input type="text" value={selectedItem?.displayId || formData.displayId || formData.id} disabled style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--border-color)', color: 'var(--text-secondary)', cursor: 'not-allowed' }} />
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Assign OMC *</label>
                    {isOmcAdmin ? (
                      <select 
                        value={assignedOmc ? String(assignedOmc.id) : (formData.omc_id || '1')} 
                        disabled
                        style={{ 
                          width: '100%', 
                          padding: '0.75rem 1rem', 
                          borderRadius: '8px', 
                          border: '1.5px solid #6366f1', 
                          backgroundColor: 'rgba(99, 102, 241, 0.06)', 
                          color: '#6366f1', 
                          fontWeight: '700',
                          cursor: 'not-allowed'
                        }}
                      >
                        <option value={assignedOmc?.id || '1'}>
                          {assignedOmc?.name || 'iocl'}
                        </option>
                      </select>
                    ) : (
                      <select 
                        value={formData.omc_id} 
                        onChange={(e) => setFormData({...formData, omc_id: e.target.value})} 
                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }}
                      >
                        <option value="">-- Select OMC --</option>
                        {omcList.map(omc => (
                          <option key={omc.id} value={omc.id}>{omc.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>RO Name *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Enter RO Name" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }} />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Location *</label>
                    <input type="text" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} placeholder="Enter Location" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Status</label>
                    <select 
                      value={formData.status} 
                      onChange={(e) => setFormData({...formData, status: e.target.value})} 
                      style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
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
                    {dupRo && (
                      <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '600' }}>
                        ⚠️ Duplicate! Phone number {cleanPhoneInput} is already used by RO "{dupRo.name}".
                      </span>
                    )}
                    {dupOmc && (
                      <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: '600' }}>
                        ⚠️ Duplicate! Phone number {cleanPhoneInput} is already used by OMC "{dupOmc.name}".
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
                          color: showFormPassword ? '#6366f1' : 'var(--text-secondary)',
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
                    disabled={Boolean(isDuplicateContact || cleanPhoneInput.length !== 10 || !formData.name?.trim() || !formData.location?.trim() || !formData.contact_password?.trim() || !((isOmcAdmin && assignedOmc) ? assignedOmc.id : formData.omc_id))}
                    style={{ 
                      padding: '0.6rem 1.5rem', 
                      border: 'none', 
                      background: (isDuplicateContact || cleanPhoneInput.length !== 10 || !formData.name?.trim() || !formData.location?.trim() || !formData.contact_password?.trim() || !((isOmcAdmin && assignedOmc) ? assignedOmc.id : formData.omc_id)) ? '#9ca3af' : '#6366f1', 
                      color: '#ffffff', 
                      borderRadius: '999px', 
                      cursor: (isDuplicateContact || cleanPhoneInput.length !== 10 || !formData.name?.trim() || !formData.location?.trim() || !formData.contact_password?.trim() || !((isOmcAdmin && assignedOmc) ? assignedOmc.id : formData.omc_id)) ? 'not-allowed' : 'pointer', 
                      fontWeight: '600', 
                      fontSize: '0.9rem',
                      opacity: (isDuplicateContact || cleanPhoneInput.length !== 10 || !formData.name?.trim() || !formData.location?.trim() || !formData.contact_password?.trim() || !((isOmcAdmin && assignedOmc) ? assignedOmc.id : formData.omc_id)) ? 0.6 : 1
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {modalType === 'view' && selectedItem && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '1rem 1.25rem', background: 'var(--surface-bg)' }}>
                    <div style={{ flex: '0 0 35%', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>RO ID</div>
                    <div style={{ flex: '1', color: 'var(--text-primary)', fontSize: '0.875rem' }}>{selectedItem.displayId || selectedItem.id}</div>
                  </div>
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '1rem 1.25rem', background: 'var(--surface-bg)' }}>
                    <div style={{ flex: '0 0 35%', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Assigned OMC</div>
                    <div style={{ flex: '1', color: 'var(--text-primary)', fontSize: '0.875rem' }}>{getOmcName(selectedItem.omc_id) || 'Unassigned'}</div>
                  </div>
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '1rem 1.25rem', background: 'var(--surface-bg)' }}>
                    <div style={{ flex: '0 0 35%', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Name</div>
                    <div style={{ flex: '1', color: 'var(--text-primary)', fontSize: '0.875rem' }}>{selectedItem.name}</div>
                  </div>
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '1rem 1.25rem', background: 'var(--surface-bg)' }}>
                    <div style={{ flex: '0 0 35%', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Location</div>
                    <div style={{ flex: '1', color: 'var(--text-primary)', fontSize: '0.875rem' }}>{selectedItem.location || 'N/A'}</div>
                  </div>
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '1rem 1.25rem', background: 'var(--surface-bg)' }}>
                    <div style={{ flex: '0 0 35%', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Contact</div>
                    <div style={{ flex: '1', color: 'var(--text-primary)', fontSize: '0.875rem' }}>{selectedItem.contact || 'N/A'}</div>
                  </div>
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '1rem 1.25rem', background: 'var(--surface-bg)', alignItems: 'center' }}>
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
                  <div style={{ display: 'flex', padding: '1rem 1.25rem', background: 'var(--surface-bg)' }}>
                    <div style={{ flex: '0 0 35%', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Status</div>
                    <div style={{ flex: '1', color: 'var(--text-primary)', fontSize: '0.875rem' }}>{selectedItem.status || 'Active'}</div>
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
                  Delete RO Confirmation
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0 0 1.5rem 0', lineHeight: '1.5' }}>
                  Are you sure you want to delete RO <strong style={{ color: 'var(--text-primary)' }}>"{selectedItem.name}"</strong>? All machines assigned to this RO will be affected. This action cannot be undone.
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
                    <Trash2 size={16} /> Yes, Delete RO
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

export default CreateRO;
