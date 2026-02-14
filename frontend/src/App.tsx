import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import CandidateInterview from './pages/CandidateInterview';
import { authService } from './services/auth.service';
import { ThemeProvider } from './components/theme-provider';
import { Toaster } from './components/ui/sonner';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const user = authService.getCurrentUser();
  const token = authService.getToken();
  
  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <Router>
        <Routes>
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route path="/login" element={<Login />} />
          <Route path="/interview/:token" element={<CandidateInterview />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
