import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Cpu, Search, Edit, Trash2, Plus, Eye, EyeOff, X, Wifi, WifiOff, MapPin, Calendar, CheckSquare, Settings2, FileText, Download, AlertTriangle, Star, CheckCircle2, Sparkles, ShieldCheck, Activity, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-toastify';
import api from '../services/api';
import { exportToPDF } from '../utils/exportUtils';
import PrintHeader from '../components/PrintHeader';
import PrintFooter from '../components/PrintFooter';
import { useAuth } from '../context/AuthContext';
import { getConsolidatedAlerts } from '../utils/alertUtils';
import { matchesMachineQuery } from '../utils/machineSearchUtils';
import { calculateMachineRating } from '../components/TopRatedMachinesCard';

const Machines = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const statusFilter = searchParams.get('status');

  const [activeTab, setActiveTab] = useState('Machines');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states - synchronously initialized from URL to eliminate header/footer flash
  const [openedFromDashboard, setOpenedFromDashboard] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('action') === 'add');
  const [modalType, setModalType] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'add') return 'add';
    }
    return null;
  });
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showWifiPassword, setShowWifiPassword] = useState(false);
  
  // formData includes new fields for IoT
  const [formData, setFormData] = useState({ 
    id: '', 
    status: 'ACTIVE', 
    roId: '',
    toiletId: '',
    toiletType: 'E2T Eco-Toilet',
    installDate: '',
    wifiName: '',
    wifiPassword: '',
    tempLimitMin: '15',
    tempLimitMax: '45',
    waterLevelLimit: '20',
    odourLimitLow: '30',
    odourLimitMedium: '60',
    odourLimitDanger: '90',
    liveNh3: '0',
    liveH2s: '0',
    nh3LimitLow: '25',
    nh3LimitDanger: '50',
    h2sLimitLow: '10',
    h2sLimitDanger: '20'
  });

  // Load ROs and OMCs for dynamic client linking
  const [roList, setRoList] = useState([]);
  const [omcList, setOmcList] = useState([]);
  const [toiletList, setToiletList] = useState([]);
  const [alertsList, setAlertsList] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roRes, omcRes, alertsRes] = await Promise.all([
          api.get('/ro').catch(() => ({ data: { data: [] } })),
          api.get('/omc').catch(() => ({ data: { data: [] } })),
          api.get('/alerts').catch(() => ({ data: { data: [] } }))
        ]);
        
        if (roRes.data?.data) {
          // Keep clean ID, db_id, name, and omcId
          setRoList(roRes.data.data.map(r => ({ ...r, id: r.id, db_id: r.id, omcId: r.omc_id })));
        }
        if (omcRes.data?.data) {
          setOmcList(omcRes.data.data);
        }
        if (alertsRes.data?.data || alertsRes.data) {
          const rawAlerts = Array.isArray(alertsRes.data?.data)
            ? alertsRes.data.data
            : (Array.isArray(alertsRes.data) ? alertsRes.data : []);
          const consAlerts = getConsolidatedAlerts({
            rawAlerts,
            machines: [],
            ros: roRes.data?.data || [],
            omcs: omcRes.data?.data || [],
            user
          });
          setAlertsList(consAlerts);
        }
      } catch (err) {
        console.error("Error fetching auxiliary data:", err);
      }
    };
    fetchData();
  }, []);

  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMachines = async () => {
    try {
      const response = await api.get('/machines');
      const data = response.data;
      
      if (data && data.success && Array.isArray(data.data)) {
        // Map backend DB fields to frontend component state
        const mappedMachines = data.data.map(m => {
          let rawTemp = m.live_temp ?? m.liveTemp ?? m.tempLimitMedium ?? '28';
          let cleanTemp = String(rawTemp).replace(/[^0-9.-]/g, '');
          if (cleanTemp === '26' && m.tempLimitMedium && String(m.tempLimitMedium) !== '26') {
            cleanTemp = String(m.tempLimitMedium);
          }
          const tempVal = cleanTemp ? `${cleanTemp}°C` : '28°C';

          let rawHumidity = m.live_humidity ?? m.liveHumidity ?? m.humidityLimitMedium ?? '50';
          let cleanHumidity = String(rawHumidity).replace(/[^0-9.-]/g, '');
          if (cleanHumidity === '30' && m.humidityLimitMedium && String(m.humidityLimitMedium) !== '30') {
            cleanHumidity = String(m.humidityLimitMedium);
          }
          const humidityVal = cleanHumidity ? `${cleanHumidity}%` : '50%';

          const rawWater = m.live_water ?? m.liveWater ?? 'Normal';
          const cleanWater = String(rawWater).replace('%', '').trim().toLowerCase();
          const numWater = parseInt(cleanWater, 10);
          const isExplicitZeroPercent = String(rawWater).includes('%') && numWater === 0;
          const waterVal = (cleanWater === 'empty' || isExplicitZeroPercent)
            ? 'Empty'
            : ((cleanWater === 'low' || (!isNaN(numWater) && String(rawWater).includes('%') && numWater <= 25))
                ? 'Low'
                : 'Normal');

          let rawOdour = m.live_odour ?? m.liveOdour ?? m.odourLimitMedium ?? '40';
          let cleanOdour = String(rawOdour).replace(/[^0-9.-]/g, '');
          if (cleanOdour === '40' && m.odourLimitMedium && String(m.odourLimitMedium) !== '40') {
            cleanOdour = String(m.odourLimitMedium);
          }
          const odourVal = cleanOdour ? `${cleanOdour} PPM` : (String(rawOdour).toLowerCase() === 'normal' ? 'Normal' : `${rawOdour} PPM`);

          let rawNh3 = m.live_nh3 ?? m.liveNh3;
          let cleanNh3 = (rawNh3 !== undefined && rawNh3 !== null && String(rawNh3).trim() !== '') ? String(rawNh3).replace(/[^0-9.-]/g, '') : '';
          if (cleanNh3 === '' && cleanOdour !== '') {
            const oNum = parseFloat(cleanOdour);
            cleanNh3 = isNaN(oNum) || oNum <= 40 ? '0' : String(Math.round((oNum - 40) * 0.55));
          }
          const nh3Val = cleanNh3 !== '' ? `${cleanNh3} PPM` : '0 PPM';

          let rawH2s = m.live_h2s ?? m.liveH2s;
          let cleanH2s = (rawH2s !== undefined && rawH2s !== null && String(rawH2s).trim() !== '') ? String(rawH2s).replace(/[^0-9.-]/g, '') : '';
          if (cleanH2s === '' && cleanOdour !== '') {
            const oNum = parseFloat(cleanOdour);
            cleanH2s = isNaN(oNum) || oNum <= 40 ? '0' : String(Math.round((oNum - 40) * 0.35));
          }
          const h2sVal = cleanH2s !== '' ? `${cleanH2s} PPM` : '0 PPM';

          let resolvedRoId = m.ro_id ?? m.roId;
          const matchedRoObj = roList.find(r => 
            String(r.id) === String(resolvedRoId) || 
            String(r.db_id) === String(resolvedRoId) ||
            (r.name && r.name.toLowerCase() === String(resolvedRoId).toLowerCase())
          );
          if (matchedRoObj) {
            resolvedRoId = matchedRoObj.id;
          } else {
            const cleanRo = parseInt(String(resolvedRoId).replace(/[^0-9]/g, ''), 10);
            if (!resolvedRoId || isNaN(cleanRo)) {
              if (String(m.name || m.id).includes('102')) resolvedRoId = 1;
              else if (String(m.name || m.id).includes('103')) resolvedRoId = 4;
              else resolvedRoId = 1;
            }
          }

          const isParentRoInactive = (m.ro_status && String(m.ro_status).toLowerCase() === 'inactive') || (matchedRoObj && String(matchedRoObj.status || '').toLowerCase() === 'inactive');
          const effectiveStatus = isParentRoInactive ? 'Inactive' : (m.status || 'ACTIVE');

          let rawName = m.name || m.id || `SBP2T${100 + Number(m.db_id || 1)}`;
          let cleanMachineName = String(rawName).replace(/SBE2T/gi, 'SBP2T');
          return {
            db_id: m.db_id || m.id,
            id: cleanMachineName,
            name: cleanMachineName,
            roId: resolvedRoId,
            ro_status: m.ro_status || matchedRoObj?.status || 'Active',
            type: m.type || 'Dispenser',
            status: effectiveStatus,
            liveTemp: tempVal,
            liveWater: waterVal,
            liveHumidity: humidityVal,
            liveOdour: odourVal,
            liveNh3: nh3Val,
            liveH2s: h2sVal,
            live_temp: cleanTemp || '28',
            live_water: waterVal,
            live_humidity: cleanHumidity || '50',
            live_odour: cleanOdour || '40',
            live_nh3: cleanNh3 || '0',
            live_h2s: cleanH2s || '0',
            wifiName: m.wifi_name || m.wifiName || '',
            wifiPassword: m.wifi_password || m.wifiPassword || '',
            installDate: toLocalYMD(m.install_date || m.installDate || m.created_at || ''),
            tempLimitLow: String(m.temp_limit_low ?? m.tempLimitLow ?? '20'),
            tempLimitMedium: String(m.temp_limit_medium ?? m.tempLimitMedium ?? '30'),
            tempLimitDanger: String(m.temp_limit_danger ?? m.tempLimitDanger ?? '41'),
            humidityLimitLow: String(m.humidity_limit_low ?? m.humidityLimitLow ?? '35'),
            humidityLimitMedium: String(m.humidity_limit_medium ?? m.humidityLimitMedium ?? '70'),
            humidityLimitDanger: String(m.humidity_limit_danger ?? m.humidityLimitDanger ?? '76'),
            waterLevelTrigger: String(m.water_level_trigger ?? m.waterLevelTrigger ?? m.waterLimitLow ?? 'Low'),
            waterLimitLow: String(m.water_level_trigger ?? m.waterLevelTrigger ?? m.waterLimitLow ?? 'Low'),
            odourLimitLow: String(m.odour_limit_low ?? m.odourLimitLow ?? '40'),
            odourLimitMedium: String(m.odour_limit_medium ?? m.odourLimitMedium ?? '60'),
            odourLimitDanger: String(m.odour_limit_danger ?? m.odourLimitDanger ?? '71'),
            nh3LimitLow: String(m.nh3_limit_low ?? m.nh3LimitLow ?? '25'),
            nh3LimitDanger: String(m.nh3_limit_danger ?? m.nh3LimitDanger ?? '50'),
            h2sLimitLow: String(m.h2s_limit_low ?? m.h2sLimitLow ?? '10'),
            h2sLimitDanger: String(m.h2s_limit_danger ?? m.h2sLimitDanger ?? '20')
          };
        });
        setMachines(mappedMachines);
      }
    } catch (err) {
      console.error("Error fetching machines:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
    // Auto-refresh telemetry every 10 seconds
    const interval = setInterval(fetchMachines, 10000);
    return () => clearInterval(interval);
  }, []);

  // Helper to find RO by numeric ID, db_id, string ID, or name
  const getRo = (roId) => {
    if (!roId && roId !== 0) return null;
    const rawStr = String(roId).trim();
    const cleanNum = parseInt(rawStr.replace(/[^0-9]/g, ''), 10);
    
    return roList.find(r => {
      if (!r) return false;
      const rNum = parseInt(String(r.id ?? r.db_id).replace(/[^0-9]/g, ''), 10);
      if (!isNaN(cleanNum) && !isNaN(rNum) && cleanNum === rNum) return true;
      if (String(r.id).toLowerCase() === rawStr.toLowerCase()) return true;
      if (String(r.db_id).toLowerCase() === rawStr.toLowerCase()) return true;
      if (r.name && r.name.toLowerCase() === rawStr.toLowerCase()) return true;
      return false;
    });
  };

  // Helper to get RO Name directly without any ID
  const getRoName = (roId) => {
    const ro = getRo(roId);
    if (ro) return ro.name;
    return 'Unassigned';
  };

  // Helper to get OMC (Client) Name based on RO
  const getClientNameByRo = (roId) => {
    const ro = getRo(roId);
    if (!ro) {
      return 'N/A';
    }
    const omcId = ro.omc_id || ro.omcId;
    if (!omcId) return 'N/A';
    const omc = omcList.find(o => String(o.id) === String(omcId));
    return omc ? omc.name : 'Unknown Client';
  };

  const toLocalYMD = (val) => {
    if (!val) return '';
    const str = String(val).trim();
    const pureYmd = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (pureYmd && !str.includes('T') && !str.includes('Z')) {
      const y = pureYmd[1];
      const m = pureYmd[2].padStart(2, '0');
      const d = pureYmd[3].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const dateObj = new Date(val);
    if (!isNaN(dateObj.getTime())) {
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return str.split('T')[0];
  };

  const formatDisplayDate = (d) => {
    if (!d) return '-';
    try {
      const ymd = toLocalYMD(d);
      const parts = ymd.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    } catch (e) {}
    return String(d);
  };

  const getToiletName = (toiletId) => {
    const toilet = toiletList.find(t => t.id === toiletId);
    return toilet ? `${toilet.id} - ${toilet.name}` : toiletId || 'Unassigned';
  };

  // Machine rating and alert helper functions
  const getMachineAlerts = (machine) => {
    if (!machine) return [];
    const mId = String(machine.name || machine.id || '').trim().toLowerCase();
    return alertsList.filter(a => {
      const aId = String(a.machineName || a.machineId || a.machine_id || '').trim().toLowerCase();
      if (!aId || !mId) return false;
      return aId === mId || (aId.replace(/\D/g, '') !== '' && aId.replace(/\D/g, '') === mId.replace(/\D/g, ''));
    });
  };

  const getMachineRating = (machine) => {
    if (!machine) return 5.0;
    const mAlerts = getMachineAlerts(machine);
    return calculateMachineRating(machine, mAlerts);
  };

  const renderRatingStars = (rating, size = 15) => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.3;
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<Star key={i} size={size} fill="#f59e0b" color="#f59e0b" style={{ marginRight: '1px' }} />);
      } else if (i === fullStars + 1 && hasHalf) {
        stars.push(
          <span key={i} style={{ position: 'relative', display: 'inline-block', marginRight: '1px', width: `${size}px`, height: `${size}px` }}>
            <Star size={size} color="#d1d5db" style={{ position: 'absolute', top: 0, left: 0 }} />
            <span style={{ position: 'absolute', top: 0, left: 0, width: '50%', overflow: 'hidden' }}>
              <Star size={size} fill="#f59e0b" color="#f59e0b" />
            </span>
          </span>
        );
      } else {
        stars.push(<Star key={i} size={size} color="#d1d5db" style={{ marginRight: '1px' }} />);
      }
    }
    return stars;
  };

  const downloadQRCode = (machine) => {
    try {
      const svgElement = document.getElementById('machine-qr-code-svg');
      if (!svgElement) return;

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      const size = 600;
      canvas.width = size;
      canvas.height = size;

      img.onload = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);

        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        const machineName = String(machine?.name || machine?.id || 'Machine').replace(/[^a-zA-Z0-9_-]/g, '_');
        downloadLink.download = `QR_${machineName}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err) {
      console.error('Error downloading QR code:', err);
    }
  };

  // Helper to generate sequential Machine ID based on assigned RO: SBP2T + [RO ID] + [01, 02...]
  const getNextSequentialId = (targetRoId) => {
    if (!targetRoId && targetRoId !== 0) return 'SBP2T101';
    const cleanRoNum = parseInt(String(targetRoId).replace(/\D/g, ''), 10) || 1;
    const existingInRo = machines.filter(m => {
      const mRo = String(m.roId ?? m.ro_id ?? '');
      return mRo === String(targetRoId) || mRo.replace(/\D/g, '') === String(cleanRoNum);
    });

    const existingUnits = existingInRo.map(m => {
      const str = String(m.name || m.id || '');
      // Match unit sequence at the end of SBP2T{roId}{unit}
      const match = str.match(new RegExp(`SBP2T${cleanRoNum}0?(\\d+)$`, 'i'));
      return match ? parseInt(match[1], 10) : 0;
    }).filter(n => n > 0);

    const nextUnit = existingUnits.length > 0 ? Math.max(...existingUnits) + 1 : (existingInRo.length + 1);
    const unitStr = nextUnit < 10 ? `0${nextUnit}` : `${nextUnit}`;
    return `SBP2T${cleanRoNum}${unitStr}`;
  };

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

  const targetOmcId = isOmcAdmin && assignedOmc ? assignedOmc.id : (isOmcAdmin ? userOmcId : null);

  const specificRo = React.useMemo(() => {
    if (user?.roId) {
      const match = roList.find(r => String(r.id) === String(user.roId) || String(r.db_id) === String(user.roId));
      if (match) return match;
    }
    const userContact = String(user?.mobile || user?.username || '').trim();
    if (userContact) {
      const match = roList.find(r => 
        String(r.contact || '').trim() === userContact ||
        String(r.credentials?.username || '').trim() === userContact
      );
      if (match) return match;
    }
    if (user?.name) {
      const cleanName = String(user.name).replace(/\(.*?\)/g, '').trim().toLowerCase();
      const match = roList.find(r => 
        String(r.name || '').trim().toLowerCase() === cleanName ||
        cleanName.includes(String(r.name || '').trim().toLowerCase())
      );
      if (match) return match;
    }
    if (targetOmcId) {
      const omcRo = roList.find(r => String(r.omc_id || r.omcId) === String(targetOmcId));
      if (omcRo) return omcRo;
    }
    return roList[0] || null;
  }, [user, roList, targetOmcId]);

  const filteredMachines = (() => {
    let baseList = machines;
    if (isOmcAdmin && targetOmcId && roList.length > 0) {
      const validRoIdsForOmc = new Set(roList.filter(r => !targetOmcId || String(r.omc_id || r.omcId) === String(targetOmcId)).map(r => String(r.id)));
      const filtered = baseList.filter(m => {
        const mRo = String(m.roId || m.ro_id || '');
        return validRoIdsForOmc.has(mRo);
      });
      baseList = filtered;
    }
    const term = searchTerm.trim().toLowerCase();
    if (!term) return baseList;

    const cleanNum = term.replace(/^[#idmch\s:\-_]+/i, '').trim();

    return baseList.filter((machine, index) => {
      const displayId = String(index + 1);
      const mDbId = String(machine.db_id || '');
      const machineId = String(machine.id || machine.name || '').toLowerCase();
      const cleanDigits = machineId.replace(/\D/g, '');
      const roName = String(getRoName(machine.roId) || '').toLowerCase();
      const clientName = String(getClientNameByRo(machine.roId) || '').toLowerCase();
      const typeStr = String(machine.type || '').toLowerCase();
      const statusStr = String(machine.status || '').toLowerCase();

      // 1. Direct ID & Last 3 Digits matches
      if (machineId === term) return true;
      if (machineId.includes(term)) return true;
      if (matchesMachineQuery(machineId, term)) return true;
      if (cleanNum && (cleanNum === displayId || term === `#${displayId}` || term === `id ${displayId}`)) return true;
      if (cleanNum && cleanNum === mDbId) return true;
      if (cleanNum && cleanNum.length >= 2 && (cleanDigits.endsWith(cleanNum) || machineId.endsWith(cleanNum))) return true;

      // 2. Text matches
      if (roName.includes(term)) return true;
      if (clientName.includes(term)) return true;
      if (typeStr.includes(term)) return true;
      if (statusStr.includes(term)) return true;

      // 3. Multi-word search
      const searchWords = term.split(/\s+/).filter(Boolean);
      return searchWords.every(word => {
        const cw = word.replace(/^[#idmch\s:\-_]+/i, '').trim();
        if (cw && (cw === displayId || cw === mDbId)) return true;
        if (machineId.includes(word) || matchesMachineQuery(machineId, word) || (cw && matchesMachineQuery(machineId, cw))) return true;
        if (roName.includes(word)) return true;
        if (clientName.includes(word)) return true;
        if (typeStr.includes(word)) return true;
        return false;
      });
    });
  })();

  // Pagination logic
  const totalPages = Math.ceil(filteredMachines.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMachines = filteredMachines.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const openModal = (type, item = null) => {
    setModalType(type);
    setSelectedItem(item);
    if (type === 'edit' && item) {
      const matchedRo = getRo(item.roId || item.ro_id);
      const tempMediumVal = String(item.tempLimitMedium || '30');
      const humMediumVal = String(item.humidityLimitMedium || '65');
      const odourMediumVal = String(item.odourLimitMedium || '60');
      const itemOmcId = matchedRo ? String(matchedRo.omc_id || matchedRo.omcId || '') : '';

      let rawTemp = String(item.liveTemp || item.live_temp || tempMediumVal).replace(/[^0-9.-]/g, '');
      if (rawTemp === '26' && tempMediumVal !== '26') {
        rawTemp = tempMediumVal;
      }

      let rawHumidity = item.liveHumidity || item.live_humidity 
        ? String(item.liveHumidity || item.live_humidity).replace(/[^0-9.-]/g, '') 
        : '50';

      const rawWaterLower = String(item.liveWater || item.live_water || '').toLowerCase();
      const rawWater = rawWaterLower.includes('empty') || rawWaterLower === '0' 
        ? 'Empty' 
        : (rawWaterLower.includes('low') || parseInt(item.liveWater) <= 25 ? 'Low' : 'Normal');

      let rawOdour = item.liveOdour || item.live_odour 
        ? String(item.liveOdour || item.live_odour).replace(/[^0-9.-]/g, '') 
        : '30';

      setFormData({
        id: item.id,
        status: item.status || 'Active',
        roId: matchedRo ? matchedRo.id : (item.roId || item.ro_id || ''),
        omcId: itemOmcId,
        toiletId: item.toiletId || '',
        toiletType: item.toiletType || item.type || 'Dispenser',
        installDate: toLocalYMD(item.installDate || item.install_date || item.created_at || ''),
        wifiName: item.wifiName || item.wifi_name || '',
        wifiPassword: item.wifiPassword || item.wifi_password || '',
        liveTemp: rawTemp || '28',
        liveHumidity: rawHumidity || '50',
        liveWater: rawWater,
        liveOdour: rawOdour || '40',
        liveNh3: item.liveNh3 ? String(item.liveNh3).replace(/[^0-9.-]/g, '') : (item.live_nh3 || '0'),
        liveH2s: item.liveH2s ? String(item.liveH2s).replace(/[^0-9.-]/g, '') : (item.live_h2s || '0'),
        tempLimitLow: String(item.tempLimitLow || item.temp_limit_low || '20'),
        tempLimitMedium: tempMediumVal,
        tempLimitDanger: String(item.tempLimitDanger || item.temp_limit_danger || '41'),
        humidityLimitLow: String(item.humidityLimitLow || item.humidity_limit_low || '35'),
        humidityLimitMedium: humMediumVal,
        humidityLimitDanger: String(item.humidityLimitDanger || item.humidity_limit_danger || '76'),
        waterLevelTrigger: String(item.waterLevelTrigger || item.water_level_trigger || 'Low'),
        waterLimitLow: String(item.waterLevelTrigger || item.water_level_trigger || 'Low'),
        odourLimitLow: String(item.odourLimitLow || item.odour_limit_low || '40'),
        odourLimitMedium: odourMediumVal,
        odourLimitDanger: String(item.odourLimitDanger || item.odour_limit_danger || '71'),
        nh3LimitLow: String(item.nh3LimitLow || item.nh3_limit_low || '25'),
        nh3LimitDanger: String(item.nh3LimitDanger || item.nh3_limit_danger || '50'),
        h2sLimitLow: String(item.h2sLimitLow || item.h2s_limit_low || '10'),
        h2sLimitDanger: String(item.h2sLimitDanger || item.h2s_limit_danger || '20')
      });
    } else {
      let defaultRoId = '';
      let defaultOmcId = '';

      if (isRoUser) {
        if (specificRo && String(specificRo.status || '').toLowerCase() === 'inactive') {
          alert(`Your assigned RO "${specificRo.name}" is Inactive. New machines cannot be registered for an Inactive RO.`);
          return;
        }
        defaultRoId = specificRo?.id || '';
        defaultOmcId = specificRo?.omc_id || specificRo?.omcId || '';
      } else if (isOmcAdmin) {
        defaultOmcId = targetOmcId ? String(targetOmcId) : (assignedOmc?.id ? String(assignedOmc.id) : '');
        const omcRos = roList.filter(ro => (!defaultOmcId || String(ro.omc_id || ro.omcId) === String(defaultOmcId)) && String(ro.status || '').toLowerCase() !== 'inactive');
        defaultRoId = omcRos.length > 0 ? (specificRo?.id && omcRos.some(r => String(r.id) === String(specificRo.id)) ? specificRo.id : omcRos[0].id) : '';
      } else {
        // Super Admin
        defaultOmcId = omcList.length > 0 ? String(omcList[0].id) : '';
        const matchingRos = roList.filter(ro => (!defaultOmcId || String(ro.omc_id || ro.omcId) === String(defaultOmcId)) && String(ro.status || '').toLowerCase() !== 'inactive');
        defaultRoId = matchingRos.length > 0 ? String(matchingRos[0].id) : '';
      }

      const newId = getNextSequentialId(defaultRoId);

      setFormData({ 
        id: newId, 
        status: 'ACTIVE', 
        roId: defaultRoId, 
        omcId: defaultOmcId, 
        toiletId: '',
        toiletType: 'Dispenser',
        installDate: new Date().toISOString().split('T')[0],
        wifiName: '',
        wifiPassword: '',
        liveTemp: '28',
        liveHumidity: '50',
        liveWater: 'Normal',
        liveOdour: '40',
        liveNh3: '22',
        liveH2s: '14',
        tempLimitLow: '20', 
        tempLimitMedium: '30', 
        tempLimitDanger: '41', 
        humidityLimitLow: '35', 
        humidityLimitMedium: '70', 
        humidityLimitDanger: '76', 
        waterLevelTrigger: 'Low', 
        waterLimitLow: 'Low', 
        odourLimitLow: '40', 
        odourLimitMedium: '60', 
        odourLimitDanger: '71',
        nh3LimitLow: '25',
        nh3LimitDanger: '50',
        h2sLimitLow: '10',
        h2sLimitDanger: '20'
      });
    }
  };

  useEffect(() => {
    if (isRoUser && !formData.roId && specificRo?.id) {
      setFormData(prev => ({ ...prev, roId: specificRo.id }));
    } else if (isOmcAdmin && !formData.roId && targetOmcId) {
      const omcRos = roList.filter(ro => String(ro.omc_id || ro.omcId) === String(targetOmcId));
      if (omcRos.length > 0) {
        setFormData(prev => ({ ...prev, roId: omcRos[0].id }));
      }
    }
  }, [isRoUser, isOmcAdmin, specificRo, targetOmcId, roList, formData.roId]);

  const closeModal = () => {
    setModalType(null);
    setSelectedItem(null);
    setOpenedFromDashboard(false);
    setShowWifiPassword(false);
    setFormData({ id: '', status: 'ACTIVE', roId: '', toiletId: '', toiletType: '', installDate: '', wifiName: '', wifiPassword: '', liveTemp: '28', liveHumidity: '50', liveWater: 'Normal', liveOdour: '40', liveNh3: '22', liveH2s: '14', tempLimitLow: '20', tempLimitMedium: '30', tempLimitDanger: '41', humidityLimitLow: '35', humidityLimitMedium: '70', humidityLimitDanger: '76', waterLevelTrigger: 'Low', waterLimitLow: 'Low', odourLimitLow: '40', odourLimitMedium: '60', odourLimitDanger: '71', nh3LimitLow: '25', nh3LimitDanger: '50', h2sLimitLow: '10', h2sLimitDanger: '20' });
  };

  const handleSave = async () => {
    let activeRoId = formData.roId;
    if (!activeRoId) {
      if (isRoUser) {
        activeRoId = specificRo?.id;
      } else if (isOmcAdmin) {
        const omcRos = roList.filter(ro => !targetOmcId || String(ro.omc_id || ro.omcId) === String(targetOmcId));
        activeRoId = omcRos[0]?.id;
      } else if (roList.length > 0) {
        activeRoId = roList[0]?.id;
      }
    }

    if (!formData.id?.trim()) {
      formData.id = getNextSequentialId(activeRoId);
    }

    if (isSuperAdmin && !formData.omcId) {
      alert('Please select an OMC (Petrol Company)');
      return;
    }

    if (!activeRoId) {
      alert('Please assign an RO (Petrol Pump)');
      return;
    }

    const assignedRoObj = getRo(activeRoId);
    if (modalType === 'add' && assignedRoObj && String(assignedRoObj.status || '').toLowerCase() === 'inactive') {
      alert(`Cannot create machine for Inactive RO "${assignedRoObj.name}". Please activate this RO first.`);
      return;
    }

    if (!formData.installDate) {
      alert('Please select Installation Date');
      return;
    }

    if (!formData.tempLimitLow || !formData.tempLimitDanger) {
      alert('Please configure Temp Alert Trigger limits');
      return;
    }

    if (!formData.humidityLimitLow || !formData.humidityLimitDanger) {
      alert('Please configure Humidity Alert Trigger limits');
      return;
    }

    if (!formData.odourLimitLow || !formData.odourLimitDanger) {
      alert('Please configure Odour Alert Trigger limits');
      return;
    }

    if (!formData.nh3LimitLow || !formData.nh3LimitDanger) {
      alert('Please configure NH3 Alert Trigger limits');
      return;
    }

    if (!formData.h2sLimitLow || !formData.h2sLimitDanger) {
      alert('Please configure H2S Alert Trigger limits');
      return;
    }

    if (!formData.waterLevelTrigger) {
      alert('Please select Water Level Alert Trigger');
      return;
    }

    // WiFi Name (SSID) and WiFi Password are intentionally optional and not validated as mandatory

    try {
      const matchedRoObj = getRo(activeRoId);
      const roIdNum = matchedRoObj ? (matchedRoObj.id ?? matchedRoObj.db_id) : (parseInt(String(activeRoId).replace(/\D/g, ''), 10) || activeRoId || 1);
      const isParentRoInactive = matchedRoObj && String(matchedRoObj.status || '').toLowerCase() === 'inactive';
      const autoStatus = isParentRoInactive ? 'Inactive' : 'Active';
      const installDateVal = toLocalYMD(formData.installDate) || toLocalYMD(new Date());
      const machineName = formData.id.trim();

      const rawTempNum = formData.liveTemp 
        ? String(formData.liveTemp).replace(/[^0-9.-]/g, '') 
        : (formData.tempLimitMedium ? String(formData.tempLimitMedium).replace(/[^0-9.-]/g, '') : '28');

      const rawHumNum = formData.liveHumidity 
        ? String(formData.liveHumidity).replace(/[^0-9.-]/g, '') 
        : (formData.humidityLimitMedium ? String(formData.humidityLimitMedium).replace(/[^0-9.-]/g, '') : '50');

      const rawWaterLower = String(formData.liveWater || '').trim().toLowerCase();
      const rawWaterState = (rawWaterLower === 'low' || rawWaterLower.includes('low')) ? 'Low' : 'Normal';
      const rawWaterTrigger = formData.waterLevelTrigger === 'Disabled' ? 'Disabled' : 'Low';

      const rawOdourNum = formData.liveOdour 
        ? String(formData.liveOdour).replace(/[^0-9.-]/g, '') 
        : (formData.odourLimitMedium ? String(formData.odourLimitMedium).replace(/[^0-9.-]/g, '') : '30');

      const rawNh3Num = formData.liveNh3 
        ? String(formData.liveNh3).replace(/[^0-9.-]/g, '') 
        : (rawOdourNum ? String(Math.round(parseFloat(rawOdourNum) * 0.55)) : '22');

      const rawH2sNum = formData.liveH2s 
        ? String(formData.liveH2s).replace(/[^0-9.-]/g, '') 
        : (rawOdourNum ? String(Math.round(parseFloat(rawOdourNum) * 0.35)) : '14');

      const payload = {
        name: machineName,
        ro_id: roIdNum,
        roId: roIdNum,
        type: formData.toiletType || selectedItem?.type || 'Dispenser',
        status: autoStatus,
        install_date: installDateVal,
        installDate: installDateVal,
        created_at: installDateVal,
        live_temp: rawTempNum,
        liveTemp: `${rawTempNum}°C`,
        live_humidity: rawHumNum,
        liveHumidity: `${rawHumNum}%`,
        live_water: rawWaterState,
        liveWater: rawWaterState,
        live_odour: rawOdourNum,
        liveOdour: `${rawOdourNum} PPM`,
        live_nh3: rawNh3Num,
        liveNh3: `${rawNh3Num} PPM`,
        live_h2s: rawH2sNum,
        liveH2s: `${rawH2sNum} PPM`,
        tempLimitLow: formData.tempLimitLow || '20',
        tempLimitMedium: formData.tempLimitMedium || '30',
        tempLimitDanger: formData.tempLimitDanger || '41',
        humidityLimitLow: formData.humidityLimitLow || '35',
        humidityLimitMedium: formData.humidityLimitMedium || '70',
        humidityLimitDanger: formData.humidityLimitDanger || '76',
        waterLevelTrigger: rawWaterTrigger,
        waterLimitLow: rawWaterTrigger,
        odourLimitLow: formData.odourLimitLow || '40',
        odourLimitMedium: formData.odourLimitMedium || '60',
        odourLimitDanger: formData.odourLimitDanger || '71',
        nh3LimitLow: formData.nh3LimitLow || '25',
        nh3LimitDanger: formData.nh3LimitDanger || '50',
        h2sLimitLow: formData.h2sLimitLow || '10',
        h2sLimitDanger: formData.h2sLimitDanger || '20',
        wifiName: formData.wifiName || '',
        wifiPassword: formData.wifiPassword || ''
      };

      if (modalType === 'add') {
        const res = await api.post('/machines', payload);
        const createdMachine = res.data?.data || payload;
        
        // Optimistically add to machines immediately
        setMachines(prev => [
          {
            ...payload,
            db_id: createdMachine.db_id || createdMachine.id || Date.now(),
            id: machineName,
            name: machineName,
            roId: roIdNum,
            ro_id: roIdNum,
            liveTemp: `${rawTempNum}°C`,
            liveWater: rawWaterState,
            liveHumidity: `${rawHumNum}%`,
            liveOdour: `${rawOdourNum} PPM`,
            liveNh3: `${rawNh3Num} PPM`,
            liveH2s: `${rawH2sNum} PPM`,
            installDate: installDateVal
          },
          ...prev
        ]);
        closeModal();
        await fetchMachines(); // Refresh data
        setSearchTerm('');
      } else if (modalType === 'edit') {
        const dbId = selectedItem?.db_id || selectedItem?.id || formData.id;
        if (!dbId) return alert("Cannot update machine without ID");

        const targetId = String(dbId).toLowerCase().trim();
        const targetName = String(machineName || selectedItem?.name || selectedItem?.id || '').toLowerCase().trim();
        const targetDigits = (targetName.replace(/\D/g, '') || targetId.replace(/\D/g, '')).trim();

        const updatedMachineObj = {
          ...selectedItem,
          ...payload,
          id: machineName,
          name: machineName,
          roId: roIdNum,
          ro_id: roIdNum,
          liveTemp: `${rawTempNum}°C`,
          liveWater: rawWaterState,
          liveHumidity: `${rawHumNum}%`,
          liveOdour: `${rawOdourNum} PPM`,
          liveNh3: `${rawNh3Num} PPM`,
          liveH2s: `${rawH2sNum} PPM`,
          live_temp: rawTempNum,
          live_water: rawWaterState,
          live_humidity: rawHumNum,
          live_odour: rawOdourNum,
          live_nh3: rawNh3Num,
          live_h2s: rawH2sNum,
          waterLevelTrigger: rawWaterTrigger,
          waterLimitLow: rawWaterTrigger,
          installDate: installDateVal
        };

        // 1. Optimistically update local React state
        setMachines(prev => prev.map(m => {
          const mId = String(m.id || '').toLowerCase().trim();
          const mDbId = String(m.db_id || '').toLowerCase().trim();
          const mName = String(m.name || '').toLowerCase().trim();

          if (mId === targetId || mDbId === targetId || mName === targetId ||
              mId === targetName || mDbId === targetName || mName === targetName ||
              (targetDigits && targetDigits.length >= 2 && (mName.replace(/\D/g, '') === targetDigits || mId.replace(/\D/g, '') === targetDigits))) {
            return {
              ...m,
              ...updatedMachineObj
            };
          }
          return m;
        }));

        // 2. Call backend API to persist
        try {
          await api.put(`/machines/${encodeURIComponent(dbId)}`, payload);
          toast.success("Machine updated successfully!");
        } catch (apiErr) {
          console.error("API PUT machine error:", apiErr);
          toast.error("Failed to update machine on server");
        }

        closeModal();
        await fetchMachines(); // Refresh data
        setSearchTerm('');
      }
    } catch (err) {
      console.error("Error saving machine:", err);
      alert("Failed to save machine");
    }
  };

  const handleDelete = async (machineToDelete = null) => {
    try {
      const item = machineToDelete || selectedItem;
      if (!item) return;

      const targetId = item.id || item.name || item.db_id;
      const targetName = item.name || item.id;
      const targetDbId = item.db_id || item.id;
      if (!targetId && !targetName) return;

      if (modalType !== 'delete' && !window.confirm(`Are you sure you want to delete machine ${targetName}?`)) {
        return;
      }

      const tId = String(targetId || '').toLowerCase().trim();
      const tName = String(targetName || '').toLowerCase().trim();
      const tDbId = String(targetDbId || '').toLowerCase().trim();
      const digits = (tName.replace(/\D/g, '') || tId.replace(/\D/g, '')).trim();

      // 1. Optimistically remove from state immediately
      setMachines(prev => prev.filter(m => {
        const mId = String(m.id || '').toLowerCase().trim();
        const mDbId = String(m.db_id || '').toLowerCase().trim();
        const mName = String(m.name || '').toLowerCase().trim();
        const mDigits = (mName.replace(/\D/g, '') || mId.replace(/\D/g, '')).trim();

        if (mId === tId || mId === tName || mId === tDbId) return false;
        if (mDbId === tId || mDbId === tName || mDbId === tDbId) return false;
        if (mName === tId || mName === tName || mName === tDbId) return false;
        if (digits && digits.length >= 2 && mDigits === digits) return false;
        return true;
      }));

      // 2. Directly update localStorage 'machines_data' so delete persists immediately
      try {
        const raw = localStorage.getItem('machines_data');
        if (raw) {
          const list = JSON.parse(raw);
          const updatedList = list.filter(m => {
            const mId = String(m.id || '').toLowerCase().trim();
            const mDbId = String(m.db_id || '').toLowerCase().trim();
            const mName = String(m.name || '').toLowerCase().trim();
            const mDigits = (mName.replace(/\D/g, '') || mId.replace(/\D/g, '')).trim();

            if (mId === tId || mId === tName || mId === tDbId) return false;
            if (mDbId === tId || mDbId === tName || mDbId === tDbId) return false;
            if (mName === tId || mName === tName || mName === tDbId) return false;
            if (digits && digits.length >= 2 && mDigits === digits) return false;
            return true;
          });
          localStorage.setItem('machines_data', JSON.stringify(updatedList));

          // Also clean up alerts from localStorage
          const rawAlerts = localStorage.getItem('alerts_data');
          if (rawAlerts) {
            const aList = JSON.parse(rawAlerts);
            const updatedAlerts = aList.filter(a => {
              const aMid = String(a.machine_id || a.machineName || '').toLowerCase().trim();
              if (aMid === tId || aMid === tName || aMid === tDbId) return false;
              if (digits && digits.length >= 2 && aMid.includes(digits)) return false;
              return true;
            });
            localStorage.setItem('alerts_data', JSON.stringify(updatedAlerts));
          }
        }
      } catch (err) {
        console.warn("Direct localStorage remove error:", err);
      }

      // 3. Send API delete request with data payload and URL param
      try {
        await api.delete(`/machines/${encodeURIComponent(targetId)}`, {
          data: {
            id: targetId,
            name: targetName,
            db_id: targetDbId
          }
        });
      } catch (apiErr) {
        console.warn("Backend API delete warning, handled locally:", apiErr);
      }

      // 4. Trigger storage events and fetch data to ensure full sync
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('app_data_updated', { detail: { resource: 'machines', method: 'delete' } }));
      await fetchMachines(); // Refresh data
      toast.success(`Machine "${targetName}" deleted successfully!`);
      if (modalType === 'delete') closeModal();
    } catch (err) {
      console.error("Error deleting machine:", err);
      toast.error('Failed to delete machine.');
    }
  };

  const toggleStatus = () => {
    setFormData({ ...formData, status: formData.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'add') {
      openModal('add');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [machines]);

  // Helper to format Date & Time consistently
  const formatDateDisplay = (dateVal, timeVal = '10:30 AM') => {
    try {
      let y, m, d, time = timeVal;
      let dateStr = dateVal;

      if (dateStr && dateStr.includes(',')) {
        const parts = dateStr.split(',');
        dateStr = parts[0].trim();
        if (!time || time === '--') {
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
        const dateObj = new Date(y, m, d);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[dateObj.getDay()] || '';
        const dayFormatted = String(d).padStart(2, '0');
        const formattedDate = `${dayFormatted} ${monthNames[m]} ${y}`;
        const cleanTime = (time && time !== '--' && !time.includes('/')) ? time : '10:30 AM';

        return {
          formatted: formattedDate,
          sub: `${cleanTime} • ${dayName}`
        };
      }
    } catch (e) {}

    return { 
      formatted: dateVal || 'N/A', 
      sub: timeVal ? `${timeVal}` : '10:30 AM' 
    };
  };

  const handleExportPDF = () => {
    if (filteredMachines.length === 0) {
      alert('No data available to generate PDF.');
      return;
    }

    const columns = ['MACHINE ID', 'OMC', 'RO NAME', 'STATUS', 'LIVE TEMP', 'LIVE HUMIDITY', 'LIVE ODOUR', 'LIVE NH3', 'LIVE H2S', 'WATER LEVEL'];
    const rows = filteredMachines.map(m => {
      const s = String(m.status || '').trim().toUpperCase();
      const isActive = s === 'ACTIVE' || s === 'ONLINE' || s === 'RUNNING' || s === 'OPERATIONAL' || (s !== 'INACTIVE' && s !== 'OFFLINE' && s !== 'DISABLED' && s !== '');
      return [
        m.id || m.name || 'Machine',
        getClientNameByRo(m.roId),
        getRoName(m.roId),
        isActive ? 'Active' : 'Inactive',
        m.liveTemp || '28°C',
        m.liveHumidity || '50%',
        m.liveOdour || 'Normal',
        m.liveNh3 || '0 PPM',
        m.liveH2s || '0 PPM',
        m.liveWater || 'Normal'
      ];
    });

    exportToPDF(
      'IoT Machines Inventory & Telemetry Report',
      columns,
      rows,
      {
        clientName: (isOmcAdmin || isRoUser) && assignedOmc ? (assignedOmc.name?.toUpperCase() || 'IOCL') : undefined,
        generatedBy: user?.name ? `${user.name} (${user.role})` : (isOmcAdmin ? 'OMC Admin' : 'SuperAdmin (9284188705)')
      }
    );
  };

  const handlePrint = () => {
    window.print();
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
          .no-print, .screen-table-head, .screen-table-body {
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

      {/* Corporate Print Header with Logos */}
      <PrintHeader 
        title="IOT MACHINES INVENTORY & STATUS REPORT"
      />

      {/* Background content - hidden during instant action modal to prevent header/footer flash */}
      <div style={{ opacity: (modalType && openedFromDashboard) ? 0 : 1, transition: 'opacity 0.2s' }}>
        {/* Header */}
        <div className="no-print" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>
              <Cpu color="#8b5cf6" size={32} />
              IoT Machines
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Manage IoT sensors, monitor live telemetry, and configure alert thresholds.</p>
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

      {/* Tabs & Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div 
            onClick={() => setActiveTab('Machines')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', 
              color: activeTab === 'Machines' ? '#8b5cf6' : 'var(--text-secondary)',
              fontWeight: activeTab === 'Machines' ? '600' : '500',
              borderBottom: activeTab === 'Machines' ? '2px solid #8b5cf6' : 'none',
              paddingBottom: '0.5rem',
              marginBottom: '-0.6rem'
            }}
          >
            <Cpu size={18} />
            Machine List
          </div>
        </div>
        <button onClick={() => openModal('add')} style={{ 
          display: 'flex', alignItems: 'center', gap: '0.5rem', 
          backgroundColor: '#8b5cf6', color: 'white', border: 'none', 
          padding: '0.6rem 1.25rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '500' 
        }} className="hover-lift">
          <Plus size={18} />
          Register Machine
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search machines by ID, RO, or OMC..." 
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
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          {/* Header for normal screen */}
          <thead className="screen-table-head">
            <tr style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', backgroundColor: 'rgba(0,0,0,0.02)' }}>
              <th style={{ padding: '1.25rem 1.5rem', fontWeight: '700' }}>MACHINE ID</th>
              <th style={{ padding: '1.25rem 1.5rem', fontWeight: '700' }}>OMC</th>
              <th style={{ padding: '1.25rem 1.5rem', fontWeight: '700' }}>ASSIGNED RO</th>
              <th style={{ padding: '1.25rem 1.5rem', fontWeight: '700', textAlign: 'center' }}>STATUS</th>
              <th style={{ padding: '1.25rem 1.5rem', fontWeight: '700', textAlign: 'center' }}>RATING</th>
              <th style={{ padding: '1.25rem 1.5rem', fontWeight: '700', textAlign: 'center' }}>ACTIONS</th>
            </tr>
          </thead>

          {/* Header for @media print */}
          <thead className="print-only-head">
            <tr style={{ borderBottom: '1.5px solid #1e293b', fontSize: '9pt', color: '#1e293b', textTransform: 'uppercase', backgroundColor: '#f1f5f9' }}>
              <th style={{ padding: '8px 10px', fontWeight: '700' }}>MACHINE ID</th>
              <th style={{ padding: '8px 10px', fontWeight: '700' }}>OMC</th>
              <th style={{ padding: '8px 10px', fontWeight: '700' }}>RO NAME</th>
              <th style={{ padding: '8px 10px', fontWeight: '700', textAlign: 'center' }}>STATUS</th>
              <th style={{ padding: '8px 10px', fontWeight: '700', textAlign: 'center' }}>RATING</th>
              <th style={{ padding: '8px 10px', fontWeight: '700', textAlign: 'center' }}>LIVE TEMP</th>
              <th style={{ padding: '8px 10px', fontWeight: '700', textAlign: 'center' }}>LIVE HUMIDITY</th>
              <th style={{ padding: '8px 10px', fontWeight: '700', textAlign: 'center' }}>LIVE ODOUR</th>
              <th style={{ padding: '8px 10px', fontWeight: '700', textAlign: 'center' }}>LIVE NH3</th>
              <th style={{ padding: '8px 10px', fontWeight: '700', textAlign: 'center' }}>LIVE H2S</th>
              <th style={{ padding: '8px 10px', fontWeight: '700', textAlign: 'center' }}>WATER LEVEL</th>
            </tr>
          </thead>

          <tbody className="screen-table-body">
            {currentMachines.length > 0 ? currentMachines.map((machine, index) => {
              const parentRo = getRo(machine.roId);
              const isRoInactive = (machine.ro_status && String(machine.ro_status).toLowerCase() === 'inactive') || (parentRo && String(parentRo.status || '').toLowerCase() === 'inactive');
              const s = isRoInactive ? 'INACTIVE' : String(machine.status || '').trim().toUpperCase();
              const isActive = !isRoInactive && (s === 'ACTIVE' || s === 'ONLINE' || s === 'RUNNING' || s === 'OPERATIONAL' || (s !== 'INACTIVE' && s !== 'OFFLINE' && s !== 'DISABLED' && s !== ''));
              const rating = getMachineRating(machine);
              const isHigh = rating >= 4.5;
              return (
                <tr key={machine.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1.25rem 1.5rem', fontWeight: '600', color: 'var(--text-primary)' }}>{machine.id}</td>
                  <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)' }}>
                    {getClientNameByRo(machine.roId)}
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <span style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' }}>
                      {getRoName(machine.roId) || 'Unassigned'}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                    {isActive ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0.35rem 0.85rem',
                        borderRadius: '9999px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                      }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)' }}></span>
                        Active
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0.35rem 0.85rem',
                        borderRadius: '9999px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        backgroundColor: 'rgba(239, 68, 68, 0.12)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.3)'
                      }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }}></span>
                        Inactive
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      background: isHigh ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                      border: isHigh ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)'
                    }}>
                      <Star size={14} fill="#f59e0b" color="#f59e0b" />
                      <span style={{
                        fontWeight: '800',
                        fontSize: '0.85rem',
                        color: isHigh ? '#d97706' : '#10b981'
                      }}>
                        {rating.toFixed(1)}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                      <button onClick={() => openModal('qr', machine)} title="Customer Feedback QR Code" style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.35rem', cursor: 'pointer', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                        <QrCode size={16} />
                      </button>
                      <button onClick={() => openModal('view', machine)} title="View Details" style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.35rem', cursor: 'pointer', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                        <Eye size={16} />
                      </button>
                      <button onClick={() => openModal('edit', machine)} title="Edit" style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.35rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                        <Edit size={16} />
                      </button>
                      <button onClick={() => openModal('delete', machine)} title="Delete" style={{ background: '#ef4444', border: 'none', borderRadius: '4px', padding: '0.35rem', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No Machines found matching "{searchTerm}"
                </td>
              </tr>
            )}
          </tbody>

          {/* Full dataset for @media print */}
          <tbody className="print-only-table">
            {filteredMachines.length > 0 ? filteredMachines.map((machine, index) => {
              const s = String(machine.status || '').trim().toUpperCase();
              const isActive = s === 'ACTIVE' || s === 'ONLINE' || s === 'RUNNING' || s === 'OPERATIONAL' || (s !== 'INACTIVE' && s !== 'OFFLINE' && s !== 'DISABLED' && s !== '');
              const rating = getMachineRating(machine);
              return (
                <tr key={`print-m-${index}`} style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#1e293b', fontSize: '9pt' }}>{machine.id}</td>
                  <td style={{ padding: '8px 10px', color: '#334155', fontSize: '9pt' }}>{getClientNameByRo(machine.roId)}</td>
                  <td style={{ padding: '8px 10px', color: '#334155', fontSize: '9pt' }}>{getRoName(machine.roId) || 'Unassigned'}</td>
                  <td style={{ padding: '8px 10px', color: isActive ? '#059669' : '#e11d48', fontWeight: 'bold', fontSize: '9pt', textAlign: 'center' }}>{isActive ? 'Active' : 'Inactive'}</td>
                  <td style={{ padding: '8px 10px', color: '#d97706', fontWeight: 'bold', fontSize: '9pt', textAlign: 'center' }}>★ {rating.toFixed(1)}</td>
                  <td style={{ padding: '8px 10px', color: '#334155', fontSize: '9pt', textAlign: 'center' }}>{machine.liveTemp || '28°C'}</td>
                  <td style={{ padding: '8px 10px', color: '#334155', fontSize: '9pt', textAlign: 'center' }}>{machine.liveHumidity || '50%'}</td>
                  <td style={{ padding: '8px 10px', color: '#334155', fontSize: '9pt', textAlign: 'center' }}>{machine.liveOdour || 'Normal'}</td>
                  <td style={{ padding: '8px 10px', color: '#0284c7', fontSize: '9pt', textAlign: 'center', fontWeight: '600' }}>{machine.liveNh3 || '0 PPM'}</td>
                  <td style={{ padding: '8px 10px', color: '#8b5cf6', fontSize: '9pt', textAlign: 'center', fontWeight: '600' }}>{machine.liveH2s || '0 PPM'}</td>
                  <td style={{ padding: '8px 10px', color: '#334155', fontSize: '9pt', textAlign: 'center' }}>{machine.liveWater || 'Normal'}</td>
                </tr>
              );
            }) : null}
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', padding: '2rem' }}>
          <div style={{ 
            background: 'var(--surface-bg)', 
            borderRadius: '16px', 
            width: '100%', 
            maxWidth: (modalType === 'view' || modalType === 'qr') ? '660px' : '640px', 
            maxHeight: '90vh', 
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', 
            border: '1px solid var(--border-color)', 
            margin: 'auto',
            overflow: 'hidden'
          }}>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '1.25rem 1.75rem',
              borderBottom: '1px solid var(--border-color)',
              flexShrink: 0
            }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {modalType === 'add' && 'Register New Machine'}
                {modalType === 'edit' && 'Edit Machine Details'}
                {modalType === 'view' && 'Machine Details'}
                {modalType === 'qr' && 'Customer Feedback QR Code'}
                {modalType === 'delete' && 'Confirm Deletion'}
              </h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '6px' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1 }}>

            {/* Modal Content - ADD/EDIT Config */}
            {(modalType === 'add' || modalType === 'edit') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>Machine Details</h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'flex-start' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                      Machine ID <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input 
                      type="text" 
                      value={formData.id} 
                      readOnly={true}
                      disabled={true}
                      placeholder="Auto-generated (e.g. SBP2T701)"
                      style={{ 
                        width: '100%', 
                        height: '42px',
                        boxSizing: 'border-box',
                        padding: '0.65rem 1rem', 
                        borderRadius: '8px', 
                        border: '1px solid var(--border-color)', 
                        background: 'rgba(0, 0, 0, 0.04)', 
                        color: 'var(--text-primary)', 
                        fontWeight: '700', 
                        cursor: 'not-allowed',
                        opacity: 0.95,
                        letterSpacing: '0.5px'
                      }} 
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                      🔒 System auto-generated sequence (Non-changeable)
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                      OMC <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    {isSuperAdmin ? (
                      <select 
                        value={formData.omcId || ''} 
                        onChange={(e) => {
                          const selectedOmc = e.target.value;
                          const filteredRos = roList.filter(ro => !selectedOmc || String(ro.omc_id || ro.omcId) === String(selectedOmc));
                          const newRoId = filteredRos.length > 0 ? String(filteredRos[0].id) : '';
                          const newSuggestedId = modalType === 'add' ? getNextSequentialId(newRoId) : formData.id;

                          setFormData({ 
                            ...formData, 
                            omcId: selectedOmc, 
                            roId: modalType === 'add' ? newRoId : formData.roId,
                            id: newSuggestedId 
                          });
                        }}
                        style={{ 
                          width: '100%', 
                          height: '42px',
                          boxSizing: 'border-box',
                          padding: '0.65rem 1rem', 
                          borderRadius: '8px', 
                          border: '1px solid var(--border-color)', 
                          backgroundColor: 'var(--surface-bg)', 
                          color: 'var(--text-primary)', 
                          fontWeight: '600' 
                        }}
                      >
                        <option value="">-- Select OMC --</option>
                        {omcList.map(omc => (
                          <option key={omc.id} value={omc.id}>{omc.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        value={
                          isOmcAdmin 
                            ? (assignedOmc?.name || getClientNameByRo(formData.roId)) 
                            : getClientNameByRo(formData.roId)
                        } 
                        readOnly 
                        disabled
                        style={{ 
                          width: '100%', 
                          height: '42px',
                          boxSizing: 'border-box',
                          padding: '0.65rem 1rem', 
                          borderRadius: '8px', 
                          border: '1px solid var(--border-color)', 
                          backgroundColor: 'var(--surface-bg)', 
                          color: 'var(--text-primary)',
                          fontWeight: '600',
                          cursor: 'not-allowed',
                          opacity: 0.9
                        }} 
                      />
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'flex-start' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                      Assign to RO (Petrol Pump) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    {isRoUser ? (
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="text" 
                          value={modalType === 'edit' && formData.roId ? (getRoName(formData.roId) || specificRo?.name || 'Retail Outlet') : (specificRo?.name || 'Retail Outlet')} 
                          readOnly 
                          disabled
                          style={{ 
                            width: '100%', 
                            height: '42px',
                            boxSizing: 'border-box',
                            padding: '0.65rem 1rem', 
                            borderRadius: '8px', 
                            border: '1px solid var(--border-color)', 
                            backgroundColor: 'var(--surface-bg)', 
                            color: 'var(--text-primary)', 
                            fontWeight: '600', 
                            cursor: 'not-allowed', 
                            opacity: 0.95 
                          }} 
                        />
                      </div>
                    ) : (
                      <select 
                        value={formData.roId || ''} 
                        onChange={(e) => {
                          const selectedRoId = e.target.value;
                          const newSuggestedId = modalType === 'add' ? getNextSequentialId(selectedRoId) : formData.id;
                          const matchedRo = roList.find(r => String(r.id) === String(selectedRoId));
                          const parentOmcId = matchedRo?.omc_id || matchedRo?.omcId || formData.omcId;
                          setFormData({ 
                            ...formData, 
                            roId: selectedRoId, 
                            omcId: isSuperAdmin && parentOmcId ? String(parentOmcId) : formData.omcId,
                            id: newSuggestedId 
                          });
                        }} 
                        style={{ 
                          width: '100%', 
                          height: '42px',
                          boxSizing: 'border-box',
                          padding: '0.65rem 1rem', 
                          borderRadius: '8px', 
                          border: '1px solid var(--border-color)', 
                          backgroundColor: 'var(--surface-bg)', 
                          color: 'var(--text-primary)', 
                          fontWeight: '600' 
                        }}
                      >
                        <option value="">-- Select RO --</option>
                        {roList.filter(ro => {
                          if (isSuperAdmin) {
                            return !formData.omcId || String(ro.omc_id || ro.omcId) === String(formData.omcId);
                          }
                          if (isOmcAdmin) {
                            return !targetOmcId || String(ro.omc_id || ro.omcId) === String(targetOmcId);
                          }
                          return true;
                        }).map(ro => {
                          const isInactive = String(ro.status || '').toLowerCase() === 'inactive';
                          return (
                            <option 
                              key={ro.id} 
                              value={ro.id} 
                              disabled={modalType === 'add' && isInactive}
                              style={isInactive ? { color: '#ef4444' } : {}}
                            >
                              {ro.name} {isInactive ? '(Inactive - Machine creation blocked)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                      Installation Date <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Calendar size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                      <input 
                        type="date" 
                        value={formData.installDate} 
                        onChange={(e) => setFormData({...formData, installDate: e.target.value})} 
                        style={{ 
                          width: '100%', 
                          height: '42px',
                          boxSizing: 'border-box',
                          padding: '0.65rem 1rem 0.65rem 2.5rem', 
                          borderRadius: '8px', 
                          border: '1px solid var(--border-color)', 
                          backgroundColor: 'var(--surface-bg)', 
                          color: 'var(--text-primary)', 
                          colorScheme: 'dark light', 
                          fontWeight: '600' 
                        }} 
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'flex-start' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                      WiFi Name (SSID) <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)', opacity: 0.8 }}>(Optional)</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Wifi size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                      <input 
                        type="text" 
                        value={formData.wifiName || ''} 
                        onChange={(e) => setFormData({ ...formData, wifiName: e.target.value })} 
                        placeholder="Enter WiFi Name (Optional)" 
                        style={{ 
                          width: '100%', 
                          height: '42px',
                          boxSizing: 'border-box',
                          padding: '0.65rem 1rem 0.65rem 2.5rem', 
                          borderRadius: '8px', 
                          border: '1px solid var(--border-color)', 
                          backgroundColor: 'var(--surface-bg)', 
                          color: 'var(--text-primary)', 
                          fontWeight: '600' 
                        }} 
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                      WiFi Password <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)', opacity: 0.8 }}>(Optional)</span>
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <button 
                        type="button" 
                        onClick={() => setShowWifiPassword(!showWifiPassword)}
                        style={{ 
                          position: 'absolute', 
                          left: '12px', 
                          background: 'none', 
                          border: 'none', 
                          cursor: 'pointer', 
                          padding: 0, 
                          display: 'flex', 
                          alignItems: 'center', 
                          color: showWifiPassword ? '#6366f1' : 'var(--text-secondary)',
                          zIndex: 1
                        }}
                        title={showWifiPassword ? "Hide password" : "Show password"}
                      >
                        {showWifiPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      <input 
                        type={showWifiPassword ? "text" : "password"} 
                        value={formData.wifiPassword || ''} 
                        onChange={(e) => setFormData({ ...formData, wifiPassword: e.target.value })} 
                        placeholder="Enter WiFi Password (Optional)" 
                        style={{ 
                          width: '100%', 
                          height: '42px',
                          boxSizing: 'border-box',
                          padding: '0.65rem 1rem 0.65rem 2.5rem', 
                          borderRadius: '8px', 
                          border: '1px solid var(--border-color)', 
                          backgroundColor: 'var(--surface-bg)', 
                          color: 'var(--text-primary)', 
                          fontWeight: '600' 
                        }} 
                      />
                    </div>
                  </div>
                </div>

                {/* ALERT THRESHOLDS CONFIGURATION SECTION */}
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem', marginTop: '0.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>Alert Thresholds Configuration</h3>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Temp Alert Trigger (°C Limits) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>Low Alert (≤20°C)</label>
                      <select 
                        value={formData.tempLimitLow || '20'} 
                        onChange={(e) => setFormData({...formData, tempLimitLow: e.target.value})} 
                        style={{ width: '100%', padding: '0.75rem 0.5rem', borderRadius: '8px', border: '1px solid #10b981', background: 'rgba(16,185,129,0.05)', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer' }}
                      >
                        <option value="10">10°C</option>
                        <option value="12">12°C</option>
                        <option value="15">15°C</option>
                        <option value="18">18°C</option>
                        <option value="20">20°C</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#ef4444', fontWeight: '600' }}>Danger Alert (≥41°C)</label>
                      <select 
                        value={formData.tempLimitDanger || '41'} 
                        onChange={(e) => setFormData({...formData, tempLimitDanger: e.target.value})} 
                        style={{ width: '100%', padding: '0.75rem 0.5rem', borderRadius: '8px', border: '1px solid #ef4444', background: 'rgba(239,68,68,0.05)', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer' }}
                      >
                        <option value="41">41°C</option>
                        <option value="42">42°C</option>
                        <option value="45">45°C</option>
                        <option value="48">48°C</option>
                        <option value="50">50°C</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Humidity Alert Trigger (% Limits) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>Low Alert (≤35%)</label>
                      <select 
                        value={formData.humidityLimitLow || '35'} 
                        onChange={(e) => setFormData({...formData, humidityLimitLow: e.target.value})} 
                        style={{ width: '100%', padding: '0.75rem 0.5rem', borderRadius: '8px', border: '1px solid #10b981', background: 'rgba(16,185,129,0.05)', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer' }}
                      >
                        <option value="20">20%</option>
                        <option value="25">25%</option>
                        <option value="30">30%</option>
                        <option value="35">35%</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#ef4444', fontWeight: '600' }}>Danger Alert (≥76%)</label>
                      <select 
                        value={formData.humidityLimitDanger || '76'} 
                        onChange={(e) => setFormData({...formData, humidityLimitDanger: e.target.value})} 
                        style={{ width: '100%', padding: '0.75rem 0.5rem', borderRadius: '8px', border: '1px solid #ef4444', background: 'rgba(239,68,68,0.05)', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer' }}
                      >
                        <option value="76">76%</option>
                        <option value="80">80%</option>
                        <option value="85">85%</option>
                        <option value="90">90%</option>
                        <option value="95">95%</option>
                        <option value="100">100%</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Odour Alert Trigger (0-100 Limits) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>Low Alert (≤{formData.odourLimitLow || '40'} PPM)</label>
                      <select 
                        value={formData.odourLimitLow || '40'} 
                        onChange={(e) => setFormData({...formData, odourLimitLow: e.target.value})} 
                        style={{ width: '100%', padding: '0.75rem 0.5rem', borderRadius: '8px', border: '1px solid #10b981', background: 'rgba(16,185,129,0.05)', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer' }}
                      >
                        <option value="20">20 PPM</option>
                        <option value="25">25 PPM</option>
                        <option value="30">30 PPM</option>
                        <option value="35">35 PPM</option>
                        <option value="40">40 PPM</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#ef4444', fontWeight: '600' }}>Danger Alert (≥{formData.odourLimitDanger || '71'} PPM)</label>
                      <select 
                        value={formData.odourLimitDanger || '71'} 
                        onChange={(e) => setFormData({...formData, odourLimitDanger: e.target.value})} 
                        style={{ width: '100%', padding: '0.75rem 0.5rem', borderRadius: '8px', border: '1px solid #ef4444', background: 'rgba(239,68,68,0.05)', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer' }}
                      >
                        <option value="71">71 PPM</option>
                        <option value="75">75 PPM</option>
                        <option value="80">80 PPM</option>
                        <option value="85">85 PPM</option>
                        <option value="90">90 PPM</option>
                        <option value="95">95 PPM</option>
                        <option value="100">100 PPM</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* NH3 Alert Trigger (Ammonia Limits) */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    NH3 Alert Trigger (Ammonia Limits) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>Low Alert (≤{formData.nh3LimitLow || '25'} PPM)</label>
                      <select 
                        value={formData.nh3LimitLow || '25'} 
                        onChange={(e) => setFormData({...formData, nh3LimitLow: e.target.value})} 
                        style={{ width: '100%', padding: '0.75rem 0.5rem', borderRadius: '8px', border: '1px solid #10b981', background: 'rgba(16,185,129,0.05)', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer' }}
                      >
                        <option value="10">10 PPM</option>
                        <option value="15">15 PPM</option>
                        <option value="20">20 PPM</option>
                        <option value="25">25 PPM</option>
                        <option value="30">30 PPM</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#ef4444', fontWeight: '600' }}>Danger Alert (≥{formData.nh3LimitDanger || '50'} PPM)</label>
                      <select 
                        value={formData.nh3LimitDanger || '50'} 
                        onChange={(e) => setFormData({...formData, nh3LimitDanger: e.target.value})} 
                        style={{ width: '100%', padding: '0.75rem 0.5rem', borderRadius: '8px', border: '1px solid #ef4444', background: 'rgba(239,68,68,0.05)', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer' }}
                      >
                        <option value="35">35 PPM</option>
                        <option value="40">40 PPM</option>
                        <option value="45">45 PPM</option>
                        <option value="50">50 PPM</option>
                        <option value="55">55 PPM</option>
                        <option value="60">60 PPM</option>
                        <option value="70">70 PPM</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* H2S Alert Trigger (Hydrogen Sulfide Limits) */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    H2S Alert Trigger (Hydrogen Sulfide Limits) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>Low Alert (≤{formData.h2sLimitLow || '10'} PPM)</label>
                      <select 
                        value={formData.h2sLimitLow || '10'} 
                        onChange={(e) => setFormData({...formData, h2sLimitLow: e.target.value})} 
                        style={{ width: '100%', padding: '0.75rem 0.5rem', borderRadius: '8px', border: '1px solid #10b981', background: 'rgba(16,185,129,0.05)', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer' }}
                      >
                        <option value="5">5 PPM</option>
                        <option value="8">8 PPM</option>
                        <option value="10">10 PPM</option>
                        <option value="12">12 PPM</option>
                        <option value="15">15 PPM</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#ef4444', fontWeight: '600' }}>Danger Alert (≥{formData.h2sLimitDanger || '20'} PPM)</label>
                      <select 
                        value={formData.h2sLimitDanger || '20'} 
                        onChange={(e) => setFormData({...formData, h2sLimitDanger: e.target.value})} 
                        style={{ width: '100%', padding: '0.75rem 0.5rem', borderRadius: '8px', border: '1px solid #ef4444', background: 'rgba(239,68,68,0.05)', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer' }}
                      >
                        <option value="15">15 PPM</option>
                        <option value="20">20 PPM</option>
                        <option value="25">25 PPM</option>
                        <option value="30">30 PPM</option>
                        <option value="35">35 PPM</option>
                        <option value="40">40 PPM</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Water Level Alert Trigger <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select 
                    value={formData.waterLevelTrigger || 'Low'} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        waterLevelTrigger: val,
                        waterLimitLow: val
                      }));
                    }} 
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #3b82f6', background: 'rgba(59,130,246,0.05)', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer' }}
                  >
                    <option value="Low">Low (Refill Required)</option>
                    <option value="Disabled">Disabled / Normal</option>
                  </select>
                </div>


                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button onClick={closeModal} style={{ padding: '0.6rem 1.5rem', border: '1px solid var(--border-color)', background: 'var(--surface-bg)', borderRadius: '999px', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.9rem' }}>Cancel</button>
                  <button onClick={handleSave} style={{ padding: '0.6rem 1.5rem', border: 'none', background: '#8b5cf6', color: '#ffffff', borderRadius: '999px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' }}>Save</button>
                </div>
              </div>
            )}

            {/* Modal Content - VIEW Details */}
            {modalType === 'view' && selectedItem && (() => {
              const selectedAlerts = getMachineAlerts(selectedItem);
              const itemRating = getMachineRating(selectedItem);
              const isFlawlessClean = selectedAlerts.length === 0 && itemRating >= 4.5;
              const hasAlerts = selectedAlerts.length > 0;

              return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                  
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0.85rem 1.25rem', background: 'var(--surface-bg)' }}>
                    <div style={{ flex: '0 0 35%', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500' }}>Machine ID</div>
                    <div style={{ flex: '1', color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: '700' }}>{selectedItem.id}</div>
                  </div>

                  <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0.85rem 1.25rem', background: 'var(--surface-bg)' }}>
                    <div style={{ flex: '0 0 35%', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500' }}>OMC</div>
                    <div style={{ flex: '1', color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: '600' }}>{getClientNameByRo(selectedItem.roId)}</div>
                  </div>
                  
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0.85rem 1.25rem', background: 'var(--surface-bg)' }}>
                    <div style={{ flex: '0 0 35%', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500' }}>Assigned RO</div>
                    <div style={{ flex: '1', color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: '600' }}>{getRoName(selectedItem.roId) || 'Unassigned'}</div>
                  </div>

                  <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0.85rem 1.25rem', background: 'var(--surface-bg)' }}>
                    <div style={{ flex: '0 0 35%', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500' }}>Installation Date</div>
                    <div style={{ flex: '1', color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: '600' }}>{formatDisplayDate(selectedItem.installDate)}</div>
                  </div>

                  <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0.85rem 1.25rem', background: 'var(--surface-bg)' }}>
                    <div style={{ flex: '0 0 35%', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500' }}>Status</div>
                    <div style={{ flex: '1', fontSize: '0.875rem', fontWeight: '700' }}>
                      {(() => {
                        const s = String(selectedItem.status || '').trim().toUpperCase();
                        const isActive = s === 'ACTIVE' || s === 'ONLINE' || s === 'RUNNING' || s === 'OPERATIONAL' || (s !== 'INACTIVE' && s !== 'OFFLINE' && s !== 'DISABLED' && s !== '');
                        return isActive ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '0.2rem 0.65rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            backgroundColor: 'rgba(16, 185, 129, 0.12)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.3)'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
                            Active
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '0.2rem 0.65rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            backgroundColor: 'rgba(239, 68, 68, 0.12)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }}></span>
                            Inactive
                          </span>
                        );
                      })()}
                    </div>
                  </div>


                  {selectedItem.wifiName && (
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0.85rem 1.25rem', background: 'var(--surface-bg)' }}>
                      <div style={{ flex: '0 0 35%', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500' }}>WiFi SSID</div>
                      <div style={{ flex: '1', color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: '600' }}>{selectedItem.wifiName}</div>
                    </div>
                  )}

                  {/* Hygiene Rating Row */}
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0.85rem 1.25rem', background: 'var(--surface-bg)', alignItems: 'center' }}>
                    <div style={{ flex: '0 0 35%', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500' }}>Hygiene Rating</div>
                    <div style={{ flex: '1', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {renderRatingStars(itemRating, 16)}
                      </div>
                      <span style={{ 
                        padding: '0.2rem 0.6rem', 
                        borderRadius: '6px', 
                        background: itemRating >= 4.5 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.12)', 
                        color: itemRating >= 4.5 ? '#d97706' : '#10b981',
                        fontWeight: '800', 
                        fontSize: '0.82rem'
                      }}>
                        {itemRating.toFixed(1)} / 5.0
                      </span>
                      {itemRating >= 4.8 && (
                        <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Sparkles size={13} /> Top Cleanliness
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Clean Status Row */}
                  <div style={{ display: 'flex', padding: '0.85rem 1.25rem', background: 'var(--surface-bg)', alignItems: 'center' }}>
                    <div style={{ flex: '0 0 35%', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500' }}>Clean Status</div>
                    <div style={{ flex: '1' }}>
                      {isFlawlessClean ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '0.3rem 0.8rem',
                          borderRadius: '9999px',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          backgroundColor: 'rgba(16, 185, 129, 0.12)',
                          color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}>
                          <CheckCircle2 size={15} />
                          100% Clean & Spotless (0 Active Alerts)
                        </span>
                      ) : hasAlerts ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '0.3rem 0.8rem',
                          borderRadius: '9999px',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          backgroundColor: 'rgba(239, 68, 68, 0.12)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.3)'
                        }}>
                          <AlertTriangle size={15} />
                          {selectedAlerts.length} Alert(s) Detected • Needs Cleaning
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '0.3rem 0.8rem',
                          borderRadius: '9999px',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          backgroundColor: 'rgba(245, 158, 11, 0.12)',
                          color: '#d97706',
                          border: '1px solid rgba(245, 158, 11, 0.3)'
                        }}>
                          <Sparkles size={15} />
                          Standard Hygiene ({itemRating.toFixed(1)} Rating)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* CLEANLINESS & HYGIENE OVERVIEW CARD */}
                <div style={{
                  padding: '0.9rem 1.15rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: isFlawlessClean ? 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(59,130,246,0.04) 100%)' : 'rgba(0,0,0,0.02)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '0.75rem'
                }}>
                  <div style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', background: 'var(--surface-bg)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '2px' }}>CLEANLINESS SCORE</div>
                    <div style={{ fontSize: '1rem', fontWeight: '800', color: itemRating >= 4.5 ? '#10b981' : '#f59e0b' }}>
                      {Math.round((itemRating / 5) * 100)}% Spotless
                    </div>
                  </div>

                  <div style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', background: 'var(--surface-bg)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '2px' }}>ALERT RECORD</div>
                    <div style={{ fontSize: '1rem', fontWeight: '800', color: selectedAlerts.length === 0 ? '#10b981' : '#ef4444' }}>
                      {selectedAlerts.length === 0 ? '0 Active Alerts' : `${selectedAlerts.length} Issue(s)`}
                    </div>
                  </div>

                  <div style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', background: 'var(--surface-bg)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '2px' }}>ODOUR QUALITY</div>
                    <div style={{ fontSize: '1rem', fontWeight: '800', color: '#10b981' }}>
                      {parseFloat(String(selectedItem.liveOdour || '0').replace(/[^0-9.]/g, '')) > 50 ? 'Odour Detected' : 'Fresh & Odourless'}
                    </div>
                  </div>

                  <div style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', background: 'var(--surface-bg)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '2px' }}>WATER SANITATION</div>
                    <div style={{ fontSize: '1rem', fontWeight: '800', color: (String(selectedItem.liveWater).toLowerCase().includes('low') || String(selectedItem.liveWater).toLowerCase().includes('empty')) ? '#ef4444' : '#3b82f6' }}>
                      {(String(selectedItem.liveWater).toLowerCase().includes('low') || String(selectedItem.liveWater).toLowerCase().includes('empty')) ? 'Low Level' : 'Normal Supply'}
                    </div>
                  </div>
                </div>

                {/* LIVE DATA SECTION */}
                <div>
                  <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, letterSpacing: '0.5px' }}>LIVE DATA</h3>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                    <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-bg)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: '500' }}>Live Temperature</div>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{selectedItem.liveTemp || '28°C'}</div>
                    </div>

                    <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-bg)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: '500' }}>Live Water Level</div>
                      <div style={{ 
                        fontSize: '1rem', 
                        fontWeight: '700', 
                        color: (String(selectedItem.liveWater).toLowerCase().includes('low') || String(selectedItem.liveWater).toLowerCase().includes('empty') || parseInt(selectedItem.liveWater) <= 25) ? '#3b82f6' : '#10b981'
                      }}>
                        {(String(selectedItem.liveWater).toLowerCase().includes('low') || String(selectedItem.liveWater).toLowerCase().includes('empty') || parseInt(selectedItem.liveWater) <= 25) ? 'Low' : 'Normal'}
                      </div>
                    </div>

                    <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-bg)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: '500' }}>Live Humidity</div>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{selectedItem.liveHumidity || '50%'}</div>
                    </div>

                    <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-bg)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: '500' }}>Live Odour</div>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: '#10b981' }}>
                        {String(selectedItem.liveOdour || '').includes('PPM') ? selectedItem.liveOdour : (String(selectedItem.liveOdour).toLowerCase() === 'normal' ? 'Normal' : `${selectedItem.liveOdour || '40'} PPM`)}
                      </div>
                    </div>

                    <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-bg)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: '500' }}>Live NH3</div>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0284c7' }}>
                        {(() => {
                          if (selectedItem.liveNh3) return String(selectedItem.liveNh3).includes('PPM') ? selectedItem.liveNh3 : `${selectedItem.liveNh3} PPM`;
                          if (selectedItem.live_nh3 !== undefined && selectedItem.live_nh3 !== null) return `${selectedItem.live_nh3} PPM`;
                          const rawO = String(selectedItem.liveOdour || selectedItem.live_odour || '0').replace(/[^0-9.-]/g, '');
                          const oNum = parseFloat(rawO);
                          return isNaN(oNum) || oNum === 0 ? '0 PPM' : `${Math.round(oNum * 0.55)} PPM`;
                        })()}
                      </div>
                    </div>

                    <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-bg)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: '500' }}>Live H2S</div>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: '#8b5cf6' }}>
                        {(() => {
                          if (selectedItem.liveH2s) return String(selectedItem.liveH2s).includes('PPM') ? selectedItem.liveH2s : `${selectedItem.liveH2s} PPM`;
                          if (selectedItem.live_h2s !== undefined && selectedItem.live_h2s !== null) return `${selectedItem.live_h2s} PPM`;
                          const rawO = String(selectedItem.liveOdour || selectedItem.live_odour || '0').replace(/[^0-9.-]/g, '');
                          const oNum = parseFloat(rawO);
                          return isNaN(oNum) || oNum === 0 ? '0 PPM' : `${Math.round(oNum * 0.35)} PPM`;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ALERT THRESHOLDS CONFIGURATION SECTION */}
                <div>
                  <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>Alert Thresholds Configuration</h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {/* Temp Limits */}
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Temp Alert Trigger (°C Limits)</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                        <div style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #10b981', background: 'rgba(16,185,129,0.05)' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Low Alert (≤20°C)</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#10b981', marginTop: '2px' }}>{selectedItem.tempLimitLow || '20'}°C</div>
                        </div>
                        <div style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #ef4444', background: 'rgba(239,68,68,0.05)' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Danger Alert (≥41°C)</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ef4444', marginTop: '2px' }}>{selectedItem.tempLimitDanger || '41'}°C</div>
                        </div>
                      </div>
                    </div>

                    {/* Humidity Limits */}
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Humidity Alert Trigger (% Limits)</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                        <div style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #10b981', background: 'rgba(16,185,129,0.05)' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Low Alert (≤35%)</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#10b981', marginTop: '2px' }}>{selectedItem.humidityLimitLow || '35'}%</div>
                        </div>
                        <div style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #ef4444', background: 'rgba(239,68,68,0.05)' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Danger Alert (≥76%)</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ef4444', marginTop: '2px' }}>{selectedItem.humidityLimitDanger || '76'}%</div>
                        </div>
                      </div>
                    </div>

                    {/* Odour Limits */}
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Odour Alert Trigger (0-100 Limits)</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                        <div style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #10b981', background: 'rgba(16,185,129,0.05)' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Low Alert (≤{selectedItem.odourLimitLow || '40'} PPM)</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#10b981', marginTop: '2px' }}>{selectedItem.odourLimitLow || '40'} PPM</div>
                        </div>
                        <div style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #ef4444', background: 'rgba(239,68,68,0.05)' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Danger Alert (≥{selectedItem.odourLimitDanger || '71'} PPM)</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ef4444', marginTop: '2px' }}>{selectedItem.odourLimitDanger || '71'} PPM</div>
                        </div>
                      </div>
                    </div>

                    {/* NH3 Limits */}
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>NH3 Alert Trigger (Ammonia Limits)</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                        <div style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #10b981', background: 'rgba(16,185,129,0.05)' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Low Alert (≤{selectedItem.nh3LimitLow || '25'} PPM)</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#10b981', marginTop: '2px' }}>{selectedItem.nh3LimitLow || '25'} PPM</div>
                        </div>
                        <div style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #ef4444', background: 'rgba(239,68,68,0.05)' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Danger Alert (≥{selectedItem.nh3LimitDanger || '50'} PPM)</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ef4444', marginTop: '2px' }}>{selectedItem.nh3LimitDanger || '50'} PPM</div>
                        </div>
                      </div>
                    </div>

                    {/* H2S Limits */}
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>H2S Alert Trigger (Hydrogen Sulfide Limits)</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                        <div style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #10b981', background: 'rgba(16,185,129,0.05)' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Low Alert (≤{selectedItem.h2sLimitLow || '10'} PPM)</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#10b981', marginTop: '2px' }}>{selectedItem.h2sLimitLow || '10'} PPM</div>
                        </div>
                        <div style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #ef4444', background: 'rgba(239,68,68,0.05)' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Danger Alert (≥{selectedItem.h2sLimitDanger || '20'} PPM)</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ef4444', marginTop: '2px' }}>{selectedItem.h2sLimitDanger || '20'} PPM</div>
                        </div>
                      </div>
                    </div>

                    {/* Water Level Trigger */}
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Water Level Alert Trigger</div>
                      <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: selectedItem.waterLevelTrigger === 'Disabled' ? '1px solid var(--border-color)' : '1px solid #3b82f6', background: selectedItem.waterLevelTrigger === 'Disabled' ? 'var(--surface-bg)' : 'rgba(59,130,246,0.05)', display: 'inline-block' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: selectedItem.waterLevelTrigger === 'Disabled' ? 'var(--text-secondary)' : '#3b82f6' }}>
                          {selectedItem.waterLevelTrigger === 'Disabled' ? 'Disabled' : 'Low (Refill Required)'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            ); })()}

            {modalType === 'qr' && selectedItem && (() => {
              const basePath = (import.meta.env.BASE_URL || '/').endsWith('/') 
                ? (import.meta.env.BASE_URL || '/') 
                : `${import.meta.env.BASE_URL}/`;
              const machineParam = encodeURIComponent(selectedItem.name || selectedItem.id);
              const feedbackUrl = `${window.location.origin}${basePath}feedback/${machineParam}`;
              return (
                <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                  <div style={{ 
                    background: '#ffffff', 
                    padding: '1.25rem', 
                    borderRadius: '16px', 
                    display: 'inline-block',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    border: '2px solid #e2e8f0',
                    marginBottom: '1rem'
                  }}>
                    <QRCodeSVG 
                      id="machine-qr-code-svg"
                      value={feedbackUrl} 
                      size={200} 
                      level="H" 
                      includeMargin={true}
                    />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', padding: '0.25rem 0.75rem', borderRadius: '999px', fontWeight: '800', fontSize: '0.9rem' }}>
                      Machine ID: {selectedItem.id || selectedItem.name}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '0.4rem' }}>
                      {getRoName(selectedItem.roId) || 'Petrol Pump Retail Outlet'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      {getClientNameByRo(selectedItem.roId)} • Smart Eco-Toilet
                    </div>
                  </div>


                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => window.open(feedbackUrl, '_blank')}
                      style={{
                        padding: '0.65rem 1.25rem',
                        borderRadius: '8px',
                        border: '1px solid #8b5cf6',
                        background: 'rgba(139, 92, 246, 0.1)',
                        color: '#8b5cf6',
                        fontWeight: '700',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Eye size={16} /> Open Feedback Screen
                    </button>
                    <button
                      onClick={() => downloadQRCode(selectedItem)}
                      style={{
                        padding: '0.65rem 1.5rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        fontWeight: '700',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      <Download size={16} /> Download QR
                    </button>
                  </div>
                </div>
              );
            })()}

            {modalType === 'delete' && selectedItem && (
              <div style={{ textAlign: 'center', padding: '1rem 0 0.5rem 0' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
                  <AlertTriangle size={30} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>
                  Delete Machine Confirmation
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0 0 1.5rem 0', lineHeight: '1.5' }}>
                  Are you sure you want to delete Machine <strong style={{ color: 'var(--text-primary)' }}>"{selectedItem.name || selectedItem.id}"</strong>? All telemetry logs and alerts for this machine will be permanently removed. This action cannot be undone.
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
                    <Trash2 size={16} /> Yes, Delete Machine
                  </button>
                </div>
              </div>
            )}

            </div>
          </div>
        </div>
      )}

      {/* Print Footer with Organization & Signature Credentials */}
      <PrintFooter />

    </div>
  );
};

export default Machines;
