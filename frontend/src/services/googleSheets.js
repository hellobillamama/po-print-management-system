/**
 * Google Apps Script Web App URL
 * Replace with your deployed Google Apps Script URL
 */
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';

class GoogleSheetsService {
  constructor() {
    this.baseUrl = APPS_SCRIPT_URL;
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
  }

  async request(action, data = {}) {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      return result;
    } catch (error) {
      console.error(`Google Sheets API error (${action}):`, error);
      throw error;
    }
  }

  // PO Master Operations
  async getPOs(filters = {}) {
    return this.request('getPOs', { filters });
  }

  async addPOs(poData) {
    return this.request('addPOs', { poData });
  }

  async updatePOStatus(poIds, status, userData) {
    return this.request('updatePOStatus', { poIds, status, userData });
  }

  async checkDuplicates(poIdentifiers) {
    return this.request('checkDuplicates', { poIdentifiers });
  }

  // Print Operations
  async logPrint(printData) {
    return this.request('logPrint', { printData });
  }

  async getPrintLog(filters = {}) {
    return this.request('getPrintLog', { filters });
  }

  async requestReprint(poId, reason, userData) {
    return this.request('requestReprint', { poId, reason, userData });
  }

  // Issue/Handover Operations
  async issueToKarigar(issueData) {
    return this.request('issueToKarigar', { issueData });
  }

  async getIssueLog(filters = {}) {
    return this.request('getIssueLog', { filters });
  }

  // Completion Operations
  async markCompleted(completionData) {
    return this.request('markCompleted', { completionData });
  }

  async getCompletedLog(filters = {}) {
    return this.request('getCompletedLog', { filters });
  }

  // Dashboard
  async getDashboardStats() {
    return this.request('getDashboardStats');
  }

  // Users
  async getUsers() {
    return this.request('getUsers');
  }

  async addUser(userData) {
    return this.request('addUser', { userData });
  }

  // Activity Logs
  async logActivity(activityData) {
    return this.request('logActivity', { activityData });
  }

  async getActivityLogs(filters = {}) {
    return this.request('getActivityLogs', { filters });
  }

  // Karigars
  async getKarigars() {
    return this.request('getKarigars');
  }
}

export const sheetsService = new GoogleSheetsService();
export default sheetsService;
