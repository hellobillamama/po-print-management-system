import { useState, useMemo } from 'react';
import {
  Box, TextField, InputAdornment, Chip, Stack, FormControl,
  InputLabel, Select, MenuItem, Collapse, Button, Grid
} from '@mui/material';
import { Search, FilterList, Clear } from '@mui/icons-material';

const STATUS_COLORS = {
  ALL: 'default', PENDING: 'warning', PRINTED: 'info', ISSUED: 'secondary', COMPLETED: 'success',
};

export default function POSearchBar({ pos, onFilter, showStatusChips = true, defaultStatus = 'ALL' }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(defaultStatus);
  const [approvalFilter, setApprovalFilter] = useState('ALL');
  const [karigarFilter, setKarigarFilter] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);

  const karigars = useMemo(() => [...new Set(pos.filter(p => p.karigar).map(p => p.karigar))], [pos]);

  const statusCounts = useMemo(() => ({
    ALL: pos.length,
    PENDING: pos.filter(p => p.poStatus === 'PENDING').length,
    PRINTED: pos.filter(p => p.poStatus === 'PRINTED').length,
    ISSUED: pos.filter(p => p.poStatus === 'ISSUED').length,
    COMPLETED: pos.filter(p => p.poStatus === 'COMPLETED').length,
  }), [pos]);

  const filtered = useMemo(() => {
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
      return true;
    });
  }, [pos, search, statusFilter, approvalFilter, karigarFilter]);

  // Notify parent whenever filter changes
  useMemo(() => { onFilter && onFilter(filtered); }, [filtered]);

  const hasActiveFilters = search || statusFilter !== 'ALL' || approvalFilter !== 'ALL' || karigarFilter !== 'ALL';

  const clearAll = () => {
    setSearch('');
    setStatusFilter(defaultStatus);
    setApprovalFilter('ALL');
    setKarigarFilter('ALL');
  };

  return (
    <Box sx={{ mb: 2 }}>
      {/* Search bar row */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search by Ord No, Style, Factory, Buyer, Karigar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
            endAdornment: search && (
              <InputAdornment position="end">
                <Clear fontSize="small" sx={{ cursor: 'pointer' }} onClick={() => setSearch('')} />
              </InputAdornment>
            ),
          }}
        />
        <Button
          size="small"
          variant={showFilters ? 'contained' : 'outlined'}
          startIcon={<FilterList />}
          onClick={() => setShowFilters(v => !v)}
          sx={{ whiteSpace: 'nowrap', minWidth: 100 }}
        >
          Filters {hasActiveFilters && !showFilters ? '●' : ''}
        </Button>
        {hasActiveFilters && (
          <Button size="small" color="error" onClick={clearAll} sx={{ minWidth: 60 }}>
            Clear
          </Button>
        )}
      </Stack>

      {/* Status quick chips */}
      {showStatusChips && (
        <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }} useFlexGap>
          {Object.entries(statusCounts).map(([key, count]) => (
            <Chip
              key={key}
              label={`${key === 'ALL' ? 'All' : key} (${count})`}
              size="small"
              onClick={() => setStatusFilter(key)}
              color={key === statusFilter ? (STATUS_COLORS[key] || 'primary') : 'default'}
              variant={key === statusFilter ? 'filled' : 'outlined'}
              sx={{ fontWeight: key === statusFilter ? 700 : 400 }}
            />
          ))}
        </Stack>
      )}

      {/* Extra filters panel */}
      <Collapse in={showFilters}>
        <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, mt: 1 }}>
          <Grid container spacing={1}>
            <Grid item xs={6} sm={4} md={3}>
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
            <Grid item xs={6} sm={4} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Karigar</InputLabel>
                <Select value={karigarFilter} label="Karigar" onChange={(e) => setKarigarFilter(e.target.value)}>
                  <MenuItem value="ALL">All Karigars</MenuItem>
                  {karigars.map(k => <MenuItem key={k} value={k}>{k}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
      </Collapse>
    </Box>
  );
}
