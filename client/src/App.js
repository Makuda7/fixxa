import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import './App.css';

// Placeholder components (we'll build these next)
const HomePage = () => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    <h1>Welcome to Fixxa</h1>
    <p>Find skilled professionals for any task, anytime, anywhere.</p>
    <div style={{ marginTop: '2rem' }}>
      <a href="/login" style={{ margin: '0 1rem' }}>Login</a>
      <a href="/register" style={{ margin: '0 1rem' }}>Register</a>
    </div>
  </div>
);

const RegisterPage = () => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    <h1>Register</h1>
    <p>Registration page will be built here</p>
  </div>
);

const DashboardPage = () => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    <h1>Dashboard</h1>
    <p>Worker dashboard will be built here</p>
  </div>
);

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

// Main App component
function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
