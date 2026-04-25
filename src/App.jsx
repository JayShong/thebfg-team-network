import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';

// Layout
import MainLayout from './components/layout/MainLayout';

// Pages
import Directory from './pages/Directory';
import Initiatives from './pages/Initiatives';
import Scanner from './pages/Scanner';
import Profile from './pages/Profile';
import Privileges from './pages/Privileges';
import Home from './pages/Home';
import About from './pages/About';
import Admin from './pages/Admin';
import MerchantPortal from './pages/MerchantPortal';
import AuditHub from './pages/AuditHub';
import BusinessPortal from './pages/BusinessPortal';
import Settings from './pages/Settings';
import BusinessProfile from './pages/BusinessProfile';
import OnboardingHub from './pages/OnboardingHub';

import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';
import WelcomeOverlay from './components/WelcomeOverlay';

function App() {
  const { currentUser, isGuest } = useAuth();

  if (!currentUser && !isGuest) {
    return <Login />;
  }

  // First-time welcome overlay logic
  const [showWelcome, setShowWelcome] = useState(false);
  
  useEffect(() => {
    if (currentUser && !localStorage.getItem('bfg_welcomed')) {
      setShowWelcome(true);
    }
  }, [currentUser]);

  const dismissWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem('bfg_welcomed', 'true');
  };

  return (
    <>
      {showWelcome && <WelcomeOverlay onDismiss={dismissWelcome} />}
    <Routes>
      <Route element={<MainLayout />}>
        {/* Core Routes mapping to Bottom Nav */}
        <Route path="/" element={<Home />} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/initiatives" element={<Initiatives />} />
        <Route path="/privileges" element={<Privileges />} />
        
        {/* Auxiliary Routes */}
        <Route path="/scanner" element={<Scanner />} />

        <Route path="/profile" element={<Profile />} />
        <Route path="/business/:id" element={<BusinessProfile />} />
        <Route path="/about" element={<About />} />

        {/* Gated Consumer Routes */}
        <Route path="/settings" element={
          <ProtectedRoute requiredRole="member">
            <Settings />
          </ProtectedRoute>
        } />
        
        {/* Merchant, Auditor & Governance Routes */}
        <Route path="/admin" element={
          <ProtectedRoute requiredRole="superadmin">
            <Admin />
          </ProtectedRoute>
        } />
        <Route path="/merchant-portal" element={
          <ProtectedRoute requiredRole="merchant">
            <MerchantPortal />
          </ProtectedRoute>
        } />
        <Route path="/audit-hub" element={
          <ProtectedRoute requiredRole="auditor">
            <AuditHub />
          </ProtectedRoute>
        } />
        <Route path="/onboarding-hub" element={
          <ProtectedRoute requiredRole="customerSuccess">
            <OnboardingHub />
          </ProtectedRoute>
        } />
        <Route path="/business-portal" element={
          <ProtectedRoute requiredRole="merchant" allowStaff={true}>
            <BusinessPortal />
          </ProtectedRoute>
        } />
        <Route path="/portal" element={
          <ProtectedRoute requiredRole="merchant" allowStaff={true}>
            <BusinessPortal />
          </ProtectedRoute>
        } />
      </Route>
    </Routes>
    </>
  );
}

export default App;
