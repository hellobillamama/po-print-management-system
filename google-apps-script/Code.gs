/**
 * PO Print Management System - Google Apps Script Backend
 * SETUP: Run setupSheets() once first, then Deploy as Web App
 * Execute as: Me | Who has access: Anyone
 */

const SHEETS = {
  PO_MASTER: 'PO_MASTER', PRINT_LOG: 'PRINT_LOG', ISSUE_LOG: 'ISSUE_LOG',
  COMPLETED_LOG: 'COMPLETED_LOG', USERS: 'USERS', DAILY_REPORT: 'DAILY_REPORT',
  REPRINT_LOG: 'REPRINT_LOG', ACTIVITY_LOG: 'ACTIVITY_LOG', KARIGARS: 'KARIGARS'
};

function createResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// =============================================
// ALL requests come via GET (bypasses CORS)
// =============================================
function doGet(e) {
  try {
    const action = e.parameter.action;
    const dataParam = e.parameter.data;
    const data = dataParam ? JSON.parse(decodeURIComponent(dataParam)) : {};
    let result = {};

    switch (action) {
      case 'getPOs':           result = getPOs(data.filters); break;
      case 'addPOs':           result = addPOs(data.poData); break;
      case 'updatePOStatus':   result = updatePOStatus(data.poIds, data.status, data.userData); break;
      case 'logPrint':         result = logPrint(data.printData); break;
      case 'requestReprint':   result = requestReprint(data.poId, data.reason, data.userData); break;
      case 'issueToKarigar':   result = issueToKarigar(data.issueData); break;
      case 'markCompleted':    result = markCompleted(data.completionData); break;
      case 'logActivity':      result = logActivity(data.activityData); break;
      case 'getActivityLogs':  result = getActivityLogs(data.filters); break;
      case 'getDashboardStats':result = getDashboardStats(); break;
      case 'ping':             result = { status: 'ok', message: 'Connected!' }; break;
      default: result = { error: 'Unknown action: ' + action };
    }
    return createResponse(result);
  } catch (error) {
    return createResponse({ error: error.message });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const encoded = encodeURIComponent(JSON.stringify(data));
    return doGet({ parameter: { action: data.action, data: encoded } });
  } catch (error) {
    return createResponse({ error: error.message });
  }
}

// =============================================
// SETUP
// =============================================
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  createSheetWithHeaders(ss, SHEETS.PO_MASTER, [
    'ID','Ord No','Ord Type','Factory','Ord Dt','Our Ref','EO No','Style No',
    'Prod Qty','Approval Status','PO Status','Buyer Name','Karigar',
    'Printed At','Printed By','SLA Due','Issued At','Issued By',
    'Completed At','Remarks','Priority','Uploaded At','Uploaded By'
  ]);
  createSheetWithHeaders(ss, SHEETS.PRINT_LOG,    ['PO ID','Ord No','Style No','Printed At','Printed By','SLA Due','Device Info']);
  createSheetWithHeaders(ss, SHEETS.ISSUE_LOG,    ['Issue ID','PO IDs','Karigar','Signature','Issued At','Issued By','PO Count','Total Qty']);
  createSheetWithHeaders(ss, SHEETS.COMPLETED_LOG,['PO IDs','Completed At','Completed By','Remarks']);
  createSheetWithHeaders(ss, SHEETS.REPRINT_LOG,  ['PO ID','Reason','Requested By','Requested At','Approved','Approved By']);
  createSheetWithHeaders(ss, SHEETS.ACTIVITY_LOG, ['Timestamp','Action','Details','User','Role','Device']);
  createSheetWithHeaders(ss, SHEETS.DAILY_REPORT, ['Date','Total POs','Approved','Pending','Printed','Issued','Completed','Reprints']);
  createSheetWithHeaders(ss, SHEETS.USERS,        ['Email','Name','Role','Created At','Last Login','Status']);
  createSheetWithHeaders(ss, SHEETS.KARIGARS,     ['Name','Contact','Specialty','Status','Added At']);
  SpreadsheetApp.getUi().alert('All sheets created! Now deploy as Web App.');
}

