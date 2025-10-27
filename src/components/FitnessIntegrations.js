import React, { useState, useEffect } from 'react';
import {
  Paper,
  Text,
  Stack,
  Tabs,
  Title,
  Button,
  Group,
  Alert,
} from '@mantine/core';
import { Sparkles } from 'lucide-react';
import StravaIntegration from './StravaIntegration';
import WahooIntegration from './WahooIntegration';
import GarminIntegration from './GarminIntegration';
import ImportWizard from './ImportWizard';
import { stravaService } from '../utils/stravaService';
import garminService from '../utils/garminService';

const FitnessIntegrations = () => {
  const [activeTab, setActiveTab] = useState('garmin');
  const [wizardOpened, setWizardOpened] = useState(false);
  const [stravaConnected, setStravaConnected] = useState(false);
  const [garminConnected, setGarminConnected] = useState(false);

  useEffect(() => {
    checkConnections();
  }, []);

  const checkConnections = async () => {
    try {
      const strava = await stravaService.isConnected();
      const garmin = await garminService.isConnected();
      setStravaConnected(strava);
      setGarminConnected(garmin);
    } catch (error) {
      console.error('Error checking connections:', error);
    }
  };

  return (
    <Paper shadow="sm" p="md">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={2} mb="xs">Import from Fitness Apps</Title>
            <Text size="sm" c="dimmed">
              Connect your bike computer or fitness tracking service to automatically import your rides
            </Text>
          </div>

          <Button
            leftSection={<Sparkles size={18} />}
            variant="gradient"
            gradient={{ from: 'orange', to: 'blue', deg: 90 }}
            onClick={() => setWizardOpened(true)}
          >
            Smart Import
          </Button>
        </Group>

        {/* Show info about smart import if neither service is connected */}
        {!stravaConnected && !garminConnected && (
          <Alert color="blue" variant="light">
            <Text size="sm" fw={600} mb={4}>
              New here? Try Smart Import!
            </Text>
            <Text size="xs">
              The Smart Import wizard will guide you through importing your complete cycling history from Strava,
              then setting up automatic sync with Garmin for future rides.
            </Text>
          </Alert>
        )}

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="strava">
              Strava
            </Tabs.Tab>
            <Tabs.Tab value="wahoo">
              Wahoo Fitness
            </Tabs.Tab>
            <Tabs.Tab value="garmin">
              Garmin Connect
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="strava" pt="lg">
            <StravaIntegration />
          </Tabs.Panel>

          <Tabs.Panel value="wahoo" pt="lg">
            <WahooIntegration />
          </Tabs.Panel>

          <Tabs.Panel value="garmin" pt="lg">
            <GarminIntegration />
          </Tabs.Panel>
        </Tabs>
      </Stack>

      {/* Import Wizard Modal */}
      <ImportWizard
        opened={wizardOpened}
        onClose={() => {
          setWizardOpened(false);
          checkConnections(); // Refresh connection status after wizard closes
        }}
        stravaConnected={stravaConnected}
        garminConnected={garminConnected}
      />
    </Paper>
  );
};

export default FitnessIntegrations;
