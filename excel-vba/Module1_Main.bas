'=============================================================
' PO PRINT MANAGEMENT SYSTEM - MAIN MODULE
' Version 1.0
' Paste this into Module1 in VBA Editor (Alt+F11)
'=============================================================

Option Explicit

' ── CONSTANTS ──────────────────────────────────────────────
Public Const SLA_DAYS As Integer = 2
Public Const COL_ID As Integer = 1
Public Const COL_ORDNO As Integer = 2
Public Const COL_ORDTYPE As Integer = 3
Public Const COL_FACTORY As Integer = 4
Public Const COL_ORDDT As Integer = 5
Public Const COL_OURREF As Integer = 6
Public Const COL_EONO As Integer = 7
Public Const COL_STYLENO As Integer = 8
Public Const COL_QTY As Integer = 9
Public Const COL_APPROVAL As Integer = 10
Public Const COL_STATUS As Integer = 11
Public Const COL_KARIGAR As Integer = 12
Public Const COL_PRINTED_AT As Integer = 13
Public Const COL_PRINTED_BY As Integer = 14
Public Const COL_SLA_DUE As Integer = 15
Public Const COL_ISSUED_AT As Integer = 16
Public Const COL_ISSUED_BY As Integer = 17
Public Const COL_COMPLETED_AT As Integer = 18
Public Const COL_REMARKS As Integer = 19
Public Const COL_UPLOADED_AT As Integer = 20


' ── IMPORT PASTED DATA ─────────────────────────────────────
Sub ImportPastedData()
    Dim wsImport As Worksheet, wsMaster As Worksheet
    Dim lastRowImport As Long, lastRowMaster As Long
    Dim i As Long, imported As Long, duplicates As Long, updated As Long
    Dim ordNo As String, styleNo As String, eoNo As String, uniqueKey As String
    Dim approval As String, factory As String
    Dim existingKeys As Object
    
    Set wsImport = ThisWorkbook.Sheets("IMPORT")
    Set wsMaster = ThisWorkbook.Sheets("PO_MASTER")
    Set existingKeys = CreateObject("Scripting.Dictionary")
    
    ' Find last rows
    lastRowImport = wsImport.Cells(wsImport.Rows.Count, 1).End(xlUp).Row
    lastRowMaster = wsMaster.Cells(wsMaster.Rows.Count, 1).End(xlUp).Row
    
    If lastRowImport < 2 Then
        MsgBox "No data found in IMPORT sheet. Please paste your Visual Gems report first.", vbExclamation
        Exit Sub
    End If
    
    ' Build dictionary of existing POs
    Dim r As Long
    For r = 2 To lastRowMaster
        uniqueKey = wsMaster.Cells(r, COL_ORDNO).Value & "-" & wsMaster.Cells(r, COL_STYLENO).Value & "-" & wsMaster.Cells(r, COL_EONO).Value
        If uniqueKey <> "--" Then
            existingKeys(uniqueKey) = r  ' Store row number
        End If
    Next r
    
    imported = 0
    duplicates = 0
    updated = 0
    
    ' Process each row in import
    Application.ScreenUpdating = False
    For i = 2 To lastRowImport
        ' Read import row
        factory = Trim(wsImport.Cells(i, 1).Value)    ' Factory
        ordNo = Trim(CStr(wsImport.Cells(i, 3).Value))  ' Ord No
        eoNo = Trim(wsImport.Cells(i, 6).Value)      ' EO No
        styleNo = Trim(wsImport.Cells(i, 7).Value)   ' Style No
        approval = Trim(wsImport.Cells(i, 9).Value)   ' Approval Status
        
        If ordNo = "" Or styleNo = "" Then GoTo NextRow
        
        uniqueKey = ordNo & "-" & styleNo & "-" & eoNo
        
        If existingKeys.Exists(uniqueKey) Then
            ' Check if approval status changed
            Dim existRow As Long
            existRow = existingKeys(uniqueKey)
            If wsMaster.Cells(existRow, COL_APPROVAL).Value <> approval And _
               wsMaster.Cells(existRow, COL_STATUS).Value = "PENDING" Then
                ' Update approval status
                wsMaster.Cells(existRow, COL_APPROVAL).Value = approval
                updated = updated + 1
            Else
                duplicates = duplicates + 1
            End If
        Else
            ' Add new PO
            lastRowMaster = lastRowMaster + 1
            wsMaster.Cells(lastRowMaster, COL_ID).Value = "PO-" & Format(Now, "yyyymmddhhnnss") & "-" & lastRowMaster
            wsMaster.Cells(lastRowMaster, COL_ORDNO).Value = ordNo
            wsMaster.Cells(lastRowMaster, COL_ORDTYPE).Value = Trim(wsImport.Cells(i, 2).Value)
            wsMaster.Cells(lastRowMaster, COL_FACTORY).Value = factory
            wsMaster.Cells(lastRowMaster, COL_ORDDT).Value = Trim(wsImport.Cells(i, 4).Value)
            wsMaster.Cells(lastRowMaster, COL_OURREF).Value = Trim(CStr(wsImport.Cells(i, 5).Value))
            wsMaster.Cells(lastRowMaster, COL_EONO).Value = eoNo
            wsMaster.Cells(lastRowMaster, COL_STYLENO).Value = styleNo
            wsMaster.Cells(lastRowMaster, COL_QTY).Value = Val(wsImport.Cells(i, 8).Value)
            wsMaster.Cells(lastRowMaster, COL_APPROVAL).Value = approval
            wsMaster.Cells(lastRowMaster, COL_STATUS).Value = "PENDING"
            wsMaster.Cells(lastRowMaster, COL_KARIGAR).Value = factory  ' Karigar = Factory
            wsMaster.Cells(lastRowMaster, COL_UPLOADED_AT).Value = Now
            
            existingKeys(uniqueKey) = lastRowMaster
            imported = imported + 1
        End If
