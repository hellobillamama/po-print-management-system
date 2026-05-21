import { createContext, useContext, useState, useCallback } from 'react';

const AppContext = createContext(null);

// Initial demo data
const generateDemoPOs = () => {
  const buyers = ['Tanishq', 'Kalyan', 'Malabar', 'PC Jeweller', 'Senco Gold'];
  const karigars = ['Ramesh Kumar', 'Sunil Verma', 'Anil Shah', 'Vijay Patel', 'Deepak Soni'];
  const statuses = ['Approved', 'Not Approved', 'Pending'];
  const poStatuses = ['PENDING', 'PRINTED', 'ISSUED', 'COMPLETED'];
  const factories = ['INHOUSE KARIGAR', 'OUTSOURCE', 'MAIN FACTORY'];

  const pos = [];
  for (let i = 1; i <= 50; i++) {
    const approvalStatus = statuses[Math.floor(Math.random() * 3)];
    const isApproved = approvalStatus === 'Approved';
    const poStatus = isApproved
      ? poStatuses[Math.floor(Math.random() * 4)]
      : 'PENDING';

    pos.push({
      id: `PO-${10000 + i}`,
      ordNo: `${13900 + i}`,
      ordType: 'ZARI',
      factory: factories[Math.floor(Math.random() * 3)],
      ordDt: new Date(2025, 10, Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
      ourRef: `${11400 + i}`,
      eoNo: `PIDG250${30 + (i % 10)}`,
      styleNo: `1125PIDG250${30 + (i % 10)}BRCL${String(i).padStart(2, '0')}`,
      prodQty: Math.floor(Math.random() * 50) + 1,
      approvalStatus,
      poStatus,
      buyerName: buyers[Math.floor(Math.random() * 5)],
      karigar: isApproved && poStatus !== 'PENDING' ? karigars[Math.floor(Math.random() * 5)] : '',
      printedAt: poStatus !== 'PENDING' && isApproved ? new Date(2025, 10, 15).toISOString() : null,
      printedBy: poStatus !== 'PENDING' && isApproved ? 'Print Operator' : null,
      issuedAt: poStatus === 'ISSUED' || poStatus === 'COMPLETED' ? new Date(2025, 10, 16).toISOString() : null,
      issuedBy: poStatus === 'ISSUED' || poStatus === 'COMPLETED' ? 'Production Manager' : null,
      completedAt: poStatus === 'COMPLETED' ? new Date(2025, 10, 18).toISOString() : null,
      remarks: '',
      priority: Math.random() > 0.8 ? 'HIGH' : 'NORMAL',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'Admin User',
    });
  }
  return pos;
};

const initialPOs = generateDemoPOs();

export function AppProvider({ children }) {
  const [pos, setPOs] = useState(initialPOs);
  const [printLog, setPrintLog] = useState([]);
  const [issueLog, setIssueLog] = useState([]);
  const [completedLog, setCompletedLog] = useState([]);
  const [reprintLog, setReprintLog] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [karigars] = useState([
    'Ramesh Kumar', 'Sunil Verma', 'Anil Shah', 'Vijay Patel', 'Deepak Soni',
    'Mohan Lal', 'Ravi Sharma', 'Gopal Das', 'Kishan Patel', 'Bharat Singh'
  ]);
  const [notifications, setNotifications] = useState([]);

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
          poStatus: po.approvalStatus === 'Approved' ? 'PENDING' : 'PENDING',
          printedAt: null,
          printedBy: null,
          issuedAt: null,
          issuedBy: null,
          completedAt: null,
          karigar: '',
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
    const now = new Date().toISOString();
    setPOs(prev =>
      prev.map(po =>
        poIds.includes(po.id) && po.poStatus === 'PENDING' && po.approvalStatus === 'Approved'
          ? { ...po, poStatus: 'PRINTED', printedAt: now, printedBy: user?.name }
          : po
      )
    );

    const logEntries = poIds.map(id => ({
      poId: id,
      printedAt: now,
      printedBy: user?.name,
      device: navigator.userAgent,
    }));
    setPrintLog(prev => [...prev, ...logEntries]);
    logActivity('PRINT', `Printed ${poIds.length} POs`, user);
  }, []);

  const issuePOs = useCallback((poIds, karigarName, signature, user) => {
    const now = new Date().toISOString();
    setPOs(prev =>
      prev.map(po =>
        poIds.includes(po.id) && po.poStatus === 'PRINTED'
          ? { ...po, poStatus: 'ISSUED', karigar: karigarName, issuedAt: now, issuedBy: user?.name }
          : po
      )
    );

    const logEntry = {
      poIds,
      karigar: karigarName,
      signature,
      issuedAt: now,
      issuedBy: user?.name,
      poCount: poIds.length,
      totalQty: pos.filter(p => poIds.includes(p.id)).reduce((s, p) => s + p.prodQty, 0),
    };
    setIssueLog(prev => [...prev, logEntry]);
    logActivity('ISSUE', `Issued ${poIds.length} POs to ${karigarName}`, user);
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
          po.id === poId ? { ...po, poStatus: 'PENDING', printedAt: null, printedBy: null } : po
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
      delayed: pos.filter(p => {
        if (p.poStatus === 'PENDING' && p.approvalStatus === 'Approved') {
          const days = (Date.now() - new Date(p.uploadedAt).getTime()) / (1000 * 60 * 60 * 24);
          return days > 2;
        }
        return false;
      }).length,
    };
  }, [pos, reprintLog]);

  return (
    <AppContext.Provider
      value={{
        pos, setPOs, printLog, issueLog, completedLog, reprintLog, activityLog,
        karigars, notifications, addNotification, importPOs, printPOs,
        issuePOs, completePOs, requestReprint, logActivity, getStats,
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
