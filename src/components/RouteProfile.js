import React, { useMemo } from 'react';
import { Paper, Group, Text, Stack, Box, Badge, SimpleGrid } from '@mantine/core';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, Mountain, Timer, MapPin, Activity } from 'lucide-react';
import { useUnits } from '../utils/units';

// Helper functions
function getGradientColor(gradient) {
  if (gradient > 8) return '#28a745'; // Green for steep uphill
  if (gradient > 3) return '#ffc107'; // Yellow for moderate uphill
  if (gradient > -3) return '#17a2b8'; // Blue for flat
  return '#dc3545'; // Red for downhill
}

function getPatternColor(pattern) {
  const colors = {
    'personal_history': 'blue',
    'claude_generated': 'violet',
    'segment_based': 'green',
    'loop': 'teal',
    'out_back': 'orange',
    'point_to_point': 'gray'
  };
  return colors[pattern] || 'gray';
}

function getDifficultyColor(difficulty) {
  const colors = {
    'easy': 'green',
    'moderate': 'yellow',
    'challenging': 'orange',
    'hard': 'red'
  };
  return colors[difficulty] || 'gray';
}

function calculateEstimatedTime(route) {
  if (!route) return 0;
  
  // Base speed calculation similar to what we have in aiRouteGenerator
  let avgSpeed = 20; // km/h
  
  // Adjust for training goal
  const trainingGoal = route.trainingGoal;
  switch (trainingGoal) {
    case 'recovery':
      avgSpeed = 18;
      break;
    case 'endurance':
      avgSpeed = 22;
      break;
    case 'intervals':
      avgSpeed = 20;
      break;
    case 'hills':
      avgSpeed = 15;
      break;
    default:
      avgSpeed = 20;
      break;
  }
  
  // Adjust for elevation
  if (route.elevationGain && route.distance) {
    const elevationRatio = route.elevationGain / (route.distance * 1000); // meters per meter
    if (elevationRatio > 0.025) avgSpeed *= 0.75; // Significant climbing
    else if (elevationRatio > 0.015) avgSpeed *= 0.85; // Moderate climbing
    else if (elevationRatio > 0.010) avgSpeed *= 0.95; // Light climbing
  }
  
  // Adjust for difficulty
  if (route.difficulty) {
    switch (route.difficulty) {
      case 'easy':
        avgSpeed *= 1.1;
        break;
      case 'hard':
        avgSpeed *= 0.8;
        break;
      case 'challenging':
        avgSpeed *= 0.9;
        break;
      default:
        // No adjustment for moderate or unknown difficulty
        break;
    }
  }
  
  return Math.round((route.distance / avgSpeed) * 60); // Convert to minutes
}

