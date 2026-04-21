import React from 'react';
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
import AuditHub from './pages/AuditHub';
import BusinessPortal from './pages/BusinessPortal';
import Settings from './pages/Settings';
import BusinessProfile from './pages/BusinessProfile';

import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';

function App() {
  const { currentUser, isGuest } = useAuth();

  if (!currentUser && !isGuest) {
    return <Login />;
  }

  return (
    <Routes>
      <Route element={<MainLayout />}>
        {/* Core Routes mapping to Bottom Nav */}
        <Route path="/" element={<Home />} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/initiatives" element={<Initiatives />} />
        <Route path="/privileges" element={<Privileges />} />
        
        {/* Auxiliary Routes */}
        <Route path="/scan" element={<Scanner />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/business/:id" element={<BusinessProfile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/about" element={<About />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<Admin />} />
        <Route path="/audit-hub" element={<AuditHub />} />
        <Route path="/business-portal" element={<BusinessPortal />} />
      </Route>
    </Routes>
  );
}

export default App;
