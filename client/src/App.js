import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import Header from './components/Header';
import Footer from './components/Footer';
import CookieConsent from './components/CookieConsent';
import IdleSessionManager from './components/IdleSessionManager';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ResendVerification from './pages/ResendVerification';
import NotFound from './pages/NotFound';
import CompleteRegistration from './pages/CompleteRegistration';
import Dashboard from './pages/Dashboard';
import WorkerDashboard from './pages/WorkerDashboard';
import ClientDashboard from './pages/ClientDashboard';
import Service from './pages/Service';
import Profile from './pages/Profile';
import About from './pages/About';
import Contact from './pages/Contact';
import FAQ from './pages/FAQ';
import Messages from './pages/Messages';
import Settings from './pages/Settings';
import JobHistory from './pages/JobHistory';
import Support from './pages/Support';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Safety from './pages/Safety';
import Join from './pages/Join';
import Reviews from './pages/Reviews';
import AdminDashboard from './pages/AdminDashboard';
import './App.css';

const LoadingSpinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <p>Loading...</p>
  </div>
);

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Admin-only route component
const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  console.log('AdminRoute - Loading:', loading);
  console.log('AdminRoute - isAuthenticated:', isAuthenticated);
  console.log('AdminRoute - User:', user);
  console.log('AdminRoute - user.isAdmin flag:', user?.isAdmin);

  if (loading) {
    console.log('AdminRoute - Still loading, showing spinner');
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    console.log('AdminRoute - Not authenticated, redirecting to login');
    return <Navigate to="/login" />;
  }

  // Check if user is admin using the isAdmin flag from backend
  const isAdmin = user?.isAdmin === true;

  console.log('AdminRoute - User email:', user?.email);
  console.log('AdminRoute - isAdmin:', isAdmin);

  if (!isAdmin) {
    console.log('AdminRoute - Not admin, redirecting to home');
    return <Navigate to="/" />;
  }

  console.log('AdminRoute - Admin verified, rendering dashboard');
  return children;
};

// Main App component
function AppRoutes() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <Header />
      {isAuthenticated && <IdleSessionManager />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/resend-verification" element={<ResendVerification />} />
        <Route path="/service" element={<Service />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/safety" element={<Safety />} />
        <Route path="/support" element={<Support />} />
        <Route path="/join" element={<Join />} />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/job-history"
          element={
            <ProtectedRoute>
              <JobHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/worker-dashboard"
          element={
            <ProtectedRoute>
              <WorkerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/client-dashboard"
          element={
            <ProtectedRoute>
              <ClientDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/complete-registration"
          element={
            <ProtectedRoute>
              <CompleteRegistration />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reviews"
          element={
            <ProtectedRoute>
              <Reviews />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        {/* Catch all - 404 page */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
      <CookieConsent />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <AppRoutes />
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
