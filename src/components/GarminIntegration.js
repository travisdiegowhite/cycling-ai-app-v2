import React, { useState, useEffect } from 'react';
import {
  Paper,
  Text,
  Button,
  Group,
  Stack,
  Card,
  Badge,
  Alert,
  Loader,
  Center,
  Progress,
  Avatar,
  Tooltip,
  SimpleGrid,
} from '@mantine/core';
import {
  Activity,
  MapPin,
  Calendar,
  TrendingUp,
  Download,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  XCircle,
  Watch
} from 'lucide-react';
import garminService from '../utils/garminService';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const GarminIntegration = () => {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [integration, setIntegration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [lastSync, setLastSync] = useState(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      setLoading(true);
      const isConnected = await garminService.isConnected();
      setConnected(isConnected);

      if (isConnected) {
        const integrationData = await garminService.getIntegration();
        setIntegration(integrationData);
        await checkLastSync();
      }
    } catch (error) {
      console.error('Error checking Garmin connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkLastSync = async () => {
    try {
      const history = await garminService.getSyncHistory(1);
      if (history && history.length > 0) {
        setLastSync(history[0]);
      }
    } catch (error) {
      console.error('Error checking last sync:', error);
    }
  };

  const handleConnect = async () => {
    if (!garminService.isConfigured()) {
      toast.error('Garmin integration not configured. Please check your environment variables.');
      return;
    }

    try {
      setConnecting(true);
      const authUrl = await garminService.initiateAuth();
      console.log('🔗 Redirecting to Garmin auth:', authUrl);
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error generating Garmin auth URL:', error);
      toast.error('Failed to initiate Garmin connection');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await garminService.disconnect();
      setConnected(false);
      setIntegration(null);
      setLastSync(null);
      toast.success('Disconnected from Garmin Connect');
    } catch (error) {
      console.error('Error disconnecting Garmin:', error);
      toast.error('Failed to disconnect from Garmin');
    }
  };

  const handleSync = async () => {
    if (!connected) {
      toast.error('Please connect to Garmin first');
      return;
    }

    try {
      setSyncing(true);
      setSyncProgress(10);

      console.log('🚴 Starting Garmin activity sync...');

      const result = await garminService.syncActivities();

      setSyncProgress(100);

      if (result.imported === 0 && result.skipped === 0) {
        toast.info('No new activities found to import');
      } else {
        toast.success(
          `Successfully imported ${result.imported} new activities! (${result.skipped} skipped as duplicates)`
        );
      }

      await checkLastSync();

    } catch (error) {
      console.error('Error syncing Garmin activities:', error);
      toast.error('Failed to sync activities from Garmin');
    } finally {
      setSyncing(false);
      setSyncProgress(0);
    }
  };

  if (loading) {
    return (
      <Paper shadow="sm" p="md">
        <Center>
          <Loader />
        </Center>
      </Paper>
    );
  }

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <Stack gap="lg">
      {/* Development Mode Warning */}
      {isDevelopment && (
        <Alert color="yellow" title="Development Mode" variant="light">
          <Text size="sm">
            Garmin integration requires deployment to work. The OAuth API routes are serverless functions that only run on Vercel.
            Deploy to production to test the Garmin connection.
          </Text>
        </Alert>
      )}

      {/* Header */}
      <Group justify="space-between" align="center">
        <Group>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: '#007CC3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Watch size={24} color="white" />
          </div>
          <div>
            <Text size="lg" fw={600}>Garmin Connect</Text>
            <Text size="sm" c="dimmed">Edge • Forerunner • Fenix</Text>
          </div>
        </Group>

        {connected ? (
          <Badge color="green" leftSection={<CheckCircle size={12} />}>
            Connected
          </Badge>
        ) : (
          <Badge color="gray" leftSection={<XCircle size={12} />}>
            Not Connected
          </Badge>
        )}
      </Group>

      {!connected ? (
        /* Connection Card */
        <Card withBorder p="lg">
          <Stack align="center" gap="md">
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: '#007CC3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Watch size={48} color="white" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <Text size="xl" fw={600} mb="xs">Connect Your Garmin Device</Text>
              <Text size="sm" c="dimmed" mb="lg">
                Automatically sync rides from your Edge, Forerunner, or Fenix device to get personalized insights and route recommendations.
              </Text>
            </div>

            <Group gap="lg" style={{ textAlign: 'center' }}>
              <div>
                <MapPin size={20} color="#666" />
                <Text size="xs" mt="xs">GPS Routes</Text>
              </div>
              <div>
                <TrendingUp size={20} color="#666" />
                <Text size="xs" mt="xs">Power Data</Text>
              </div>
              <div>
                <Calendar size={20} color="#666" />
                <Text size="xs" mt="xs">Ride History</Text>
              </div>
            </Group>

            <Button
              size="lg"
              leftSection={connecting ? <Loader size={20} /> : <ExternalLink size={20} />}
              onClick={handleConnect}
              loading={connecting}
              disabled={connecting}
              style={{
                backgroundColor: '#007CC3',
                color: 'white'
              }}
            >
              {connecting ? 'Connecting...' : 'Connect to Garmin'}
            </Button>

            <Text size="xs" c="dimmed" style={{ textAlign: 'center' }}>
              We'll only access your workout data. Your privacy is our priority.
            </Text>
          </Stack>
        </Card>
      ) : (
        /* Connected State */
        <Stack gap="md">
          {/* Connection Info */}
          <Card withBorder p="md">
            <Group justify="space-between">
              <Group>
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  backgroundColor: '#007CC3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Watch size={32} color="white" />
                </div>
                <div>
                  <Text size="lg" fw={600}>
                    Garmin Connected
                  </Text>
                  <Text size="sm" c="dimmed">
                    {integration?.provider_user_data?.email || 'Connected to Garmin Connect'}
                  </Text>
                  <Group gap="xs" mt="xs">
                    <Badge size="sm" variant="light" color="blue">
                      <Activity size={12} /> Garmin Connect
                    </Badge>
                  </Group>
                </div>
              </Group>

              <Button
                variant="light"
                color="red"
                onClick={handleDisconnect}
              >
                Disconnect
              </Button>
            </Group>
          </Card>

          {/* Sync Activities */}
          <Card withBorder p="md">
            <div>
              <Text size="md" fw={600} mb="xs">Sync Activities</Text>
              <Text size="sm" c="dimmed" mb="md">
                Import your rides from Garmin Connect
              </Text>
            </div>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Tooltip label="Sync recent activities from Garmin">
                <Button
                  leftSection={syncing ? <Loader size={16} /> : <Download size={16} />}
                  onClick={handleSync}
                  loading={syncing}
                  disabled={syncing}
                  variant="filled"
                  fullWidth
                  style={{
                    backgroundColor: '#007CC3',
                    color: 'white'
                  }}
                >
                  {syncing ? 'Syncing...' : 'Sync Activities'}
                </Button>
              </Tooltip>

              <Tooltip label="Force refresh all activities">
                <Button
                  leftSection={syncing ? <Loader size={16} /> : <RefreshCw size={16} />}
                  onClick={handleSync}
                  loading={syncing}
                  disabled={syncing}
                  variant="outline"
                  color="blue"
                  fullWidth
                >
                  {syncing ? 'Syncing...' : 'Refresh All'}
                </Button>
              </Tooltip>
            </SimpleGrid>

            {syncing && (
              <Progress value={syncProgress} size="sm" mt="md" color="blue" />
            )}

            {lastSync && (
              <Alert color="blue" variant="light" mt="md">
                <Text size="sm">
                  Last sync: {new Date(lastSync.synced_at).toLocaleString()}
                  {lastSync.activities_imported > 0 &&
                    ` (${lastSync.activities_imported} activities imported)`
                  }
                </Text>
              </Alert>
            )}
          </Card>

          {/* Features */}
          <Card withBorder p="md">
            <Text size="md" fw={600} mb="sm">What you'll get:</Text>
            <Stack gap="xs">
              <Group>
                <CheckCircle size={16} color="green" />
                <Text size="sm">Complete GPS track data from your rides</Text>
              </Group>
              <Group>
                <CheckCircle size={16} color="green" />
                <Text size="sm">Power, heart rate, and cadence metrics</Text>
              </Group>
              <Group>
                <CheckCircle size={16} color="green" />
                <Text size="sm">Automatic route suggestions based on your riding style</Text>
              </Group>
              <Group>
                <CheckCircle size={16} color="green" />
                <Text size="sm">Performance analysis and insights</Text>
              </Group>
            </Stack>
          </Card>

          {/* Device Info */}
          <Card withBorder p="md" bg="blue.0">
            <Text size="sm" fw={600} mb="xs">Supported Devices</Text>
            <Text size="sm" c="dimmed">
              • Edge (all models)
              <br />
              • Forerunner (cycling activities)
              <br />
              • Fenix (cycling activities)
              <br />
              • Venu (cycling activities)
              <br />
              • All Garmin Connect compatible devices
            </Text>
            <Text size="xs" c="dimmed" mt="sm">
              Make sure your activities have synced to Garmin Connect
            </Text>
          </Card>
        </Stack>
      )}
    </Stack>
  );
};

export default GarminIntegration;
