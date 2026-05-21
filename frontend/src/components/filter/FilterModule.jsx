import { useState, useMemo } from 'react';
import {
  Box, Paper, Typography, TextField, Grid, Chip, Stack, FormControl,
  InputLabel, Select, MenuItem, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, IconButton, Tooltip, InputAdornment
} from '@mui/material';
import { Search, FilterList, PriorityHigh } from '@mui/icons-material';
import { useApp } from '../../contexts/AppContext';

const STATUS_COLORS = {
  PENDING: 'warning',
  PRINTED: 'info',
  ISSUED: 'secondary',
  COMPLETED: 'success',
};

const APPROVAL_COLORS = {
  Approved: 'success',
  'Not Approved': 'error',
  Pending: 'warning',
};

export default function FilterModule() {
  const { pos } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [approvalFilter, setApprovalFilter] = useState('ALL');
  const [karigarFilter, setKarigarFilter] = useState('ALL');
  const [buyerFilter, setBuyerFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const karigars = useMemo(() => [...new Set(pos.filter(p => p.karigar).map(p => p.karigar))], [pos]);
  const buyers = useMemo(() => [...new Set(pos.map(p => p.buyerName).filter(Boolean))], [pos]);

  const filteredPOs = useMemo(() => {
    return pos.filter(po => {
      if (search) {
        const s = search.toLowerCase();
        const match = [po.ordNo, po.styleNo, po.eoNo, po.buyerName, po.karigar, po.factory]
          .some(f => f?.toLowerCase().includes(s));
        if (!match) return false;
      }
      if (statusFilter !== 'ALL' && po.poStatus !== statusFilter) return false;
      if (approvalFilter !== 'ALL' && po.approvalStatus !== approvalFilter) return false;
      if (karigarFilter !== 'ALL' && po.karigar !== karigarFilter) return false;
      if (buyerFilter !== 'ALL' && po.buyerName !== buyerFilter) return false;
      if (dateFrom && po.ordDt < dateFrom) return false;
      if (dateTo && po.ordDt > dateTo) return false;
      return true;
    });
  }, [pos, search, statusFilter, approvalFilter, karigarFilter, buyerFilter, dateFrom, dateTo]);

  const statusCounts = useMemo(() => ({
    ALL: pos.length,
    PENDING: pos.filter(p => p.poStatus === 'PENDING').length,
    PRINTED: pos.filter(p => p.poStatus === 'PRINTED').length,
    ISSUED: pos.filter(p => p.poStatus === 'ISSUED').length,
    COMPLETED: pos.filter(p => p.poStatus === 'COMPLETED').length,
  }), [pos]);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>Filter & Search PO</Typography>

      {/* Quick filter chips */}
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }} useFlexGap>
        {Object.entries(statusCounts).map(([key, count]) => (
          <Chip
            key={key}
            label={`${key} (${count})`}
            onClick={() => setStatusFilter(key)}
            color={key === statusFilter ? (STATUS_COLORS[key] || 'primary') : 'default'}
            variant={key === statusFilter ? 'filled' : 'outlined'}
          />
        ))}
      </Stack>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search PO No, Style, Buyer, Karigar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search /></InputAdornment>
              }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Approval</InputLabel>
              <Select value={approvalFilter} label="Approval" onChange={(e) => setApprovalFilter(e.target.value)}>
                <MenuItem value="ALL">All</MenuItem>
                <MenuItem value="Approved">Approved</MenuItem>
                <MenuItem value="Not Approved">Not Approved</MenuItem>
                <MenuItem value="Pending">Pending</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Karigar</InputLabel>
              <Select value={karigarFilter} label="Karigar" onChange={(e) => setKarigarFilter(e.target.value)}>
                <MenuItem value="ALL">All</MenuItem>
                {karigars.map(k => <MenuItem key={k} value={k}>{k}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Buyer</InputLabel>
              <Select value={buyerFilter} label="Buyer" onChange={(e) => setBuyerFilter(e.target.value)}>
                <MenuItem value="ALL">All</MenuItem>
                {buyers.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="From"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Results Table */}
      <Paper>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 380px)' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Ord No</TableCell>
                <TableCell>Style No</TableCell>
                <TableCell>Buyer</TableCell>
                <TableCell>Qty</TableCell>
                <TableCell>Approval</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Karigar</TableCell>
                <TableCell>Priority</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPOs
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((po) => (
                  <TableRow key={po.id} hover>
                    <TableCell>{po.ordNo}</TableCell>
                    <TableCell sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {po.styleNo}
                    </TableCell>
                    <TableCell>{po.buyerName}</TableCell>
                    <TableCell>{po.prodQty}</TableCell>
                    <TableCell>
                      <Chip label={po.approvalStatus} size="small" color={APPROVAL_COLORS[po.approvalStatus] || 'default'} />
                    </TableCell>
                    <TableCell>
                      <Chip label={po.poStatus} size="small" color={STATUS_COLORS[po.poStatus] || 'default'} variant="outlined" />
                    </TableCell>
                    <TableCell>{po.karigar || '-'}</TableCell>
                    <TableCell>
                      {po.priority === 'HIGH' && (
                        <Tooltip title="High Priority">
                          <PriorityHigh color="error" fontSize="small" />
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredPOs.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Paper>
    </Box>
  );
}
