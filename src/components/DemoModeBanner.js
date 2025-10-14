import React from 'react';
import { Alert, Group, Text, Button } from '@mantine/core';
import { Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { disableDemoMode } from '../utils/demoData';

const DemoModeBanner = () => {
  const { isDemoMode } = useAuth();

  if (!isDemoMode) return null;

  const handleExitDemo = () => {
    disableDemoMode();
    window.location.reload();
  };

  return (
    <Alert
      icon={<Info size={16} />}
      color="blue"
      variant="light"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        borderRadius: 0,
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Text size="sm">
          <strong>Demo Mode:</strong> You're exploring with sample data. Sign up to track your own rides!
        </Text>
        <Button
          size="xs"
          variant="outline"
          color="blue"
          onClick={handleExitDemo}
        >
          Exit Demo
        </Button>
      </Group>
    </Alert>
  );
};

export default DemoModeBanner;
