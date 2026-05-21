import { useState } from 'react';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert,
  InputAdornment, IconButton, Chip, Stack
} from '@mui/material';
import { Visibility, VisibilityOff, Print as PrintIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { email: 'admin@po.com', pass: 'admin123', role: 'Admin' },
    { email: 'production@po.com', pass: 'prod123', role: 'Production' },
    { email: 'printing@po.com', pass: 'print123', role: 'Printing' },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 440, width: '100%', p: 1 }}>
        <CardContent>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <PrintIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h5" fontWeight={700}>
              PO Print Management
            </Typography>
            <Typography color="text.secondary" variant="body2">
              Karigar Issue & Tracking System
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              autoFocus
            />
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mt: 3, mb: 2, py: 1.5 }}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              Demo Accounts (click to fill):
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {demoAccounts.map(acc => (
                <Chip
                  key={acc.email}
                  label={acc.role}
                  size="small"
                  clickable
                  color="primary"
                  variant="outlined"
                  onClick={() => { setEmail(acc.email); setPassword(acc.pass); }}
                />
              ))}
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
