import React, { useState } from 'react';
import { Card, Table, Text, Badge, Group, ActionIcon, Tooltip, TextInput } from '@mantine/core';
import { Eye, Edit, Trash2, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUnits } from '../utils/units';
import { supabase } from '../supabase';
import RideDetailModal from './RideDetailModal';

/**
 * Ride History Table Component
 * Displays user's ride history with metrics
 */
const RideHistoryTable = ({ rides }) => {
  const navigate = useNavigate();
  const { formatDistance, formatElevation } = useUnits();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRide, setSelectedRide] = useState(null);
  const [modalOpened, setModalOpened] = useState(false);
  const [trackPoints, setTrackPoints] = useState([]);

  // Filter rides based on search
  const filteredRides = rides.filter(ride =>
    ride.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format duration
  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Load ride details and track points with proper handling for large datasets
  const handleViewRide = async (ride) => {
    try {
      // First, fetch the full route details
      const { data: routeData, error: routeError } = await supabase
        .from('routes')
        .select('*')
        .eq('id', ride.id)
        .single();

      if (routeError) {
        console.error('Error loading route details:', routeError);
        setSelectedRide(ride);
        setTrackPoints([]);
        setModalOpened(true);
        return;
      }

      // Then fetch ALL track points in batches (Supabase max is 1000 per request)
      // We use range() to paginate through all points
      let allTrackPoints = [];
      let from = 0;
      const batchSize = 1000; // Supabase limit is 1000 rows per request
      let hasMore = true;

      console.log(`📍 Loading track points for ${ride.name || 'route'}...`);

      while (hasMore) {
        const { data: batch, error: batchError } = await supabase
          .from('track_points')
          .select('latitude, longitude, elevation, time_seconds, distance_m, point_index')
          .eq('route_id', ride.id)
          .order('point_index', { ascending: true })
          .range(from, from + batchSize - 1);

        if (batchError) {
          console.error('Error loading track points batch:', batchError);
          break;
        }

        if (batch && batch.length > 0) {
          allTrackPoints = [...allTrackPoints, ...batch];
          console.log(`  ✓ Loaded batch ${Math.floor(from / batchSize) + 1}: ${batch.length} points (total: ${allTrackPoints.length})`);
          from += batchSize;

          // If we got less than batchSize, we've reached the end
          if (batch.length < batchSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      // Process track points to format expected by RouteMap
      const trackPoints = allTrackPoints.map(point => ({
        lat: point.latitude,
        lng: point.longitude,
        elevation: point.elevation,
      }));

      console.log(`📍 Loaded ${trackPoints.length} track points for ride ${ride.name}`);

      setSelectedRide(routeData);
      setTrackPoints(trackPoints);
      setModalOpened(true);
    } catch (error) {
      console.error('Error loading route:', error);
      setSelectedRide(ride);
      setTrackPoints([]);
      setModalOpened(true);
    }
  };

  // Estimate TSS (simple approximation)
  const estimateTSS = (ride) => {
    // Use correct database field names
    const distanceKm = ride.distance_km || 0;
    const elevationM = ride.elevation_gain_m || 0;
    const durationSeconds = ride.duration_seconds || 3600; // Default 1 hour

    const baseTSS = (durationSeconds / 3600) * 50;
    const elevationFactor = (elevationM / 300) * 10;
    return Math.round(baseTSS + elevationFactor);
  };

  if (!rides || rides.length === 0) {
    return (
      <Card withBorder p="xl">
        <Text c="dimmed" ta="center">No rides recorded yet</Text>
      </Card>
    );
  }

  return (
    <Card withBorder p="md">
      <Group justify="space-between" mb="md">
        <Text size="sm" fw={600}>Ride History ({filteredRides.length})</Text>
        <TextInput
          placeholder="Search rides..."
          leftSection={<Search size={14} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="xs"
          style={{ width: 200 }}
        />
      </Group>

      <div style={{ overflowX: 'auto' }}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Date</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Distance</Table.Th>
              <Table.Th>Elevation</Table.Th>
              <Table.Th>Duration</Table.Th>
              <Table.Th>Est. TSS</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredRides.map((ride) => {
              // Use recorded_at (actual activity date) or fall back to created_at
              const displayDate = ride.recorded_at || ride.created_at;

              return (
              <Table.Tr key={ride.id}>
                <Table.Td>
                  <Text size="xs">{formatDate(displayDate)}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500}>{ride.name || 'Untitled Route'}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{formatDistance(ride.distance_km || 0)}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">+{formatElevation(ride.elevation_gain_m || 0)}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{formatDuration(ride.duration_seconds)}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge color="blue" variant="light" size="sm">
                    {estimateTSS(ride)} TSS
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge
                    color={
                      ride.route_type === 'loop' ? 'green' :
                      ride.route_type === 'point-to-point' ? 'blue' : 'gray'
                    }
                    variant="light"
                    size="sm"
                  >
                    {ride.route_type || 'route'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Tooltip label="View route">
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => handleViewRide(ride)}
                      >
                        <Eye size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Edit route">
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => navigate(`/studio?routeId=${ride.id}`)}
                      >
                        <Edit size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Table.Td>
              </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </div>

      {/* Ride Detail Modal */}
      <RideDetailModal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setSelectedRide(null);
          setTrackPoints([]);
        }}
        route={selectedRide}
        trackPoints={trackPoints}
      />
    </Card>
  );
};

export default RideHistoryTable;