function createSheetWithHeaders(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  sheet.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  return sheet;
}

// =============================================
// PO OPERATIONS
// =============================================
function getPOs(filters) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PO_MASTER);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { pos: [] };
  const headers = data[0];
  let rows = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
  if (filters) {
    if (filters.status)   rows = rows.filter(r => r['PO Status'] === filters.status);
    if (filters.approval) rows = rows.filter(r => r['Approval Status'] === filters.approval);
  }
  return { pos: rows };
}

function addPOs(poData) {
  if (!poData || poData.length === 0) return { success: true, count: 0 };
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PO_MASTER);
  const rows = poData.map(po => [
    po.id || Utilities.getUuid(),
    po.ordNo||'', po.ordType||'', po.factory||'', po.ordDt||'',
    po.ourRef||'', po.eoNo||'', po.styleNo||'',
    po.prodQty||0, po.approvalStatus||'Pending', po.poStatus||'PENDING',
    po.buyerName||'', po.karigar||po.factory||'',
    '','','','','','','',
    po.priority||'NORMAL', new Date().toISOString(), po.uploadedBy||''
  ]);
  sheet.getRange(sheet.getLastRow()+1, 1, rows.length, rows[0].length).setValues(rows);
  return { success: true, count: rows.length };
}

function updatePOStatus(poIds, status, userData) {
  if (!poIds || poIds.length === 0) return { success: true };
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PO_MASTER);
  const data = sheet.getDataRange().getValues();
  const h = data[0];
  const idIdx        = h.indexOf('ID');
  const statusIdx    = h.indexOf('PO Status');
  const approvalIdx  = h.indexOf('Approval Status');
  const printedAtIdx = h.indexOf('Printed At');
  const printedByIdx = h.indexOf('Printed By');
  const slaDueIdx    = h.indexOf('SLA Due');
  const issuedAtIdx  = h.indexOf('Issued At');
  const issuedByIdx  = h.indexOf('Issued By');
  const completedIdx = h.indexOf('Completed At');
  const now     = new Date().toISOString();
  const slaDate = new Date(Date.now() + 2*24*60*60*1000).toISOString();

  for (let i = 1; i < data.length; i++) {
    if (poIds.map(String).includes(String(data[i][idIdx]))) {
      if (status === 'PRINTED') {
        sheet.getRange(i+1, statusIdx+1).setValue('PRINTED');
        sheet.getRange(i+1, printedAtIdx+1).setValue(now);
        sheet.getRange(i+1, printedByIdx+1).setValue(userData?.name||'');
        sheet.getRange(i+1, slaDueIdx+1).setValue(slaDate);
      } else if (status === 'ISSUED') {
        sheet.getRange(i+1, statusIdx+1).setValue('ISSUED');
        sheet.getRange(i+1, issuedAtIdx+1).setValue(now);
        sheet.getRange(i+1, issuedByIdx+1).setValue(userData?.name||'');
      } else if (status === 'COMPLETED') {
        sheet.getRange(i+1, statusIdx+1).setValue('COMPLETED');
        sheet.getRange(i+1, completedIdx+1).setValue(now);
      } else if (status === 'APPROVAL_UPDATED') {
        sheet.getRange(i+1, approvalIdx+1).setValue(userData?.newApproval||'Approved');
      } else {
        sheet.getRange(i+1, statusIdx+1).setValue(status);
      }
    }
  }
  return { success: true };
}

function logPrint(printData) {
  if (!printData || printData.length === 0) return { success: true };
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PRINT_LOG);
  const rows = printData.map(p => [p.poId||'','','', p.printedAt||now, p.printedBy||'', p.slaDueDate||'', p.device||'']);
  sheet.getRange(sheet.getLastRow()+1, 1, rows.length, rows[0].length).setValues(rows);
  return { success: true };
}

