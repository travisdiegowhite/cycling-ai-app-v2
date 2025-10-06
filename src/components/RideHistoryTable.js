import React, { useState } from 'react';
import { Card, Table, Text, Badge, Group, ActionIcon, Tooltip, TextInput } from '@mantine/core';
import { Eye, Edit, Trash2, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUnits } from '../utils/units';

/**
 * Ride History Table Component
 * Displays user's ride history with metrics
 */
const RideHistoryTable = ({ rides }) => {
  const navigate = useNavigate();
  const { formatDistance, formatElevation } = useUnits();
  const [searchQuery, setSearchQuery] = useState('');

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

  // Estimate TSS (simple approximation)
  const estimateTSS = (ride) => {
    const distance = ride.distance || 0;
    const elevation = ride.total_elevation_gain || 0;
    const duration = ride.duration || 3600; // Default 1 hour

    const baseTSS = (duration / 3600) * 50;
    const elevationFactor = (elevation / 300) * 10;
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
            {filteredRides.map((ride) => (
              <Table.Tr key={ride.id}>
                <Table.Td>
                  <Text size="xs">{formatDate(ride.created_at)}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500}>{ride.name || 'Untitled Route'}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{formatDistance(ride.distance || 0)}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">+{formatElevation(ride.total_elevation_gain || 0)}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{formatDuration(ride.duration)}</Text>
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
                        onClick={() => navigate(`/routes/${ride.id}`)}
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
            ))}
          </Table.Tbody>
        </Table>
      </div>
    </Card>
  );
};

export default RideHistoryTable;
