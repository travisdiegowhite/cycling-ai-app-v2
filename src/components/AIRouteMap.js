import React, { useState, useRef, useEffect, useTransition } from 'react';
import { Map, Source, Layer, Marker, NavigationControl } from 'react-map-gl';
import { useMediaQuery } from '@mantine/hooks';
import { buildLineString } from '../utils/geo';
import AIRouteGenerator from './AIRouteGenerator';
import RouteProfile from './RouteProfile';
import AIRouteActions from './AIRouteActions';
import 'mapbox-gl/dist/mapbox-gl.css';

const AIRouteMap = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isPending, startTransition] = useTransition();
  const [viewState, setViewState] = useState({
    longitude: -0.09,
    latitude: 51.505,
    zoom: 13,
    pitch: 0,
    bearing: 0,
  });
  
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [startLocation, setStartLocation] = useState(null);
  const mapRef = useRef(null);
  const isProgrammaticMove = useRef(false);


  const handleRouteGenerated = (route) => {
    console.log('Route generated with coordinates:', route.coordinates?.length || 0, 'points');
    // Use startTransition to mark this as a non-urgent update
    // This prevents React error #185 when rapidly switching between routes
    startTransition(() => {
      setSelectedRoute(route);
    });
  };

  const handleStartLocationSet = (location) => {
    setStartLocation(location);
  };

  // Fit map to route bounds when selectedRoute changes
  useEffect(() => {
    if (selectedRoute?.coordinates && selectedRoute.coordinates.length > 0 && mapRef.current) {
      console.log('Fitting map to route bounds');
      const bounds = calculateBounds(selectedRoute.coordinates);

      // CRITICAL: Defer fitBounds to AFTER render completes
      // This prevents React error #185 by ensuring fitBounds (which triggers onMove)
      // doesn't run during the render phase
      requestAnimationFrame(() => {
        if (mapRef.current) {
          // Flag that this is a programmatic move, not user interaction
          isProgrammaticMove.current = true;
          mapRef.current.fitBounds(bounds, {
            padding: { top: 50, bottom: 50, left: 50, right: 350 },
            duration: 1000
          });

          // Reset flag after animation completes
          setTimeout(() => {
            isProgrammaticMove.current = false;
          }, 1100);
        }
      });
    }
  }, [selectedRoute]);

  // Calculate bounds for a set of coordinates
  const calculateBounds = (coordinates) => {
    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;

    coordinates.forEach(([lng, lat]) => {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });

    return [[minLng, minLat], [maxLng, maxLat]];
  };

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      gap: '1rem',
      flexDirection: isMobile ? 'column' : 'row'
    }}>
      {/* AI Route Generator Panel */}
      <div style={{
        width: isMobile ? '100%' : '400px',
        maxHeight: isMobile ? '40vh' : '100vh',
        overflowY: 'auto'
      }}>
        <AIRouteGenerator
          mapRef={mapRef}
          onRouteGenerated={handleRouteGenerated}
          onStartLocationSet={handleStartLocationSet}
          externalStartLocation={startLocation}
        />

        {/* Route Actions - Save and Export */}
        <AIRouteActions
          route={selectedRoute}
          onSaved={(savedRoute) => {
            console.log('Route saved:', savedRoute);
            // Could optionally refresh route list or show success message
          }}
        />
      </div>

      {/* Map and Route Profile Container */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1rem', 
        overflowY: 'auto',
        minHeight: isMobile ? '60vh' : 'auto'
      }}>
        {/* Map */}
        <div style={{ 
          flex: 1, 
          minHeight: isMobile ? '50vh' : '60vh', 
          position: 'relative' 
        }}>
          <Map
            ref={mapRef}
            {...viewState}
            onMove={evt => {
              // Only update viewState for user-initiated moves, not programmatic fitBounds
              if (!isProgrammaticMove.current) {
                setViewState(evt.viewState);
              }
            }}
            mapboxAccessToken={process.env.REACT_APP_MAPBOX_TOKEN}
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/outdoors-v12"
            interactiveLayerIds={[]}
          >
          <NavigationControl position="top-right" />
          
          {/* Display generated route */}
          {selectedRoute && selectedRoute.coordinates && selectedRoute.coordinates.length > 0 && (
            <Source 
              id="ai-generated-route" 
              type="geojson" 
              data={buildLineString(selectedRoute.coordinates)}
            >
              <Layer
                id="ai-route-line"
                type="line"
                paint={{
                  'line-color': '#228be6',
                  'line-width': 4,
                  'line-opacity': 0.8
                }}
              />
            </Source>
          )}
          
          {/* Display start location marker - draggable */}
          {startLocation && (
            <Marker
              longitude={startLocation[0]}
              latitude={startLocation[1]}
              anchor="center"
              draggable={true}
              onDragEnd={(e) => {
                const newLocation = [e.lngLat.lng, e.lngLat.lat];
                handleStartLocationSet(newLocation);
              }}
            >
              <div style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: '#228be6',
                border: '3px solid white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                cursor: 'grab'
              }} />
            </Marker>
          )}
          
          {/* Display route start/end markers if route exists */}
          {selectedRoute && selectedRoute.coordinates && selectedRoute.coordinates.length > 0 && (
            <>
              {/* Start marker */}
              <Marker
                longitude={selectedRoute.coordinates[0][0]}
                latitude={selectedRoute.coordinates[0][1]}
                anchor="center"
              >
                <div style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  backgroundColor: '#40c057',
                  border: '2px solid white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }} />
              </Marker>
              
              {/* End marker (if different from start) */}
              {selectedRoute.coordinates.length > 1 && (
                <Marker
                  longitude={selectedRoute.coordinates[selectedRoute.coordinates.length - 1][0]}
                  latitude={selectedRoute.coordinates[selectedRoute.coordinates.length - 1][1]}
                  anchor="center"
                >
                  <div style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    backgroundColor: '#fa5252',
                    border: '2px solid white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                  }} />
                </Marker>
              )}
            </>
          )}
          </Map>
        </div>

        {/* Route Profile */}
        {selectedRoute && (
          <RouteProfile 
            route={selectedRoute}
            selectedRouteIndex={0}
            routes={selectedRoute ? [selectedRoute] : []}
          />
        )}
      </div>
    </div>
  );
};

export default AIRouteMap;