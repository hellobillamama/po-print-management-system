/**
 * PO Print Management System - Google Apps Script Backend
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet
 * 2. Open Extensions > Apps Script
 * 3. Copy this code into the script editor
 * 4. Run setupSheets() once to create all required sheets
 * 5. Deploy as Web App (Execute as: Me, Access: Anyone)
 * 6. Copy the deployment URL to your frontend .env file
 */

// Sheet names
const SHEETS = {
  PO_MASTER: 'PO_MASTER',
  PRINT_LOG: 'PRINT_LOG',
  ISSUE_LOG: 'ISSUE_LOG',
  COMPLETED_LOG: 'COMPLETED_LOG',
  USERS: 'USERS',
  DAILY_REPORT: 'DAILY_REPORT',
  REPRINT_LOG: 'REPRINT_LOG',
  ACTIVITY_LOG: 'ACTIVITY_LOG',
  KARIGARS: 'KARIGARS'
};

/**
 * Initial setup - Run this once to create all sheets
 */
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // PO_MASTER headers
  createSheetWithHeaders(ss, SHEETS.PO_MASTER, [
    'ID', 'Ord No', 'Ord Type', 'Factory', 'Ord Dt', 'Our Ref', 'EO No',
    'Style No', 'Prod Qty', 'Approval Status', 'PO Status', 'Buyer Name',
    'Karigar', 'Printed At', 'Printed By', 'Issued At', 'Issued By',
    'Completed At', 'Remarks', 'Priority', 'Uploaded At', 'Uploaded By'
  ]);
  
  // PRINT_LOG headers
  createSheetWithHeaders(ss, SHEETS.PRINT_LOG, [
    'PO ID', 'Ord No', 'Style No', 'Printed At', 'Printed By', 'Device Info'
  ]);
  
  // ISSUE_LOG headers
  createSheetWithHeaders(ss, SHEETS.ISSUE_LOG, [
    'Issue ID', 'PO IDs', 'Karigar', 'Signature URL', 'Issued At',
    'Issued By', 'PO Count', 'Total Qty'
  ]);
  
  // COMPLETED_LOG headers
  createSheetWithHeaders(ss, SHEETS.COMPLETED_LOG, [
    'PO IDs', 'Completed At', 'Completed By', 'Remarks'
  ]);
  
  // USERS headers
  createSheetWithHeaders(ss, SHEETS.USERS, [
    'Email', 'Name', 'Role', 'Created At', 'Last Login', 'Status'
  ]);
  
  // DAILY_REPORT headers
  createSheetWithHeaders(ss, SHEETS.DAILY_REPORT, [
    'Date', 'Total Uploaded', 'Approved', 'Pending', 'Printed',
    'Issued', 'Completed', 'Reprint Attempts'
  ]);
  
  // REPRINT_LOG headers
  createSheetWithHeaders(ss, SHEETS.REPRINT_LOG, [
    'PO ID', 'Reason', 'Requested By', 'Requested At', 'Approved', 'Approved By'
  ]);
  
  // ACTIVITY_LOG headers
  createSheetWithHeaders(ss, SHEETS.ACTIVITY_LOG, [
    'Timestamp', 'Action', 'Details', 'User', 'Role', 'Device Info'
  ]);
  
  // KARIGARS headers
  createSheetWithHeaders(ss, SHEETS.KARIGARS, [
    'Name', 'Contact', 'Specialty', 'Status', 'Added At'
  ]);
}

function createSheetWithHeaders(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  return sheet;
}

