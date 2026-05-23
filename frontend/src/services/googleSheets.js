/**
 * Google Sheets Service
 * Handles batching for large uploads to avoid URL length limits
 * Uses GET requests (CORS-safe with Google Apps Script)
 */
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';
const BATCH_SIZE = 15; // POs per batch (keeps URL under 2000 chars)

class GoogleSheetsService {
  constructor() {
    this.baseUrl = APPS_SCRIPT_URL;
  }

  isConfigured() {
    return this.baseUrl && this.baseUrl !== '' && !this.baseUrl.includes('YOUR_DEPLOYMENT_ID');
  }

  async _get(action, data = {}) {
    const encodedData = encodeURIComponent(JSON.stringify(data));
    const url = `${this.baseUrl}?action=${action}&data=${encodedData}`;
    const response = await fetch(url, { method: 'GET', redirect: 'follow' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) throw new Error('HTML response - check deployment');
    const result = JSON.parse(text);
    if (result.error) throw new Error(result.error);
    return result;
  }

  async request(action, data = {}) {
    if (!this.isConfigured()) throw new Error('Not configured');
    return this._get(action, data);
  }

  // Batched upload for large PO files
  async addPOs(poData) {
    if (!this.isConfigured()) throw new Error('Not configured');
    if (!poData || poData.length === 0) return { success: true, count: 0 };

    // Split into batches of BATCH_SIZE
    const batches = [];
    for (let i = 0; i < poData.length; i += BATCH_SIZE) {
      batches.push(poData.slice(i, i + BATCH_SIZE));
    }

    let totalCount = 0;
    let errors = 0;

    for (let i = 0; i < batches.length; i++) {
      try {
        const result = await this._get('addPOs', { poData: batches[i] });
        totalCount += result.count || batches[i].length;
      } catch (e) {
        console.error(`Batch ${i+1}/${batches.length} failed:`, e.message);
        errors++;
      }
      // Delay between batches to avoid Google rate limits
      if (i < batches.length - 1) await new Promise(r => setTimeout(r, 500));
    }

    console.log(`Google Sheets: uploaded ${totalCount}/${poData.length} POs in ${batches.length} batches (${errors} failed)`);
    return { success: errors === 0, count: totalCount, batches: batches.length, errors };
  }

  async getPOs(filters = {})              { return this.request('getPOs', { filters }); }
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
