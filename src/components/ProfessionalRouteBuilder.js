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
import { useHotkeys, useMediaQuery } from '@mantine/hooks';
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
import { EnhancedContextCollector } from '../utils/enhancedContext';

/**
 * Interactive SVG Elevation Chart Component with route location highlighting
 */
const ElevationChart = ({ data, width = 800, height = 280, useImperial = true, elevationUnit = 'ft', distanceUnit = 'mi', onHover, onLeave, hoveredPoint }) => {
  
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
  // Note: elevation data should already be in meters from the API
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
      const elevation = useImperial ? point.elevation * 3.28084 : point.elevation; // Convert for display
      const y = chartHeight - ((elevation - paddedMin) / (paddedMax - paddedMin)) * chartHeight;
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

  // Handle mouse interaction
  const handleMouseMove = (event) => {
    if (!onHover) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - margin.left;
    const y = event.clientY - rect.top - margin.top;
    
    if (x >= 0 && x <= chartWidth && y >= 0 && y <= chartHeight) {
      // Find the closest point based on x position
      const distanceAtX = (x / chartWidth) * maxDistance;
      let closestIndex = 0;
      let minDiff = Math.abs(data[0].distance - distanceAtX);
      
      for (let i = 1; i < data.length; i++) {
        const diff = Math.abs(data[i].distance - distanceAtX);
        if (diff < minDiff) {
          minDiff = diff;
          closestIndex = i;
        }
      }
      
      const point = data[closestIndex];
      const elevation = useImperial ? point.elevation * 3.28084 : point.elevation;
      
      onHover({
        index: closestIndex,
        distance: point.distance,
        elevation: elevation,
        coordinate: point.coordinate,
        x: (point.distance / maxDistance) * chartWidth,
        y: chartHeight - ((elevation - paddedMin) / (paddedMax - paddedMin)) * chartHeight
      });
    }
  };

  const handleMouseLeave = () => {
    if (onLeave) onLeave();
  };

  return (
    <svg 
      width={width === "100%" ? "100%" : width} 
      height={height} 
      viewBox={width === "100%" ? `0 0 ${actualWidth} ${height}` : undefined}
      style={{ 
        background: '#f8f9fa', 
        borderRadius: '4px',
        width: '100%',
        height: '100%',
        cursor: onHover ? 'crosshair' : 'default'
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
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
        {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 20)) === 0 || i === data.length - 1).map((point, i) => {
          const x = (point.distance / maxDistance) * chartWidth;
          const elevation = useImperial ? point.elevation * 3.28084 : point.elevation; // Convert for display
          const y = chartHeight - ((elevation - paddedMin) / (paddedMax - paddedMin)) * chartHeight;
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

        {/* Crosshair and highlighted point when hovering */}
        {hoveredPoint && (
          <g>
            {/* Vertical crosshair line */}
            <line
              x1={hoveredPoint.x}
              y1={0}
              x2={hoveredPoint.x}
              y2={chartHeight}
              stroke="#ff4444"
              strokeWidth="2"
              strokeDasharray="4,4"
              opacity="0.8"
            />
            {/* Horizontal crosshair line */}
            <line
              x1={0}
              y1={hoveredPoint.y}
              x2={chartWidth}
              y2={hoveredPoint.y}
              stroke="#ff4444"
              strokeWidth="2"
              strokeDasharray="4,4"
              opacity="0.8"
            />
            {/* Highlighted point */}
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r="6"
              fill="#ff4444"
              stroke="white"
              strokeWidth="2"
            />
          </g>
        )}

        {/* Interactive overlay for mouse events */}
        <rect
          x={0}
          y={0}
          width={chartWidth}
          height={chartHeight}
          fill="transparent"
          style={{ pointerEvents: 'all' }}
        />
      </g>

      {/* Tooltip */}
      {hoveredPoint && (
        <g>
          <rect
            x={hoveredPoint.x + margin.left + 10}
            y={hoveredPoint.y + margin.top - 35}
            width="120"
            height="30"
            fill="rgba(0, 0, 0, 0.8)"
            rx="4"
            ry="4"
          />
          <text
            x={hoveredPoint.x + margin.left + 70}
            y={hoveredPoint.y + margin.top - 20}
            textAnchor="middle"
            fontSize="10"
            fill="white"
            fontWeight="500"
          >
            {hoveredPoint.distance.toFixed(1)}{distanceUnit} · {Math.round(hoveredPoint.elevation)}{elevationUnit}
          </text>
        </g>
      )}

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
  mapRef: propMapRef,
}, ref) => {
  const { user } = useAuth();
  const { formatDistance, formatElevation, useImperial, setUseImperial, distanceUnit, elevationUnit } = useUnits();
  
  // Create local mapRef if not provided via props
  const localMapRef = useRef(null);
  const mapRef = propMapRef || localMapRef;
  
  // === Core State ===
  const [waypoints, setWaypoints] = useState([]);
  const [routeName, setRouteName] = useState('');
  const [routeDescription, setRouteDescription] = useState('');
  const [activeMode, setActiveMode] = useState('draw'); // draw, edit, view
  const [routingProfile, setRoutingProfile] = useState('road'); // road, gravel, mountain, commuting, walking, driving
  const [autoRoute, setAutoRoute] = useState(true); // Auto-snap to roads
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [useSmartRouting, setUseSmartRouting] = useState(false); // NEW: Toggle for smart cycling routing
  const [userPreferences, setUserPreferences] = useState(null); // NEW: User preferences for traffic avoidance
  
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
  const [elevationHoverPoint, setElevationHoverPoint] = useState(null);
  const [showGrid, setShowGrid] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [showCyclingOverlay, setShowCyclingOverlay] = useState(false);
  const [cyclingData, setCyclingData] = useState(null);
  const [fetchTimeout, setFetchTimeout] = useState(null);
  const [loadingCyclingData, setLoadingCyclingData] = useState(false);

  // === Responsive Breakpoints ===
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Mobile-specific state
  const [mobileSheetExpanded, setMobileSheetExpanded] = useState(false);

  // Fetch cycling infrastructure data from OpenStreetMap (optimized)
  const fetchCyclingData = useCallback(async (bounds, zoom) => {
    if (!bounds || zoom < 12) {
      console.log(`Cycling data fetch skipped - zoom level ${zoom} is below minimum of 12`);
      return; // Only fetch at zoom 12+
    }
    
    setLoadingCyclingData(true);
    
    const { north, south, east, west } = bounds;
    
    // Calculate area to limit query size
    const area = (north - south) * (east - west);
    console.log(`Cycling data fetch - zoom: ${zoom}, area: ${area.toFixed(6)}`);
    if (area > 0.01) { // Limit to small areas only
      console.log('Area too large for cycling data fetch - zoom in more');
      setLoadingCyclingData(false);
      return;
    }
    
    // Simplified query focusing on major cycling infrastructure only
    const overpassQuery = `
      [out:json][timeout:10];
      (
        way["highway"="cycleway"](${south},${west},${north},${east});
        way["highway"~"^(primary|secondary|tertiary)$"]["cycleway"~"^(lane|track)$"](${south},${west},${north},${east});
        way["bicycle"="designated"]["highway"!~"^(footway|path|service)$"](${south},${west},${north},${east});
      );
      out geom;
    `;
    
    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: overpassQuery
      });
      
      if (!response.ok) throw new Error('Failed to fetch cycling data');
      
      const data = await response.json();
      
      // Limit number of features to prevent performance issues
      const limitedElements = data.elements.slice(0, 500);
      
      // Convert OSM data to GeoJSON
      const features = limitedElements
        .filter(element => element.type === 'way' && element.geometry && element.geometry.length > 1)
        .map(way => ({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: way.geometry.map(node => [node.lon, node.lat])
          },
          properties: {
            highway: way.tags?.highway,
            cycleway: way.tags?.cycleway,
            bicycle: way.tags?.bicycle,
            surface: way.tags?.surface
          }
        }));
      
      console.log(`Loaded ${features.length} cycling features`);
      
      if (features.length === 0) {
        console.log('No cycling infrastructure found in this area');
      }
      
      setCyclingData({
        type: 'FeatureCollection',
        features
      });
      
    } catch (error) {
      console.error('Error fetching cycling data:', error);
      toast.error(`Failed to load cycling infrastructure data: ${error.message}`);
    } finally {
      setLoadingCyclingData(false);
    }
  }, []);

  // Debounced cycling data fetch to prevent excessive API calls
  const debouncedFetchCyclingData = useCallback((bounds, zoom) => {
    if (fetchTimeout) {
      clearTimeout(fetchTimeout);
    }
    const newTimeout = setTimeout(() => {
      fetchCyclingData(bounds, zoom);
    }, 500); // Wait 500ms after user stops moving
    setFetchTimeout(newTimeout);
  }, [fetchCyclingData, fetchTimeout]);
  const [showElevationChart, setShowElevationChart] = useState(false);
  const [showSavedRoutes, setShowSavedRoutes] = useState(true);
  const [colorRouteByGrade, setColorRouteByGrade] = useState(false);
  
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
  
  // === Load User Preferences for Traffic Avoidance ===
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) return;

      try {
        const prefs = await EnhancedContextCollector.getCompletePreferences(user.id);
        if (prefs) {
          setUserPreferences(prefs);
          console.log('✅ Loaded user preferences for route builder:', prefs);
        }
      } catch (error) {
        console.error('Failed to load user preferences:', error);
      }
    };

    loadPreferences();
  }, [user?.id]);

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
    userPreferences, // NEW: Pass user preferences
    useSmartRouting, // NEW: Pass smart routing toggle
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
  
  // === Smart Routing Labels (memoized to prevent re-renders) ===
  const smartRoutingConfig = useMemo(() => {
    if (routingProfile === 'gravel') {
      return {
        label: 'Prioritize dirt roads & trails',
        description: 'Extremely high preference for unpaved surfaces'
      };
    }
    if (routingProfile === 'mountain') {
      return {
        label: 'Mountain bike trails',
        description: 'Prioritize singletrack and technical terrain'
      };
    }
    if (routingProfile === 'commuting') {
      return {
        label: 'Optimize for commuting',
        description: 'Balance speed with safety for daily commutes'
      };
    }
    return {
      label: 'Prefer bike lanes & quiet roads',
      description: 'Avoid high-traffic roads (uses your route preferences)'
    };
  }, [routingProfile]);

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
        .from('user_routes')
        .select('id, name, distance_km, elevation_gain_m, duration_seconds, snapped, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      setSavedRoutes(data.map(route => ({
        id: route.id,
        name: route.name || `Route ${route.id}`,
        distance: route.distance_km || 0,
        elevation: route.elevation_gain_m || 0,
        duration: route.duration_seconds || 0,
        snapped: route.snapped || false,
      })));
    } catch (err) {
      console.error('Error fetching saved routes:', err);
    } finally {
      setLoadingSavedRoutes(false);
    }
  }, [user?.id]);
  
  // === Load saved route ===
  const loadSavedRoute = useCallback(async (routeId) => {
    try {
      const { data, error } = await supabase
        .from('user_routes')
        .select('*')
        .eq('id', routeId)
        .single();

      if (error) throw error;

      // Load the route data
      setRouteName(data.name);
      setRouteDescription(data.description || '');
      setRoutingProfile(data.routing_profile || 'cycling');
      setAutoRoute(data.auto_routed || false);
      
      // Load waypoints
      if (data.waypoints && Array.isArray(data.waypoints)) {
        setWaypoints(data.waypoints);
      }
      
      // If route was snapped, reconstruct the route
      if (data.snapped && data.track_points && Array.isArray(data.track_points)) {
        const coordinates = data.track_points.map(point => [point.longitude, point.latitude]);
        setSnappedRoute({
          coordinates,
          distance: (data.distance_km || 0) * 1000, // Convert km to meters
          duration: data.duration_seconds || 0,
          confidence: data.confidence || 0,
        });
      }

      toast.success(`Loaded route "${data.name}"`);
    } catch (err) {
      console.error('Failed to load route:', err);
      toast.error('Failed to load route');
    }
  }, [setWaypoints, setSnappedRoute]);
  
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

      const routeData = {
        user_id: user.id,
        name: routeName,
        description: routeDescription,
        track_points,
        waypoints: waypoints,
        routing_profile: routingProfile,
        auto_routed: autoRoute,
        snapped: !!snappedRoute,
        confidence: routeStats.confidence,
        distance_km: distanceKm,
        duration_seconds: Math.round(routeStats.duration || 0),
        elevation_gain_m: elevationStats?.gain || 0,
        elevation_loss_m: elevationStats?.loss || 0,
        elevation_min_m: elevationStats?.min || null,
        elevation_max_m: elevationStats?.max || null,
      };
      
      const { data, error } = await supabase.from('user_routes').insert([routeData]).select();
      
      if (error) throw error;
      
      toast.success(`Route "${routeName}" saved successfully!`);
      
      // Refresh saved routes
      fetchSavedRoutes();
      
      // Clear form
      setRouteName('');
      setRouteDescription('');
      
      // Don't clear the route - keep it visible after saving
      // Don't call parent callback to prevent redirect
      
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save route');
      toast.error(err.message || 'Failed to save route');
    } finally {
      setSaving(false);
    }
  }, [routeName, routeDescription, waypoints, snappedRoute, routeStats, elevationProfile, elevationStats, routingProfile, autoRoute, user.id, fetchSavedRoutes]);
  
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
  
  // === Elevation Chart Interaction ===
  const handleElevationHover = useCallback((point) => {
    setElevationHoverPoint(point);
  }, []);

  const handleElevationLeave = useCallback(() => {
    setElevationHoverPoint(null);
  }, []);

  // === Get User's Current Location ===
  const getUserLocation = useCallback(() => {
    console.log('🌍 Starting geolocation request...');
    console.log('🔒 Current location protocol:', window.location.protocol);
    console.log('🌐 Current hostname:', window.location.hostname);
    setLocationLoading(true);
    
    if (!navigator.geolocation) {
      console.log('❌ Geolocation not supported by browser');
      setLocationLoading(false);
      return;
    }

    // Check for secure context (required for geolocation)
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      console.log('❌ Geolocation requires HTTPS or localhost');
      setLocationLoading(false);
      return;
    }

    console.log('📍 Requesting current position...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log('✅ Got user location:', { latitude, longitude, accuracy });
        setUserLocation({
          longitude,
          latitude,
          zoom: 13,
        });
        setLocationLoading(false);
      },
      (error) => {
        console.log('❌ Geolocation error:', {
          code: error.code,
          message: error.message
        });
        console.log('Error codes: 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT');
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: false, // Don't need high accuracy for initial map view
        timeout: 10000, // 10 second timeout
        maximumAge: 300000 // Use cached location up to 5 minutes old
      }
    );
  }, []);

  // === Get user location on component mount ===
  useEffect(() => {
    getUserLocation();
  }, [getUserLocation]);

  // === Update map view when we get user location ===
  useEffect(() => {
    if (userLocation && mapRef?.current) {
      console.log('🗺️ Flying to user location:', userLocation);
      try {
        mapRef.current.flyTo({
          center: [userLocation.longitude, userLocation.latitude],
          zoom: userLocation.zoom,
          duration: 2000 // 2 second animation
        });
      } catch (error) {
        console.log('❌ Error flying to location:', error);
        // Fallback: try setting the view directly
        try {
          mapRef.current.setCenter([userLocation.longitude, userLocation.latitude]);
          mapRef.current.setZoom(userLocation.zoom);
        } catch (fallbackError) {
          console.log('❌ Fallback also failed:', fallbackError);
        }
      }
    }
  }, [userLocation, mapRef]);

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

  // === Create grade-colored route segments ===
  const gradeColoredRoute = useMemo(() => {
    if (!colorRouteByGrade || !elevationProfile || elevationProfile.length < 2) {
      return null;
    }

    // Smooth elevation data to reduce noise
    const smoothedElevations = [];
    const windowSize = Math.min(5, Math.floor(elevationProfile.length / 10)); // Adaptive window size
    
    for (let i = 0; i < elevationProfile.length; i++) {
      const start = Math.max(0, i - windowSize);
      const end = Math.min(elevationProfile.length - 1, i + windowSize);
      let sum = 0;
      let count = 0;
      
      for (let j = start; j <= end; j++) {
        sum += elevationProfile[j].elevation;
        count++;
      }
      
      smoothedElevations.push({
        ...elevationProfile[i],
        elevation: sum / count,
        originalElevation: elevationProfile[i].elevation
      });
    }

    const segments = [];
    let debugInfo = { extremeGrades: 0, totalSegments: 0, avgDistance: 0 };
    
    for (let i = 0; i < smoothedElevations.length - 1; i++) {
      const current = smoothedElevations[i];
      const next = smoothedElevations[i + 1];
      
      // Calculate grade between consecutive points
      const elevationDiff = next.elevation - current.elevation; // in meters
      const distanceDiff = (next.distance - current.distance) * (useImperial ? 1609.34 : 1000); // convert to meters
      
      debugInfo.totalSegments++;
      debugInfo.avgDistance += distanceDiff;
      
      let grade = 0;
      if (distanceDiff > 5) { // Only calculate grade if distance is meaningful (>5 meters)
        grade = (elevationDiff / distanceDiff) * 100; // percentage
        
        // More aggressive smoothing for very small elevation changes
        if (Math.abs(elevationDiff) < 1.5) { // Less than 1.5m elevation change
          grade = grade * 0.3; // Reduce grade significantly
        }
        
        grade = Math.max(-25, Math.min(25, grade)); // Cap at reasonable values
        
        if (Math.abs(grade) > 15) {
          debugInfo.extremeGrades++;
        }
      }
      
      // Sophisticated color thresholds for dark theme
      let color;
      if (Math.abs(grade) < 3) { // Flat terrain
        color = '#4a7c7e'; // Muted teal for flat (0-3%)
      } else if (Math.abs(grade) < 6) { // Gentle grade
        color = grade > 0 ? '#6b9a6e' : '#5a8fa5'; // Muted green/blue for gentle (3-6%)
      } else if (Math.abs(grade) < 10) { // Moderate grade
        color = grade > 0 ? '#b8915c' : '#7a9cc9'; // Muted gold/periwinkle for moderate (6-10%)
      } else if (Math.abs(grade) < 15) { // Steep grade
        color = grade > 0 ? '#d4824a' : '#9484c7'; // Burnt orange/lavender for steep (10-15%)
      } else { // Very steep
        color = grade > 0 ? '#e85c3f' : '#8a7ca8'; // Deep coral/muted purple for very steep (>15%)
      }
      
      segments.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [current.coordinate, next.coordinate]
        },
        properties: {
          grade: Math.round(grade * 10) / 10,
          color: color,
          direction: grade > 0 ? 'uphill' : grade < 0 ? 'downhill' : 'flat',
          elevationDiff: Math.round(elevationDiff * 10) / 10,
          distanceDiff: Math.round(distanceDiff)
        }
      });
    }
    
    debugInfo.avgDistance = debugInfo.avgDistance / debugInfo.totalSegments;
    if (debugInfo.extremeGrades > 0) {
      console.log('Grade calculation debug:', debugInfo); // Only log if there are issues
    }
    
    return {
      type: 'FeatureCollection',
      features: segments
    };
  }, [colorRouteByGrade, elevationProfile, useImperial]);
  
  // === Update map style when changed ===
  useEffect(() => {
    if (mapRef?.current && !inline) {
      const style = mapStyles.find(s => s.value === mapStyle);
      if (style) {
        mapRef.current.setStyle(style.url);
      }
    }
  }, [mapStyle, mapRef, inline]);

  // === Fetch cycling data when overlay is enabled ===
  useEffect(() => {
    if (showCyclingOverlay && mapRef?.current) {
      const map = mapRef.current.getMap();
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      if (bounds) {
        fetchCyclingData({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest()
        }, zoom);
      }
    } else if (!showCyclingOverlay) {
      setCyclingData(null);
    }
  }, [showCyclingOverlay, fetchCyclingData]);
  
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
        
        {/* Cycling Infrastructure Overlay */}
        {showCyclingOverlay && cyclingData && (
          <Source
            id="cycling-data-inline"
            type="geojson"
            data={cyclingData}
          >
            {/* Black border layer */}
            <Layer
              id="cycling-border-inline"
              type="line"
              paint={{
                'line-color': '#000000',
                'line-width': 3,
                'line-opacity': 0.5,
                'line-dasharray': [3, 2]
              }}
            />
            {/* Colored cycling lanes on top */}
            <Layer
              id="cycling-lanes-inline"
              type="line"
              paint={{
                'line-color': [
                  'case',
                  ['==', ['get', 'highway'], 'cycleway'], '#ff6b35',
                  ['==', ['get', 'bicycle'], 'designated'], '#4a7c7e', 
                  '#6b5b95'
                ],
                'line-width': 2,
                'line-opacity': 0.9,
                'line-dasharray': [3, 2]
              }}
            />
          </Source>
        )}
        
        {/* Route line */}
        {routeLine && !colorRouteByGrade && (
          <Source type="geojson" data={routeLine}>
            <Layer
              id="route-builder-line"
              type="line"
              paint={{
                'line-color': snappedRoute ? '#4a7c7e' : 'rgba(255, 255, 255, 0.5)',
                'line-width': snappedRoute ? 5 : 3,
                'line-opacity': 0.9,
              }}
            />
            {/* Route outline for better visibility */}
            <Layer
              id="route-builder-line-outline"
              type="line"
              paint={{
                'line-color': 'rgba(0, 0, 0, 0.6)',
                'line-width': snappedRoute ? 7 : 5,
                'line-opacity': 0.8,
              }}
            />
          </Source>
        )}

        {/* Grade-colored route segments */}
        {gradeColoredRoute && colorRouteByGrade && (
          <Source type="geojson" data={gradeColoredRoute}>
            {/* Outline for visibility */}
            <Layer
              id="route-grade-outline-inline"
              type="line"
              paint={{
                'line-color': 'rgba(0, 0, 0, 0.6)',
                'line-width': 8,
                'line-opacity': 0.8,
              }}
              beforeId="route-grade-segments-inline"
            />
            {/* Grade-colored segments */}
            <Layer
              id="route-grade-segments-inline"
              type="line"
              paint={{
                'line-color': ['get', 'color'],
                'line-width': 6,
                'line-opacity': 0.9,
              }}
            />
          </Source>
        )}

        {/* Elevation hover marker for inline mode */}
        {elevationHoverPoint && elevationHoverPoint.coordinate && (
          <Marker
            longitude={elevationHoverPoint.coordinate[0]}
            latitude={elevationHoverPoint.coordinate[1]}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: '#ff4444',
                border: '3px solid white',
                boxShadow: '0 2px 8px rgba(255, 68, 68, 0.4)',
                transform: 'translate(-50%, -50%)',
                zIndex: 1000,
              }}
            />
          </Marker>
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
                // Touch-friendly size on mobile (44x44px), smaller on desktop
                width: isMobile ? 44 : 28,
                height: isMobile ? 44 : 28,
                borderRadius: '50%',
                background: waypoint.type === 'start' ? '#4a7c7e' :
                            waypoint.type === 'end' ? '#ff6b35' : '#6b5b95',
                border: selectedWaypoint === waypoint.id ? '3px solid #ff6b35' : '3px solid rgba(255, 255, 255, 0.8)',
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
              onTouchStart={() => setHoveredWaypoint(waypoint.id)}
              onTouchEnd={() => setHoveredWaypoint(null)}
            >
              {waypoint.type === 'start' && <Flag size={isMobile ? 20 : 14} color="white" />}
              {waypoint.type === 'end' && <Target size={isMobile ? 20 : 14} color="white" />}
              {waypoint.type === 'waypoint' && (
                <div style={{ width: isMobile ? 12 : 8, height: isMobile ? 12 : 8, borderRadius: '50%', background: 'white' }} />
              )}
            </div>
          </Marker>
        ))}
      </>
    );
  }
  
  // === Full interface for standalone mode ===
  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.7; }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          }
        `}
      </style>
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
      
      {/* Left Sidebar - Desktop/Tablet Only */}
      {!isMobile && (
        <Transition mounted={!sidebarCollapsed} transition="slide-right" duration={300}>
          {(styles) => (
            <Paper
              shadow="sm"
              style={{
                ...styles,
                width: isTablet ? 320 : 400,
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
                              routingProfile === 'road' ? 'blue' :
                              routingProfile === 'gravel' ? 'brown' :
                              routingProfile === 'mountain' ? 'grape' : 'cyan'
                            }>
                              {routingProfile === 'road' && <Bike size={12} />}
                              {routingProfile === 'gravel' && '🌾'}
                              {routingProfile === 'mountain' && '⛰️'}
                              {routingProfile === 'commuting' && '🚲'}
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
                                  +{formatElevation(routeStats.elevationGain)} / -{formatElevation(routeStats.elevationLoss)}
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
                            onClick={() => loadSavedRoute(route.id)}
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
                            { value: 'road', label: '🚴 Road' },
                            { value: 'gravel', label: '🌾 Gravel' },
                            { value: 'mountain', label: '⛰️ Mountain (Coming Soon)', disabled: true },
                            { value: 'commuting', label: '🚲 Commuting (Coming Soon)', disabled: true },
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

                        <Switch
                          label={smartRoutingConfig.label}
                          description={smartRoutingConfig.description}
                          checked={useSmartRouting}
                          onChange={(e) => setUseSmartRouting(e.currentTarget.checked)}
                          disabled={!['road', 'gravel', 'mountain', 'commuting'].includes(routingProfile)}
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
      )}

      {/* Collapsed Sidebar Toggle - Desktop/Tablet Only */}
      {!isMobile && sidebarCollapsed && (
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
          ref={mapRef}
          mapboxAccessToken={process.env.REACT_APP_MAPBOX_TOKEN}
          initialViewState={userLocation || {
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
          onMoveEnd={(e) => {
            if (showCyclingOverlay) {
              const bounds = e.target.getBounds();
              const zoom = e.target.getZoom();
              debouncedFetchCyclingData({
                north: bounds.getNorth(),
                south: bounds.getSouth(),
                east: bounds.getEast(),
                west: bounds.getWest()
              }, zoom);
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
          
          {/* Cycling Infrastructure Overlay */}
          {showCyclingOverlay && cyclingData && (
            <Source
              id="cycling-data"
              type="geojson"
              data={cyclingData}
            >
              {/* Black border layer */}
              <Layer
                id="cycling-border"
                type="line"
                paint={{
                  'line-color': '#000000',
                  'line-width': 3,
                  'line-opacity': 0.5,
                  'line-dasharray': [3, 2]
                }}
                />
              {/* Colored cycling lanes on top */}
              <Layer
                id="cycling-lanes"
                type="line"
                paint={{
                  'line-color': [
                    'case',
                    ['==', ['get', 'highway'], 'cycleway'], '#ff6b35',
                    ['==', ['get', 'bicycle'], 'designated'], '#4a7c7e', 
                    '#6b5b95'
                  ],
                  'line-width': 2,
                  'line-opacity': 0.9,
                  'line-dasharray': [3, 2]
                }}
                />
            </Source>
          )}
          
          {/* Route line */}
          {routeLine && !colorRouteByGrade && (
            <Source type="geojson" data={routeLine}>
              <Layer
                id="route-builder-line"
                type="line"
                paint={{
                  'line-color': snappedRoute ? '#4a7c7e' : 'rgba(255, 255, 255, 0.5)',
                  'line-width': snappedRoute ? 5 : 3,
                  'line-opacity': 0.9,
                }}
              />
              {/* Route outline for better visibility */}
              <Layer
                id="route-builder-line-outline"
                type="line"
                paint={{
                  'line-color': 'rgba(0, 0, 0, 0.6)',
                  'line-width': snappedRoute ? 7 : 5,
                  'line-opacity': 0.8,
                }}
                />
            </Source>
          )}

          {/* Grade-colored route segments */}
          {gradeColoredRoute && colorRouteByGrade && (
            <Source type="geojson" data={gradeColoredRoute}>
              {/* Outline for visibility */}
              <Layer
                id="route-grade-outline"
                type="line"
                paint={{
                  'line-color': 'rgba(0, 0, 0, 0.6)',
                  'line-width': 8,
                  'line-opacity': 0.8,
                }}
                beforeId="route-grade-segments"
              />
              {/* Grade-colored segments */}
              <Layer
                id="route-grade-segments"
                type="line"
                paint={{
                  'line-color': ['get', 'color'],
                  'line-width': 6,
                  'line-opacity': 0.9,
                }}
              />
            </Source>
          )}

          {/* Elevation hover marker */}
          {elevationHoverPoint && elevationHoverPoint.coordinate && (
            <Marker
              longitude={elevationHoverPoint.coordinate[0]}
              latitude={elevationHoverPoint.coordinate[1]}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#ff4444',
                  border: '3px solid white',
                  boxShadow: '0 2px 8px rgba(255, 68, 68, 0.4)',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 1000,
                  animation: 'pulse 2s infinite'
                }}
              />
            </Marker>
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
                  background: waypoint.type === 'start' ? '#4a7c7e' : 
                              waypoint.type === 'end' ? '#ff6b35' : '#6b5b95',
                  border: selectedWaypoint === waypoint.id ? '3px solid #ff6b35' : '3px solid rgba(255, 255, 255, 0.8)',
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
            top: isMobile ? 10 : 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            maxWidth: isMobile ? '95vw' : 'auto',
          }}
        >
          <Paper
            shadow="sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: isMobile ? 4 : 8,
              padding: isMobile ? '6px' : '8px',
              backgroundColor: 'white',
              borderRadius: '8px',
              flexWrap: isMobile ? 'wrap' : 'nowrap',
            }}
          >
            <Tooltip label="Undo - Undo last action (Ctrl+Z)" position="bottom" zIndex={9999}>
              <ActionIcon onClick={undo} disabled={historyIndex <= 0} variant="default">
                <Undo2 size={18} />
              </ActionIcon>
            </Tooltip>
            
            <Tooltip label="Redo - Redo last undone action (Ctrl+Y)" position="bottom" zIndex={9999}>
              <ActionIcon onClick={redo} disabled={historyIndex >= history.length - 1} variant="default">
                <Redo2 size={18} />
              </ActionIcon>
            </Tooltip>
            
            <Divider orientation="vertical" />
            
            <Tooltip label="Clear Route - Remove all waypoints and clear the current route" position="bottom" zIndex={9999}>
              <ActionIcon onClick={clearRoute} disabled={waypoints.length === 0} variant="default">
                <Trash2 size={18} />
              </ActionIcon>
            </Tooltip>
            
            <Tooltip label="Snap to Roads - Connect waypoints using actual roads and paths for realistic routing" position="bottom" zIndex={9999}>
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
            
            <Tooltip label="Route Grade Coloring - Color the route by elevation steepness (red for climbs, blue for descents)" position="bottom" zIndex={9999}>
              <ActionIcon 
                onClick={() => setColorRouteByGrade(!colorRouteByGrade)}
                variant={colorRouteByGrade ? "filled" : "light"}
                color={colorRouteByGrade ? "green" : "gray"}
                disabled={!elevationProfile || elevationProfile.length < 2}
              >
                <Mountain size={18} />
              </ActionIcon>
            </Tooltip>
            
            <Tooltip label={locationLoading ? "Getting your current location..." : "My Location - Center the map on your current location"} position="bottom" zIndex={9999}>
              <ActionIcon 
                onClick={getUserLocation}
                loading={locationLoading}
                variant={userLocation ? "filled" : "light"}
                color={userLocation ? "blue" : "gray"}
              >
                <MapPin size={18} />
              </ActionIcon>
            </Tooltip>
            
            <Divider orientation="vertical" />
            
            <Tooltip label={`${useImperial ? 'Imperial' : 'Metric'} Units - Switch to ${useImperial ? 'metric (km, m)' : 'imperial (mi, ft)'} measurements`} position="bottom" zIndex={9999}>
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
            
            {/* Display Options - Hide on mobile to simplify */}
            {!isMobile && (
              <>
                <Divider orientation="vertical" />

                <Tooltip label="Grid Overlay" position="bottom" zIndex={9999}>
                  <ActionIcon
                    onClick={() => setShowGrid(!showGrid)}
                    variant={showGrid ? "filled" : "light"}
                    color={showGrid ? "blue" : "gray"}
                    size="md"
                  >
                    <Grid3x3 size={18} />
                  </ActionIcon>
                </Tooltip>

                <Tooltip label="Cycling Infrastructure - Highlight dedicated bike lanes, paths, and cycling routes" position="bottom" zIndex={9999}>
                  <ActionIcon
                    onClick={() => setShowCyclingOverlay(!showCyclingOverlay)}
                    variant={showCyclingOverlay ? "filled" : "light"}
                    color={showCyclingOverlay ? "blue" : "gray"}
                    loading={loadingCyclingData}
                    disabled={loadingCyclingData}
                  >
                    <Bike size={18} />
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
              </>
            )}
            
            {/* Routing Profile Selector - Desktop/Tablet Only (on mobile it's in bottom sheet) */}
            {!isMobile && (
              <Select
                value={routingProfile}
                onChange={(value) => {
                  console.log('Profile changed to:', value);
                  setRoutingProfile(value);
                }}
                data={[
                  { value: 'road', label: '🚴 Road' },
                  { value: 'gravel', label: '🌾 Gravel' },
                  { value: 'mountain', label: '⛰️ Mountain (Coming Soon)', disabled: true },
                  { value: 'commuting', label: '🚲 Commuting (Coming Soon)', disabled: true },
                ]}
                size="sm"
                style={{ width: isTablet ? 150 : 180 }}
                placeholder="Select Profile"
                allowDeselect={false}
                comboboxProps={{ zIndex: 10000 }}
              />
            )}

            <Divider orientation="vertical" />

            <Menu position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="default">
                  <Settings size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Quick Settings</Menu.Label>
                <Menu.Item
                  leftSection={<Target size={14} />}
                  onClick={() => setAutoRoute(!autoRoute)}
                  rightSection={autoRoute && <Check size={14} />}
                >
                  Auto-route
                </Menu.Item>
                <Menu.Item
                  leftSection={<Route size={14} />}
                  onClick={() => setUseSmartRouting(!useSmartRouting)}
                  rightSection={useSmartRouting && <Check size={14} />}
                  disabled={!['road', 'gravel', 'mountain', 'commuting'].includes(routingProfile)}
                >
                  Smart Routing
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Paper>
        </div>

        {/* Mobile Bottom Sheet */}
        {isMobile && (
          <Paper
            shadow="xl"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: mobileSheetExpanded ? '80vh' : '40vh',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
              zIndex: 20,
              display: 'flex',
              flexDirection: 'column',
              transition: 'height 0.3s ease',
            }}
          >
            {/* Drag Handle */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '12px',
                cursor: 'pointer',
                borderBottom: '1px solid #e9ecef',
              }}
              onClick={() => setMobileSheetExpanded(!mobileSheetExpanded)}
            >
              <div
                style={{
                  width: '40px',
                  height: '4px',
                  backgroundColor: '#dee2e6',
                  borderRadius: '2px',
                }}
              />
            </div>

            {/* Mobile Content */}
            <ScrollArea style={{ flex: 1 }} p="md">
              <Stack gap="md">
                {/* Routing Profile - Full Width */}
                <Select
                  value={routingProfile}
                  onChange={(value) => {
                    console.log('Profile changed to:', value);
                    setRoutingProfile(value);
                  }}
                  data={[
                    { value: 'road', label: '🚴 Road' },
                    { value: 'gravel', label: '🌾 Gravel' },
                    { value: 'mountain', label: '⛰️ Mountain (Coming Soon)', disabled: true },
                    { value: 'commuting', label: '🚲 Commuting (Coming Soon)', disabled: true },
                  ]}
                  size="md"
                  label="Routing Profile"
                  allowDeselect={false}
                />

                {/* Quick Actions */}
                <Group grow>
                  <Button
                    variant="light"
                    leftSection={<Undo2 size={16} />}
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    size="md"
                  >
                    Undo
                  </Button>
                  <Button
                    variant="light"
                    leftSection={<Redo2 size={16} />}
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    size="md"
                  >
                    Redo
                  </Button>
                </Group>

                {/* Route Info */}
                {waypoints.length > 0 && (
                  <Card withBorder>
                    <Group justify="space-between" mb="sm">
                      <Text fw={500} size="sm">Route Stats</Text>
                      <Badge size="sm" variant="light" color={
                        routingProfile === 'road' ? 'blue' :
                        routingProfile === 'gravel' ? 'brown' :
                        routingProfile === 'mountain' ? 'grape' : 'cyan'
                      }>
                        {routingProfile === 'road' && <Bike size={12} />}
                        {routingProfile === 'gravel' && '🌾'}
                        {routingProfile === 'mountain' && '⛰️'}
                        {routingProfile === 'commuting' && '🚲'}
                      </Badge>
                    </Group>

                    <Stack gap="xs">
                      <Group justify="apart">
                        <Text size="sm" c="dimmed">Distance</Text>
                        <Text size="sm" fw={500}>{formatDistance(routeStats.distance)}</Text>
                      </Group>
                      <Group justify="apart">
                        <Text size="sm" c="dimmed">Elevation Gain</Text>
                        <Text size="sm" fw={500}>{formatElevation(routeStats.elevationGain)}</Text>
                      </Group>
                      <Group justify="apart">
                        <Text size="sm" c="dimmed">Duration</Text>
                        <Text size="sm" fw={500}>
                          {Math.floor(routeStats.duration / 3600)}h {Math.floor((routeStats.duration % 3600) / 60)}m
                        </Text>
                      </Group>
                    </Stack>
                  </Card>
                )}

                {/* Save Button */}
                {waypoints.length > 0 && (
                  <>
                    <TextInput
                      label="Route Name"
                      placeholder="Enter route name..."
                      value={routeName}
                      onChange={(e) => setRouteName(e.target.value)}
                      size="md"
                    />
                    <Button
                      fullWidth
                      size="lg"
                      leftSection={<Save size={18} />}
                      onClick={saveRoute}
                      loading={saving}
                      disabled={!routeName.trim() || waypoints.length < 2}
                    >
                      Save Route
                    </Button>
                  </>
                )}

                {/* Settings */}
                <Card withBorder>
                  <Text fw={500} size="sm" mb="sm">Settings</Text>
                  <Stack gap="md">
                    <Switch
                      label="Auto-route"
                      description="Automatically snap to roads"
                      checked={autoRoute}
                      onChange={(e) => setAutoRoute(e.currentTarget.checked)}
                      size="md"
                    />
                    <Switch
                      label={smartRoutingConfig.label}
                      description={smartRoutingConfig.description}
                      checked={useSmartRouting}
                      onChange={(e) => setUseSmartRouting(e.currentTarget.checked)}
                      disabled={!['road', 'gravel', 'mountain', 'commuting'].includes(routingProfile)}
                      size="md"
                    />
                  </Stack>
                </Card>
              </Stack>
            </ScrollArea>
          </Paper>
        )}

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

        {/* Floating Legends */}
        <div style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 5 }}>
          {/* Cycling Infrastructure Legend */}
          {showCyclingOverlay && (
            <Paper shadow="md" p="sm" style={{ marginBottom: '8px', maxWidth: '200px' }}>
              <Text size="xs" fw={600} mb="xs">Cycling Infrastructure</Text>
              <Stack gap={4}>
                <Group gap="xs" align="center">
                  <div style={{ 
                    width: '20px', 
                    height: '3px', 
                    backgroundColor: '#ff6b35',
                    borderRadius: '2px',
                    background: `repeating-linear-gradient(to right, #ff6b35 0px, #ff6b35 6px, transparent 6px, transparent 10px)`
                  }} />
                  <Text size="xs" c="dimmed">Dedicated Cycleways</Text>
                </Group>
                <Group gap="xs" align="center">
                  <div style={{ 
                    width: '20px', 
                    height: '3px', 
                    backgroundColor: '#4a7c7e',
                    borderRadius: '2px',
                    background: `repeating-linear-gradient(to right, #4a7c7e 0px, #4a7c7e 6px, transparent 6px, transparent 10px)`
                  }} />
                  <Text size="xs" c="dimmed">Bicycle Designated</Text>
                </Group>
                <Group gap="xs" align="center">
                  <div style={{ 
                    width: '20px', 
                    height: '3px', 
                    backgroundColor: '#6b5b95',
                    borderRadius: '2px',
                    background: `repeating-linear-gradient(to right, #6b5b95 0px, #6b5b95 6px, transparent 6px, transparent 10px)`
                  }} />
                  <Text size="xs" c="dimmed">Other Cycle Routes</Text>
                </Group>
              </Stack>
            </Paper>
          )}

          {/* Grade Color Legend */}
          {colorRouteByGrade && elevationProfile && elevationProfile.length > 1 && (
            <Paper shadow="md" p="sm" style={{ maxWidth: '200px' }}>
              <Text size="xs" fw={600} mb="xs">Elevation Grade</Text>
              <Stack gap={2}>
                <Group gap="xs" align="center">
                  <div style={{ 
                    width: '20px', 
                    height: '3px', 
                    backgroundColor: '#4a7c7e',
                    borderRadius: '2px'
                  }} />
                  <Text size="xs" c="dimmed">Flat (0-3%)</Text>
                </Group>
                <Group gap="xs" align="center">
                  <div style={{ 
                    width: '20px', 
                    height: '3px', 
                    backgroundColor: '#6b9a6e',
                    borderRadius: '2px'
                  }} />
                  <Text size="xs" c="dimmed">Gentle (3-6%)</Text>
                </Group>
                <Group gap="xs" align="center">
                  <div style={{ 
                    width: '20px', 
                    height: '3px', 
                    backgroundColor: '#b8915c',
                    borderRadius: '2px'
                  }} />
                  <Text size="xs" c="dimmed">Moderate (6-10%)</Text>
                </Group>
                <Group gap="xs" align="center">
                  <div style={{ 
                    width: '20px', 
                    height: '3px', 
                    backgroundColor: '#d4824a',
                    borderRadius: '2px'
                  }} />
                  <Text size="xs" c="dimmed">Steep (10-15%)</Text>
                </Group>
                <Group gap="xs" align="center">
                  <div style={{ 
                    width: '20px', 
                    height: '3px', 
                    backgroundColor: '#e85c3f',
                    borderRadius: '2px'
                  }} />
                  <Text size="xs" c="dimmed">Very Steep (&gt;15%)</Text>
                </Group>
                <Text size="xs" c="dimmed" mt="xs" style={{ fontStyle: 'italic' }}>
                  Red = uphill, Blue = downhill
                </Text>
              </Stack>
            </Paper>
          )}
        </div>

        {/* Instructions */}
        {waypoints.length === 0 && (
          <Center style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1,
            pointerEvents: 'none', // Allow clicking through the card
          }}>
            <Card
              withBorder
              p="xl"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.3)', // Much more transparent
                backdropFilter: 'blur(20px)', // Stronger blur
                border: '1px solid rgba(255, 255, 255, 0.5)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              }}
            >
              <Stack align="center">
                <ThemeIcon size={60} variant="light" radius="xl" style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)' }}>
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
                {elevationProfile.length > 0 && (
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
              {elevationProfile.length > 0 && showElevationChart && (
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
                      onHover={handleElevationHover}
                      onLeave={handleElevationLeave}
                      hoveredPoint={elevationHoverPoint}
                    />
                  </div>
                </div>
              )}
              
              {elevationProfile.length === 0 && (
                <div style={{ borderTop: '1px solid #eee', paddingTop: '12px', textAlign: 'center' }}>
                  <Text size="xs" c="dimmed">No elevation data yet - snap route to roads to get elevation</Text>
                </div>
              )}
            </Stack>
          </Card>
        )}
      </div>

      </div>
    </>
  );
});


ProfessionalRouteBuilder.displayName = 'ProfessionalRouteBuilder';

export default ProfessionalRouteBuilder;// Cache bust 1760191273
