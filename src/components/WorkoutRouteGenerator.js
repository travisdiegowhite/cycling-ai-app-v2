import React, { useState, useCallback, useEffect } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Card,
  Badge,
  Grid,
  ActionIcon,
  Alert,
  Loader,
  Center,
  TextInput,
  Divider,
} from '@mantine/core';
import {
  Brain,
  Navigation,
  MapPin,
  Search,
  Play,
  RotateCcw,
  ChevronLeft,
  Award,
  Target,
  Zap,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { generateAIRoutes } from '../utils/aiRouteGenerator';
import { WORKOUT_TYPES, estimateTSS } from '../utils/trainingPlans';
import { useUnits } from '../utils/units';
import { getWeatherData, getMockWeatherData } from '../utils/weather';
import { EnhancedContextCollector } from '../utils/enhancedContext';

/**
 * Workout Route Generator Component
 * Generates AI routes tailored to a specific planned workout
 */
const WorkoutRouteGenerator = () => {
  const { workoutId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { formatDistance, formatElevation } = useUnits();

  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState(null);
  const [plan, setPlan] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generatedRoutes, setGeneratedRoutes] = useState([]);
  const [startLocation, setStartLocation] = useState(null);
  const [currentAddress, setCurrentAddress] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [userPreferences, setUserPreferences] = useState(null);

  // Load workout data
  useEffect(() => {
    if (!user?.id || !workoutId) return;
    loadWorkoutData();
  }, [user?.id, workoutId]);

  const loadWorkoutData = async () => {
    try {
      setLoading(true);

      // Load workout
      const { data: workoutData, error: workoutError } = await supabase
        .from('planned_workouts')
        .select('*')
        .eq('id', workoutId)
        .single();

      if (workoutError) throw workoutError;
      if (!workoutData) {
        toast.error('Workout not found');
        navigate('/training');
        return;
      }

      setWorkout(workoutData);

      // Load associated plan
      const { data: planData } = await supabase
        .from('training_plans')
        .select('*')
        .eq('id', workoutData.plan_id)
        .single();

      if (planData) setPlan(planData);

    } catch (error) {
      console.error('Failed to load workout:', error);
      toast.error('Failed to load workout');
    } finally {
      setLoading(false);
    }
  };

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = [position.coords.longitude, position.coords.latitude];
        setStartLocation(location);

        // Get address
        const address = await reverseGeocode(location);
        setCurrentAddress(address);

        toast.success('Current location set as start point');

        // Fetch weather
        await fetchWeatherData(location);
      },
      (error) => {
        console.error('Geolocation error:', error);
        // Don't show error toast as it's not critical
      },
      {
        enableHighAccuracy: false, // Use faster, less accurate location
        timeout: 15000, // Longer timeout
        maximumAge: 300000 // Accept cached location up to 5 minutes old
      }
    );
  }, []);

  // Reverse geocode
  const reverseGeocode = async (coords) => {
    try {
      const [lng, lat] = coords;
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${process.env.REACT_APP_MAPBOX_TOKEN}`
      );
      const data = await response.json();
      return data.features[0]?.place_name || 'Unknown location';
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return 'Unknown location';
    }
  };

  // Search address
  const handleAddressSearch = async () => {
    if (!addressInput.trim()) return;

    setGeocoding(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          addressInput
        )}.json?access_token=${process.env.REACT_APP_MAPBOX_TOKEN}&limit=1`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        setStartLocation([lng, lat]);
        setCurrentAddress(data.features[0].place_name);
        toast.success('Location set');

        await fetchWeatherData([lng, lat]);
      } else {
        toast.error('Location not found');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error('Failed to search location');
    } finally {
      setGeocoding(false);
    }
  };

  // Fetch weather
  const fetchWeatherData = async (location) => {
    try {
      const [lng, lat] = location;
      const weather = await getWeatherData(lat, lng);
      setWeatherData(weather || getMockWeatherData());
    } catch (error) {
      console.warn('Weather fetch failed, using mock data');
      setWeatherData(getMockWeatherData());
    }
  };

  // Load user preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) return;

      try {
        const preferences = await EnhancedContextCollector.getCompletePreferences(user.id);
        setUserPreferences(preferences);
      } catch (error) {
        console.error('Failed to load preferences:', error);
      }
    };

    loadPreferences();
  }, [user?.id]);

  // Auto-get location on mount
  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  // Generate routes based on workout
  const generateRoutes = async () => {
    if (!startLocation) {
      toast.error('Please set a start location first');
      return;
    }

    if (!workout) {
      toast.error('Workout data not loaded');
      return;
    }

    setGenerating(true);
    setGeneratedRoutes([]);

    try {
      console.log('🚀 Generating routes for workout:', workout);

      // Prepare training context from workout
      const trainingContext = {
        workoutType: workout.workout_type,
        phase: plan?.current_phase || 'base',
        targetDuration: workout.target_duration,
        targetTSS: workout.target_tss,
        primaryZone: workout.target_zone,
      };

      // Determine route type based on workout
      let routeType = 'loop';
      if (workout.workout_type === 'long_ride') {
        routeType = 'loop';
      } else if (workout.workout_type === 'recovery') {
        routeType = 'out-and-back';
      }

      // Determine training goal from workout type
      let trainingGoal = 'endurance';
      if (workout.workout_type === 'hill_repeats') {
        trainingGoal = 'hills';
      } else if (workout.workout_type === 'intervals' || workout.workout_type === 'vo2max') {
        trainingGoal = 'intervals';
      } else if (workout.workout_type === 'recovery') {
        trainingGoal = 'recovery';
      }

      console.log('📊 Training context:', trainingContext);

      const routes = await generateAIRoutes({
        startLocation,
        timeAvailable: workout.target_duration,
        trainingGoal,
        routeType,
        weatherData,
        userId: user?.id,
        userPreferences,
        trainingContext,
      });

      console.log('🎯 Generated routes:', routes);
      setGeneratedRoutes(routes);

      if (routes.length > 0) {
        toast.success(`Generated ${routes.length} routes for your ${WORKOUT_TYPES[workout.workout_type]?.name}!`);
      } else {
        toast.warning('No suitable routes found. Try adjusting your location.');
      }
    } catch (err) {
      console.error('Route generation error:', err);
      toast.error('Failed to generate routes');
    } finally {
      setGenerating(false);
    }
  };

  // Link route to workout
  const linkRouteToWorkout = async (route) => {
    try {
      // Save route first (if needed)
      // Then link to workout
      const { error } = await supabase
        .from('planned_workouts')
        .update({
          route_id: route.id || null,
          description: route.description || workout.description,
        })
        .eq('id', workoutId);

      if (error) throw error;

      toast.success('Route linked to workout!');
      navigate(`/training/plans/${plan.id}`);
    } catch (error) {
      console.error('Failed to link route:', error);
      toast.error('Failed to link route to workout');
    }
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Text>Loading workout...</Text>
      </Container>
    );
  }

  if (!workout) {
    return (
      <Container size="xl" py="xl">
        <Alert color="red" title="Workout Not Found">
          This workout could not be found.
        </Alert>
      </Container>
    );
  }

  const workoutType = WORKOUT_TYPES[workout.workout_type];

  return (
    <Container size="lg" py="xl">
      <Paper withBorder p="xl">
        {/* Header */}
        <Group justify="space-between" mb="lg">
          <Group>
            <ActionIcon
              variant="subtle"
              onClick={() => navigate(`/training/plans/${plan?.id || ''}`)}
            >
              <ChevronLeft size={20} />
            </ActionIcon>
            <div>
              <Title order={2}>Generate Route for Workout</Title>
              <Text size="sm" c="dimmed" mt="xs">
                AI-powered route generation tailored to your training plan
              </Text>
            </div>
          </Group>
        </Group>

        <Divider mb="lg" />

        {/* Workout Details */}
        <Card withBorder p="md" mb="lg">
          <Group justify="space-between" mb="md">
            <Group gap="sm">
              <Text size="lg">{workoutType?.icon || '🚴'}</Text>
              <div>
                <Text size="lg" fw={600}>{workoutType?.name || workout.workout_type}</Text>
                <Text size="sm" c="dimmed">{workoutType?.description}</Text>
              </div>
            </Group>
            {plan && (
              <Badge color="blue" variant="light">
                Week {workout.week_number}
              </Badge>
            )}
          </Group>

          <Grid>
            <Grid.Col span={3}>
              <Text size="xs" c="dimmed">Duration</Text>
              <Group gap="xs">
                <Target size={16} />
                <Text size="sm" fw={600}>{workout.target_duration} min</Text>
              </Group>
            </Grid.Col>
            <Grid.Col span={3}>
              <Text size="xs" c="dimmed">Target TSS</Text>
              <Group gap="xs">
                <Zap size={16} />
                <Text size="sm" fw={600}>{workout.target_tss} TSS</Text>
              </Group>
            </Grid.Col>
            <Grid.Col span={3}>
              <Text size="xs" c="dimmed">Zone</Text>
              <Group gap="xs">
                <Award size={16} />
                <Text size="sm" fw={600}>Zone {workout.target_zone || 2}</Text>
              </Group>
            </Grid.Col>
            <Grid.Col span={3}>
              <Text size="xs" c="dimmed">Terrain</Text>
              <Text size="sm" fw={600}>{workout.terrain_preference || 'Mixed'}</Text>
            </Grid.Col>
          </Grid>
        </Card>

        {/* Location Selection */}
        <Stack gap="md" mb="lg">
          <Text size="sm" fw={500}>Start Location</Text>

          <TextInput
            placeholder="Enter address or location"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddressSearch()}
            leftSection={<MapPin size={16} />}
            rightSection={
              <ActionIcon
                onClick={handleAddressSearch}
                loading={geocoding}
                disabled={!addressInput.trim()}
              >
                <Search size={16} />
              </ActionIcon>
            }
          />

          <Group gap="sm">
            <Button
              variant="light"
              leftSection={<Navigation size={16} />}
              onClick={getCurrentLocation}
              size="sm"
            >
              Use Current Location
            </Button>
            {startLocation && (
              <Badge color="green" variant="light">
                Location Set
              </Badge>
            )}
          </Group>

          {currentAddress && (
            <Text size="xs" c="blue">
              📍 {currentAddress}
            </Text>
          )}
        </Stack>

        {/* Generate Button */}
        <Button
          size="lg"
          leftSection={generating ? <Loader size={20} /> : <Brain size={20} />}
          onClick={generateRoutes}
          loading={generating}
          disabled={!startLocation || generating}
          fullWidth
          mb="lg"
        >
          {generating ? 'Generating Routes...' : 'Generate AI Routes'}
        </Button>

        {/* Generated Routes */}
        {generatedRoutes.length > 0 && (
          <div>
            <Group justify="space-between" mb="sm">
              <Text size="sm" fw={500}>Generated Routes</Text>
              <ActionIcon variant="subtle" onClick={generateRoutes} disabled={generating}>
                <RotateCcw size={16} />
              </ActionIcon>
            </Group>

            <Stack gap="sm">
              {generatedRoutes.map((route, index) => {
                // Calculate TSS for this route
                const estimatedTSS = estimateTSS(
                  workout.target_duration,
                  route.distance,
                  route.elevationGain || 0,
                  workout.workout_type
                );

                // Check if TSS matches target
                const tssDiff = Math.abs(estimatedTSS - workout.target_tss);
                const isGoodMatch = tssDiff <= 15;

                return (
                  <Card key={index} withBorder p="md">
                    <Group justify="space-between" align="flex-start">
                      <div style={{ flex: 1 }}>
                        <Group gap="sm" mb="xs">
                          <Text size="sm" fw={600}>{route.name}</Text>
                          <Badge
                            size="sm"
                            color={route.difficulty === 'easy' ? 'green' : route.difficulty === 'hard' ? 'red' : 'yellow'}
                          >
                            {route.difficulty}
                          </Badge>
                          <Badge
                            size="sm"
                            color={isGoodMatch ? 'green' : 'orange'}
                            variant="light"
                          >
                            {estimatedTSS} TSS
                          </Badge>
                          {isGoodMatch && (
                            <Badge size="sm" color="green" variant="filled">
                              ✓ Good Match
                            </Badge>
                          )}
                        </Group>

                        <Grid gutter="xs">
                          <Grid.Col span={6}>
                            <Text size="xs" c="dimmed">Distance</Text>
                            <Text size="sm" fw={500}>{formatDistance(route.distance)}</Text>
                          </Grid.Col>
                          <Grid.Col span={6}>
                            <Text size="xs" c="dimmed">Elevation</Text>
                            <Text size="sm" fw={500}>+{formatElevation(route.elevationGain)}</Text>
                          </Grid.Col>
                        </Grid>

                        <Text size="xs" c="dimmed" mt="xs">
                          {route.description}
                        </Text>

                        {tssDiff > 15 && (
                          <Text size="xs" c="orange" mt="xs">
                            ⚠️ TSS differs from target by {tssDiff}
                          </Text>
                        )}
                      </div>

                      <Button
                        size="sm"
                        leftSection={<Play size={14} />}
                        onClick={() => linkRouteToWorkout(route)}
                      >
                        Use Route
                      </Button>
                    </Group>
                  </Card>
                );
              })}
            </Stack>
          </div>
        )}

        {/* No Routes Message */}
        {!generating && generatedRoutes.length === 0 && startLocation && (
          <Center p="xl">
            <Text size="sm" c="dimmed">
              Click "Generate AI Routes" to create routes for this workout
            </Text>
          </Center>
        )}
      </Paper>
    </Container>
  );
};

export default WorkoutRouteGenerator;
