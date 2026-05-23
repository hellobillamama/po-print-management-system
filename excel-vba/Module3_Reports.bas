'=============================================================
' PO PRINT MANAGEMENT SYSTEM - REPORTS MODULE
' Paste this into Module3 in VBA Editor (Alt+F11)
'=============================================================

Option Explicit

' ── GENERATE DAILY REPORT ──────────────────────────────────
Sub GenerateDailyReport()
    Dim wsMaster As Worksheet, wsReport As Worksheet
    Set wsMaster = ThisWorkbook.Sheets("PO_MASTER")
    Set wsReport = ThisWorkbook.Sheets("DAILY_REPORT")
    
    Dim lastRow As Long
    lastRow = wsMaster.Cells(wsMaster.Rows.Count, 1).End(xlUp).Row
    
    ' Count stats
    Dim totalActive As Long, approved As Long, pendingPrint As Long
    Dim printed As Long, issued As Long, completed As Long
    Dim slaBreached As Long, i As Long
    
    For i = 2 To lastRow
        Dim status As String, appr As String
        status = wsMaster.Cells(i, COL_STATUS).Value
        appr = wsMaster.Cells(i, COL_APPROVAL).Value
        
        If status <> "COMPLETED" Then
            totalActive = totalActive + 1
            If appr = "Approved" Then approved = approved + 1
            If status = "PENDING" And appr = "Approved" Then pendingPrint = pendingPrint + 1
            If status = "PRINTED" Then
                printed = printed + 1
                If wsMaster.Cells(i, COL_SLA_DUE).Value <> "" Then
                    If wsMaster.Cells(i, COL_SLA_DUE).Value < Now Then slaBreached = slaBreached + 1
                End If
            End If
            If status = "ISSUED" Then issued = issued + 1
        Else
            completed = completed + 1
        End If
    Next i
    
    ' Add to daily report sheet
    Dim reportRow As Long
    reportRow = wsReport.Cells(wsReport.Rows.Count, 1).End(xlUp).Row + 1
    wsReport.Cells(reportRow, 1).Value = Date
    wsReport.Cells(reportRow, 2).Value = totalActive
    wsReport.Cells(reportRow, 3).Value = approved
    wsReport.Cells(reportRow, 4).Value = pendingPrint
    wsReport.Cells(reportRow, 5).Value = printed
    wsReport.Cells(reportRow, 6).Value = issued
    wsReport.Cells(reportRow, 7).Value = completed
    wsReport.Cells(reportRow, 8).Value = slaBreached
    
    ' Generate text report for email
    Dim report As String
    report = "PO DAILY REPORT — " & Format(Date, "dddd, dd mmmm yyyy") & vbCrLf & _
             String(50, "=") & vbCrLf & vbCrLf & _
             "SUMMARY" & vbCrLf & _
             "  Total Active POs     : " & totalActive & vbCrLf & _
             "  (Completed/Archived) : " & completed & vbCrLf & _
             "  Approved             : " & approved & vbCrLf & _
             "  Pending Print        : " & pendingPrint & vbCrLf & _
             "  Printed              : " & printed & vbCrLf & _
             "  Issued to Karigar    : " & issued & vbCrLf & _
             "  SLA Breached         : " & slaBreached & vbCrLf & vbCrLf
    
    ' Karigar-wise breakdown
    report = report & "KARIGAR-WISE STATUS" & vbCrLf
    Dim karigarDict As Object
    Set karigarDict = CreateObject("Scripting.Dictionary")
    
    For i = 2 To lastRow
        If wsMaster.Cells(i, COL_STATUS).Value <> "COMPLETED" Then
            Dim kName As String
            kName = wsMaster.Cells(i, COL_KARIGAR).Value
            If kName <> "" Then
                If Not karigarDict.Exists(kName) Then
                    karigarDict(kName) = wsMaster.Cells(i, COL_STATUS).Value & "|1"
                Else
                    ' Count
                    Dim parts() As String
                    parts = Split(karigarDict(kName), "|")
                    karigarDict(kName) = parts(0) & "|" & CStr(Val(parts(1)) + 1)
                End If
            End If
        End If
    Next i
    
    Dim k As Variant
    For Each k In karigarDict.Keys
        report = report & "  " & k & " : " & Split(karigarDict(k), "|")(1) & " POs" & vbCrLf
    Next k
    
    report = report & vbCrLf & String(50, "=") & vbCrLf & _
             "Generated: " & Format(Now, "dd-mmm-yyyy hh:mm:ss") & vbCrLf & _
             "PO Print Management System (Excel)"
    
    ' Show report and offer to copy
    Dim ans As VbMsgBoxResult
    ans = MsgBox(report & vbCrLf & vbCrLf & "Copy to clipboard for email?", vbYesNo + vbInformation, "Daily Report")
    
    If ans = vbYes Then
        ' Copy to clipboard
        Dim dataObj As Object
        Set dataObj = CreateObject("new:{1C3B4210-F441-11CE-B9EA-00AA006B1A69}")
        dataObj.SetText report
        dataObj.PutInClipboard
        MsgBox "Report copied to clipboard! Open your email and paste (Ctrl+V).", vbInformation
    End If
