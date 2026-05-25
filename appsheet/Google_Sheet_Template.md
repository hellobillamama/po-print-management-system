# AppSheet - Google Sheet Template

## Create this Google Sheet EXACTLY as described below.
## Name: "PO Management AppSheet"

---

## Sheet 1: PO_MASTER

| Column | Header | Type | Notes |
|--------|--------|------|-------|
| A | ID | Text | Auto-generated (UNIQUEID()) |
| B | Ord No | Number | From Visual Gems |
| C | Ord Type | Text | ZARI, etc |
| D | Factory | Text | = Karigar name |
| E | Ord Dt | Date | Order date |
| F | Our Ref | Text | Reference |
| G | EO No | Text | EO number |
| H | Style No | Text | Style code |
| I | Prod Qty | Number | Quantity |
| J | Approval | Text | Approved / Not Approved |
| K | Status | Text | PENDING / PRINTED / ISSUED / COMPLETED |
| L | Karigar | Text | = Factory (auto-filled) |
| M | Printed At | DateTime | When printed |
| N | Printed By | Text | Who printed |
| O | SLA Due | DateTime | Print date + 2 days |
| P | Issued At | DateTime | When issued |
| Q | Issued By | Text | Who issued |
| R | Completed At | DateTime | When completed |
| S | Remarks | Text | Notes |
| T | Uploaded At | DateTime | Import timestamp |

### Default values for new rows:
- Status = "PENDING"
- Karigar = [Factory] (same value)
- Uploaded At = NOW()

---

## Sheet 2: COMPLETED

Same columns as PO_MASTER (A through T).
Completed POs get moved here.

---

## Sheet 3: PRINT_LOG

| Column | Header |
|--------|--------|
| A | PO ID |
| B | Ord No |
| C | Style No |
| D | Printed At |
| E | Printed By |

---

## Sheet 4: ISSUE_LOG

| Column | Header |
|--------|--------|
| A | PO ID |
| B | Ord No |
| C | Karigar |
| D | Issued At |
| E | Issued By |
| F | Quantity |
| G | Signature |

---

## Sheet 5: DAILY_REPORT

| Column | Header |
|--------|--------|
| A | Date |
| B | Total Active |
| C | Approved |
| D | Pending Print |
| E | Printed |
| F | Issued |
| G | Completed |
| H | SLA Breached |

---

## IMPORTANT: Add these headers EXACTLY as shown above.
## AppSheet reads column headers to create the app automatically.
