import { useState, useMemo, useRef } from 'react';
import {
  Box, Paper, Typography, Button, Checkbox, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, FormControl, InputLabel, Select,
  MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Chip, Stack
} from '@mui/material';
import { Handshake, Draw, CheckCircle } from '@mui/icons-material';
import SignatureCanvas from 'react-signature-canvas';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';

export default function HandoverModule() {
  const { pos, karigars, issuePOs } = useApp();
  const { user } = useAuth();
  const [selected, setSelected] = useState([]);
  const [karigar, setKarigar] = useState('');
  const [showSignature, setShowSignature] = useState(false);
  const sigRef = useRef(null);

  const printedPOs = useMemo(() =>
    pos.filter(p => p.poStatus === 'PRINTED'),
    [pos]
  );

  const issuedPOs = useMemo(() =>
    pos.filter(p => p.poStatus === 'ISSUED'),
    [pos]
  );

  const handleSelectAll = (e) => {
    setSelected(e.target.checked ? printedPOs.map(p => p.id) : []);
  };

  const handleSelect = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleIssue = () => {
    if (!karigar || selected.length === 0) return;
    setShowSignature(true);
  };

  const handleConfirmIssue = () => {
    const signature = sigRef.current?.toDataURL() || '';
    issuePOs(selected, karigar, signature, user);
    setSelected([]);
    setKarigar('');
    setShowSignature(false);
  };

  const totalQty = useMemo(() =>
    printedPOs.filter(p => selected.includes(p.id)).reduce((sum, p) => sum + p.prodQty, 0),
    [printedPOs, selected]
  );

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>Karigar Handover</Typography>
      <Typography color="text.secondary" gutterBottom>
        Issue printed POs to karigars with digital signature
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 2 }}>
          <FormControl sx={{ minWidth: 200 }} size="small">
            <InputLabel>Select Karigar</InputLabel>
            <Select value={karigar} label="Select Karigar" onChange={(e) => setKarigar(e.target.value)}>
              {karigars.map(k => <MenuItem key={k} value={k}>{k}</MenuItem>)}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            startIcon={<Handshake />}
            onClick={handleIssue}
            disabled={selected.length === 0 || !karigar}
            size="large"
            color="secondary"
          >
            Issue to Karigar ({selected.length})
          </Button>

          {selected.length > 0 && (
            <Stack direction="row" spacing={1}>
              <Chip label={`Selected: ${selected.length}`} color="primary" />
              <Chip label={`Total Qty: ${totalQty}`} color="info" />
            </Stack>
          )}
        </Box>

        {printedPOs.length === 0 ? (
          <Alert severity="info">No printed POs available for handover. Print POs first.</Alert>
        ) : (
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selected.length === printedPOs.length && printedPOs.length > 0}
                      indeterminate={selected.length > 0 && selected.length < printedPOs.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>Ord No</TableCell>
                  <TableCell>Style No</TableCell>
                  <TableCell>Buyer</TableCell>
                  <TableCell>Qty</TableCell>
                  <TableCell>Printed At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {printedPOs.map(po => (
                  <TableRow key={po.id} hover selected={selected.includes(po.id)}>
                    <TableCell padding="checkbox">
                      <Checkbox checked={selected.includes(po.id)} onChange={() => handleSelect(po.id)} />
                    </TableCell>
                    <TableCell>{po.ordNo}</TableCell>
                    <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {po.styleNo}
                    </TableCell>
                    <TableCell>{po.buyerName}</TableCell>
                    <TableCell>{po.prodQty}</TableCell>
                    <TableCell>{po.printedAt ? new Date(po.printedAt).toLocaleString() : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Already Issued Section */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          <CheckCircle color="success" sx={{ verticalAlign: 'middle', mr: 1 }} />
          Recently Issued ({issuedPOs.length})
        </Typography>
        <TableContainer sx={{ maxHeight: 250 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Ord No</TableCell>
                <TableCell>Style No</TableCell>
                <TableCell>Karigar</TableCell>
                <TableCell>Issued At</TableCell>
                <TableCell>Issued By</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {issuedPOs.slice(0, 20).map(po => (
                <TableRow key={po.id}>
                  <TableCell>{po.ordNo}</TableCell>
                  <TableCell sx={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {po.styleNo}
                  </TableCell>
                  <TableCell>{po.karigar}</TableCell>
                  <TableCell>{po.issuedAt ? new Date(po.issuedAt).toLocaleString() : '-'}</TableCell>
                  <TableCell>{po.issuedBy}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Signature Dialog */}
      <Dialog open={showSignature} onClose={() => setShowSignature(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Draw sx={{ verticalAlign: 'middle', mr: 1 }} />
          Digital Signature - {karigar}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Issuing {selected.length} PO(s) to <strong>{karigar}</strong> | Total Qty: {totalQty}
          </Alert>
          <Typography variant="body2" gutterBottom>
            Karigar Signature (sign below):
          </Typography>
          <Box
            sx={{
              border: '2px solid',
              borderColor: 'divider',
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: 'white',
            }}
          >
            <SignatureCanvas
              ref={sigRef}
              penColor="black"
              canvasProps={{
                width: 460,
                height: 200,
                style: { width: '100%', height: 200 },
              }}
            />
          </Box>
          <Button size="small" onClick={() => sigRef.current?.clear()} sx={{ mt: 1 }}>
            Clear Signature
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSignature(false)}>Cancel</Button>
          <Button variant="contained" color="secondary" onClick={handleConfirmIssue}>
            Confirm Handover
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
