import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LoginPage from './components/auth/LoginPage';
import Layout from './components/common/Layout';
import Dashboard from './components/dashboard/Dashboard';
import UploadModule from './components/upload/UploadModule';
import FilterModule from './components/filter/FilterModule';
import PrintModule from './components/print/PrintModule';
import HandoverModule from './components/handover/HandoverModule';
import HandoverReceipts from './components/handover/HandoverReceipts';
import CompletionModule from './components/completion/CompletionModule';
import LogsModule from './components/logs/LogsModule';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="upload" element={<UploadModule />} />
          <Route path="filter" element={<FilterModule />} />
          <Route path="print" element={<PrintModule />} />
          <Route path="handover" element={<HandoverModule />} />
          <Route path="receipts" element={<HandoverReceipts />} />
          <Route path="completion" element={<CompletionModule />} />
          <Route path="logs" element={<LogsModule />} />
        </Route>
        <Route path="/login" element={<Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AppProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
