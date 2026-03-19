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
import WebMonitors from './pages/WebMonitors';
import Sidebar from './components/Sidebar';
import { authService } from './services/api';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  return authService.isAuthenticated() ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  const [collapsed, setCollapsed] = React.useState(false);

  const Layout = ({ children }: { children: React.ReactNode }) => (
    <div className="flex bg-obsidian-950 min-h-screen">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className={`flex-1 transition-all duration-500 ${collapsed ? 'pl-20' : 'pl-72'}`}>
        {children}
      </div>
    </div>
  );

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
              <Layout>
                <Dashboard />
              </Layout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/alerts" 
          element={
            <PrivateRoute>
              <Layout>
                <Alerts />
              </Layout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/processes" 
          element={
            <PrivateRoute>
              <Layout>
                <Processes />
              </Layout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/documentation" 
          element={
            <PrivateRoute>
              <Layout>
                <Documentation />
              </Layout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/web-monitors" 
          element={
            <PrivateRoute>
              <Layout>
                <WebMonitors />
              </Layout>
            </PrivateRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <PrivateRoute>
              <Layout>
                <Profile />
              </Layout>
            </PrivateRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
