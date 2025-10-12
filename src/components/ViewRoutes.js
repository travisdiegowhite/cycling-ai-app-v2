import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Card,
  Text,
  Badge,
  Group,
  Stack,
  Title,
  TextInput,
  Select,
  Button,
  ActionIcon,
  Tooltip,
  SegmentedControl,
  SimpleGrid,
  Paper,
  Loader,
  Center,
  Avatar,
  Menu,
  Modal,
  Box,
  Progress,
  Divider,
} from '@mantine/core';
import {
  Search,
  Filter,
  MapPin,
  TrendingUp,
  Clock,
  Mountain,
  Activity,
  Eye,
  Edit,
  Trash2,
  Share2,
  Download,
  MoreVertical,
  Route as RouteIcon,
  Bike,
  SortDesc,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import { useUnits } from '../utils/units';
import { notifications } from '@mantine/notifications';

/**
 * ViewRoutes Component
 * Comprehensive view for browsing and managing saved routes and completed rides
 */
const ViewRoutes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { formatDistance, formatElevation, formatSpeed } = useUnits();

  // State
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState([]);
  const [filteredRoutes, setFilteredRoutes] = useState([]);
  const [viewMode, setViewMode] = useState('all'); // all, planned, completed
  const [viewType, setViewType] = useState('grid'); // grid, list
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [filterType, setFilterType] = useState('all');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState(null);

  const loadRoutes = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRoutes(data || []);
    } catch (error) {
      console.error('Error loading routes:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load routes',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const applyFilters = useCallback(() => {
    let filtered = [...routes];

    // View mode filter (planned routes vs completed rides)
    if (viewMode === 'planned') {
      // Planned routes are those without recorded_at or with imported_from = 'manual'
      filtered = filtered.filter(r => !r.recorded_at || r.imported_from === 'manual');
    } else if (viewMode === 'completed') {
      // Completed rides have a recorded_at date
      filtered = filtered.filter(r => r.recorded_at);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.name?.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(r => r.route_type === filterType);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.recorded_at || b.created_at) - new Date(a.recorded_at || a.created_at);
        case 'date-asc':
          return new Date(a.recorded_at || a.created_at) - new Date(b.recorded_at || b.created_at);
        case 'distance-desc':
          return (b.distance_km || 0) - (a.distance_km || 0);
        case 'distance-asc':
          return (a.distance_km || 0) - (b.distance_km || 0);
        case 'elevation-desc':
          return (b.elevation_gain_m || 0) - (a.elevation_gain_m || 0);
        case 'elevation-asc':
          return (a.elevation_gain_m || 0) - (b.elevation_gain_m || 0);
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '');
        default:
          return 0;
      }
    });

    setFilteredRoutes(filtered);
  }, [routes, viewMode, searchQuery, sortBy, filterType]);

  // Load routes on mount
  useEffect(() => {
    if (user?.id) {
      loadRoutes();
    }
  }, [user?.id, loadRoutes]);

  // Apply filters when data or filters change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleDeleteRoute = async () => {
    if (!routeToDelete) return;

    try {
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', routeToDelete.id);

      if (error) throw error;

      notifications.show({
        title: 'Success',
        message: 'Route deleted successfully',
        color: 'green',
      });

      setRoutes(routes.filter(r => r.id !== routeToDelete.id));
      setDeleteModalOpen(false);
      setRouteToDelete(null);
    } catch (error) {
      console.error('Error deleting route:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete route',
        color: 'red',
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const estimateTSS = (route) => {
    const elevation = route.elevation_gain_m || 0;
    const duration = route.duration_seconds || 3600;

    const baseTSS = (duration / 3600) * 50;
    const elevationFactor = (elevation / 300) * 10;
    return Math.round(baseTSS + elevationFactor);
  };

  const getRouteTypeColor = (type) => {
    switch (type) {
      case 'loop': return 'green';
      case 'out_back': return 'blue';
      case 'point_to_point': return 'violet';
      default: return 'gray';
    }
  };

  const getSourceBadge = (route) => {
    if (route.strava_id) return { label: 'Strava', color: 'orange' };
    if (route.imported_from === 'file_upload') return { label: 'Uploaded', color: 'blue' };
    return { label: 'Manual', color: 'gray' };
  };

  const isPlannedRoute = (route) => {
    return !route.recorded_at || route.imported_from === 'manual';
  };

  const RouteCard = ({ route }) => {
    const sourceBadge = getSourceBadge(route);
    const isPlanned = isPlannedRoute(route);
    const displayDate = route.recorded_at || route.created_at;

    return (
      <Card withBorder shadow="sm" p="md" radius="md" style={{ height: '100%', cursor: 'pointer' }}>
        <Stack gap="sm">
          {/* Header */}
          <Group justify="space-between" wrap="nowrap">
            <Group gap="xs">
              <Avatar color={isPlanned ? 'blue' : 'green'} radius="sm">
                {isPlanned ? <RouteIcon size={20} /> : <Bike size={20} />}
              </Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text fw={600} size="sm" truncate>
                  {route.name || 'Untitled Route'}
                </Text>
                <Text size="xs" c="dimmed">
                  {formatDate(displayDate)}
                </Text>
              </div>
            </Group>
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray">
                  <MoreVertical size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<Eye size={14} />}
                  onClick={() => navigate(`/routes/${route.id}`)}
                >
                  View Details
                </Menu.Item>
                <Menu.Item
                  leftSection={<Edit size={14} />}
                  onClick={() => navigate(`/studio?routeId=${route.id}`)}
                >
                  Edit Route
                </Menu.Item>
                <Menu.Item leftSection={<Share2 size={14} />}>
                  Share
                </Menu.Item>
                <Menu.Item leftSection={<Download size={14} />}>
                  Download GPX
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<Trash2 size={14} />}
                  color="red"
                  onClick={() => {
                    setRouteToDelete(route);
                    setDeleteModalOpen(true);
                  }}
                >
                  Delete
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>

          {/* Badges */}
          <Group gap="xs">
            <Badge size="xs" color={isPlanned ? 'blue' : 'green'} variant="light">
              {isPlanned ? 'Planned Route' : 'Completed Ride'}
            </Badge>
            <Badge size="xs" color={sourceBadge.color} variant="light">
              {sourceBadge.label}
            </Badge>
            {route.route_type && (
              <Badge size="xs" color={getRouteTypeColor(route.route_type)} variant="light">
                {route.route_type.replace('_', ' ')}
              </Badge>
            )}
          </Group>

          {/* Description */}
          {route.description && (
            <Text size="xs" c="dimmed" lineClamp={2}>
              {route.description}
            </Text>
          )}

          <Divider />

          {/* Stats Grid */}
          <SimpleGrid cols={2} spacing="xs">
            <StatItem
              icon={<Activity size={14} />}
              label="Distance"
              value={formatDistance((route.distance_km || 0) * 1000)}
            />
            <StatItem
              icon={<Mountain size={14} />}
              label="Elevation"
              value={`+${formatElevation(route.elevation_gain_m || 0)}`}
            />
            {route.duration_seconds && (
              <StatItem
                icon={<Clock size={14} />}
                label="Duration"
                value={formatDuration(route.duration_seconds)}
              />
            )}
            {route.average_speed && (
              <StatItem
                icon={<TrendingUp size={14} />}
                label="Avg Speed"
                value={formatSpeed(route.average_speed)}
              />
            )}
            {!route.duration_seconds && !route.average_speed && (
              <>
                <StatItem
                  icon={<Activity size={14} />}
                  label="Est. TSS"
                  value={`${estimateTSS(route)}`}
                />
                <StatItem
                  icon={<MapPin size={14} />}
                  label="Points"
                  value={route.track_points_count || '-'}
                />
              </>
            )}
          </SimpleGrid>

          {/* Progress bar for completed rides with power data */}
          {!isPlanned && route.has_power_data && route.training_stress_score && (
            <Box>
              <Group justify="space-between" mb={4}>
                <Text size="xs" c="dimmed">Training Load</Text>
                <Text size="xs" fw={600}>{route.training_stress_score} TSS</Text>
              </Group>
              <Progress
                value={Math.min((route.training_stress_score / 200) * 100, 100)}
                color={route.training_stress_score > 150 ? 'red' : route.training_stress_score > 100 ? 'orange' : 'blue'}
                size="sm"
              />
            </Box>
          )}
        </Stack>
      </Card>
    );
  };

  const StatItem = ({ icon, label, value }) => (
    <Group gap="xs" wrap="nowrap">
      <Box c="dimmed">{icon}</Box>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text size="xs" c="dimmed">{label}</Text>
        <Text size="sm" fw={600} truncate>{value}</Text>
      </div>
    </Group>
  );

  const RouteListItem = ({ route }) => {
    const sourceBadge = getSourceBadge(route);
    const isPlanned = isPlannedRoute(route);
    const displayDate = route.recorded_at || route.created_at;

    return (
      <Card withBorder p="md" radius="md">
        <Group justify="space-between" wrap="wrap" gap="md">
          <Group gap="md" style={{ flex: 1, minWidth: 0 }}>
            <Avatar color={isPlanned ? 'blue' : 'green'} size="lg" radius="md">
              {isPlanned ? <RouteIcon size={24} /> : <Bike size={24} />}
            </Avatar>

            <div style={{ flex: 1, minWidth: 0 }}>
              <Group gap="xs" mb={4}>
                <Text fw={600} size="md" truncate>
                  {route.name || 'Untitled Route'}
                </Text>
                <Badge size="xs" color={isPlanned ? 'blue' : 'green'} variant="light">
                  {isPlanned ? 'Planned' : 'Completed'}
                </Badge>
                <Badge size="xs" color={sourceBadge.color} variant="light">
                  {sourceBadge.label}
                </Badge>
              </Group>
              <Text size="sm" c="dimmed">
                {formatDate(displayDate)}
              </Text>
            </div>
          </Group>

          <Group gap="xl">
            <StatItem
              icon={<Activity size={16} />}
              label="Distance"
              value={formatDistance((route.distance_km || 0) * 1000)}
            />
            <StatItem
              icon={<Mountain size={16} />}
              label="Elevation"
              value={`+${formatElevation(route.elevation_gain_m || 0)}`}
            />
            {route.duration_seconds && (
              <StatItem
                icon={<Clock size={16} />}
                label="Duration"
                value={formatDuration(route.duration_seconds)}
              />
            )}
            {route.average_speed && (
              <StatItem
                icon={<TrendingUp size={16} />}
                label="Avg Speed"
                value={formatSpeed(route.average_speed)}
              />
            )}
          </Group>

          <Group gap="xs">
            <Tooltip label="View details">
              <ActionIcon
                variant="light"
                onClick={() => navigate(`/routes/${route.id}`)}
              >
                <Eye size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Edit route">
              <ActionIcon
                variant="light"
                onClick={() => navigate(`/studio?routeId=${route.id}`)}
              >
                <Edit size={16} />
              </ActionIcon>
            </Tooltip>
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon variant="light">
                  <MoreVertical size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<Share2 size={14} />}>Share</Menu.Item>
                <Menu.Item leftSection={<Download size={14} />}>Download GPX</Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<Trash2 size={14} />}
                  color="red"
                  onClick={() => {
                    setRouteToDelete(route);
                    setDeleteModalOpen(true);
                  }}
                >
                  Delete
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </Card>
    );
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Center h={400}>
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text c="dimmed">Loading routes...</Text>
          </Stack>
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      {/* Header */}
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>My Routes & Rides</Title>
          <Text size="sm" c="dimmed">
            View and manage your planned routes and completed rides
          </Text>
        </div>
        <Button
          leftSection={<RouteIcon size={16} />}
          onClick={() => navigate('/studio')}
        >
          Create New Route
        </Button>
      </Group>

      {/* Stats Overview */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} mb="xl">
        <Paper withBorder p="md" radius="md">
          <Text size="xs" c="dimmed" mb={4}>Total Routes</Text>
          <Text size="xl" fw={700}>{routes.length}</Text>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Text size="xs" c="dimmed" mb={4}>Completed Rides</Text>
          <Text size="xl" fw={700}>
            {routes.filter(r => r.recorded_at).length}
          </Text>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Text size="xs" c="dimmed" mb={4}>Total Distance</Text>
          <Text size="xl" fw={700}>
            {formatDistance(routes.reduce((sum, r) => sum + (r.distance_km || 0) * 1000, 0))}
          </Text>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Text size="xs" c="dimmed" mb={4}>Total Elevation</Text>
          <Text size="xl" fw={700}>
            +{formatElevation(routes.reduce((sum, r) => sum + (r.elevation_gain_m || 0), 0))}
          </Text>
        </Paper>
      </SimpleGrid>

      {/* Filters and Controls */}
      <Card withBorder p="md" mb="lg">
        <Stack gap="md">
          {/* View Mode Toggle */}
          <SegmentedControl
            value={viewMode}
            onChange={setViewMode}
            data={[
              { label: `All (${routes.length})`, value: 'all' },
              { label: `Planned Routes (${routes.filter(r => !r.recorded_at || r.imported_from === 'manual').length})`, value: 'planned' },
              { label: `Completed Rides (${routes.filter(r => r.recorded_at).length})`, value: 'completed' },
            ]}
            fullWidth
          />

          {/* Search and Filters */}
          <Group grow>
            <TextInput
              placeholder="Search routes by name or description..."
              leftSection={<Search size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select
              placeholder="Route type"
              leftSection={<Filter size={16} />}
              data={[
                { label: 'All Types', value: 'all' },
                { label: 'Loop', value: 'loop' },
                { label: 'Out & Back', value: 'out_back' },
                { label: 'Point to Point', value: 'point_to_point' },
              ]}
              value={filterType}
              onChange={setFilterType}
              clearable
            />
            <Select
              placeholder="Sort by"
              leftSection={<SortDesc size={16} />}
              data={[
                { label: 'Date (Newest)', value: 'date-desc' },
                { label: 'Date (Oldest)', value: 'date-asc' },
                { label: 'Distance (High to Low)', value: 'distance-desc' },
                { label: 'Distance (Low to High)', value: 'distance-asc' },
                { label: 'Elevation (High to Low)', value: 'elevation-desc' },
                { label: 'Elevation (Low to High)', value: 'elevation-asc' },
                { label: 'Name (A-Z)', value: 'name-asc' },
                { label: 'Name (Z-A)', value: 'name-desc' },
              ]}
              value={sortBy}
              onChange={setSortBy}
            />
          </Group>

          {/* View Type Toggle */}
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Showing {filteredRoutes.length} {filteredRoutes.length === 1 ? 'route' : 'routes'}
            </Text>
            <SegmentedControl
              value={viewType}
              onChange={setViewType}
              data={[
                { label: 'Grid', value: 'grid' },
                { label: 'List', value: 'list' },
              ]}
              size="xs"
            />
          </Group>
        </Stack>
      </Card>

      {/* Routes Display */}
      {filteredRoutes.length === 0 ? (
        <Paper withBorder p="xl" radius="md">
          <Stack align="center" gap="md">
            <RouteIcon size={48} color="gray" />
            <Text size="lg" fw={500} c="dimmed">
              No routes found
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              {searchQuery || filterType !== 'all'
                ? 'Try adjusting your filters or search query'
                : viewMode === 'planned'
                ? 'Create your first route to get started'
                : 'Complete your first ride to see it here'}
            </Text>
            {viewMode === 'planned' && !searchQuery && filterType === 'all' && (
              <Button
                leftSection={<RouteIcon size={16} />}
                onClick={() => navigate('/studio')}
              >
                Create New Route
              </Button>
            )}
          </Stack>
        </Paper>
      ) : viewType === 'grid' ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {filteredRoutes.map(route => (
            <RouteCard key={route.id} route={route} />
          ))}
        </SimpleGrid>
      ) : (
        <Stack gap="md">
          {filteredRoutes.map(route => (
            <RouteListItem key={route.id} route={route} />
          ))}
        </Stack>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setRouteToDelete(null);
        }}
        title="Delete Route"
        centered
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to delete <strong>{routeToDelete?.name || 'this route'}</strong>?
            This action cannot be undone.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              onClick={() => {
                setDeleteModalOpen(false);
                setRouteToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button color="red" onClick={handleDeleteRoute}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
};

export default ViewRoutes;
