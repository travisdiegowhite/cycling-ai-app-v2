import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Map, { Source, Layer, Marker, NavigationControl, ScaleControl, GeolocateControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  Paper,
  TextInput,
  Button,
  Group,
  Stack,
  Text,
  ActionIcon,
  Tooltip,
  SegmentedControl,
  Card,
  ThemeIcon,
  ScrollArea,
  Timeline,
  Alert,
  Divider,
  Modal,
  Select,
  RingProgress,
  Container,
  Textarea,
} from '@mantine/core';
import { useHotkeys, useMediaQuery } from '@mantine/hooks';
import {
  Undo2,
  Redo2,
  Trash2,
  Download,
  Route,
  Save,
  X,
  Target,
  Flag,
  Check,
  MapPin,
  Info,
  Brain,
  Zap,
  Sparkles,
  Lightbulb,
  TrendingUp,
  Shield,
  Camera,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { buildLineString, polylineDistance } from '../utils/geo';
import { pointsToGPX, parseGPX } from '../utils/gpx';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { useUnits } from '../utils/units';
import { useRouteManipulation } from '../hooks/useRouteManipulation';
import { useNavigate } from 'react-router-dom';

const RouteStudio = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { useImperial, distanceUnit, elevationUnit, formatDistance, formatElevation } = useUnits();
  
  // Core route building state (similar to ProfessionalRouteBuilder)
  const [viewState, setViewState] = useState({
    longitude: -122.4194,
    latitude: 37.7749,
    zoom: 13,
    pitch: 0,
    bearing: 0
  });
  
  const [waypoints, setWaypoints] = useState([]);
  const [snappedRoute, setSnappedRoute] = useState(null);
  const [elevationProfile, setElevationProfile] = useState([]);
  const [elevationStats, setElevationStats] = useState({});
  const [selectedWaypoint, setSelectedWaypoint] = useState(null);
  const [hoveredWaypoint, setHoveredWaypoint] = useState(null);
  const [activeMode, setActiveMode] = useState('draw');
  const [routingProfile, setRoutingProfile] = useState('cycling');
  const [mapStyle, setMapStyle] = useState('outdoors');
  const [routeName, setRouteName] = useState('');
  const [snapping, setSnapping] = useState(false);
  const [snapProgress, setSnapProgress] = useState(0);
  const [error, setError] = useState(null);
  
  // AI Enhancement state
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [loadingAISuggestions, setLoadingAISuggestions] = useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = useState(new Set());
  
  // History for Undo/Redo (including AI suggestions)
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [aiSuggestionHistory, setAiSuggestionHistory] = useState([]);
  
  // Save modal state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [routeDescription, setRouteDescription] = useState('');
  const [saving, setSaving] = useState(false);
  
  const mapRef = useRef(null);
  
  // Save state before AI suggestion for undo
  const saveStateBeforeAISuggestion = useCallback(() => {
    const state = {
      waypoints: [...waypoints],
      snappedRoute: snappedRoute ? { ...snappedRoute } : null,
      elevationProfile: [...elevationProfile],
      elevationStats: { ...elevationStats },
      timestamp: Date.now()
    };
    setAiSuggestionHistory(prev => [...prev, state]);
    return state;
  }, [waypoints, snappedRoute, elevationProfile, elevationStats]);

  // Undo last AI suggestion
  const undoLastAISuggestion = useCallback(() => {
    if (aiSuggestionHistory.length > 0) {
      const lastState = aiSuggestionHistory[aiSuggestionHistory.length - 1];
      setWaypoints(lastState.waypoints);
      setSnappedRoute(lastState.snappedRoute);
      setElevationProfile(lastState.elevationProfile);
      setElevationStats(lastState.elevationStats);
      setAiSuggestionHistory(prev => prev.slice(0, -1));
      setAppliedSuggestions(new Set()); // Reset applied suggestions
      toast.success('Undid last AI suggestion');
    }
  }, [aiSuggestionHistory]);
  
  // Use the same route manipulation hook as ProfessionalRouteBuilder
  const {
    addWaypoint,
    snapToRoads,
    fetchElevation,
    clearRoute,
    undo,
    redo,
    reverseRoute,
    removeWaypoint,
  } = useRouteManipulation({
    waypoints,
    setWaypoints,
    history,
    setHistory,
    historyIndex,
    setHistoryIndex,
    selectedWaypoint,
    setSelectedWaypoint,
    snappedRoute,
    setSnappedRoute,
    elevationProfile,
    setElevationProfile,
    elevationStats,
    setElevationStats,
    routingProfile,
    snapping,
    setSnapping,
    snapProgress,
    setSnapProgress,
    error,
    setError,
    useImperial,
  });

  // Auto-fetch elevation when route is snapped
  useEffect(() => {
    if (snappedRoute && snappedRoute.coordinates && snappedRoute.coordinates.length > 0) {
      fetchElevation();
    }
  }, [snappedRoute, fetchElevation]);

  // Debug waypoints
  useEffect(() => {
    console.log('Waypoints updated:', waypoints.length, waypoints);
  }, [waypoints]);

  // Mock AI suggestion generation based on current route
  const generateAISuggestions = useCallback(async () => {
    if (waypoints.length < 2) {
      toast.error('Create a route with at least 2 waypoints first');
      return;
    }
    
    setLoadingAISuggestions(true);
    
    // Simulate AI analysis time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockSuggestions = [
      {
        id: 1,
        type: 'scenery',
        icon: <Camera size={16} />,
        title: 'Scenic Route Enhancement',
        description: 'Route through Riverside Park for better views and photo opportunities',
        impact: '+0.5mi, +50ft elevation',
        confidence: 0.85,
        coordinates: [] // Would contain actual route coordinates in real implementation
      },
      {
        id: 2,
        type: 'safety',
        icon: <Shield size={16} />,
        title: 'Safer Path Available',
        description: 'Use dedicated bike lanes on Oak Street instead of busy Main Street',
        impact: 'Safer route, same distance',
        confidence: 0.92,
        coordinates: []
      },
      {
        id: 3,
        type: 'performance',
        icon: <TrendingUp size={16} />,
        title: 'Optimize for Training',
        description: 'Alternative route with consistent 3-5% grade for interval training',
        impact: 'Better training zones',
        confidence: 0.78,
        coordinates: []
      },
      {
        id: 4,
        type: 'efficiency',
        icon: <Lightbulb size={16} />,
        title: 'Reduce Elevation',
        description: 'Lower elevation route saves 200ft of climbing with minimal distance increase',
        impact: '-200ft elevation, +0.3mi',
        confidence: 0.88,
        coordinates: []
      }
    ];
    
    setAiSuggestions(mockSuggestions);
    setLoadingAISuggestions(false);
    toast.success(`Generated ${mockSuggestions.length} AI suggestions for your route`);
  }, [waypoints]);

  const applySuggestion = useCallback(async (suggestion) => {
    try {
      // Save current state before applying suggestion
      saveStateBeforeAISuggestion();
      
      setAppliedSuggestions(prev => new Set([...prev, suggestion.id]));
      
      // Apply different modifications based on suggestion type
      switch (suggestion.type) {
        case 'scenery':
          // Add a scenic waypoint in the middle of the route
          if (waypoints.length >= 2) {
            const midpoint = waypoints[Math.floor(waypoints.length / 2)];
            const startPoint = waypoints[0];
            const scenicWaypoint = {
              id: `wp_scenic_${Date.now()}`,
              position: [
                (startPoint.position[0] + midpoint.position[0]) / 2 + 0.01, // Slight offset for scenic route
                (startPoint.position[1] + midpoint.position[1]) / 2 + 0.01
              ],
              type: 'waypoint',
              name: 'Scenic Point'
            };
            
            // Insert scenic waypoint in the middle
            const updatedWaypoints = [...waypoints];
            updatedWaypoints.splice(Math.ceil(waypoints.length / 2), 0, scenicWaypoint);
            
            // Update types
            if (updatedWaypoints.length > 1) {
              updatedWaypoints[updatedWaypoints.length - 1].type = 'end';
              updatedWaypoints[updatedWaypoints.length - 1].name = 'End';
            }
            
            setWaypoints(updatedWaypoints);
            setSnappedRoute(null); // Clear snapped route to force re-snapping
            toast.success(`Added scenic waypoint to your route`);
          }
          break;
          
        case 'safety':
          // Modify the route to use a safer path by adjusting waypoint positions
          if (waypoints.length >= 2) {
            const updatedWaypoints = waypoints.map((wp, index) => {
              if (index > 0 && index < waypoints.length - 1) {
                // Slightly adjust intermediate waypoints for "safer" routing
                return {
                  ...wp,
                  position: [
                    wp.position[0] + (Math.random() - 0.5) * 0.005, // Small random adjustment
                    wp.position[1] + (Math.random() - 0.5) * 0.005
                  ]
                };
              }
              return wp;
            });
            
            setWaypoints(updatedWaypoints);
            setSnappedRoute(null);
            toast.success(`Adjusted route for safer cycling paths`);
          }
          break;
          
        case 'performance':
          // Add training waypoints for interval training
          if (waypoints.length >= 2) {
            const startPoint = waypoints[0];
            const endPoint = waypoints[waypoints.length - 1];
            
            // Add a training loop waypoint
            const trainingWaypoint = {
              id: `wp_training_${Date.now()}`,
              position: [
                startPoint.position[0] + 0.008, // Create a small loop
                startPoint.position[1] + 0.008
              ],
              type: 'waypoint',
              name: 'Training Loop'
            };
            
            const updatedWaypoints = [waypoints[0], trainingWaypoint, ...waypoints.slice(1)];
            
            // Update types
            if (updatedWaypoints.length > 1) {
              updatedWaypoints[updatedWaypoints.length - 1].type = 'end';
              updatedWaypoints[updatedWaypoints.length - 1].name = 'End';
            }
            
            setWaypoints(updatedWaypoints);
            setSnappedRoute(null);
            toast.success(`Added training interval to your route`);
          }
          break;
          
        case 'efficiency':
          // Remove intermediate waypoints to create a more direct route
          if (waypoints.length > 2) {
            // Keep only start and end waypoints for efficiency
            const efficientWaypoints = [
              waypoints[0],
              waypoints[waypoints.length - 1]
            ];
            
            // Optionally add one intermediate waypoint for a slight detour that avoids hills
            if (waypoints.length > 3) {
              const intermediateWaypoint = {
                ...waypoints[1],
                position: [
                  (waypoints[0].position[0] + waypoints[waypoints.length - 1].position[0]) / 2,
                  (waypoints[0].position[1] + waypoints[waypoints.length - 1].position[1]) / 2 - 0.003 // Slight southern route to "avoid hills"
                ],
                name: 'Efficiency Point'
              };
              efficientWaypoints.splice(1, 0, intermediateWaypoint);
            }
            
            // Update types
            efficientWaypoints[0].type = 'start';
            efficientWaypoints[efficientWaypoints.length - 1].type = 'end';
            for (let i = 1; i < efficientWaypoints.length - 1; i++) {
              efficientWaypoints[i].type = 'waypoint';
            }
            
            setWaypoints(efficientWaypoints);
            setSnappedRoute(null);
            toast.success(`Optimized route for efficiency - reduced waypoints`);
          } else {
            toast.info(`Route is already efficient with minimal waypoints`);
          }
          break;
          
        default:
          toast.success(`Applied: ${suggestion.title}`);
      }
      
      // Auto-snap to roads after applying suggestion
      setTimeout(async () => {
        if (waypoints.length >= 2) {
          setSnapping(true);
          try {
            const currentWaypoints = waypoints.length >= 2 ? waypoints : 
              (await new Promise(resolve => {
                setTimeout(() => resolve(waypoints), 100);
              }));
            
            if (currentWaypoints.length >= 2) {
              const coordinates = currentWaypoints.map(wp => wp.position);
              const coordinatesString = coordinates.map(coord => coord.join(',')).join(';');
              
              const response = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/${routingProfile}/${coordinatesString}?geometries=geojson&access_token=${process.env.REACT_APP_MAPBOX_TOKEN}`
              );
              
              const data = await response.json();
              
              if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                setSnappedRoute({
                  coordinates: route.geometry.coordinates,
                  distance: route.distance,
                  duration: route.duration,
                  confidence: 0.9
                });
              }
            }
          } catch (error) {
            console.error('Auto-snap error:', error);
          } finally {
            setSnapping(false);
          }
        }
      }, 500); // Small delay to ensure waypoints are updated
      
    } catch (error) {
      console.error('Error applying suggestion:', error);
      toast.error('Failed to apply suggestion');
    }
  }, [waypoints, routingProfile]);

  // Keyboard shortcuts (enhanced version of ProfessionalRouteBuilder shortcuts)
  useHotkeys([
    ['mod+Z', () => undo()],
    ['mod+shift+Z', () => redo()],
    ['mod+Y', () => redo()],
    ['Delete', () => selectedWaypoint && removeWaypoint(selectedWaypoint)],
    ['Escape', () => { setSelectedWaypoint(null); setShowAIPanel(false); }],
    ['mod+S', (e) => { e.preventDefault(); openSaveModal(); }],
    ['mod+E', (e) => { e.preventDefault(); exportGPX(); }],
    ['Space', (e) => { e.preventDefault(); toggleMode(); }],
    ['mod+R', (e) => { e.preventDefault(); snapToRoads(); }],
    ['mod+shift+R', (e) => { e.preventDefault(); reverseRoute(); }],
    ['mod+A', (e) => { e.preventDefault(); setShowAIPanel(!showAIPanel); }], // Toggle AI panel
    ['mod+G', (e) => { e.preventDefault(); generateAISuggestions(); }], // Generate AI suggestions
    ['mod+U', (e) => { e.preventDefault(); undoLastAISuggestion(); }], // Undo AI suggestion
  ]);

  const toggleMode = () => {
    setActiveMode(activeMode === 'draw' ? 'edit' : 'draw');
  };

  const openSaveModal = () => {
    if (waypoints.length < 2) {
      toast.error('Add at least 2 waypoints to save the route');
      return;
    }
    setSaveModalOpen(true);
  };

  const saveRoute = async () => {
    if (!routeName.trim() || waypoints.length < 2) {
      toast.error('Please add a route name and at least 2 waypoints');
      return;
    }

    setSaving(true);
    try {
      const routeData = {
        user_id: user.id,
        name: routeName.trim(),
        description: routeDescription.trim() || null,
        coordinates: snappedRoute?.coordinates || waypoints.map(wp => wp.position),
        distance_km: snappedRoute?.distance ? snappedRoute.distance / 1000 : 0,
        elevation_gain_m: elevationStats.totalElevationGain || 0,
        elevation_loss_m: elevationStats.totalElevationLoss || 0,
        elevation_min_m: elevationStats.minElevation || 0,
        elevation_max_m: elevationStats.maxElevation || 0,
        elevation_profile: elevationProfile || [],
        snapped: !!snappedRoute,
        created_with: 'route_studio',
        confidence: snappedRoute?.confidence || null,
        metadata: {
          waypoints: waypoints,
          elevationStats: elevationStats,
          appliedAISuggestions: Array.from(appliedSuggestions),
          routingProfile: routingProfile,
          created_in_studio: true
        }
      };

      const { error } = await supabase
        .from('user_routes')
        .insert([routeData]);

      if (error) throw error;

      toast.success('Route saved successfully!');
      setSaveModalOpen(false);
      setRouteName('');
      setRouteDescription('');
      navigate('/map');
    } catch (error) {
      console.error('Error saving route:', error);
      toast.error('Failed to save route');
    } finally {
      setSaving(false);
    }
  };

  const exportGPX = () => {
    if (waypoints.length < 2) {
      toast.error('Need at least 2 waypoints to export');
      return;
    }

    const coordinates = snappedRoute?.coordinates || waypoints.map(wp => wp.position);
    const gpx = pointsToGPX(coordinates, routeName || 'Route Studio Route');
    
    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${routeName || 'route'}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate route stats
  const routeStats = useMemo(() => {
    if (!snappedRoute || !snappedRoute.coordinates) return null;
    
    const distance = snappedRoute.distance || polylineDistance(snappedRoute.coordinates);
    const elevationGain = elevationStats.totalElevationGain || 0;
    const elevationLoss = elevationStats.totalElevationLoss || 0;
    
    return {
      distance: formatDistance(distance),
      elevationGain: formatElevation(elevationGain),
      elevationLoss: formatElevation(elevationLoss),
      confidence: snappedRoute.confidence || 0,
    };
  }, [snappedRoute, elevationStats, formatDistance, formatElevation]);

  const mapStyles = [
    { value: 'streets', label: 'Streets', url: 'mapbox://styles/mapbox/streets-v12' },
    { value: 'outdoors', label: 'Outdoors', url: 'mapbox://styles/mapbox/outdoors-v12' },
    { value: 'satellite', label: 'Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
  ];

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      flexDirection: isMobile ? 'column' : 'row',
      position: 'relative'
    }}>
      {/* Left Sidebar - Route Building Controls */}
      <div style={{ 
        width: isMobile ? '100%' : showAIPanel ? '300px' : '350px',
        maxHeight: isMobile ? '40vh' : '100vh',
        overflowY: 'auto',
        backgroundColor: 'white',
        borderRight: '1px solid #e0e0e0',
        transition: 'width 0.3s ease'
      }}>
        <Container p="md" size="100%">
          <Group justify="space-between" mb="md">
            <Group gap="xs">
              <Zap size={24} color="#10b981" style={{ filter: 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.4))' }} />
              <Text size="lg" fw={800} style={{ 
                background: 'linear-gradient(135deg, #10b981 0%, #22d3ee 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Route Studio
              </Text>
            </Group>
            <ActionIcon 
              variant="subtle" 
              onClick={() => navigate('/map')}
            >
              <X size={18} />
            </ActionIcon>
          </Group>

          <Stack gap="sm">
            {/* Route Name Input */}
            <TextInput
              label="Route Name"
              placeholder="Enter route name"
              value={routeName}
              onChange={(e) => setRouteName(e.currentTarget.value)}
              required
            />

            {/* Mode Selection */}
            <div>
              <Text size="sm" fw={500} mb="xs">Mode</Text>
              <SegmentedControl
                value={activeMode}
                onChange={setActiveMode}
                data={[
                  { label: 'Draw', value: 'draw' },
                  { label: 'Edit', value: 'edit' },
                ]}
                fullWidth
                size="sm"
              />
            </div>

            {/* Routing Profile */}
            <Select
              label="Routing Profile"
              value={routingProfile}
              onChange={setRoutingProfile}
              data={[
                { value: 'cycling', label: '🚴 Cycling' },
                { value: 'walking', label: '🚶 Walking' },
                { value: 'driving', label: '🚗 Driving' },
              ]}
              size="sm"
            />

            {/* Route Stats */}
            {routeStats && (
              <Card withBorder p="sm">
                <Text size="sm" fw={500} mb="xs">Route Statistics</Text>
                <Group justify="space-between">
                  <Text size="xs">Distance</Text>
                  <Text size="xs" fw={600}>{routeStats.distance}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="xs">Elevation Gain</Text>
                  <Text size="xs" fw={600}>{routeStats.elevationGain}</Text>
                </Group>
              </Card>
            )}

            {/* Waypoints List */}
            {waypoints.length > 0 && (
              <Card withBorder p="sm">
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={500}>Waypoints ({waypoints.length})</Text>
                  <ActionIcon size="sm" variant="subtle" color="red" onClick={clearRoute}>
                    <Trash2 size={14} />
                  </ActionIcon>
                </Group>
                
                <ScrollArea.Autosize maxHeight={200}>
                  <Timeline active={waypoints.length - 1} bulletSize={16} lineWidth={1}>
                    {waypoints.map((wp, index) => (
                      <Timeline.Item
                        key={wp.id}
                        bullet={
                          <ThemeIcon size={14} color={wp.type === 'start' ? 'green' : wp.type === 'end' ? 'red' : 'blue'} radius="xl">
                            {wp.type === 'start' ? <Flag size={8} /> : wp.type === 'end' ? <Target size={8} /> : <MapPin size={8} />}
                          </ThemeIcon>
                        }
                        title={
                          <Group justify="space-between">
                            <Text size="xs">{wp.name}</Text>
                            <ActionIcon size="xs" variant="subtle" color="red" onClick={() => removeWaypoint(wp.id)}>
                              <X size={10} />
                            </ActionIcon>
                          </Group>
                        }
                      />
                    ))}
                  </Timeline>
                </ScrollArea.Autosize>
              </Card>
            )}

            {/* Instructions */}
            <Alert icon={<Info size={16} />} color="blue" variant="light">
              <Text size="xs">
                {activeMode === 'draw' ? 'Click on the map to add waypoints' : 'Drag waypoints to edit the route'}
              </Text>
            </Alert>
          </Stack>
        </Container>
      </div>

      {/* Main Map Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Map
          ref={mapRef}
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          mapboxAccessToken={process.env.REACT_APP_MAPBOX_TOKEN}
          style={{ width: '100%', height: '100%' }}
          mapStyle={mapStyles.find(s => s.value === mapStyle)?.url || 'mapbox://styles/mapbox/outdoors-v12'}
          onClick={activeMode === 'draw' ? (e) => {
            if (e.lngLat && 
                typeof e.lngLat.lng === 'number' && 
                typeof e.lngLat.lat === 'number' && 
                !isNaN(e.lngLat.lng) && 
                !isNaN(e.lngLat.lat)) {
              const position = [e.lngLat.lng, e.lngLat.lat];
              console.log('Calling addWaypoint with position:', position);
              addWaypoint(position);
              
              // Fallback: if hook doesn't work, create waypoint manually
              setTimeout(() => {
                const waypointExists = waypoints.some(wp => 
                  wp.position && 
                  Math.abs(wp.position[0] - position[0]) < 0.00001 &&
                  Math.abs(wp.position[1] - position[1]) < 0.00001
                );
                
                if (!waypointExists) {
                  console.log('Hook failed, creating waypoint manually');
                  const newWaypoint = {
                    id: `wp_${Date.now()}`,
                    position: position,
                    type: waypoints.length === 0 ? 'start' : 'waypoint',
                    name: waypoints.length === 0 ? 'Start' : `Waypoint ${waypoints.length}`
                  };
                  
                  const updatedWaypoints = [...waypoints, newWaypoint];
                  if (updatedWaypoints.length > 1) {
                    updatedWaypoints[updatedWaypoints.length - 1].type = 'end';
                    updatedWaypoints[updatedWaypoints.length - 1].name = 'End';
                    if (updatedWaypoints.length > 2) {
                      updatedWaypoints[updatedWaypoints.length - 2].type = 'waypoint';
                      updatedWaypoints[updatedWaypoints.length - 2].name = `Waypoint ${updatedWaypoints.length - 2}`;
                    }
                  }
                  
                  setWaypoints(updatedWaypoints);
                }
              }, 100);
            }
          } : undefined}
          cursor={activeMode === 'draw' ? 'crosshair' : 'default'}
        >
          <NavigationControl position="top-right" />
          <ScaleControl position="bottom-left" />
          
          {/* Route Line */}
          {((snappedRoute && snappedRoute.coordinates && snappedRoute.coordinates.length > 0) || 
            (waypoints.length >= 2)) && (
            <Source 
              id="route-line" 
              type="geojson" 
              data={buildLineString(snappedRoute?.coordinates || waypoints.map(wp => wp.position))}
            >
              <Layer
                id="route"
                type="line"
                paint={{
                  'line-color': snappedRoute ? '#228be6' : '#ff6b35',
                  'line-width': 4,
                  'line-opacity': snappedRoute ? 0.8 : 0.6,
                  'line-dasharray': snappedRoute ? undefined : [2, 2]
                }}
              />
            </Source>
          )}
          
          {/* Waypoint Markers */}
          {waypoints.filter(waypoint => 
            waypoint.position && 
            Array.isArray(waypoint.position) && 
            typeof waypoint.position[0] === 'number' && 
            typeof waypoint.position[1] === 'number' &&
            !isNaN(waypoint.position[0]) && 
            !isNaN(waypoint.position[1])
          ).map((waypoint) => (
            <Marker
              key={waypoint.id}
              longitude={waypoint.position[0]}
              latitude={waypoint.position[1]}
              anchor="center"
              draggable={activeMode === 'edit'}
              onDragEnd={activeMode === 'edit' ? (e) => {
                if (e.lngLat && 
                    typeof e.lngLat.lng === 'number' && 
                    typeof e.lngLat.lat === 'number' && 
                    !isNaN(e.lngLat.lng) && 
                    !isNaN(e.lngLat.lat)) {
                  const updatedWaypoints = waypoints.map(wp =>
                    wp.id === waypoint.id ? 
                      { ...wp, position: [e.lngLat.lng, e.lngLat.lat] } : 
                      wp
                  );
                  setWaypoints(updatedWaypoints);
                  setSnappedRoute(null);
                }
              } : undefined}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: waypoint.type === 'start' ? '#40c057' : 
                              waypoint.type === 'end' ? '#fa5252' : '#228be6',
                  border: selectedWaypoint === waypoint.id ? '3px solid #ff6b35' : '3px solid white',
                  cursor: activeMode === 'edit' ? 'move' : 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000,
                  position: 'relative',
                }}
                onClick={() => setSelectedWaypoint(waypoint.id)}
              >
                {waypoint.type === 'start' && <Flag size={10} color="white" />}
                {waypoint.type === 'end' && <Target size={10} color="white" />}
                {waypoint.type === 'waypoint' && (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />
                )}
              </div>
            </Marker>
          ))}
        </Map>
        
        {/* Top Toolbar */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
          }}
        >
          <Paper shadow="sm" p="xs" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tooltip label="Undo (Ctrl+Z)">
              <ActionIcon onClick={undo} disabled={historyIndex <= 0} variant="default">
                <Undo2 size={18} />
              </ActionIcon>
            </Tooltip>
            
            <Tooltip label="Redo (Ctrl+Y)">
              <ActionIcon onClick={redo} disabled={historyIndex >= history.length - 1} variant="default">
                <Redo2 size={18} />
              </ActionIcon>
            </Tooltip>
            
            <Divider orientation="vertical" />
            
            <Tooltip label="Snap to Roads">
              <ActionIcon 
                onClick={snapToRoads} 
                disabled={waypoints.length < 2 || snapping} 
                variant="default"
                loading={snapping}
              >
                <Route size={18} />
              </ActionIcon>
            </Tooltip>
            
            <Tooltip label="Clear Route">
              <ActionIcon onClick={clearRoute} disabled={waypoints.length === 0} variant="default">
                <Trash2 size={18} />
              </ActionIcon>
            </Tooltip>
            
            <Divider orientation="vertical" />
            
            {/* AI Enhancement Tools */}
            <Tooltip label="Toggle AI Panel (Ctrl+A)">
              <ActionIcon 
                onClick={() => setShowAIPanel(!showAIPanel)}
                variant={showAIPanel ? 'filled' : 'default'}
                color={showAIPanel ? 'blue' : undefined}
              >
                <Brain size={18} />
              </ActionIcon>
            </Tooltip>
            
            <Tooltip label="Generate AI Suggestions (Ctrl+G)">
              <ActionIcon 
                onClick={generateAISuggestions}
                disabled={waypoints.length < 2 || loadingAISuggestions}
                variant="default"
                loading={loadingAISuggestions}
              >
                <Sparkles size={18} />
              </ActionIcon>
            </Tooltip>
            
            <Divider orientation="vertical" />
            
            <Tooltip label="Save Route (Ctrl+S)">
              <ActionIcon 
                onClick={openSaveModal} 
                disabled={waypoints.length < 2 || !routeName} 
                variant="default"
              >
                <Save size={18} />
              </ActionIcon>
            </Tooltip>
            
            <Tooltip label="Export GPX">
              <ActionIcon 
                onClick={exportGPX} 
                disabled={waypoints.length < 2} 
                variant="default"
              >
                <Download size={18} />
              </ActionIcon>
            </Tooltip>
          </Paper>
        </div>
      </div>

      {/* Right AI Panel */}
      {showAIPanel && (
        <div style={{ 
          width: '300px',
          height: '100vh',
          overflowY: 'auto',
          backgroundColor: 'white',
          borderLeft: '1px solid #e0e0e0',
          position: isMobile ? 'absolute' : 'relative',
          right: 0,
          top: 0,
          zIndex: 1001
        }}>
          <Container p="md" size="100%">
            <Group justify="space-between" mb="md">
              <Group gap="xs">
                <Brain size={18} />
                <Text size="md" fw={600}>AI Assist</Text>
              </Group>
              <ActionIcon variant="subtle" onClick={() => setShowAIPanel(false)}>
                <X size={16} />
              </ActionIcon>
            </Group>

            {waypoints.length < 2 ? (
              <Alert icon={<Info size={16} />} color="blue" variant="light">
                <Text size="sm">
                  Create a route with at least 2 waypoints to get AI suggestions
                </Text>
              </Alert>
            ) : (
              <Stack gap="sm">
                <Group>
                  <Button
                    onClick={generateAISuggestions}
                    loading={loadingAISuggestions}
                    leftSection={<Sparkles size={16} />}
                    style={{ flex: 1 }}
                    variant="light"
                  >
                    Get AI Suggestions
                  </Button>
                  {aiSuggestionHistory.length > 0 && (
                    <Tooltip label="Undo Last AI Suggestion">
                      <ActionIcon
                        onClick={undoLastAISuggestion}
                        variant="light"
                        color="orange"
                      >
                        <Undo2 size={16} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>

                {aiSuggestions.length > 0 && (
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>Suggestions ({aiSuggestions.length})</Text>
                    {aiSuggestions.map(suggestion => (
                      <Card key={suggestion.id} withBorder p="sm" style={{
                        opacity: appliedSuggestions.has(suggestion.id) ? 0.6 : 1
                      }}>
                        <Group justify="space-between" align="flex-start" mb="xs">
                          <Group gap="xs">
                            <ThemeIcon size="sm" variant="light" color={
                              suggestion.type === 'scenery' ? 'green' :
                              suggestion.type === 'safety' ? 'orange' :
                              suggestion.type === 'performance' ? 'blue' : 'purple'
                            }>
                              {suggestion.icon}
                            </ThemeIcon>
                            <div style={{ flex: 1 }}>
                              <Text size="sm" fw={500}>{suggestion.title}</Text>
                            </div>
                          </Group>
                          <RingProgress
                            size={32}
                            thickness={3}
                            sections={[{ value: suggestion.confidence * 100, color: 'blue' }]}
                            label={
                              <Text size="xs" ta="center">
                                {Math.round(suggestion.confidence * 100)}%
                              </Text>
                            }
                          />
                        </Group>
                        
                        <Text size="xs" mb="xs" c="dimmed">
                          {suggestion.description}
                        </Text>
                        
                        <Group justify="space-between" align="center">
                          <Text size="xs" c="dimmed">
                            {suggestion.impact}
                          </Text>
                          <Button
                            size="xs"
                            variant={appliedSuggestions.has(suggestion.id) ? "light" : "filled"}
                            onClick={() => applySuggestion(suggestion)}
                            disabled={appliedSuggestions.has(suggestion.id)}
                          >
                            {appliedSuggestions.has(suggestion.id) ? <Check size={12} /> : 'Apply'}
                          </Button>
                        </Group>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Stack>
            )}
          </Container>
        </div>
      )}

      {/* Save Modal */}
      <Modal
        opened={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        title={
          <Group gap="sm">
            <Save size={20} color="#10b981" />
            <Text fw={600}>Save Route</Text>
          </Group>
        }
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Route Name"
            placeholder="Enter route name..."
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            required
          />
          
          <Textarea
            label="Description (optional)"
            placeholder="Add route description..."
            value={routeDescription}
            onChange={(e) => setRouteDescription(e.target.value)}
            rows={3}
          />

          {routeStats && (
            <Alert color="blue" variant="light">
              <Text size="sm">
                Route: {routeStats.distance} • ↗ {routeStats.elevationGain}
              </Text>
            </Alert>
          )}

          <Group justify="flex-end" gap="sm">
            <Button variant="light" onClick={() => setSaveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveRoute}
              loading={saving}
              disabled={!routeName.trim()}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #22d3ee 100%)'
              }}
            >
              Save Route
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
};

export default RouteStudio;