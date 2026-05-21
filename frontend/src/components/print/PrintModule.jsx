import { useState, useMemo } from 'react';
import {
  Box, Paper, Typography, Button, Checkbox, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Stack, TablePagination
} from '@mui/material';
import { Print, Lock, Warning, QrCode } from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';

export default function PrintModule() {
  const { pos, printPOs, requestReprint } = useApp();
  const { user, hasPermission } = useAuth();
  const [selected, setSelected] = useState([]);
  const [showQR, setShowQR] = useState(null);
  const [reprintDialog, setReprintDialog] = useState(null);
  const [reprintReason, setReprintReason] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const printablePOs = useMemo(() =>
    pos.filter(p => p.approvalStatus === 'Approved' && p.poStatus === 'PENDING'),
    [pos]
  );

  const printedPOs = useMemo(() =>
    pos.filter(p => p.poStatus === 'PRINTED' || p.poStatus === 'ISSUED' || p.poStatus === 'COMPLETED'),
    [pos]
  );

  const handleSelectAll = (e) => {
    setSelected(e.target.checked ? printablePOs.map(p => p.id) : []);
  };

  const handleSelect = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handlePrint = () => {
    if (selected.length === 0) return;
    printPOs(selected, user);
    setSelected([]);
  };

  const handleReprint = () => {
    if (!reprintDialog || !reprintReason.trim()) return;
    requestReprint(reprintDialog, reprintReason, user);
    setReprintDialog(null);
    setReprintReason('');
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>Print Management</Typography>

      {/* Printable POs Section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Ready to Print ({printablePOs.length})
          </Typography>
          <Button
            variant="contained"
            startIcon={<Print />}
            onClick={handlePrint}
            disabled={selected.length === 0}
            size="large"
            sx={{ px: 4 }}
          >
            Print Selected ({selected.length})
          </Button>
        </Box>

        {printablePOs.length === 0 ? (
          <Alert severity="info">No POs ready for printing. Upload and approve POs first.</Alert>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selected.length === printablePOs.length && printablePOs.length > 0}
                        indeterminate={selected.length > 0 && selected.length < printablePOs.length}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell>Ord No</TableCell>
                    <TableCell>Style No</TableCell>
                    <TableCell>Buyer</TableCell>
                    <TableCell>Qty</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>QR</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {printablePOs
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map(po => (
                      <TableRow
                        key={po.id}
                        hover
                        selected={selected.includes(po.id)}
                        sx={po.priority === 'HIGH' ? { bgcolor: 'error.light', '&:hover': { bgcolor: 'error.light' } } : {}}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selected.includes(po.id)}
                            onChange={() => handleSelect(po.id)}
                          />
                        </TableCell>
                        <TableCell>{po.ordNo}</TableCell>
                        <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {po.styleNo}
                        </TableCell>
                        <TableCell>{po.buyerName}</TableCell>
                        <TableCell>{po.prodQty}</TableCell>
                        <TableCell>
                          {po.priority === 'HIGH' && <Chip label="HIGH" size="small" color="error" />}
                        </TableCell>
                        <TableCell>
                          <QrCode
                            fontSize="small"
                            sx={{ cursor: 'pointer', color: 'primary.main' }}
                            onClick={() => setShowQR(po)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={printablePOs.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
              rowsPerPageOptions={[10, 25, 50]}
            />
          </>
        )}
      </Paper>

      {/* Already Printed Section */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Already Printed ({printedPOs.length})
        </Typography>
        <TableContainer sx={{ maxHeight: 300 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Ord No</TableCell>
                <TableCell>Style No</TableCell>
                <TableCell>Printed At</TableCell>
                <TableCell>Printed By</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {printedPOs.slice(0, 50).map(po => (
                <TableRow key={po.id}>
                  <TableCell>{po.ordNo}</TableCell>
                  <TableCell sx={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {po.styleNo}
                  </TableCell>
                  <TableCell>{po.printedAt ? new Date(po.printedAt).toLocaleString() : '-'}</TableCell>
                  <TableCell>{po.printedBy || '-'}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Lock fontSize="small" color="action" />
                      <Chip label={po.poStatus} size="small" color="info" variant="outlined" />
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      color="warning"
                      variant="outlined"
                      onClick={() => setReprintDialog(po.id)}
                      startIcon={<Warning />}
                    >
                      Reprint
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* QR Code Dialog */}
      <Dialog open={!!showQR} onClose={() => setShowQR(null)}>
        <DialogTitle>QR Code - PO #{showQR?.ordNo}</DialogTitle>
        <DialogContent sx={{ textAlign: 'center', p: 4 }}>
          {showQR && (
            <QRCodeSVG
              value={`PO:${showQR.ordNo}|STYLE:${showQR.styleNo}|EO:${showQR.eoNo}`}
              size={200}
            />
          )}
          <Typography variant="body2" sx={{ mt: 2 }}>
            {showQR?.styleNo}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowQR(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Reprint Dialog */}
      <Dialog open={!!reprintDialog} onClose={() => setReprintDialog(null)}>
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <Warning color="warning" />
            <span>Reprint Request</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            THIS PO WAS ALREADY PRINTED. Reprint requires admin approval and will be logged.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason for reprint"
            value={reprintReason}
            onChange={(e) => setReprintReason(e.target.value)}
            placeholder="Enter reason for reprint..."
          />
          {!hasPermission(['Admin']) && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Only Admin can approve reprints. This request will be sent for approval.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setReprintDialog(null); setReprintReason(''); }}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleReprint}
            disabled={!reprintReason.trim()}
          >
            {hasPermission(['Admin']) ? 'Approve & Reprint' : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
