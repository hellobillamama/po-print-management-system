import { useMemo } from 'react';
import {
  Grid, Card, CardContent, Typography, Box, Chip, Paper
} from '@mui/material';
import {
  CloudUpload, CheckCircle, Print, Handshake, Done, Warning,
  PriorityHigh, Replay
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useApp } from '../../contexts/AppContext';

const COLORS = ['#4caf50', '#ff9800', '#f44336', '#2196f3', '#9c27b0'];

export default function Dashboard() {
  const { pos, getStats, reprintLog } = useApp();
  const stats = getStats();

  const statCards = [
    { label: 'Today Uploaded', value: stats.todayUploaded, icon: <CloudUpload />, color: '#2196f3' },
    { label: 'Approved', value: stats.approved, icon: <CheckCircle />, color: '#4caf50' },
    { label: 'Pending Print', value: stats.pendingPrint, icon: <Print />, color: '#ff9800' },
    { label: 'Printed', value: stats.printed, icon: <Print />, color: '#00bcd4' },
    { label: 'Issued', value: stats.issued, icon: <Handshake />, color: '#9c27b0' },
    { label: 'Completed', value: stats.completed, icon: <Done />, color: '#4caf50' },
    { label: 'Delayed PO', value: stats.delayed, icon: <Warning />, color: '#f44336' },
    { label: 'Reprint Alerts', value: stats.reprintAttempts, icon: <Replay />, color: '#ff5722' },
  ];

  const karigarData = useMemo(() => {
    const map = {};
    pos.filter(p => p.karigar).forEach(p => {
      map[p.karigar] = (map[p.karigar] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name: name.split(' ')[0], count }));
  }, [pos]);

  const statusDistribution = useMemo(() => {
    return [
      { name: 'Pending', value: stats.pendingPrint },
      { name: 'Printed', value: stats.printed },
      { name: 'Issued', value: stats.issued },
      { name: 'Completed', value: stats.completed },
    ].filter(d => d.value > 0);
  }, [stats]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Dashboard</Typography>
        <Chip label={`Total POs: ${stats.totalPOs}`} color="primary" />
      </Box>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {statCards.map((card) => (
          <Grid item xs={6} sm={4} md={3} key={card.label}>
            <Card
              sx={{
                height: '100%',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-2px)' },
              }}
            >
              <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
                      {card.label}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', md: '2rem' } }}>
                      {card.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: card.color, opacity: 0.8 }}>
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Karigar-wise Workload
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={karigarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1976d2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Status Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusDistribution.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {stats.delayed > 0 && (
        <Paper sx={{ p: 2, mt: 3, bgcolor: 'error.main', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PriorityHigh />
            <Typography fontWeight={600}>
              {stats.delayed} PO(s) pending for more than 2 days! Please take action.
            </Typography>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
