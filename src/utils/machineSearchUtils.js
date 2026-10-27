/**
 * Machine Search Utility
 * Supports exact, prefix, suffix, and last-3-digits matching for machine IDs.
 * Examples:
 *  - Machine 'SBP2T1202' will match '202', '1202', 'SBP2T202', 'SBP2T1202', 'sbp202'
 *  - Machine 'SBP2T1101' will match '101', '1101', 'SBP2T101', 'SBP2T1101'
 *  - Machine 'SBP2T502'  will match '502', 'SBP2T502'
 */
export const matchesMachineQuery = (machineStr, term) => {
  if (!machineStr || !term) return false;
  const m = String(machineStr).toLowerCase().trim();
  const q = String(term).toLowerCase().trim();

  // 1. Direct equality or substring inclusion
  if (m === q || m.includes(q)) return true;

  // 2. Extract machine numeric suffix (strip 'sbp', '2t', etc.)
  // e.g. 'sbp2t1202' -> cleanMSuffix = '1202'
  const cleanMSuffix = m.replace(/^sbp\s*(?:2t)?/i, '').replace(/[^a-z0-9]/g, '');
  const cleanQSuffix = q.replace(/^sbp\s*(?:2t)?/i, '').replace(/[^a-z0-9]/g, '');

  const mDigits = cleanMSuffix.replace(/\D/g, '') || m.replace(/\D/g, '');
  const last3 = mDigits.length >= 3 ? mDigits.slice(-3) : mDigits;

  const qDigits = q.replace(/\D/g, '');

  // 3. Last 3 digits or any numeric suffix match (e.g. typing '202' matches 'SBP2T1202')
  if (qDigits && mDigits) {
    if (qDigits === last3 || mDigits.endsWith(qDigits) || m.endsWith(qDigits)) {
      if (!/[a-z]/.test(q)) return true;
    }
  }

  // 4. Prefix + last 3 digits (e.g. 'sbp2t202' or 'sbp202' matching 'sbp2t1202')
  if (cleanQSuffix && cleanMSuffix) {
    if (cleanMSuffix.endsWith(cleanQSuffix) || cleanMSuffix.includes(cleanQSuffix)) {
      return true;
    }
    if (last3 && cleanQSuffix.endsWith(last3)) {
      return true;
    }
  }

  // 5. Query contains last 3 digits with compatible machine prefix
  if (last3 && last3.length === 3 && q.includes(last3)) {
    const qAlpha = q.replace(/[^a-z]/g, '');
    const mAlpha = m.replace(/[^a-z]/g, '');
    if (!qAlpha || mAlpha.includes(qAlpha) || qAlpha.includes(mAlpha)) {
      return true;
    }
  }

  return false;
};
