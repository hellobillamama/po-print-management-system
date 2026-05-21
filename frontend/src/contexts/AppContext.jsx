import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import sheetsService from '../services/googleSheets';

const AppContext = createContext(null);
const SLA_DAYS = 2;

const isGoogleSheetsEnabled = () => {
  const url = import.meta.env.VITE_APPS_SCRIPT_URL;
  return url && url !== '' && !url.includes('YOUR_DEPLOYMENT_ID');
};

const STORAGE_KEYS = {
  POS: 'po_manager_pos',
  PRINT_LOG: 'po_manager_print_log',
  ISSUE_LOG: 'po_manager_issue_log',
  COMPLETED_LOG: 'po_manager_completed_log',
  REPRINT_LOG: 'po_manager_reprint_log',
  ACTIVITY_LOG: 'po_manager_activity_log',
  HANDOVER_RECEIPTS: 'po_manager_handover_receipts',
};

const loadFromStorage = (key, defaultValue = []) => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch (e) { console.error('Storage load error:', e); }
  return defaultValue;
};

const saveToStorage = (key, data) => {
  try { localStorage.setItem(key, JSON.stringify(data)); }
  catch (e) { console.error('Storage save error:', e); }
};


export function AppProvider({ children }) {
  const [pos, setPOs] = useState(() => loadFromStorage(STORAGE_KEYS.POS, []));
  const [printLog, setPrintLog] = useState(() => loadFromStorage(STORAGE_KEYS.PRINT_LOG, []));
  const [issueLog, setIssueLog] = useState(() => loadFromStorage(STORAGE_KEYS.ISSUE_LOG, []));
  const [completedLog, setCompletedLog] = useState(() => loadFromStorage(STORAGE_KEYS.COMPLETED_LOG, []));
  const [reprintLog, setReprintLog] = useState(() => loadFromStorage(STORAGE_KEYS.REPRINT_LOG, []));
  const [activityLog, setActivityLog] = useState(() => loadFromStorage(STORAGE_KEYS.ACTIVITY_LOG, []));
  const [handoverReceipts, setHandoverReceipts] = useState(() => loadFromStorage(STORAGE_KEYS.HANDOVER_RECEIPTS, []));
  const [notifications, setNotifications] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(isGoogleSheetsEnabled() ? 'connecting' : 'local');
  const initialLoadDone = useRef(false);

  // Auto-save to localStorage
  useEffect(() => { saveToStorage(STORAGE_KEYS.POS, pos); }, [pos]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.PRINT_LOG, printLog); }, [printLog]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.ISSUE_LOG, issueLog); }, [issueLog]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.COMPLETED_LOG, completedLog); }, [completedLog]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.REPRINT_LOG, reprintLog); }, [reprintLog]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.ACTIVITY_LOG, activityLog); }, [activityLog]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.HANDOVER_RECEIPTS, handoverReceipts); }, [handoverReceipts]);


  // Load from Google Sheets on first mount
  useEffect(() => {
    if (!isGoogleSheetsEnabled() || initialLoadDone.current) return;
    initialLoadDone.current = true;
    const loadFromSheets = async () => {
      try {
        setSyncing(true);
        const result = await sheetsService.getPOs();
        if (result.pos && result.pos.length > 0) {
          const sheetPOs = result.pos.map(row => ({
            id: row['ID'] || row.id || `PO-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
            ordNo: String(row['Ord No'] || row.ordNo || ''),
            ordType: row['Ord Type'] || row.ordType || '',
            factory: row['Factory'] || row.factory || '',
            ordDt: row['Ord Dt'] || row.ordDt || '',
            ourRef: String(row['Our Ref'] || row.ourRef || ''),
            eoNo: row['EO No'] || row.eoNo || '',
            styleNo: row['Style No'] || row.styleNo || '',
            prodQty: parseInt(row['Prod Qty'] || row.prodQty) || 0,
            approvalStatus: row['Approval Status'] || row.approvalStatus || '',
            poStatus: row['PO Status'] || row.poStatus || 'PENDING',
            buyerName: row['Buyer Name'] || row.buyerName || '',
            karigar: row['Karigar'] || row.karigar || row['Factory'] || row.factory || '',
            printedAt: row['Printed At'] || row.printedAt || null,
            printedBy: row['Printed By'] || row.printedBy || null,
            slaDueDate: row['SLA Due'] || row.slaDueDate || null,
            issuedAt: row['Issued At'] || row.issuedAt || null,
            issuedBy: row['Issued By'] || row.issuedBy || null,
            completedAt: row['Completed At'] || row.completedAt || null,
            remarks: row['Remarks'] || row.remarks || '',
            priority: row['Priority'] || row.priority || 'NORMAL',
            uploadedAt: row['Uploaded At'] || row.uploadedAt || '',
            uploadedBy: row['Uploaded By'] || row.uploadedBy || '',
          }));
          setPOs(sheetPOs);
        }
        setConnectionStatus('connected');
        setLastSyncTime(new Date());
      } catch (error) {
        console.error('Failed to load from Google Sheets:', error);
        setConnectionStatus('error');
      } finally {
        setSyncing(false);
      }
    };
    loadFromSheets();
  }, []);

  const syncToSheets = useCallback(async (action, data) => {
    if (!isGoogleSheetsEnabled()) return;
    try {
      await sheetsService.request(action, data);
      setLastSyncTime(new Date());
      setConnectionStatus('connected');
    } catch (error) {
      console.error(`Sync error (${action}):`, error);
      setConnectionStatus('error');
    }
  }, []);

  const addNotification = useCallback((message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type, time: new Date() }]);
    setTimeout(() => { setNotifications(prev => prev.filter(n => n.id !== id)); }, 5000);
  }, []);


  const logActivity = useCallback((action, details, user) => {
    const entry = { action, details, user: user?.name || 'System', role: user?.role || 'System', timestamp: new Date().toISOString(), device: navigator.userAgent };
    setActivityLog(prev => [entry, ...prev]);
    if (isGoogleSheetsEnabled()) {
      sheetsService.logActivity({ action: entry.action, details: entry.details, user: entry.user, role: entry.role, device: entry.device }).catch(() => {});
    }
  }, []);

  const importPOs = useCallback((newPOs, user) => {
    const existingKeys = new Set(pos.map(p => `${p.ordNo}-${p.styleNo}-${p.eoNo}`));
    const duplicates = [];
    const imported = [];
    newPOs.forEach(po => {
      const key = `${po.ordNo}-${po.styleNo}-${po.eoNo}`;
      if (existingKeys.has(key)) { duplicates.push(po); }
      else {
        const newPO = { ...po, id: `PO-${Date.now()}-${Math.random().toString(36).substr(2,5)}`, poStatus: 'PENDING', printedAt: null, printedBy: null, slaDueDate: null, issuedAt: null, issuedBy: null, completedAt: null, karigar: po.factory || '', remarks: '', priority: 'NORMAL', uploadedAt: new Date().toISOString(), uploadedBy: user?.name || 'Unknown' };
        imported.push(newPO);
        existingKeys.add(key);
      }
    });
    if (imported.length > 0) {
      setPOs(prev => [...prev, ...imported]);
      logActivity('IMPORT', `Imported ${imported.length} POs`, user);
      syncToSheets('addPOs', { poData: imported });
    }
    return { imported: imported.length, duplicates: duplicates.length, duplicateList: duplicates };
  }, [pos, syncToSheets, logActivity]);

  const printPOs = useCallback((poIds, user) => {
    const now = new Date();
    const nowISO = now.toISOString();
    const slaDate = new Date(now.getTime() + SLA_DAYS * 24 * 60 * 60 * 1000).toISOString();
    setPOs(prev => prev.map(po => poIds.includes(po.id) && po.poStatus === 'PENDING' && po.approvalStatus === 'Approved' ? { ...po, poStatus: 'PRINTED', printedAt: nowISO, printedBy: user?.name, slaDueDate: slaDate } : po));
    const logEntries = poIds.map(id => ({ poId: id, printedAt: nowISO, printedBy: user?.name, slaDueDate: slaDate, device: navigator.userAgent }));
    setPrintLog(prev => [...prev, ...logEntries]);
    logActivity('PRINT', `Printed ${poIds.length} POs (SLA: ${SLA_DAYS} days)`, user);
    syncToSheets('updatePOStatus', { poIds, status: 'PRINTED', userData: { name: user?.name } });
    syncToSheets('logPrint', { printData: logEntries });
  }, [syncToSheets, logActivity]);


  const issuePOs = useCallback((poIds, karigarName, signature, user) => {
    const now = new Date().toISOString();
    const issuedPOData = pos.filter(p => poIds.includes(p.id));
    setPOs(prev => prev.map(po => poIds.includes(po.id) && po.poStatus === 'PRINTED' ? { ...po, poStatus: 'ISSUED', issuedAt: now, issuedBy: user?.name } : po));
    const receipt = { id: `HR-${Date.now()}-${Math.random().toString(36).substr(2,5)}`, karigar: karigarName, signature, issuedAt: now, issuedBy: user?.name, poCount: poIds.length, totalQty: issuedPOData.reduce((s, p) => s + p.prodQty, 0), pos: issuedPOData.map(po => ({ id: po.id, ordNo: po.ordNo, styleNo: po.styleNo, eoNo: po.eoNo, prodQty: po.prodQty, buyerName: po.buyerName, ordDt: po.ordDt, factory: po.factory })) };
    setHandoverReceipts(prev => [receipt, ...prev]);
    setIssueLog(prev => [...prev, { poIds, karigar: karigarName, issuedAt: now, issuedBy: user?.name, poCount: poIds.length, totalQty: issuedPOData.reduce((s, p) => s + p.prodQty, 0) }]);
    logActivity('ISSUE', `Issued ${poIds.length} POs to ${karigarName}`, user);
    syncToSheets('issueToKarigar', { issueData: { poIds, karigar: karigarName, signature: signature ? '(captured)' : '', issuedBy: user?.name, totalQty: issuedPOData.reduce((s, p) => s + p.prodQty, 0) } });
    return receipt;
  }, [pos, syncToSheets, logActivity]);

  const completePOs = useCallback((poIds, remarks, user) => {
    const now = new Date().toISOString();
    setPOs(prev => prev.map(po => poIds.includes(po.id) && po.poStatus === 'ISSUED' ? { ...po, poStatus: 'COMPLETED', completedAt: now, remarks } : po));
    setCompletedLog(prev => [...prev, { poIds, completedAt: now, completedBy: user?.name, remarks }]);
    logActivity('COMPLETE', `Completed ${poIds.length} POs`, user);
    syncToSheets('markCompleted', { completionData: { poIds, completedBy: user?.name, remarks } });
  }, [syncToSheets, logActivity]);

  const requestReprint = useCallback((poId, reason, user) => {
    const entry = { poId, reason, requestedBy: user?.name, requestedAt: new Date().toISOString(), approved: user?.role === 'Admin' };
    setReprintLog(prev => [...prev, entry]);
    if (user?.role === 'Admin') {
      setPOs(prev => prev.map(po => po.id === poId ? { ...po, poStatus: 'PENDING', printedAt: null, printedBy: null, slaDueDate: null } : po));
    }
    logActivity('REPRINT_REQUEST', `Reprint requested for ${poId}: ${reason}`, user);
    syncToSheets('requestReprint', { poId, reason, userData: { name: user?.name, role: user?.role } });
    return entry;
  }, [syncToSheets, logActivity]);


  const getStats = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayPOs = pos.filter(p => p.uploadedAt?.startsWith(today));
    const now = Date.now();
    return {
      totalPOs: pos.length,
      todayUploaded: todayPOs.length,
      approved: pos.filter(p => p.approvalStatus === 'Approved').length,
      pendingPrint: pos.filter(p => p.poStatus === 'PENDING' && p.approvalStatus === 'Approved').length,
      printed: pos.filter(p => p.poStatus === 'PRINTED').length,
      issued: pos.filter(p => p.poStatus === 'ISSUED').length,
      completed: pos.filter(p => p.poStatus === 'COMPLETED').length,
      highPriority: pos.filter(p => p.priority === 'HIGH').length,
      reprintAttempts: reprintLog.length,
      slaBreached: pos.filter(p => p.poStatus === 'PRINTED' && p.slaDueDate && now > new Date(p.slaDueDate).getTime()).length,
      delayed: pos.filter(p => p.poStatus === 'PENDING' && p.approvalStatus === 'Approved' && (now - new Date(p.uploadedAt).getTime()) / (1000*60*60*24) > 2).length,
    };
  }, [pos, reprintLog]);

  const refreshFromSheets = useCallback(async () => {
    if (!isGoogleSheetsEnabled()) return;
    try {
      setSyncing(true);
      const result = await sheetsService.getPOs();
      if (result.pos && result.pos.length > 0) {
        const sheetPOs = result.pos.map(row => ({
          id: row['ID'] || row.id, ordNo: String(row['Ord No'] || row.ordNo || ''), ordType: row['Ord Type'] || row.ordType || '', factory: row['Factory'] || row.factory || '', ordDt: row['Ord Dt'] || row.ordDt || '', ourRef: String(row['Our Ref'] || row.ourRef || ''), eoNo: row['EO No'] || row.eoNo || '', styleNo: row['Style No'] || row.styleNo || '', prodQty: parseInt(row['Prod Qty'] || row.prodQty) || 0, approvalStatus: row['Approval Status'] || row.approvalStatus || '', poStatus: row['PO Status'] || row.poStatus || 'PENDING', buyerName: row['Buyer Name'] || row.buyerName || '', karigar: row['Karigar'] || row.karigar || row['Factory'] || row.factory || '', printedAt: row['Printed At'] || row.printedAt || null, printedBy: row['Printed By'] || row.printedBy || null, slaDueDate: row['SLA Due'] || row.slaDueDate || null, issuedAt: row['Issued At'] || row.issuedAt || null, issuedBy: row['Issued By'] || row.issuedBy || null, completedAt: row['Completed At'] || row.completedAt || null, remarks: row['Remarks'] || row.remarks || '', priority: row['Priority'] || row.priority || 'NORMAL', uploadedAt: row['Uploaded At'] || row.uploadedAt || '', uploadedBy: row['Uploaded By'] || row.uploadedBy || '',
        }));
        setPOs(sheetPOs);
      }
      setConnectionStatus('connected');
      setLastSyncTime(new Date());
    } catch (error) { console.error('Refresh failed:', error); setConnectionStatus('error'); }
    finally { setSyncing(false); }
  }, []);

  const clearAllData = useCallback(() => {
    setPOs([]); setPrintLog([]); setIssueLog([]); setCompletedLog([]); setReprintLog([]); setActivityLog([]); setHandoverReceipts([]);
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  }, []);

  return (
    <AppContext.Provider value={{ pos, setPOs, printLog, issueLog, completedLog, reprintLog, activityLog, handoverReceipts, notifications, addNotification, importPOs, printPOs, issuePOs, completePOs, requestReprint, logActivity, getStats, clearAllData, refreshFromSheets, syncing, lastSyncTime, connectionStatus, SLA_DAYS }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