End Sub


' ── SEARCH PO ──────────────────────────────────────────────
Sub SearchPO()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("PO_MASTER")
    
    Dim searchTerm As String
    searchTerm = InputBox("Search by Ord No, Style No, or Factory:", "Search PO")
    If searchTerm = "" Then Exit Sub
    
    Dim lastRow As Long, i As Long
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    
    Dim results As String, count As Long
    count = 0
    
    For i = 2 To lastRow
        If InStr(1, CStr(ws.Cells(i, COL_ORDNO).Value), searchTerm, vbTextCompare) > 0 Or _
           InStr(1, ws.Cells(i, COL_STYLENO).Value, searchTerm, vbTextCompare) > 0 Or _
           InStr(1, ws.Cells(i, COL_FACTORY).Value, searchTerm, vbTextCompare) > 0 Then
            
            count = count + 1
            results = results & "Row " & i & ": Ord=" & ws.Cells(i, COL_ORDNO).Value & _
                      " | Status=" & ws.Cells(i, COL_STATUS).Value & _
                      " | Factory=" & ws.Cells(i, COL_FACTORY).Value & vbCrLf
            
            If count >= 20 Then
                results = results & "...(showing first 20 results)"
                Exit For
            End If
        End If
    Next i
    
    If count = 0 Then
        MsgBox "No results found for: " & searchTerm, vbInformation, "Search Results"
    Else
        MsgBox "Found " & count & " result(s):" & vbCrLf & vbCrLf & results, vbInformation, "Search Results"
    End If
End Sub


' ── SLA CHECK ──────────────────────────────────────────────
Sub CheckSLABreached()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("PO_MASTER")
    
    Dim lastRow As Long, i As Long
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    
    Dim results As String, count As Long
    count = 0
    
    For i = 2 To lastRow
        If ws.Cells(i, COL_STATUS).Value = "PRINTED" Then
            If ws.Cells(i, COL_SLA_DUE).Value <> "" Then
                If ws.Cells(i, COL_SLA_DUE).Value < Now Then
                    count = count + 1
                    Dim overdue As Long
                    overdue = DateDiff("d", ws.Cells(i, COL_SLA_DUE).Value, Now)
                    results = results & "Ord " & ws.Cells(i, COL_ORDNO).Value & _
                              " | Karigar: " & ws.Cells(i, COL_KARIGAR).Value & _
                              " | " & overdue & " days overdue" & vbCrLf
                End If
            End If
        End If
    Next i
    
    If count = 0 Then
        MsgBox "✅ No SLA breaches! All printed POs are within 2-day handover window.", vbInformation, "SLA Check"
    Else
        MsgBox "⚠️ " & count & " PO(s) BREACHED SLA!" & vbCrLf & _
               "(Printed but not issued to karigar within " & SLA_DAYS & " days)" & vbCrLf & vbCrLf & _
               results, vbCritical, "SLA BREACHED!"
    End If
