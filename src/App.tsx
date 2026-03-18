import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Documentation from './pages/Documentation';
import Processes from './pages/Processes';
import Alerts from './pages/Alerts';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

import Profile from './pages/Profile';
import Sidebar from './components/Sidebar';
import { authService } from './services/api';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  return authService.isAuthenticated() ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route 
          path="/" 
          element={
            <PrivateRoute>
              <div className="flex">
                <Sidebar />
                <Dashboard />
              </div>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/alerts" 
          element={
            <PrivateRoute>
              <div className="flex">
                <Sidebar />
                <Alerts />
              </div>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/processes" 
          element={
            <PrivateRoute>
              <div className="flex">
                <Sidebar />
                <Processes />
              </div>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/documentation" 
          element={
            <PrivateRoute>
              <div className="flex">
                <Sidebar />
                <Documentation />
              </div>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <PrivateRoute>
              <div className="flex">
                <Sidebar />
                <Profile />
              </div>
            </PrivateRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
