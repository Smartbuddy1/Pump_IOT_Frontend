// Mock Storage persistence layer for offline / local / SuperAdmin sessions
export const getStored = (key, defaultVal) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    return JSON.parse(raw);
  } catch (e) {
    return defaultVal;
  }
};

export const setStored = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error(e);
  }
};

export const defaultOMCs = [
  { id: 1, name: 'IOCL', location: 'Mumbai Central, Maharashtra', contact: '9820012345', contact_password: 'password123', created_at: new Date().toISOString() },
  { id: 2, name: 'BPCL', location: 'Pune Regional Office, Maharashtra', contact: '9820054321', contact_password: 'password123', created_at: new Date().toISOString() },
  { id: 3, name: 'HPCL', location: 'Connaught Place, New Delhi', contact: '9811023456', contact_password: 'password123', created_at: new Date().toISOString() }
];

export const defaultROs = [
  { id: 1, omc_id: 1, name: 'pune pertoleam', location: 'pune', status: 'Active', contact: '8765678941', contact_password: 'password123' },
  { id: 3, omc_id: 2, name: 'Pune City RO', location: 'Shivajinagar, Pune', status: 'Active', contact: '9822001144', contact_password: 'password123' },
  { id: 4, omc_id: 1, name: 'abc', location: 'pune', status: 'Active', contact: '8765678943', contact_password: 'password123' }
];

export const notifyDataUpdated = (resource, method, data = {}) => {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('app_data_updated', { detail: { resource, method, data } }));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      // ignore
    }
  }
};

export const defaultMachines = [
  { id: 1, db_id: 1, name: 'SBP2T903', ro_id: 1, type: 'Dispenser', status: 'Inactive', health_score: 85, live_temp: '45', live_water: 'Normal', live_humidity: '55', live_odour: '30', live_nh3: '17', live_h2s: '11', visits: 0, tempLimitLow: '20', tempLimitMedium: '30', tempLimitDanger: '41', humidityLimitLow: '35', humidityLimitMedium: '70', humidityLimitDanger: '76', waterLevelTrigger: 'Disabled', odourLimitLow: '40', odourLimitMedium: '60', odourLimitDanger: '71', nh3LimitLow: '25', nh3LimitDanger: '50', h2sLimitLow: '10', h2sLimitDanger: '20', created_at: new Date().toISOString() },
  { id: 2, db_id: 2, name: 'SBP2T902', ro_id: 1, type: 'Dispenser', status: 'Inactive', health_score: 82, live_temp: '28', live_water: 'Low', live_humidity: '50', live_odour: '35', live_nh3: '19', live_h2s: '12', visits: 0, tempLimitLow: '20', tempLimitMedium: '30', tempLimitDanger: '41', humidityLimitLow: '35', humidityLimitMedium: '70', humidityLimitDanger: '76', waterLevelTrigger: 'Low', odourLimitLow: '40', odourLimitMedium: '60', odourLimitDanger: '71', nh3LimitLow: '25', nh3LimitDanger: '50', h2sLimitLow: '10', h2sLimitDanger: '20', created_at: new Date().toISOString() },
  { id: 3, db_id: 3, name: 'SBP2T901', ro_id: 1, type: 'Dispenser', status: 'Inactive', health_score: 79, live_temp: '32', live_water: 'Low', live_humidity: '52', live_odour: '78', live_nh3: '43', live_h2s: '27', visits: 0, tempLimitLow: '20', tempLimitMedium: '30', tempLimitDanger: '41', humidityLimitLow: '35', humidityLimitMedium: '70', humidityLimitDanger: '76', waterLevelTrigger: 'Low', odourLimitLow: '40', odourLimitMedium: '60', odourLimitDanger: '71', nh3LimitLow: '25', nh3LimitDanger: '50', h2sLimitLow: '10', h2sLimitDanger: '20', created_at: new Date().toISOString() },
  { id: 4, db_id: 4, name: 'SBP2T201', ro_id: 4, type: 'Dispenser', status: 'Inactive', health_score: 91, live_temp: '18', live_water: 'Normal', live_humidity: '30', live_odour: '52', live_nh3: '29', live_h2s: '18', visits: 0, tempLimitLow: '20', tempLimitMedium: '30', tempLimitDanger: '41', humidityLimitLow: '35', humidityLimitMedium: '70', humidityLimitDanger: '76', waterLevelTrigger: 'Low', odourLimitLow: '40', odourLimitMedium: '60', odourLimitDanger: '71', nh3LimitLow: '25', nh3LimitDanger: '50', h2sLimitLow: '10', h2sLimitDanger: '20', created_at: new Date().toISOString() },
  { id: 5, db_id: 5, name: 'SBP2T202', ro_id: 4, type: 'Dispenser', status: 'Inactive', health_score: 96, live_temp: '27', live_water: 'Normal', live_humidity: '50', live_odour: '30', live_nh3: '17', live_h2s: '11', visits: 0, tempLimitLow: '20', tempLimitMedium: '30', tempLimitDanger: '41', humidityLimitLow: '35', humidityLimitMedium: '70', humidityLimitDanger: '76', waterLevelTrigger: 'Low', odourLimitLow: '40', odourLimitMedium: '60', odourLimitDanger: '71', nh3LimitLow: '25', nh3LimitDanger: '50', h2sLimitLow: '10', h2sLimitDanger: '20', created_at: new Date().toISOString() }
];

export const defaultAlerts = [
  { id: 1, machine_id: 'SBP2T903', machineName: 'SBP2T903', ro_id: 1, type: 'Temperature', severity: 'Danger', message: 'High Temperature alert (45°C >= 41°C limit)', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), status: 'Open' },
  { id: 2, machine_id: 'SBP2T902', machineName: 'SBP2T902', ro_id: 1, type: 'Water', severity: 'Low', message: 'Water Level Low - Refill required', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), status: 'Open' },
  { id: 3, machine_id: 'SBP2T901', machineName: 'SBP2T901', ro_id: 1, type: 'Odour', severity: 'Danger', message: 'Dangerous Odour level detected (78 PPM >= 71 limit - Immediate cleaning required)', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), status: 'Open' },
  { id: 4, machine_id: 'SBP2T901', machineName: 'SBP2T901', ro_id: 1, type: 'Water', severity: 'Low', message: 'Water Level Low - Refill required', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), status: 'Open' },
  { id: 5, machine_id: 'SBP2T201', machineName: 'SBP2T201', ro_id: 4, type: 'Temperature', severity: 'Low', message: 'Low Temperature alert (18°C <= 20°C limit)', timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(), status: 'Open' },
  { id: 6, machine_id: 'SBP2T201', machineName: 'SBP2T201', ro_id: 4, type: 'Humidity', severity: 'Low', message: 'Low Humidity detected (30% <= 35% limit)', timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), status: 'Open' }
];

