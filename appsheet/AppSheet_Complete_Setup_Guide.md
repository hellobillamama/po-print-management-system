# PO Print Management System - Complete AppSheet Setup Guide

## STEP 1: Create Google Sheet (5 minutes)

1. Go to https://sheets.google.com
2. Create new blank spreadsheet
3. Name it: **"PO Management AppSheet"**
4. Create these 5 sheets (tabs at bottom):

### Sheet: PO_MASTER
Add these headers in Row 1:
```
ID | Ord No | Ord Type | Factory | Ord Dt | Our Ref | EO No | Style No | Prod Qty | Approval | Status | Karigar | Printed At | Printed By | SLA Due | Issued At | Issued By | Completed At | Remarks | Uploaded At
```

### Sheet: COMPLETED
Same headers as PO_MASTER.

### Sheet: PRINT_LOG
```
PO ID | Ord No | Style No | Printed At | Printed By
```

### Sheet: ISSUE_LOG
```
PO ID | Ord No | Karigar | Issued At | Issued By | Quantity | Signature
```

### Sheet: DAILY_REPORT
```
Date | Total Active | Approved | Pending Print | Printed | Issued | Completed | SLA Breached
```

---

## STEP 2: Create AppSheet App (5 minutes)

1. Go to https://www.appsheet.com
2. Click **"Start for free"** → Sign in with your Google account
3. Click **"Create" → "App" → "Start with existing data"**
4. Select your **"PO Management AppSheet"** Google Sheet
5. AppSheet will auto-create the app!

---

## STEP 3: Configure Tables (10 minutes)

Go to **Data → Tables** in AppSheet editor:

### PO_MASTER table settings:
| Column | Type | Key? | Required? | Default |
|--------|------|------|-----------|---------|
| ID | Text | ✅ KEY | Yes | UNIQUEID() |
| Ord No | Number | | Yes | |
| Ord Type | Text | | | |
| Factory | Text | | Yes | |
| Ord Dt | Date | | | |
| Our Ref | Text | | | |
| EO No | Text | | | |
| Style No | Text | | Yes | |
| Prod Qty | Number | | | |
| Approval | Enum | | | Values: Approved, Not Approved, Pending |
| Status | Enum | | | Values: PENDING, PRINTED, ISSUED, COMPLETED |
| Karigar | Text | | | = [Factory] |
| Printed At | DateTime | | | |
| Printed By | Text | | | |
| SLA Due | DateTime | | | |
| Issued At | DateTime | | | |
| Issued By | Text | | | |
| Completed At | DateTime | | | |
| Remarks | LongText | | | |
| Uploaded At | DateTime | | | NOW() |

### Set these Initial Values (in column settings):
- **ID** → Initial value: `UNIQUEID()`
- **Status** → Initial value: `"PENDING"`
- **Karigar** → Initial value: `[Factory]`
- **Uploaded At** → Initial value: `NOW()`

---

## STEP 4: Create Views (10 minutes)

Go to **UX → Views**:

### View 1: Dashboard
- Type: **Dashboard**
- Name: "Dashboard"
- Add these views as tiles

### View 2: All Active POs
- Type: **Table**
- Data source: PO_MASTER
- Filter: `[Status] <> "COMPLETED"`
- Sort: Uploaded At (descending)
- Group by: Status

### View 3: Ready to Print
- Type: **Table**
- Data source: PO_MASTER
- Filter: `AND([Status] = "PENDING", [Approval] = "Approved")`
- Name: "Ready to Print"
- Color: Orange

### View 4: Printed (Pending Handover)
- Type: **Table**
- Data source: PO_MASTER
- Filter: `[Status] = "PRINTED"`
- Name: "Pending Handover"
- Color: Blue

### View 5: Issued to Karigar
- Type: **Table**
- Data source: PO_MASTER
- Filter: `[Status] = "ISSUED"`
- Name: "Issued"
- Color: Purple

### View 6: Completed
- Type: **Table**
- Data source: COMPLETED
- Name: "Completed"
- Color: Green

### View 7: SLA Breached
- Type: **Table**
- Data source: PO_MASTER
- Filter: `AND([Status] = "PRINTED", [SLA Due] < NOW())`
- Name: "SLA Breached!"
- Color: Red

### View 8: Karigar-wise
- Type: **Table**
- Data source: PO_MASTER
- Filter: `[Status] <> "COMPLETED"`
- Group by: Factory
- Name: "Karigar View"

---

## STEP 5: Create Actions (15 minutes)

Go to **Actions**:

### Action 1: Mark as Printed
- Name: "Print PO"
- Table: PO_MASTER
- Do this: Set values
  - Status = "PRINTED"
  - Printed At = NOW()
  - Printed By = USEREMAIL()
  - SLA Due = NOW() + 2 (days)
- Only if: `AND([Status] = "PENDING", [Approval] = "Approved")`
- Prominence: Display prominently
- Icon: printer

### Action 2: Issue to Karigar
- Name: "Issue to Karigar"
- Table: PO_MASTER
- Do this: Set values
  - Status = "ISSUED"
  - Issued At = NOW()
  - Issued By = USEREMAIL()
- Only if: `[Status] = "PRINTED"`
- Prominence: Display prominently
- Icon: handshake

### Action 3: Mark Complete
- Name: "Mark Complete"
- Table: PO_MASTER
- Do this: Set values
  - Status = "COMPLETED"
  - Completed At = NOW()
- Only if: `[Status] = "ISSUED"`
- Prominence: Display prominently
- Icon: check-circle
- After: Add row to COMPLETED table (copy all columns)

