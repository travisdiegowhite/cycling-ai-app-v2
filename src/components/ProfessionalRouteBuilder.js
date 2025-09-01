import React, { useState, useCallback, useRef, forwardRef, useImperativeHandle, useEffect, useMemo } from 'react';
import Map, { Source, Layer, Marker, NavigationControl, ScaleControl, GeolocateControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  Paper,
  TextInput,
  Button,
  Group,
  Stack,
  Text,
  Badge,
  ActionIcon,
  Tooltip,
  SegmentedControl,
  Switch,
  Progress,
  Card,
  ThemeIcon,
  ScrollArea,
  Timeline,
  Alert,
  Transition,
  Menu,
  Divider,
  UnstyledButton,
  Modal,
  Select,
  Kbd,
  HoverCard,
  Loader,
  Center,
  RingProgress,
  Tabs,
} from '@mantine/core';
import { useHotkeys } from '@mantine/hooks';
import {
  Navigation2,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Upload,
  Route,
  Mountain,
  Clock,
  Save,
  ChevronDown,
  ChevronUp,
  X,
  Target,
  Flag,
  ArrowUpDown,
  AlertCircle,
  Plus,
  Layers,
  Bike,
  Car,
  Footprints,
  Settings,
  Check,
  MapPin,
  Share2,
  Copy,
  Grid3x3,
  Cloud,
  Sun,
  CloudRain,
  Wind,
  Eye,
  EyeOff,
  BarChart3,
  Info,
  Maximize2,
  Minimize2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { buildLineString, polylineDistance } from '../utils/geo';
import { getElevationData, calculateElevationMetrics } from '../utils/elevation';
import { pointsToGPX, parseGPX } from '../utils/gpx';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { useUnits } from '../utils/units';

/**
 * Professional RouteBuilder Component
 * Full-featured route building with all requested capabilities
 */
const ProfessionalRouteBuilder = forwardRef(({ 
  active, 
  onExit, 
  onSaved, 
  inline = false,
  mapRef,
}, ref) => {
  const { user } = useAuth();
  const { formatDistance, formatElevation } = useUnits();
  
  // === Core State ===
  const [waypoints, setWaypoints] = useState([]);
  const [routeName, setRouteName] = useState('');
  const [routeDescription, setRouteDescription] = useState('');
  const [activeMode, setActiveMode] = useState('draw'); // draw, edit, view
  const [routingProfile, setRoutingProfile] = useState('cycling'); // cycling, walking, driving
  const [autoRoute, setAutoRoute] = useState(true); // Auto-snap to roads
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // === Route Data State ===
  const [saving, setSaving] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const [snapProgress, setSnapProgress] = useState(0);
  const [snappedRoute, setSnappedRoute] = useState(null);
  const [elevationProfile, setElevationProfile] = useState([]);
  const [elevationStats, setElevationStats] = useState(null);
  const [error, setError] = useState(null);
  
  // === UI State ===
  const [selectedWaypoint, setSelectedWaypoint] = useState(null);
  const [hoveredWaypoint, setHoveredWaypoint] = useState(null);
  const [mapStyle, setMapStyle] = useState('streets');
  const [showGrid, setShowGrid] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const [showElevation, setShowElevation] = useState(true);
  const [showSavedRoutes, setShowSavedRoutes] = useState(true);
  const [showElevationModal, setShowElevationModal] = useState(false);
  
  // === History for Undo/Redo ===
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // === Saved Routes ===
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [loadingSavedRoutes, setLoadingSavedRoutes] = useState(false);
  
  // === Map Styles Configuration ===
  const mapStyles = [
    { value: 'streets', label: 'Streets', url: 'mapbox://styles/mapbox/streets-v12' },
    { value: 'outdoors', label: 'Outdoors', url: 'mapbox://styles/mapbox/outdoors-v12' },
    { value: 'satellite', label: 'Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
    { value: 'terrain', label: 'Terrain', url: 'mapbox://styles/mapbox/outdoors-v12' },
  ];
  
  // === Keyboard Shortcuts ===
  useHotkeys([
    ['mod+Z', () => undo()],
    ['mod+shift+Z', () => redo()],
    ['mod+Y', () => redo()],
    ['Delete', () => selectedWaypoint && removeWaypoint(selectedWaypoint)],
    ['Escape', () => setSelectedWaypoint(null)],
    ['mod+S', (e) => { e.preventDefault(); saveRoute(); }],
    ['mod+E', (e) => { e.preventDefault(); exportGPX(); }],
    ['Space', (e) => { e.preventDefault(); toggleMode(); }],
    ['mod+R', (e) => { e.preventDefault(); snapToRoads(); }],
    ['mod+shift+R', (e) => { e.preventDefault(); reverseRoute(); }],
  ]);
  
  // === Calculate Route Statistics ===
  const routeStats = useMemo(() => {
    const coords = snappedRoute?.coordinates || waypoints.map(w => w.position);
    // polylineDistance returns km, so multiply by 1000 for meters
    // But snappedRoute.distance is already in meters from Mapbox API
    const distance = snappedRoute?.distance || (coords.length > 1 ? polylineDistance(coords) * 1000 : 0);
    const duration = snappedRoute?.duration || ((distance / 1000) / 25 * 3600); // Assume 25km/h average
    
    return {
      distance, // in meters
      duration, // in seconds
      elevationGain: elevationStats?.gain || 0,
      elevationLoss: elevationStats?.loss || 0,
      maxElevation: elevationStats?.max || 0,
      minElevation: elevationStats?.min || 0,
      avgGrade: elevationStats?.avgGrade || 0,
      maxGrade: elevationStats?.maxGrade || 0,
      confidence: snappedRoute?.confidence || 0,
    };
  }, [snappedRoute, waypoints, elevationStats]);
  
  // === Toggle Mode ===
  const toggleMode = useCallback(() => {
    const modes = ['draw', 'edit', 'view'];
    const currentIndex = modes.indexOf(activeMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setActiveMode(modes[nextIndex]);
    toast.success(`Mode: ${modes[nextIndex]}`);
  }, [activeMode]);
  
  // === Fetch Saved Routes ===
  const fetchSavedRoutes = useCallback(async () => {
    if (!user?.id) return;
    
    setLoadingSavedRoutes(true);
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('id, metadata, summary')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      setSavedRoutes(data.map(route => ({
        id: route.id,
        name: route.metadata?.name || `Route ${route.id}`,
        distance: route.summary?.distance || 0,
        elevation: route.summary?.elevation_gain || 0,
        duration: route.metadata?.duration || 0,
        snapped: route.summary?.snapped || false,
      })));
    } catch (err) {
      console.error('Error fetching saved routes:', err);
    } finally {
      setLoadingSavedRoutes(false);
    }
  }, [user?.id]);
  
  // === Load saved routes on mount ===
  useEffect(() => {
    fetchSavedRoutes();
  }, [fetchSavedRoutes]);
  
  // === Add Waypoint ===
  const addWaypoint = useCallback((lngLat) => {
    const newWaypoint = {
      id: `wp_${Date.now()}`,
      position: [lngLat.lng, lngLat.lat],
      type: waypoints.length === 0 ? 'start' : 'end',
      name: waypoints.length === 0 ? 'Start' : `Waypoint ${waypoints.length}`,
    };
    
    const updatedWaypoints = [...waypoints];
    if (updatedWaypoints.length > 0) {
      updatedWaypoints[updatedWaypoints.length - 1].type = 'waypoint';
    }
    updatedWaypoints.push(newWaypoint);
    
    setWaypoints(updatedWaypoints);
    setHistory([...history.slice(0, historyIndex + 1), waypoints]);
    setHistoryIndex(historyIndex + 1);
  }, [waypoints, history, historyIndex]);
  
  // === Snap to Roads using Mapbox Directions API ===
  const snapToRoads = useCallback(async () => {
    if (waypoints.length < 2) {
      toast.error('Need at least 2 waypoints');
      return;
    }
    
    setSnapping(true);
    setSnapProgress(0);
    setError(null);
    
    try {
      const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN;
      if (!mapboxToken) {
        throw new Error('Mapbox token not configured');
      }

      // Use Mapbox Directions API for proper road snapping
      const coordinates = waypoints.map(wp => `${wp.position[0]},${wp.position[1]}`).join(';');
      const profile = routingProfile === 'cycling' ? 'cycling' : 
                      routingProfile === 'walking' ? 'walking' : 'driving';
      
      const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?` +
        `geometries=geojson&` +
        `overview=full&` +
        `steps=false&` +
        `annotations=distance,duration&` +
        `access_token=${mapboxToken}`;
      
      setSnapProgress(0.3);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Directions API error: ${response.status}`);
      }
      
      const data = await response.json();
      setSnapProgress(0.6);
      
      if (!data.routes || !data.routes.length) {
        throw new Error('No routes found');
      }
      
      const route = data.routes[0];
      const snappedCoordinates = route.geometry.coordinates;
      
      setSnappedRoute({
        coordinates: snappedCoordinates,
        distance: route.distance || 0,
        duration: route.duration || 0,
        confidence: 1.0,
      });
      
      setSnapProgress(0.8);
      
      // Fetch elevation data
      await fetchElevation(snappedCoordinates);
      
      setSnapProgress(1.0);
      toast.success('Route snapped to roads successfully!');
      
    } catch (err) {
      console.error('Route snapping failed:', err);
      toast.error(`Failed to snap route: ${err.message}`);
      setError(err.message);
    } finally {
      setSnapping(false);
      setSnapProgress(0);
    }
  }, [waypoints, routingProfile]);
  
  // === Fetch Elevation Profile ===
  const fetchElevation = useCallback(async (coordinates) => {
    try {
      if (!coordinates || coordinates.length < 2) return;
      
      const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN;
      
      // Use the new elevation data fetching with real terrain data
      const elevationData = await getElevationData(coordinates, mapboxToken);
      
      // Calculate cumulative distance for each point
      let cumulativeDistance = 0;
      const elevationProfile = elevationData.map((point, index) => {
        if (index > 0) {
          const [prevLon, prevLat] = coordinates[index - 1];
          const [currLon, currLat] = coordinates[index];
          const segmentDistance = polylineDistance([[prevLon, prevLat], [currLon, currLat]]) * 1000; // Convert to meters
          cumulativeDistance += segmentDistance;
        }
        
        return {
          coordinate: [point.lon, point.lat],
          elevation: point.elevation,
          distance: cumulativeDistance
        };
      });
      
      setElevationProfile(elevationProfile);
      
      // Calculate elevation stats using new metrics function
      const stats = calculateElevationMetrics(elevationProfile);
      setElevationStats(stats);
      
    } catch (err) {
      console.error('Failed to fetch elevation:', err);
    }
  }, []);
  
  // === Auto-route when waypoints change ===
  useEffect(() => {
    if (waypoints.length >= 2 && autoRoute) {
      const timer = setTimeout(() => {
        snapToRoads();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [waypoints.length, autoRoute]); // Intentionally limited deps
  
  // === Clear Route ===
  const clearRoute = useCallback(() => {
    setWaypoints([]);
    setSnappedRoute(null);
    setElevationProfile([]);
    setElevationStats(null);
    setError(null);
    setHistory([]);
    setHistoryIndex(-1);
    setSelectedWaypoint(null);
  }, []);
  
  // === Undo/Redo ===
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setWaypoints(history[historyIndex - 1]);
    }
  }, [historyIndex, history]);
  
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setWaypoints(history[historyIndex + 1]);
    }
  }, [historyIndex, history]);
  
  // === Reverse Route ===
  const reverseRoute = useCallback(() => {
    const reversed = [...waypoints].reverse();
    if (reversed.length > 0) {
      reversed[0].type = 'start';
      reversed[reversed.length - 1].type = 'end';
      reversed.slice(1, -1).forEach(wp => wp.type = 'waypoint');
    }
    setWaypoints(reversed);
    toast.success('Route reversed');
  }, [waypoints]);
  
  // === Remove Waypoint ===
  const removeWaypoint = useCallback((waypointId) => {
    const filtered = waypoints.filter(wp => wp.id !== waypointId);
    if (filtered.length > 0) {
      filtered[0].type = 'start';
      if (filtered.length > 1) {
        filtered[filtered.length - 1].type = 'end';
        filtered.slice(1, -1).forEach(wp => wp.type = 'waypoint');
      }
    }
    setWaypoints(filtered);
    setSelectedWaypoint(null);
  }, [waypoints]);
  
  // === Export GPX ===
  const exportGPX = useCallback(() => {
    const coords = snappedRoute?.coordinates || waypoints.map(w => w.position);
    if (coords.length < 2) {
      toast.error('Need at least 2 points to export');
      return;
    }
    
    const gpxData = pointsToGPX(coords, routeName || 'My Route', {
      description: routeDescription,
      elevationProfile,
    });
    
    const blob = new Blob([gpxData], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${routeName || 'route'}_${new Date().toISOString().split('T')[0]}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('GPX file exported');
  }, [snappedRoute, waypoints, routeName, routeDescription, elevationProfile]);
  
  // === Import GPX ===
  const importGPX = useCallback(async (file) => {
    try {
      const text = await file.text();
      const { waypoints: importedWaypoints, name, description } = parseGPX(text);
      
      if (importedWaypoints.length < 2) {
        throw new Error('GPX file must contain at least 2 points');
      }
      
      // Convert to our waypoint format
      const newWaypoints = importedWaypoints.map((coord, index) => ({
        id: `wp_${Date.now()}_${index}`,
        position: coord,
        type: index === 0 ? 'start' : index === importedWaypoints.length - 1 ? 'end' : 'waypoint',
        name: index === 0 ? 'Start' : `Waypoint ${index}`,
      }));
      
      setWaypoints(newWaypoints);
      if (name) setRouteName(name);
      if (description) setRouteDescription(description);
      
      toast.success('GPX file imported successfully');
      
      // Auto-snap if enabled
      if (autoRoute) {
        setTimeout(() => snapToRoads(), 500);
      }
    } catch (err) {
      console.error('GPX import failed:', err);
      toast.error(`Failed to import GPX: ${err.message}`);
    }
  }, [autoRoute, snapToRoads]);
  
  // === Save Route ===
  const saveRoute = useCallback(async () => {
    if (!routeName.trim()) {
      toast.error('Please enter a route name');
      return;
    }
    
    if (waypoints.length < 2) {
      toast.error('Route must have at least 2 points');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const coords = snappedRoute?.coordinates || waypoints.map(w => w.position);
      const distanceKm = routeStats.distance / 1000; // Convert meters to km for database
      
      const track_points = coords.map((coord, index) => ({
        order_index: index,
        longitude: coord[0],
        latitude: coord[1],
        elevation: elevationProfile[index]?.elevation || null,
        cumulative_distance: elevationProfile[index]?.distance || 0,
      }));

      const metadata = {
        name: routeName,
        description: routeDescription,
        created_at: new Date().toISOString(),
        routing_profile: routingProfile,
        auto_routed: autoRoute,
        confidence: routeStats.confidence,
        duration: routeStats.duration,
      };

      const summary = {
        distance: distanceKm,
        snapped: !!snappedRoute,
        elevation_gain: elevationStats?.gain || 0,
        elevation_loss: elevationStats?.loss || 0,
        elevation_min: elevationStats?.min || null,
        elevation_max: elevationStats?.max || null,
      };
      
      const routeData = {
        user_id: user.id,
        metadata,
        track_points,
        summary
      };
      
      const { data, error } = await supabase.from('routes').insert([routeData]).select();
      
      if (error) throw error;
      
      toast.success(`Route "${routeName}" saved successfully!`);
      
      // Refresh saved routes
      fetchSavedRoutes();
      
      // Clear form
      clearRoute();
      setRouteName('');
      setRouteDescription('');
      
      // Call parent callback
      if (onSaved) onSaved(data[0]);
      
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save route');
      toast.error(err.message || 'Failed to save route');
    } finally {
      setSaving(false);
    }
  }, [routeName, routeDescription, waypoints, snappedRoute, routeStats, elevationProfile, elevationStats, routingProfile, autoRoute, user.id, onSaved, clearRoute, fetchSavedRoutes]);
  
  // === Share Route ===
  const shareRoute = useCallback(() => {
    const shareUrl = `${window.location.origin}/route/${Date.now()}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied to clipboard!');
  }, []);
  
  // === Expose methods to parent ===
  useImperativeHandle(ref, () => ({
    addPoint: addWaypoint,
    clearAll: clearRoute,
    saveRoute,
  }), [addWaypoint, clearRoute, saveRoute]);
  
  // === Format helpers ===
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };
  
  // === Build route line for map ===
  const routeLine = useMemo(() => {
    const coords = snappedRoute?.coordinates || (waypoints.length > 1 ? waypoints.map(w => w.position) : null);
    return coords ? buildLineString(coords) : null;
  }, [snappedRoute, waypoints]);
  
  // === Update map style when changed ===
  useEffect(() => {
    if (mapRef?.current && !inline) {
      const style = mapStyles.find(s => s.value === mapStyle);
      if (style) {
        mapRef.current.setStyle(style.url);
      }
    }
  }, [mapStyle, mapRef, inline]);
  
  // === Inline mode - return just map elements ===
  if (inline) {
    return (
      <>
        {/* Grid overlay */}
        {showGrid && (
          <Source
            type="geojson"
            data={{
              type: 'FeatureCollection',
              features: []
            }}
          >
            <Layer
              id="grid-layer"
              type="line"
              paint={{
                'line-color': '#000000',
                'line-width': 0.5,
                'line-opacity': 0.1,
              }}
            />
          </Source>
        )}
        
        {/* Route line */}
        {routeLine && (
          <Source type="geojson" data={routeLine}>
            <Layer
              id="route-builder-line"
              type="line"
              paint={{
                'line-color': snappedRoute ? '#2563eb' : '#64748b',
                'line-width': snappedRoute ? 5 : 3,
                'line-opacity': 0.8,
              }}
            />
            {/* Route outline for better visibility */}
            <Layer
              id="route-builder-line-outline"
              type="line"
              paint={{
                'line-color': '#ffffff',
                'line-width': snappedRoute ? 7 : 5,
                'line-opacity': 0.4,
              }}
              beforeId="route-builder-line"
            />
          </Source>
        )}

        {/* Waypoint markers */}
        {waypoints.map((waypoint, index) => (
          <Marker
            key={waypoint.id}
            longitude={waypoint.position[0]}
            latitude={waypoint.position[1]}
            draggable={activeMode === 'edit'}
            onDragEnd={(e) => {
              const updatedWaypoints = [...waypoints];
              updatedWaypoints[index] = {
                ...waypoint,
                position: [e.lngLat.lng, e.lngLat.lat]
              };
              setWaypoints(updatedWaypoints);
              setSnappedRoute(null); // Clear snapped route on edit
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: waypoint.type === 'start' ? '#10b981' : 
                            waypoint.type === 'end' ? '#ef4444' : '#3b82f6',
                border: selectedWaypoint === waypoint.id ? '3px solid #ffd43b' : '3px solid white',
                cursor: activeMode === 'edit' ? 'move' : 'pointer',
                boxShadow: hoveredWaypoint === waypoint.id ? 
                  '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: hoveredWaypoint === waypoint.id ? 'scale(1.15)' : 'scale(1)',
                transition: 'all 0.2s ease',
              }}
              onClick={() => setSelectedWaypoint(waypoint.id)}
              onMouseEnter={() => setHoveredWaypoint(waypoint.id)}
              onMouseLeave={() => setHoveredWaypoint(null)}
            >
              {waypoint.type === 'start' && <Flag size={14} color="white" />}
              {waypoint.type === 'end' && <Target size={14} color="white" />}
              {waypoint.type === 'waypoint' && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />
              )}
            </div>
          </Marker>
        ))}
      </>
    );
  }
  
  // === Full interface for standalone mode ===
  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      width: '100vw',
      position: 'fixed',
      top: 0,
      left: 0,
      background: '#f0f2f5',
      zIndex: 1000
    }}>
      {/* Keyboard shortcuts help */}
      <HoverCard width={320} shadow="md" position="bottom-start">
        <HoverCard.Target>
          <Badge 
            variant="light" 
            size="sm" 
            style={{ 
              position: 'absolute', 
              top: 10, 
              right: 10, 
              zIndex: 20, 
              cursor: 'help' 
            }}
          >
            Keyboard Shortcuts
          </Badge>
        </HoverCard.Target>
        <HoverCard.Dropdown>
          <Text size="sm" fw={500} mb="xs">Keyboard Shortcuts</Text>
          <Stack gap={4}>
            <Group justify="space-between">
              <Text size="xs">Undo/Redo</Text>
              <Group gap={4}>
                <Kbd size="xs">Ctrl</Kbd>+<Kbd size="xs">Z</Kbd>/<Kbd size="xs">Y</Kbd>
              </Group>
            </Group>
            <Group justify="space-between">
              <Text size="xs">Save Route</Text>
              <Group gap={4}>
                <Kbd size="xs">Ctrl</Kbd>+<Kbd size="xs">S</Kbd>
              </Group>
            </Group>
            <Group justify="space-between">
              <Text size="xs">Export GPX</Text>
              <Group gap={4}>
                <Kbd size="xs">Ctrl</Kbd>+<Kbd size="xs">E</Kbd>
              </Group>
            </Group>
            <Group justify="space-between">
              <Text size="xs">Snap to Roads</Text>
              <Group gap={4}>
                <Kbd size="xs">Ctrl</Kbd>+<Kbd size="xs">R</Kbd>
              </Group>
            </Group>
            <Group justify="space-between">
              <Text size="xs">Toggle Mode</Text>
              <Kbd size="xs">Space</Kbd>
            </Group>
            <Group justify="space-between">
              <Text size="xs">Delete Waypoint</Text>
              <Kbd size="xs">Del</Kbd>
            </Group>
          </Stack>
        </HoverCard.Dropdown>
      </HoverCard>
      
      {/* Left Sidebar */}
      <Transition mounted={!sidebarCollapsed} transition="slide-right" duration={300}>
        {(styles) => (
          <Paper
            shadow="sm"
            style={{
              ...styles,
              width: 400,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 0,
              zIndex: 10,
            }}
          >
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e9ecef' }}>
              <Group justify="space-between" mb="md">
                <Group>
                  <ThemeIcon size="lg" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
                    <Route size={20} />
                  </ThemeIcon>
                  <div>
                    <Text size="lg" fw={600}>Professional Route Builder</Text>
                    <Text size="xs" c="dimmed">Design your perfect ride</Text>
                  </div>
                </Group>
                <Group gap="xs">
                  {onExit && (
                    <Tooltip label="Exit">
                      <ActionIcon onClick={onExit} variant="subtle">
                        <X size={18} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                  <Tooltip label="Collapse sidebar">
                    <ActionIcon onClick={() => setSidebarCollapsed(true)} variant="subtle">
                      <ChevronDown size={18} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>

              {/* Mode Selector */}
              <SegmentedControl
                value={activeMode}
                onChange={setActiveMode}
                fullWidth
                data={[
                  { label: '✏️ Draw', value: 'draw' },
                  { label: '🔧 Edit', value: 'edit' },
                  { label: '👁️ View', value: 'view' },
                ]}
              />
              
              <Text size="xs" c="dimmed" ta="center" mt="xs">
                {activeMode === 'draw' && 'Click map to add waypoints'}
                {activeMode === 'edit' && 'Drag waypoints to modify'}
                {activeMode === 'view' && 'Overview mode'}
              </Text>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="route" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Tabs.List>
                <Tabs.Tab value="route" leftSection={<Route size={14} />}>Route</Tabs.Tab>
                <Tabs.Tab value="saved" leftSection={<Save size={14} />}>Saved</Tabs.Tab>
                <Tabs.Tab value="settings" leftSection={<Settings size={14} />}>Settings</Tabs.Tab>
              </Tabs.List>
              
              <ScrollArea style={{ flex: 1 }} p="md">
                {/* Route Tab */}
                <Tabs.Panel value="route">
                  <Stack gap="md">
                    {/* Route Details */}
                    <Card withBorder>
                      <Stack gap="sm">
                        <TextInput
                          placeholder="Route name"
                          value={routeName}
                          onChange={(e) => setRouteName(e.target.value)}
                          leftSection={<Route size={16} />}
                          error={!routeName && waypoints.length > 0 ? 'Name required' : null}
                        />
                        <TextInput
                          placeholder="Description (optional)"
                          value={routeDescription}
                          onChange={(e) => setRouteDescription(e.target.value)}
                          leftSection={<Info size={16} />}
                        />
                      </Stack>
                    </Card>

                    {/* Route Stats */}
                    {waypoints.length > 0 && (
                      <Card withBorder>
                        <Group justify="space-between" mb="sm">
                          <Text fw={500} size="sm">Route Statistics</Text>
                          <Group gap="xs">
                            <Badge size="sm" variant="light" color={
                              routingProfile === 'cycling' ? 'blue' :
                              routingProfile === 'walking' ? 'green' : 'orange'
                            }>
                              {routingProfile === 'cycling' && <Bike size={12} />}
                              {routingProfile === 'walking' && <Footprints size={12} />}
                              {routingProfile === 'driving' && <Car size={12} />}
                            </Badge>
                            {snappedRoute && (
                              <Badge size="sm" variant="light" color="green">
                                Snapped ✓
                              </Badge>
                            )}
                          </Group>
                        </Group>
                        
                        <Stack gap="xs">
                          <Group justify="space-between">
                            <Group gap="xs">
                              <Route size={14} />
                              <Text size="sm">Distance</Text>
                            </Group>
                            <Text size="sm" fw={600}>{formatDistance(routeStats.distance / 1000)}</Text>
                          </Group>
                          
                          <Group justify="space-between">
                            <Group gap="xs">
                              <Clock size={14} />
                              <Text size="sm">Duration</Text>
                            </Group>
                            <Text size="sm" fw={600}>{formatDuration(routeStats.duration)}</Text>
                          </Group>
                          
                          {elevationStats && (
                            <>
                              <Group justify="space-between">
                                <Group gap="xs">
                                  <Mountain size={14} />
                                  <Text size="sm">Elevation</Text>
                                </Group>
                                <Text size="sm" fw={600}>
                                  +{Math.round(routeStats.elevationGain)}m / -{Math.round(routeStats.elevationLoss)}m
                                </Text>
                              </Group>
                              
                              <Group justify="space-between">
                                <Group gap="xs">
                                  <ArrowUpDown size={14} />
                                  <Text size="sm">Grade</Text>
                                </Group>
                                <Text size="sm" fw={600}>
                                  avg {routeStats.avgGrade.toFixed(1)}% / max {routeStats.maxGrade.toFixed(1)}%
                                </Text>
                              </Group>
                            </>
                          )}
                          
                          {routeStats.confidence > 0 && (
                            <Group justify="space-between">
                              <Text size="sm">Confidence</Text>
                              <RingProgress
                                size={40}
                                thickness={4}
                                sections={[{ value: routeStats.confidence * 100, color: 'blue' }]}
                                label={
                                  <Text size="xs" ta="center">
                                    {Math.round(routeStats.confidence * 100)}%
                                  </Text>
                                }
                              />
                            </Group>
                          )}
                        </Stack>
                        
                        {elevationProfile.length > 0 && (
                          <Button
                            variant="light"
                            size="xs"
                            leftSection={<BarChart3 size={12} />}
                            onClick={() => setShowElevationModal(true)}
                            mt="xs"
                            fullWidth
                          >
                            View Elevation Profile
                          </Button>
                        )}
                      </Card>
                    )}

                    {/* Waypoints */}
                    {waypoints.length > 0 && (
                      <Card withBorder>
                        <Group justify="space-between" mb="sm">
                          <Text fw={500} size="sm">Waypoints ({waypoints.length})</Text>
                          <Group gap="xs">
                            <Tooltip label="Reverse route">
                              <ActionIcon size="sm" variant="subtle" onClick={reverseRoute}>
                                <ArrowUpDown size={14} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Clear all">
                              <ActionIcon size="sm" variant="subtle" color="red" onClick={clearRoute}>
                                <Trash2 size={14} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Group>
                        
                        <Timeline active={waypoints.length - 1} bulletSize={24} lineWidth={2}>
                          {waypoints.map((wp) => (
                            <Timeline.Item
                              key={wp.id}
                              bullet={
                                wp.type === 'start' ? 
                                  <ThemeIcon size={20} color="green" radius="xl">
                                    <Flag size={12} />
                                  </ThemeIcon> :
                                wp.type === 'end' ? 
                                  <ThemeIcon size={20} color="red" radius="xl">
                                    <Target size={12} />
                                  </ThemeIcon> :
                                  <ThemeIcon size={20} color="blue" radius="xl">
                                    <MapPin size={12} />
                                  </ThemeIcon>
                              }
                              title={
                                <Group justify="space-between">
                                  <Text size="sm" fw={selectedWaypoint === wp.id ? 600 : 400}>
                                    {wp.name}
                                  </Text>
                                  <ActionIcon 
                                    size="xs" 
                                    variant="subtle" 
                                    color="red"
                                    onClick={() => removeWaypoint(wp.id)}
                                  >
                                    <X size={12} />
                                  </ActionIcon>
                                </Group>
                              }
                            >
                              <Text size="xs" c="dimmed">
                                {wp.position[1].toFixed(5)}, {wp.position[0].toFixed(5)}
                              </Text>
                            </Timeline.Item>
                          ))}
                        </Timeline>
                      </Card>
                    )}

                    {/* Error Display */}
                    {error && (
                      <Alert color="red" icon={<AlertCircle size={16} />}>
                        {error}
                      </Alert>
                    )}

                    {/* Snapping Progress */}
                    {snapping && (
                      <Card withBorder>
                        <Stack gap="xs">
                          <Group justify="space-between">
                            <Text size="sm">Snapping to roads...</Text>
                            <Text size="xs" c="dimmed">{Math.round(snapProgress * 100)}%</Text>
                          </Group>
                          <Progress value={snapProgress * 100} size="sm" animated />
                        </Stack>
                      </Card>
                    )}
                  </Stack>
                </Tabs.Panel>
                
                {/* Saved Routes Tab */}
                <Tabs.Panel value="saved">
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Text fw={500}>Saved Routes</Text>
                      <ActionIcon 
                        size="sm" 
                        variant="subtle" 
                        onClick={fetchSavedRoutes} 
                        loading={loadingSavedRoutes}
                      >
                        <RefreshCw size={14} />
                      </ActionIcon>
                    </Group>
                    
                    {savedRoutes.length === 0 ? (
                      <Text size="sm" c="dimmed" ta="center" py="xl">
                        No saved routes yet
                      </Text>
                    ) : (
                      <Stack gap="xs">
                        {savedRoutes.map(route => (
                          <UnstyledButton
                            key={route.id}
                            style={{
                              padding: '12px',
                              borderRadius: '8px',
                              border: '1px solid #e9ecef',
                              transition: 'all 0.2s',
                              '&:hover': { background: '#f8f9fa' }
                            }}
                          >
                            <Group justify="space-between">
                              <div>
                                <Text size="sm" fw={500}>{route.name}</Text>
                                <Group gap="xs" mt={4}>
                                  <Badge size="xs" variant="light">
                                    {formatDistance(route.distance)}
                                  </Badge>
                                  <Badge size="xs" variant="light" color="orange">
                                    +{Math.round(route.elevation)}m
                                  </Badge>
                                  <Badge size="xs" variant="light" color="violet">
                                    {formatDuration(route.duration)}
                                  </Badge>
                                  {route.snapped && (
                                    <Badge size="xs" variant="light" color="green">
                                      Snapped
                                    </Badge>
                                  )}
                                </Group>
                              </div>
                              <ActionIcon size="sm" variant="subtle">
                                <ExternalLink size={14} />
                              </ActionIcon>
                            </Group>
                          </UnstyledButton>
                        ))}
                      </Stack>
                    )}
                  </Stack>
                </Tabs.Panel>
                
                {/* Settings Tab */}
                <Tabs.Panel value="settings">
                  <Stack gap="md">
                    <Card withBorder>
                      <Text fw={500} size="sm" mb="sm">Routing Options</Text>
                      <Stack gap="xs">
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
                        
                        <Switch
                          label="Auto-route between points"
                          description="Automatically snap to roads"
                          checked={autoRoute}
                          onChange={(e) => setAutoRoute(e.currentTarget.checked)}
                          size="sm"
                        />
                      </Stack>
                    </Card>
                    
                    <Card withBorder>
                      <Text fw={500} size="sm" mb="sm">Display Options</Text>
                      <Stack gap="xs">
                        <Switch
                          label="Show elevation profile"
                          checked={showElevation}
                          onChange={(e) => setShowElevation(e.currentTarget.checked)}
                          size="sm"
                        />
                        
                        <Switch
                          label="Show grid overlay"
                          checked={showGrid}
                          onChange={(e) => setShowGrid(e.currentTarget.checked)}
                          size="sm"
                        />
                        
                        <Switch
                          label="Show weather layer"
                          checked={showWeather}
                          onChange={(e) => setShowWeather(e.currentTarget.checked)}
                          size="sm"
                        />
                      </Stack>
                    </Card>
                  </Stack>
                </Tabs.Panel>
              </ScrollArea>
            </Tabs>

            {/* Footer Actions */}
            <div style={{ padding: '16px', borderTop: '1px solid #e9ecef' }}>
              <Stack gap="sm">
                <Group grow>
                  <Tooltip label="Snap to roads (Ctrl+R)">
                    <Button
                      variant="default"
                      leftSection={<Navigation2 size={16} />}
                      onClick={snapToRoads}
                      disabled={waypoints.length < 2 || snapping}
                      loading={snapping}
                      size="sm"
                    >
                      Snap
                    </Button>
                  </Tooltip>
                  
                  <Menu position="top-start">
                    <Menu.Target>
                      <Button
                        variant="default"
                        rightSection={<ChevronUp size={14} />}
                        size="sm"
                      >
                        Import/Export
                      </Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<Download size={14} />}
                        onClick={exportGPX}
                        disabled={waypoints.length < 2}
                      >
                        Export GPX
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<Upload size={14} />}
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = '.gpx';
                          input.onchange = (e) => {
                            const file = e.target.files[0];
                            if (file) importGPX(file);
                          };
                          input.click();
                        }}
                      >
                        Import GPX
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                  
                  <Tooltip label="Share route">
                    <Button
                      variant="default"
                      leftSection={<Share2 size={16} />}
                      onClick={shareRoute}
                      disabled={waypoints.length < 2}
                      size="sm"
                    >
                      Share
                    </Button>
                  </Tooltip>
                </Group>
                
                <Button
                  fullWidth
                  leftSection={<Save size={16} />}
                  onClick={saveRoute}
                  disabled={!routeName || waypoints.length < 2 || saving}
                  loading={saving}
                  gradient={{ from: 'blue', to: 'cyan' }}
                  variant="gradient"
                >
                  Save Route
                </Button>
              </Stack>
            </div>
          </Paper>
        )}
      </Transition>

      {/* Collapsed Sidebar Toggle */}
      {sidebarCollapsed && (
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
          <Button
            leftSection={<ChevronUp size={16} style={{ transform: 'rotate(-90deg)' }} />}
            onClick={() => setSidebarCollapsed(false)}
            variant="filled"
            size="sm"
          >
            Show Panel
          </Button>
        </div>
      )}

      {/* Map Container (for standalone mode) */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Map
          mapboxAccessToken={process.env.REACT_APP_MAPBOX_TOKEN}
          initialViewState={{
            longitude: -104.9903,
            latitude: 39.7392,
            zoom: 13,
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle={mapStyles.find(s => s.value === mapStyle)?.url || 'mapbox://styles/mapbox/streets-v12'}
          onClick={(e) => {
            if (activeMode === 'draw') {
              addWaypoint(e.lngLat);
            }
          }}
          cursor={activeMode === 'draw' ? 'crosshair' : activeMode === 'edit' ? 'move' : 'grab'}
        >
          {/* Map Controls */}
          <NavigationControl position="top-right" />
          <ScaleControl position="bottom-right" />
          <GeolocateControl position="top-right" />
          
          {/* Grid overlay */}
          {showGrid && (
            <Source
              type="geojson"
              data={{
                type: 'FeatureCollection',
                features: []
              }}
            >
              <Layer
                id="grid-layer"
                type="line"
                paint={{
                  'line-color': '#000000',
                  'line-width': 0.5,
                  'line-opacity': 0.1,
                }}
              />
            </Source>
          )}
          
          {/* Route line */}
          {routeLine && (
            <Source type="geojson" data={routeLine}>
              <Layer
                id="route-builder-line"
                type="line"
                paint={{
                  'line-color': snappedRoute ? '#2563eb' : '#64748b',
                  'line-width': snappedRoute ? 5 : 3,
                  'line-opacity': 0.8,
                }}
              />
              {/* Route outline for better visibility */}
              <Layer
                id="route-builder-line-outline"
                type="line"
                paint={{
                  'line-color': '#ffffff',
                  'line-width': snappedRoute ? 7 : 5,
                  'line-opacity': 0.4,
                }}
                beforeId="route-builder-line"
              />
            </Source>
          )}

          {/* Waypoint markers */}
          {waypoints.map((waypoint, index) => (
            <Marker
              key={waypoint.id}
              longitude={waypoint.position[0]}
              latitude={waypoint.position[1]}
              draggable={activeMode === 'edit'}
              onDragEnd={(e) => {
                const updatedWaypoints = [...waypoints];
                updatedWaypoints[index] = {
                  ...waypoint,
                  position: [e.lngLat.lng, e.lngLat.lat]
                };
                setWaypoints(updatedWaypoints);
                setSnappedRoute(null); // Clear snapped route on edit
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: waypoint.type === 'start' ? '#10b981' : 
                              waypoint.type === 'end' ? '#ef4444' : '#3b82f6',
                  border: selectedWaypoint === waypoint.id ? '3px solid #ffd43b' : '3px solid white',
                  cursor: activeMode === 'edit' ? 'move' : 'pointer',
                  boxShadow: hoveredWaypoint === waypoint.id ? 
                    '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: hoveredWaypoint === waypoint.id ? 'scale(1.15)' : 'scale(1)',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => setSelectedWaypoint(waypoint.id)}
                onMouseEnter={() => setHoveredWaypoint(waypoint.id)}
                onMouseLeave={() => setHoveredWaypoint(null)}
              >
                {waypoint.type === 'start' && <Flag size={14} color="white" />}
                {waypoint.type === 'end' && <Target size={14} color="white" />}
                {waypoint.type === 'waypoint' && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />
                )}
              </div>
            </Marker>
          ))}
        </Map>
        
        {/* Map Overlay Controls */}
        <Paper
          shadow="sm"
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            padding: '8px',
            display: 'flex',
            gap: 8,
            zIndex: 5,
          }}
        >
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
          
          <Menu position="bottom-end">
            <Menu.Target>
              <ActionIcon variant="default">
                <Layers size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Map Style</Menu.Label>
              {mapStyles.map(style => (
                <Menu.Item
                  key={style.value}
                  onClick={() => setMapStyle(style.value)}
                  leftSection={mapStyle === style.value && <Check size={14} />}
                >
                  {style.label}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
          
          <Menu position="bottom-end">
            <Menu.Target>
              <ActionIcon variant="default">
                <Settings size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Routing Profile</Menu.Label>
              <Menu.Item
                leftSection={<Bike size={14} />}
                onClick={() => setRoutingProfile('cycling')}
                rightSection={routingProfile === 'cycling' && <Check size={14} />}
              >
                Cycling
              </Menu.Item>
              <Menu.Item
                leftSection={<Footprints size={14} />}
                onClick={() => setRoutingProfile('walking')}
                rightSection={routingProfile === 'walking' && <Check size={14} />}
              >
                Walking
              </Menu.Item>
              <Menu.Item
                leftSection={<Car size={14} />}
                onClick={() => setRoutingProfile('driving')}
                rightSection={routingProfile === 'driving' && <Check size={14} />}
              >
                Driving
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Paper>

        {/* Mode Badge */}
        <Badge
          variant="filled"
          color={activeMode === 'draw' ? 'blue' : activeMode === 'edit' ? 'orange' : 'green'}
          style={{
            position: 'absolute',
            top: 80,
            right: 20,
            zIndex: 5,
          }}
        >
          {activeMode.toUpperCase()} MODE
        </Badge>

        {/* Instructions */}
        {waypoints.length === 0 && (
          <Center style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1,
          }}>
            <Card withBorder p="xl">
              <Stack align="center">
                <ThemeIcon size={60} variant="light" radius="xl">
                  <MapPin size={30} />
                </ThemeIcon>
                <Text size="lg" fw={500}>Start Building Your Route</Text>
                <Text size="sm" c="dimmed" ta="center">
                  Click on the map to add waypoints<br />
                  Press Space to toggle between modes
                </Text>
              </Stack>
            </Card>
          </Center>
        )}

        {/* Quick Stats */}
        {waypoints.length > 0 && (
          <Card
            withBorder
            style={{
              position: 'absolute',
              bottom: 20,
              left: sidebarCollapsed ? 20 : 420,
              zIndex: 5,
              minWidth: 300,
            }}
          >
            <Group justify="space-between">
              <Group gap="xl">
                <div>
                  <Text size="xs" c="dimmed">Distance</Text>
                  <Text size="lg" fw={600}>{formatDistance(routeStats.distance / 1000)}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">Duration</Text>
                  <Text size="lg" fw={600}>{formatDuration(routeStats.duration)}</Text>
                </div>
                {elevationStats && (
                  <div>
                    <Text size="xs" c="dimmed">Elevation</Text>
                    <Text size="lg" fw={600}>+{Math.round(routeStats.elevationGain)}m</Text>
                  </div>
                )}
              </Group>
              {showElevation && elevationProfile.length > 0 && (
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() => setShowElevationModal(true)}
                >
                  <BarChart3 size={16} />
                </Button>
              )}
            </Group>
          </Card>
        )}
      </div>

      {/* Elevation Profile Modal */}
      <Modal
        opened={showElevationModal}
        onClose={() => setShowElevationModal(false)}
        title="Elevation Profile"
        size="xl"
      >
        <Stack>
          <Group justify="space-between">
            <Stack gap={4}>
              <Text size="xs" c="dimmed">Total Gain</Text>
              <Text size="lg" fw={600}>+{Math.round(elevationStats?.gain || 0)}m</Text>
            </Stack>
            <Stack gap={4}>
              <Text size="xs" c="dimmed">Total Loss</Text>
              <Text size="lg" fw={600}>-{Math.round(elevationStats?.loss || 0)}m</Text>
            </Stack>
            <Stack gap={4}>
              <Text size="xs" c="dimmed">Max Elevation</Text>
              <Text size="lg" fw={600}>{Math.round(elevationStats?.max || 0)}m</Text>
            </Stack>
            <Stack gap={4}>
              <Text size="xs" c="dimmed">Min Elevation</Text>
              <Text size="lg" fw={600}>{Math.round(elevationStats?.min || 0)}m</Text>
            </Stack>
          </Group>
          
          <div style={{ height: 300, background: '#f8f9fa', borderRadius: 8, padding: 20 }}>
            <Center h="100%">
              <Text c="dimmed">Elevation chart visualization here</Text>
            </Center>
          </div>
        </Stack>
      </Modal>
    </div>
  );
});

ProfessionalRouteBuilder.displayName = 'ProfessionalRouteBuilder';

export default ProfessionalRouteBuilder;