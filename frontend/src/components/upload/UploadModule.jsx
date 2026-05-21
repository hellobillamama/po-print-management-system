import { useState, useCallback } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Alert, Chip, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, Tab, Tabs, LinearProgress
} from '@mui/material';
import { CloudUpload, ContentPaste, Warning, CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';

const EXPECTED_COLUMNS = ['Factory', 'Ord Type', 'Ord No', 'Ord Dt', 'Our Ref', 'EO No', 'Style No', 'Prod Qty', 'Approval Status'];

export default function UploadModule() {
  const [tabValue, setTabValue] = useState(0);
  const [pasteText, setPasteText] = useState('');
  const [parsedData, setParsedData] = useState([]);
  const [errors, setErrors] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [processing, setProcessing] = useState(false);
  const { importPOs, pos } = useApp();
  const { user } = useAuth();

  const parseData = useCallback((rows) => {
    const validRows = [];
    const errorRows = [];
    const dupeRows = [];
    const existingKeys = new Set(pos.map(p => `${p.ordNo}-${p.styleNo}-${p.eoNo}`));

    rows.forEach((row, idx) => {
      const issues = [];
      if (!row.ordNo && !row['Ord No']) issues.push('Missing Ord No');
      if (!row.styleNo && !row['Style No']) issues.push('Missing Style No');

      const mapped = {
        factory: row.Factory || row.factory || '',
        ordType: row['Ord Type'] || row.ordType || '',
        ordNo: String(row['Ord No'] || row.ordNo || ''),
        ordDt: row['Ord Dt'] || row.ordDt || '',
        ourRef: String(row['Our Ref'] || row.ourRef || ''),
        eoNo: row['EO No'] || row.eoNo || '',
        styleNo: row['Style No'] || row.styleNo || '',
        prodQty: parseInt(row['Prod Qty'] || row.prodQty) || 0,
        approvalStatus: row['Approval Status'] || row.approvalStatus || 'Not Approved',
        buyerName: row['Buyer Name'] || row.buyerName || row.Factory || '',
      };

      if (issues.length > 0) {
        errorRows.push({ ...mapped, row: idx + 1, issues });
      } else {
        const key = `${mapped.ordNo}-${mapped.styleNo}-${mapped.eoNo}`;
        if (existingKeys.has(key)) {
          dupeRows.push({ ...mapped, row: idx + 1 });
        } else {
          validRows.push(mapped);
          existingKeys.add(key);
        }
      }
    });

    setParsedData(validRows);
    setErrors(errorRows);
    setDuplicates(dupeRows);
    setShowPreview(true);
  }, [pos]);

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;
    setProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);
        parseData(data);
      } catch (err) {
        setErrors([{ issues: ['Failed to parse file: ' + err.message] }]);
        setShowPreview(true);
      } finally {
        setProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [parseData]);

  const handlePasteImport = useCallback(() => {
    if (!pasteText.trim()) return;
    setProcessing(true);

    try {
      const lines = pasteText.trim().split('\n');
      if (lines.length < 2) {
        setErrors([{ issues: ['Need at least header + 1 data row'] }]);
        setShowPreview(true);
        setProcessing(false);
        return;
      }

      const headers = lines[0].split('\t').map(h => h.trim());
      const rows = lines.slice(1).map(line => {
        const values = line.split('\t');
        const obj = {};
        headers.forEach((h, i) => { obj[h] = values[i]?.trim() || ''; });
        return obj;
      });

      parseData(rows);
    } catch (err) {
      setErrors([{ issues: ['Parse error: ' + err.message] }]);
      setShowPreview(true);
    } finally {
      setProcessing(false);
    }
  }, [pasteText, parseData]);

  const handleImport = useCallback((approvedOnly = false) => {
    let dataToImport = parsedData;
    if (approvedOnly) {
      dataToImport = parsedData.filter(d => d.approvalStatus === 'Approved');
    }
    const result = importPOs(dataToImport, user);
    setImportResult(result);
    setShowPreview(false);
    setParsedData([]);
    setPasteText('');
  }, [parsedData, importPOs, user]);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>Upload PO Report</Typography>
      <Typography color="text.secondary" gutterBottom>
        Upload Excel/CSV file or paste tab-separated data from Visual Gems
      </Typography>

      <Paper sx={{ p: 3, mt: 2 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
          <Tab icon={<CloudUpload />} label="File Upload" iconPosition="start" />
          <Tab icon={<ContentPaste />} label="Paste Text" iconPosition="start" />
        </Tabs>

        {tabValue === 0 && (
          <Box>
            <Box
              sx={{
                border: '2px dashed',
                borderColor: 'primary.main',
                borderRadius: 3,
                p: 5,
                textAlign: 'center',
                bgcolor: 'action.hover',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.selected' },
              }}
              component="label"
            >
              <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6">Drop Excel/CSV file here or click to upload</Typography>
              <Typography variant="body2" color="text.secondary">
                Supports .xlsx, .xls, .csv formats
              </Typography>
              <input type="file" hidden accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
            </Box>
          </Box>
        )}

        {tabValue === 1 && (
          <Box>
            <TextField
              fullWidth
              multiline
              rows={10}
              placeholder={`Paste Visual Gems Report Here\n\nExample:\nFactory\tOrd Type\tOrd No\tOrd Dt\tOur Ref\tEO No\tStyle No\tProd Qty\tApproval Status\nINHOUSE KARIGAR\tZARI\t13971\t10-Nov-25\t11407\tPIDG25038\t1125PIDG25038BRCL01\t1\tApproved`}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              sx={{ mb: 2, fontFamily: 'monospace' }}
            />
            <Button
              variant="contained"
              onClick={handlePasteImport}
              disabled={!pasteText.trim() || processing}
              startIcon={<ContentPaste />}
              size="large"
            >
              Parse & Preview
            </Button>
          </Box>
        )}

        {processing && <LinearProgress sx={{ mt: 2 }} />}
      </Paper>

      {importResult && (
        <Alert
          severity={importResult.imported > 0 ? 'success' : 'warning'}
          sx={{ mt: 2 }}
          onClose={() => setImportResult(null)}
        >
          {importResult.imported > 0
            ? `Successfully imported ${importResult.imported} PO(s).`
            : 'No new POs imported.'}
          {importResult.duplicates > 0 && ` ${importResult.duplicates} duplicate(s) skipped.`}
        </Alert>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onClose={() => setShowPreview(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Import Preview</DialogTitle>
        <DialogContent>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Chip icon={<CheckCircle />} label={`Valid: ${parsedData.length}`} color="success" />
            <Chip
              icon={<CheckCircle />}
              label={`Approved: ${parsedData.filter(d => d.approvalStatus === 'Approved').length}`}
              color="primary"
            />
            <Chip icon={<Warning />} label={`Duplicates: ${duplicates.length}`} color="warning" />
            <Chip icon={<ErrorIcon />} label={`Errors: ${errors.length}`} color="error" />
          </Stack>

          {duplicates.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <strong>{duplicates.length} duplicate PO(s) detected!</strong> These will be skipped.
            </Alert>
          )}

          {errors.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errors.length} row(s) have errors: {errors.map(e => e.issues?.join(', ')).join('; ')}
            </Alert>
          )}

          {parsedData.length > 0 && (
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Ord No</TableCell>
                    <TableCell>Style No</TableCell>
                    <TableCell>EO No</TableCell>
                    <TableCell>Factory</TableCell>
                    <TableCell>Qty</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parsedData.slice(0, 50).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row.ordNo}</TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.styleNo}
                      </TableCell>
                      <TableCell>{row.eoNo}</TableCell>
                      <TableCell>{row.factory}</TableCell>
                      <TableCell>{row.prodQty}</TableCell>
                      <TableCell>
                        <Chip
                          label={row.approvalStatus}
                          size="small"
                          color={row.approvalStatus === 'Approved' ? 'success' : 'default'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {parsedData.length > 50 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Showing 50 of {parsedData.length} rows
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowPreview(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleImport(true)}
            disabled={parsedData.filter(d => d.approvalStatus === 'Approved').length === 0}
          >
            Import Approved Only ({parsedData.filter(d => d.approvalStatus === 'Approved').length})
          </Button>
          <Button
            variant="contained"
            onClick={() => handleImport(false)}
            disabled={parsedData.length === 0}
          >
            Import All ({parsedData.length})
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
