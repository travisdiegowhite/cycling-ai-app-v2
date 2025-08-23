// src/App.js
import React, { useState } from 'react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { Toaster } from 'react-hot-toast';
import FileUpload from './components/FileUpload';
import Auth from './components/Auth';
import Map from './components/Map';
import AIRouteMap from './components/AIRouteMap';
import RideAnalysis from './components/RideAnalysis';
import AppLayout from './components/AppLayout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UnitPreferencesProvider } from './utils/units';
import { theme } from './theme';
import './App.css';

const AppContent = () => {
  const { user } = useAuth();
  const [activePage, setActivePage] = useState('ai-routes');

  const renderContent = () => {
    if (!user) return <Auth />;
    
    switch (activePage) {
      case 'ai-routes':
        return <AIRouteMap />;
      case 'map':
        return <Map />;
      case 'analysis':
        return <RideAnalysis />;
      case 'upload':
      default:
        return <FileUpload />;
    }
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
          <AppContent />
        </UnitPreferencesProvider>
      </AuthProvider>
    </MantineProvider>
  );
}

export default App;