import React from 'react';
import { Alert, Group, Text, Button, Box, Stack } from '@mantine/core';
import { Info, UserPlus, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { disableDemoMode } from '../utils/demoData';

const DemoModeBanner = () => {
  const { isDemoMode } = useAuth();

  if (!isDemoMode) return null;

  const handleCreateAccount = () => {
    disableDemoMode();
    window.location.reload();
  };

  return (
    <Alert
      icon={<Sparkles size={18} />}
      color="teal"
      variant="light"
      styles={{
        root: {
          position: 'sticky',
          top: 0,
          zIndex: 100,
          borderRadius: 0,
          borderLeft: 'none',
          borderRight: 'none',
          borderTop: 'none',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(34, 211, 238, 0.08) 100%)',
        }
      }}
    >
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Box style={{ flex: 1, minWidth: 250 }}>
          <Text size="sm" fw={600} mb={2}>
            You're using demo mode
          </Text>
          <Text size="xs" c="dimmed">
            Create a free account to save routes, build training plans, and connect your Strava account. No credit card required.
          </Text>
        </Box>
        <Button
          size="sm"
          leftSection={<UserPlus size={16} />}
          onClick={handleCreateAccount}
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #22d3ee 100%)',
          }}
        >
          Create Free Account
        </Button>
      </Group>
    </Alert>
  );
};

export default DemoModeBanner;
