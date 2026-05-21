import { useState, useMemo } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tabs, Tab, Chip, TextField, InputAdornment, TablePagination
} from '@mui/material';
import { History, Print, Handshake, CloudUpload, Replay, Search } from '@mui/icons-material';
import { useApp } from '../../contexts/AppContext';
import POSearchBar from '../common/POSearchBar';

export default function LogsModule() {
  const { activityLog, pos } = useApp();
  const [tabValue, setTabValue] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filteredPos, setFilteredPos] = useState(pos);

  const filteredLogs = useMemo(() => {
    let logs = activityLog;
    if (tabValue === 1) logs = activityLog.filter(l => l.action === 'PRINT');
    if (tabValue === 2) logs = activityLog.filter(l => l.action === 'ISSUE');
    if (tabValue === 3) logs = activityLog.filter(l => l.action === 'IMPORT');
    if (tabValue === 4) logs = activityLog.filter(l => l.action.includes('REPRINT'));

    if (search) {
      const s = search.toLowerCase();
      logs = logs.filter(l =>
        l.details?.toLowerCase().includes(s) ||
        l.user?.toLowerCase().includes(s) ||
        l.action?.toLowerCase().includes(s)
      );
    }
    return logs;
  }, [activityLog, tabValue, search]);

  const getActionColor = (action) => {
    switch (action) {
      case 'PRINT': return 'info';
      case 'ISSUE': return 'secondary';
      case 'IMPORT': return 'primary';
      case 'COMPLETE': return 'success';
      case 'REPRINT_REQUEST': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>Activity Logs</Typography>
      <Typography color="text.secondary" gutterBottom>
        Complete audit trail of all system activities
      </Typography>
      <POSearchBar pos={pos} onFilter={setFilteredPos} showStatusChips={false} />

      <Paper sx={{ p: 2, mb: 2 }}>
        <Tabs value={tabValue} onChange={(_, v) => { setTabValue(v); setPage(0); }} variant="scrollable" scrollButtons="auto">
          <Tab icon={<History />} label={`All (${activityLog.length})`} iconPosition="start" />
          <Tab icon={<Print />} label="Print" iconPosition="start" />
          <Tab icon={<Handshake />} label="Issue" iconPosition="start" />
          <Tab icon={<CloudUpload />} label="Upload" iconPosition="start" />
          <Tab icon={<Replay />} label="Reprint" iconPosition="start" />
        </Tabs>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search logs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search /></InputAdornment>
          }}
        />

        <TableContainer sx={{ maxHeight: 'calc(100vh - 380px)' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Details</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Role</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>
                      No activity logs yet. Actions will appear here as you use the system.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((log, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip label={log.action} size="small" color={getActionColor(log.action)} />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 300 }}>{log.details}</TableCell>
                      <TableCell>{log.user}</TableCell>
                      <TableCell>
                        <Chip label={log.role} size="small" variant="outlined" />
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {filteredLogs.length > 0 && (
          <TablePagination
            component="div"
            count={filteredLogs.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        )}
      </Paper>
    </Box>
  );
}