### Action 4: Reprint Request
- Name: "Request Reprint"
- Table: PO_MASTER
- Do this: Set values
  - Status = "PENDING"
  - Printed At = ""
  - Printed By = ""
  - SLA Due = ""
  - Remarks = CONCATENATE("REPRINT: ", [Remarks])
- Only if: `OR([Status] = "PRINTED", [Status] = "ISSUED")`
- Requires confirmation: Yes
- Confirmation message: "WARNING: This PO was already printed. Are you sure?"

---

## STEP 6: Validations (Duplicate Prevention)

Go to **Data → PO_MASTER → Column: Ord No**

Add validation:
```
NOT(IN([_THIS], PO_MASTER[Ord No]) - LIST([Ord No]))
```
Message: "This PO already exists in the system!"

OR simpler approach — add Valid If to the **Style No** column:
```
ISBLANK(
  FILTER("PO_MASTER",
    AND(
      [Ord No] = [_THISROW].[Ord No],
      [Style No] = [_THISROW].[Style No],
      [EO No] = [_THISROW].[EO No],
      [ID] <> [_THISROW].[ID]
    )
  )
)
```

---

## STEP 7: Automations / Bots (10 minutes)

Go to **Automation → Bots**:

### Bot 1: SLA Alert
- Event: Schedule → Every day at 9:00 AM
- Condition: COUNT(FILTER("PO_MASTER", AND([Status]="PRINTED", [SLA Due]<NOW()))) > 0
- Action: Send email
  - To: your-email@gmail.com
  - Subject: "⚠️ SLA BREACHED - POs not issued within 2 days"
  - Body: List of breached POs

### Bot 2: Daily Report at 7 PM
- Event: Schedule → Every day at 7:00 PM
- Action: Send email
  - To: your-email@gmail.com
  - Subject: "PO Daily Report - <<NOW()>>"
  - Body:
```
PO DAILY REPORT

Total Active: <<COUNT(FILTER("PO_MASTER", [Status]<>"COMPLETED"))>>
Pending Print: <<COUNT(FILTER("PO_MASTER", AND([Status]="PENDING", [Approval]="Approved")))>>
Printed: <<COUNT(FILTER("PO_MASTER", [Status]="PRINTED"))>>
Issued: <<COUNT(FILTER("PO_MASTER", [Status]="ISSUED"))>>
Completed Today: <<COUNT(FILTER("COMPLETED", [Completed At]>=TODAY()))>>
SLA Breached: <<COUNT(FILTER("PO_MASTER", AND([Status]="PRINTED", [SLA Due]<NOW())))>>
```

### Bot 3: Duplicate Warning
- Event: When PO_MASTER row is added
- Condition: Check if same Ord No + Style No + EO No exists
- Action: Send notification to user

---

## STEP 8: Security / Users

Go to **Security → Users**:

1. Add users with their email
2. Set roles:
   - Admin → Can do everything
   - Production → Can upload, view
   - Printing → Can print POs
   - Dispatch → Can issue to karigar

### Signing (Digital Signature):
- Add a column **"Signature"** (Type: Drawing/Signature) in ISSUE_LOG
- When issuing, form will show signature pad on mobile!

---

## STEP 9: Deploy App

1. Click **"Deploy"** in top-right
2. Choose **"Prototype"** (free) or **"Deploy"** (paid for more users)
3. Install on phone:
   - Android: Download "AppSheet" from Play Store
   - iPhone: Download "AppSheet" from App Store
   - Login with your Google account
   - Your app appears automatically!

---

## STEP 10: Import Visual Gems Data

### Option A: Paste directly into Google Sheet
1. Open Visual Gems → Copy report
2. Open your Google Sheet → PO_MASTER tab
3. Paste at the bottom
4. Fill in Status = "PENDING" for new rows
5. AppSheet syncs automatically

### Option B: Use AppSheet Form
1. Open app → Click "+" (add new PO)
2. Fill in the fields manually
3. Save → stored in Google Sheet

### Option C: CSV Import
1. In Google Sheet → File → Import → Upload CSV
2. Select "Append to current sheet"
3. AppSheet syncs automatically

---

## DAILY WORKFLOW IN APPSHEET

| Time | Action | Where |
|------|--------|-------|
| Morning | Paste Visual Gems report into Google Sheet | Desktop |
| Morning | Open AppSheet → Check "Ready to Print" view | Phone/Desktop |
| During day | Select POs → Tap "Print PO" button | Phone |
| After print | Go to "Pending Handover" → Tap "Issue to Karigar" | Phone |
| Karigar signs | Signature captured on phone screen | Phone |
| End of day | Check "Issued" → Tap "Mark Complete" for done ones | Phone |
| 7 PM | Automatic daily report email arrives | Email |

---

## ADVANTAGES OF APPSHEET

| Feature | Works? |
|---------|--------|
| Mobile app | ✅ Yes |
| Desktop | ✅ Yes |
| Offline mode | ✅ Yes |
| Digital signature | ✅ Yes |
| Multi-user | ✅ Yes |
| Real-time sync | ✅ Yes |
| Data in Google Sheet | ✅ Yes |
| Daily email report | ✅ Yes |
| Duplicate prevention | ✅ Yes |
| SLA alerts | ✅ Yes |
| Free (up to 10 users) | ✅ Yes |
| No coding | ✅ Yes |

---

## COST

- **Free**: Up to 10 users, basic features
- **Starter**: $5/user/month - more features
- **Core**: $10/user/month - full features + automation

For your use case, FREE plan should work!
