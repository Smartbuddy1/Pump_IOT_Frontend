import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ErrorBoundary from './components/ErrorBoundary';
import { useSocket } from './hooks/useSocket';

// Enterprise Code-Splitting (Lazy Loading pages on demand)
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const OMCDashboard = lazy(() => import('./pages/OMCDashboard'));
const CreateOMC = lazy(() => import('./pages/CreateOMC'));
const CreateRO = lazy(() => import('./pages/CreateRO'));
const Machines = lazy(() => import('./pages/Machines'));
const Readings = lazy(() => import('./pages/Readings'));
const Alerts = lazy(() => import('./pages/Alerts'));
const Reports = lazy(() => import('./pages/Reports'));
const Analysis = lazy(() => import('./pages/Analysis'));
const Diagnosis = lazy(() => import('./pages/Diagnosis'));
const PublicFeedback = lazy(() => import('./pages/PublicFeedback'));
const FeedbackLogs = lazy(() => import('./pages/FeedbackLogs'));
const LegalPolicy = lazy(() => import('./pages/LegalPolicy'));

// Automatically reset scroll to top on route change to eliminate bottom footer flashes
const ScrollToTop = () => {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);
  return null;
};

// Sleek fallback loading spinner for code-split chunks
const LoadingFallback = () => (
  <div style={{
    minHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    color: 'var(--text-secondary, #64748b)'
  }}>
    <div style={{
      width: '40px',
      height: '40px',
      border: '3px solid rgba(0, 102, 204, 0.15)',
      borderTopColor: '#0066cc',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
    <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>Loading module...</span>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: '600' }}>
        Loading session...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  
  return children;
};

function AppContent() {
  const { socket } = useSocket();

  useEffect(() => {
    const handleNewAlert = (data) => {
      toast.error(`ALERT [${data.machineId}]: ${data.alertMessage}`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    };

    socket.on('new_alert', handleNewAlert);
    
    return () => {
      socket.off('new_alert', handleNewAlert);
    };
  }, [socket]);

  return (
    <>

        <Router basename={import.meta.env.BASE_URL}>
          <ScrollToTop />
          <ToastContainer position="top-right" autoClose={3000} />
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/feedback" element={<PublicFeedback />} />
              <Route path="/feedback/:machineId" element={<PublicFeedback />} />
              <Route path="/terms-conditions" element={<LegalPolicy />} />
              <Route path="/privacy-policy" element={<LegalPolicy />} />
              <Route path="/refund-policy" element={<LegalPolicy />} />
              <Route path="/contact-us" element={<LegalPolicy />} />
              
              {/* Protected Layout Routes */}
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                {/* Redirect / to /dashboard */}
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="readings" element={<Readings />} />
                <Route path="omc-dashboard" element={<OMCDashboard />} />
                <Route path="omc" element={<CreateOMC />} />
                <Route path="ro" element={<CreateRO />} />
                <Route path="machine" element={<Machines />} />
                <Route path="alerts" element={<Alerts />} />
                <Route path="reports" element={<Reports />} />
                <Route path="analysis" element={<Analysis />} />
                <Route path="diagnosis" element={<Diagnosis />} />
                <Route path="feedbacks" element={<FeedbackLogs />} />
              </Route>
              
              {/* Fallback - unauthenticated users go to login */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </Router>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
