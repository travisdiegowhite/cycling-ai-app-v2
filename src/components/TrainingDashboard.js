import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  Text,
  Group,
  Stack,
  Badge,
  RingProgress,
  Title,
  Tabs,
  Select,
  Button,
  ThemeIcon,
  Divider,
  Alert,
  Paper,
  SimpleGrid,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  Award,
  Target,
  Clock,
  Zap,
  Plus,
  Info,
  BarChart3,
  LineChart,
  Brain,
  Route as RouteIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import {
  calculateCTL,
  calculateATL,
  calculateTSB,
  interpretTSB,
  TRAINING_ZONES,
  WORKOUT_TYPES,
} from '../utils/trainingPlans';
import TrainingLoadChart from './TrainingLoadChart';
import RideHistoryTable from './RideHistoryTable';
import TrainingCalendar from './TrainingCalendar';
import { analyzeRidingPatterns } from '../utils/rideAnalysis';
import ActivityHeatmap from './ActivityHeatmap';
import { useUnits } from '../utils/units';

/**
 * Training Dashboard - Comprehensive Training Hub
 * Combines training metrics, AI insights, performance analysis, and ride history
 */
const TrainingDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { formatDistance, formatElevation, formatSpeed } = useUnits();

  // State
  const [loading, setLoading] = useState(true);
  const [trainingMetrics, setTrainingMetrics] = useState(null);
  const [recentRides, setRecentRides] = useState([]);
  const [dailyTSS, setDailyTSS] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [timeRange, setTimeRange] = useState('30'); // days

  // Smart Analysis State
  const [ridingPatterns, setRidingPatterns] = useState(null);
  const [patternsLoading, setPatternsLoading] = useState(false);
  const [allRoutes, setAllRoutes] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Load training data
  useEffect(() => {
    if (!user?.id) return;
    loadTrainingData();
  }, [user?.id, timeRange]);

  const loadTrainingData = async () => {
    try {
      setLoading(true);

      // Load active training plan
      const { data: plans } = await supabase
        .from('training_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (plans && plans.length > 0) {
        setActivePlan(plans[0]);
      }

      // Load recent rides (last 90 days for CTL calculation)
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - 90);

      // Load only essential fields to avoid memory issues and use correct field names
      const { data: rides } = await supabase
        .from('routes')
        .select('id, name, distance_km, elevation_gain_m, duration_seconds, recorded_at, created_at, route_type, training_stress_score, has_power_data')
        .eq('user_id', user.id)
        .gte('recorded_at', daysAgo.toISOString())
        .order('recorded_at', { ascending: false })
        .limit(1000); // Limit to recent 1000 rides for performance

      if (rides) {
        setRecentRides(rides);
        setAllRoutes(rides); // Store for analysis tabs

        // Calculate daily TSS
        const tssMap = {};
        rides.forEach(ride => {
          // Use recorded_at (actual activity date) instead of created_at (import date)
          const activityDate = ride.recorded_at || ride.created_at;
          const date = new Date(activityDate).toISOString().split('T')[0];
          if (!tssMap[date]) {
            tssMap[date] = 0;
          }
          // Estimate TSS from ride data (you may have actual TSS stored)
          const estimatedTSS = estimateTSSFromRide(ride);
          tssMap[date] += estimatedTSS;
        });

        // Convert to array format for last 90 days
        const tssArray = [];
        for (let i = 89; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateKey = date.toISOString().split('T')[0];
          tssArray.push({
            date: dateKey,
            tss: tssMap[dateKey] || 0
          });
        }
        setDailyTSS(tssArray);

        // Calculate current training metrics
        const tssValues = tssArray.map(d => d.tss);
        const ctl = calculateCTL(tssValues);
        const atl = calculateATL(tssValues.slice(-7)); // Last 7 days
        const tsb = calculateTSB(ctl, atl);
        const tsbInterpretation = interpretTSB(tsb);

        setTrainingMetrics({
          ctl,
          atl,
          tsb,
          interpretation: tsbInterpretation,
          weeklyTSS: tssValues.slice(-7).reduce((a, b) => a + b, 0),
          monthlyTSS: tssValues.slice(-30).reduce((a, b) => a + b, 0),
        });
      }

    } catch (error) {
      console.error('Failed to load training data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load riding patterns for Insights tab
  const loadRidingPatterns = async () => {
    if (ridingPatterns || patternsLoading || allRoutes.length === 0) return;

    try {
      setPatternsLoading(true);
      const patterns = await analyzeRidingPatterns(allRoutes);
      setRidingPatterns(patterns);
    } catch (error) {
      console.error('Failed to analyze riding patterns:', error);
    } finally {
      setPatternsLoading(false);
    }
  };

  // Trigger pattern analysis when switching to Insights tab
  useEffect(() => {
    if (activeTab === 'insights' && !ridingPatterns && allRoutes.length > 0) {
      loadRidingPatterns();
    }
  }, [activeTab, allRoutes]);

  // Helper: Estimate TSS from ride data
  const estimateTSSFromRide = (ride) => {
    // If we have actual training_stress_score, use it
    if (ride.training_stress_score && ride.training_stress_score > 0) {
      return ride.training_stress_score;
    }

    // Otherwise estimate from ride metrics using correct field names
    const distanceKm = ride.distance_km || 0;
    const elevationM = ride.elevation_gain_m || 0;
    const durationSeconds = ride.duration_seconds || 3600; // Default 1 hour if not available

    // Simple estimation: 50 TSS/hour base + elevation factor
    const baseTSS = (durationSeconds / 3600) * 50;
    const elevationFactor = (elevationM / 300) * 10;
    return Math.round(baseTSS + elevationFactor);
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Text>Loading training data...</Text>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      {/* Header */}
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>Training Hub</Title>
          <Text size="sm" c="dimmed">
            Fitness tracking, AI insights, performance analysis & training planning
          </Text>
        </div>
        <Group>
          <Select
            value={timeRange}
            onChange={setTimeRange}
            data={[
              { value: '7', label: 'Last 7 days' },
              { value: '30', label: 'Last 30 days' },
              { value: '90', label: 'Last 90 days' },
            ]}
            size="sm"
          />
          <Button
            leftSection={<Plus size={16} />}
            onClick={() => navigate('/training/plans/new')}
          >
            New Training Plan
          </Button>
        </Group>
      </Group>

      {/* Active Plan Alert */}
      {activePlan && (
        <Alert
          icon={<Award size={16} />}
          title={`Active Plan: ${activePlan.name}`}
          color="blue"
          mb="lg"
        >
          <Group justify="space-between">
            <Text size="sm">
              Week {activePlan.current_week} of {activePlan.duration_weeks} • {activePlan.current_phase} phase
            </Text>
            <Button size="xs" variant="light" onClick={() => navigate(`/training/plans/${activePlan.id}`)}>
              View Plan
            </Button>
          </Group>
        </Alert>
      )}

      {/* Training Metrics Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
        {/* CTL - Chronic Training Load (Fitness) */}
        <Card withBorder p="md">
          <Group justify="space-between" mb="xs">
            <Text size="sm" c="dimmed">Fitness (CTL)</Text>
            <Tooltip label="42-day exponentially weighted average TSS">
              <ActionIcon size="xs" variant="subtle">
                <Info size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Group align="flex-end" gap="xs">
            <Text size="xl" fw={700}>{trainingMetrics?.ctl || 0}</Text>
            <TrendingUp size={16} color="#22c55e" />
          </Group>
          <Text size="xs" c="dimmed" mt="xs">
            Long-term training stress
          </Text>
        </Card>

        {/* ATL - Acute Training Load (Fatigue) */}
        <Card withBorder p="md">
          <Group justify="space-between" mb="xs">
            <Text size="sm" c="dimmed">Fatigue (ATL)</Text>
            <Tooltip label="7-day exponentially weighted average TSS">
              <ActionIcon size="xs" variant="subtle">
                <Info size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Group align="flex-end" gap="xs">
            <Text size="xl" fw={700}>{trainingMetrics?.atl || 0}</Text>
            <Activity size={16} color="#f59e0b" />
          </Group>
          <Text size="xs" c="dimmed" mt="xs">
            Recent training stress
          </Text>
        </Card>

        {/* TSB - Training Stress Balance (Form) */}
        <Card withBorder p="md">
          <Group justify="space-between" mb="xs">
            <Text size="sm" c="dimmed">Form (TSB)</Text>
            <Tooltip label="Chronic Training Load minus Acute Training Load">
              <ActionIcon size="xs" variant="subtle">
                <Info size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Group align="flex-end" gap="xs">
            <Text size="xl" fw={700}>{trainingMetrics?.tsb || 0}</Text>
            <Badge color={trainingMetrics?.interpretation?.color || 'gray'} variant="light">
              {trainingMetrics?.interpretation?.status || 'neutral'}
            </Badge>
          </Group>
          <Text size="xs" c="dimmed" mt="xs">
            {trainingMetrics?.interpretation?.message || 'Balanced training state'}
          </Text>
        </Card>

        {/* Weekly TSS */}
        <Card withBorder p="md">
          <Group justify="space-between" mb="xs">
            <Text size="sm" c="dimmed">Weekly TSS</Text>
            <Tooltip label="Total Training Stress Score this week">
              <ActionIcon size="xs" variant="subtle">
                <Info size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Group align="flex-end" gap="xs">
            <Text size="xl" fw={700}>{trainingMetrics?.weeklyTSS || 0}</Text>
            <Zap size={16} color="#3b82f6" />
          </Group>
          <Text size="xs" c="dimmed" mt="xs">
            Last 7 days
          </Text>
        </Card>
      </SimpleGrid>

      {/* Form Interpretation */}
      {trainingMetrics?.interpretation && (
        <Alert
          color={trainingMetrics.interpretation.color}
          title={`You are ${trainingMetrics.interpretation.status}`}
          icon={<Activity size={16} />}
          mb="lg"
        >
          <Text size="sm">{trainingMetrics.interpretation.recommendation}</Text>
        </Alert>
      )}

      {/* Tabs for different views */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="md">
          <Tabs.Tab value="overview" leftSection={<BarChart3 size={16} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="insights" leftSection={<Brain size={16} />}>
            Insights
          </Tabs.Tab>
          <Tabs.Tab value="performance" leftSection={<Zap size={16} />}>
            Performance
          </Tabs.Tab>
          <Tabs.Tab value="trends" leftSection={<TrendingUp size={16} />}>
            Trends
          </Tabs.Tab>
          <Tabs.Tab value="history" leftSection={<Activity size={16} />}>
            Ride History
          </Tabs.Tab>
          <Tabs.Tab value="calendar" leftSection={<Calendar size={16} />}>
            Calendar
          </Tabs.Tab>
        </Tabs.List>

        {/* Overview Tab - Training Load */}
        <Tabs.Panel value="overview">
          <TrainingLoadChart data={dailyTSS} metrics={trainingMetrics} />
        </Tabs.Panel>

        {/* Insights Tab - AI Patterns & Recommendations */}
        <Tabs.Panel value="insights" pt="md">
          {patternsLoading ? (
            <Center py="xl">
              <Stack align="center">
                <Text c="dimmed">Analyzing your riding patterns...</Text>
              </Stack>
            </Center>
          ) : ridingPatterns ? (
            <Stack gap="lg">
              {/* Riding Intelligence Card */}
              <Card withBorder>
                <Group justify="space-between" mb="md">
                  <Title order={3}>Riding Intelligence</Title>
                  <Badge color="blue" variant="light">AI Powered</Badge>
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <Stack gap="xs">
                    <Text size="sm" fw={600} c="dimmed">RIDING STYLE</Text>
                    <Text size="lg" fw={700}>{ridingPatterns.ridingStyle?.style || 'Balanced'}</Text>
                    <Text size="sm" c="dimmed">{ridingPatterns.ridingStyle?.description}</Text>
                  </Stack>

                  <Stack gap="xs">
                    <Text size="sm" fw={600} c="dimmed">FAVORITE TERRAIN</Text>
                    <Text size="lg" fw={700}>{ridingPatterns.terrainPreference?.type || 'Mixed'}</Text>
                    <Text size="sm" c="dimmed">{ridingPatterns.terrainPreference?.description}</Text>
                  </Stack>
                </SimpleGrid>

                {ridingPatterns.recommendations && ridingPatterns.recommendations.length > 0 && (
                  <>
                    <Divider my="md" />
                    <Stack gap="xs">
                      <Text size="sm" fw={600} c="dimmed">RECOMMENDATIONS</Text>
                      {ridingPatterns.recommendations.slice(0, 3).map((rec, idx) => (
                        <Alert key={idx} color="blue" variant="light">
                          {rec}
                        </Alert>
                      ))}
                    </Stack>
                  </>
                )}
              </Card>

              {/* Activity Heatmap */}
              {allRoutes && allRoutes.length > 0 && (
                <Card withBorder>
                  <Title order={4} mb="md">Activity Heatmap</Title>
                  <ActivityHeatmap routes={allRoutes} />
                </Card>
              )}
            </Stack>
          ) : (
            <Card withBorder p="xl">
              <Stack align="center">
                <Brain size={48} color="gray" />
                <Title order={4}>AI Insights</Title>
                <Text c="dimmed" ta="center">Complete more rides to unlock intelligent pattern analysis</Text>
              </Stack>
            </Card>
          )}
        </Tabs.Panel>

        {/* Performance Tab */}
        <Tabs.Panel value="performance" pt="md">
          <Stack gap="lg">
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <Card withBorder>
                <Stack gap="xs">
                  <Text size="sm" c="dimmed">Average Speed</Text>
                  <Text size="xl" fw={700}>
                    {allRoutes.length > 0
                      ? formatSpeed(allRoutes.reduce((sum, r) => sum + (r.average_speed || 0), 0) / allRoutes.length)
                      : '-'}
                  </Text>
                </Stack>
              </Card>

              <Card withBorder>
                <Stack gap="xs">
                  <Text size="sm" c="dimmed">Avg Elevation/Ride</Text>
                  <Text size="xl" fw={700}>
                    {allRoutes.length > 0
                      ? formatElevation(allRoutes.reduce((sum, r) => sum + (r.elevation_gain_m || 0), 0) / allRoutes.length)
                      : '-'}
                  </Text>
                </Stack>
              </Card>

              <Card withBorder>
                <Stack gap="xs">
                  <Text size="sm" c="dimmed">Avg Distance/Ride</Text>
                  <Text size="xl" fw={700}>
                    {allRoutes.length > 0
                      ? formatDistance(allRoutes.reduce((sum, r) => sum + (r.distance_km || 0), 0) / allRoutes.length)
                      : '-'}
                  </Text>
                </Stack>
              </Card>
            </SimpleGrid>

            <Card withBorder>
              <Title order={4} mb="md">Performance Metrics</Title>
              <Text c="dimmed">Detailed performance analytics coming soon</Text>
            </Card>
          </Stack>
        </Tabs.Panel>

        {/* Trends Tab */}
        <Tabs.Panel value="trends" pt="md">
          <Card withBorder>
            <Title order={4} mb="md">Training Trends</Title>
            <Text c="dimmed">Trend analysis visualization coming soon</Text>
          </Card>
        </Tabs.Panel>

        {/* Ride History Tab */}
        <Tabs.Panel value="history">
          <RideHistoryTable rides={recentRides} />
        </Tabs.Panel>

        {/* Calendar Tab */}
        <Tabs.Panel value="calendar">
          <TrainingCalendar activePlan={activePlan} />
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
};

export default TrainingDashboard;
