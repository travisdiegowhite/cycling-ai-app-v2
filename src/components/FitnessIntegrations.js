import React, { useState, useEffect } from 'react';
import {
  Paper,
  Text,
  Stack,
  Tabs,
  Title,
} from '@mantine/core';
import StravaIntegration from './StravaIntegration';
import WahooIntegration from './WahooIntegration';
import GarminIntegration from './GarminIntegration';

const FitnessIntegrations = () => {
  const [activeTab, setActiveTab] = useState('strava');

  return (
    <Paper shadow="sm" p="md">
      <Stack gap="lg">
        <div>
          <Title order={2} mb="xs">Import from Fitness Apps</Title>
          <Text size="sm" c="dimmed">
            Connect your bike computer or fitness tracking service to automatically import your rides
          </Text>
        </div>

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
    </Paper>
  );
};

export default FitnessIntegrations;
