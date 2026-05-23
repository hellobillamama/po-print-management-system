# PO Print Management System - Excel VBA Version

## Setup Instructions

1. Open Excel
2. Save a new file as **"PO_Management.xlsm"** (Macro-Enabled Workbook)
3. Press **Alt + F11** to open VBA Editor
4. In VBA Editor: Insert → Module
5. Paste the code from `Module1_Main.bas`
6. Insert another Module → Paste code from `Module2_Sheets.bas`
7. Insert another Module → Paste code from `Module3_Reports.bas`
8. Close VBA Editor
9. Press **Alt + F8** → Run **"SetupWorkbook"** once
10. Done! Your system is ready.

## How to Use

### Daily Workflow:
1. Open PO_Management.xlsm
2. Go to **IMPORT** sheet → Paste your Visual Gems report
3. Click **"Import Data"** button (or Alt+F8 → ImportPastedData)
4. Go to **PO_MASTER** → See all your POs with status
5. Select POs → Run **"PrintSelected"** to mark as printed
6. Select POs → Run **"IssueToKarigar"** to handover
7. Select POs → Run **"MarkComplete"** when done
8. Run **"GenerateDailyReport"** at end of day

## Sheets Created:
- **IMPORT** - Paste Visual Gems data here
- **PO_MASTER** - All POs with status tracking
- **PRINT_LOG** - Print history
- **ISSUE_LOG** - Karigar handover history
- **COMPLETED** - Completed POs (archived)
- **DAILY_REPORT** - Generated reports
- **DASHBOARD** - Summary statistics