NextRow:
    Next i
    
    Application.ScreenUpdating = True
    
    ' Clear import sheet (keep headers)
    If lastRowImport > 1 Then
        wsImport.Range(wsImport.Cells(2, 1), wsImport.Cells(lastRowImport, 20)).Clear
    End If
    
    ' Color code the PO_MASTER
    Call ColorCodeMaster
    
    ' Update dashboard
    Call UpdateDashboard
    
    MsgBox "Import Complete!" & vbCrLf & vbCrLf & _
           "New POs Imported: " & imported & vbCrLf & _
           "Status Updated: " & updated & vbCrLf & _
           "Duplicates Skipped: " & duplicates, vbInformation, "Import Result"
End Sub


' ── PRINT SELECTED POs ─────────────────────────────────────
Sub PrintSelected()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("PO_MASTER")
    
    Dim sel As Range
    Set sel = Selection
    
    If sel Is Nothing Then
        MsgBox "Please select rows to print.", vbExclamation
        Exit Sub
    End If
    
    Dim r As Range, count As Long, skipped As Long
    Dim wsLog As Worksheet
    Set wsLog = ThisWorkbook.Sheets("PRINT_LOG")
    Dim logRow As Long
    logRow = wsLog.Cells(wsLog.Rows.Count, 1).End(xlUp).Row + 1
    
    count = 0
    skipped = 0
    
    For Each r In sel.Rows
        Dim rowNum As Long
        rowNum = r.Row
        
        If rowNum < 2 Then GoTo NextPrintRow
        
        ' Only print PENDING + Approved
        If ws.Cells(rowNum, COL_STATUS).Value = "PENDING" And _
           ws.Cells(rowNum, COL_APPROVAL).Value = "Approved" Then
            
            ws.Cells(rowNum, COL_STATUS).Value = "PRINTED"
            ws.Cells(rowNum, COL_PRINTED_AT).Value = Now
            ws.Cells(rowNum, COL_PRINTED_BY).Value = Environ("USERNAME")
            ws.Cells(rowNum, COL_SLA_DUE).Value = Now + SLA_DAYS
            
            ' Log
            wsLog.Cells(logRow, 1).Value = ws.Cells(rowNum, COL_ID).Value
            wsLog.Cells(logRow, 2).Value = ws.Cells(rowNum, COL_ORDNO).Value
            wsLog.Cells(logRow, 3).Value = ws.Cells(rowNum, COL_STYLENO).Value
            wsLog.Cells(logRow, 4).Value = Now
            wsLog.Cells(logRow, 5).Value = Environ("USERNAME")
            logRow = logRow + 1
            count = count + 1
        Else
            skipped = skipped + 1
        End If
