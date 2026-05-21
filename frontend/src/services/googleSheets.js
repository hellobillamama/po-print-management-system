/**
 * Google Sheets Service
 * Uses GET requests to avoid CORS issues with Google Apps Script
 */
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';

class GoogleSheetsService {
  constructor() {
    this.baseUrl = APPS_SCRIPT_URL;
  }

  // Use GET request - bypasses CORS issues with Google Apps Script
  async request(action, data = {}) {
    if (!this.baseUrl) throw new Error('Google Apps Script URL not configured');

    try {
      const encodedData = encodeURIComponent(JSON.stringify(data));
      const url = `${this.baseUrl}?action=${action}&data=${encodedData}`;

      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
      });

      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const text = await response.text();

      // Handle Google's redirect response
      if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
        throw new Error('Got HTML response - check deployment settings');
      }

      const result = JSON.parse(text);
      if (result.error) throw new Error(result.error);
      return result;
    } catch (error) {
      console.error(`Sheets API error (${action}):`, error.message);
      throw error;
    }
  }

  async getPOs(filters = {})              { return this.request('getPOs', { filters }); }
  async addPOs(poData)                    { return this.request('addPOs', { poData }); }
  async updatePOStatus(poIds, status, ud) { return this.request('updatePOStatus', { poIds, status, userData: ud }); }
  async logPrint(printData)               { return this.request('logPrint', { printData }); }
  async requestReprint(poId, reason, ud)  { return this.request('requestReprint', { poId, reason, userData: ud }); }
  async issueToKarigar(issueData)         { return this.request('issueToKarigar', { issueData }); }
  async markCompleted(completionData)     { return this.request('markCompleted', { completionData }); }
  async logActivity(activityData)         { return this.request('logActivity', { activityData }); }
  async getActivityLogs(filters = {})     { return this.request('getActivityLogs', { filters }); }
  async getDashboardStats()               { return this.request('getDashboardStats'); }
  async ping()                            { return this.request('ping'); }
}

export const sheetsService = new GoogleSheetsService();
export default sheetsService;
