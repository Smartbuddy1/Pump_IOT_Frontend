import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Star, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Download, 
  Search, 
  Filter, 
  Smile, 
  Frown, 
  Meh, 
  Fuel, 
  MapPin, 
  Calendar, 
  ThumbsUp, 
  User, 
  Phone,
  Loader2,
  X
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { exportToPDF, exportHtmlReportToPDF } from '../utils/exportUtils';
import { LOGO_LEFT_BASE64, LOGO_RIGHT_BASE64 } from '../utils/logoAssets';
import PrintHeader from '../components/PrintHeader';
import PrintFooter from '../components/PrintFooter';
import { matchesMachineQuery } from '../utils/machineSearchUtils';

const FeedbackLogs = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const pdfTemplateRef = useRef(null);

  const [feedbacks, setFeedbacks] = useState([]);
  const [allRos, setAllRos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('ALL'); // 'ALL', '5', '4', '3', 'LOW'
  const [omcFilter, setOmcFilter] = useState('ALL');
  const [roFilter, setRoFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL', 'TODAY', 'WEEK', 'MONTH'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const [res, roRes] = await Promise.all([
        api.get('/feedback'),
        api.get('/ro').catch(() => ({ data: { data: [] } }))
      ]);
      if (res.data?.data) {
        setFeedbacks(res.data.data);
      }
      if (roRes.data?.data) {
        setAllRos(Array.isArray(roRes.data.data) ? roRes.data.data : []);
      }
    } catch (err) {
      console.error('Error fetching feedbacks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
    const interval = setInterval(fetchFeedbacks, 10000);

    if (socket) {
      socket.on('new_feedback', (newFb) => {
        setFeedbacks(prev => [newFb, ...prev]);
      });
    }

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('new_feedback');
      }
    };
  }, [socket]);

  // Unique OMCs for filter dropdown
  const uniqueOmcs = Array.from(new Set(feedbacks.map(f => f.omc_name).filter(Boolean)));

  // Unique ROs for filter dropdown (dynamically scoped if omcFilter is active)
  const uniqueRos = Array.from(new Set([
    ...feedbacks
      .filter(f => omcFilter === 'ALL' || f.omc_name === omcFilter)
      .map(f => f.ro_name)
      .filter(Boolean),
    ...allRos
      .filter(r => omcFilter === 'ALL' || !r.omc_name || r.omc_name === omcFilter)
      .map(r => r.name)
      .filter(Boolean)
  ])).sort((a, b) => a.localeCompare(b));

  // Filter logic
  const filteredFeedbacks = feedbacks.filter(fb => {
    const r = Number(fb.rating || 0);

    // Star rating filter
    if (ratingFilter === '5' && r !== 5) return false;
    if (ratingFilter === '4' && r !== 4) return false;
    if (ratingFilter === '3' && r !== 3) return false;
    if (ratingFilter === 'LOW' && r > 2) return false;

    // OMC filter
    if (omcFilter !== 'ALL' && fb.omc_name !== omcFilter) return false;

    // RO filter
    if (roFilter !== 'ALL') {
      const targetRo = String(roFilter).toLowerCase().trim();
      const fbRo = String(fb.ro_name || '').toLowerCase().trim();
      if (fbRo !== targetRo) return false;
    }

    // Date filter
    if (dateFilter !== 'ALL' && fb.created_at) {
      const fbDate = new Date(fb.created_at);
      const now = new Date();
      if (dateFilter === 'TODAY') {
        if (fbDate.toDateString() !== now.toDateString()) return false;
      } else if (dateFilter === 'WEEK') {
        const diffDays = (now - fbDate) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) return false;
      } else if (dateFilter === 'MONTH') {
        const diffDays = (now - fbDate) / (1000 * 60 * 60 * 24);
        if (diffDays > 30) return false;
      }
    }

    // Search term filter - comprehensive search across all visible columns & properties
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase().trim();
      const searchWords = query.split(/\s+/).filter(Boolean);

      const mDisplay = String(fb.display_machine_name || fb.machine_name || (fb.machine_id ? `SBP2T${fb.machine_id}` : 'SBP2T501')).toLowerCase();
      const mId = String(fb.machine_id || '').toLowerCase();
      const fbId = String(fb.id || '').toLowerCase();
      const roDisplay = String(fb.ro_name || 'Retail Outlet Pump').toLowerCase();
      const roLoc = String(fb.ro_location || '').toLowerCase();
      const omcDisplay = String(fb.omc_name || 'OMC').toLowerCase();
      const comment = String(fb.comment || '').toLowerCase();
      const reasons = String(fb.reasons || '').toLowerCase();
      const phone = String(fb.user_phone || '').toLowerCase();
      const userName = String(fb.user_name || '').toLowerCase();

      // Date & Time terms
      let dateTerms = '';
      if (fb.created_at) {
        try {
          const d = new Date(fb.created_at);
          const dGB = d.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' }); // e.g. 27/10/2026
          const dHyphen = dGB.replace(/\//g, '-');
          const tGB = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }); // 10:11 AM
          const monthShort = d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'Asia/Kolkata' }); // Oct
          const monthLong = d.toLocaleDateString('en-GB', { month: 'long', timeZone: 'Asia/Kolkata' }); // October
          dateTerms = `${dGB} ${dHyphen} ${tGB} ${monthShort} ${monthLong} ${d.getFullYear()}`.toLowerCase();

          const now = new Date();
          if (d.toDateString() === now.toDateString()) {
            dateTerms += ' today आज';
          }
        } catch (e) {}
      }

      const searchableText = [
        mDisplay,
        mId,
        `#${fbId}`,
        `id:${fbId}`,
        `machine:${mId}`,
        roDisplay,
        roLoc,
        omcDisplay,
        reasons,
        comment,
        phone,
        userName,
        dateTerms
      ].filter(Boolean).join(' ').toLowerCase();

      // Helper to extract suffix from machine string (e.g. 'SBP2T1202' -> '1202', 'SBP2T202' -> '202')
      const extractMachineSuffix = (str) => {
        return String(str || '').toLowerCase().replace(/^sbp\s*(?:2t)?/i, '').replace(/[^a-z0-9]/g, '');
      };

      const mSuffix = extractMachineSuffix(mDisplay);

      // Fast edit distance helper for typo tolerance (e.g. 1 character typo)
      const getEditDistance = (a, b) => {
        if (a === b) return 0;
        const m = a.length, n = b.length;
        if (Math.abs(m - n) > 2) return 999;
        const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        for (let i = 1; i <= m; i++) {
          for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
          }
        }
        return dp[m][n];
      };

      // Every search word must be found within this record's actual searchable content or match machine suffix/typo
      const isMatch = searchWords.every(word => {
        const cleanWord = word.replace(/^[#:\-_]+/i, '').trim();

        // 1. Direct inclusion
        if (searchableText.includes(word) || (cleanWord && searchableText.includes(cleanWord))) {
          return true;
        }

        // 2. Machine ID matching: last 3 digits, suffix, or prefix+suffix (e.g. '202' or 'SBP2T202' -> 'SBP2T1202')
        if (matchesMachineQuery(mDisplay, word) || (cleanWord && matchesMachineQuery(mDisplay, cleanWord))) {
          return true;
        }

        // 3. Typo tolerance on machine ID or RO name (1 character deviation)
        if (word.length >= 5) {
          if (getEditDistance(word, mDisplay) <= 1 || (cleanWord && getEditDistance(cleanWord, mDisplay) <= 1)) {
            return true;
          }
          if (getEditDistance(word, roDisplay) <= 1) {
            return true;
          }
        }

        return false;
      });

      if (!isMatch) return false;
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredFeedbacks.length / itemsPerPage);
  const currentLogs = filteredFeedbacks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Overall Statistics
  const totalCount = feedbacks.length;
  const avgRating = totalCount > 0 
    ? (feedbacks.reduce((acc, f) => acc + Number(f.rating || 0), 0) / totalCount).toFixed(1)
    : '5.0';

  const happyCount = feedbacks.filter(f => Number(f.rating) >= 4).length;
  const csatPercentage = totalCount > 0 ? Math.round((happyCount / totalCount) * 100) : 100;
  const lowCount = feedbacks.filter(f => Number(f.rating) <= 2).length;

  const formatDisplayDate = (dStr) => {
    if (!dStr) return '-';
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
    } catch (e) {
      return String(dStr);
    }
  };

  const formatDisplayTimeOnly = (dStr) => {
    if (!dStr) return '';
    try {
      const d = new Date(dStr);
      return d.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).toUpperCase();
    } catch (e) {
      return '';
    }
  };

  const formatDisplayTime = (dStr) => {
    if (!dStr) return '-';
    try {
      const d = new Date(dStr);
      const datePart = d.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
      const timePart = d.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).toUpperCase();
      return `${datePart} ${timePart}`;
    } catch (e) {
      return String(dStr);
    }
  };

  // Export to PDF with 100% native Unicode preservation (Marathi, Hindi, English)
  const handleExportPDF = async () => {
    try {
      setGeneratingPdf(true);
      const safeRo = roFilter !== 'ALL' ? `_${roFilter.replace(/\s+/g, '_')}` : '';
      if (pdfTemplateRef.current) {
        await exportHtmlReportToPDF(
          pdfTemplateRef.current,
          `Customer_Hygiene_Ratings_Report${safeRo}_${new Date().toISOString().split('T')[0]}.pdf`,
          { orientation: 'portrait', margin: 10 }
        );
      } else {
        window.print();
      }
    } catch (err) {
      console.error('Error exporting PDF:', err);
      window.print();
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div style={{ padding: '0.5rem 2rem 2rem 2rem', animation: 'fadeIn 0.5s ease-in', maxWidth: '1400px', margin: '0 auto', color: 'var(--text-primary)' }}>
      {/* Print Specific CSS */}
      <style>{`
        @media screen {
          .print-only-table, thead.print-only-head {
            display: none !important;
          }
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          .no-print, .screen-table-head, .screen-table-body, .pagination-controls {
            display: none !important;
          }
          thead.print-only-head {
            display: table-header-group !important;
          }
          tbody.print-only-table {
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

      {/* Corporate Print Header */}
      <PrintHeader title="CUSTOMER HYGIENE RATINGS & FEEDBACK LOGS REPORT" />

      {/* Page Header */}
      <div className="no-print" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>
            <MessageSquare color="#8b5cf6" size={32} />
            Customer Ratings & Feedback Logs
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Real-time public sanitation reviews, CSAT scores, and machine feedback logs scanned via QR codes.
          </p>
        </div>

        {/* PDF Export Button (Top Right) */}
        <div>
          <button
            onClick={handleExportPDF}
            disabled={generatingPdf}
            style={{
              padding: '0.55rem 1.15rem',
              background: 'var(--surface-bg)',
              color: '#ef4444',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              cursor: generatingPdf ? 'wait' : 'pointer',
              fontWeight: '600',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              opacity: generatingPdf ? 0.75 : 1
            }}
            onMouseOver={(e) => {
              if (!generatingPdf) e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
            }}
            onMouseOut={(e) => {
              if (!generatingPdf) e.currentTarget.style.background = 'var(--surface-bg)';
            }}
            title="Export as PDF"
          >
            {generatingPdf ? (
              <>
                <Loader2 size={16} className="animate-spin" color="#ef4444" />
                Generating...
              </>
            ) : (
              <>
                <Download size={16} color="#ef4444" />
                PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Top Summary KPI Cards */}
      <div className="no-print" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '1.75rem'
      }}>
        {/* Total Feedbacks */}
        <div style={{
          background: 'var(--surface-bg)',
          borderRadius: '12px',
          padding: '1.1rem 1.25rem',
          border: '1px solid var(--border-color)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '88px',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
              Total Feedbacks
            </span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare color="#3b82f6" size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '0.4rem', lineHeight: 1 }}>
            {totalCount}
          </div>
        </div>

        {/* Average Rating */}
        <div style={{
          background: 'var(--surface-bg)',
          borderRadius: '12px',
          padding: '1.1rem 1.25rem',
          border: '1px solid var(--border-color)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '88px',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
              Average Rating
            </span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star color="#f59e0b" fill="#f59e0b" size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '0.4rem', lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: '5px' }}>
            {avgRating} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500' }}>/ 5.0</span>
          </div>
        </div>

        {/* CSAT Score */}
        <div style={{
          background: 'var(--surface-bg)',
          borderRadius: '12px',
          padding: '1.1rem 1.25rem',
          border: '1px solid var(--border-color)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '88px',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
              Customer Satisfaction
            </span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Smile color="#10b981" size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '0.4rem', lineHeight: 1 }}>
            {csatPercentage}%
          </div>
        </div>

        {/* Complaints / Issues */}
        <div style={{
          background: 'var(--surface-bg)',
          borderRadius: '12px',
          padding: '1.1rem 1.25rem',
          border: '1px solid var(--border-color)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '88px',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
              Complaints
            </span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: lowCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle color={lowCount > 0 ? '#ef4444' : '#10b981'} size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: '800', color: lowCount > 0 ? '#ef4444' : 'var(--text-primary)', marginTop: '0.4rem', lineHeight: 1 }}>
            {lowCount}
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="no-print" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', minWidth: '280px', flex: '1', maxWidth: '420px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Search by Machine, RO, OMC, Comment, Date..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '0.65rem 2.4rem 0.65rem 2.4rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--surface-bg)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem'
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                padding: '4px'
              }}
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Rating filter */}
          <select
            value={ratingFilter}
            onChange={(e) => {
              setRatingFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--surface-bg)',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Ratings</option>
            <option value="5">5 Stars (Excellent)</option>
            <option value="4">4 Stars (Good)</option>
            <option value="3">3 Stars (Average)</option>
            <option value="LOW">1-2 Stars (Complaints)</option>
          </select>

          {/* OMC filter */}
          {uniqueOmcs.length > 0 && (
            <select
              value={omcFilter}
              onChange={(e) => {
                setOmcFilter(e.target.value);
                setRoFilter('ALL');
                setCurrentPage(1);
              }}
              style={{
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--surface-bg)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All OMCs</option>
              {uniqueOmcs.map((o, idx) => (
                <option key={idx} value={o}>{o}</option>
              ))}
            </select>
          )}

          {/* RO filter */}
          <select
            value={roFilter}
            onChange={(e) => {
              setRoFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--surface-bg)',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All ROs</option>
            {uniqueRos.map((roName, idx) => (
              <option key={idx} value={roName}>{roName}</option>
            ))}
          </select>

          {/* Date filter */}
          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--surface-bg)',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Today</option>
            <option value="WEEK">Last 7 Days</option>
            <option value="MONTH">This Month</option>
          </select>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="glass-panel" style={{
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        background: 'var(--surface-bg)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          
          {/* Screen Table Head */}
          <thead className="screen-table-head" style={{ backgroundColor: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)' }}>
            <tr>
              <th style={{ padding: '1rem 1.25rem', fontWeight: '700', width: '130px' }}>MACHINE ID</th>
              <th style={{ padding: '1rem 1.25rem', fontWeight: '700' }}>PETROL PUMP (RO)</th>
              <th style={{ padding: '1rem 1.25rem', fontWeight: '700', width: '110px' }}>OMC</th>
              <th style={{ padding: '1rem 1.25rem', fontWeight: '700', width: '140px' }}>RATING</th>
              <th style={{ padding: '1rem 1.25rem', fontWeight: '700' }}>CUSTOMER REASONS</th>
              <th style={{ padding: '1rem 1.25rem', fontWeight: '700' }}>COMMENTS</th>
              <th style={{ padding: '1rem 1.25rem', fontWeight: '700', textAlign: 'right', width: '140px' }}>LOGGED TIME</th>
            </tr>
          </thead>

          {/* Print Table Head */}
          <thead className="print-only-head">
            <tr style={{ background: '#059669', color: '#ffffff', borderBottom: '2px solid #047857' }}>
              <th style={{ padding: '8px 10px', fontWeight: '700' }}>MACHINE ID</th>
              <th style={{ padding: '8px 10px', fontWeight: '700' }}>PETROL PUMP (RO)</th>
              <th style={{ padding: '8px 10px', fontWeight: '700' }}>OMC</th>
              <th style={{ padding: '8px 10px', fontWeight: '700' }}>RATING</th>
              <th style={{ padding: '8px 10px', fontWeight: '700' }}>REASONS / ISSUES</th>
              <th style={{ padding: '8px 10px', fontWeight: '700' }}>COMMENTS</th>
              <th style={{ padding: '8px 10px', fontWeight: '700', textAlign: 'right' }}>LOGGED TIME</th>
            </tr>
          </thead>

          {/* Screen Table Body */}
          <tbody className="screen-table-body">
            {currentLogs.length > 0 ? currentLogs.map((fb, idx) => {
              const r = Number(fb.rating || 5);
              const isLow = r <= 2;
              const isHigh = r >= 4;
              const machineId = fb.display_machine_name || fb.machine_name || (fb.machine_id ? `SBP2T${fb.machine_id}` : 'SBP2T501');

              return (
                <tr
                  key={fb.id || idx}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    transition: 'background 0.15s ease',
                    backgroundColor: isLow ? 'rgba(239, 68, 68, 0.04)' : 'transparent'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isLow ? 'rgba(239, 68, 68, 0.08)' : 'var(--hover-bg, rgba(243, 244, 246, 0.5))'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isLow ? 'rgba(239, 68, 68, 0.04)' : 'transparent'}
                >
                  {/* Machine ID */}
                  <td style={{ padding: '1.25rem', verticalAlign: 'top' }}>
                    <span style={{
                      fontWeight: '800',
                      color: '#8b5cf6',
                      background: 'rgba(139, 92, 246, 0.12)',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      display: 'inline-block'
                    }}>
                      {machineId}
                    </span>
                  </td>

                  {/* Petrol Pump (RO) */}
                  <td style={{ padding: '1.25rem', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {fb.ro_name || 'Retail Outlet Pump'}
                    </div>
                    {fb.ro_location && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <MapPin size={12} /> {fb.ro_location}
                      </div>
                    )}
                  </td>

                  {/* OMC */}
                  <td style={{ padding: '1.25rem', verticalAlign: 'top' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      color: '#3b82f6',
                      background: 'rgba(59, 130, 246, 0.1)',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '4px'
                    }}>
                      {fb.omc_name || 'OMC'}
                    </span>
                  </td>

                  {/* Rating Stars & Badge */}
                  <td style={{ padding: '1.25rem', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginBottom: '4px' }}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star 
                          key={s} 
                          size={14} 
                          fill={s <= r ? '#f59e0b' : 'none'} 
                          color={s <= r ? '#f59e0b' : '#cbd5e1'} 
                        />
                      ))}
                    </div>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      backgroundColor: isLow 
                        ? 'rgba(239, 68, 68, 0.15)' 
                        : isHigh 
                          ? 'rgba(16, 185, 129, 0.15)' 
                          : 'rgba(245, 158, 11, 0.15)',
                      color: isLow ? '#ef4444' : isHigh ? '#10b981' : '#d97706'
                    }}>
                      {isLow ? <AlertTriangle size={11} /> : isHigh ? <CheckCircle2 size={11} /> : <Meh size={11} />}
                      {r}.0 Stars
                    </span>
                  </td>

                  {/* Customer Reasons */}
                  <td style={{ padding: '1.25rem', verticalAlign: 'top' }}>
                    {fb.reasons ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {String(fb.reasons).split(',').map((reason, rIdx) => {
                          const trimmed = reason.trim();
                          if (!trimmed) return null;
                          return (
                            <span
                              key={rIdx}
                              style={{
                                background: isLow 
                                  ? 'rgba(239, 68, 68, 0.1)' 
                                  : 'rgba(16, 185, 129, 0.1)',
                                color: isLow ? '#ef4444' : '#10b981',
                                border: isLow 
                                  ? '1px solid rgba(239, 68, 68, 0.25)' 
                                  : '1px solid rgba(16, 185, 129, 0.25)',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: '600'
                              }}
                            >
                              {trimmed}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>-</span>
                    )}
                  </td>

                  {/* Comment */}
                  <td style={{ padding: '1.25rem', verticalAlign: 'top', maxWidth: '300px' }}>
                    {fb.comment ? (
                      <div style={{ fontStyle: 'italic', color: 'var(--text-primary)', fontSize: '0.85rem', lineHeight: 1.4 }}>
                        "{fb.comment}"
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>No comments written</span>
                    )}
                    {fb.user_phone && (
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={12} color="#3b82f6" /> {fb.user_phone}
                      </div>
                    )}
                  </td>

                  {/* Logged Time */}
                  <td style={{ padding: '1.25rem', verticalAlign: 'top', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {formatDisplayDate(fb.created_at)}
                    </div>
                    <div style={{ fontSize: '0.74rem', opacity: 0.9, marginTop: '2px', color: '#6366f1', fontWeight: '600' }}>
                      {formatDisplayTimeOnly(fb.created_at)}
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No customer feedbacks found matching your filters.
                </td>
              </tr>
            )}
          </tbody>

          {/* Print Table Body */}
          <tbody className="print-only-table">
            {filteredFeedbacks.map((fb, idx) => (
              <tr key={`print-${idx}`} style={{ borderBottom: '1px solid #cbd5e1' }}>
                <td style={{ padding: '6px 8px', fontWeight: 'bold' }}>{fb.display_machine_name || fb.machine_name}</td>
                <td style={{ padding: '6px 8px' }}>{fb.ro_name || 'Retail Outlet'}</td>
                <td style={{ padding: '6px 8px' }}>{fb.omc_name || 'OMC'}</td>
                <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 'bold' }}>★ {Number(fb.rating).toFixed(1)}</td>
                <td style={{ padding: '6px 8px' }}>{fb.reasons || '-'}</td>
                <td style={{ padding: '6px 8px' }}>{fb.comment || '-'}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>{formatDisplayTime(fb.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination Controls */}
        <div className="no-print pagination-controls" style={{
          padding: '1rem 1.5rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'rgba(0,0,0,0.01)'
        }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={{ padding: '0.45rem 1rem', border: '1px solid var(--border-color)', borderRadius: '6px', background: currentPage === 1 ? 'var(--border-color)' : 'var(--surface-bg)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: 'var(--text-primary)', fontWeight: '500', fontSize: '0.82rem' }}
            >
              Previous
            </button>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem', fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
              {currentPage} / {Math.max(totalPages, 1)}
            </div>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              style={{ padding: '0.45rem 1rem', border: '1px solid var(--border-color)', borderRadius: '6px', background: currentPage === totalPages || totalPages === 0 ? 'var(--border-color)' : 'var(--surface-bg)', cursor: currentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer', color: 'var(--text-primary)', fontWeight: '500', fontSize: '0.82rem' }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Corporate Print Footer */}
      <PrintFooter />

      {/* Hidden HD Report Template for 100% Native Unicode PDF Export (Preserves exact Hindi/Marathi text) */}
      <div
        ref={pdfTemplateRef}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '800px',
          background: '#ffffff',
          color: '#1e293b',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Nirmala UI', sans-serif",
          padding: '24px 20px',
          boxSizing: 'border-box'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ width: '160px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
            <img src={LOGO_LEFT_BASE64} alt="Client Logo" style={{ maxHeight: '68px', maxWidth: '155px', objectFit: 'contain' }} />
          </div>
          <div style={{ textAlign: 'center', flex: 1, padding: '0 10px' }}>
            <h1 style={{ margin: '0 0 3px 0', color: '#059669', fontSize: '15px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              SMARTBUDDY PETROLEUM IOT PLATFORM
            </h1>
            <h2 style={{ margin: '0 0 5px 0', color: '#1e293b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>
              CUSTOMER HYGIENE RATINGS & FEEDBACK LOGS REPORT
            </h2>
            <div style={{ color: '#475569', fontSize: '9.5px', fontWeight: '600', display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span>OMC: <strong style={{ color: '#0f172a' }}>{omcFilter !== 'ALL' ? omcFilter : (user?.role === 'OMC Admin' ? 'OMC Admin' : (user?.role === 'User' || user?.role === 'RO Manager' ? 'RO Manager' : 'SuperAdmin'))}</strong></span>
              {roFilter !== 'ALL' && <span>RO: <strong style={{ color: '#0f172a' }}>{roFilter}</strong></span>}
              <span>Total: <strong style={{ color: '#0f172a' }}>{filteredFeedbacks.length}</strong></span>
              <span>Date: <strong style={{ color: '#0f172a' }}>{new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</strong></span>
            </div>
          </div>
          <div style={{ width: '160px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <img src={LOGO_RIGHT_BASE64} alt="Company Logo" style={{ maxHeight: '68px', maxWidth: '155px', objectFit: 'contain' }} />
          </div>
        </div>

        {/* Separator Line */}
        <div style={{ borderBottom: '2px solid #059669', marginBottom: '14px' }} />

        {/* Table with Exact Hindi/Marathi Unicode Support */}
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '9.5px' }}>
          <thead>
            <tr style={{ background: '#059669', color: '#ffffff' }}>
              <th style={{ padding: '7px 8px', fontWeight: '700', border: '1px solid #047857', width: '90px' }}>MACHINE ID</th>
              <th style={{ padding: '7px 8px', fontWeight: '700', border: '1px solid #047857', width: '135px' }}>PETROL PUMP (RO)</th>
              <th style={{ padding: '7px 8px', fontWeight: '700', border: '1px solid #047857', width: '65px' }}>OMC</th>
              <th style={{ padding: '7px 8px', fontWeight: '700', border: '1px solid #047857', textAlign: 'center', width: '60px' }}>RATING</th>
              <th style={{ padding: '7px 8px', fontWeight: '700', border: '1px solid #047857', width: '145px' }}>CUSTOMER REASONS</th>
              <th style={{ padding: '7px 8px', fontWeight: '700', border: '1px solid #047857', width: '185px' }}>CUSTOMER COMMENTS</th>
              <th style={{ padding: '7px 8px', fontWeight: '700', border: '1px solid #047857', textAlign: 'right', width: '100px' }}>DATE & TIME</th>
            </tr>
          </thead>
          <tbody>
            {filteredFeedbacks.length > 0 ? filteredFeedbacks.map((fb, idx) => {
              const r = Number(fb.rating || 5);
              const isLow = r <= 2;
              const isHigh = r >= 4;
              const ratingColor = isLow ? '#ef4444' : isHigh ? '#10b981' : '#f59e0b';
              const ratingBg = isLow ? 'rgba(239, 68, 68, 0.1)' : isHigh ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)';

              return (
                <tr key={idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 'bold', border: '1px solid #cbd5e1', color: '#6d28d9' }}>
                    {fb.display_machine_name || fb.machine_name || ('SBP2T' + fb.machine_id)}
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1' }}>
                    <div style={{ fontWeight: '600', color: '#0f172a' }}>{fb.ro_name || 'Retail Outlet'}</div>
                    {fb.ro_location && <div style={{ fontSize: '8.5px', color: '#64748b' }}>{fb.ro_location}</div>}
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', fontWeight: '600' }}>
                    {fb.omc_name || 'OMC'}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: '800',
                      color: ratingColor,
                      background: ratingBg,
                      border: `1px solid ${ratingColor}40`,
                      fontSize: '9px'
                    }}>
                      ★ {r.toFixed(1)}
                    </span>
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', lineHeight: '1.3' }}>
                    {fb.reasons ? (
                      <span style={{ color: isLow ? '#dc2626' : '#059669', fontWeight: '600' }}>
                        {fb.reasons}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', lineHeight: '1.3' }}>
                    {fb.comment ? (
                      <div>
                        <span style={{ fontStyle: 'italic', color: '#1e293b' }}>"{fb.comment}"</span>
                        {fb.user_phone && <div style={{ fontSize: '8.5px', color: '#3b82f6', marginTop: '2px' }}>📞 {fb.user_phone}</div>}
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', border: '1px solid #cbd5e1', color: '#475569', whiteSpace: 'nowrap', fontSize: '9px' }}>
                    {formatDisplayTime(fb.created_at)}
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="7" style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
                  No feedbacks recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FeedbackLogs;
