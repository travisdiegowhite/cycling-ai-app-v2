// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/react';
import FileUpload from './components/FileUpload';
import Auth from './components/Auth';
import Map from './components/Map';
import AIRouteMap from './components/AIRouteMap';
import StravaIntegration from './components/StravaIntegration';
import StravaCallback from './components/StravaCallback';
import WahooCallback from './components/WahooCallback';
import GarminCallback from './components/GarminCallback';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import AppLayout from './components/AppLayout';
import RouteBuilder from './components/RouteBuilder';
import RouteStudio from './components/RouteStudio';
import RouteDiscovery from './components/RouteDiscovery';
import ViewRoutes from './components/ViewRoutes';
import TrainingDashboard from './components/TrainingDashboard';
import TrainingPlanBuilder from './components/TrainingPlanBuilder';
import TrainingPlanView from './components/TrainingPlanView';
import HelpCenter from './components/HelpCenter';
import Onboarding from './components/Onboarding';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UnitPreferencesProvider } from './utils/units';
import { theme } from './theme';
import './App.css';
import './styles/trail-tech-theme.css';

const AppContent = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [activePage, setActivePage] = useState('ai-routes');
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Update active page based on route
  useEffect(() => {
    const path = location.pathname;
    if (path === '/') setActivePage('ai-routes');
    else if (path === '/map') setActivePage('map');
    else if (path === '/route-builder') setActivePage('route-builder');
    else if (path === '/route-studio') setActivePage('route-studio');
    else if (path === '/routes') setActivePage('routes');
    else if (path === '/discover') setActivePage('discover');
    else if (path === '/upload') setActivePage('upload');
    else if (path === '/strava') setActivePage('strava');
    else if (path === '/help') setActivePage('help');
    else if (path.startsWith('/training')) setActivePage('training');
  }, [location]);

  // Check if user should see onboarding
  useEffect(() => {
    if (user) {
      const onboardingCompleted = localStorage.getItem('tribos_onboarding_completed');
      if (!onboardingCompleted) {
        // Show onboarding after a short delay
        const timer = setTimeout(() => setShowOnboarding(true), 500);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  // Handle OAuth callback routes (no layout needed)
  if (location.pathname === '/strava/callback') {
    return <StravaCallback />;
  }
  if (location.pathname === '/wahoo/callback') {
    return <WahooCallback />;
  }
  if (location.pathname === '/garmin/callback') {
    return <GarminCallback />;
  }

  // Handle public pages (no auth required, no layout)
  if (location.pathname === '/privacy' || location.pathname === '/privacy-policy') {
    return <PrivacyPolicy />;
  }
  if (location.pathname === '/terms' || location.pathname === '/terms-of-service') {
    return <TermsOfService />;
  }

  const renderContent = () => {
    if (!user) return <Auth />;

    return (
      <>
        <Routes>
          <Route path="/" element={<AIRouteMap />} />
          <Route path="/map" element={<Map />} />
          <Route path="/route-builder" element={<RouteBuilder />} />
          <Route path="/route-studio" element={<RouteStudio />} />
          <Route path="/routes" element={<ViewRoutes />} />
          <Route path="/discover" element={<RouteDiscovery />} />
          <Route path="/upload" element={<FileUpload />} />
          <Route path="/strava" element={<StravaIntegration />} />
          <Route path="/help" element={<HelpCenter />} />
          <Route path="/training" element={<TrainingDashboard />} />
          <Route path="/training/plans/new" element={<TrainingPlanBuilder />} />
          <Route path="/training/plans/:planId" element={<TrainingPlanView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Onboarding opened={showOnboarding} onClose={() => setShowOnboarding(false)} />
      </>
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
      <Analytics />
    </MantineProvider>
  );
}

export default App;