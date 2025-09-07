import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Map, Source, Layer, Marker, Popup, NavigationControl } from 'react-map-gl';
import {
  Paper,
  Title,
  Button,
  ScrollArea,
  Card,
  Text,
  Group,
  Badge,
  Stack,
  Loader,
  Center,
  ActionIcon,
  Tabs,
} from '@mantine/core';
import { Route, Plus, MapPin, Square } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUnits } from '../utils/units';
import { supabase } from '../supabase';
import 'mapbox-gl/dist/mapbox-gl.css';
import './Map.css';
import ProfessionalRouteBuilder from './ProfessionalRouteBuilder';
import RouteProfile from './RouteProfile';
import ElevationProfileBar from './ElevationProfileBar';

const MapComponent = () => {
  const { user } = useAuth();
  const { formatDistance, formatElevation } = useUnits();
  const [routes, setRoutes] = useState([]);
  const [userRoutes, setUserRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRoutesLoading, setUserRoutesLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('user-routes');
  const [viewState, setViewState] = useState({
    longitude: -104.9903,  // Denver, Colorado
    latitude: 39.7392,     // Denver, Colorado
    zoom: 13,
    pitch: 0,
    bearing: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 }
  });
  const [popupInfo, setPopupInfo] = useState(null);
  const [builderActive, setBuilderActive] = useState(false);
  const mapRef = useRef(null);
  const [refreshFlag, setRefreshFlag] = useState(0); // used to refetch after save
  const [selectedRouteData, setSelectedRouteData] = useState(null); // Full route data for profile
  // Removed routeBuilderMapElements and routeBuilderData - no longer needed
  const routeBuilderRef = useRef(null); // Reference to route builder for map clicks

  // Center map at user current location if available and no stored routes yet
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    if (routes.length > 0) return; // don't override if user already has routes
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { longitude, latitude } = pos.coords;
        setViewState(s => ({ ...s, longitude, latitude, zoom: 13 }));
        if (mapRef.current) {
          mapRef.current.flyTo({ center: [longitude, latitude], zoom: 13, essential: true });
        }
      },
      err => console.warn('Geolocation denied or failed', err),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [routes]);

  // Fetch past rides from Supabase
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const { data, error } = await supabase
          .from('routes')
          .select(`
            *,
            track_points(
              latitude,
              longitude,
              elevation,
              time_seconds,
              distance_m,
              point_index
            )
          `)
          .eq('user_id', user.id)
          .order('recorded_at', { ascending: false, nullsLast: true })
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        
        // Process the data to match expected format
        const processedRoutes = data?.map(route => ({
          ...route,
          // Convert separate track_points table data to expected format
          track_points: route.track_points?.sort((a, b) => a.point_index - b.point_index).map(point => ({
            longitude: point.longitude,
            latitude: point.latitude,
            elevation: point.elevation,
            time: point.time_seconds,
            distance: point.distance_m
          })) || []
        })) || [];
        
        setRoutes(processedRoutes);

        // If routes exist, center map on the first route
        if (processedRoutes.length > 0 && processedRoutes[0].track_points?.length > 0) {
          const firstPoint = processedRoutes[0].track_points[0];
          setViewState(state => ({
            ...state,
            longitude: firstPoint.longitude,
            latitude: firstPoint.latitude,
            zoom: 13
          }));
        }
      } catch (error) {
        console.error('Error fetching routes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchRoutes();
    }
  }, [user, refreshFlag]);

  // Fetch user-created routes from user_routes table
  useEffect(() => {
    const fetchUserRoutes = async () => {
      try {
        const { data, error } = await supabase
          .from('user_routes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        setUserRoutes(data || []);
      } catch (error) {
        console.error('Error fetching user routes:', error);
      } finally {
        setUserRoutesLoading(false);
      }
    };

    if (user) {
      fetchUserRoutes();
    }
  }, [user, refreshFlag]);

  // Get route color based on index
  const getRouteColor = (index) => {
    const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff'];
    return colors[index % colors.length];
  };

  // Handle map clicks for route builder
  const handleMapClick = useCallback((e) => {
    if (builderActive && routeBuilderRef.current && routeBuilderRef.current.addPoint) {
      routeBuilderRef.current.addPoint(e.lngLat);
    }
  }, [builderActive]);

  return (
    <div className="map-container">
      {/* Full Route Builder Overlay */}
      {builderActive && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}>
          <ProfessionalRouteBuilder
            ref={routeBuilderRef}
            active={builderActive}
            onExit={() => setBuilderActive(false)}
            onSaved={(newRoute) => {
              setBuilderActive(false);
              setRefreshFlag(f => f + 1);
              if (newRoute?.id) setSelectedRoute(newRoute.id);
            }}
            inline={false}
          />
        </div>
      )}
      <Paper className="routes-sidebar" shadow="sm" p="md">
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Title order={3} size="h4">
              <Group gap="xs">
                <Route size={20} />
                Your Routes
              </Group>
            </Title>
          </Group>

          <Button
            variant={builderActive ? 'filled' : 'light'}
            leftSection={builderActive ? <Square size={16} /> : <Plus size={16} />}
            onClick={() => setBuilderActive(a => !a)}
            fullWidth
          >
            {builderActive ? 'Finish Building' : 'Build New Route'}
          </Button>

          {/* Route Builder in inline mode */}

          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List grow>
              <Tabs.Tab value="user-routes">
                My Routes ({userRoutes.length})
              </Tabs.Tab>
              <Tabs.Tab value="past-rides">
                Past Rides ({routes.length})
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="user-routes">
              <ScrollArea style={{ height: builderActive ? 'calc(100vh - 650px)' : 'calc(100vh - 350px)' }}>
                {userRoutesLoading ? (
                  <Center py="xl">
                    <Loader size="sm" />
                  </Center>
                ) : userRoutes.length === 0 ? (
                  <Center py="xl">
                    <Text c="dimmed" size="sm" ta="center">
                      No routes created yet. Start by building your first route!
                    </Text>
                  </Center>
                ) : (
                  <Stack gap="xs" mt="sm">
                    {userRoutes.map((route, index) => (
                      <Card
                        key={route.id}
                        padding="sm"
                        shadow="xs"
                        style={{
                          cursor: 'pointer',
                          borderLeft: `4px solid ${getRouteColor(index)}`,
                          backgroundColor: selectedRoute === `user-${route.id}` ? 'var(--mantine-color-blue-0)' : undefined,
                        }}
                        onClick={() => {
                          setSelectedRoute(`user-${route.id}`);
                          // Convert user route format to display format
                          const convertedRoute = {
                            id: `user-${route.id}`,
                            track_points: route.coordinates?.map(coord => ({
                              longitude: coord[0],
                              latitude: coord[1]
                            })) || [],
                            summary: {
                              distance: route.distance_km * 1000,
                              elevation_gain: route.elevation_gain_m,
                              elevation_loss: route.elevation_loss_m,
                              elevation_min: route.elevation_min_m,
                              elevation_max: route.elevation_max_m,
                              snapped: route.snapped
                            },
                            elevation_profile: route.elevation_profile,
                            metadata: { name: route.name }
                          };
                          setSelectedRouteData(convertedRoute);
                          if (route.coordinates?.length > 0) {
                            setViewState({
                              ...viewState,
                              longitude: route.coordinates[0][0],
                              latitude: route.coordinates[0][1],
                              zoom: 13
                            });
                          }
                        }}
                      >
                        <Stack gap="xs">
                          <Group justify="space-between" align="flex-start">
                            <Text fw={500} size="sm">
                              {route.name || `My Route ${index + 1}`}
                            </Text>
                            <ActionIcon size="xs" variant="subtle">
                              <MapPin size={12} />
                            </ActionIcon>
                          </Group>
                          
                          <Group gap="xs">
                            <Badge size="xs" variant="light">
                              {formatDistance(route.distance_km * 1000)}
                            </Badge>
                            {route.elevation_gain_m > 0 && (
                              <Badge size="xs" color="green" variant="light">
                                +{formatElevation(route.elevation_gain_m)}
                              </Badge>
                            )}
                            {route.snapped && (
                              <Badge size="xs" color="blue" variant="light">
                                Snapped
                              </Badge>
                            )}
                          </Group>
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                )}
              </ScrollArea>
            </Tabs.Panel>

            <Tabs.Panel value="past-rides">
              <ScrollArea style={{ height: builderActive ? 'calc(100vh - 650px)' : 'calc(100vh - 350px)' }}>
                {isLoading ? (
                  <Center py="xl">
                    <Loader size="sm" />
                  </Center>
                ) : routes.length === 0 ? (
                  <Center py="xl">
                    <Text c="dimmed" size="sm" ta="center">
                      No past rides found. Import from Strava or upload GPX files!
                    </Text>
                  </Center>
                ) : (
                  <Stack gap="xs" mt="sm">
                    {routes.map((route, index) => (
                      <Card
                        key={route.id}
                        padding="sm"
                        shadow="xs"
                        style={{
                          cursor: 'pointer',
                          borderLeft: `4px solid ${getRouteColor(index)}`,
                          backgroundColor: selectedRoute === route.id ? 'var(--mantine-color-blue-0)' : undefined,
                        }}
                        onClick={() => {
                          setSelectedRoute(route.id);
                          // Convert route data to expected format for RouteProfile
                          const convertedRoute = {
                            ...route,
                            summary: {
                              distance: route.distance_km * 1000, // Convert km to meters
                              elevation_gain: route.elevation_gain_m,
                              elevation_loss: route.elevation_loss_m,
                              snapped: false // Past rides are not snapped routes
                            },
                            metadata: { name: route.name }
                          };
                          setSelectedRouteData(convertedRoute);
                          if (route.track_points?.length > 0) {
                            setViewState({
                              ...viewState,
                              longitude: route.track_points[0].longitude,
                              latitude: route.track_points[0].latitude,
                              zoom: 13
                            });
                          }
                        }}
                      >
                        <Stack gap="xs">
                          <Group justify="space-between" align="flex-start">
                            <Text fw={500} size="sm">
                              {route.metadata?.name || route.activity_name || `Past Ride ${index + 1}`}
                            </Text>
                            <ActionIcon size="xs" variant="subtle">
                              <MapPin size={12} />
                            </ActionIcon>
                          </Group>
                          
                          <Group gap="xs">
                            <Badge size="xs" variant="light">
                              {formatDistance(route.distance_km * 1000 || 0)}
                            </Badge>
                            {route.elevation_gain_m > 0 && (
                              <Badge size="xs" color="green" variant="light">
                                +{formatElevation(route.elevation_gain_m)}
                              </Badge>
                            )}
                            {route.imported_from && route.imported_from !== 'manual' && (
                              <Badge size="xs" color="orange" variant="light">
                                {route.imported_from}
                              </Badge>
                            )}
                          </Group>
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                )}
              </ScrollArea>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Paper>

      <div className="map-view">
        <Map
          ref={mapRef}
          initialViewState={viewState}
          onMove={evt => setViewState(evt.viewState)}
          onClick={handleMapClick}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v11"
          mapboxAccessToken={process.env.REACT_APP_MAPBOX_TOKEN}
          attributionControl={true}
          reuseMaps
          className="map-inner"
        >
        <NavigationControl position="top-right" />
        
        
        {/* Route builder map elements are now handled by the overlay component */}
        
          {/* Render past rides */}
          {routes.map((route, index) => {
            if (!route.track_points?.length) return null;
            
            const geojson = {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: route.track_points.map(point => [point.longitude, point.latitude])
              }
            };

            return (
              <Source key={route.id} type="geojson" data={geojson}>
                <Layer
                  type="line"
                  paint={{
                    'line-color': getRouteColor(index),
                    'line-width': selectedRoute === route.id ? 6 : 3,
                    'line-opacity': selectedRoute === route.id ? 1 : 0.7
                  }}
                />
              </Source>
            );
          })}

          {/* Render user-created routes */}
          {userRoutes.map((route, index) => {
            if (!route.coordinates?.length) return null;
            
            const geojson = {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: route.coordinates
              }
            };

            return (
              <Source key={`user-${route.id}`} type="geojson" data={geojson}>
                <Layer
                  type="line"
                  paint={{
                    'line-color': getRouteColor(index + routes.length),
                    'line-width': selectedRoute === `user-${route.id}` ? 6 : 3,
                    'line-opacity': selectedRoute === `user-${route.id}` ? 1 : 0.7
                  }}
                />
              </Source>
            );
          })}

          {selectedRoute && (() => {
            // Find selected route from either past rides or user routes
            const route = selectedRoute.startsWith('user-') 
              ? userRoutes.find(r => `user-${r.id}` === selectedRoute)
              : routes.find(r => r.id === selectedRoute);
            
            if (!route) return null;
            
            // Get track points based on route type
            const trackPoints = selectedRoute.startsWith('user-') 
              ? route.coordinates?.map(coord => ({ longitude: coord[0], latitude: coord[1] })) || []
              : route.track_points || [];
            
            if (trackPoints.length === 0) return null;
            
            return (
              <>
                {[
                  { point: trackPoints[0], label: 'Start' },
                  { point: trackPoints[trackPoints.length - 1], label: 'End' }
                ].map((marker, i) => (
                  <Marker
                    key={i}
                    longitude={marker.point.longitude}
                    latitude={marker.point.latitude}
                    onClick={e => {
                      e.originalEvent.stopPropagation();
                      setPopupInfo(marker);
                    }}
                  />
                ))}
              </>
            );
          })()}

          {popupInfo && (
            <Popup
              longitude={popupInfo.point.longitude}
              latitude={popupInfo.point.latitude}
              anchor="bottom"
              onClose={() => setPopupInfo(null)}
            >
              {popupInfo.label}
            </Popup>
          )}
        </Map>
      </div>
      
      {selectedRouteData && (
        <RouteProfile 
          route={selectedRouteData}
          elevationProfile={selectedRouteData.elevation_profile}
          elevationStats={{
            gain: selectedRouteData.summary?.elevation_gain,
            loss: selectedRouteData.summary?.elevation_loss,
            min: selectedRouteData.summary?.elevation_min,
            max: selectedRouteData.summary?.elevation_max
          }}
        />
      )}

      {/* Elevation Profile Bar - shows for route builder or selected route */}
      {selectedRouteData && (
        <ElevationProfileBar
          elevationProfile={
   
            selectedRouteData?.elevation_profile || 
            []
          }
          elevationStats={
   
            {
              gain: selectedRouteData?.summary?.elevation_gain,
              loss: selectedRouteData?.summary?.elevation_loss,
              min: selectedRouteData?.summary?.elevation_min,
              max: selectedRouteData?.summary?.elevation_max
            }
          }
          routeStats={
   
            {
              distance: selectedRouteData?.summary?.distance,
              confidence: selectedRouteData?.summary?.confidence,
              duration: selectedRouteData?.summary?.duration
            }
          }
          isRouteBuilder={false}
        />
      )}
    </div>
  );
};

export default MapComponent;
