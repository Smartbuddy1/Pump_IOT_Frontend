import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OMCDashboard from './pages/OMCDashboard';
import CreateOMC from './pages/CreateOMC';
import CreateRO from './pages/CreateRO';
import Machines from './pages/Machines';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';
import Analysis from './pages/Analysis';
import Diagnosis from './pages/Diagnosis';
import PublicFeedback from './pages/PublicFeedback';
import FeedbackLogs from './pages/FeedbackLogs';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ErrorBoundary from './components/ErrorBoundary';
import { useSocket } from './hooks/useSocket';

// Automatically reset scroll to top on route change to eliminate bottom footer flashes
const ScrollToTop = () => {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);
  return null;
};

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: '600' }}>
        Loading...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  
  return children;
};

function App() {
  const { socket } = useSocket();

  React.useEffect(() => {
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
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <ScrollToTop />
          <ToastContainer position="top-right" autoClose={3000} />
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/feedback" element={<PublicFeedback />} />
            <Route path="/feedback/:machineId" element={<PublicFeedback />} />
            
            {/* Protected Layout Routes */}
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              {/* Redirect / to /dashboard */}
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="omc-dashboard" element={<OMCDashboard />} />
              <Route path="omc" element={<CreateOMC />} />
              <Route path="ro" element={<CreateRO />} />
              <Route path="machine" element={<Machines />} />
              <Route path="alerts" element={<Alerts />} />
              <Route path="reports" element={<Reports />} />
              <Route path="analysis" element={<Analysis />} />
              <Route path="diagnosis" element={<Diagnosis />} />
              <Route path="feedbacks" element={<FeedbackLogs />} />
              {/* <Route path="settings" element={<Settings />} /> */}
            </Route>
            
            {/* Fallback - unauthenticated users go to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
