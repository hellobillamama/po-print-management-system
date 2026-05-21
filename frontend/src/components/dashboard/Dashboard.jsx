import { useMemo, useState } from 'react';
import {
  Grid, Card, CardContent, Typography, Box, Chip, Paper, Tab, Tabs,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Divider, Alert, LinearProgress, Stack
} from '@mui/material';
import {
  CloudUpload, CheckCircle, Print, Handshake, Done, Warning,
  PriorityHigh, Replay, TrendingUp, AccessTime, Email,
  Download, Refresh, BarChart as BarChartIcon, PieChart as PieChartIcon
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import { useApp } from '../../contexts/AppContext';

const STATUS_COLORS = {
  PENDING: '#ff9800',
  PRINTED: '#2196f3',
  ISSUED: '#9c27b0',
  COMPLETED: '#4caf50',
};
const CHART_COLORS = ['#4caf50', '#ff9800', '#f44336', '#2196f3', '#9c27b0', '#00bcd4', '#ff5722'];


// ── Stat Card ──────────────────────────────────────────────
function StatCard({ label, value, icon, color, sub, warn }) {
  return (
    <Card sx={{
      height: '100%',
      borderLeft: `4px solid ${color}`,
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': { transform: 'translateY(-3px)', boxShadow: 4 },
      bgcolor: warn ? 'error.light' : 'background.paper',
    }}>
      <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={500} fontSize="0.7rem" textTransform="uppercase" letterSpacing={0.5}>
              {label}
            </Typography>
            <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '1.8rem', md: '2.2rem' }, color, lineHeight: 1.1, mt: 0.5 }}>
              {value}
            </Typography>
            {sub && <Typography variant="caption" color="text.secondary" mt={0.5} display="block">{sub}</Typography>}
          </Box>
          <Box sx={{ color, opacity: 0.7, mt: 0.5, fontSize: 32 }}>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  );
}


// ── Progress Row ───────────────────────────────────────────
function ProgressRow({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2" fontWeight={500}>{label}</Typography>
        <Typography variant="body2" color="text.secondary">{value} / {total} ({pct}%)</Typography>
      </Box>
      <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 4, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: color } }} />
    </Box>
  );
}


