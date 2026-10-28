/**
 * Unified Alert Calculation Utility
 * Ensures 100% synchronization between the Alerts page and Dashboards
 * (Super Admin Dashboard, OMC Dashboard, and RO Dashboard).
 */

export const getConsolidatedAlerts = ({
  rawAlerts = [],
  machines = [],
  ros = [],
  omcs = [],
  user = null
}) => {
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

  let activeMachinesForUser = machines;
  let filteredRawAlerts = [...rawAlerts];

  if (isOmcAdmin) {
    const userContact = String(user?.mobile || user?.username || '').trim();
    const myOmc = omcs.find(o => 
      (userOmcId && (String(o.id) === String(userOmcId) || String(o.db_id) === String(userOmcId))) ||
      (userContact && (String(o.contact || '').trim() === userContact || String(o.credentials?.username || '').trim() === userContact))
    ) || (userOmcId ? { id: userOmcId } : (omcs.length > 0 ? omcs[0] : null));

    const myOmcId = String(myOmc?.id || userOmcId || '');
    let myRos = myOmcId ? ros.filter(r => String(r.omc_id) === myOmcId || String(r.omcId) === myOmcId) : ros;
    const myRoIdsSet = new Set(myRos.map(r => String(r.id)));

    activeMachinesForUser = machines.filter(m => {
      const mRo = String(m.ro_id || m.roId || '');
      return myRoIdsSet.has(mRo);
    });

    if (activeMachinesForUser.length === 0 && machines.length > 0 && myRos.length === 0) {
      activeMachinesForUser = machines;
    }

    const validMachineNamesSet = new Set(activeMachinesForUser.map(m => String(m.name || m.id).toLowerCase()));
    const validMachineIdsSet = new Set(activeMachinesForUser.map(m => String(m.db_id || m.id || '').toLowerCase()));

    const omcMatchedIncoming = filteredRawAlerts.filter(a => {
      const aMid = String(a.machine_id || a.machineId || a.machineName || '').toLowerCase();
      const aRoId = String(a.ro_id || a.roId || '');

      return validMachineNamesSet.has(aMid) || 
             validMachineIdsSet.has(aMid) || 
             myRoIdsSet.has(aRoId);
    });

    if (omcMatchedIncoming.length > 0) {
      filteredRawAlerts = omcMatchedIncoming;
    }
  } else if (isRoUser) {
    const userRoId = String(user?.roId || user?.ro_id || '');
    if (userRoId) {
      activeMachinesForUser = machines.filter(m => String(m.ro_id || m.roId || '') === userRoId);
      const validNames = new Set(activeMachinesForUser.map(m => String(m.name || m.id).toLowerCase()));
      const validIds = new Set(activeMachinesForUser.map(m => String(m.db_id || m.id || '').toLowerCase()));
      filteredRawAlerts = filteredRawAlerts.filter(a => {
        const aMid = String(a.machine_id || a.machineId || a.machineName || '').toLowerCase();
        const aRoId = String(a.ro_id || a.roId || '');
        return validNames.has(aMid) || validIds.has(aMid) || aRoId === userRoId;
      });
    }
  }

  // Filter out customer feedback / cleanliness complaints from Alerts (Feedbacks belong to /feedbacks logs)
  filteredRawAlerts = filteredRawAlerts.filter(a => {
    const msg = String(a.message || a.issue || '').toLowerCase();
    return !msg.includes('customer cleanliness complaint') && 
           !msg.includes('customer complaint') &&
           !msg.includes('poor condition reported') &&
           !msg.includes('cleanliness complaint');
  });

  // 1. Process Database Alerts
  const mappedAlerts = filteredRawAlerts.map(alert => {
    const alertMacStr = String(alert.machineName || alert.machine_name || alert.machine_id || alert.machineId || '').trim();
    const machine = activeMachinesForUser.find(m => 
      String(m.name).toLowerCase() === alertMacStr.toLowerCase() || 
      String(m.id).toLowerCase() === alertMacStr.toLowerCase() || 
      String(m.db_id) === alertMacStr
    ) || machines.find(m => 
      String(m.name).toLowerCase() === alertMacStr.toLowerCase() || 
      String(m.id).toLowerCase() === alertMacStr.toLowerCase() || 
      String(m.db_id) === alertMacStr
    );
    
    let resolvedRo = null;
    if (machine) {
      const mRoId = machine.ro_id || machine.roId;
      resolvedRo = ros.find(r => String(r.id) === String(mRoId) || String(r.db_id) === String(mRoId) || r.name === mRoId || r.name === machine.roName);
    } else {
      resolvedRo = ros.find(r => String(r.id) === String(alert.ro_id || alert.roId) || r.name === alert.roName);
    }
    let roName = resolvedRo ? resolvedRo.name : (machine?.roName || alert.roName || alert.ro || targetRoName || 'divya');
    let roId = resolvedRo ? resolvedRo.id : (machine?.ro_id || machine?.roId || alert.ro_id || alert.roId || targetRoId);
    if (!roName || roName === 'Unassigned' || roName.toLowerCase() === 'radha') {
      roName = machine?.roName || targetRoName || 'divya';
    }

    let alertType = alert.type || 'General';
    const msg = String(alert.message || alert.issue || '').toLowerCase();
    if (msg.includes('water')) alertType = 'Water';
    else if (msg.includes('temp')) alertType = 'Temperature';
    else if (msg.includes('humid')) alertType = 'Humidity';
    else if (msg.includes('odour')) alertType = 'Odour';
    
    const timestamp = alert.timestamp || alert.created_at || new Date().toISOString();
    let displayMachineId = machine?.name || alert.machineName || alert.machine_name || (isNaN(Number(alertMacStr)) ? alertMacStr : '') || (machine ? machine.id : '') || alertMacStr || 'SBP2T1001';

    let severity = alert.severity;
    if (severity === 'Danger' && (msg.includes('water level low') || msg.includes('moderate odour') || msg.includes('low temperature') || msg.includes('low humidity') || msg.includes('low odour'))) {
      severity = 'Low';
    } else if (!severity || severity === 'Medium') {
      if (msg.includes('danger') || msg.includes('empty') || msg.includes('critical') || msg.includes('high')) {
        severity = 'Danger';
      } else {
        severity = 'Low';
      }
    }

    return {
      id: alert.id,
      machineId: displayMachineId,
      machineName: displayMachineId,
      ro: roName,
      roName: roName,
      ro_id: roId,
      roId: roId,
      type: alertType,
      issue: alert.message || alert.issue,
      severity: severity || 'Low',
      status: alert.status || 'Open',
      timestamp: timestamp,
      date: new Date(timestamp).toLocaleDateString('en-GB'),
      time: new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase(),
      rawDate: new Date(timestamp).toISOString().split('T')[0],
      rawTime: new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
    };
  });

  // 2. Generate Live Sensor Alerts based on active telemetry
  const liveAlerts = [];
  activeMachinesForUser.forEach(m => {
    const mId = m.name || m.id;
    const matchedRo = ros.find(r => String(r.id) === String(m.ro_id || m.roId) || r.name === m.roName);
    const mRoName = matchedRo ? matchedRo.name : (m.roName || 'Retail Outlet');
    const mRoId = matchedRo ? matchedRo.id : (m.ro_id || m.roId || '');
    const now = new Date();
    const nowIso = now.toISOString();

    // Temperature (>= 41 Danger, <= 20 Low)
    const rawT = String(m.live_temp || m.liveTemp || '').replace(/[^\d.-]/g, '');
    const numT = parseFloat(rawT);
    const dangerT = parseFloat(m.tempLimitDanger || 41);
    const lowT = parseFloat(m.tempLimitLow || 20);
    if (!isNaN(numT)) {
      if (numT >= dangerT) {
        liveAlerts.push({
          id: `live-temp-danger-${mId}`,
          machineId: mId,
          machineName: mId,
          ro: mRoName,
          roName: mRoName,
          ro_id: mRoId,
          roId: mRoId,
          type: 'Temperature',
          issue: `High Temperature alert (${numT}°C >= ${dangerT}°C limit)`,
          severity: 'Danger',
          status: 'Open',
          timestamp: nowIso,
          date: now.toLocaleDateString('en-GB'),
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase(),
          rawDate: nowIso.split('T')[0],
          rawTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
        });
      } else if (numT > 0 && numT <= lowT) {
        liveAlerts.push({
          id: `live-temp-low-${mId}`,
          machineId: mId,
          machineName: mId,
          ro: mRoName,
          roName: mRoName,
          ro_id: mRoId,
          roId: mRoId,
          type: 'Temperature',
          issue: `Low Temperature alert (${numT}°C <= ${lowT}°C limit)`,
          severity: 'Low',
          status: 'Open',
          timestamp: nowIso,
          date: now.toLocaleDateString('en-GB'),
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase(),
          rawDate: nowIso.split('T')[0],
          rawTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
        });
      }
    }

    // Water (Low / Empty)
    const rawW = String(m.live_water || m.liveWater || '').replace('%', '').trim().toLowerCase();
    const numW = parseInt(rawW, 10);
    const isWTrigger = String(m.waterLevelTrigger ?? m.waterLimitLow ?? 'Low').toLowerCase() !== 'disabled';
    const isWLow = isWTrigger && (rawW === 'low' || rawW === 'empty' || rawW.includes('low') || rawW.includes('empty') || (rawW !== 'normal' && !isNaN(numW) && numW > 0 && numW <= 25));
    if (isWLow) {
      liveAlerts.push({
        id: `live-water-${mId}`,
        machineId: mId,
        machineName: mId,
        ro: mRoName,
        roName: mRoName,
        ro_id: mRoId,
        roId: mRoId,
        type: 'Water',
        issue: 'Water Level Low - Refill required',
        severity: 'Low',
        status: 'Open',
        timestamp: nowIso,
        date: now.toLocaleDateString('en-GB'),
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase(),
        rawDate: nowIso.split('T')[0],
        rawTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
      });
    }

    // Odour (>= 71 Danger alert only, clean/low odour <= 40 is good and does not trigger an alert)
    const rawO = String(m.live_odour || m.liveOdour || '').replace(/[^\d.-]/g, '');
    const numO = parseFloat(rawO);
    const dangerO = parseFloat(m.odourLimitDanger || 71);
    if (!isNaN(numO)) {
      if (numO >= dangerO) {
        liveAlerts.push({
          id: `live-odour-danger-${mId}`,
          machineId: mId,
          machineName: mId,
          ro: mRoName,
          roName: mRoName,
          ro_id: mRoId,
          roId: mRoId,
          type: 'Odour',
          issue: `Dangerous Odour level detected (${numO} PPM >= ${dangerO} limit)`,
          severity: 'Danger',
          status: 'Open',
          timestamp: nowIso,
          date: now.toLocaleDateString('en-GB'),
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase(),
          rawDate: nowIso.split('T')[0],
          rawTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
        });
      }
    }

    // NH3 (<= 25 Low, >= 50 Danger)
    const rawNh3 = String(m.live_nh3 || m.liveNh3 || '').replace(/[^\d.-]/g, '');
    const numNh3 = parseFloat(rawNh3);
    const dangerNh3 = parseFloat(m.nh3LimitDanger || 50);
    const lowNh3 = parseFloat(m.nh3LimitLow || 25);
    if (!isNaN(numNh3)) {
      if (numNh3 >= dangerNh3) {
        liveAlerts.push({
          id: `live-nh3-danger-${mId}`,
          machineId: mId,
          machineName: mId,
          ro: mRoName,
          roName: mRoName,
          ro_id: mRoId,
          roId: mRoId,
          type: 'NH3',
          issue: `Dangerous Ammonia (NH3) level detected (${numNh3} PPM >= ${dangerNh3} limit)`,
          severity: 'Danger',
          status: 'Open',
          timestamp: nowIso,
          date: now.toLocaleDateString('en-GB'),
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase(),
          rawDate: nowIso.split('T')[0],
          rawTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
        });
      }
    }

    // H2S (<= 10 Low, >= 20 Danger)
    const rawH2s = String(m.live_h2s || m.liveH2s || '').replace(/[^\d.-]/g, '');
    const numH2s = parseFloat(rawH2s);
    const dangerH2s = parseFloat(m.h2sLimitDanger || 20);
    const lowH2s = parseFloat(m.h2sLimitLow || 10);
    if (!isNaN(numH2s)) {
      if (numH2s >= dangerH2s) {
        liveAlerts.push({
          id: `live-h2s-danger-${mId}`,
          machineId: mId,
          machineName: mId,
          ro: mRoName,
          roName: mRoName,
          ro_id: mRoId,
          roId: mRoId,
          type: 'H2S',
          issue: `Dangerous Hydrogen Sulfide (H2S) level detected (${numH2s} PPM >= ${dangerH2s} limit)`,
          severity: 'Danger',
          status: 'Open',
          timestamp: nowIso,
          date: now.toLocaleDateString('en-GB'),
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase(),
          rawDate: nowIso.split('T')[0],
          rawTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
        });
      }
    }

    // Humidity (<= 35% Low, >= 76% Danger)
    const rawH = String(m.live_humidity || m.liveHumidity || '').replace(/[^\d.-]/g, '');
    const numH = parseFloat(rawH);
    const dangerH = parseFloat(m.humidityLimitDanger || 76);
    const lowH = parseFloat(m.humidityLimitLow || 35);
    if (!isNaN(numH)) {
      if (numH >= dangerH) {
        liveAlerts.push({
          id: `live-humidity-danger-${mId}`,
          machineId: mId,
          machineName: mId,
          ro: mRoName,
          roName: mRoName,
          ro_id: mRoId,
          roId: mRoId,
          type: 'Humidity',
          issue: `High Humidity alert (${numH}% >= ${dangerH}% limit)`,
          severity: 'Danger',
          status: 'Open',
          timestamp: nowIso,
          date: now.toLocaleDateString('en-GB'),
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase(),
          rawDate: nowIso.split('T')[0],
          rawTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
        });
      } else if (numH > 0 && numH <= lowH) {
        liveAlerts.push({
          id: `live-humidity-low-${mId}`,
          machineId: mId,
          machineName: mId,
          ro: mRoName,
          roName: mRoName,
          ro_id: mRoId,
          roId: mRoId,
          type: 'Humidity',
          issue: `Low Humidity alert (${numH}% <= ${lowH}% limit)`,
          severity: 'Low',
          status: 'Open',
          timestamp: nowIso,
          date: now.toLocaleDateString('en-GB'),
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase(),
          rawDate: nowIso.split('T')[0],
          rawTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
        });
      }
    }
  });

  // Merge liveAlerts into mappedAlerts (avoid duplicates)
  liveAlerts.forEach(liveA => {
    const exists = mappedAlerts.some(a => 
      String(a.machineId || a.machineName).toLowerCase() === String(liveA.machineId).toLowerCase() &&
      a.type === liveA.type &&
      a.status !== 'Resolved'
    );
    if (!exists) {
      mappedAlerts.push(liveA);
    }
  });

  // 3. Final scope filtering (e.g. for RO User)
  let finalAlerts = mappedAlerts;
  if (isRoUser) {
    const userContact = String(user?.mobile || user?.username || '').trim();
    let myRo = null;

    if (user?.roId) {
      myRo = ros.find(r => String(r.id) === String(user.roId) || String(r.db_id) === String(user.roId));
    }
    if (!myRo && userContact) {
      myRo = ros.find(r => 
        String(r.contact || '').trim() === userContact ||
        String(r.credentials?.username || '').trim() === userContact
      );
    }
    if (!myRo && user?.name) {
      const cleanName = String(user.name).replace(/\(.*?\)/g, '').trim().toLowerCase();
      myRo = ros.find(r => 
        String(r.name || '').trim().toLowerCase() === cleanName ||
        cleanName.includes(String(r.name || '').trim().toLowerCase())
      );
    }
    if (!myRo) {
      const abcRo = ros.find(r => r.name?.toLowerCase() === 'abc' || String(r.id) === '4');
      myRo = abcRo || ros[0] || null;
    }

    if (myRo) {
      const myRoId = String(myRo.id || myRo.db_id || '');
      const myRoName = String(myRo.name || '').trim().toLowerCase();

      const roMachines = machines.filter(m => {
        const mRoId = String(m.ro_id || m.roId || '');
        const mRoName = String(m.roName || m.ro_name || '').trim().toLowerCase();
        return (myRoId && mRoId === myRoId) || (myRoName && mRoName === myRoName);
      });
      const validMacNames = new Set(roMachines.map(m => String(m.name || m.id || '').trim().toLowerCase()));
      const validMacIds = new Set(roMachines.map(m => String(m.db_id || m.id || '').trim().toLowerCase()));

      finalAlerts = mappedAlerts.filter(a => {
        const aRoId = String(a.ro_id || a.roId || '');
        const aRoName = String(a.ro || a.roName || '').trim().toLowerCase();
        const aMac = String(a.machineId || a.machineName || '').trim().toLowerCase();

        const matchesRoId = Boolean(myRoId && aRoId && aRoId === myRoId);
        const matchesRoName = Boolean(myRoName && aRoName && aRoName === myRoName);
        const matchesMachine = Boolean(aMac && (validMacNames.has(aMac) || validMacIds.has(aMac)));

        return matchesRoId || matchesRoName || matchesMachine;
      });
    }
  }

  return finalAlerts;
};
