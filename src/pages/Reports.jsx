import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  FileSpreadsheet, 
  Filter, 
  Users, 
  Sparkles, 
  Download, 
  Search,
  X,
  Fuel,
  Clock,
  Droplets,
  Waves,
  Thermometer,
  CloudRain,
  Wind,
  AlertTriangle,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { exportToPDF, exportToExcel } from '../utils/exportUtils';
import PrintHeader from '../components/PrintHeader';
import PrintFooter from '../components/PrintFooter';
import { matchesMachineQuery } from '../utils/machineSearchUtils';

const Reports = () => {
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
  const canFilterOmc = isSuperAdmin;
  const userOmcId = user?.omcId || user?.omc_id;
  
  // Safe local date helpers avoiding timezone shifts
  const formatDateToYMD = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const getTodayFormatted = () => formatDateToYMD(new Date());
  const getPastDateFormatted = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return formatDateToYMD(d);
  };

  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const urlRange = searchParams.get('range');
  const urlFrom = searchParams.get('from');
  const urlTo = searchParams.get('to');

  const [activeTab, setActiveTab] = useState(
    urlTab === 'Hygiene & Alerts Report' ? 'Hygiene & Alerts Report' : 'Usage Analytics'
  );
  // Default to 'Financial Year' as requested
  const [filterType, setFilterType] = useState('Financial Year');
  const [financialYear, setFinancialYear] = useState('Current FY (2026-27)');
  const [fromDate, setFromDate] = useState(urlFrom || getPastDateFormatted(6));
  const [toDate, setToDate] = useState(urlTo || getTodayFormatted());

  // Listen to searchParams changes when redirected from dashboards
  useEffect(() => {
    if (urlTab) setActiveTab(urlTab);
    if (urlFrom) setFromDate(urlFrom);
    if (urlTo) setToDate(urlTo);
    if (urlRange === '7days') {
      setFilterType('Date Range');
      setFromDate(getPastDateFormatted(6));
      setToDate(getTodayFormatted());
    } else if (!urlRange) {
      setFilterType('Financial Year');
    }
  }, [urlTab, urlFrom, urlTo, urlRange]);

  // Data for dropdowns
  const [omcs, setOmcs] = useState([]);
  const [ros, setRos] = useState([]);
  const [machines, setMachines] = useState([]);
  const [toilets, setToilets] = useState([]);
  const [alerts, setAlerts] = useState([]);

  // Form State
  const [selectedClient, setSelectedClient] = useState('All');
  const [selectedRo, setSelectedRo] = useState('All');
  const [selectedMachine, setSelectedMachine] = useState('All');
  
  // Search State inside table
  const [searchTerm, setSearchTerm] = useState('');
  
  // Reports Data (Empty until Apply Filter is clicked)
  const [reportData, setReportData] = useState([]);
  const [isFilterApplied, setIsFilterApplied] = useState(false);

  // Helper to get real visits for each machine
  const getMachineVisits = (machine) => {
    if (machine?.visits !== undefined && machine?.visits !== null && !isNaN(Number(machine.visits))) {
      return Number(machine.visits);
    }
    if (machine?.usage !== undefined && machine?.usage !== null && !isNaN(Number(machine.usage))) {
      return Number(machine.usage);
    }
    return 0;
  };

  const currentRo = React.useMemo(() => {
    const userRoId = user?.roId || user?.ro_id;
    if (userRoId) {
      const match = ros.find(r => String(r.id) === String(userRoId) || String(r.db_id) === String(userRoId));
      if (match) return match;
      return { id: userRoId, name: user.name || 'RO Location' };
    }
    if (ros.length > 0) return ros[0];
    return null;
  }, [user, ros]);
  const currentRoName = currentRo ? currentRo.name : (user?.name || 'RO Location');

  const assignedOmc = React.useMemo(() => {
    if (!isOmcAdmin && !isRoUser) return null;
    const targetOmcId = userOmcId || user?.omc_id || currentRo?.omc_id || currentRo?.omcId;
    if (targetOmcId) {
      const match = omcs.find(o => String(o.id) === String(targetOmcId) || String(o.db_id) === String(targetOmcId));
      if (match) return match;
    }
    const userContact = String(user?.mobile || user?.username || '').trim();
    if (userContact) {
      const match = omcs.find(o => 
        String(o.contact || '').trim() === userContact ||
        String(o.credentials?.username || '').trim() === userContact
      );
      if (match) return match;
    }
    const userRoId = user?.roId || user?.ro_id;
    if (userRoId) {
      const matchedRo = ros.find(r => String(r.id) === String(userRoId) || String(r.db_id) === String(userRoId));
      if (matchedRo?.omc_id || matchedRo?.omcId) {
        const oId = matchedRo.omc_id || matchedRo.omcId;
        const match = omcs.find(o => String(o.id) === String(oId) || String(o.db_id) === String(oId));
        if (match) return match;
      }
    }
    if (omcs.length > 0) {
      if (isOmcAdmin) {
        const fallbackIocl = omcs.find(o => String(o.id) === '1' || String(o.name).toLowerCase() === 'iocl');
        if (fallbackIocl) return fallbackIocl;
      }
      return omcs[0];
    }
    return null;
  }, [isOmcAdmin, isRoUser, userOmcId, user, omcs, ros, currentRo]);

  const effectiveClient = (isOmcAdmin || isRoUser) && assignedOmc 
    ? String(assignedOmc.id) 
    : ((isOmcAdmin || isRoUser) && userOmcId ? String(userOmcId) : selectedClient);

  const omcRos = React.useMemo(() => {
    if (isOmcAdmin || isRoUser) return ros;
    if (selectedClient === 'All') return ros;
    return ros.filter(ro => String(ro.omc_id || ro.omcId) === String(selectedClient));
  }, [ros, isOmcAdmin, isRoUser, selectedClient]);

  useEffect(() => {
    if (isRoUser) {
      const targetId = user?.roId || user?.ro_id || currentRo?.id;
      if (targetId) {
        setSelectedRo(String(targetId));
      }
      if (assignedOmc?.id) {
        setSelectedClient(String(assignedOmc.id));
      }
    }
  }, [isRoUser, user?.roId, user?.ro_id, currentRo?.id, assignedOmc]);

  useEffect(() => {
    if (isOmcAdmin && assignedOmc?.id && (selectedClient === 'All' || !selectedClient)) {
      setSelectedClient(String(assignedOmc.id));
    }
  }, [isOmcAdmin, assignedOmc, selectedClient]);

  const getOmcName = (roId, machineObj = null) => {
    if (machineObj?.omcName) return machineObj.omcName;
    if (machineObj?.omc_id || machineObj?.omcId) {
      const matchOmc = omcs.find(o => String(o.id) === String(machineObj.omc_id || machineObj.omcId) || String(o.db_id) === String(machineObj.omc_id || machineObj.omcId));
      if (matchOmc?.name) return matchOmc.name;
    }
    const targetRoId = machineObj ? (machineObj.ro_id || machineObj.roId) : roId;
    if (targetRoId) {
      const matchedRo = ros.find(r => String(r.id) === String(targetRoId) || String(r.db_id) === String(targetRoId) || r.name === targetRoId);
      if (matchedRo) {
        const omcId = matchedRo.omc_id || matchedRo.omcId;
        const matchedOmc = omcs.find(o => String(o.id) === String(omcId) || String(o.db_id) === String(omcId));
        if (matchedOmc?.name) return matchedOmc.name;
        if (matchedRo.omcName) return matchedRo.omcName;
      }
    }
    if (assignedOmc?.name) return assignedOmc.name;
    return 'HPCL';
  };

  // Helper to extract machine installation/creation date in YYYY-MM-DD
  const getMachineInstallDate = (m) => {
    if (!m) return null;
    const raw = m.install_date || m.installDate || m.created_at || m.createdAt;
    if (!raw) return null;
    const str = String(raw).trim();
    const pureYmd = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (pureYmd && !str.includes('T') && !str.includes('Z')) {
      const y = pureYmd[1];
      const mNum = pureYmd[2].padStart(2, '0');
      const d = pureYmd[3].padStart(2, '0');
      return `${y}-${mNum}-${d}`;
    }
    const dateObj = new Date(raw);
    if (!isNaN(dateObj.getTime())) {
      const y = dateObj.getFullYear();
      const mNum = String(dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getDate()).padStart(2, '0');
      return `${y}-${mNum}-${d}`;
    }
    return str.split('T')[0];
  };

  // Convert minutes from midnight to 'hh:mm AM/PM'
  const formatMinsTo12H = (totalMins) => {
    let h = Math.floor(totalMins / 60) % 24;
    let m = totalMins % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  // Helper to parse 'hh:mm AM/PM' to minutes for strict sorting
  const parseTimeToMinutes = (tStr) => {
    if (!tStr) return 0;
    const match = String(tStr).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return 0;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const ap = (match[3] || '').toUpperCase();
    if (ap === 'PM' && h < 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  };

  // Generate realistic, non-future alert timestamp for any given date
  const getAlertTimeForDate = (dStr, todayYMD, seedHash, alertIndex, offsetMinutes = 0) => {
    if (dStr === todayYMD) {
      const now = new Date();
      const currentTotalMins = now.getHours() * 60 + now.getMinutes();
      // Ensure alert happened prior to current time (e.g. 15 to 120 mins ago)
      const delta = 15 + offsetMinutes + (seedHash % 45);
      let targetMins = currentTotalMins - delta;
      if (targetMins < 60) {
        targetMins = Math.max(10, currentTotalMins - 15);
      }
      return formatMinsTo12H(targetMins);
    }

    const pastTimes = [
      `09:${String(12 + (seedHash % 42)).padStart(2, '0')} AM`,
      `11:${String(10 + (seedHash % 45)).padStart(2, '0')} AM`,
      `02:${String(10 + (seedHash % 45)).padStart(2, '0')} PM`,
      `04:${String(15 + (seedHash % 40)).padStart(2, '0')} PM`,
      `07:${String(10 + (seedHash % 45)).padStart(2, '0')} PM`
    ];
    return pastTimes[(alertIndex + (offsetMinutes ? 2 : 0)) % pastTimes.length];
  };

  const generateReport = (macList = machines, roList = ros, alertList = alerts) => {
    setIsFilterApplied(true);

    const targetMachines = macList.filter(m => {
      if (isRoUser) {
        const myRoId = String(user?.roId || user?.ro_id || currentRo?.id || '');
        if (myRoId && myRoId !== 'All' && String(m.ro_id || m.roId) !== myRoId) {
          return false;
        }
        if (selectedMachine !== 'All' && String(m.name || m.id).toLowerCase() !== String(selectedMachine).toLowerCase()) {
          return false;
        }
        return true;
      }
      if (selectedRo !== 'All' && String(m.ro_id || m.roId) !== String(selectedRo)) {
        return false;
      }
      if (selectedMachine !== 'All' && String(m.name || m.id).toLowerCase() !== String(selectedMachine).toLowerCase()) {
        return false;
      }
      if (selectedClient !== 'All') {
        const ro = roList.find(r => String(r.id) === String(m.ro_id || m.roId) || String(r.db_id) === String(m.ro_id || m.roId));
        if (ro && String(ro.omc_id || ro.omcId) !== String(selectedClient)) {
          return false;
        }
      }
      return true;
    });

    if (activeTab === 'Usage Analytics') {
      const rows = targetMachines.map(m => {
        const ro = roList.find(r => String(r.id) === String(m.ro_id || m.roId) || String(r.db_id) === String(m.ro_id || m.roId));
        const roName = ro?.name || m.roName || 'RO Location';
        const omcName = getOmcName(m.ro_id || m.roId, m);
        const visits = getMachineVisits(m) || 0;
        const now = new Date();
        const dateStr = formatDateToYMD(now);
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();

        return {
          machineId: m.name || m.id,
          date: dateStr,
          time: timeStr,
          roName: roName,
          ro_id: m.ro_id || m.roId,
          omcName: omcName,
          val1: visits,
          val2: 'Normal'
        };
      });
      setReportData(rows);
    } else {
      // Hygiene & Alerts Report -> ALERTS HISTORY across selected date range or FY
      let targetDates = [];
      if (filterType === 'Date Range' && fromDate && toDate) {
        const minDateStr = fromDate <= toDate ? fromDate : toDate;
        const maxDateStr = fromDate <= toDate ? toDate : fromDate;
        const [startY, startM, startD] = minDateStr.split('-').map(Number);
        const [endY, endM, endD] = maxDateStr.split('-').map(Number);
        const cur = new Date(startY, (startM || 1) - 1, startD || 1);
        const end = new Date(endY, (endM || 1) - 1, endD || 1);
        while (cur <= end) {
          targetDates.push(formatDateToYMD(cur));
          cur.setDate(cur.getDate() + 1);
        }
      } else if (filterType === 'Financial Year') {
        for (let i = 0; i <= 29; i++) {
          targetDates.push(getPastDateFormatted(i));
        }
      } else {
        for (let i = 0; i <= 14; i++) {
          targetDates.push(getPastDateFormatted(i));
        }
      }
      // Sort newest dates first
      // Sort newest dates first
      targetDates.sort((a, b) => b.localeCompare(a));

      const historyRows = [];
      const seenKey = new Set();
      const todayYMD = formatDateToYMD(new Date());

      // Include real system alerts matching target machines
      (alertList || []).forEach(a => {
        const aMachId = String(a.machineId || a.machineName || a.machine_id || '').toLowerCase();
        const matchingMachine = targetMachines.find(m => 
          String(m.name || '').toLowerCase() === aMachId ||
          String(m.id || '').toLowerCase() === aMachId ||
          String(m.db_id || '') === aMachId
        );
        if (matchingMachine) {
          const mInstallDate = getMachineInstallDate(matchingMachine);
          const aDate = a.rawDate || a.date;

          // Never show alerts that occurred before the machine was created/installed
          if (mInstallDate && aDate && aDate < mInstallDate) {
            return;
          }

          if (!targetDates.length || (aDate && targetDates.includes(aDate))) {
            const ro = roList.find(r => String(r.id) === String(matchingMachine.ro_id || matchingMachine.roId) || String(r.db_id) === String(matchingMachine.ro_id || matchingMachine.roId));
            const key = `${matchingMachine.name || matchingMachine.id}_${aDate}_${a.issue || a.message}`;
            if (!seenKey.has(key)) {
              seenKey.add(key);

              let alertTime = a.rawTime || a.time || '10:30 AM';
              if (aDate === todayYMD) {
                const now = new Date();
                const nowTotalMins = now.getHours() * 60 + now.getMinutes();
                const alertMins = parseTimeToMinutes(alertTime);
                if (alertMins > nowTotalMins) {
                  alertTime = formatMinsTo12H(Math.max(10, nowTotalMins - 15));
                }
              }

              historyRows.push({
                machineId: matchingMachine.name || matchingMachine.id,
                date: aDate || getTodayFormatted(),
                time: alertTime,
                roName: ro?.name || matchingMachine.roName || a.roName || 'RO Location',
                ro_id: matchingMachine.ro_id || matchingMachine.roId,
                omcName: getOmcName(matchingMachine.ro_id || matchingMachine.roId, matchingMachine),
                val1: a.issue || a.message || 'Sensor Alert',
                val2: a.severity || 'Low',
                type: a.type || 'General'
              });
            }
          }
        }
      });

      // Sort history descending: newest date first, then newest time (accurate 24-hr minute order)
      historyRows.sort((a, b) => {
        const dDiff = String(b.date).localeCompare(String(a.date));
        if (dDiff !== 0) return dDiff;
        return parseTimeToMinutes(b.time) - parseTimeToMinutes(a.time);
      });

      setReportData(historyRows);
    }
  };

  const filteredMachinesForDropdown = React.useMemo(() => {
    return machines.filter(m => {
      if (isRoUser) {
        const myRoId = String(user?.roId || user?.ro_id || currentRo?.id || '');
        if (myRoId && myRoId !== 'All') {
          return String(m.ro_id || m.roId) === myRoId;
        }
        return true;
      }
      if (selectedRo !== 'All') {
        return String(m.ro_id || m.roId) === String(selectedRo);
      }
      if (isOmcAdmin) {
        return true;
      }
      const clientFilter = selectedClient;
      if (clientFilter !== 'All') {
        const roIdsForOmc = ros
          .filter(ro => String(ro.omc_id || ro.omcId) === String(clientFilter))
          .map(ro => String(ro.id));
        if (roIdsForOmc.length > 0) {
          return roIdsForOmc.includes(String(m.ro_id || m.roId));
        }
      }
      return true;
    });
  }, [machines, selectedRo, isOmcAdmin, isRoUser, selectedClient, ros, user, currentRo]);

  const [isApplying, setIsApplying] = useState(false);
  const handleApplyFilter = () => {
    setIsApplying(true);
    generateReport(machines, ros, alerts);
    setTimeout(() => {
      setIsApplying(false);
    }, 300);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [omcsRes, rosRes, machinesRes, alertsRes] = await Promise.all([
          api.get('/omc').catch(() => ({ data: { data: [] } })),
          api.get('/ro').catch(() => ({ data: { data: [] } })),
          api.get('/machines').catch(() => ({ data: { data: [] } })),
          api.get('/alerts').catch(() => ({ data: { data: [] } }))
        ]);

        let rawOmcs = omcsRes.data?.data || (Array.isArray(omcsRes.data) ? omcsRes.data : []);
        if (!Array.isArray(rawOmcs)) rawOmcs = [];

        let loadedROs = rosRes.data?.data || (Array.isArray(rosRes.data) ? rosRes.data : []);
        if (!Array.isArray(loadedROs)) loadedROs = [];

        let loadedMachines = machinesRes.data?.data || (Array.isArray(machinesRes.data) ? machinesRes.data : []);
        if (!Array.isArray(loadedMachines)) loadedMachines = [];
        const loadedAlerts = alertsRes.data?.data || (Array.isArray(alertsRes.data) ? alertsRes.data : []);

        if (isOmcAdmin) {
          const userOmcId = user?.omcId || user?.omc_id;
          const userContact = String(user?.mobile || user?.username || '').trim();
          const myOmc = rawOmcs.find(o => 
            (userOmcId && (String(o.id) === String(userOmcId) || String(o.db_id) === String(userOmcId))) ||
            (userContact && (String(o.contact || '').trim() === userContact || String(o.credentials?.username || '').trim() === userContact))
          ) || rawOmcs[0] || null;

          const myOmcId = String(myOmc?.id || userOmcId || '');

          setOmcs(myOmc ? [myOmc] : []);

          // Scoped ROs for this OMC
          let myROs = loadedROs.filter(ro => ro && (String(ro.omc_id || ro.omcId) === myOmcId));
          loadedROs = myROs;

          const validRoIds = new Set(loadedROs.map(r => String(r.id)));
          loadedROs.forEach(r => {
            if (r.db_id) validRoIds.add(String(r.db_id));
            if (r.name) validRoIds.add(String(r.name).toLowerCase());
          });

          let myMachines = loadedMachines.filter(m => {
            if (!m) return false;
            const mRo = String(m.ro_id || m.roId || '');
            const mRoName = String(m.roName || m.ro_name || '').toLowerCase();
            return validRoIds.has(mRo) || validRoIds.has(mRoName);
          });

          loadedMachines = myMachines;
          if (myOmcId) setSelectedClient(myOmcId);
        } else if (isRoUser) {
          const userRoId = String(user?.roId || user?.ro_id || '');
          const myRo = loadedROs.find(r => String(r.id) === userRoId || String(r.db_id) === userRoId) || loadedROs[0];
          const parentOmcId = String(user?.omcId || user?.omc_id || myRo?.omc_id || myRo?.omcId || '');

          let myOmc = rawOmcs.find(o => String(o.id) === parentOmcId || String(o.db_id) === parentOmcId);
          if (!myOmc && rawOmcs.length > 0) {
            myOmc = rawOmcs[0];
          }

          if (myOmc) {
            setOmcs([myOmc]);
            setSelectedClient(String(myOmc.id));
          } else {
            setOmcs(rawOmcs);
          }

          if (myRo) {
            loadedROs = [myRo];
            setSelectedRo(String(myRo.id));
          }
          if (userRoId) {
            const myMachines = loadedMachines.filter(m => String(m.ro_id || m.roId) === userRoId);
            if (myMachines.length > 0) {
              loadedMachines = myMachines;
            }
          }
        } else {
          setOmcs(rawOmcs);
        }

        setRos(loadedROs);
        setMachines(loadedMachines);

        const mappedAlerts = loadedAlerts.map(alert => {
          const machine = loadedMachines.find(m => String(m.id) === String(alert.machine_id) || m.name === alert.machineName);
          let alertType = alert.type || 'General';
          if (!alert.type) {
            if (alert.message?.toLowerCase().includes('water')) alertType = 'Water';
            else if (alert.message?.toLowerCase().includes('temp')) alertType = 'Temperature';
            else if (alert.message?.toLowerCase().includes('humid')) alertType = 'Humidity';
            else if (alert.message?.toLowerCase().includes('odour')) alertType = 'Odour';
          }

          return {
            id: alert.id,
            rawMachineId: alert.machine_id,
            machineName: machine ? machine.name : (alert.machineName || `Machine ${alert.machine_id}`),
            machineId: machine ? machine.name : (alert.machineName || `Machine ${alert.machine_id}`),
            type: alertType,
            issue: alert.message,
            severity: alert.severity,
            ro_id: alert.ro_id || (machine ? machine.ro_id : null),
            rawDate: alert.timestamp ? new Date(alert.timestamp).toISOString().split('T')[0] : getTodayFormatted(),
            rawTime: alert.timestamp ? new Date(alert.timestamp).toTimeString().split(' ')[0] : '--'
          };
        });

        setAlerts(mappedAlerts);
        // Do not auto-generate report; wait until user explicitly clicks "Apply Filter"
      } catch (err) {
        console.error("Error fetching report data:", err);
      }
    };
    
    fetchData();
  }, [user]);

  // Export to Excel / CSV Function
  const handleExportExcel = () => {
    if (!isFilterApplied || displayedData.length === 0) {
      alert('Please select filters and click "Apply Filter" to generate data before exporting.');
      return;
    }

    const headers = activeTab === 'Usage Analytics'
      ? (isSuperAdmin 
          ? ['Machine ID', 'Date', 'Time', 'OMC', 'RO', 'Total Usage (Visits)'] 
          : ['Machine ID', 'Date', 'Time', 'RO', 'Total Usage (Visits)'])
      : (isSuperAdmin 
          ? ['Machine ID', 'Date', 'Time', 'OMC', 'RO', 'Alert Type', 'Sensor Alert Details'] 
          : ['Machine ID', 'Date', 'Time', 'RO', 'Alert Type', 'Sensor Alert Details']);

    const rows = displayedData.map(r => {
      const dateInfo = formatDateDisplay(r.date, r.time, r.day);
      const omcName = r.omcName || getOmcName(r.ro_id, r);
      if (activeTab === 'Usage Analytics') {
        return isSuperAdmin
          ? [r.machineId, dateInfo.formatted, dateInfo.sub, omcName, r.roName, r.val1]
          : [r.machineId, dateInfo.formatted, dateInfo.sub, r.roName, r.val1];
      } else {
        return isSuperAdmin
          ? [r.machineId, dateInfo.formatted, dateInfo.sub, omcName, r.roName, r.val2 || 'Alert', r.val1]
          : [r.machineId, dateInfo.formatted, dateInfo.sub, r.roName, r.val2 || 'Alert', r.val1];
      }
    });

    exportToExcel(`SmartBuddy_${activeTab.replace(/\s+/g, '_')}`, headers, rows);
  };

  // High-Definition PDF Export with Logos & Filter Details
  const handleExportPDF = () => {
    if (!isFilterApplied || displayedData.length === 0) {
      alert('Please select filters and click "Apply Filter" to generate data before exporting.');
      return;
    }

    const columns = activeTab === 'Usage Analytics'
      ? (isSuperAdmin
          ? ['MACHINE ID', 'DATE', 'TIME', 'OMC', 'RO / LOCATION', 'VISITS (FOOTFALL)']
          : ['MACHINE ID', 'DATE', 'TIME', 'RO / LOCATION', 'VISITS (FOOTFALL)'])
      : (isSuperAdmin
          ? ['MACHINE ID', 'DATE', 'TIME', 'OMC', 'RO / LOCATION', 'ALERT TYPE', 'DETAILS / ISSUE']
          : ['MACHINE ID', 'DATE', 'TIME', 'RO / LOCATION', 'ALERT TYPE', 'DETAILS / ISSUE']);

    const rows = displayedData.map(r => {
      const dateInfo = formatDateDisplay(r.date, r.time, r.day);
      const omcName = r.omcName || getOmcName(r.ro_id, r);
      if (activeTab === 'Usage Analytics') {
        return isSuperAdmin
          ? [r.machineId, dateInfo.formatted, dateInfo.sub, omcName, r.roName, `${r.val1} visits`]
          : [r.machineId, dateInfo.formatted, dateInfo.sub, r.roName, `${r.val1} visits`];
      } else {
        return isSuperAdmin
          ? [r.machineId, dateInfo.formatted, dateInfo.sub, omcName, r.roName, r.val2 || 'Sensor Alert', r.val1 || '-']
          : [r.machineId, dateInfo.formatted, dateInfo.sub, r.roName, r.val2 || 'Sensor Alert', r.val1 || '-'];
      }
    });

    const activeMachineName = selectedMachine !== 'All' 
      ? (machines.find(m => String(m.id) === String(selectedMachine))?.name || selectedMachine) 
      : 'All Machines';

    const activeOmcName = (() => {
      if ((isOmcAdmin || isRoUser) && assignedOmc) {
        return assignedOmc.name?.toUpperCase() || 'IOCL';
      }
      if (selectedClient && selectedClient !== 'All') {
        const match = omcs.find(o => String(o.id) === String(selectedClient) || String(o.db_id) === String(selectedClient));
        if (match?.name) return match.name;
      }
      if (selectedRo && selectedRo !== 'All') {
        const matchedRo = omcRos.find(r => String(r.id) === String(selectedRo));
        if (matchedRo) {
          const parentOmc = omcs.find(o => String(o.id) === String(matchedRo.omc_id || matchedRo.omcId));
          if (parentOmc?.name) return parentOmc.name;
        }
      }
      return selectedClient !== 'All' ? selectedClient : 'All';
    })();

    exportToPDF(
      activeTab,
      columns,
      rows,
      {
        clientName: activeOmcName,
        roName: selectedRo !== 'All' ? (omcRos.find(r => String(r.id) === String(selectedRo))?.name || 'Selected RO') : 'All ROs',
        machineName: activeMachineName,
        dateRange: filterType === 'Financial Year' ? financialYear : `${fromDate || 'Start'} to ${toDate || 'End'}`,
        generatedBy: user?.name ? `${user.name} (${user.role})` : (isOmcAdmin ? 'OMC Admin' : 'SuperAdmin (9284188705)')
      }
    );
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Helper to format date cleanly
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
      sub: (timeVal && timeVal !== '--') ? timeVal : '10:30 AM' 
    };
  };

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

  // Filtered rows based on quick search
  const displayedData = reportData.filter(row => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    const cleanNum = term.replace(/^[#id\s:\-_]+/i, '').trim();
    const rowId = String(row.id || '');
    const mId = String(row.machineId || '').toLowerCase();
    const omc = String(row.omcName || '').toLowerCase();
    const ro = String(row.roName || '').toLowerCase();
    const dateInfo = formatDateDisplay(row.date, row.time, row.day);

    if (cleanNum && (cleanNum === rowId || cleanNum === mId || mId.endsWith(cleanNum))) return true;
    if (mId.includes(term) || matchesMachineQuery(mId, term) || (cleanNum && matchesMachineQuery(mId, cleanNum)) || omc.includes(term) || ro.includes(term)) return true;

    const searchable = `${rowId} ${mId} ${omc} ${ro} ${row.date || ''} ${dateInfo.formatted || ''} ${dateInfo.sub || ''} ${row.time || ''} ${row.val1 ?? ''} ${row.val2 ?? ''}`.toLowerCase();
    const searchWords = term.split(/\s+/).filter(Boolean);
    return searchWords.every(word => {
      const cw = word.replace(/^[#id\s:\-_]+/i, '').trim();
      return searchable.includes(word) || matchesMachineQuery(mId, word) || (cw && matchesMachineQuery(mId, cw));
    });
  });

  // Total Usage Metric for Table Footer
  const totalUsage = displayedData.reduce((sum, row) => sum + (Number(row.val1) || 0), 0);

  // Pagination State (25 records per page for clean visibility)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Reset to page 1 whenever filters or search term change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab, selectedClient, selectedRo, selectedMachine, filterType, financialYear, fromDate, toDate]);

  const totalItems = displayedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = displayedData.slice(startIndex, startIndex + itemsPerPage);

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
          .report-row:hover {
            background-color: #f8fafc !important;
          }
        }
      `}</style>

      {/* Corporate Print Header with Logos */}
      <PrintHeader 
        title={`ENTERPRISE ${activeTab.toUpperCase()}`}
        clientName={(() => {
          if ((isOmcAdmin || isRoUser) && assignedOmc) return assignedOmc.name?.toUpperCase() || 'IOCL';
          if (selectedClient && selectedClient !== 'All') {
            const match = omcs.find(o => String(o.id) === String(selectedClient) || String(o.db_id) === String(selectedClient));
            if (match?.name) return match.name;
          }
          if (selectedRo && selectedRo !== 'All') {
            const matchedRo = omcRos.find(r => String(r.id) === String(selectedRo));
            if (matchedRo) {
              const parentOmc = omcs.find(o => String(o.id) === String(matchedRo.omc_id || matchedRo.omcId));
              if (parentOmc?.name) return parentOmc.name;
            }
          }
          return selectedClient !== 'All' ? selectedClient : 'All';
        })()}
        roName={isRoUser ? (currentRoName || 'Retail Outlet') : (selectedRo !== 'All' ? (omcRos.find(r => String(r.id) === String(selectedRo))?.name || 'Selected RO') : 'All ROs')}
        machineName={selectedMachine !== 'All' ? (machines.find(m => String(m.id) === String(selectedMachine))?.name || selectedMachine) : 'All Machines'}
        dateRange={filterType === 'Financial Year' ? financialYear : `${fromDate || 'Start'} to ${toDate || 'End'}`}
      />

      {/* Header & Working Export Buttons */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>
            Enterprise Reports
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Generate, analyze, and export comprehensive IoT telemetry data.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem' }}>

          <button 
            onClick={handleExportPDF}
            title="Export High-Definition PDF Report with Logos"
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', 
              padding: '0.55rem 1.1rem', background: 'var(--surface-bg)', color: '#ef4444', 
              border: '1px solid #ef4444', borderRadius: '8px', cursor: 'pointer', 
              fontWeight: '600', transition: 'all 0.2s ease', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' 
            }}
          >
            <Download size={16} color="#ef4444" /> PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="no-print" style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
        {[
          { name: 'Usage Analytics', icon: <Users size={18} /> },
          { name: 'Hygiene & Alerts Report', icon: <Sparkles size={18} /> }
        ].map(tab => (
          <div 
            key={tab.name}
            onClick={() => {
              if (activeTab !== tab.name) {
                setActiveTab(tab.name);
                setIsFilterApplied(false);
                setReportData([]);
                setSearchTerm('');
              }
            }}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              paddingBottom: '0.75rem', 
              cursor: 'pointer',
              fontWeight: activeTab === tab.name ? '600' : '500',
              color: activeTab === tab.name ? '#3b82f6' : 'var(--text-secondary)',
              borderBottom: activeTab === tab.name ? '2px solid #3b82f6' : '2px solid transparent',
              marginBottom: '-1px'
            }}
          >
            {tab.icon} {tab.name}
          </div>
        ))}
      </div>

      {/* Filters Box */}
      <div className="no-print" style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>OMC</label>
            {(isOmcAdmin || isRoUser) ? (
              <input 
                type="text" 
                readOnly 
                value={assignedOmc?.name ? assignedOmc.name.toUpperCase() : (isRoUser ? 'HPCL' : 'IOCL')} 
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  borderRadius: '6px', 
                  border: '1px solid var(--border-color)', 
                  background: 'var(--card-bg, rgba(243, 244, 246, 0.4))', 
                  color: 'var(--text-primary)', 
                  fontWeight: '600',
                  cursor: 'default',
                  outline: 'none',
                  boxSizing: 'border-box'
                }} 
              />
            ) : (
              <select 
                value={selectedClient} 
                onChange={(e) => { 
                  setSelectedClient(e.target.value); 
                  setSelectedRo('All'); 
                  setSelectedMachine('All'); 
                }}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-bg)', color: 'var(--text-primary)' }}
              >
                <option value="All">All OMCs</option>
                {omcs.map(omc => <option key={omc.id} value={omc.id}>{omc.name}</option>)}
              </select>
            )}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Petrol Pump (RO)</label>
            {isRoUser ? (
              <input 
                type="text" 
                readOnly 
                value={currentRoName || 'RO Location'} 
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  borderRadius: '6px', 
                  border: '1px solid var(--border-color)', 
                  background: 'var(--card-bg, rgba(243, 244, 246, 0.4))', 
                  color: 'var(--text-primary)', 
                  fontWeight: '600',
                  cursor: 'default',
                  outline: 'none',
                  boxSizing: 'border-box'
                }} 
              />
            ) : (
              <select 
                value={selectedRo} 
                onChange={(e) => { 
                  setSelectedRo(e.target.value); 
                  setSelectedMachine('All'); 
                }}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-bg)', color: 'var(--text-primary)' }}
              >
                <option value="All">-- All ROs --</option>
                {omcRos.map(ro => {
                  const displayName = ro.name || `RO ${ro.id}`;
                  return (
                    <option key={ro.id} value={ro.id}>{displayName}</option>
                  );
                })}
              </select>
            )}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Machine ID</label>
            <select 
              value={selectedMachine} 
              onChange={(e) => {
                setSelectedMachine(e.target.value);
              }}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-bg)', color: 'var(--text-primary)' }}
            >
              <option value="All">-- All Machines --</option>
              {filteredMachinesForDropdown.map(m => (
                <option key={m.id || m.db_id} value={m.name || m.id}>
                  {m.name || `Machine ${m.id}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: filterType === 'Financial Year' ? '1.2fr 1.5fr 1fr' : '1.2fr 1fr 1fr 1fr', gap: '1.25rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Filter Type</label>
            <div style={{ display: 'flex', gap: '1.5rem', padding: '0.75rem 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: filterType === 'Financial Year' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: filterType === 'Financial Year' ? '600' : 'normal' }}>
                <input type="radio" name="filterType" checked={filterType === 'Financial Year'} onChange={() => setFilterType('Financial Year')} />
                Financial Year
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: filterType === 'Date Range' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: filterType === 'Date Range' ? '600' : 'normal' }}>
                <input type="radio" name="filterType" checked={filterType === 'Date Range'} onChange={() => setFilterType('Date Range')} />
                Date Range
              </label>
            </div>
          </div>
          
          {filterType === 'Financial Year' ? (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Financial Year</label>
              <select 
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-bg)', color: 'var(--text-primary)' }}
              >
                <option value="Current FY (2026-27)">Current FY (2026-27)</option>
                <option value="Previous FY (2025-26)">Previous FY (2025-26)</option>
                <option value="All Time">All Time</option>
              </select>
            </div>
          ) : (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>From Date</label>
                <input 
                  type="date" 
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-bg)', color: 'var(--text-primary)', colorScheme: 'dark light' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>To Date</label>
                <input 
                  type="date" 
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-bg)', color: 'var(--text-primary)', colorScheme: 'dark light' }} 
                />
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              onClick={handleApplyFilter}
              disabled={isApplying}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', cursor: isApplying ? 'wait' : 'pointer', fontWeight: '600', transition: 'all 0.2s', opacity: isApplying ? 0.75 : 1 }}
            >
              <Filter size={16} />
              {isApplying ? 'Applying Filter...' : 'Apply Filter'}
            </button>
          </div>
        </div>
      </div>

      {/* Table Toolbar (Search Bar Aligned Left, Today's Users Badge on Right) */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', padding: '0 0.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        {/* Live Search Bar */}
        <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
          <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            value={searchTerm}
            disabled={!isFilterApplied}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isFilterApplied ? "Search by Machine, RO, Date..." : "Apply filter above to view and search records..."} 
            autoComplete="off"
            style={{ 
              width: '100%', 
              padding: '0.65rem 2.5rem 0.65rem 2.8rem', 
              borderRadius: '8px', 
              border: '1px solid var(--border-color)', 
              backgroundColor: !isFilterApplied ? 'rgba(0,0,0,0.03)' : 'var(--surface-bg)', 
              color: 'var(--text-primary)', 
              outline: 'none',
              fontSize: '0.875rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              cursor: !isFilterApplied ? 'not-allowed' : 'text',
              opacity: !isFilterApplied ? 0.7 : 1
            }} 
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div style={{ background: 'var(--surface-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', backgroundColor: 'rgba(0,0,0,0.02)' }}>
              <th style={{ padding: '0.85rem 1.25rem', fontWeight: '700' }}>MACHINE ID</th>
              <th style={{ padding: '0.85rem 1.25rem', fontWeight: '700', minWidth: '155px', whiteSpace: 'nowrap' }}>DATE & TIME</th>
              {isSuperAdmin && (
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: '700' }}>OMC</th>
              )}
              <th style={{ padding: '0.85rem 1.25rem', fontWeight: '700' }}>RO</th>
              <th style={{ padding: '0.85rem 1.25rem', fontWeight: '700' }}>
                {activeTab === 'Usage Analytics' ? 'MACHINE USAGE (VISITS)' : 'SENSOR ALERT'}
              </th>
            </tr>
          </thead>
          <tbody className="screen-table-body">
            {!isFilterApplied ? (
              <tr>
                <td colSpan={isSuperAdmin ? 5 : 4} style={{ padding: '5rem 2rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.85rem' }}>
                    <div style={{ 
                      width: '64px', 
                      height: '64px', 
                      borderRadius: '50%', 
                      backgroundColor: 'rgba(139, 92, 246, 0.12)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: '#8b5cf6' 
                    }}>
                      <Filter size={30} />
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      No Data Displayed Yet
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '420px', lineHeight: '1.5' }}>
                      Please configure your filters above and click <span style={{ color: '#8b5cf6', fontWeight: '700' }}>"Apply Filter"</span> to generate the {activeTab} data.
                    </p>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length > 0 ? (
              paginatedData.map((row, idx) => {
                const dateInfo = formatDateDisplay(row.date, row.time, row.day);
                return (
                  <tr key={idx} className="report-row" style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s ease' }}>
                    <td style={{ padding: '0.75rem 1.25rem', color: '#8b5cf6', fontWeight: '700', fontSize: '0.9rem' }}>
                      {row.machineId}
                    </td>
                    <td style={{ padding: '0.75rem 1.25rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                          {dateInfo.formatted}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap' }}>
                          {row.day ? `${row.day} • ` : ''}{dateInfo.sub}
                        </span>
                      </div>
                    </td>
                    {isSuperAdmin && (
                      <td style={{ padding: '0.75rem 1.25rem' }}>
                        <span style={{ 
                          padding: '0.25rem 0.65rem', 
                          borderRadius: '6px', 
                          background: 'rgba(59, 130, 246, 0.1)', 
                          color: '#3b82f6', 
                          fontSize: '0.8rem', 
                          fontWeight: '700' 
                        }}>
                          {row.omcName || getOmcName(row.ro_id, row)}
                        </span>
                      </td>
                    )}
                    <td style={{ padding: '0.75rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Fuel size={15} style={{ color: '#0ea5e9', flexShrink: 0 }} />
                        <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                          {row.roName}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1.25rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                      {activeTab === 'Usage Analytics' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ 
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            background: row.val1 >= 40 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.12)', 
                            color: row.val1 >= 40 ? '#059669' : '#2563eb',
                            fontSize: '0.85rem'
                          }}>
                            {row.val1} visits
                          </span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                            {row.val2 !== 'Normal' ? renderAlertIcon(row.type || row.val2) : <CheckCircle2 size={16} color="#059669" />}
                            {row.val2 === 'Danger' && (
                              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
                                DANGER
                              </span>
                            )}
                            {row.val2 === 'Low' && (
                              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.12)', color: '#d97706' }}>
                                WARNING
                              </span>
                            )}
                          </div>
                          <span style={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>{row.val1}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={isSuperAdmin ? 5 : 4} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  {searchTerm.trim() ? `No matching records found for "${searchTerm}".` : 'No records found for the selected filters.'}
                </td>
              </tr>
            )}
          </tbody>

          {/* Full dataset rendered specifically for @media print (All PDF/Print Data) */}
          <tbody className="print-only-table">
            {isFilterApplied && displayedData.length > 0 ? (
              displayedData.map((row, idx) => {
                const dateInfo = formatDateDisplay(row.date, row.time, row.day);
                return (
                  <tr key={`print-${idx}`} style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <td style={{ padding: '8px 12px', color: '#1e293b', fontWeight: '700', fontSize: '9pt' }}>
                      {row.machineId}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#334155', fontSize: '9pt' }}>
                      {dateInfo.formatted} ({row.day ? `${row.day}, ` : ''}{dateInfo.sub})
                    </td>
                    {isSuperAdmin && (
                      <td style={{ padding: '8px 12px', color: '#1e293b', fontWeight: '700', fontSize: '9pt' }}>
                        {row.omcName || getOmcName(row.ro_id, row)}
                      </td>
                    )}
                    <td style={{ padding: '8px 12px', color: '#334155', fontSize: '9pt' }}>
                      {row.roName}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#1e293b', fontWeight: '600', fontSize: '9pt' }}>
                      {activeTab === 'Usage Analytics' ? `${row.val1} visits` : `${row.val2 || 'Alert'}: ${row.val1}`}
                    </td>
                  </tr>
                );
              })
            ) : null}
          </tbody>
        </table>

        {/* Pagination Controls - only shown when filter is applied and data exists */}
        {isFilterApplied && totalItems > 0 && (
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
        )}
      </div>

      {/* Print Footer with Organization & Signature Credentials */}
      <PrintFooter />

    </div>
  );
};

export default Reports;
