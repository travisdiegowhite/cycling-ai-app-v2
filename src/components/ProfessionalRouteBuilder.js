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
import { pointsToGPX, parseGPX } from '../utils/gpx';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { useUnits } from '../utils/units';
import { useRouteManipulation } from '../hooks/useRouteManipulation';

/**
 * Simple SVG Elevation Chart Component
 */
const ElevationChart = ({ data, width = 800, height = 280, useImperial = true, elevationUnit = 'ft', distanceUnit = 'mi' }) => {
  console.log('ElevationChart rendering with data:', data?.length, 'points');
  console.log('Sample elevation data:', data?.slice(0, 3));
  
  if (!data || data.length < 2) {
    console.log('ElevationChart: insufficient data');
    return (
      <div style={{ padding: 20, textAlign: 'center', backgroundColor: '#f0f0f0', width: '100%' }}>
        No elevation data to display (got {data?.length || 0} points)
      </div>
    );
  }

  // Handle responsive width
  const actualWidth = width === "100%" ? 800 : width; // Use 800 as base for calculations when 100%
  const margin = { top: 20, right: 30, bottom: 40, left: 60 };
  const chartWidth = actualWidth - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Convert elevation data from meters to display units
  const elevations = data.map(d => useImperial ? d.elevation * 3.28084 : d.elevation);
  const distances = data.map(d => d.distance || 0);
  
  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  const maxDistance = Math.max(...distances);
  
  // Add padding to elevation range for better visualization
  const elevationRange = maxElevation - minElevation;
  const paddedMin = minElevation - elevationRange * 0.1;
  const paddedMax = maxElevation + elevationRange * 0.1;

  // Create SVG path
  const pathData = data
    .map((point, i) => {
      const x = (point.distance / maxDistance) * chartWidth;
      const y = chartHeight - ((point.elevation - paddedMin) / (paddedMax - paddedMin)) * chartHeight;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // Create area fill path
  const areaPath = pathData + 
    ` L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

  // Generate elevation grid lines
  const elevationTicks = [];
  const tickCount = 5;
  for (let i = 0; i <= tickCount; i++) {
    const elevation = paddedMin + (paddedMax - paddedMin) * (i / tickCount);
    const y = chartHeight - (i / tickCount) * chartHeight;
    elevationTicks.push({ elevation: Math.round(elevation), y });
  }

  // Generate distance grid lines
  const distanceTicks = [];
  const distanceTickCount = 6;
  for (let i = 0; i <= distanceTickCount; i++) {
    const distance = maxDistance * (i / distanceTickCount); // Already in miles/km
    const x = (i / distanceTickCount) * chartWidth;
    distanceTicks.push({ distance: distance.toFixed(1), x });
  }

  return (
    <svg 
      width={width === "100%" ? "100%" : width} 
      height={height} 
      viewBox={width === "100%" ? `0 0 ${actualWidth} ${height}` : undefined}
      style={{ 
        background: '#f8f9fa', 
        borderRadius: '4px',
        width: '100%',
        height: '100%'
      }}
    >
      {/* Background grid */}
      <g transform={`translate(${margin.left}, ${margin.top})`}>
        {/* Horizontal grid lines */}
        {elevationTicks.map((tick, i) => (
          <g key={`h-${i}`}>
            <line
              x1={0}
              y1={tick.y}
              x2={chartWidth}
              y2={tick.y}
              stroke="#e0e0e0"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
            <text
              x={-10}
              y={tick.y + 4}
              textAnchor="end"
              fontSize="10"
              fill="#666"
            >
              {tick.elevation}{elevationUnit}
            </text>
          </g>
        ))}
        
        {/* Vertical grid lines */}
        {distanceTicks.map((tick, i) => (
          <g key={`v-${i}`}>
            <line
              x1={tick.x}
              y1={0}
              x2={tick.x}
              y2={chartHeight}
              stroke="#e0e0e0"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
            <text
              x={tick.x}
              y={chartHeight + 20}
              textAnchor="middle"
              fontSize="10"
              fill="#666"
            >
              {tick.distance}{distanceUnit}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path
          d={areaPath}
          fill="rgba(37, 99, 235, 0.2)"
          stroke="none"
        />

        {/* Elevation line */}
        <path
          d={pathData}
          fill="none"
          stroke="#2563eb"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 20)) === 0).map((point, i) => {
          const x = (point.distance / maxDistance) * chartWidth;
          const y = chartHeight - ((point.elevation - paddedMin) / (paddedMax - paddedMin)) * chartHeight;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3"
              fill="#2563eb"
              stroke="white"
              strokeWidth="1"
            />
          );
        })}
      </g>

      {/* Axis labels */}
      <text
        x={margin.left + chartWidth / 2}
        y={height - 5}
        textAnchor="middle"
        fontSize="12"
        fill="#333"
        fontWeight="600"
      >
        Distance ({distanceUnit})
      </text>
      <text
        x={15}
        y={margin.top + chartHeight / 2}
        textAnchor="middle"
        fontSize="12"
        fill="#333"
        fontWeight="600"
        transform={`rotate(-90 15 ${margin.top + chartHeight / 2})`}
      >
        Elevation ({elevationUnit})
      </text>
    </svg>
  );
};

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
  const { formatDistance, formatElevation, useImperial, setUseImperial, distanceUnit, elevationUnit } = useUnits();
  
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
  const [showElevationChart, setShowElevationChart] = useState(false);
  const [showSavedRoutes, setShowSavedRoutes] = useState(true);
  
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
  
  // === Route Manipulation Functions ===
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
  
  // === Re-fetch elevation when units change ===
  useEffect(() => {
    if (snappedRoute && snappedRoute.coordinates && snappedRoute.coordinates.length > 0) {
      fetchElevation(snappedRoute.coordinates);
    }
  }, [useImperial, fetchElevation, snappedRoute]);
  
  // === Auto-route when waypoints change ===
  useEffect(() => {
    if (waypoints.length >= 2 && autoRoute) {
      const timer = setTimeout(() => {
        snapToRoads();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [waypoints.length, autoRoute, snapToRoads]);
  
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
            <Tabs defaultValue="route" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Tabs.List>
                <Tabs.Tab value="route" leftSection={<Route size={14} />}>Route</Tabs.Tab>
                <Tabs.Tab value="saved" leftSection={<Save size={14} />}>Saved</Tabs.Tab>
                <Tabs.Tab value="settings" leftSection={<Settings size={14} />}>Settings</Tabs.Tab>
              </Tabs.List>
              
              {/* Route Tab */}
              <Tabs.Panel value="route" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <ScrollArea style={{ flex: 1 }} p="md">
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
                            onClick={() => console.log('Elevation profile is now shown inline below!')}
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
                </ScrollArea>
              </Tabs.Panel>
              
              {/* Saved Tab */}
              <Tabs.Panel value="saved" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <ScrollArea style={{ flex: 1 }} p="md">
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Text fw={500}>Saved Routes</Text>
                      <ActionIcon 
                        size="sm" 
                        variant="subtle" 
                        onClick={fetchSavedRoutes} 
                        loading={loadingSavedRoutes}
                      >
                        <RefreshCw size={16} />
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
                </ScrollArea>
              </Tabs.Panel>
              
              {/* Settings Tab */}
              <Tabs.Panel value="settings" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <ScrollArea style={{ flex: 1 }} p="md">
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
                </ScrollArea>
              </Tabs.Panel>
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
        
        {/* Map Overlay Controls - Top Center */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 5,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Paper
            shadow="sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px',
              backgroundColor: 'white',
              borderRadius: '8px',
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
            
            <Tooltip label="Clear all">
              <ActionIcon onClick={clearRoute} disabled={waypoints.length === 0} variant="default">
                <Trash2 size={18} />
              </ActionIcon>
            </Tooltip>
            
            <Tooltip label="Snap to roads">
              <ActionIcon 
                onClick={snapToRoads} 
                disabled={waypoints.length < 2 || snapping} 
                variant="default"
                loading={snapping}
              >
                <Route size={18} />
              </ActionIcon>
            </Tooltip>
            
            <Divider orientation="vertical" />
            
            <Tooltip label="Save route">
              <ActionIcon 
                onClick={saveRoute} 
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
            
            <Tooltip label="Import GPX">
              <ActionIcon 
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
                variant="default"
              >
                <Upload size={18} />
              </ActionIcon>
            </Tooltip>
            
            <Divider orientation="vertical" />
            
            <Tooltip label={`Switch to ${useImperial ? 'metric' : 'imperial'} units`}>
              <ActionIcon 
                onClick={() => setUseImperial(!useImperial)}
                variant={useImperial ? "filled" : "light"}
                color={useImperial ? "blue" : "gray"}
              >
                <div style={{ fontSize: '10px', fontWeight: 'bold' }}>
                  {useImperial ? 'FT' : 'M'}
                </div>
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
        </div>

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

        {/* Quick Stats with Elevation Chart */}
        {waypoints.length > 0 && (
          <Card
            withBorder
            style={{
              position: 'absolute',
              bottom: 20,
              left: sidebarCollapsed ? 20 : 420,
              right: 20,
              zIndex: 5,
              maxWidth: sidebarCollapsed ? 'calc(100vw - 40px)' : 'calc(100vw - 460px)',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.8)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
          >
            <Stack gap="md">
              {/* Stats Row */}
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
                    <>
                      <div>
                        <Text size="xs" c="dimmed">Elevation Gain</Text>
                        <Text size="lg" fw={600}>+{formatElevation(elevationStats.gain)}</Text>
                      </div>
                      <div>
                        <Text size="xs" c="dimmed">Max Elevation</Text>
                        <Text size="sm" fw={500}>{formatElevation(elevationStats.max)}</Text>
                      </div>
                    </>
                  )}
                </Group>
                
                {/* Chart Toggle Button */}
                {showElevation && elevationProfile.length > 0 && (
                  <ActionIcon
                    variant={showElevationChart ? "filled" : "light"}
                    size="sm"
                    onClick={() => setShowElevationChart(!showElevationChart)}
                    title={showElevationChart ? "Hide elevation chart" : "Show elevation chart"}
                  >
                    <BarChart3 size={16} />
                  </ActionIcon>
                )}
              </Group>
              
              {/* Elevation Chart */}
              {showElevation && elevationProfile.length > 0 && showElevationChart && (
                <div style={{ 
                  borderTop: '1px solid rgba(0, 0, 0, 0.1)', 
                  paddingTop: '12px',
                  backgroundColor: 'rgba(248, 249, 250, 0.7)',
                  borderRadius: '4px',
                  margin: '-8px',
                  padding: '12px'
                }}>
                  <Text size="xs" c="dimmed" mb="xs">Elevation Profile</Text>
                  <div style={{ 
                    height: 120, 
                    width: '100%',
                    overflow: 'hidden',
                    display: 'flex',
                    justifyContent: 'stretch'
                  }}>
                    <ElevationChart 
                      data={elevationProfile} 
                      width="100%" 
                      height={100}
                      useImperial={useImperial}
                      elevationUnit={elevationUnit}
                      distanceUnit={distanceUnit}
                    />
                  </div>
                </div>
              )}
              
              {showElevation && elevationProfile.length === 0 && (
                <div style={{ borderTop: '1px solid #eee', paddingTop: '12px', textAlign: 'center' }}>
                  <Text size="xs" c="dimmed">No elevation data yet - snap route to roads to get elevation</Text>
                </div>
              )}
            </Stack>
          </Card>
        )}
      </div>

    </div>
  );
});


ProfessionalRouteBuilder.displayName = 'ProfessionalRouteBuilder';

export default ProfessionalRouteBuilder;