/**
 * Web App entry point - handles POST requests
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    let result;
    switch (action) {
      case 'getPOs':
        result = getPOs(data.filters);
        break;
      case 'addPOs':
        result = addPOs(data.poData);
        break;
      case 'updatePOStatus':
        result = updatePOStatus(data.poIds, data.status, data.userData);
        break;
      case 'checkDuplicates':
        result = checkDuplicates(data.poIdentifiers);
        break;
      case 'logPrint':
        result = logPrint(data.printData);
        break;
      case 'getPrintLog':
        result = getPrintLog(data.filters);
        break;
      case 'requestReprint':
        result = requestReprint(data.poId, data.reason, data.userData);
        break;
      case 'issueToKarigar':
        result = issueToKarigar(data.issueData);
        break;
      case 'getIssueLog':
        result = getIssueLog(data.filters);
        break;
      case 'markCompleted':
        result = markCompleted(data.completionData);
        break;
      case 'getCompletedLog':
        result = getCompletedLog(data.filters);
        break;
      case 'getDashboardStats':
        result = getDashboardStats();
        break;
      case 'getUsers':
        result = getUsers();
        break;
      case 'addUser':
        result = addUser(data.userData);
        break;
      case 'logActivity':
        result = logActivity(data.activityData);
        break;
      case 'getActivityLogs':
        result = getActivityLogs(data.filters);
        break;
      case 'getKarigars':
        result = getKarigars();
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Also handle GET for CORS preflight
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', message: 'PO Management API is running' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== PO OPERATIONS ====================

function getPOs(filters) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PO_MASTER);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { pos: [] };
  
  const headers = data[0];
  const rows = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
  
  // Apply filters if provided
  let filtered = rows;
  if (filters) {
    if (filters.status) filtered = filtered.filter(r => r['PO Status'] === filters.status);
    if (filters.approval) filtered = filtered.filter(r => r['Approval Status'] === filters.approval);
    if (filters.karigar) filtered = filtered.filter(r => r['Karigar'] === filters.karigar);
    if (filters.buyer) filtered = filtered.filter(r => r['Buyer Name'] === filters.buyer);
  }
  
  return { pos: filtered };
}

function addPOs(poData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PO_MASTER);
  
  const rows = poData.map(po => [
    po.id || Utilities.getUuid(),
    po.ordNo,
    po.ordType || '',
    po.factory || '',
    po.ordDt || '',
    po.ourRef || '',
    po.eoNo || '',
    po.styleNo || '',
    po.prodQty || 0,
    po.approvalStatus || 'Pending',
    po.poStatus || 'PENDING',
    po.buyerName || '',
    po.karigar || '',
    po.printedAt || '',
    po.printedBy || '',
    po.issuedAt || '',
    po.issuedBy || '',
    po.completedAt || '',
    po.remarks || '',
    po.priority || 'NORMAL',
    new Date().toISOString(),
    po.uploadedBy || ''
  ]);
  
  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }
  
  return { success: true, count: rows.length };
}

function checkDuplicates(poIdentifiers) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PO_MASTER);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const ordNoIdx = headers.indexOf('Ord No');
  const styleIdx = headers.indexOf('Style No');
  const eoIdx = headers.indexOf('EO No');
  
  const existingKeys = new Set();
  data.slice(1).forEach(row => {
    existingKeys.add(`${row[ordNoIdx]}-${row[styleIdx]}-${row[eoIdx]}`);
  });
  
  const duplicates = poIdentifiers.filter(id => existingKeys.has(id));
  return { duplicates };
}

function updatePOStatus(poIds, status, userData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PO_MASTER);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf('ID');
  const statusIdx = headers.indexOf('PO Status');
  
  poIds.forEach(poId => {
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === poId) {
        sheet.getRange(i + 1, statusIdx + 1).setValue(status);
        
        // Update relevant timestamp
        if (status === 'PRINTED') {
          const printedAtIdx = headers.indexOf('Printed At');
          const printedByIdx = headers.indexOf('Printed By');
          sheet.getRange(i + 1, printedAtIdx + 1).setValue(new Date().toISOString());
          sheet.getRange(i + 1, printedByIdx + 1).setValue(userData?.name || '');
        } else if (status === 'ISSUED') {
          const issuedAtIdx = headers.indexOf('Issued At');
          const issuedByIdx = headers.indexOf('Issued By');
          sheet.getRange(i + 1, issuedAtIdx + 1).setValue(new Date().toISOString());
          sheet.getRange(i + 1, issuedByIdx + 1).setValue(userData?.name || '');
        } else if (status === 'COMPLETED') {
          const completedAtIdx = headers.indexOf('Completed At');
          sheet.getRange(i + 1, completedAtIdx + 1).setValue(new Date().toISOString());
        }
        break;
      }
    }
  });
  
  return { success: true };
}

// ==================== PRINT OPERATIONS ====================

function logPrint(printData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PRINT_LOG);
  
  const rows = printData.map(p => [
    p.poId, p.ordNo || '', p.styleNo || '',
    new Date().toISOString(), p.printedBy || '', p.device || ''
  ]);
  
  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }
  
  return { success: true };
}

function getPrintLog(filters) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PRINT_LOG);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { logs: [] };
  
  const headers = data[0];
  return { logs: data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  })};
}

function requestReprint(poId, reason, userData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.REPRINT_LOG);
  const isAdmin = userData?.role === 'Admin';
  
  sheet.appendRow([
    poId, reason, userData?.name || '', new Date().toISOString(),
    isAdmin ? 'Yes' : 'Pending', isAdmin ? userData.name : ''
  ]);
  
  // If admin, reset PO status
  if (isAdmin) {
    updatePOStatus([poId], 'PENDING', userData);
  }
  
  return { success: true, approved: isAdmin };
}

// ==================== ISSUE OPERATIONS ====================

function issueToKarigar(issueData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.ISSUE_LOG);
  
  sheet.appendRow([
    Utilities.getUuid(),
    issueData.poIds.join(','),
    issueData.karigar,
    issueData.signature || '',
    new Date().toISOString(),
    issueData.issuedBy || '',
    issueData.poIds.length,
    issueData.totalQty || 0
  ]);
  
  // Update PO status
  updatePOStatus(issueData.poIds, 'ISSUED', { name: issueData.issuedBy });
  
  // Update karigar name on POs
  const poSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PO_MASTER);
  const data = poSheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf('ID');
  const karigarIdx = headers.indexOf('Karigar');
  
  issueData.poIds.forEach(poId => {
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] === poId) {
        poSheet.getRange(i + 1, karigarIdx + 1).setValue(issueData.karigar);
        break;
      }
    }
  });
  
  return { success: true };
}

function getIssueLog(filters) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.ISSUE_LOG);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { logs: [] };
  
  const headers = data[0];
  return { logs: data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  })};
}

// ==================== COMPLETION OPERATIONS ====================

function markCompleted(completionData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.COMPLETED_LOG);
  
  sheet.appendRow([
    completionData.poIds.join(','),
    new Date().toISOString(),
    completionData.completedBy || '',
    completionData.remarks || ''
  ]);
  
  updatePOStatus(completionData.poIds, 'COMPLETED', { name: completionData.completedBy });
  
  return { success: true };
}

function getCompletedLog(filters) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.COMPLETED_LOG);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { logs: [] };
  
  const headers = data[0];
  return { logs: data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  })};
}

// ==================== DASHBOARD ====================

function getDashboardStats() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PO_MASTER);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { stats: {} };
  
  const headers = data[0];
  const statusIdx = headers.indexOf('PO Status');
  const approvalIdx = headers.indexOf('Approval Status');
  const priorityIdx = headers.indexOf('Priority');
  
  const rows = data.slice(1);
  const today = new Date().toISOString().split('T')[0];
  
  return {
    stats: {
      totalPOs: rows.length,
      approved: rows.filter(r => r[approvalIdx] === 'Approved').length,
      pendingPrint: rows.filter(r => r[statusIdx] === 'PENDING' && r[approvalIdx] === 'Approved').length,
      printed: rows.filter(r => r[statusIdx] === 'PRINTED').length,
      issued: rows.filter(r => r[statusIdx] === 'ISSUED').length,
      completed: rows.filter(r => r[statusIdx] === 'COMPLETED').length,
      highPriority: rows.filter(r => r[priorityIdx] === 'HIGH').length,
    }
  };
}

// ==================== USER OPERATIONS ====================

function getUsers() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { users: [] };
  
  const headers = data[0];
  return { users: data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  })};
}

function addUser(userData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.USERS);
  sheet.appendRow([
    userData.email, userData.name, userData.role,
    new Date().toISOString(), '', 'Active'
  ]);
  return { success: true };
}

// ==================== ACTIVITY LOG ====================

function logActivity(activityData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.ACTIVITY_LOG);
  sheet.appendRow([
    new Date().toISOString(),
    activityData.action,
    activityData.details,
    activityData.user || '',
    activityData.role || '',
    activityData.device || ''
  ]);
  return { success: true };
}

function getActivityLogs(filters) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.ACTIVITY_LOG);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { logs: [] };
  
  const headers = data[0];
  const logs = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
  
  // Return last 500 entries (most recent first)
  return { logs: logs.reverse().slice(0, 500) };
}

// ==================== KARIGAR OPERATIONS ====================

function getKarigars() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.KARIGARS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { karigars: [] };
  
  const headers = data[0];
  return { karigars: data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  })};
}

// ==================== DAILY REPORT TRIGGER ====================

/**
 * Set this as a daily trigger at 7 PM
 * Go to Triggers > Add Trigger > sendDailyReport > Time-driven > Day timer > 7pm-8pm
 */
function sendDailyReport() {
  const stats = getDashboardStats().stats;
  const date = new Date().toLocaleDateString();
  
  // Save to DAILY_REPORT sheet
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.DAILY_REPORT);
  sheet.appendRow([
    date, stats.totalPOs, stats.approved, stats.pendingPrint,
    stats.printed, stats.issued, stats.completed, 0
  ]);
  
  // Send email (configure recipient)
  const recipient = PropertiesService.getScriptProperties().getProperty('REPORT_EMAIL');
  if (recipient) {
    const subject = `PO Daily Report - ${date}`;
    const body = `
PO DAILY REPORT - ${date}
========================

Total POs: ${stats.totalPOs}
Approved: ${stats.approved}
Pending Print: ${stats.pendingPrint}
Printed: ${stats.printed}
Issued to Karigar: ${stats.issued}
Completed: ${stats.completed}
High Priority: ${stats.highPriority}

---
Generated automatically by PO Print Management System
    `;
    
    MailApp.sendEmail(recipient, subject, body);
  }
}
