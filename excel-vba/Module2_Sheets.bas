'=============================================================
' PO PRINT MANAGEMENT SYSTEM - SHEETS SETUP MODULE
' Paste this into Module2 in VBA Editor (Alt+F11)
'=============================================================

Option Explicit

' ── SETUP WORKBOOK (Run this ONCE) ─────────────────────────
Sub SetupWorkbook()
    Application.ScreenUpdating = False
    
    ' Create all sheets
    Call CreateSheet("IMPORT")
    Call CreateSheet("PO_MASTER")
    Call CreateSheet("PRINT_LOG")
    Call CreateSheet("ISSUE_LOG")
    Call CreateSheet("COMPLETED")
    Call CreateSheet("DAILY_REPORT")
    Call CreateSheet("DASHBOARD")
    
    ' Setup IMPORT sheet headers
    With ThisWorkbook.Sheets("IMPORT")
        .Cells(1, 1).Value = "Factory"
        .Cells(1, 2).Value = "Ord Type"
        .Cells(1, 3).Value = "Ord No"
        .Cells(1, 4).Value = "Ord Dt"
        .Cells(1, 5).Value = "Our Ref"
        .Cells(1, 6).Value = "EO No"
        .Cells(1, 7).Value = "Style No"
        .Cells(1, 8).Value = "Prod Qty"
        .Cells(1, 9).Value = "Approval Status"
        .Rows(1).Font.Bold = True
        .Rows(1).Interior.Color = RGB(255, 255, 0)
        .Columns("A:I").ColumnWidth = 15
    End With
    
    ' Setup PO_MASTER headers
    With ThisWorkbook.Sheets("PO_MASTER")
        .Cells(1, 1).Value = "ID"
        .Cells(1, 2).Value = "Ord No"
        .Cells(1, 3).Value = "Ord Type"
        .Cells(1, 4).Value = "Factory/Karigar"
        .Cells(1, 5).Value = "Ord Dt"
        .Cells(1, 6).Value = "Our Ref"
        .Cells(1, 7).Value = "EO No"
        .Cells(1, 8).Value = "Style No"
        .Cells(1, 9).Value = "Prod Qty"
        .Cells(1, 10).Value = "Approval"
        .Cells(1, 11).Value = "Status"
        .Cells(1, 12).Value = "Karigar"
        .Cells(1, 13).Value = "Printed At"
        .Cells(1, 14).Value = "Printed By"
        .Cells(1, 15).Value = "SLA Due"
        .Cells(1, 16).Value = "Issued At"
        .Cells(1, 17).Value = "Issued By"
        .Cells(1, 18).Value = "Completed At"
        .Cells(1, 19).Value = "Remarks"
        .Cells(1, 20).Value = "Uploaded At"
        .Rows(1).Font.Bold = True
        .Rows(1).Interior.Color = RGB(50, 50, 50)
        .Rows(1).Font.Color = RGB(255, 255, 255)
        .Columns("A:T").ColumnWidth = 14
        .Columns("H:H").ColumnWidth = 25
        .Range("A1").AutoFilter
    End With
    
    ' Setup PRINT_LOG headers
    With ThisWorkbook.Sheets("PRINT_LOG")
        .Cells(1, 1).Value = "PO ID"
        .Cells(1, 2).Value = "Ord No"
        .Cells(1, 3).Value = "Style No"
        .Cells(1, 4).Value = "Printed At"
        .Cells(1, 5).Value = "Printed By"
        .Rows(1).Font.Bold = True
        .Rows(1).Interior.Color = RGB(200, 230, 255)
    End With
    
    ' Setup ISSUE_LOG headers
    With ThisWorkbook.Sheets("ISSUE_LOG")
        .Cells(1, 1).Value = "PO ID"
        .Cells(1, 2).Value = "Ord No"
        .Cells(1, 3).Value = "Karigar"
        .Cells(1, 4).Value = "Issued At"
        .Cells(1, 5).Value = "Issued By"
        .Cells(1, 6).Value = "Quantity"
        .Rows(1).Font.Bold = True
        .Rows(1).Interior.Color = RGB(230, 200, 255)
    End With
    
    ' Setup DAILY_REPORT headers
    With ThisWorkbook.Sheets("DAILY_REPORT")
        .Cells(1, 1).Value = "Date"
        .Cells(1, 2).Value = "Total POs"
        .Cells(1, 3).Value = "Approved"
        .Cells(1, 4).Value = "Pending Print"
        .Cells(1, 5).Value = "Printed"
        .Cells(1, 6).Value = "Issued"
        .Cells(1, 7).Value = "Completed"
        .Cells(1, 8).Value = "SLA Breached"
        .Rows(1).Font.Bold = True
        .Rows(1).Interior.Color = RGB(200, 255, 200)
    End With
    
    ' Setup DASHBOARD
    Call UpdateDashboard
    
    Application.ScreenUpdating = True
    
    ' Activate IMPORT sheet
    ThisWorkbook.Sheets("IMPORT").Activate
    
    MsgBox "✅ Workbook Setup Complete!" & vbCrLf & vbCrLf & _
           "Sheets created: IMPORT, PO_MASTER, PRINT_LOG, ISSUE_LOG, DAILY_REPORT, DASHBOARD" & vbCrLf & vbCrLf & _
           "HOW TO USE:" & vbCrLf & _
           "1. Paste Visual Gems data in IMPORT sheet" & vbCrLf & _
           "2. Run ImportPastedData (Alt+F8)" & vbCrLf & _
           "3. Select rows in PO_MASTER → Run PrintSelected" & vbCrLf & _
           "4. Select rows → Run IssueToKarigar" & vbCrLf & _
           "5. Select rows → Run MarkComplete", vbInformation, "Setup Done"
