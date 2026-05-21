import { useState, useMemo } from 'react';
import {
  Box, Paper, Typography, Button, Checkbox, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, Chip, Stack
} from '@mui/material';
import { CheckCircle, Done } from '@mui/icons-material';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import POSearchBar from '../common/POSearchBar';

export default function CompletionModule() {
  const { pos, completePOs } = useApp();
  const { user } = useAuth();
  const [selected, setSelected] = useState([]);
  const [showComplete, setShowComplete] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [filteredPos, setFilteredPos] = useState(pos);

  const issuedPOs = useMemo(() =>
    filteredPos.filter(p => p.poStatus === 'ISSUED'),
    [filteredPos]
  );

  const completedPOs = useMemo(() =>
    filteredPos.filter(p => p.poStatus === 'COMPLETED'),
    [filteredPos]
  );

  const handleSelectAll = (e) => {
    setSelected(e.target.checked ? issuedPOs.map(p => p.id) : []);
  };

  const handleSelect = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleComplete = () => {
    if (selected.length === 0) return;
    setShowComplete(true);
  };

  const confirmComplete = () => {
    completePOs(selected, remarks, user);
    setSelected([]);
    setRemarks('');
    setShowComplete(false);
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>Completion Module</Typography>
      <Typography color="text.secondary" gutterBottom>
        Mark issued POs as completed when work is done
      </Typography>
      <POSearchBar pos={pos} onFilter={setFilteredPos} defaultStatus="ISSUED" />

      {/* Status Flow */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: 'action.hover' }}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" flexWrap="wrap" useFlexGap>
          <Chip label="PENDING" color="warning" />
          <Typography>→</Typography>
          <Chip label="PRINTED" color="info" />
          <Typography>→</Typography>
          <Chip label="ISSUED" color="secondary" />
          <Typography>→</Typography>
          <Chip label="COMPLETED" color="success" icon={<Done />} />
        </Stack>
      </Paper>

      {/* Issued POs */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Issued to Karigar - Pending Completion ({issuedPOs.length})
          </Typography>
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircle />}
            onClick={handleComplete}
            disabled={selected.length === 0}
            size="large"
          >
            Mark Complete ({selected.length})
          </Button>
        </Box>

        {issuedPOs.length === 0 ? (
          <Alert severity="info">No POs pending completion.</Alert>
        ) : (
          <TableContainer sx={{ maxHeight: 350 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selected.length === issuedPOs.length && issuedPOs.length > 0}
                      indeterminate={selected.length > 0 && selected.length < issuedPOs.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>Ord No</TableCell>
                  <TableCell>Style No</TableCell>
                  <TableCell>Karigar</TableCell>
                  <TableCell>Qty</TableCell>
                  <TableCell>Issued At</TableCell>
                  <TableCell>Days</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {issuedPOs.map(po => {
                  const days = po.issuedAt
                    ? Math.floor((Date.now() - new Date(po.issuedAt).getTime()) / (1000 * 60 * 60 * 24))
                    : 0;
                  return (
                    <TableRow key={po.id} hover selected={selected.includes(po.id)}>
                      <TableCell padding="checkbox">
                        <Checkbox checked={selected.includes(po.id)} onChange={() => handleSelect(po.id)} />
                      </TableCell>
                      <TableCell>{po.ordNo}</TableCell>
                      <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {po.styleNo}
                      </TableCell>
                      <TableCell>{po.karigar}</TableCell>
                      <TableCell>{po.prodQty}</TableCell>
                      <TableCell>{po.issuedAt ? new Date(po.issuedAt).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={`${days}d`}
                          size="small"
                          color={days > 5 ? 'error' : days > 2 ? 'warning' : 'default'}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Completed Section */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          <Done color="success" sx={{ verticalAlign: 'middle', mr: 1 }} />
          Completed ({completedPOs.length})
        </Typography>
        <TableContainer sx={{ maxHeight: 250 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Ord No</TableCell>
                <TableCell>Style No</TableCell>
                <TableCell>Karigar</TableCell>
                <TableCell>Completed At</TableCell>
                <TableCell>Remarks</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {completedPOs.slice(0, 20).map(po => (
                <TableRow key={po.id}>
                  <TableCell>{po.ordNo}</TableCell>
                  <TableCell sx={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {po.styleNo}
                  </TableCell>
                  <TableCell>{po.karigar}</TableCell>
                  <TableCell>{po.completedAt ? new Date(po.completedAt).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>{po.remarks || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Completion Dialog */}
      <Dialog open={showComplete} onClose={() => setShowComplete(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Completion</DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            Marking {selected.length} PO(s) as completed.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Remarks (optional)"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Add any production notes or comments..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowComplete(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={confirmComplete}>
            Confirm Complete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