NextPrintRow:
    Next r
    
    Call ColorCodeMaster
    Call UpdateDashboard
    
    MsgBox "Printed: " & count & " PO(s)" & vbCrLf & _
           "Skipped: " & skipped & " (not approved or already printed)" & vbCrLf & _
           "SLA Due: " & Format(Now + SLA_DAYS, "dd-mmm-yyyy"), vbInformation, "Print Complete"
End Sub


' ── ISSUE TO KARIGAR ───────────────────────────────────────
Sub IssueToKarigar()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("PO_MASTER")
    
    Dim sel As Range
    Set sel = Selection
    
    If sel Is Nothing Then
        MsgBox "Please select rows to issue.", vbExclamation
        Exit Sub
    End If
    
    Dim r As Range, count As Long, skipped As Long
    Dim wsLog As Worksheet
    Set wsLog = ThisWorkbook.Sheets("ISSUE_LOG")
    Dim logRow As Long
    logRow = wsLog.Cells(wsLog.Rows.Count, 1).End(xlUp).Row + 1
    
    count = 0
    skipped = 0
    
    For Each r In sel.Rows
        Dim rowNum2 As Long
        rowNum2 = r.Row
        
        If rowNum2 < 2 Then GoTo NextIssueRow
        
        ' Only issue PRINTED POs
        If ws.Cells(rowNum2, COL_STATUS).Value = "PRINTED" Then
            ws.Cells(rowNum2, COL_STATUS).Value = "ISSUED"
            ws.Cells(rowNum2, COL_ISSUED_AT).Value = Now
            ws.Cells(rowNum2, COL_ISSUED_BY).Value = Environ("USERNAME")
            
            ' Log
            wsLog.Cells(logRow, 1).Value = ws.Cells(rowNum2, COL_ID).Value
            wsLog.Cells(logRow, 2).Value = ws.Cells(rowNum2, COL_ORDNO).Value
            wsLog.Cells(logRow, 3).Value = ws.Cells(rowNum2, COL_KARIGAR).Value
            wsLog.Cells(logRow, 4).Value = Now
            wsLog.Cells(logRow, 5).Value = Environ("USERNAME")
            wsLog.Cells(logRow, 6).Value = ws.Cells(rowNum2, COL_QTY).Value
            logRow = logRow + 1
            count = count + 1
        Else
            skipped = skipped + 1
        End If
NextIssueRow:
    Next r
    
    Call ColorCodeMaster
    Call UpdateDashboard
    
    MsgBox "Issued to Karigar: " & count & " PO(s)" & vbCrLf & _
           "Skipped: " & skipped & " (not printed yet)", vbInformation, "Handover Complete"
End Sub


' ── MARK COMPLETE ──────────────────────────────────────────
Sub MarkComplete()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("PO_MASTER")
    
    Dim sel As Range
    Set sel = Selection
    
    If sel Is Nothing Then
        MsgBox "Please select rows to complete.", vbExclamation
        Exit Sub
    End If
    
    Dim remarks As String
    remarks = InputBox("Enter completion remarks (optional):", "Completion Remarks")
    
    Dim r As Range, count As Long
    
    count = 0
    For Each r In sel.Rows
        Dim rowNum3 As Long
        rowNum3 = r.Row
        
        If rowNum3 < 2 Then GoTo NextCompleteRow
        
        If ws.Cells(rowNum3, COL_STATUS).Value = "ISSUED" Then
            ws.Cells(rowNum3, COL_STATUS).Value = "COMPLETED"
            ws.Cells(rowNum3, COL_COMPLETED_AT).Value = Now
            ws.Cells(rowNum3, COL_REMARKS).Value = remarks
            count = count + 1
        End If