export const sanitizeMachinesList = (machines = []) => {
  const currentROs = getStored('ros_data', defaultROs);
  const validRoIds = new Set(currentROs.map(r => Number(r.id)));

  let list = Array.isArray(machines) ? machines : defaultMachines;

  // Deduplicate first
  const seenKeys = new Set();
  list = list.filter(m => {
    const key = `${m.name || m.id}_${m.ro_id || m.roId || ''}`;
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });

  return list.map((m, idx) => {
    let cleanName = m.name || m.id;
    const mRoId = String(m.ro_id || m.roId || '1');
    if (!cleanName || String(cleanName).startsWith('MCH') || String(m.id).startsWith('MCH') || String(cleanName).toLowerCase().includes('mch')) {
      cleanName = `SBP2T${mRoId}0${(idx % 3) + 1}`;
    }

    const mNameStr = String(cleanName || '').trim();
    const cleanIdStr = String(m.id || '').trim();
    const num = (parseInt(mNameStr.replace(/\D/g, ''), 10) || (idx + 1));

    // Thresholds:
    // Temp: Low <= 20°C, Neutral: 21°C - 40°C, Danger: 41°C - 50°C
    // Humidity: Low <= 35%, Neutral: 36% - 75%, Danger: 76% - 100%
    // Odour: Low <= 40 PPM, Neutral: 41 - 70 PPM, Danger: 71 - 100 PPM
    // Water: Trigger on Low / Empty, Disabled
    const tempLow = String(m.tempLimitLow ?? m.temp_limit_low ?? m.tempLimitMin ?? '20');
    const tempMedium = String(m.tempLimitMedium ?? m.temp_limit_medium ?? '30');
    const tempDanger = String(m.tempLimitDanger ?? m.temp_limit_danger ?? m.tempLimitMax ?? '41');

    const humidLow = String(m.humidityLimitLow ?? m.humidity_limit_low ?? '35');
    const humidMedium = String(m.humidityLimitMedium ?? m.humidity_limit_medium ?? '70');
    const humidDanger = String(m.humidityLimitDanger ?? m.humidity_limit_danger ?? '76');

    const odourLow = String(m.odourLimitLow ?? m.odour_limit_low ?? '40');
    const odourMedium = String(m.odourLimitMedium ?? m.odour_limit_medium ?? '60');
    const odourDanger = String(m.odourLimitDanger ?? m.odour_limit_danger ?? '71');

    const nh3Low = String(m.nh3LimitLow ?? m.nh3_limit_low ?? '25');
    const nh3Danger = String(m.nh3LimitDanger ?? m.nh3_limit_danger ?? '50');

    const h2sLow = String(m.h2sLimitLow ?? m.h2s_limit_low ?? '10');
    const h2sDanger = String(m.h2sLimitDanger ?? m.h2s_limit_danger ?? '20');

    const waterTrigger = String(m.waterLevelTrigger ?? m.water_level_trigger ?? m.waterLimitLow ?? 'Low');

    // Telemetry mapping: preserve any user-saved or hardware-reported telemetry
    let cleanSavedTemp = m.live_temp ?? m.liveTemp;
    let cleanSavedHumidity = m.live_humidity ?? m.liveHumidity;
    let cleanSavedWater = m.live_water ?? m.liveWater;
    let cleanSavedOdour = m.live_odour ?? m.liveOdour;
    let cleanSavedNh3 = m.live_nh3 ?? m.liveNh3;
    let cleanSavedH2s = m.live_h2s ?? m.liveH2s;

    let newTemp = cleanSavedTemp ? String(cleanSavedTemp).replace(/[^0-9.-]/g, '') : '';
    let newHumidity = cleanSavedHumidity ? String(cleanSavedHumidity).replace(/[^0-9.-]/g, '') : '';
    let newWater = cleanSavedWater ? (String(cleanSavedWater).toLowerCase().includes('empty') || String(cleanSavedWater) === '0' ? 'Empty' : (String(cleanSavedWater).toLowerCase().includes('low') || parseInt(cleanSavedWater) <= 25 ? 'Low' : 'Normal')) : '';
    let newOdour = cleanSavedOdour ? String(cleanSavedOdour).replace(/[^0-9.-]/g, '') : '';
    let newNh3 = cleanSavedNh3 ? String(cleanSavedNh3).replace(/[^0-9.-]/g, '') : '';
    let newH2s = cleanSavedH2s ? String(cleanSavedH2s).replace(/[^0-9.-]/g, '') : '';

    // Preserve genuine telemetry; only provide fallbacks if missing
    if (!newTemp && mNameStr.includes('903')) newTemp = '45';
    if (!newWater && mNameStr.includes('902')) newWater = 'Empty';
    if (!newOdour && mNameStr.includes('901')) newOdour = '78';

    if (!newTemp) newTemp = '28';
    if (!newHumidity) newHumidity = '50';
    if (!newOdour) newOdour = '30';
    if (!newWater) newWater = 'Normal';
    if (!newNh3 && newOdour) newNh3 = String(Math.round(parseFloat(newOdour) * 0.55));
    if (!newH2s && newOdour) newH2s = String(Math.round(parseFloat(newOdour) * 0.35));
    if (!newNh3) newNh3 = '17';
    if (!newH2s) newH2s = '11';

    // Ensure valid RO
    let roId = Number(m.ro_id || m.roId);
    if (!validRoIds.has(roId) || !roId) {
      const abcRo = currentROs.find(r => r.name?.toLowerCase() === 'abc');
      const abcRoId = abcRo ? Number(abcRo.id) : 4;
      const ro1Id = currentROs[0] ? Number(currentROs[0].id) : 1;
      if (mNameStr.includes('101') || mNameStr.includes('102') || mNameStr.includes('901') || mNameStr.includes('902') || mNameStr.includes('903')) {
        roId = ro1Id;
      } else {
        roId = abcRoId;
      }
    }

    let status = m.status || 'Inactive';
    if (status === 'Running' || status === 'Online') {
      status = 'Active';
    }

    let visits = Number(m.visits !== undefined && m.visits !== null ? m.visits : (m.usage || 0));
    if (isNaN(visits) || visits < 0) {
      visits = 0;
    }

    const matchedRo = currentROs.find(r => Number(r.id) === Number(roId));
    const finalRoName = m.roName || m.ro || (matchedRo ? matchedRo.name : (Number(roId) === 4 ? 'abc' : 'pune pertoleam'));

    return {
      ...m,
      db_id: m.db_id || m.id,
      id: cleanName,
      name: cleanName,
      status,
      ro_id: roId,
      roId,
      roName: finalRoName,
      ro: finalRoName,
      live_temp: newTemp,
      liveTemp: newTemp,
      live_humidity: newHumidity,
      liveHumidity: newHumidity,
      live_water: newWater,
      liveWater: newWater,
      live_odour: newOdour,
      liveOdour: newOdour,
      live_nh3: newNh3,
      liveNh3: `${newNh3} PPM`,
      live_h2s: newH2s,
      liveH2s: `${newH2s} PPM`,
      tempLimitLow: tempLow,
      tempLimitMedium: tempMedium,
      tempLimitDanger: tempDanger,
      humidityLimitLow: humidLow,
      humidityLimitMedium: humidMedium,
      humidityLimitDanger: humidDanger,
      odourLimitLow: odourLow,
      odourLimitMedium: odourMedium,
      odourLimitDanger: odourDanger,
      nh3LimitLow: nh3Low,
      nh3LimitDanger: nh3Danger,
      h2sLimitLow: h2sLow,
      h2sLimitDanger: h2sDanger,
      waterLevelTrigger: waterTrigger,
      waterLimitLow: waterTrigger,
      install_date: m.install_date || m.installDate || (m.created_at ? String(m.created_at).split('T')[0] : new Date().toISOString().split('T')[0]),
      installDate: m.installDate || m.install_date || (m.created_at ? String(m.created_at).split('T')[0] : new Date().toISOString().split('T')[0]),
      visits
    };
  });
};

