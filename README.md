# PO Print Management & Karigar Issue System

A modern, responsive web application for garment/jewellery production PO handling. Built with React + Material UI frontend and Google Apps Script + Google Sheets backend.

## Features

- **Upload PO Reports** - Excel/CSV file upload or paste tab-separated text from Visual Gems
- **Smart Duplicate Detection** - Prevents double printing using Ord No + Style No + EO No combination
- **Print Management** - Batch printing with lock mechanism and admin-only reprint override
- **Karigar Handover** - Digital signature capture for PO handover tracking
- **Completion Tracking** - Full status flow: PENDING → PRINTED → ISSUED → COMPLETED
- **Audit Trail** - Complete activity logs for every action
- **Dashboard** - Real-time stats, charts, and alerts
- **Mobile Responsive** - Works on desktop, tablet, and phone
- **Dark/Light Mode** - Toggle theme for different environments
- **QR Code Generation** - For each PO tracking

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite |
| UI Library | Material UI (MUI) v6 |
| Charts | Recharts |
| Routing | React Router v7 |
| File Parsing | SheetJS (xlsx) |
| QR Codes | qrcode.react |
| Signatures | react-signature-canvas |
| PDF | jsPDF + jspdf-autotable |
| Backend | Google Apps Script |
| Database | Google Sheets |
| Auth | Firebase Auth (configurable) |

## Quick Start

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@po.com | admin123 |
| Production | production@po.com | prod123 |
| Printing | printing@po.com | print123 |
| Dispatch | dispatch@po.com | dispatch123 |
| Viewer | viewer@po.com | view123 |

### Google Apps Script Backend Setup

1. Create a new Google Spreadsheet
2. Go to **Extensions → Apps Script**
3. Copy the contents of `google-apps-script/Code.gs` into the editor
4. Run `setupSheets()` function once to create all required sheets
5. Deploy as **Web App**:
   - Execute as: Me
   - Who has access: Anyone
6. Copy the deployment URL
7. Create `frontend/.env` from `.env.example` and set `VITE_APPS_SCRIPT_URL`

### Firebase Auth Setup (Optional)

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Email/Password authentication
3. Copy your Firebase config to `frontend/.env`

> Note: The app includes a demo auth system that works without Firebase for testing.

## Google Sheets Structure

| Sheet | Purpose |
|-------|---------|
| PO_MASTER | All PO records with status tracking |
| PRINT_LOG | Print action logs |
| ISSUE_LOG | Karigar handover records |
| COMPLETED_LOG | Completion records |
| USERS | User management |
| DAILY_REPORT | Auto-generated daily summaries |
| REPRINT_LOG | Reprint requests and approvals |
| ACTIVITY_LOG | Full audit trail |
| KARIGARS | Karigar master list |

## Modules

### 1. Dashboard
- Summary cards (Today Uploaded, Approved, Pending, Printed, Issued, Completed)
- Karigar-wise workload chart
- Status distribution pie chart
- Delayed PO alerts

### 2. Upload Module
- Excel/CSV file upload with drag-and-drop
- Tab-separated text paste from Visual Gems
- Preview before import with validation
- Duplicate detection and error reporting

### 3. Filter & Search
- Multi-filter: status, approval, karigar, buyer, date range
- Full-text search across all PO fields
- Pagination for large datasets
- Quick status filter chips

### 4. Print Management
- Only approved POs can be printed
- Batch selection and printing
- Print lock (already printed POs are locked)
- Reprint requires admin approval + reason
- QR code generation per PO

### 5. Karigar Handover
- Select printed POs for handover
- Assign to karigar from master list
- Digital signature capture (mobile/tablet)
- Issue tracking with timestamp

### 6. Completion Module
- Mark issued POs as completed
- Pending aging (days since issued)
- Remarks/notes on completion
- Status flow visualization

### 7. Activity Logs
- All actions logged with user, time, device
- Filter by action type
- Search logs
- Export capability

## Production Deployment

```bash
cd frontend
npm run build
```

Deploy the `dist/` folder to any static hosting:
- Vercel
- Netlify
- Firebase Hosting
- GitHub Pages

## Daily Email Report

Set up a time-driven trigger in Google Apps Script:
1. Open Apps Script editor
2. Go to **Triggers** (clock icon)
3. Add Trigger → `sendDailyReport` → Time-driven → Day timer → 7pm-8pm
4. Set `REPORT_EMAIL` in Script Properties

## License

MIT
