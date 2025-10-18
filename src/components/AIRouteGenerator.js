import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Paper,
  Text,
  Button,
  Group,
  Stack,
  Slider,
  Radio,
  Card,
  Badge,
  Grid,
  ActionIcon,
  Alert,
  Loader,
  Center,
  TextInput,
  Select,
  Divider,
  Switch,
  Collapse,
  Accordion,
} from '@mantine/core';
import {
  Brain,
  Wind,
  Sun,
  Moon,
  Route,
  Play,
  RotateCcw,
  Navigation,
  MapPin,
  Search,
  Settings,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUnits } from '../utils/units';
import { getWeatherData, getMockWeatherData } from '../utils/weather';
import { generateAIRoutes } from '../utils/aiRouteGenerator';
import PreferenceSettings from './PreferenceSettings';
import { EnhancedContextCollector } from '../utils/enhancedContext';
import TrainingContextSelector from './TrainingContextSelector';
import { estimateTSS, WORKOUT_TYPES } from '../utils/trainingPlans';
import { supabase } from '../supabase';
import { generateIntervalCues } from '../utils/intervalCues';
import IntervalCues from './IntervalCues';

const AIRouteGenerator = ({ mapRef, onRouteGenerated, onStartLocationSet, externalStartLocation }) => {
  const { user } = useAuth();
  const { formatDistance, formatElevation, formatTemperature, formatSpeed } = useUnits();
  const [searchParams, setSearchParams] = useSearchParams();

  
  // User inputs
  const [timeAvailable, setTimeAvailable] = useState(60); // minutes
  const [trainingGoal, setTrainingGoal] = useState('endurance');
  const [recreationalStyle, setRecreationalStyle] = useState('scenic'); // For recreational mode
  const [routeType, setRouteType] = useState('loop');
  const [startLocation, setStartLocation] = useState(null);
  const [addressInput, setAddressInput] = useState('');
  const [currentAddress, setCurrentAddress] = useState('');
  const [isTrainingMode, setIsTrainingMode] = useState(true); // Toggle between training and recreational

  // Training context state
  const [trainingContext, setTrainingContext] = useState({
    workoutType: 'endurance',
    phase: 'base',
    targetDuration: 60,
    targetTSS: 75,
    primaryZone: 2
  });

  // Track if training context has been manually modified
  const [trainingContextManuallySet, setTrainingContextManuallySet] = useState(false);

  // Training plan integration
  const [activePlans, setActivePlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [planWorkouts, setPlanWorkouts] = useState([]);
  const [selectedWorkout, setSelectedWorkout] = useState(null);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generatedRoutes, setGeneratedRoutes] = useState([]);
  const [weatherData, setWeatherData] = useState(null);
  const [error, setError] = useState(null);
  const [geocoding, setGeocoding] = useState(false);
  const [preferencesOpened, setPreferencesOpened] = useState(false);
  const [userPreferences, setUserPreferences] = useState(null);

  // Feature toggles for debugging
  const [usePastRides, setUsePastRides] = useState(false); // Default OFF to avoid junk routes
  const [useTrainingContext, setUseTrainingContext] = useState(true);

  // Ref to track the last processed external location to prevent re-render loops
  const lastExternalLocationRef = useRef(null);

  // Handler to set training context and mark as manually set
  const handleTrainingContextChange = useCallback((newContext) => {
    setTrainingContext(newContext);
    setTrainingContextManuallySet(true);
  }, []);

  // Sync training context with trainingGoal and timeAvailable (but only if not manually set)
  useEffect(() => {
    if (!trainingContextManuallySet && !selectedWorkout) {
      // Get default values for this workout type from WORKOUT_TYPES
      const workoutType = WORKOUT_TYPES[trainingGoal];

      setTrainingContext(prev => ({
        ...prev,
        workoutType: trainingGoal,
        targetDuration: timeAvailable,
        // Update primaryZone and targetTSS based on workout type defaults
        primaryZone: workoutType?.primaryZone || prev.primaryZone,
        targetTSS: workoutType?.defaultTSS || prev.targetTSS
      }));
    }
  }, [trainingGoal, timeAvailable, trainingContextManuallySet, selectedWorkout]);

  // Training goal options
  const trainingGoals = [
    { value: 'endurance', label: 'Endurance', icon: '🚴', description: 'Steady, sustained effort' },
    { value: 'intervals', label: 'Intervals', icon: '⚡', description: 'High intensity training' },
    { value: 'recovery', label: 'Recovery', icon: '😌', description: 'Easy, restorative ride' },
    { value: 'hills', label: 'Hill Training', icon: '⛰️', description: 'Climbing focused workout' },
  ];

  // Recreational ride style options
  const recreationalStyles = [
    { value: 'scenic', label: 'Scenic', icon: '🌄', description: 'Beautiful views and quiet roads' },
    { value: 'urban', label: 'Urban Explorer', icon: '🏙️', description: 'City streets and neighborhoods' },
    { value: 'coffee', label: 'Coffee Ride', icon: '☕', description: 'Relaxed pace with cafe stops' },
    { value: 'social', label: 'Social Cruise', icon: '👥', description: 'Easy group-friendly route' },
  ];

  // Route type options
  const routeTypes = [
    { value: 'loop', label: 'Loop', description: 'Return to start point' },
    { value: 'out_back', label: 'Out & Back', description: 'Go out, return same way' },
    { value: 'point_to_point', label: 'Point-to-Point', description: 'End at different location' },
  ];

  // Fetch weather data when location is set
  const fetchWeatherData = useCallback(async (location) => {
    if (!location) return;

    try {
      const weather = await getWeatherData(location[1], location[0]);
      if (weather) {
        setWeatherData(weather);
        // Format temperature inline to avoid dependency issues
        const tempF = Math.round((weather.temperature * 9/5) + 32);
        toast.success(`Weather updated: ${tempF}°F, ${weather.description}`);
      } else {
        // Use mock data as fallback
        setWeatherData(getMockWeatherData());
      }
    } catch (error) {
      console.warn('Weather fetch failed, using mock data:', error);
      setWeatherData(getMockWeatherData());
    }
  }, []);

  // Geocode address to coordinates using Mapbox Geocoding API
  const geocodeAddress = async (address) => {
    if (!address.trim()) return null;
    
    const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN;
    if (!mapboxToken) {
      toast.error('Mapbox token not available for geocoding');
      return null;
    }

    try {
      setGeocoding(true);
      const encodedAddress = encodeURIComponent(address);
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${mapboxToken}&country=US&types=address,poi`
      );
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [longitude, latitude] = feature.center;
        return {
          coordinates: [longitude, latitude],
          address: feature.place_name
        };
      } else {
        toast.error('Address not found');
        return null;
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error('Failed to find address');
      return null;
    } finally {
      setGeocoding(false);
    }
  };

  // Reverse geocode coordinates to address
  const reverseGeocode = useCallback(async (location) => {
    const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN;
    if (!mapboxToken || !location) return '';

    try {
      const [longitude, latitude] = location;
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxToken}&types=address,poi`
      );

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        return data.features[0].place_name;
      }
      return '';
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      return '';
    }
  }, []);

  // Handle address search
  const handleAddressSearch = async () => {
    const result = await geocodeAddress(addressInput);
    if (result) {
      const location = result.coordinates;
      setStartLocation(location);
      setCurrentAddress(result.address);
      onStartLocationSet && onStartLocationSet(location);
      
      // Fetch weather for this location
      await fetchWeatherData(location);
      
      // Center map on the location
      if (mapRef?.current) {
        mapRef.current.flyTo({
          center: location,
          zoom: 13,
          duration: 1000
        });
      }
      
      toast.success('Location set from address');
    }
  };

  // Get current location
  const getCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = [position.coords.longitude, position.coords.latitude];
        setStartLocation(location);
        onStartLocationSet && onStartLocationSet(location);

        // Get address for current location
        const address = await reverseGeocode(location);
        setCurrentAddress(address);

        toast.success('Current location set as start point');

        // Fetch weather for this location
        await fetchWeatherData(location);

        // Center map on current location
        if (mapRef?.current) {
          mapRef.current.flyTo({
            center: location,
            zoom: 13,
            duration: 1000
          });
        }
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
  }, [mapRef, onStartLocationSet, reverseGeocode, fetchWeatherData]);

  // Handle map click for start location
  useEffect(() => {
    if (!mapRef?.current) return;

    const map = mapRef.current.getMap();

    const handleMapClick = async (e) => {
      const { lng, lat } = e.lngLat;
      const location = [lng, lat];
      setStartLocation(location);
      onStartLocationSet && onStartLocationSet(location);

      // Get address for clicked location
      const address = await reverseGeocode(location);
      setCurrentAddress(address);

      toast.success('Start location set');

      // Fetch weather for clicked location
      await fetchWeatherData(location);
    };

    map.on('click', handleMapClick);
    return () => map.off('click', handleMapClick);
  }, [mapRef, onStartLocationSet, reverseGeocode, fetchWeatherData]);

  // Handle external location changes (e.g., from map marker dragging)
  // Uses a ref to track the last processed location and prevent infinite loops
  useEffect(() => {
    if (!externalStartLocation) return;

    // Create a stable string representation for comparison
    const externalKey = `${externalStartLocation[0]},${externalStartLocation[1]}`;
    const lastKey = lastExternalLocationRef.current;

    // Only process if this is truly a new location
    if (externalKey !== lastKey) {
      lastExternalLocationRef.current = externalKey;

      // Update the location without triggering circular updates
      setStartLocation(externalStartLocation);

      // Fetch address and weather in the background
      // Using Promise.all to avoid blocking and potential race conditions
      Promise.all([
        reverseGeocode(externalStartLocation),
        fetchWeatherData(externalStartLocation)
      ]).then(([address]) => {
        if (address) {
          setCurrentAddress(address);
        }
      }).catch(error => {
        console.warn('Failed to update location details:', error);
      });
    }
  }, [externalStartLocation, reverseGeocode, fetchWeatherData]);

  // Load user preferences for traffic avoidance
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!user?.id) return;

      try {
        console.log('🔧 Loading user preferences for traffic avoidance...');
        const preferences = await EnhancedContextCollector.getCompletePreferences(user.id);
        if (preferences) {
          setUserPreferences(preferences);
          console.log('✅ Loaded user preferences:', preferences);

          // Log key traffic avoidance settings
          if (preferences.routingPreferences?.trafficTolerance) {
            console.log(`🚫 Traffic tolerance: ${preferences.routingPreferences.trafficTolerance}`);
          }
          if (preferences.scenicPreferences?.quietnessLevel) {
            console.log(`🤫 Quietness level: ${preferences.scenicPreferences.quietnessLevel}`);
          }
        } else {
          console.log('⚠️ No user preferences found - using defaults');
        }
      } catch (error) {
        console.error('❌ Failed to load user preferences:', error);
      }
    };

    loadUserPreferences();
  }, [user?.id]);

  // Load active training plans
  useEffect(() => {
    const loadTrainingPlans = async () => {
      if (!user?.id) return;

      try {
        const { data: plans } = await supabase
          .from('training_plans')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        setActivePlans(plans || []);
      } catch (error) {
        console.error('Failed to load training plans:', error);
      }
    };

    loadTrainingPlans();
  }, [user?.id]);

  // Load workouts when plan is selected
  useEffect(() => {
    const loadWorkouts = async () => {
      if (!selectedPlan) {
        setPlanWorkouts([]);
        setSelectedWorkout(null);
        return;
      }

      try {
        const { data: workouts } = await supabase
          .from('planned_workouts')
          .select('*')
          .eq('plan_id', selectedPlan)
          .neq('workout_type', 'rest')
          .order('week_number', { ascending: true })
          .order('day_of_week', { ascending: true });

        setPlanWorkouts(workouts || []);
      } catch (error) {
        console.error('Failed to load workouts:', error);
      }
    };

    loadWorkouts();
  }, [selectedPlan]);

  // Update training context when workout is selected
  useEffect(() => {
    if (!selectedWorkout) return;

    const workout = planWorkouts.find(w => w.id === selectedWorkout);
    if (workout) {
      setTrainingContext({
        workoutType: workout.workout_type,
        phase: workout.phase || 'base',
        targetDuration: workout.target_duration,
        targetTSS: workout.target_tss,
        primaryZone: workout.target_zone,
      });

      // Mark as not manually set since it's from a workout
      setTrainingContextManuallySet(false);

      // Also update time available to match workout duration
      setTimeAvailable(workout.target_duration);
    }
  }, [selectedWorkout, planWorkouts]);

  // Automatically get current location on mount
  useEffect(() => {
    getCurrentLocation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle workout parameter from URL
  useEffect(() => {
    const workoutId = searchParams.get('workout');

    if (workoutId && !selectedWorkout && user?.id) {
      const loadWorkoutFromUrl = async () => {
        try {
          // Find the workout and its plan
          const { data: workout, error } = await supabase
            .from('planned_workouts')
            .select('*, training_plans!inner(id, name)')
            .eq('id', workoutId)
            .eq('training_plans.user_id', user.id)
            .single();

          if (error) {
            console.error('Failed to load workout from URL:', error);
            // Clear the invalid parameter
            setSearchParams({});
            return;
          }

          if (workout) {
            // Set the plan first
            setSelectedPlan(workout.plan_id);
            // Workout will be set after planWorkouts loads
            // Store the workout ID to select it once workouts are loaded
            sessionStorage.setItem('pendingWorkoutSelection', workoutId);
          }
        } catch (error) {
          console.error('Error loading workout from URL:', error);
          setSearchParams({});
        }
      };

      loadWorkoutFromUrl();
    }
  }, [searchParams, selectedWorkout, user?.id, setSearchParams]);

  // Select workout once plan workouts are loaded (for URL parameter flow)
  useEffect(() => {
    const pendingWorkoutId = sessionStorage.getItem('pendingWorkoutSelection');
    if (pendingWorkoutId && planWorkouts.length > 0 && !selectedWorkout) {
      // Check if the workout is in the loaded workouts
      const workout = planWorkouts.find(w => w.id === pendingWorkoutId);
      if (workout) {
        setSelectedWorkout(pendingWorkoutId);
        sessionStorage.removeItem('pendingWorkoutSelection');
        // Clear the URL parameter after selection
        setSearchParams({});
        toast.success(`Loaded workout: Week ${workout.week_number} - ${WORKOUT_TYPES[workout.workout_type]?.name || workout.workout_type}`);
      }
    }
  }, [planWorkouts, selectedWorkout, setSearchParams]);

  // Generate intelligent routes
  const generateRoutes = async () => {
    if (!startLocation) {
      toast.error('Please set a start location first');
      return;
    }

    setGenerating(true);
    setError(null);
    setGeneratedRoutes([]);

    try {
      console.log('🚀 Starting route generation...');
      console.log('Parameters:', { startLocation, timeAvailable, trainingGoal, routeType });
      console.log('Weather data:', weatherData);
      console.log('🎛️ User preferences for traffic avoidance:', userPreferences);
      console.log('🔧 Feature toggles:', { usePastRides, useTrainingContext });
      console.log('📊 Passing userId:', usePastRides ? user?.id : null);
      console.log('🎯 Passing trainingContext:', useTrainingContext ? trainingContext : null);

      // Show traffic avoidance status
      if (userPreferences?.routingPreferences?.trafficTolerance === 'low') {
        console.log('🚫 TRAFFIC AVOIDANCE ACTIVE - Will prioritize quiet roads');
      } else if (userPreferences?.routingPreferences?.trafficTolerance === 'medium') {
        console.log('⚖️ MODERATE TRAFFIC TOLERANCE - Will avoid major highways');
      } else {
        console.log('🚗 HIGH TRAFFIC TOLERANCE - Will use any road type');
      }


      const routes = await generateAIRoutes({
        startLocation,
        timeAvailable,
        trainingGoal: isTrainingMode ? trainingGoal : recreationalStyle, // Use training goal or recreational style
        routeType,
        weatherData,
        userId: usePastRides ? user?.id : null, // Only pass userId if usePastRides is enabled
        userPreferences: userPreferences,
        trainingContext: (useTrainingContext && isTrainingMode) ? trainingContext : null, // Only pass training context if enabled AND in training mode
        isRecreational: !isTrainingMode, // Flag to indicate recreational mode
      });
      
      console.log('🎯 Generated routes:', routes);

      // Defer state update to avoid React error #185
      setTimeout(() => {
        setGeneratedRoutes(routes);

        if (routes.length > 0) {
          toast.success(`Generated ${routes.length} optimized route options!`);
        } else {
          toast.warning('No suitable routes found. Try adjusting your parameters.');
        }
      }, 0);
    } catch (err) {
      console.error('Route generation error:', err);
      setError(err.message || 'Failed to generate routes');
      toast.error('Failed to generate routes');
    } finally {
      setGenerating(false);
    }
  };

  // Format time display
  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Get time of day
  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 6) return { label: 'Early Morning', icon: Moon };
    if (hour < 12) return { label: 'Morning', icon: Sun };
    if (hour < 18) return { label: 'Afternoon', icon: Sun };
    return { label: 'Evening', icon: Moon };
  };

  const timeOfDay = getTimeOfDay();

  return (
    <>
      <PreferenceSettings 
        opened={preferencesOpened} 
        onClose={() => {
          setPreferencesOpened(false);
          // Refresh preferences after saving
          if (user?.id) {
            EnhancedContextCollector.getCompletePreferences(user.id).then(prefs => {
              setUserPreferences(prefs);
              console.log('🔄 Refreshed user preferences after saving');
            });
          }
        }} 
      />
      
      <Paper shadow="sm" p="xl" radius="md">
        <Stack gap="lg">
          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <Brain size={48} style={{ color: '#228be6', marginBottom: '1rem' }} />
            <Text size="xl" fw={600} mb="xs">
              Smart Route Planner
            </Text>
            <Text size="sm" c="dimmed">
              Personalized routes optimized for your training goals and conditions
            </Text>
          </div>

        {/* Route Preferences - Prominent at top */}
        <Button
          variant="gradient"
          gradient={{ from: 'blue', to: 'cyan', deg: 90 }}
          leftSection={<Settings size={18} />}
          onClick={() => setPreferencesOpened(true)}
          fullWidth
          size="md"
        >
          Route Preferences
        </Button>
        <Text size="xs" c="dimmed" mt="-8" mb="sm">
          Set safety, surface, scenic preferences and areas to avoid
        </Text>

        {/* Current Conditions - Compact */}
        <Card withBorder p="xs" style={{ backgroundColor: '#f8f9fa' }}>
          <Group justify="space-between" gap="xs">
            <Group gap="xs">
              <timeOfDay.icon size={14} />
              <Text size="xs" fw={500}>{timeOfDay.label}</Text>
            </Group>
            {weatherData && (
              <Group gap="sm">
                <Text size="xs">{formatTemperature(weatherData.temperature)}</Text>
                <Text size="xs">{formatSpeed(weatherData.windSpeed)}</Text>
              </Group>
            )}
          </Group>
        </Card>

        {/* Start Location */}
        <div>
          <Text size="sm" fw={500} mb="xs">Start Location</Text>
          
          {/* Address Input */}
          <Group gap="sm" mb="sm">
            <TextInput
              placeholder="Enter address or location name..."
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              leftSection={<MapPin size={16} />}
              style={{ flex: 1 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddressSearch();
                }
              }}
            />
            <Button
              variant="light"
              leftSection={geocoding ? <Loader size={16} /> : <Search size={16} />}
              onClick={handleAddressSearch}
              loading={geocoding}
              disabled={!addressInput.trim()}
              size="sm"
            >
              Search
            </Button>
          </Group>

          {/* Location Buttons */}
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

          {/* Current Address Display */}
          {currentAddress && (
            <Text size="xs" c="blue" mt="xs">
              📍 {currentAddress}
            </Text>
          )}
          
          {!startLocation && (
            <Text size="xs" c="dimmed" mt="xs">
              Enter an address above, click on the map, or use current location
            </Text>
          )}
        </div>

        {/* Time Available */}
        <div>
          <Text size="sm" fw={500} mb="xs">
            Time Available: {formatTime(timeAvailable)}
          </Text>
          <Slider
            value={timeAvailable}
            onChange={setTimeAvailable}
            min={15}
            max={240}
            step={15}
            marks={[
              { value: 30, label: '30m' },
              { value: 60, label: '1h' },
              { value: 120, label: '2h' },
              { value: 180, label: '3h' },
            ]}
            color="blue"
          />
        </div>

        {/* Training vs Recreational Toggle */}
        <Card withBorder p="sm" style={{ backgroundColor: '#f0f9ff' }}>
          <Group justify="space-between" align="center">
            <div>
              <Text size="sm" fw={500}>Ride Mode</Text>
              <Text size="xs" c="dimmed">
                {isTrainingMode ? 'Training ride with specific goals' : 'Casual ride for enjoyment'}
              </Text>
            </div>
            <Switch
              checked={isTrainingMode}
              onChange={(e) => setIsTrainingMode(e.currentTarget.checked)}
              size="lg"
              onLabel="Training"
              offLabel="Recreational"
              styles={{
                track: {
                  minWidth: '120px'
                }
              }}
            />
          </Group>
        </Card>

        {/* Quick Training Setup - Only show in training mode */}
        {isTrainingMode && (
          <div>
            <Text size="sm" fw={500} mb="sm">What type of ride?</Text>
          <Radio.Group value={trainingGoal} onChange={setTrainingGoal}>
            <Grid gutter="xs">
              {trainingGoals.map((goal) => (
                <Grid.Col span={6} key={goal.value}>
                  <Card
                    withBorder
                    p="xs"
                    style={{
                      backgroundColor: trainingGoal === goal.value ? '#e7f5ff' : 'white',
                      border: trainingGoal === goal.value ? '2px solid #228be6' : '1px solid #dee2e6',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                    onClick={() => setTrainingGoal(goal.value)}
                  >
                    <Stack gap={4} align="center">
                      <Text size="xl">{goal.icon}</Text>
                      <Text size="sm" fw={500}>{goal.label}</Text>
                      <Radio value={goal.value} style={{ display: 'none' }} />
                    </Stack>
                  </Card>
                </Grid.Col>
              ))}
            </Grid>
          </Radio.Group>
          </div>
        )}

        {/* Recreational Ride Style - Only show in recreational mode */}
        {!isTrainingMode && (
          <div>
            <Text size="sm" fw={500} mb="sm">What kind of ride?</Text>
            <Radio.Group value={recreationalStyle} onChange={setRecreationalStyle}>
              <Grid gutter="xs">
                {recreationalStyles.map((style) => (
                  <Grid.Col span={6} key={style.value}>
                    <Card
                      withBorder
                      p="xs"
                      style={{
                        backgroundColor: recreationalStyle === style.value ? '#e7f5ff' : 'white',
                        border: recreationalStyle === style.value ? '2px solid #228be6' : '1px solid #dee2e6',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                      onClick={() => setRecreationalStyle(style.value)}
                    >
                      <Stack gap={4} align="center">
                        <Text size="xl">{style.icon}</Text>
                        <Text size="sm" fw={500}>{style.label}</Text>
                        <Radio value={style.value} style={{ display: 'none' }} />
                      </Stack>
                    </Card>
                  </Grid.Col>
                ))}
              </Grid>
            </Radio.Group>
          </div>
        )}

        {/* Route Type */}
        <div>
          <Text size="sm" fw={500} mb="sm">Route Type</Text>
          <Radio.Group value={routeType} onChange={setRouteType}>
            <Grid gutter="xs">
              {routeTypes.map((type) => (
                <Grid.Col span={4} key={type.value}>
                  <Card
                    withBorder
                    p="xs"
                    style={{
                      backgroundColor: routeType === type.value ? '#e7f5ff' : 'white',
                      border: routeType === type.value ? '2px solid #228be6' : '1px solid #dee2e6',
                      cursor: 'pointer',
                      textAlign: 'center',
                      minHeight: '80px'
                    }}
                    onClick={() => setRouteType(type.value)}
                  >
                    <Stack gap={4} align="center" justify="center" style={{ height: '100%' }}>
                      <Route size={18} />
                      <Text size="xs" fw={500}>{type.label}</Text>
                      <Radio value={type.value} style={{ display: 'none' }} />
                    </Stack>
                  </Card>
                </Grid.Col>
              ))}
            </Grid>
          </Radio.Group>
        </div>

        {/* Generate Button - PROMINENT POSITION */}
        <Button
          size="lg"
          leftSection={generating ? <Loader size={20} /> : <Brain size={20} />}
          onClick={generateRoutes}
          loading={generating}
          disabled={!startLocation || generating}
          fullWidth
          style={{
            fontSize: '16px',
            height: '50px',
            marginTop: '8px',
            marginBottom: '8px'
          }}
        >
          {generating ? 'Creating Your Routes...' : 'Find My Routes'}
        </Button>

        {/* Advanced Options - Collapsible */}
        <Accordion variant="contained">
          <Accordion.Item value="advanced">
            <Accordion.Control>
              <Group gap="xs">
                <Settings size={16} />
                <Text size="sm" fw={500}>Advanced Options</Text>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="md">
                {/* Training Plan Workout Selector */}
                {activePlans.length > 0 && (
                  <div>
                    <Text size="sm" fw={600} mb="xs">Use Training Plan Workout</Text>
                    <Stack gap="sm">
                      <Select
                        label="Select Training Plan"
                        placeholder="Choose a plan"
                        data={activePlans.map(plan => ({
                          value: plan.id,
                          label: plan.name
                        }))}
                        value={selectedPlan}
                        onChange={setSelectedPlan}
                        clearable
                        size="sm"
                      />

                      {selectedPlan && planWorkouts.length > 0 && (
                        <Select
                          label="Select Workout"
                          placeholder="Choose a workout"
                          data={planWorkouts.map(workout => {
                            const workoutType = WORKOUT_TYPES[workout.workout_type];
                            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                            return {
                              value: workout.id,
                              label: `Week ${workout.week_number}, ${dayNames[workout.day_of_week]} - ${workoutType?.name || workout.workout_type} (${workout.target_duration}min, ${workout.target_tss} TSS)`
                            };
                          })}
                          value={selectedWorkout}
                          onChange={setSelectedWorkout}
                          clearable
                          maxDropdownHeight={300}
                          size="sm"
                        />
                      )}

                      {selectedWorkout && (
                        <Alert color="blue" variant="light" p="xs">
                          <Text size="xs">Training context updated from workout!</Text>
                        </Alert>
                      )}
                    </Stack>
                    <Divider my="sm" />
                  </div>
                )}

                {/* Training Context - Manual */}
                <div>
                  <Text size="sm" fw={600} mb="xs">Manual Training Context</Text>
                  <Text size="xs" c="dimmed" mb="xs">
                    Adjusting these settings will override the "Type of ride" selection above
                  </Text>
                  <TrainingContextSelector
                    value={trainingContext}
                    onChange={handleTrainingContextChange}
                  />
                </div>

                <Divider />

                {/* Debug Toggles */}
                <div>
                  <Text size="sm" fw={500} mb="xs">Route Generation Options</Text>
                  <Stack gap="xs">
                    <Switch
                      label="Use Past Rides"
                      description="Learn from your riding history"
                      checked={usePastRides}
                      onChange={(e) => setUsePastRides(e.currentTarget.checked)}
                      size="sm"
                    />
                    <Switch
                      label="Use Training Context"
                      description="Match routes to workout requirements"
                      checked={useTrainingContext}
                      onChange={(e) => setUseTrainingContext(e.currentTarget.checked)}
                      size="sm"
                    />
                  </Stack>
                </div>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>

        {/* Error Display */}
        {error && (
          <Alert color="red" title="Generation Failed">
            {error}
          </Alert>
        )}

        {/* Generated Routes */}
        {generatedRoutes.length > 0 && (
          <div>
            <Group justify="space-between" mb="sm">
              <Text size="sm" fw={500}>Generated Routes</Text>
              <ActionIcon
                variant="subtle"
                onClick={generateRoutes}
                disabled={generating}
              >
                <RotateCcw size={16} />
              </ActionIcon>
            </Group>
            
            <Stack gap="sm">
              {generatedRoutes.map((route, index) => {
                // Calculate estimated TSS for this route
                const estimatedRouteTSS = estimateTSS(
                  trainingContext.targetDuration || 60,
                  route.distance,
                  route.elevationGain || 0,
                  trainingContext.workoutType || 'endurance'
                );

                // Generate interval cues if in training mode
                const intervalCues = (isTrainingMode && useTrainingContext)
                  ? generateIntervalCues(route, trainingContext)
                  : null;

                return (
                <Card key={index} withBorder p="md">
                  <Stack gap="md">
                    <Group justify="space-between" align="flex-start">
                      <div style={{ flex: 1 }}>
                        <Group gap="sm" mb="xs">
                          <Text size="sm" fw={600}>{route.name}</Text>
                          <Badge size="sm" color={route.difficulty === 'easy' ? 'green' : route.difficulty === 'hard' ? 'red' : 'yellow'}>
                            {route.difficulty}
                          </Badge>
                          {estimatedRouteTSS && (
                            <Badge size="sm" color="blue" variant="light">
                              {estimatedRouteTSS} TSS
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
                      </div>

                      <Button
                        size="sm"
                        leftSection={<Play size={14} />}
                        onClick={() => {
                          if (onRouteGenerated) {
                            // Add interval cues to route before passing
                            const routeWithCues = {
                              ...route,
                              intervalCues: intervalCues
                            };
                            // Defer to avoid React error #185
                            setTimeout(() => onRouteGenerated(routeWithCues), 0);
                          }
                        }}
                      >
                        Use Route
                      </Button>
                    </Group>

                    {/* Show interval cues if available */}
                    {intervalCues && (
                      <IntervalCues cues={intervalCues} />
                    )}
                  </Stack>
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
              Click "Find My Routes" to create personalized training routes
            </Text>
          </Center>
        )}
      </Stack>
    </Paper>
    </>
  );
};


export default AIRouteGenerator;