export const generateAlertsFromMachines = (machines = [], storedAlerts = []) => {
  let alerts = [];
  let nextId = 1;

  if (!Array.isArray(machines) || machines.length === 0) {
    return alerts;
  }

  // Filter out any stale 'Medium' / 'Warning' alerts and fix legacy Water Level Low / Odour severity
  if (Array.isArray(storedAlerts)) {
    storedAlerts = storedAlerts
      .filter(a => a && a.severity !== 'Medium' && a.severity !== 'Warning')
      .map(a => {
        if (!a) return a;
        if (a.type === 'Water' && a.message?.toLowerCase().includes('low') && a.severity === 'Danger') {
          return { ...a, severity: 'Low' };
        }
        if (a.type === 'Odour' && a.message?.toLowerCase().includes('moderate') && a.severity === 'Danger') {
          return { ...a, severity: 'Low' };
        }
        return a;
      });
  }

  // Preserve manual / custom user-created alerts from storedAlerts (only Low & Danger)
  if (Array.isArray(storedAlerts)) {
    storedAlerts.forEach(oldA => {
      if (oldA && oldA.isCustom) {
        alerts.push(oldA);
        const oldId = Number(oldA.id) || 0;
        if (oldId >= nextId) nextId = oldId + 1;
      }
    });
  }

  const getTodayOffsetIso = (hour, minute) => {
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  machines.forEach((machine) => {
    if (!machine) return;

    const mId = String(machine.name || machine.id || '').trim();
    if (!mId) return;

    const roId = machine.ro_id || machine.roId || 1;
    let roName = machine.roName || machine.ro;
    if (!roName || roName === 'RO Location' || roName === 'Unassigned') {
      const currentROs = getStored('ros_data', defaultROs);
      const matched = currentROs.find(r => String(r.id) === String(roId));
      roName = matched ? matched.name : (String(roId) === '4' ? 'abc' : 'pune pertoleam');
    }

    // 1. Temperature Thresholds & Telemetry for THIS machine
    // Neutral (21°C to 40°C Optimal Range) -> ZERO ALERT
    // Low (≤ 20°C Low Temperature) -> Severity: 'Low'
    // Danger (≥ 41°C High Temperature / Fire Hazard) -> Severity: 'Danger'
    const tempLow = parseFloat(machine.tempLimitLow ?? machine.temp_limit_low ?? 20);
    const tempDanger = parseFloat(machine.tempLimitDanger ?? machine.temp_limit_danger ?? 41);

    const rawTemp = machine.live_temp ?? machine.liveTemp;
    let tempNum = NaN;
    if (rawTemp !== undefined && rawTemp !== null && String(rawTemp).trim() !== '') {
      tempNum = parseFloat(String(rawTemp).replace(/[^\d.-]/g, ''));
    }

    if (!isNaN(tempNum)) {
      if (tempNum >= tempDanger) {
        alerts.push({
          id: nextId++,
          machine_id: mId,
          machineName: mId,
          ro_id: roId,
          roName: roName,
          type: 'Temperature',
          severity: 'Danger',
          message: `High Temperature alert (${tempNum}°C >= ${tempDanger}°C limit)`,
          status: 'Open',
          timestamp: getTodayOffsetIso(13, 30)
        });
      } else if (tempNum <= tempLow) {
        alerts.push({
          id: nextId++,
          machine_id: mId,
          machineName: mId,
          ro_id: roId,
          roName: roName,
          type: 'Temperature',
          severity: 'Low',
          message: `Low Temperature alert (${tempNum}°C <= ${tempLow}°C limit)`,
          status: 'Open',
          timestamp: getTodayOffsetIso(9, 40)
        });
      }
      // 21°C to 40°C -> Neutral Operating Range: ZERO Alert!
    }

    // 2. Odour Thresholds & Telemetry for THIS machine
    // Neutral (≤ 40 PPM Fresh Air) -> ZERO ALERT
    // Low (41 to 70 PPM Moderate Odour - Cleaning Required) -> Severity: 'Low'
    // Danger (≥ 71 PPM Dangerous Odour / Toxic Gas - Immediate Action) -> Severity: 'Danger'
    const odourLow = parseFloat(machine.odourLimitLow ?? machine.odour_limit_low ?? 40);
    const odourDanger = parseFloat(machine.odourLimitDanger ?? machine.odour_limit_danger ?? 71);

    const rawOdour = machine.live_odour ?? machine.liveOdour;
    let odourNum = NaN;
    if (rawOdour !== undefined && rawOdour !== null && String(rawOdour).trim() !== '') {
      odourNum = parseFloat(String(rawOdour).replace(/[^\d.-]/g, ''));
      if (isNaN(odourNum)) {
        const oStr = String(rawOdour).toLowerCase();
        if (oStr.includes('danger') || oStr.includes('critical') || oStr.includes('high')) odourNum = odourDanger + 5;
        else odourNum = 40; // Safe baseline
      }
    }

    if (!isNaN(odourNum)) {
      if (odourNum >= odourDanger) {
        alerts.push({
          id: nextId++,
          machine_id: mId,
          machineName: mId,
          ro_id: roId,
          roName: roName,
          type: 'Odour',
          severity: 'Danger',
          message: `Dangerous Odour level detected (${odourNum} PPM >= ${odourDanger} limit - Immediate cleaning required)`,
          status: 'Open',
          timestamp: getTodayOffsetIso(14, 45)
        });
      } else if (odourNum <= odourLow) {
        alerts.push({
          id: nextId++,
          machine_id: mId,
          machineName: mId,
          ro_id: roId,
          roName: roName,
          type: 'Odour',
          severity: 'Low',
          message: `Low Odour detected (${odourNum} PPM <= ${odourLow} limit)`,
          status: 'Open',
          timestamp: getTodayOffsetIso(11, 20)
        });
      }
      // 41-70 PPM (including 45 and 55 PPM) is Neutral Range: ZERO Alert
    }

    // 3. Humidity Thresholds & Telemetry for THIS machine
    // Neutral (36% to 75% Normal Humidity) -> ZERO ALERT
    // Low (≤ 35% Dry Air) -> Severity: 'Low'
    // Danger (≥ 76% Excessive Moisture / Leakage) -> Severity: 'Danger'
    const humidLow = parseFloat(machine.humidityLimitLow ?? machine.humidity_limit_low ?? 35);
    const humidDanger = parseFloat(machine.humidityLimitDanger ?? machine.humidity_limit_danger ?? 76);

    const rawHumid = machine.live_humidity ?? machine.liveHumidity;
    let humidNum = NaN;
    if (rawHumid !== undefined && rawHumid !== null && String(rawHumid).trim() !== '') {
      humidNum = parseFloat(String(rawHumid).replace(/[^\d.-]/g, ''));
    }

    if (!isNaN(humidNum)) {
      if (humidNum >= humidDanger) {
        alerts.push({
          id: nextId++,
          machine_id: mId,
          machineName: mId,
          ro_id: roId,
          roName: roName,
          type: 'Humidity',
          severity: 'Danger',
          message: `Critical Humidity detected (${humidNum}% >= ${humidDanger}% limit)`,
          status: 'Open',
          timestamp: getTodayOffsetIso(12, 10)
        });
      } else if (humidNum <= humidLow) {
        alerts.push({
          id: nextId++,
          machine_id: mId,
          machineName: mId,
          ro_id: roId,
          roName: roName,
          type: 'Humidity',
          severity: 'Low',
          message: `Low Humidity detected (${humidNum}% <= ${humidLow}% limit)`,
          status: 'Open',
          timestamp: getTodayOffsetIso(8, 20)
        });
      }
      // 36% to 75% -> Neutral Normal Humidity: ZERO Alert!
    }

    // 4. Water Level Telemetry for THIS machine
    // Normal (Adequate Water) -> ZERO ALERT
    // Low (Water Level Low - Refill Required) -> Severity: 'Low' ONLY
    const rawWater = machine.live_water ?? machine.liveWater;
    const waterStr = String(rawWater || '').trim().toLowerCase();
    const triggerSetting = String(machine.waterLevelTrigger ?? machine.waterLimitLow ?? 'Low').toLowerCase();
    
    if (triggerSetting !== 'disabled') {
      const isWaterLow = waterStr.includes('low') || waterStr.includes('empty') || waterStr === '0' || (parseInt(waterStr) <= 25 && parseInt(waterStr) >= 0);

      if (isWaterLow) {
        alerts.push({
          id: nextId++,
          machine_id: mId,
          machineName: mId,
          ro_id: roId,
          roName: roName,
          type: 'Water',
          severity: 'Low',
          message: 'Water Level Low - Refill required',
          status: 'Open',
          timestamp: getTodayOffsetIso(15, 20)
        });
      }
      // Normal: Adequate Water - ZERO Alert!
    }
  });

  // If storedAlerts had active alerts for machines whose readings normalized, mark them Resolved!
  if (Array.isArray(storedAlerts) && storedAlerts.length > 0) {
    storedAlerts.forEach(oldA => {
      if (oldA && oldA.status !== 'Resolved') {
        const stillViolating = alerts.some(newA =>
          (String(newA.machine_id).toLowerCase() === String(oldA.machine_id).toLowerCase() ||
           String(newA.machineName).toLowerCase() === String(oldA.machineName).toLowerCase()) &&
          newA.type === oldA.type
        );
        if (!stillViolating) {
          alerts.push({
            ...oldA,
            status: 'Resolved'
          });
        }
      }
    });

    // If an alert was already Open in storedAlerts for this machine and type, preserve its original ID and timestamp to avoid flickering
    alerts.forEach(newA => {
      const existingOpen = storedAlerts.find(oldA =>
        oldA &&
        (String(oldA.machine_id).toLowerCase() === String(newA.machine_id).toLowerCase() ||
         String(oldA.machineName).toLowerCase() === String(newA.machineName).toLowerCase()) &&
        oldA.type === newA.type &&
        oldA.status === 'Open'
      );
      if (existingOpen) {
        newA.id = existingOpen.id;
        newA.timestamp = existingOpen.timestamp;
      }
    });
  }

  return alerts;
};

export const handleMockRequest = (url, method, body = {}) => {
  const cleanUrl = url.replace(/^[a-z]+:\/\/[^/]+/i, '').replace(/^\/api(\/v1)?/, '');
  const [path] = cleanUrl.split('?');
  const segments = path.split('/').filter(Boolean);
  const resource = segments[0] || '';
  const id = segments[1] || null;

  // OMC
  if (resource === 'omc') {
    let list = getStored('omcs_data', defaultOMCs);
    list = list.map(o => ({
      ...o,
      contact_password: o.contact_password || o.credentials?.password || 'password123'
    }));

    // Auto-clean any duplicate phone entries from historical sessions
    const seenOmcContacts = new Set();
    const dedupedList = [];
    for (const o of list) {
      const clean = String(o.contact || '').replace(/\D/g, '').trim();
      if (!clean || !seenOmcContacts.has(clean)) {
        if (clean) seenOmcContacts.add(clean);
        dedupedList.push(o);
      }
    }
    list = dedupedList;
    list.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
    setStored('omcs_data', list);

    if (method === 'get') {
      if (id) {
        const item = list.find(o => String(o.id) === String(id));
        return { success: !!item, data: item || null };
      }
      return { success: true, data: list };
    }
    if (method === 'post') {
      const cleanContact = String(body.contact || '').replace(/\D/g, '').trim();
      if (!cleanContact || cleanContact.length !== 10) {
        return { success: false, message: 'Mobile number must be exactly 10 digits' };
      }

      // Check duplicate in OMCs
      const dupOmc = list.find(o => String(o.contact || '').replace(/\D/g, '').trim() === cleanContact);
      if (dupOmc) {
        return { success: false, message: `Mobile number ${cleanContact} is already registered with OMC "${dupOmc.name}". Duplicate phone number is strictly prohibited.` };
      }
      // Check duplicate in ROs
      const roList = getStored('ros_data', defaultROs);
      const dupRo = roList.find(r => String(r.contact || '').replace(/\D/g, '').trim() === cleanContact);
      if (dupRo) {
        return { success: false, message: `Mobile number ${cleanContact} is already registered with RO "${dupRo.name}". Duplicate phone number is strictly prohibited.` };
      }

      const nextId = list.length > 0 ? Math.max(...list.map(o => Number(o.id) || 0)) + 1 : 1;
      const pass = body.contact_password || '123456';
      const newOmc = {
        id: nextId,
        name: body.name || 'New OMC',
        location: body.location || '',
        contact: cleanContact,
        contact_password: pass,
        created_at: new Date().toISOString(),
        credentials: {
          username: cleanContact,
          password: pass
        }
      };
      const updated = [...list, newOmc].sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
      setStored('omcs_data', updated);
      notifyDataUpdated('omc', 'post', newOmc);
      return { success: true, data: newOmc, message: 'OMC created successfully' };
    }
    if (method === 'put') {
      const cleanContact = String(body.contact || '').replace(/\D/g, '').trim();
      if (!cleanContact || cleanContact.length !== 10) {
        return { success: false, message: 'Mobile number must be exactly 10 digits' };
      }

      // Check duplicate in other OMCs
      const dupOmc = list.find(o => String(o.id) !== String(id) && String(o.contact || '').replace(/\D/g, '').trim() === cleanContact);
      if (dupOmc) {
        return { success: false, message: `Mobile number ${cleanContact} is already registered with OMC "${dupOmc.name}". Duplicate phone number is strictly prohibited.` };
      }
      // Check duplicate in ROs
      const roList = getStored('ros_data', defaultROs);
      const dupRo = roList.find(r => String(r.contact || '').replace(/\D/g, '').trim() === cleanContact);
      if (dupRo) {
        return { success: false, message: `Mobile number ${cleanContact} is already registered with RO "${dupRo.name}". Duplicate phone number is strictly prohibited.` };
      }

      const updated = list.map(o => {
        if (String(o.id) === String(id)) {
          const pass = body.contact_password || o.contact_password || o.credentials?.password || 'password123';
          return {
            ...o,
            ...body,
            contact: cleanContact,
            contact_password: pass,
            credentials: {
              username: cleanContact,
              password: pass
            }
          };
        }
        return o;
      });
      setStored('omcs_data', updated);
      const item = updated.find(o => String(o.id) === String(id));
      notifyDataUpdated('omc', 'put', item);
      return { success: true, data: item, message: 'OMC updated successfully' };
    }
    if (method === 'delete') {
      const updated = list.filter(o => String(o.id) !== String(id));
      setStored('omcs_data', updated);
      notifyDataUpdated('omc', 'delete', { id });
      return { success: true, message: 'OMC deleted successfully' };
    }
  }

  // RO
  if (resource === 'ro') {
    let list = getStored('ros_data', defaultROs);
    // Sanitize stale legacy ROs if present (e.g., Andheri West RO, stale ID 2, accidental test ROs)
    list = list.filter(r => {
      const n = String(r.name || '').toLowerCase().trim();
      return n !== 'andheri west ro' && n !== 'hwejjk' && n !== 'iocl' && !(r.id === 2 && (r.location === 'Andheri, Mumbai' || !r.name));
    });
    // Normalize IDs to pure numbers and ensure contact_password and accurate active names
    list = list.map(r => {
      const cleanNum = parseInt(String(r.id).replace(/[^0-9]/g, ''), 10);
      const normalizedId = (!isNaN(cleanNum) && cleanNum > 0) ? cleanNum : r.id;
      let name = r.name;
      let loc = r.location || 'pune';
      let contact = String(r.contact || '8765678941').replace(/\D/g, '');
      let omc_id = r.omc_id || 1;
      if (normalizedId === 1) {
        if (!name || String(name).toLowerCase() === 'radha' || String(name).toLowerCase().startsWith('ro ')) {
          name = 'pune pertoleam';
        }
      } else if (normalizedId === 4) {
        if (!name || String(name).toLowerCase() === 'radha' || String(name).toLowerCase().startsWith('ro ')) {
          name = 'abc';
        }
      }
      return {
        ...r,
        id: normalizedId,
        name: name || (normalizedId === 1 ? 'pune pertoleam' : 'abc'),
        location: loc,
        contact,
        omc_id,
        contact_password: r.contact_password || r.credentials?.password || 'password123'
      };
    });

    // Auto-clean any duplicate phone entries from historical sessions
    const seenRoContacts = new Set();
    const dedupedRoList = [];
    for (const r of list) {
      const clean = String(r.contact || '').replace(/\D/g, '').trim();
      if (!clean || !seenRoContacts.has(clean)) {
        if (clean) seenRoContacts.add(clean);
        dedupedRoList.push(r);
      }
    }
    list = dedupedRoList;
    list.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
    setStored('ros_data', list);

    if (method === 'get') {
      if (id) {
        const cleanId = String(id).replace(/[^0-9]/g, '');
        const item = list.find(r => String(r.id) === String(id) || String(r.id) === cleanId);
        return { success: !!item, data: item || null };
      }
      return { success: true, data: list };
    }
    if (method === 'post') {
      const cleanContact = String(body.contact || '').replace(/\D/g, '').trim();
      if (!cleanContact || cleanContact.length !== 10) {
        return { success: false, message: 'Mobile number must be exactly 10 digits' };
      }

      // Check duplicate in ROs
      const dupRo = list.find(r => String(r.contact || '').replace(/\D/g, '').trim() === cleanContact);
      if (dupRo) {
        return { success: false, message: `Mobile number ${cleanContact} is already registered with RO "${dupRo.name}". Duplicate phone number is strictly prohibited.` };
      }
      // Check duplicate in OMCs
      const omcList = getStored('omcs_data', defaultOMCs);
      const dupOmc = omcList.find(o => String(o.contact || '').replace(/\D/g, '').trim() === cleanContact);
      if (dupOmc) {
        return { success: false, message: `Mobile number ${cleanContact} is already registered with OMC "${dupOmc.name}". Duplicate phone number is strictly prohibited.` };
      }

      const nextId = list.length > 0 ? Math.max(...list.map(r => {
        const n = parseInt(String(r.id).replace(/[^0-9]/g, ''), 10);
        return isNaN(n) ? 0 : n;
      })) + 1 : 1;
      const pass = body.contact_password || '123456';
      const newRo = {
        id: nextId,
        omc_id: Number(body.omc_id) || body.omc_id,
        name: body.name || 'New RO',
        location: body.location || '',
        status: body.status || 'Active',
        contact: cleanContact,
        contact_password: pass,
        created_at: new Date().toISOString(),
        credentials: {
          username: cleanContact,
          password: pass
        }
      };
      const updated = [...list, newRo].sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
      setStored('ros_data', updated);
      notifyDataUpdated('ro', 'post', newRo);
      return { success: true, data: newRo, message: 'RO created successfully' };
    }
    if (method === 'put') {
      const cleanId = String(id).replace(/[^0-9]/g, '');
      const cleanContact = String(body.contact || '').replace(/\D/g, '').trim();
      if (!cleanContact || cleanContact.length !== 10) {
        return { success: false, message: 'Mobile number must be exactly 10 digits' };
      }

      // Check duplicate in other ROs
      const dupRo = list.find(r => String(r.id) !== String(id) && String(r.id) !== cleanId && String(r.contact || '').replace(/\D/g, '').trim() === cleanContact);
      if (dupRo) {
        return { success: false, message: `Mobile number ${cleanContact} is already registered with RO "${dupRo.name}". Duplicate phone number is strictly prohibited.` };
      }
      // Check duplicate in OMCs
      const omcList = getStored('omcs_data', defaultOMCs);
      const dupOmc = omcList.find(o => String(o.contact || '').replace(/\D/g, '').trim() === cleanContact);
      if (dupOmc) {
        return { success: false, message: `Mobile number ${cleanContact} is already registered with OMC "${dupOmc.name}". Duplicate phone number is strictly prohibited.` };
      }

      const updated = list.map(r => {
        if (String(r.id) === String(id) || String(r.id) === cleanId) {
          const pass = body.contact_password || r.contact_password || r.credentials?.password || 'password123';
          return {
            ...r,
            ...body,
            id: Number(r.id) || r.id,
            contact: cleanContact,
            contact_password: pass,
            credentials: {
              username: cleanContact,
              password: pass
            }
          };
        }
        return r;
      });
      updated.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
      setStored('ros_data', updated);
      const item = updated.find(r => String(r.id) === String(id) || String(r.id) === cleanId);
      notifyDataUpdated('ro', 'put', item);
      return { success: true, data: item, message: 'RO updated successfully' };
    }
    if (method === 'delete') {
      const cleanId = String(id).replace(/[^0-9]/g, '');
      const updated = list.filter(r => String(r.id) !== String(id) && String(r.id) !== cleanId);
      setStored('ros_data', updated);
      notifyDataUpdated('ro', 'delete', { id });
      return { success: true, message: 'RO deleted successfully' };
    }
  }

  // Machines
  if (resource === 'machines' || resource === 'machine') {
    const MIGRATION_KEY = 'machines_v19_zero_visits_default_inactive';
    if (typeof window !== 'undefined' && !localStorage.getItem(MIGRATION_KEY)) {
      let currentRaw = getStored('machines_data', defaultMachines);
      let seeded = currentRaw.map(m => {
        const name = String(m.name || m.id || '').toUpperCase();
        if (name.includes('903')) {
          return { ...m, live_temp: '45', liveTemp: '45°C', live_water: 'Normal', liveWater: 'Normal', live_odour: '30', liveOdour: '30 PPM', live_humidity: '55', liveHumidity: '55%' };
        }
        if (name.includes('902')) {
          return { ...m, live_water: 'Low', liveWater: 'Low', waterLevelTrigger: 'Low', live_temp: '28', liveTemp: '28°C', live_odour: '35', liveOdour: '35 PPM', live_humidity: '50', liveHumidity: '50%' };
        }
        if (name.includes('901')) {
          return { ...m, live_odour: '78', liveOdour: '78 PPM', live_water: 'Low', liveWater: 'Low', waterLevelTrigger: 'Low', live_temp: '32', liveTemp: '32°C', live_humidity: '52', liveHumidity: '52%' };
        }
        if (name.includes('201') || name.includes('101')) {
          return { ...m, live_temp: '18', liveTemp: '18°C', live_humidity: '30', liveHumidity: '30%', live_odour: '52', liveOdour: '52 PPM', live_water: 'Normal', liveWater: 'Normal' };
        }
        return { ...m, live_temp: '27', liveTemp: '27°C', live_humidity: '50', liveHumidity: '50%', live_odour: '30', liveOdour: '30 PPM', live_water: 'Normal', liveWater: 'Normal' };
      });
      let sanitized = sanitizeMachinesList(seeded);
      setStored('machines_data', sanitized);
      setStored('alerts_data', generateAlertsFromMachines(sanitized, []));
      localStorage.setItem(MIGRATION_KEY, 'true');
    }

    let list = getStored('machines_data', defaultMachines);
    list = sanitizeMachinesList(list);
    setStored('machines_data', list);
    setStored('alerts_data', generateAlertsFromMachines(list, getStored('alerts_data', [])));

    if (method === 'get') {
      return { success: true, data: list };
    }
    if (method === 'post') {
      const nextId = list.length > 0 ? Math.max(...list.map(m => Number(m.db_id || m.id) || 0)) + 1 : 1;
      const installDate = body.install_date || body.installDate || (body.created_at ? body.created_at.split('T')[0] : new Date().toISOString().split('T')[0]);
      const machineName = body.name || body.id || `SBP2T${100 + nextId}`;
      const newM = {
        id: nextId,
        db_id: nextId,
        name: machineName,
        ro_id: Number(body.ro_id) || body.ro_id,
        roId: Number(body.ro_id) || body.ro_id,
        type: body.type || 'Dispenser',
        status: body.status || 'ACTIVE',
        health_score: 95,
        live_temp: '28',
        live_water: body.live_water ? (String(body.live_water).toLowerCase() === 'low' ? 'Low' : 'Normal') : 'Normal',
        live_humidity: '50',
        live_odour: '50',
        visits: body.visits ? Number(body.visits) : (40 + (nextId * 7 % 25)),
        install_date: installDate,
        installDate: installDate,
        created_at: installDate,
        ...body,
        id: nextId,
        db_id: nextId,
        name: machineName,
        ro_id: Number(body.ro_id) || body.ro_id,
        roId: Number(body.ro_id) || body.ro_id
      };
      const updated = sanitizeMachinesList([newM, ...list]);
      setStored('machines_data', updated);
      setStored('alerts_data', generateAlertsFromMachines(updated, getStored('alerts_data', [])));
      notifyDataUpdated('machines', 'post', newM);
      return { success: true, data: newM, message: 'Machine added successfully' };
    }
    if (method === 'put') {
      const targetId = String(id || '').toLowerCase().trim();
      const bodyName = String(body?.name || '').toLowerCase().trim();
      const bodyId = String(body?.id || '').toLowerCase().trim();
      const bodyDbId = String(body?.db_id || '').toLowerCase().trim();
      const targetDigits = (targetId.replace(/\D/g, '') || bodyName.replace(/\D/g, '') || bodyId.replace(/\D/g, '')).trim();

      const installDate = body.install_date || body.installDate || body.created_at;
      const updated = list.map(m => {
        const mId = String(m.id || '').toLowerCase().trim();
        const mDbId = String(m.db_id || '').toLowerCase().trim();
        const mName = String(m.name || '').toLowerCase().trim();
        const mDigits = (mName.replace(/\D/g, '') || mId.replace(/\D/g, '')).trim();

        const isMatch = (targetId && (mId === targetId || mDbId === targetId || mName === targetId)) ||
          (bodyId && (mId === bodyId || mDbId === bodyId || mName === bodyId)) ||
          (bodyName && (mId === bodyName || mDbId === bodyName || mName === bodyName)) ||
          (bodyDbId && (mId === bodyDbId || mDbId === bodyDbId || mName === bodyDbId)) ||
          (targetDigits && targetDigits.length >= 2 && mDigits === targetDigits);

        if (isMatch) {
          const rawTemp = body.live_temp ?? body.liveTemp ?? m.live_temp ?? '28';
          const cleanTempNum = String(rawTemp).replace(/[^0-9.-]/g, '') || '28';

          const rawHum = body.live_humidity ?? body.liveHumidity ?? m.live_humidity ?? '50';
          const cleanHumNum = String(rawHum).replace(/[^0-9.-]/g, '') || '50';

          const incomingWater = body.live_water ?? body.liveWater ?? m.live_water ?? 'Normal';
          const isWaterLow = String(incomingWater).toLowerCase().includes('low') || parseInt(incomingWater) <= 25;
          const cleanWaterState = isWaterLow ? 'Low' : 'Normal';
          const cleanWaterTrigger = body.waterLevelTrigger === 'Disabled' ? 'Disabled' : (body.waterLevelTrigger || m.waterLevelTrigger || 'Low');

          const rawOdour = body.live_odour ?? body.liveOdour ?? m.live_odour ?? '30';
          const cleanOdourNum = String(rawOdour).replace(/[^0-9.-]/g, '') || '30';

          const rawNh3 = body.live_nh3 ?? body.liveNh3 ?? m.live_nh3 ?? String(Math.round(parseFloat(cleanOdourNum) * 0.55));
          const cleanNh3Num = String(rawNh3).replace(/[^0-9.-]/g, '') || '17';

          const rawH2s = body.live_h2s ?? body.liveH2s ?? m.live_h2s ?? String(Math.round(parseFloat(cleanOdourNum) * 0.35));
          const cleanH2sNum = String(rawH2s).replace(/[^0-9.-]/g, '') || '11';

          return {
            ...m,
            ...body,
            id: m.id || m.db_id || body.id || body.name,
            name: body.name || body.id || m.name,
            tempLimitLow: String(body.tempLimitLow ?? m.tempLimitLow ?? '20'),
            tempLimitMedium: String(body.tempLimitMedium ?? m.tempLimitMedium ?? '30'),
            tempLimitDanger: String(body.tempLimitDanger ?? m.tempLimitDanger ?? '41'),
            humidityLimitLow: String(body.humidityLimitLow ?? m.humidityLimitLow ?? '35'),
            humidityLimitMedium: String(body.humidityLimitMedium ?? m.humidityLimitMedium ?? '70'),
            humidityLimitDanger: String(body.humidityLimitDanger ?? m.humidityLimitDanger ?? '76'),
            odourLimitLow: String(body.odourLimitLow ?? m.odourLimitLow ?? '40'),
            odourLimitMedium: String(body.odourLimitMedium ?? m.odourLimitMedium ?? '60'),
            odourLimitDanger: String(body.odourLimitDanger ?? m.odourLimitDanger ?? '71'),
            nh3LimitLow: String(body.nh3LimitLow ?? m.nh3LimitLow ?? '25'),
            nh3LimitDanger: String(body.nh3LimitDanger ?? m.nh3LimitDanger ?? '50'),
            h2sLimitLow: String(body.h2sLimitLow ?? m.h2sLimitLow ?? '10'),
            h2sLimitDanger: String(body.h2sLimitDanger ?? m.h2sLimitDanger ?? '20'),
            waterLevelTrigger: cleanWaterTrigger,
            waterLimitLow: cleanWaterTrigger,
            live_temp: cleanTempNum,
            liveTemp: `${cleanTempNum}°C`,
            live_humidity: cleanHumNum,
            liveHumidity: `${cleanHumNum}%`,
            live_water: cleanWaterState,
            liveWater: cleanWaterState,
            live_odour: cleanOdourNum,
            liveOdour: `${cleanOdourNum} PPM`,
            live_nh3: cleanNh3Num,
            liveNh3: `${cleanNh3Num} PPM`,
            live_h2s: cleanH2sNum,
            liveH2s: `${cleanH2sNum} PPM`,
            install_date: installDate || m.install_date || m.installDate,
            installDate: installDate || m.installDate || m.install_date,
            created_at: installDate || m.created_at
          };
        }
        return m;
      });
      setStored('machines_data', updated);
      setStored('alerts_data', generateAlertsFromMachines(updated, getStored('alerts_data', [])));
      const item = updated.find(m => {
        const mId = String(m.id || '').toLowerCase().trim();
        const mDbId = String(m.db_id || '').toLowerCase().trim();
        const mName = String(m.name || '').toLowerCase().trim();
        const mDigits = (mName.replace(/\D/g, '') || mId.replace(/\D/g, '')).trim();
        return (targetId && (mId === targetId || mDbId === targetId || mName === targetId)) ||
          (bodyId && (mId === bodyId || mDbId === bodyId || mName === bodyId)) ||
          (bodyName && (mId === bodyName || mDbId === bodyName || mName === bodyName)) ||
          (bodyDbId && (mId === bodyDbId || mDbId === bodyDbId || mName === bodyDbId)) ||
          (targetDigits && targetDigits.length >= 2 && mDigits === targetDigits);
      });
      notifyDataUpdated('machines', 'put', item);
      return { success: true, data: item };
    }
    if (method === 'delete') {
      const cleanId = String(id || '').toLowerCase().trim();
      const bodyName = String(body?.name || '').toLowerCase().trim();
      const bodyId = String(body?.id || '').toLowerCase().trim();
      const bodyDbId = String(body?.db_id || '').toLowerCase().trim();
      const targetDigits = (cleanId.replace(/\D/g, '') || bodyName.replace(/\D/g, '') || bodyId.replace(/\D/g, '')).trim();

      const updated = list.filter(m => {
        const mId = String(m.id || '').toLowerCase().trim();
        const mDbId = String(m.db_id || '').toLowerCase().trim();
        const mName = String(m.name || '').toLowerCase().trim();
        const mDigits = (mName.replace(/\D/g, '') || mId.replace(/\D/g, '')).trim();

        if (cleanId && (mId === cleanId || mDbId === cleanId || mName === cleanId)) return false;
        if (bodyId && (mId === bodyId || mDbId === bodyId || mName === bodyId)) return false;
        if (bodyName && (mId === bodyName || mDbId === bodyName || mName === bodyName)) return false;
        if (bodyDbId && (mId === bodyDbId || mDbId === bodyDbId || mName === bodyDbId)) return false;
        if (targetDigits && targetDigits.length >= 2 && mDigits === targetDigits) return false;

        return true;
      });

      setStored('machines_data', updated);

      const currentAlerts = getStored('alerts_data', []);
      const cleanAlerts = currentAlerts.filter(a => {
        const aMid = String(a.machine_id || a.machineName || '').toLowerCase().trim();
        if (cleanId && aMid === cleanId) return false;
        if (bodyName && aMid === bodyName) return false;
        if (bodyId && aMid === bodyId) return false;
        if (targetDigits && targetDigits.length >= 2 && aMid.includes(targetDigits)) return false;
        return true;
      });
      setStored('alerts_data', generateAlertsFromMachines(updated, cleanAlerts));

      notifyDataUpdated('machines', 'delete', { id, ...body });
      return { success: true, message: 'Machine deleted successfully' };
    }
  }

  // Alerts
  if (resource === 'alerts') {
    let rawMachines = getStored('machines_data', defaultMachines);
    rawMachines = sanitizeMachinesList(rawMachines);
    setStored('machines_data', rawMachines);
    const stored = getStored('alerts_data', []);

    // Always dynamically evaluate machine alerts based on live telemetry & configured thresholds
    let list = generateAlertsFromMachines(rawMachines, stored);
    setStored('alerts_data', list);

    if (method === 'get') {
      return { success: true, data: list };
    }
    if (method === 'post') {
      const nextId = list.length > 0 ? Math.max(...list.map(a => Number(a.id) || 0)) + 1 : 1;
      const newA = {
        id: nextId,
        machine_id: body.machine_id,
        machineName: body.machineName || `Machine ${body.machine_id}`,
        severity: body.severity || 'Danger',
        message: body.message || 'System alert triggered',
        timestamp: new Date().toISOString(),
        status: 'Open',
        isCustom: true,
        ...body
      };
      const updated = [newA, ...list];
      setStored('alerts_data', updated);
      notifyDataUpdated('alerts', 'post', newA);
      return { success: true, data: newA, message: 'Alert created successfully' };
    }
    if (method === 'put') {
      const updated = list.map(a => String(a.id) === String(id) ? { ...a, ...body } : a);
      setStored('alerts_data', updated);
      const item = updated.find(a => String(a.id) === String(id));
      notifyDataUpdated('alerts', 'put', item);
      return { success: true, data: item, message: 'Alert updated successfully' };
    }
    if (method === 'delete') {
      const updated = list.filter(a => String(a.id) !== String(id));
      setStored('alerts_data', updated);
      notifyDataUpdated('alerts', 'delete', { id });
      return { success: true, message: 'Alert deleted successfully' };
    }
  }

  // Analytics History
  if (resource === 'analytics') {
    const rawMachines = getStored('machines_data', defaultMachines);
    const queryString = url.includes('?') ? url.split('?')[1] : '';
    const params = new URLSearchParams(queryString);
    const filterMachine = params.get('machineId') || body.machineId || 'All';
    const filterRo = params.get('roId') || body.roId || 'All';
    const startDateParam = params.get('startDate') || body.startDate;
    const endDateParam = params.get('endDate') || body.endDate;

    let targetMachines = rawMachines;
    if (filterRo && filterRo !== 'All') {
      const roMatches = rawMachines.filter(m => String(m.ro_id || m.roId) === String(filterRo));
      if (roMatches.length > 0) targetMachines = roMatches;
    }
    if (filterMachine && filterMachine !== 'All') {
      const matched = targetMachines.filter(m =>
        String(m.name) === String(filterMachine) ||
        String(m.id) === String(filterMachine) ||
        String(m.db_id) === String(filterMachine)
      );
      if (matched.length > 0) {
        targetMachines = matched;
      }
    }

    const targetDates = [];
    if (startDateParam && endDateParam) {
      const minDateStr = startDateParam <= endDateParam ? startDateParam : endDateParam;
      const maxDateStr = startDateParam <= endDateParam ? endDateParam : startDateParam;
      const [startY, startM, startD] = minDateStr.split('-').map(Number);
      const [endY, endM, endD] = maxDateStr.split('-').map(Number);
      const startObj = new Date(startY, startM - 1, startD);
      const endObj = new Date(endY, endM - 1, endD);
      const diffDays = Math.min(Math.max(Math.round((endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24)), 0), 30);

      for (let i = 0; i <= diffDays; i++) {
        const curDate = new Date(startY, startM - 1, startD + i);
        targetDates.push({
          dateLabel: curDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
          idx: i
        });
      }
    } else {
      const numDays = 7;
      const today = new Date();
      for (let i = numDays - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        targetDates.push({
          dateLabel: d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
          idx: numDays - 1 - i
        });
      }
    }

    const history = [];
    targetDates.forEach(({ dateLabel, idx }) => {
      const isToday = idx === (targetDates.length - 1);
      const dayOffset = (targetDates.length - 1) - idx;
      
      let dayTemp = 0;
      let dayHumidity = 0;
      let dayOdour = 0;
      let dayWaterAlerts = 0;
      let dayVisits = 0;

      targetMachines.forEach((m, mIdx) => {
        const baseT = Number(String(m.live_temp ?? m.liveTemp ?? 28).replace(/[^0-9.-]/g, '')) || 28;
        const tempVar = isToday ? 0 : (dayOffset % 2 === 1 ? 0 : (dayOffset % 4 === 0 ? 1 : -1));
        dayTemp += Math.max(15, Math.min(45, baseT + tempVar));

        const baseH = Number(String(m.live_humidity ?? m.liveHumidity ?? 50).replace(/[^0-9.-]/g, '')) || 50;
        const humVar = isToday ? 0 : (dayOffset % 2 === 1 ? -1 : (dayOffset % 4 === 0 ? 1 : 0));
        dayHumidity += Math.max(30, Math.min(85, baseH + humVar));

        const rawO = String(m.live_odour ?? m.liveOdour ?? '30');
        const numO = Number(rawO.replace(/[^0-9.-]/g, ''));
        let baseO = 30;
        if (!isNaN(numO) && numO > 0) {
          baseO = numO;
        } else {
          const cleanO = rawO.trim().toLowerCase();
          baseO = (cleanO === 'danger' || cleanO.includes('danger')) ? 85 : ((cleanO === 'medium' || cleanO.includes('moderate')) ? 55 : (cleanO.includes('low') ? 35 : 25));
        }
        const odourVar = isToday ? 0 : (dayOffset % 3 === 1 ? 1 : -1);
        dayOdour += Math.max(10, Math.min(100, baseO + odourVar));

        const isLowWater = String(m.live_water ?? m.liveWater ?? '').toLowerCase().includes('low');
        if (isLowWater && (isToday || dayOffset % 2 === 0)) {
          dayWaterAlerts += 1;
        }

        const baseV = Number(m.visits) || Number(m.usage) || 0;
        const dayVariance = [0, -3, -5, -4, -7, +8, +5];
        const visitVar = dayVariance[dayOffset % dayVariance.length];
        dayVisits += baseV > 0 ? Math.max(0, baseV + visitVar) : 0;
      });

      const count = targetMachines.length || 1;
      history.push({
        date: dateLabel,
        avg_temp: Math.round(dayTemp / count),
        avg_humidity: Math.round(dayHumidity / count),
        avg_odour: Math.round(dayOdour / count),
        total_water_alerts: dayWaterAlerts,
        total_visits: filterMachine === 'All' ? dayVisits : Math.round(dayVisits / count)
      });
    });

    return { success: true, data: history };
  }

  return { success: true, data: [] };
};