function requestReprint(poId, reason, userData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.REPRINT_LOG);
  const isAdmin = userData?.role === 'Admin';
  sheet.appendRow([poId, reason, userData?.name||'', new Date().toISOString(), isAdmin?'Yes':'Pending', isAdmin?userData.name:'']);
  return { success: true, approved: isAdmin };
}

function issueToKarigar(issueData) {
  if (!issueData) return { success: true };
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.ISSUE_LOG);
  sheet.appendRow([
    Utilities.getUuid(), (issueData.poIds||[]).join(','), issueData.karigar||'',
    '(digital signature captured)', new Date().toISOString(),
    issueData.issuedBy||'', (issueData.poIds||[]).length, issueData.totalQty||0
  ]);
  updatePOStatus(issueData.poIds, 'ISSUED', { name: issueData.issuedBy });
  const poSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PO_MASTER);
  const data = poSheet.getDataRange().getValues();
  const h = data[0];
  const idIdx = h.indexOf('ID');
  const karigarIdx = h.indexOf('Karigar');
  (issueData.poIds||[]).forEach(poId => {
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idIdx]) === String(poId)) {
        poSheet.getRange(i+1, karigarIdx+1).setValue(issueData.karigar);
        break;
      }
    }
  });
  return { success: true };
}

function markCompleted(completionData) {
  if (!completionData) return { success: true };
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.COMPLETED_LOG);
  sheet.appendRow([(completionData.poIds||[]).join(','), new Date().toISOString(), completionData.completedBy||'', completionData.remarks||'']);
  updatePOStatus(completionData.poIds, 'COMPLETED', { name: completionData.completedBy });
  return { success: true };
}

function logActivity(activityData) {
  if (!activityData) return { success: true };
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.ACTIVITY_LOG);
  sheet.appendRow([new Date().toISOString(), activityData.action||'', activityData.details||'', activityData.user||'', activityData.role||'', activityData.device||'']);
  return { success: true };
}

function getActivityLogs(filters) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.ACTIVITY_LOG);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { logs: [] };
  const headers = data[0];
  return { logs: data.slice(1).reverse().slice(0,500).map(row => { const obj={}; headers.forEach((h,i)=>{obj[h]=row[i];}); return obj; }) };
}

function getDashboardStats() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PO_MASTER);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { stats: { totalPOs: 0 } };
  const h = data[0];
  const statusIdx = h.indexOf('PO Status');
  const approvalIdx = h.indexOf('Approval Status');
  const rows = data.slice(1);
  return { stats: {
    totalPOs: rows.length,
    approved: rows.filter(r=>r[approvalIdx]==='Approved').length,
    pendingPrint: rows.filter(r=>r[statusIdx]==='PENDING'&&r[approvalIdx]==='Approved').length,
    printed: rows.filter(r=>r[statusIdx]==='PRINTED').length,
    issued: rows.filter(r=>r[statusIdx]==='ISSUED').length,
    completed: rows.filter(r=>r[statusIdx]==='COMPLETED').length,
  }};
}

function sendDailyReport() {
  const stats = getDashboardStats().stats;
  const date = new Date().toLocaleDateString();
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.DAILY_REPORT)
    .appendRow([date, stats.totalPOs, stats.approved, stats.pendingPrint, stats.printed, stats.issued, stats.completed, 0]);
  const recipient = PropertiesService.getScriptProperties().getProperty('REPORT_EMAIL');
  if (recipient) {
    MailApp.sendEmail(recipient, 'PO Daily Report - ' + date,
      'Total POs: ' + stats.totalPOs + '\nApproved: ' + stats.approved +
      '\nPending Print: ' + stats.pendingPrint + '\nPrinted: ' + stats.printed +
      '\nIssued: ' + stats.issued + '\nCompleted: ' + stats.completed);
  }
}
