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
import WorkoutSelector from './WorkoutSelector';
import { estimateTSS, WORKOUT_TYPES } from '../utils/trainingPlans';
import { WORKOUT_LIBRARY } from '../data/workoutLibrary';
import { supabase } from '../supabase';
import { generateIntervalCues, generateCuesFromWorkoutStructure } from '../utils/intervalCues';
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

  // Workout library integration
  const [selectedLibraryWorkout, setSelectedLibraryWorkout] = useState(null);

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

  // Natural language route request
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [processingNaturalLanguage, setProcessingNaturalLanguage] = useState(false);
  const [useTrainingContext, setUseTrainingContext] = useState(true);

  // Ref to track the last processed external location to prevent re-render loops
  const lastExternalLocationRef = useRef(null);

  // Handler to set training context and mark as manually set
  const handleTrainingContextChange = useCallback((newContext) => {
    setTrainingContext(newContext);
    setTrainingContextManuallySet(true);
  }, []);

  // Handler for workout library selection
  const handleLibraryWorkoutSelect = useCallback((workout) => {
    if (!workout) {
      console.error('No workout provided to handleLibraryWorkoutSelect');
      return;
    }

    console.log('Workout selected from library:', workout);
    setSelectedLibraryWorkout(workout);

    // Update training context from workout
    setTrainingContext({
      workoutType: workout.category || 'endurance',
      phase: 'build', // Default phase
      targetDuration: workout.duration || 60,
      targetTSS: workout.targetTSS || 75,
      primaryZone: workout.primaryZone || 2
    });

    // Update time available to match workout
    setTimeAvailable(workout.duration || 60);

    // Mark as manually set so it doesn't get overridden
    setTrainingContextManuallySet(true);

    // Clear any training plan workout selection
    setSelectedWorkout(null);

    toast.success(`Workout selected: ${workout.name}`);
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
        // Don't show toast here - location toast is already shown
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
  const geocodeAddress = async (address, proximity = null) => {
    if (!address.trim()) return null;

    const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN;
    if (!mapboxToken) {
      toast.error('Mapbox token not available for geocoding');
      return null;
    }

    try {
      setGeocoding(true);
      const encodedAddress = encodeURIComponent(address);

      // Add proximity bias if available (helps disambiguate locations)
      let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${mapboxToken}&country=US&types=place,locality,address,poi`;

      if (proximity) {
        url += `&proximity=${proximity[0]},${proximity[1]}`;
      }

      console.log(`🔍 Geocoding: "${address}"${proximity ? ' with proximity bias' : ''}`);

      const response = await fetch(url);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [longitude, latitude] = feature.center;
        console.log(`✅ Geocoded "${address}" to:`, feature.place_name);
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

      // Check for demo mode - skip training plans fetch
      const { isDemoMode } = await import('../utils/demoData');
      if (isDemoMode()) {
        console.log('✅ Demo mode: skipping training plans fetch');
        setActivePlans([]);
        return;
      }

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

  // Generate routes with natural language preferences (bypasses generic AI generation)
  const generateRoutesWithNaturalLanguage = async (parsedRoute) => {
    if (!parsedRoute.startLocation) {
      toast.error('No start location found');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      console.log('🗣️ Generating routes from natural language request:', parsedRoute);
      console.log('📍 Start location:', parsedRoute.startLocation);
      console.log('🎯 Preferences:', parsedRoute.preferences);

      // Import the routing utilities we need
      const { getCyclingDirections } = await import('../utils/directions');

      // For now, let's create routes that go through the specified waypoints
      // Build waypoints array: start -> intermediate locations -> back to start (if loop)
      const waypoints = [parsedRoute.startLocation];

      // Add waypoints if specified
      if (parsedRoute.waypoints && parsedRoute.waypoints.length > 0) {
        // Geocode each waypoint using the start location as proximity bias
        for (const waypointName of parsedRoute.waypoints) {
          console.log(`🔍 Geocoding waypoint: ${waypointName}`);
          const coords = await geocodeAddress(waypointName, parsedRoute.startLocation);
          if (coords) {
            console.log(`✅ Found coordinates for ${waypointName}:`, coords.coordinates);
            waypoints.push(coords.coordinates);
          } else {
            console.warn(`⚠️ Could not geocode waypoint: ${waypointName}`);
          }
        }
      }

      // If loop, return to start
      if (parsedRoute.routeType === 'loop') {
        waypoints.push(parsedRoute.startLocation);
      }

      console.log('🗺️ Waypoints for route:', waypoints);

      // Get Mapbox token
      const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN;
      if (!mapboxToken) {
        throw new Error('Mapbox token not available');
      }

      // Build routing preferences based on user's gravel/trail preferences
      let routingPreferences = null;
      const surfaceType = parsedRoute.preferences?.surfaceType || 'mixed';

      if (surfaceType === 'gravel' || parsedRoute.preferences?.trailPreference) {
        console.log('🌲 Gravel/trail preference detected - configuring for unpaved roads');
        // For gravel cycling, we want to INCLUDE unpaved roads and trails
        // This will be passed to directions.js which will NOT exclude unpaved roads
        routingPreferences = {
          surfaceType: 'gravel', // Pass to routing engine
          routingPreferences: {
            trafficTolerance: 'low', // Prefer quieter roads that are more likely unpaved
          },
          scenicPreferences: {
            quietnessLevel: 'high', // Quieter roads often correlate with gravel/dirt
          },
          safetyPreferences: {
            bikeInfrastructure: 'preferred' // Not required, as gravel roads may not have infrastructure
          }
        };
      } else if (surfaceType === 'paved') {
        console.log('🚴 Paved road cycling - using standard cycling preferences');
        routingPreferences = {
          surfaceType: 'paved',
          routingPreferences: {
            trafficTolerance: 'low', // Still prefer bike-friendly roads
          }
        };
      } else {
        console.log('🚴 Mixed surface cycling - balanced preferences');
        routingPreferences = {
          surfaceType: 'mixed',
          routingPreferences: {
            trafficTolerance: 'medium',
          }
        };
      }

      console.log(`🚴 Routing with ${waypoints.length} waypoints (gravel preference: ${parsedRoute.preferences?.trailPreference})`);
      console.log('🔧 Routing preferences:', routingPreferences);

      // For GRAVEL routes, use GraphHopper which has a dedicated gravel profile
      // that actively prioritizes unpaved roads and dirt paths
      let routeData;
      if (surfaceType === 'gravel') {
        console.log('🌾 Using GraphHopper for gravel routing (better unpaved road support)');
        const { getGraphHopperCyclingDirections, GRAPHHOPPER_PROFILES } = await import('../utils/graphHopper');

        routeData = await getGraphHopperCyclingDirections(waypoints, {
          profile: GRAPHHOPPER_PROFILES.GRAVEL,
          elevation: true,
          alternatives: false,
          preferences: routingPreferences
        });

        if (!routeData) {
          console.warn('⚠️ GraphHopper failed, falling back to Mapbox');
          // Fallback to Mapbox if GraphHopper fails
          routeData = await getCyclingDirections(
            waypoints,
            mapboxToken,
            {
              profile: 'walking', // Walking profile has better trail access
              preferences: routingPreferences
            }
          );
        } else {
          console.log('✅ GraphHopper gravel route generated successfully');
        }
      } else {
        // For paved routes, use Mapbox Directions API
        routeData = await getCyclingDirections(
          waypoints,
          mapboxToken,
          {
            profile: routingPreferences?.profile || 'cycling',
            preferences: routingPreferences
          }
        );
      }

      if (routeData && routeData.coordinates) {
        const waypointNames = parsedRoute.waypoints?.join(' → ') || 'waypoints';

        // Build description based on surface type
        let surfaceDescription = 'Cycling route';
        let routingSource = routeData.source || 'mapbox';
        if (surfaceType === 'gravel') {
          surfaceDescription = `Gravel/dirt focused route - prioritizes unpaved roads and trails (via ${routingSource === 'graphhopper' ? 'GraphHopper' : 'Mapbox'})`;
        } else if (surfaceType === 'paved') {
          surfaceDescription = 'Paved road route';
        }

        // Handle elevation data from different routing sources
        let elevationGain = 0;
        if (routeData.elevation?.ascent) {
          // GraphHopper format
          elevationGain = routeData.elevation.ascent;
        } else if (routeData.elevationGain) {
          // Mapbox format
          elevationGain = routeData.elevationGain;
        }

        const route = {
          name: `${parsedRoute.startLocationName} → ${waypointNames}`,
          description: `${surfaceDescription} from ${parsedRoute.startLocationName}`,
          difficulty: 'moderate',
          coordinates: routeData.coordinates,
          distance: (routeData.distance || 0) / 1000, // Convert meters to km
          elevationGain: elevationGain,
          routeType: parsedRoute.routeType || 'loop',
          source: 'natural_language',
          routingProvider: routingSource, // Track which routing service was used
          surfaceType: surfaceType, // Include surface type in route data
          elevationProfile: routeData.elevationProfile
        };

        console.log('✅ Generated natural language route:', route);
        setGeneratedRoutes([route]);

        // Disable training context when using natural language
        setUseTrainingContext(false);

        toast.success('Generated custom route based on your description!');
      } else {
        console.error('❌ Failed to generate route - no coordinates returned');
        toast.error('Could not generate route. The waypoints may be too far apart or unreachable by bike.');
      }

    } catch (err) {
      console.error('Natural language route generation error:', err);
      setError(err.message || 'Failed to generate routes');
      toast.error('Failed to generate route from description');
    } finally {
      setGenerating(false);
    }
  };

  // Handle natural language route generation
  const handleNaturalLanguageGenerate = async () => {
    if (!naturalLanguageInput.trim()) {
      toast.error('Please describe the route you want');
      return;
    }

    setProcessingNaturalLanguage(true);
    setError(null);
    setGeneratedRoutes([]);

    try {
      console.log('🧠 Processing natural language request:', naturalLanguageInput);

      // Call the natural language API
      // Use port 3001 for local dev, same origin for production
      const apiUrl = process.env.NODE_ENV === 'development'
        ? 'http://localhost:3001/api/claude-routes'
        : `${window.location.origin}/api/claude-routes`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: buildNaturalLanguagePrompt(naturalLanguageInput, weatherData, startLocation, currentAddress),
          maxTokens: 3000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to process route request');
      }

      console.log('✅ Natural language response received');

      // Parse the response to extract route parameters
      const parsedRoute = parseNaturalLanguageResponse(data.content);

      // If we got a location name, geocode it to get coordinates
      if (parsedRoute.startLocationName) {
        // Use current location as proximity bias (if available) to resolve location ambiguity
        const proximityBias = startLocation || null;
        const coords = await geocodeAddress(parsedRoute.startLocationName, proximityBias);
        if (coords) {
          parsedRoute.startLocation = coords.coordinates;
          setStartLocation(coords.coordinates);
          onStartLocationSet && onStartLocationSet(coords.coordinates);

          // Set the address
          setCurrentAddress(coords.address);

          // Fetch weather
          await fetchWeatherData(coords.coordinates);

          // Center map
          if (mapRef?.current) {
            mapRef.current.flyTo({
              center: coords.coordinates,
              zoom: 13,
              duration: 1000
            });
          }
        } else {
          toast.error(`Could not find location: ${parsedRoute.startLocationName}`);
          return;
        }
      }

      // Set other parameters from the parsed response
      if (parsedRoute.timeAvailable) {
        setTimeAvailable(parsedRoute.timeAvailable);
      }
      if (parsedRoute.routeType) {
        setRouteType(parsedRoute.routeType);
      }
      if (parsedRoute.trainingGoal) {
        setTrainingGoal(parsedRoute.trainingGoal);
      }

      toast.success('Route parameters extracted! Generating routes now...');

      // Generate routes with natural language preferences
      setTimeout(() => {
        // Check if we successfully set the start location
        if (parsedRoute.startLocation) {
          generateRoutesWithNaturalLanguage(parsedRoute);
        }
      }, 500);

    } catch (err) {
      console.error('Natural language processing error:', err);
      setError(err.message || 'Failed to process route request');
      toast.error('Failed to understand route request. Please try rephrasing.');
    } finally {
      setProcessingNaturalLanguage(false);
    }
  };

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

        {/* Natural Language Route Request */}
        <Card withBorder p="md" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(34, 211, 238, 0.05) 100%)' }}>
          <Stack gap="sm">
            <Group gap="xs">
              <Brain size={18} style={{ color: '#10b981' }} />
              <Text size="sm" fw={600} c="teal">
                Describe Your Route
              </Text>
            </Group>
            <Text size="xs" c="dimmed">
              Tell me where you want to ride, what you want to see, and any preferences.
              Example: "I want to ride the Colorado trail from Kenosha pass to Salida avoiding highways"
            </Text>
            <TextInput
              placeholder='Try: "40 mile loop from downtown with scenic views and coffee shops"'
              value={naturalLanguageInput}
              onChange={(e) => setNaturalLanguageInput(e.target.value)}
              size="md"
              leftSection={<Brain size={16} />}
              rightSection={
                naturalLanguageInput && (
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    onClick={() => setNaturalLanguageInput('')}
                  >
                    <RotateCcw size={16} />
                  </ActionIcon>
                )
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' && naturalLanguageInput.trim()) {
                  handleNaturalLanguageGenerate();
                }
              }}
            />
            <Button
              onClick={handleNaturalLanguageGenerate}
              loading={processingNaturalLanguage}
              disabled={!naturalLanguageInput.trim()}
              leftSection={!processingNaturalLanguage && <Play size={18} />}
              style={{
                background: naturalLanguageInput.trim()
                  ? 'linear-gradient(135deg, #10b981 0%, #22d3ee 100%)'
                  : undefined
              }}
            >
              {processingNaturalLanguage ? 'Creating Your Route...' : 'Generate Route'}
            </Button>
          </Stack>
        </Card>

        <Divider label="OR" labelPosition="center" />

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
                {/* Workout Library Selector - NEW! */}
                <div>
                  <Text size="sm" fw={600} mb="xs">Choose From Workout Library</Text>
                  <Text size="xs" c="dimmed" mb="sm">
                    40+ research-backed workouts from 2025 training science
                  </Text>

                  <WorkoutSelector
                    compact={true}
                    onWorkoutSelect={handleLibraryWorkoutSelect}
                    selectedWorkoutId={selectedLibraryWorkout?.id}
                  />

                  {selectedLibraryWorkout && (
                    <Alert color="blue" variant="light" p="xs" mt="xs">
                      <Stack gap={4}>
                        <Text size="xs" fw={600}>{selectedLibraryWorkout.name}</Text>
                        <Text size="xs">{selectedLibraryWorkout.description}</Text>
                        <Group gap="xs">
                          <Badge size="xs">{selectedLibraryWorkout.duration}min</Badge>
                          <Badge size="xs">{selectedLibraryWorkout.targetTSS} TSS</Badge>
                          <Badge size="xs" color={selectedLibraryWorkout.difficulty === 'beginner' ? 'green' : selectedLibraryWorkout.difficulty === 'intermediate' ? 'yellow' : 'red'}>
                            {selectedLibraryWorkout.difficulty}
                          </Badge>
                        </Group>
                        {selectedLibraryWorkout.coachNotes && (
                          <Text size="xs" c="dimmed" italic mt={4}>
                            💡 {selectedLibraryWorkout.coachNotes}
                          </Text>
                        )}
                      </Stack>
                    </Alert>
                  )}
                </div>

                <Divider label="OR" labelPosition="center" />

                {/* Training Plan Workout Selector */}
                {activePlans.length > 0 && (
                  <div>
                    <Text size="sm" fw={600} mb="xs">Use Training Plan Workout</Text>
                    <Stack gap="sm">
                      <Select
                        label="Select Training Plan"
                        placeholder="Choose a plan"
                        data={(activePlans || []).map(plan => ({
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
                          data={(planWorkouts || []).map(workout => {
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
                let intervalCues = null;
                if (isTrainingMode && useTrainingContext) {
                  // If we have a selected library workout, use its detailed structure
                  if (selectedLibraryWorkout && selectedLibraryWorkout.structure) {
                    console.log('📚 Using workout library structure for cues:', selectedLibraryWorkout.name);
                    intervalCues = generateCuesFromWorkoutStructure(route, selectedLibraryWorkout);
                  } else {
                    // Otherwise use the generic training context
                    console.log('🎯 Using generic training context for cues');
                    intervalCues = generateIntervalCues(route, trainingContext);
                  }
                }

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


// Helper function to build detailed route prompt for natural language requests
function buildDetailedRoutePrompt(parsedRoute) {
  const { startLocationName, endLocationName, preferences, timeAvailable, routeType } = parsedRoute;

  return `You are an expert cycling route planner. Create 2-3 specific cycling route options based on this request:

START LOCATION: ${startLocationName}
${endLocationName ? `END LOCATION: ${endLocationName}` : ''}
ROUTE TYPE: ${routeType || 'loop'}
TIME/DISTANCE: ${timeAvailable ? `${timeAvailable} minutes` : 'flexible'}

PREFERENCES:
${preferences?.trailPreference ? '- PRIORITIZE gravel/dirt/unpaved roads and trails' : ''}
${preferences?.avoidHighways ? '- Avoid highways and major roads' : ''}
${preferences?.avoidTraffic ? '- Minimize traffic' : ''}
${preferences?.terrain ? `- Terrain: ${preferences.terrain}` : ''}
${preferences?.pointsOfInterest?.length ? `- Include: ${preferences.pointsOfInterest.join(', ')}` : ''}
${preferences?.specialRequirements ? `- Special: ${preferences.specialRequirements}` : ''}

Please provide 2-3 specific route options with actual waypoints (lat/lon coordinates). For each route:

1. Route Name (creative, descriptive)
2. Description (what makes this route special)
3. Waypoints: List of 3-5 key locations with coordinates
   - Start: ${startLocationName}
   - Intermediate waypoints (with coordinates)
   ${endLocationName ? `- End: ${endLocationName}` : '- Return to start'}

Format your response as JSON:
{
  "routes": [
    {
      "name": "Route Name",
      "description": "What makes this route special",
      "difficulty": "easy|moderate|hard",
      "waypoints": [
        {"name": "Start", "lat": 40.0195584, "lon": -105.0574848},
        {"name": "Waypoint description", "lat": XX.XXXXX, "lon": -XXX.XXXXX},
        ...
      ]
    }
  ]
}

IMPORTANT:
- Provide REAL coordinates for actual locations
- For gravel/dirt preferences, choose trails, canal paths, dirt roads
- Ensure waypoints create a logical route
- Return ONLY valid JSON`;
}

// Helper function to parse Claude's route response
function parseClaudeRouteResponse(responseText, parsedRoute) {
  try {
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in Claude response');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log('📝 Parsed Claude route response:', parsed);

    if (!parsed.routes || !Array.isArray(parsed.routes)) {
      console.error('Invalid route format from Claude');
      return null;
    }

    // Convert Claude's route format to our app's format
    const routes = parsed.routes.map(route => {
      // Convert waypoints to coordinates array
      const coordinates = route.waypoints.map(wp => [wp.lon, wp.lat]);

      return {
        name: route.name,
        description: route.description,
        difficulty: route.difficulty || 'moderate',
        coordinates: coordinates,
        distance: 0, // Will be calculated by routing service
        elevationGain: 0, // Will be calculated
        routeType: parsedRoute.routeType || 'loop',
        waypoints: route.waypoints,
        source: 'natural_language'
      };
    });

    return routes;

  } catch (error) {
    console.error('Failed to parse Claude route response:', error);
    return null;
  }
}

// Helper function to build natural language prompt
function buildNaturalLanguagePrompt(userRequest, weatherData, userLocation, userAddress) {
  // Extract region/area from user's address for context
  let regionContext = '';
  let gravelExamples = '';

  if (userAddress) {
    // Try to determine the general region
    const addressLower = userAddress.toLowerCase();

    if (addressLower.includes('colorado') || addressLower.includes(', co')) {
      regionContext = 'The cyclist is in Colorado.';
      gravelExamples = `
   **Colorado Front Range Examples:**
   - Erie → Lafayette → Superior → Louisville (county roads)
   - Boulder → Lyons → Hygiene → Longmont (dirt roads in foothills)
   - Boulder → Nederland → Ward → Jamestown (high country gravel)
   - Golden → Morrison → Evergreen → Conifer (mountain roads)`;
    } else if (addressLower.includes('california') || addressLower.includes(', ca')) {
      regionContext = 'The cyclist is in California.';
      gravelExamples = `
   **California Examples:**
   - Use small towns connected by county roads
   - Suggest towns in wine country, foothills, or rural areas
   - Look for agricultural areas with farm roads`;
    } else if (addressLower.includes('oregon') || addressLower.includes(', or')) {
      regionContext = 'The cyclist is in Oregon.';
      gravelExamples = `
   **Oregon Examples:**
   - Small towns connected by forest service roads
   - Rural communities with logging roads
   - Coastal or valley towns with farm roads`;
    } else {
      regionContext = `The cyclist is near: ${userAddress}`;
      gravelExamples = `
   **General Strategy (works anywhere):**
   - Suggest small towns/communities near the cyclist's location
   - Rural areas typically have more gravel/dirt roads
   - County roads between small towns are often unpaved`;
    }
  } else {
    regionContext = 'Cyclist location unknown.';
    gravelExamples = `
   **General Strategy:**
   - Suggest small towns logically placed between start and destination
   - Rural areas and small communities often have gravel roads
   - Use actual town names that will geocode reliably`;
  }

  return `You are an expert cycling route planner with knowledge of cycling routes worldwide. A cyclist has requested: "${userRequest}"

${regionContext}

Your task is to extract and interpret the route requirements from this request and return a structured JSON response.

Extract the following information:
1. Start location (city/landmark) - if mentioned
2. Waypoints - intermediate locations to route through
3. Route type (loop, out_back, or point_to_point)
4. Distance or time available (in km or minutes)
5. Terrain preferences (flat, rolling, hilly)
6. Things to avoid (highways, traffic, etc.)
7. Surface preference - CRITICAL FOR GRAVEL CYCLISTS

Current conditions:
${weatherData ? `- Weather: ${weatherData.temperature}°C, ${weatherData.description}
- Wind: ${weatherData.windSpeed} km/h` : '- Weather data not available'}

CRITICAL GRAVEL ROUTING INSTRUCTIONS:
If the user requests gravel, dirt, unpaved roads, or trails:
1. Set surfaceType to "gravel"
2. **SUGGEST 1-3 INTERMEDIATE TOWN/CITY WAYPOINTS** near the user's location that create a logical gravel cycling route
${gravelExamples}

**IMPORTANT**:
- Suggest ACTUAL TOWN NAMES that will geocode correctly (not trail names!)
- Choose towns that are logically between the start and destination
- Use towns near the cyclist's current location (${userAddress || 'unknown'})
- Fewer waypoints = better (1-2 is ideal, max 3)
- The routing between towns will naturally use back roads and county roads

Return ONLY a JSON object with this structure:
{
  "startLocation": "Erie, CO",
  "waypoints": ["Coal Creek Trail", "Marshall Mesa", "Community Ditch Trail"],
  "routeType": "loop",
  "distance": number in km (or null if time-based),
  "timeAvailable": number in minutes (or null if distance-based),
  "terrain": "flat|rolling|hilly",
  "avoidHighways": true/false,
  "avoidTraffic": true/false,
  "surfaceType": "gravel|paved|mixed",
  "trainingGoal": "endurance|intervals|recovery|tempo|hills" or null,
  "suggestedGravelWaypoints": ["waypoint1", "waypoint2", "waypoint3"]
}

EXAMPLES:

User: "gravel ride from Erie to Boulder and back"
Response:
{
  "startLocation": "Erie, CO",
  "waypoints": ["Lafayette", "Boulder"],
  "routeType": "loop",
  "surfaceType": "gravel",
  "avoidHighways": true,
  "suggestedGravelWaypoints": ["Lafayette", "Superior"]
}

User: "I want to ride from Broomfield to Lyons on gravel roads"
Response:
{
  "startLocation": "Broomfield, CO",
  "waypoints": ["Louisville", "Lyons"],
  "routeType": "point_to_point",
  "surfaceType": "gravel",
  "avoidHighways": true,
  "suggestedGravelWaypoints": ["Louisville", "Hygiene"]
}

User: "gravel loop from Boulder through the mountains"
Response:
{
  "startLocation": "Boulder, CO",
  "waypoints": ["Nederland", "Ward", "Jamestown"],
  "routeType": "loop",
  "surfaceType": "gravel",
  "avoidHighways": true,
  "suggestedGravelWaypoints": ["Nederland", "Ward", "Jamestown", "Gold Hill"]
}

IMPORTANT:
- For gravel requests, ALWAYS suggest intermediate waypoints even if user doesn't mention them
- Waypoints should be ACTUAL TOWN/CITY NAMES that will geocode reliably (NOT trail names!)
- Keep it simple: 1-2 waypoints is usually enough
- Return ONLY valid JSON, no additional text`;
}

// Helper function to parse the Claude response
function parseNaturalLanguageResponse(responseText) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log('📝 Parsed natural language response:', parsed);

    // Convert to route generator parameters
    const result = {};

    // Determine route type
    if (parsed.routeType) {
      result.routeType = parsed.routeType;
    } else if (parsed.endLocation && parsed.endLocation !== parsed.startLocation) {
      result.routeType = 'point_to_point';
    } else {
      result.routeType = 'loop';
    }

    // Set time or distance
    if (parsed.timeAvailable) {
      result.timeAvailable = parsed.timeAvailable;
    } else if (parsed.distance) {
      // Estimate time from distance (assume 25 km/h average)
      result.timeAvailable = Math.round((parsed.distance / 25) * 60);
    }

    // Set training goal
    if (parsed.trainingGoal) {
      result.trainingGoal = parsed.trainingGoal;
    } else if (parsed.terrain === 'hilly') {
      result.trainingGoal = 'hills';
    } else {
      result.trainingGoal = 'endurance';
    }

    // Note: startLocation coordinates will need to be geocoded separately
    // Store the location names for geocoding
    result.startLocationName = parsed.startLocation;
    result.waypoints = parsed.waypoints || []; // Array of waypoint names
    result.endLocationName = parsed.endLocation;
    result.preferences = {
      avoidHighways: parsed.avoidHighways,
      avoidTraffic: parsed.avoidTraffic,
      pointsOfInterest: parsed.pointsOfInterest,
      surfaceType: parsed.surfaceType || 'mixed', // gravel, paved, or mixed
      trailPreference: parsed.surfaceType === 'gravel', // backward compatibility
      terrain: parsed.terrain,
      specialRequirements: parsed.specialRequirements
    };

    console.log('🎯 Converted to route parameters:', result);
    return result;

  } catch (error) {
    console.error('Failed to parse natural language response:', error);
    throw new Error('Could not understand the route request. Please try being more specific.');
  }
}

export default AIRouteGenerator;