End Sub


' ── REPRINT REQUEST ────────────────────────────────────────
Sub ReprintRequest()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("PO_MASTER")
    
    Dim sel As Range
    Set sel = Selection
    
    If sel Is Nothing Then
        MsgBox "Select the PO row to reprint.", vbExclamation
        Exit Sub
    End If
    
    Dim rowNum As Long
    rowNum = sel.Row
    
    If ws.Cells(rowNum, COL_STATUS).Value <> "PRINTED" And _
       ws.Cells(rowNum, COL_STATUS).Value <> "ISSUED" Then
        MsgBox "This PO is not in PRINTED or ISSUED status. Cannot reprint.", vbExclamation
        Exit Sub
    End If
    
    Dim ans As VbMsgBoxResult
    ans = MsgBox("⚠️ WARNING: This PO was already printed!" & vbCrLf & vbCrLf & _
                 "Ord No: " & ws.Cells(rowNum, COL_ORDNO).Value & vbCrLf & _
                 "Printed on: " & ws.Cells(rowNum, COL_PRINTED_AT).Value & vbCrLf & vbCrLf & _
                 "Are you sure you want to REPRINT?", vbYesNo + vbExclamation, "REPRINT CONFIRMATION")
    
    If ans = vbYes Then
        Dim reason As String
        reason = InputBox("Enter reason for reprint:", "Reprint Reason")
        If reason = "" Then Exit Sub
        
        ' Reset to PENDING
        ws.Cells(rowNum, COL_STATUS).Value = "PENDING"
        ws.Cells(rowNum, COL_PRINTED_AT).Value = ""
        ws.Cells(rowNum, COL_PRINTED_BY).Value = ""
        ws.Cells(rowNum, COL_SLA_DUE).Value = ""
        ws.Cells(rowNum, COL_REMARKS).Value = "REPRINT: " & reason & " (" & Environ("USERNAME") & " " & Format(Now, "dd-mmm hh:mm") & ")"
        
        Call ColorCodeMaster
        MsgBox "PO reset to PENDING. You can now print it again.", vbInformation
    End If
End Sub


' ── SHOW ALL MACROS MENU ───────────────────────────────────
Sub ShowMenu()
    Dim msg As String
    msg = "PO MANAGEMENT SYSTEM - COMMANDS" & vbCrLf & _
          String(40, "=") & vbCrLf & vbCrLf & _
          "IMPORT:" & vbCrLf & _
          "  ImportPastedData    - Import from IMPORT sheet" & vbCrLf & vbCrLf & _
          "ACTIONS (select rows first):" & vbCrLf & _
          "  PrintSelected       - Mark as Printed" & vbCrLf & _
          "  IssueToKarigar      - Handover to Karigar" & vbCrLf & _
          "  MarkComplete        - Mark as Completed" & vbCrLf & _
          "  ReprintRequest      - Request reprint" & vbCrLf & vbCrLf & _
          "FILTERS:" & vbCrLf & _
          "  FilterApprovedOnly  - Show approved pending" & vbCrLf & _
          "  FilterPrinted       - Show printed POs" & vbCrLf & _
          "  FilterIssued        - Show issued POs" & vbCrLf & _
          "  ClearFilters        - Show all" & vbCrLf & vbCrLf & _
          "TOOLS:" & vbCrLf & _
          "  SearchPO            - Search by Ord/Style/Factory" & vbCrLf & _
          "  CheckDuplicate      - Check if PO exists" & vbCrLf & _
          "  CheckSLABreached    - Show overdue POs" & vbCrLf & _
          "  GenerateDailyReport - End of day report" & vbCrLf & _
          "  UpdateDashboard     - Refresh stats" & vbCrLf & _
          "  ShowMenu            - This menu" & vbCrLf & vbCrLf & _
          "Run any command: Alt+F8 → type name → Run"
    
    MsgBox msg, vbInformation, "PO Management System"
End Sub
