import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AppContext = createContext(null);

// SLA: 2 days after printing to issue to karigar
const SLA_DAYS = 2;

// LocalStorage keys
const STORAGE_KEYS = {
  POS: 'po_manager_pos',
  PRINT_LOG: 'po_manager_print_log',
  ISSUE_LOG: 'po_manager_issue_log',
  COMPLETED_LOG: 'po_manager_completed_log',
  REPRINT_LOG: 'po_manager_reprint_log',
  ACTIVITY_LOG: 'po_manager_activity_log',
  HANDOVER_RECEIPTS: 'po_manager_handover_receipts',
};

// Load data from localStorage
const loadFromStorage = (key, defaultValue = []) => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error loading from storage:', e);
  }
  return defaultValue;
};

// Save data to localStorage
const saveToStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving to storage:', e);
  }
};

export function AppProvider({ children }) {
  // All data starts EMPTY - no demo/sample data
  const [pos, setPOs] = useState(() => loadFromStorage(STORAGE_KEYS.POS, []));
  const [printLog, setPrintLog] = useState(() => loadFromStorage(STORAGE_KEYS.PRINT_LOG, []));
  const [issueLog, setIssueLog] = useState(() => loadFromStorage(STORAGE_KEYS.ISSUE_LOG, []));
  const [completedLog, setCompletedLog] = useState(() => loadFromStorage(STORAGE_KEYS.COMPLETED_LOG, []));
  const [reprintLog, setReprintLog] = useState(() => loadFromStorage(STORAGE_KEYS.REPRINT_LOG, []));
  const [activityLog, setActivityLog] = useState(() => loadFromStorage(STORAGE_KEYS.ACTIVITY_LOG, []));
  const [handoverReceipts, setHandoverReceipts] = useState(() => loadFromStorage(STORAGE_KEYS.HANDOVER_RECEIPTS, []));
  const [notifications, setNotifications] = useState([]);

  // Save to localStorage whenever data changes
  useEffect(() => { saveToStorage(STORAGE_KEYS.POS, pos); }, [pos]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.PRINT_LOG, printLog); }, [printLog]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.ISSUE_LOG, issueLog); }, [issueLog]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.COMPLETED_LOG, completedLog); }, [completedLog]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.REPRINT_LOG, reprintLog); }, [reprintLog]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.ACTIVITY_LOG, activityLog); }, [activityLog]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.HANDOVER_RECEIPTS, handoverReceipts); }, [handoverReceipts]);

  const addNotification = useCallback((message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type, time: new Date() }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const importPOs = useCallback((newPOs, user) => {
    const existingKeys = new Set(pos.map(p => `${p.ordNo}-${p.styleNo}-${p.eoNo}`));
    const duplicates = [];
    const imported = [];

    newPOs.forEach(po => {
      const key = `${po.ordNo}-${po.styleNo}-${po.eoNo}`;
      if (existingKeys.has(key)) {
        duplicates.push(po);
      } else {
        imported.push({
          ...po,
          id: `PO-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          poStatus: 'PENDING',
          printedAt: null,
          printedBy: null,
          slaDueDate: null,
          issuedAt: null,
          issuedBy: null,
          completedAt: null,
          // Karigar auto-filled from Factory name
          karigar: po.factory || '',
          remarks: '',
          priority: 'NORMAL',
          uploadedAt: new Date().toISOString(),
          uploadedBy: user?.name || 'Unknown',
        });
        existingKeys.add(key);
      }
    });

    if (imported.length > 0) {
      setPOs(prev => [...prev, ...imported]);
      logActivity('IMPORT', `Imported ${imported.length} POs`, user);
    }

    return { imported: imported.length, duplicates: duplicates.length, duplicateList: duplicates };
  }, [pos]);

  const printPOs = useCallback((poIds, user) => {
    const now = new Date();
    const nowISO = now.toISOString();
    // SLA: 2 days from print date
    const slaDate = new Date(now.getTime() + SLA_DAYS * 24 * 60 * 60 * 1000).toISOString();

    setPOs(prev =>
      prev.map(po =>
        poIds.includes(po.id) && po.poStatus === 'PENDING' && po.approvalStatus === 'Approved'
          ? { ...po, poStatus: 'PRINTED', printedAt: nowISO, printedBy: user?.name, slaDueDate: slaDate }
          : po
      )
    );

    const logEntries = poIds.map(id => ({
      poId: id,
      printedAt: nowISO,
      printedBy: user?.name,
      slaDueDate: slaDate,
      device: navigator.userAgent,
    }));
    setPrintLog(prev => [...prev, ...logEntries]);
    logActivity('PRINT', `Printed ${poIds.length} POs (SLA: ${SLA_DAYS} days to issue)`, user);
  }, []);

  const issuePOs = useCallback((poIds, karigarName, signature, user) => {
    const now = new Date().toISOString();
    const issuedPOData = pos.filter(p => poIds.includes(p.id));

    setPOs(prev =>
      prev.map(po =>
        poIds.includes(po.id) && po.poStatus === 'PRINTED'
          ? { ...po, poStatus: 'ISSUED', issuedAt: now, issuedBy: user?.name }
          : po
      )
    );

    // Create handover receipt with full PO details and signature
    const receipt = {
      id: `HR-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      karigar: karigarName,
      signature,
      issuedAt: now,
      issuedBy: user?.name,
      poCount: poIds.length,
      totalQty: issuedPOData.reduce((s, p) => s + p.prodQty, 0),
      pos: issuedPOData.map(po => ({
        id: po.id,
        ordNo: po.ordNo,
        styleNo: po.styleNo,
        eoNo: po.eoNo,
        prodQty: po.prodQty,
        buyerName: po.buyerName,
        ordDt: po.ordDt,
        factory: po.factory,
      })),
    };

    setHandoverReceipts(prev => [receipt, ...prev]);

    const logEntry = {
      poIds,
      karigar: karigarName,
      signature,
      issuedAt: now,
      issuedBy: user?.name,
      poCount: poIds.length,
      totalQty: issuedPOData.reduce((s, p) => s + p.prodQty, 0),
    };
    setIssueLog(prev => [...prev, logEntry]);
    logActivity('ISSUE', `Issued ${poIds.length} POs to ${karigarName}`, user);

    return receipt;
  }, [pos]);

  const completePOs = useCallback((poIds, remarks, user) => {
    const now = new Date().toISOString();
    setPOs(prev =>
      prev.map(po =>
        poIds.includes(po.id) && po.poStatus === 'ISSUED'
          ? { ...po, poStatus: 'COMPLETED', completedAt: now, remarks }
          : po
      )
    );

    const logEntry = {
      poIds,
      completedAt: now,
      completedBy: user?.name,
      remarks,
    };
    setCompletedLog(prev => [...prev, logEntry]);
    logActivity('COMPLETE', `Completed ${poIds.length} POs`, user);
  }, []);

  const requestReprint = useCallback((poId, reason, user) => {
    const entry = {
      poId,
      reason,
      requestedBy: user?.name,
      requestedAt: new Date().toISOString(),
      approved: user?.role === 'Admin',
    };
    setReprintLog(prev => [...prev, entry]);

    if (user?.role === 'Admin') {
      setPOs(prev =>
        prev.map(po =>
          po.id === poId ? { ...po, poStatus: 'PENDING', printedAt: null, printedBy: null, slaDueDate: null } : po
        )
      );
    }
    logActivity('REPRINT_REQUEST', `Reprint requested for ${poId}: ${reason}`, user);
    return entry;
  }, []);

  const logActivity = useCallback((action, details, user) => {
    setActivityLog(prev => [
      {
        action,
        details,
        user: user?.name || 'System',
        role: user?.role || 'System',
        timestamp: new Date().toISOString(),
        device: navigator.userAgent,
      },
      ...prev,
    ]);
  }, []);

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
      // SLA breached: printed but not issued within 2 days
      slaBreached: pos.filter(p => {
        if (p.poStatus === 'PRINTED' && p.slaDueDate) {
          return now > new Date(p.slaDueDate).getTime();
        }
        return false;
      }).length,
      delayed: pos.filter(p => {
        if (p.poStatus === 'PENDING' && p.approvalStatus === 'Approved') {
          const days = (now - new Date(p.uploadedAt).getTime()) / (1000 * 60 * 60 * 24);
          return days > 2;
        }
        return false;
      }).length,
    };
  }, [pos, reprintLog]);

  // Clear all data (admin only)
  const clearAllData = useCallback(() => {
    setPOs([]);
    setPrintLog([]);
    setIssueLog([]);
    setCompletedLog([]);
    setReprintLog([]);
    setActivityLog([]);
    setHandoverReceipts([]);
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  }, []);

  return (
    <AppContext.Provider
      value={{
        pos, setPOs, printLog, issueLog, completedLog, reprintLog, activityLog,
        handoverReceipts, notifications, addNotification, importPOs, printPOs,
        issuePOs, completePOs, requestReprint, logActivity, getStats,
        clearAllData, SLA_DAYS,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