function formatTime(minutes) {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// Helper component for statistics cards
const StatCard = ({ icon, label, value, color }) => (
  <Paper p="xs" withBorder style={{ textAlign: 'center' }}>
    <Stack spacing={4} align="center">
      <Group align="center" spacing={4}>
        <Box style={{ color: `var(--mantine-color-${color}-6)` }}>{icon}</Box>
      </Group>
      <Text size="lg" fw={600} c={color}>{value}</Text>
      <Text size="xs" c="dimmed">{label}</Text>
    </Stack>
  </Paper>
);

const RouteProfile = ({ route, selectedRouteIndex = 0, routes = [] }) => {
  const { formatDistance, formatElevation } = useUnits();

  // Process elevation profile data for the chart
  const elevationData = useMemo(() => {
    if (!route?.elevationProfile || route.elevationProfile.length === 0) {
      return [];
    }

    return route.elevationProfile.map((point, index) => {
      const distance = (route.distance * index) / (route.elevationProfile.length - 1);
      return {
        distance: distance,
        elevation: point.elevation || point,
        distanceLabel: formatDistance(distance, 1),
        elevationLabel: formatElevation(point.elevation || point)
      };
    });
  }, [route?.elevationProfile, route?.distance, formatDistance, formatElevation]);

  // Calculate gradient segments for coloring
  const gradientData = useMemo(() => {
    if (!elevationData || elevationData.length < 2) return [];
    
    return elevationData.map((point, index) => {
      if (index === 0) return { ...point, gradient: 0 };
      
      const prev = elevationData[index - 1];
      const distanceDiff = point.distance - prev.distance;
      const elevationDiff = point.elevation - prev.elevation;
      const gradient = distanceDiff > 0 ? (elevationDiff / (distanceDiff * 1000)) * 100 : 0; // Convert to percentage
      
      return {
        ...point,
        gradient: Math.round(gradient * 10) / 10,
        gradientColor: getGradientColor(gradient)
      };
    });
  }, [elevationData]);

  // Calculate route statistics
  const stats = useMemo(() => {
    if (!route) return null;

    const elevationGain = route.elevationGain || 0;
    const elevationLoss = route.elevationLoss || 0;
    const distance = route.distance || 0;
    const estimatedTime = calculateEstimatedTime(route);
    const avgGradient = distance > 0 ? (elevationGain / (distance * 1000)) * 100 : 0;
    const maxElevation = elevationData.length > 0 ? Math.max(...elevationData.map(p => p.elevation)) : 0;
    const minElevation = elevationData.length > 0 ? Math.min(...elevationData.map(p => p.elevation)) : 0;

    return {
      distance,
      elevationGain,
      elevationLoss,
      estimatedTime,
      avgGradient,
      maxElevation,
      minElevation,
      difficulty: route.difficulty || 'moderate'
    };
  }, [route, elevationData]);

  if (!route) return null;

  return (
    <Paper p="md" shadow="sm" style={{ marginTop: '1rem' }}>
      <Stack spacing="md">
        {/* Route Header */}
        <Group justify="space-between" align="center">
          <Group align="center" spacing="xs">
            <MapPin size={20} />
            <Text size="lg" fw={600}>{route.name || `Route ${selectedRouteIndex + 1}`}</Text>
            {route.pattern && (
              <Badge color={getPatternColor(route.pattern)} variant="light" size="sm">
                {route.pattern.replace('_', ' ')}
              </Badge>
            )}
            {stats?.difficulty && (
              <Badge color={getDifficultyColor(stats.difficulty)} variant="filled" size="sm">
                {stats.difficulty}
              </Badge>
            )}
          </Group>
          {routes.length > 1 && (
            <Badge color="blue" variant="outline">
              {selectedRouteIndex + 1} of {routes.length}
            </Badge>
          )}
        </Group>

        {/* Route Statistics */}
        {stats && (
          <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} spacing="sm">
            <StatCard 
              icon={<MapPin size={18} />}
              label="Distance"
              value={formatDistance(stats.distance)}
              color="blue"
            />
            <StatCard 
              icon={<TrendingUp size={18} />}
              label="Elevation Gain"
              value={formatElevation(stats.elevationGain)}
              color="green"
            />
            <StatCard 
              icon={<TrendingDown size={18} />}
              label="Elevation Loss"
              value={formatElevation(stats.elevationLoss)}
              color="red"
            />
            <StatCard 
              icon={<Timer size={18} />}
              label="Est. Time"
              value={formatTime(stats.estimatedTime)}
              color="orange"
            />
            <StatCard 
              icon={<Activity size={18} />}
              label="Avg Grade"
              value={`${stats.avgGradient.toFixed(1)}%`}
              color="purple"
            />
            <StatCard 
              icon={<Mountain size={18} />}
              label="Max Elevation"
              value={formatElevation(stats.maxElevation)}
              color="teal"
            />
          </SimpleGrid>
        )}

        {/* Elevation Profile Chart */}
        {elevationData.length > 0 && (
          <Box>
            <Text size="md" fw={500} mb="xs">Elevation Profile</Text>
            <Box style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={gradientData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="elevationGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#339af0" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#339af0" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                  <XAxis 
                    dataKey="distance" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#868e96', fontSize: 12 }}
                    tickFormatter={(value) => formatDistance(value, 1)}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#868e96', fontSize: 12 }}
                    tickFormatter={(value) => formatElevation(value, 0)}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e9ecef',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value, name) => {
                      if (name === 'elevation') {
                        return [formatElevation(value), 'Elevation'];
                      }
                      return [value, name];
                    }}
                    labelFormatter={(distance) => `Distance: ${formatDistance(distance, 1)}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="elevation" 
                    stroke="#339af0" 
                    strokeWidth={2}
                    fill="url(#elevationGradient)" 
                    dot={false}
                    activeDot={{ r: 4, fill: '#339af0' }}
                  />
                  
                  {/* Add gradient reference lines */}
                  {stats && (
                    <>
                      <ReferenceLine 
                        y={stats.maxElevation} 
                        stroke="#28a745" 
                        strokeDasharray="5 5" 
                        strokeWidth={1}
                      />
                      <ReferenceLine 
                        y={stats.minElevation} 
                        stroke="#dc3545" 
                        strokeDasharray="5 5" 
                        strokeWidth={1}
                      />
                    </>
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </Box>
            
            {/* Gradient Legend */}
            <Group justify="center" mt="xs" spacing="lg">
              <Group align="center" spacing={4}>
                <Box w={12} h={12} style={{ backgroundColor: '#28a745', borderRadius: 2 }} />
                <Text size="xs" c="dimmed">Steep Up (8%+)</Text>
              </Group>
              <Group align="center" spacing={4}>
                <Box w={12} h={12} style={{ backgroundColor: '#ffc107', borderRadius: 2 }} />
                <Text size="xs" c="dimmed">Moderate (3-8%)</Text>
              </Group>
              <Group align="center" spacing={4}>
                <Box w={12} h={12} style={{ backgroundColor: '#17a2b8', borderRadius: 2 }} />
                <Text size="xs" c="dimmed">Flat (0-3%)</Text>
              </Group>
              <Group align="center" spacing={4}>
                <Box w={12} h={12} style={{ backgroundColor: '#dc3545', borderRadius: 2 }} />
                <Text size="xs" c="dimmed">Downhill</Text>
              </Group>
            </Group>
          </Box>
        )}

        {/* Route Description */}
        {route.description && (
          <Box>
            <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
              {route.description}
            </Text>
          </Box>
        )}
      </Stack>
    </Paper>
  );
};

export default RouteProfile;