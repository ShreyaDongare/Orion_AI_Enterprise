import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppLayout from './layouts/AppLayout';
import Dashboard from './pages/Dashboard';
import AIWorkspace from './pages/AIWorkspace';
import Projects from './pages/Projects';
import KnowledgeBase from './pages/KnowledgeBase';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import Presentations from './pages/Presentations';
import EmailHistory from './pages/EmailHistory';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import LandingPage from './pages/LandingPage';
import { useAuthStore } from './store/useAuthStore';
import { useThemeStore } from './store/useThemeStore';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const { initTheme, resolvedTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  const isLight = resolvedTheme === 'light';

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: isLight ? '#ffffff' : '#0f172a',
            color: isLight ? '#111827' : '#f8fafc',
            border: isLight ? '1px solid #e5e7eb' : '1px solid #334155',
            borderRadius: '16px',
            fontSize: '12px',
            boxShadow: isLight ? '0 10px 15px -3px rgba(0, 0, 0, 0.05)' : '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
          },
        }}
      />
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Public Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected App Workspace Routes */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/workspace" element={<AIWorkspace />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/knowledge" element={<KnowledgeBase />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/presentations" element={<Presentations />} />
          <Route path="/emails" element={<EmailHistory />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

