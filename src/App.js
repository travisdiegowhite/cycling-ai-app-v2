// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { Toaster } from 'react-hot-toast';
import FileUpload from './components/FileUpload';
import Auth from './components/Auth';
import Map from './components/Map';
import AIRouteMap from './components/AIRouteMap';
import RideAnalysis from './components/RideAnalysis';
import SmartRideAnalysis from './components/SmartRideAnalysis';
import StravaIntegration from './components/StravaIntegration';
import StravaCallback from './components/StravaCallback';
import AppLayout from './components/AppLayout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UnitPreferencesProvider } from './utils/units';
import { theme } from './theme';
import './App.css';

const AppContent = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [activePage, setActivePage] = useState('ai-routes');

  // Update active page based on route
  useEffect(() => {
    const path = location.pathname;
    if (path === '/') setActivePage('ai-routes');
    else if (path === '/map') setActivePage('map');
    else if (path === '/analysis') setActivePage('analysis');
    else if (path === '/smart-analysis') setActivePage('smart-analysis');
    else if (path === '/upload') setActivePage('upload');
    else if (path === '/strava') setActivePage('strava');
  }, [location]);

  // Handle Strava callback route (no layout needed)
  if (location.pathname === '/strava/callback') {
    return <StravaCallback />;
  }

  const renderContent = () => {
    if (!user) return <Auth />;
    
    return (
      <Routes>
        <Route path="/" element={<AIRouteMap />} />
        <Route path="/map" element={<Map />} />
        <Route path="/analysis" element={<RideAnalysis />} />
        <Route path="/smart-analysis" element={<SmartRideAnalysis />} />
        <Route path="/upload" element={<FileUpload />} />
        <Route path="/strava" element={<StravaIntegration />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  };

  return (
    <AppLayout activePage={activePage} setActivePage={setActivePage}>
      {renderContent()}
    </AppLayout>
  );
};

function App() {
  return (
    <MantineProvider theme={theme}>
      <Notifications />
      <Toaster position="top-right" />
      <AuthProvider>
        <UnitPreferencesProvider>
          <Router>
            <AppContent />
          </Router>
        </UnitPreferencesProvider>
      </AuthProvider>
    </MantineProvider>
  );
}

export default App;