End Sub


' ── CREATE SHEET IF NOT EXISTS ─────────────────────────────
Sub CreateSheet(sheetName As String)
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Sheets(sheetName)
    On Error GoTo 0
    
    If ws Is Nothing Then
        Set ws = ThisWorkbook.Sheets.Add(After:=ThisWorkbook.Sheets(ThisWorkbook.Sheets.Count))
        ws.Name = sheetName
    End If
End Sub


' ── UPDATE DASHBOARD ───────────────────────────────────────
Sub UpdateDashboard()
    Dim ws As Worksheet, wsMaster As Worksheet
    Set ws = ThisWorkbook.Sheets("DASHBOARD")
    Set wsMaster = ThisWorkbook.Sheets("PO_MASTER")
    
    Dim lastRow As Long
    lastRow = wsMaster.Cells(wsMaster.Rows.Count, 1).End(xlUp).Row
    
    ' Count stats
    Dim totalPOs As Long, approved As Long, pendingPrint As Long
    Dim printed As Long, issued As Long, completed As Long
    Dim slaBreached As Long, i As Long
    
    For i = 2 To lastRow
        Dim status As String, appr As String
        status = wsMaster.Cells(i, COL_STATUS).Value
        appr = wsMaster.Cells(i, COL_APPROVAL).Value
        
        If status <> "COMPLETED" Then
            totalPOs = totalPOs + 1
            If appr = "Approved" Then approved = approved + 1
            If status = "PENDING" And appr = "Approved" Then pendingPrint = pendingPrint + 1
            If status = "PRINTED" Then
                printed = printed + 1
                If wsMaster.Cells(i, COL_SLA_DUE).Value <> "" Then
                    If wsMaster.Cells(i, COL_SLA_DUE).Value < Now Then
                        slaBreached = slaBreached + 1
                    End If
                End If
            End If
            If status = "ISSUED" Then issued = issued + 1
        Else
            completed = completed + 1
        End If
    Next i
    
    ' Write dashboard
    ws.Cells.Clear
    
    ws.Cells(1, 1).Value = "PO MANAGEMENT DASHBOARD"
    ws.Cells(1, 1).Font.Size = 16
    ws.Cells(1, 1).Font.Bold = True
    
    ws.Cells(2, 1).Value = "Last Updated: " & Format(Now, "dd-mmm-yyyy hh:mm:ss")
    ws.Cells(2, 1).Font.Color = RGB(100, 100, 100)
    
    ws.Cells(4, 1).Value = "METRIC"
    ws.Cells(4, 2).Value = "COUNT"
    ws.Range("A4:B4").Font.Bold = True
    ws.Range("A4:B4").Interior.Color = RGB(50, 50, 50)
    ws.Range("A4:B4").Font.Color = RGB(255, 255, 255)
    
    ws.Cells(5, 1).Value = "Total Active POs"
    ws.Cells(5, 2).Value = totalPOs
    ws.Cells(5, 2).Font.Bold = True
    
    ws.Cells(6, 1).Value = "Approved"
    ws.Cells(6, 2).Value = approved
    ws.Cells(6, 2).Interior.Color = RGB(200, 255, 200)
    
    ws.Cells(7, 1).Value = "Pending Print"
    ws.Cells(7, 2).Value = pendingPrint
    ws.Cells(7, 2).Interior.Color = RGB(255, 255, 200)
    
    ws.Cells(8, 1).Value = "Printed (awaiting handover)"
    ws.Cells(8, 2).Value = printed
    ws.Cells(8, 2).Interior.Color = RGB(200, 230, 255)
    
    ws.Cells(9, 1).Value = "Issued to Karigar"
    ws.Cells(9, 2).Value = issued
    ws.Cells(9, 2).Interior.Color = RGB(230, 200, 255)
    
    ws.Cells(10, 1).Value = "Completed (archived)"
    ws.Cells(10, 2).Value = completed
    ws.Cells(10, 2).Interior.Color = RGB(200, 255, 200)
    
    ws.Cells(11, 1).Value = "⚠️ SLA BREACHED"
    ws.Cells(11, 2).Value = slaBreached
    If slaBreached > 0 Then
        ws.Cells(11, 2).Interior.Color = RGB(255, 100, 100)
        ws.Cells(11, 2).Font.Bold = True
    End If
    
    ws.Columns("A:A").ColumnWidth = 30
    ws.Columns("B:B").ColumnWidth = 12
End Sub