NextCompleteRow:
    Next r
    
    Call ColorCodeMaster
    Call UpdateDashboard
    
    MsgBox "Completed: " & count & " PO(s)", vbInformation, "Completion Done"
End Sub


' ── DUPLICATE CHECK WARNING ────────────────────────────────
Sub CheckDuplicate()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("PO_MASTER")
    
    Dim ordNo As String
    ordNo = InputBox("Enter Ord No to check:", "Duplicate Check")
    If ordNo = "" Then Exit Sub
    
    Dim lastRow As Long, i As Long, found As Boolean
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    found = False
    
    For i = 2 To lastRow
        If CStr(ws.Cells(i, COL_ORDNO).Value) = ordNo Then
            MsgBox "⚠️ WARNING: PO " & ordNo & " ALREADY EXISTS!" & vbCrLf & vbCrLf & _
                   "Status: " & ws.Cells(i, COL_STATUS).Value & vbCrLf & _
                   "Style: " & ws.Cells(i, COL_STYLENO).Value & vbCrLf & _
                   "Factory: " & ws.Cells(i, COL_FACTORY).Value & vbCrLf & _
                   "Printed: " & ws.Cells(i, COL_PRINTED_AT).Value, vbCritical, "DUPLICATE FOUND!"
            found = True
            Exit For
        End If
    Next i
    
    If Not found Then
        MsgBox "✅ PO " & ordNo & " is NOT in the system. Safe to add.", vbInformation, "No Duplicate"
    End If
End Sub


' ── COLOR CODE MASTER SHEET ────────────────────────────────
Sub ColorCodeMaster()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("PO_MASTER")
    Dim lastRow As Long, i As Long
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    
    Application.ScreenUpdating = False
    For i = 2 To lastRow
        Dim status As String
        status = ws.Cells(i, COL_STATUS).Value
        
        Select Case status
            Case "PENDING"
                ws.Rows(i).Interior.Color = RGB(255, 255, 200)  ' Yellow
            Case "PRINTED"
                ws.Rows(i).Interior.Color = RGB(200, 230, 255)  ' Blue
            Case "ISSUED"
                ws.Rows(i).Interior.Color = RGB(230, 200, 255)  ' Purple
            Case "COMPLETED"
                ws.Rows(i).Interior.Color = RGB(200, 255, 200)  ' Green
            Case Else
                ws.Rows(i).Interior.ColorIndex = xlNone
        End Select
        
        ' Red highlight for NOT Approved
        If ws.Cells(i, COL_APPROVAL).Value = "Not Approved" Then
            ws.Cells(i, COL_APPROVAL).Font.Color = RGB(200, 0, 0)
            ws.Cells(i, COL_APPROVAL).Font.Bold = True
        End If
        
        ' SLA breached highlight
        If status = "PRINTED" And ws.Cells(i, COL_SLA_DUE).Value <> "" Then
            If ws.Cells(i, COL_SLA_DUE).Value < Now Then
                ws.Cells(i, COL_SLA_DUE).Interior.Color = RGB(255, 100, 100)
                ws.Cells(i, COL_SLA_DUE).Font.Bold = True
            End If
        End If
    Next i
    Application.ScreenUpdating = True
End Sub


' ── FILTER APPROVED ONLY ───────────────────────────────────
Sub FilterApprovedOnly()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("PO_MASTER")
    ws.AutoFilterMode = False
    ws.Range("A1").AutoFilter Field:=COL_APPROVAL, Criteria1:="Approved"
    ws.Range("A1").AutoFilter Field:=COL_STATUS, Criteria1:="PENDING"
End Sub

Sub FilterPrinted()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("PO_MASTER")
    ws.AutoFilterMode = False
    ws.Range("A1").AutoFilter Field:=COL_STATUS, Criteria1:="PRINTED"
End Sub

Sub FilterIssued()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("PO_MASTER")
    ws.AutoFilterMode = False
    ws.Range("A1").AutoFilter Field:=COL_STATUS, Criteria1:="ISSUED"
End Sub

Sub ClearFilters()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("PO_MASTER")
    ws.AutoFilterMode = False
End Sub