// ── Main Dashboard ─────────────────────────────────────────
export default function Dashboard() {
  const { pos, getStats, reprintLog, activityLog, handoverReceipts } = useApp();
  const [tab, setTab] = useState(0);
  const stats = getStats();

  // ── Derived data ─────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const todayActivity = activityLog.filter(l => l.timestamp?.startsWith(today));

  const karigarWorkload = useMemo(() => {
    const map = {};
    pos.filter(p => p.karigar).forEach(p => {
      if (!map[p.karigar]) map[p.karigar] = { name: p.karigar, PENDING: 0, PRINTED: 0, ISSUED: 0, COMPLETED: 0, qty: 0 };
      map[p.karigar][p.poStatus] = (map[p.karigar][p.poStatus] || 0) + 1;
      map[p.karigar].qty += p.prodQty || 0;
    });
    return Object.values(map).sort((a, b) => (b.ISSUED + b.PRINTED) - (a.ISSUED + a.PRINTED));
  }, [pos]);

  const statusDist = useMemo(() => [
    { name: 'Pending', value: stats.pendingPrint, color: STATUS_COLORS.PENDING },
    { name: 'Printed', value: stats.printed, color: STATUS_COLORS.PRINTED },
    { name: 'Issued', value: stats.issued, color: STATUS_COLORS.ISSUED },
    { name: 'Completed', value: stats.completed, color: STATUS_COLORS.COMPLETED },
  ].filter(d => d.value > 0), [stats]);

  const approvalDist = useMemo(() => {
    const approved = pos.filter(p => p.approvalStatus === 'Approved').length;
    const notApproved = pos.filter(p => p.approvalStatus === 'Not Approved').length;
    const pending = pos.filter(p => p.approvalStatus === 'Pending' || !p.approvalStatus).length;
    return [
      { name: 'Approved', value: approved, color: '#4caf50' },
      { name: 'Not Approved', value: notApproved, color: '#f44336' },
      { name: 'Pending', value: pending, color: '#ff9800' },
    ].filter(d => d.value > 0);
  }, [pos]);

  // Last 7 days upload trend
  const uploadTrend = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en', { weekday: 'short', day: 'numeric' });
      const uploaded = pos.filter(p => p.uploadedAt?.startsWith(dateStr)).length;
      const printed = pos.filter(p => p.printedAt?.startsWith(dateStr)).length;
      const issued = pos.filter(p => p.issuedAt?.startsWith(dateStr)).length;
      days.push({ date: label, Uploaded: uploaded, Printed: printed, Issued: issued });
    }
    return days;
  }, [pos]);

  // SLA breached list
  const slaBreachedPOs = useMemo(() =>
    pos.filter(p => p.poStatus === 'PRINTED' && p.slaDueDate && Date.now() > new Date(p.slaDueDate).getTime()),
    [pos]
  );

  const delayedPOs = useMemo(() =>
    pos.filter(p => p.poStatus === 'PENDING' && p.approvalStatus === 'Approved' &&
      (Date.now() - new Date(p.uploadedAt).getTime()) / (1000 * 60 * 60 * 24) > 2),
    [pos]
  );


  // ── Daily Report helpers ──────────────────────────────────
  const generateReportText = () => {
    const d = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const lines = [
      `PO DAILY REPORT — ${d}`,
      `${'='.repeat(50)}`,
      ``,
      `📊 SUMMARY`,
      `  Total POs in System  : ${stats.totalPOs}`,
      `  Today Uploaded       : ${stats.todayUploaded}`,
      `  Approved             : ${stats.approved}`,
      `  Pending Print        : ${stats.pendingPrint}`,
      `  Printed Today        : ${stats.printed}`,
      `  Issued to Karigar    : ${stats.issued}`,
      `  Completed            : ${stats.completed}`,
      `  SLA Breached         : ${slaBreachedPOs.length}`,
      `  Delayed (>2 days)    : ${delayedPOs.length}`,
      `  Reprint Requests     : ${reprintLog.length}`,
      ``,
      `📋 KARIGAR-WISE PENDING`,
      ...karigarWorkload.filter(k => k.ISSUED > 0 || k.PRINTED > 0).map(k =>
        `  ${k.name.padEnd(25)} PRINTED: ${k.PRINTED}  ISSUED: ${k.ISSUED}  QTY: ${k.qty}`
      ),
      ``,
      `⚠️  SLA BREACHED (${slaBreachedPOs.length})`,
      ...slaBreachedPOs.slice(0, 10).map(p =>
        `  Ord: ${p.ordNo}  Style: ${p.styleNo}  Karigar: ${p.karigar}  Due: ${p.slaDueDate ? new Date(p.slaDueDate).toLocaleDateString() : '-'}`
      ),
      ``,
      `📌 DELAYED PENDING PRINT (${delayedPOs.length})`,
      ...delayedPOs.slice(0, 10).map(p =>
        `  Ord: ${p.ordNo}  Style: ${p.styleNo}  Factory: ${p.factory}`
      ),
      ``,
      `${'='.repeat(50)}`,
      `Generated: ${new Date().toLocaleString()}`,
      `PO Print Management System`,
    ];
    return lines.join('\n');
  };

  const handleCopyReport = () => {
    navigator.clipboard.writeText(generateReportText());
    alert('Report copied to clipboard! Paste into your email.');
  };

  const handleEmailReport = () => {
    const subject = encodeURIComponent(`PO Daily Report — ${new Date().toLocaleDateString()}`);
    const body = encodeURIComponent(generateReportText());
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleDownloadReport = () => {
    const text = generateReportText();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PO_Daily_Report_${today}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };


  // ── Render ────────────────────────────────────────────────
  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Dashboard</Typography>
        <Stack direction="row" spacing={1}>
          <Chip label={`Total: ${stats.totalPOs} POs`} color="primary" />
          <Chip label={new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} variant="outlined" />
        </Stack>
      </Box>

      {/* Alerts */}
      {(slaBreachedPOs.length > 0 || delayedPOs.length > 0) && (
        <Stack spacing={1} sx={{ mb: 2 }}>
          {slaBreachedPOs.length > 0 && (
            <Alert severity="error" icon={<AccessTime />}>
              <strong>{slaBreachedPOs.length} PO(s) SLA Breached!</strong> Printed but not issued within 2 days. Immediate action required.
            </Alert>
          )}
          {delayedPOs.length > 0 && (
            <Alert severity="warning" icon={<PriorityHigh />}>
              <strong>{delayedPOs.length} Approved PO(s)</strong> pending print for more than 2 days.
            </Alert>
          )}
        </Stack>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab icon={<BarChartIcon />} label="Overview" iconPosition="start" />
          <Tab icon={<TrendingUp />} label="Analytics" iconPosition="start" />
          <Tab icon={<Handshake />} label="Karigar Status" iconPosition="start" />
          <Tab icon={<Email />} label="Daily Report" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* ── TAB 0: OVERVIEW ──────────────────────────────── */}
      {tab === 0 && (
        <Box>
          {/* Stat Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={4} md={3}><StatCard label="Today Uploaded" value={stats.todayUploaded} icon={<CloudUpload fontSize="large"/>} color="#2196f3" sub={`Total: ${stats.totalPOs}`}/></Grid>
            <Grid item xs={6} sm={4} md={3}><StatCard label="Approved" value={stats.approved} icon={<CheckCircle fontSize="large"/>} color="#4caf50" sub={`${stats.totalPOs > 0 ? Math.round(stats.approved/stats.totalPOs*100) : 0}% of total`}/></Grid>
            <Grid item xs={6} sm={4} md={3}><StatCard label="Pending Print" value={stats.pendingPrint} icon={<Print fontSize="large"/>} color="#ff9800" warn={stats.pendingPrint > 20}/></Grid>
            <Grid item xs={6} sm={4} md={3}><StatCard label="Printed" value={stats.printed} icon={<Print fontSize="large"/>} color="#00bcd4" sub="Awaiting handover"/></Grid>
            <Grid item xs={6} sm={4} md={3}><StatCard label="Issued to Karigar" value={stats.issued} icon={<Handshake fontSize="large"/>} color="#9c27b0"/></Grid>
            <Grid item xs={6} sm={4} md={3}><StatCard label="Completed" value={stats.completed} icon={<Done fontSize="large"/>} color="#4caf50" sub={`${stats.totalPOs > 0 ? Math.round(stats.completed/stats.totalPOs*100) : 0}% done`}/></Grid>
            <Grid item xs={6} sm={4} md={3}><StatCard label="SLA Breached" value={slaBreachedPOs.length} icon={<AccessTime fontSize="large"/>} color="#f44336" warn={slaBreachedPOs.length > 0} sub="Need immediate action"/></Grid>
            <Grid item xs={6} sm={4} md={3}><StatCard label="Reprint Requests" value={reprintLog.length} icon={<Replay fontSize="large"/>} color="#ff5722"/></Grid>
          </Grid>

          {/* Progress Funnel */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>Production Flow Progress</Typography>
            <ProgressRow label="Approved → Ready to Print" value={stats.approved} total={stats.totalPOs} color="#4caf50" />
            <ProgressRow label="Pending Print" value={stats.pendingPrint} total={stats.approved} color="#ff9800" />
            <ProgressRow label="Printed → Awaiting Handover" value={stats.printed} total={stats.approved} color="#2196f3" />
            <ProgressRow label="Issued to Karigar" value={stats.issued} total={stats.approved} color="#9c27b0" />
            <ProgressRow label="Completed" value={stats.completed} total={stats.approved} color="#4caf50" />
          </Paper>

          {/* Charts Row */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 3, height: 320 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>Status Distribution</Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={statusDist} cx="50%" cy="50%" outerRadius={90} innerRadius={40} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {statusDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={7}>
              <Paper sx={{ p: 3, height: 320 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>Approval Status</Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={approvalDist} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={90} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {approvalDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}


      {/* ── TAB 1: ANALYTICS ─────────────────────────────── */}
      {tab === 1 && (
        <Box>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>7-Day Activity Trend</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={uploadTrend}>
                <defs>
                  <linearGradient id="gUploaded" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2196f3" stopOpacity={0.3}/><stop offset="95%" stopColor="#2196f3" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gPrinted" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00bcd4" stopOpacity={0.3}/><stop offset="95%" stopColor="#00bcd4" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gIssued" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#9c27b0" stopOpacity={0.3}/><stop offset="95%" stopColor="#9c27b0" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="Uploaded" stroke="#2196f3" fill="url(#gUploaded)" strokeWidth={2} />
                <Area type="monotone" dataKey="Printed" stroke="#00bcd4" fill="url(#gPrinted)" strokeWidth={2} />
                <Area type="monotone" dataKey="Issued" stroke="#9c27b0" fill="url(#gIssued)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>Karigar Workload (PO Count)</Typography>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={karigarWorkload.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="PRINTED" stackId="a" fill="#2196f3" name="Printed" />
                    <Bar dataKey="ISSUED" stackId="a" fill="#9c27b0" name="Issued" />
                    <Bar dataKey="COMPLETED" stackId="a" fill="#4caf50" name="Completed" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>Today's Activity ({todayActivity.length} actions)</Typography>
                <Box sx={{ maxHeight: 260, overflow: 'auto' }}>
                  {todayActivity.length === 0 ? (
                    <Typography color="text.secondary" sx={{ py: 2 }}>No activity today yet.</Typography>
                  ) : todayActivity.slice(0, 15).map((a, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 1, py: 0.8, borderBottom: 1, borderColor: 'divider' }}>
                      <Chip label={a.action} size="small" color={a.action === 'PRINT' ? 'info' : a.action === 'ISSUE' ? 'secondary' : a.action === 'IMPORT' ? 'primary' : 'default'} sx={{ minWidth: 80 }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" noWrap>{a.details}</Typography>
                        <Typography variant="caption" color="text.secondary">{a.user} · {new Date(a.timestamp).toLocaleTimeString()}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}


      {/* ── TAB 2: KARIGAR STATUS ─────────────────────────── */}
      {tab === 2 && (
        <Box>
          {/* SLA Breached */}
          {slaBreachedPOs.length > 0 && (
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'error.light' }}>
              <Typography variant="h6" fontWeight={700} color="error.dark" gutterBottom>
                🔴 SLA Breached — {slaBreachedPOs.length} PO(s) not issued within 2 days
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Ord No</TableCell>
                      <TableCell>Style No</TableCell>
                      <TableCell>Factory / Karigar</TableCell>
                      <TableCell>Printed At</TableCell>
                      <TableCell>SLA Due</TableCell>
                      <TableCell>Overdue By</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {slaBreachedPOs.map(po => {
                      const overdueDays = Math.floor((Date.now() - new Date(po.slaDueDate).getTime()) / (1000*60*60*24));
                      return (
                        <TableRow key={po.id}>
                          <TableCell>{po.ordNo}</TableCell>
                          <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{po.styleNo}</TableCell>
                          <TableCell>{po.factory}</TableCell>
                          <TableCell>{po.printedAt ? new Date(po.printedAt).toLocaleDateString() : '-'}</TableCell>
                          <TableCell>{po.slaDueDate ? new Date(po.slaDueDate).toLocaleDateString() : '-'}</TableCell>
                          <TableCell><Chip label={`${overdueDays}d overdue`} size="small" color="error" /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {/* Karigar Summary Table */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>Karigar-wise Summary</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell><strong>Karigar / Factory</strong></TableCell>
                    <TableCell align="center">Pending</TableCell>
                    <TableCell align="center">Printed</TableCell>
                    <TableCell align="center">Issued</TableCell>
                    <TableCell align="center">Completed</TableCell>
                    <TableCell align="center">Total Qty</TableCell>
                    <TableCell align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {karigarWorkload.map((k, i) => (
                    <TableRow key={i} hover>
                      <TableCell><Typography fontWeight={600}>{k.name}</Typography></TableCell>
                      <TableCell align="center">{k.PENDING > 0 ? <Chip label={k.PENDING} size="small" color="warning" /> : <Typography color="text.secondary">—</Typography>}</TableCell>
                      <TableCell align="center">{k.PRINTED > 0 ? <Chip label={k.PRINTED} size="small" color="info" /> : <Typography color="text.secondary">—</Typography>}</TableCell>
                      <TableCell align="center">{k.ISSUED > 0 ? <Chip label={k.ISSUED} size="small" color="secondary" /> : <Typography color="text.secondary">—</Typography>}</TableCell>
                      <TableCell align="center">{k.COMPLETED > 0 ? <Chip label={k.COMPLETED} size="small" color="success" /> : <Typography color="text.secondary">—</Typography>}</TableCell>
                      <TableCell align="center"><strong>{k.qty}</strong></TableCell>
                      <TableCell align="center">
                        {k.ISSUED > 0 ? <Chip label="Active" size="small" color="secondary" variant="outlined" /> :
                         k.COMPLETED > 0 ? <Chip label="Done" size="small" color="success" variant="outlined" /> :
                         <Chip label="Idle" size="small" variant="outlined" />}
                      </TableCell>
                    </TableRow>
                  ))}
                  {karigarWorkload.length === 0 && (
                    <TableRow><TableCell colSpan={7} align="center"><Typography color="text.secondary" sx={{ py: 3 }}>No karigar data yet.</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Delayed POs */}
          {delayedPOs.length > 0 && (
            <Paper sx={{ p: 2, bgcolor: 'warning.light' }}>
              <Typography variant="h6" fontWeight={700} color="warning.dark" gutterBottom>
                ⚠️ Delayed Pending Print — {delayedPOs.length} PO(s) approved but not printed in 2+ days
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Ord No</TableCell>
                      <TableCell>Style No</TableCell>
                      <TableCell>Factory</TableCell>
                      <TableCell>Uploaded</TableCell>
                      <TableCell>Days Pending</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {delayedPOs.map(po => {
                      const days = Math.floor((Date.now() - new Date(po.uploadedAt).getTime()) / (1000*60*60*24));
                      return (
                        <TableRow key={po.id}>
                          <TableCell>{po.ordNo}</TableCell>
                          <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{po.styleNo}</TableCell>
                          <TableCell>{po.factory}</TableCell>
                          <TableCell>{new Date(po.uploadedAt).toLocaleDateString()}</TableCell>
                          <TableCell><Chip label={`${days} days`} size="small" color={days > 5 ? 'error' : 'warning'} /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Box>
      )}


      {/* ── TAB 3: DAILY REPORT ──────────────────────────── */}
      {tab === 3 && (
        <Box>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="h6" fontWeight={700}>
                📋 Daily Report — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button variant="outlined" size="small" startIcon={<Download />} onClick={handleCopyReport}>Copy to Clipboard</Button>
                <Button variant="outlined" size="small" startIcon={<Download />} onClick={handleDownloadReport}>Download .txt</Button>
                <Button variant="contained" size="small" startIcon={<Email />} onClick={handleEmailReport} color="primary">Open in Email</Button>
              </Stack>
            </Box>
            <Divider sx={{ mb: 2 }} />

            {/* Summary Boxes */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {[
                { label: 'Total POs', value: stats.totalPOs, color: '#2196f3' },
                { label: 'Today Uploaded', value: stats.todayUploaded, color: '#00bcd4' },
                { label: 'Approved', value: stats.approved, color: '#4caf50' },
                { label: 'Pending Print', value: stats.pendingPrint, color: '#ff9800' },
                { label: 'Printed', value: stats.printed, color: '#2196f3' },
                { label: 'Issued', value: stats.issued, color: '#9c27b0' },
                { label: 'Completed', value: stats.completed, color: '#4caf50' },
                { label: 'SLA Breached', value: slaBreachedPOs.length, color: '#f44336' },
                { label: 'Delayed', value: delayedPOs.length, color: '#ff5722' },
                { label: 'Reprint Requests', value: reprintLog.length, color: '#795548' },
              ].map(item => (
                <Grid item xs={6} sm={4} md={2.4} key={item.label}>
                  <Box sx={{ p: 1.5, borderRadius: 2, border: `2px solid ${item.color}20`, bgcolor: `${item.color}08`, textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight={800} sx={{ color: item.color }}>{item.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>

            {/* Karigar Section */}
            <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ mt: 2 }}>Karigar-wise Status</Typography>
            <TableContainer sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell><strong>Karigar / Factory</strong></TableCell>
                    <TableCell align="center">Printed (Pending Handover)</TableCell>
                    <TableCell align="center">Issued (Work in Progress)</TableCell>
                    <TableCell align="center">Completed Today</TableCell>
                    <TableCell align="center">Total Qty</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {karigarWorkload.filter(k => k.PRINTED > 0 || k.ISSUED > 0 || k.COMPLETED > 0).map((k, i) => (
                    <TableRow key={i} hover>
                      <TableCell><Typography fontWeight={600}>{k.name}</Typography></TableCell>
                      <TableCell align="center">{k.PRINTED || '—'}</TableCell>
                      <TableCell align="center">{k.ISSUED || '—'}</TableCell>
                      <TableCell align="center">{k.COMPLETED || '—'}</TableCell>
                      <TableCell align="center"><strong>{k.qty}</strong></TableCell>
                    </TableRow>
                  ))}
                  {karigarWorkload.filter(k => k.PRINTED > 0 || k.ISSUED > 0 || k.COMPLETED > 0).length === 0 && (
                    <TableRow><TableCell colSpan={5} align="center"><Typography color="text.secondary">No karigar data yet.</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Report Preview */}
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Report Preview (for email)</Typography>
            <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 2, fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto', border: '1px solid', borderColor: 'divider' }}>
              {generateReportText()}
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
}
