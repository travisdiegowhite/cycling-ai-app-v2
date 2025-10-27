import React, { useState } from 'react';
import {
  Modal,
  Stepper,
  Button,
  Group,
  Text,
  Stack,
  Paper,
  Alert,
  Radio,
  Progress,
  Card,
  Badge,
  SimpleGrid,
  List,
  ThemeIcon,
} from '@mantine/core';
import {
  Check,
  Download,
  Zap,
  Calendar,
  Activity,
  AlertCircle,
  TrendingUp,
  CheckCircle,
} from 'lucide-react';

/**
 * Smart Import Wizard - Guides users through hybrid Strava + Garmin setup
 *
 * Step 1: Welcome + explain strategy
 * Step 2: Strava historical import
 * Step 3: Garmin auto-sync setup
 * Step 4: Complete
 */
const ImportWizard = ({ opened, onClose, stravaConnected, garminConnected }) => {
  const [active, setActive] = useState(0);
  const [historicalPeriod, setHistoricalPeriod] = useState('1_year');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState(null);

  const nextStep = () => setActive((current) => (current < 3 ? current + 1 : current));
  const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));

  const handleStravaImport = async () => {
    setImporting(true);
    setImportProgress(10);

    try {
      // Calculate date range
      let startDate = new Date();
      switch (historicalPeriod) {
        case '3_months':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case '6_months':
          startDate.setMonth(startDate.getMonth() - 6);
          break;
        case '1_year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        case '2_years':
          startDate.setFullYear(startDate.getFullYear() - 2);
          break;
        case 'all':
          startDate = new Date('2010-01-01'); // Strava founded in 2009
          break;
      }

      setImportProgress(30);

      // TODO: Call actual Strava bulk import API
      // const result = await stravaService.bulkImport({
      //   startDate: startDate.toISOString(),
      //   endDate: new Date().toISOString()
      // });

      // Simulate for now
      await new Promise(resolve => setTimeout(resolve, 3000));

      setImportProgress(100);
      setImportResults({
        imported: 127,
        skipped: 3,
        errors: 0
      });

      // Auto-advance to next step after success
      setTimeout(() => {
        nextStep();
      }, 2000);

    } catch (error) {
      console.error('Import error:', error);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Import Your Cycling History"
      size="lg"
      centered
    >
      <Stepper active={active} onStepClick={setActive} breakpoint="sm">
        {/* Step 1: Welcome */}
        <Stepper.Step label="Welcome" description="Get started">
          <Stack gap="lg" mt="xl">
            <Alert color="blue" variant="light" icon={<TrendingUp size={20} />}>
              <Text size="sm" fw={600} mb={4}>
                Smart Import Strategy
              </Text>
              <Text size="xs">
                We'll help you import your complete cycling history and set up automatic syncing for future rides.
              </Text>
            </Alert>

            <Card withBorder p="md">
              <SimpleGrid cols={2} spacing="md">
                <Stack gap="xs">
                  <Group gap="xs">
                    <ThemeIcon size="lg" radius="xl" color="orange" variant="light">
                      <Download size={18} />
                    </ThemeIcon>
                    <div>
                      <Text size="sm" fw={600}>Step 1: Strava</Text>
                      <Text size="xs" c="dimmed">Import History</Text>
                    </div>
                  </Group>
                  <List size="xs" spacing="xs">
                    <List.Item>Import rides from any date</List.Item>
                    <List.Item>Up to 2 years of data</List.Item>
                    <List.Item>One-time setup</List.Item>
                  </List>
                </Stack>

                <Stack gap="xs">
                  <Group gap="xs">
                    <ThemeIcon size="lg" radius="xl" color="blue" variant="light">
                      <Zap size={18} />
                    </ThemeIcon>
                    <div>
                      <Text size="sm" fw={600}>Step 2: Garmin</Text>
                      <Text size="xs" c="dimmed">Auto-Sync</Text>
                    </div>
                  </Group>
                  <List size="xs" spacing="xs">
                    <List.Item>Automatic sync after rides</List.Item>
                    <List.Item>No manual sync needed</List.Item>
                    <List.Item>Detailed metrics</List.Item>
                  </List>
                </Stack>
              </SimpleGrid>
            </Card>

            <Alert color="cyan" variant="light" icon={<AlertCircle size={20} />}>
              <Text size="xs">
                <strong>Why both?</strong> Strava excels at importing historical data, while Garmin provides automatic
                real-time syncing. Together, you get complete history + effortless future updates!
              </Text>
            </Alert>

            <Group justify="flex-end" mt="xl">
              <Button onClick={nextStep} size="md" style={{ backgroundColor: '#FC4C02', color: 'white' }}>
                Get Started →
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>

        {/* Step 2: Strava Import */}
        <Stepper.Step label="Import History" description="From Strava">
          <Stack gap="md" mt="xl">
            <Text size="sm" fw={500}>
              How far back do you want to import activities?
            </Text>

            <Radio.Group value={historicalPeriod} onChange={setHistoricalPeriod}>
              <Stack gap="xs">
                <Radio value="3_months" label="Last 3 months" />
                <Radio value="6_months" label="Last 6 months" />
                <Radio
                  value="1_year"
                  label={
                    <Group gap="xs">
                      <Text>Last 1 year</Text>
                      <Badge size="xs" color="blue">Recommended</Badge>
                    </Group>
                  }
                />
                <Radio value="2_years" label="Last 2 years" />
                <Radio value="all" label="All time (everything from Strava)" />
              </Stack>
            </Radio.Group>

            <Alert color="blue" variant="light" icon={<Calendar size={16} />}>
              <Text size="xs">
                Strava can import activities from any date. This is a one-time import of your history.
                Large imports (1+ years) may take 5-10 minutes.
              </Text>
            </Alert>

            {importing && (
              <Paper withBorder p="md">
                <Stack gap="xs">
                  <Text size="sm" fw={500}>Importing from Strava...</Text>
                  <Progress value={importProgress} animated color="orange" />
                  <Text size="xs" c="dimmed">
                    {importProgress < 30 && 'Fetching activities from Strava...'}
                    {importProgress >= 30 && importProgress < 100 && 'Importing rides and GPS data...'}
                    {importProgress === 100 && 'Import complete!'}
                  </Text>
                </Stack>
              </Paper>
            )}

            {importResults && (
              <Alert color="green" variant="light" icon={<CheckCircle size={20} />}>
                <Text size="sm" fw={600}>Import Successful!</Text>
                <Text size="xs">
                  Imported {importResults.imported} rides
                  {importResults.skipped > 0 && ` (${importResults.skipped} duplicates skipped)`}
                </Text>
              </Alert>
            )}

            <Group justify="space-between" mt="xl">
              <Button variant="subtle" onClick={prevStep}>
                ← Back
              </Button>
              <Button
                onClick={stravaConnected ? handleStravaImport : () => {
                  // TODO: Redirect to Strava OAuth
                  window.location.href = '/integrations/strava';
                }}
                loading={importing}
                disabled={importing}
                style={{ backgroundColor: '#FC4C02', color: 'white' }}
              >
                {stravaConnected ? 'Start Import' : 'Connect Strava →'}
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>

        {/* Step 3: Garmin Setup */}
        <Stepper.Step label="Enable Auto-Sync" description="With Garmin">
          <Stack gap="md" mt="xl">
            {importResults && (
              <Alert color="green" variant="light" icon={<Check size={20} />}>
                <Text size="sm" fw={600}>✅ Historical rides imported from Strava</Text>
                <Text size="xs">
                  Found {importResults.imported} rides from your selected time period
                </Text>
              </Alert>
            )}

            <Text size="sm">
              Now let's set up automatic syncing for future rides:
            </Text>

            <Card withBorder p="md">
              <Stack gap="md">
                <Group gap="xs">
                  <ThemeIcon size="xl" radius="xl" color="blue" variant="light">
                    <Zap size={24} />
                  </ThemeIcon>
                  <div>
                    <Text size="md" fw={600}>Garmin Auto-Sync</Text>
                    <Text size="xs" c="dimmed">Automatic after each activity</Text>
                  </div>
                </Group>

                <List size="sm" spacing="xs">
                  <List.Item icon={<Check size={16} color="green" />}>
                    Rides appear automatically after syncing to Garmin Connect
                  </List.Item>
                  <List.Item icon={<Check size={16} color="green" />}>
                    No manual sync button needed
                  </List.Item>
                  <List.Item icon={<Check size={16} color="green" />}>
                    More detailed metrics (power, cadence, heart rate)
                  </List.Item>
                  <List.Item icon={<Check size={16} color="green" />}>
                    Works with all Garmin cycling computers and watches
                  </List.Item>
                </List>
              </Stack>
            </Card>

            <Alert color="yellow" variant="light">
              <Text size="xs">
                <strong>Note:</strong> Garmin auto-sync only works for activities from today forward.
                That's why we imported your history from Strava first!
              </Text>
            </Alert>

            <Group justify="space-between" mt="xl">
              <Button variant="subtle" onClick={prevStep}>
                ← Back
              </Button>
              <Group>
                <Button variant="subtle" onClick={nextStep}>
                  Skip for Now
                </Button>
                <Button
                  onClick={() => {
                    if (garminConnected) {
                      nextStep();
                    } else {
                      // TODO: Redirect to Garmin OAuth
                      window.location.href = '/integrations/garmin';
                    }
                  }}
                  style={{ backgroundColor: '#007CC3', color: 'white' }}
                >
                  {garminConnected ? 'Continue →' : 'Connect Garmin →'}
                </Button>
              </Group>
            </Group>
          </Stack>
        </Stepper.Step>

        {/* Step 4: Complete */}
        <Stepper.Completed>
          <Stack gap="lg" mt="xl" align="center">
            <ThemeIcon size={80} radius={80} color="green" variant="light">
              <CheckCircle size={48} />
            </ThemeIcon>

            <div style={{ textAlign: 'center' }}>
              <Text size="xl" fw={600} mb="xs">
                You're All Set!
              </Text>
              <Text size="sm" c="dimmed">
                Your cycling history is imported and auto-sync is enabled
              </Text>
            </div>

            <Paper withBorder p="lg" w="100%">
              <Stack gap="md">
                <Group>
                  <ThemeIcon size="lg" color="green" variant="light">
                    <Check size={20} />
                  </ThemeIcon>
                  <div>
                    <Text size="sm" fw={500}>
                      {importResults?.imported || 0} historical rides imported from Strava
                    </Text>
                  </div>
                </Group>

                <Group>
                  <ThemeIcon size="lg" color="green" variant="light">
                    <Check size={20} />
                  </ThemeIcon>
                  <div>
                    <Text size="sm" fw={500}>
                      {garminConnected ? 'Garmin auto-sync enabled' : 'Ready to connect Garmin'}
                    </Text>
                  </div>
                </Group>
              </Stack>
            </Paper>

            <Alert color="blue" variant="light" w="100%">
              <Text size="xs">
                Future rides will sync automatically when you upload them to Garmin Connect.
                No manual sync needed!
              </Text>
            </Alert>

            <Button
              onClick={onClose}
              size="md"
              fullWidth
              style={{ backgroundColor: '#007CC3', color: 'white' }}
            >
              View My Rides →
            </Button>
          </Stack>
        </Stepper.Completed>
      </Stepper>
    </Modal>
  );
};

export default ImportWizard;
