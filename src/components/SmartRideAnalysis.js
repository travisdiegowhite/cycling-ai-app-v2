import React, { useState, useEffect, useMemo } from 'react';
import {
  Title,
  Group,
  Stack,
  Card,
  Text,
  SimpleGrid,
  ThemeIcon,
  Center,
  Loader,
  Select,
  ScrollArea,
  Badge,
  Button,
  Tabs,
  Progress,
  Alert,
  List,
  ActionIcon,
  Modal
} from '@mantine/core';
import {
  BarChart3,
  Route,
  MapPin,
  Mountain,
  Clock,
  TrendingUp,
  Filter,
  Heart,
  Zap,
  Activity,
  Award,
  Gauge,
  ArrowUp,
  ArrowDown,
  Brain,
  Star,
  Info,
  CheckCircle
} from 'lucide-react';
// import dayjs from 'dayjs'; // Unused import removed
import { useAuth } from '../contexts/AuthContext';
import { useUnits } from '../utils/units';
import { supabase } from '../supabase';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Tooltip as ChartTooltip,
  Area,
  AreaChart
} from 'recharts';
import toast from 'react-hot-toast';
import { fetchPastRides, analyzeRidingPatterns } from '../utils/rideAnalysis';
import { getRouteDate } from '../utils/dateUtils';
import RouteMap from './RouteMap';
import ActivityHeatmap from './ActivityHeatmap';
import RideDetailModal from './RideDetailModal';

const SmartRideAnalysis = () => {
  const { user } = useAuth();
  const { formatDistance, formatElevation, formatSpeed } = useUnits();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('all');
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [routeTrackPoints, setRouteTrackPoints] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [ridingPatterns, setRidingPatterns] = useState(null);
  const [patternsLoading, setPatternsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching routes for smart analysis, user:', user.id);
        
        // First get the total count to verify we're getting everything
        const { count, error: countError } = await supabase
          .from('routes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
          
        if (countError) {
          console.warn('Count error:', countError);
        } else {
          console.log('Total routes in database for user:', count);
        }
        
        // Get all routes - use range to fetch all records (Supabase default limit is 1000)
        let allRoutes = [];
        let hasMore = true;
        let offset = 0;
        const batchSize = 1000;
        
        while (hasMore) {
          const { data: batch, error: batchError } = await supabase
            .from('routes')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + batchSize - 1);
            
          if (batchError) {
            console.error('Batch fetch error:', batchError);
            throw batchError;
          }
          
          if (batch && batch.length > 0) {
            allRoutes = allRoutes.concat(batch);
            console.log(`Fetched batch: ${batch.length} routes (total so far: ${allRoutes.length})`);
            hasMore = batch.length === batchSize;
            offset += batchSize;
          } else {
            hasMore = false;
          }
        }
        
        const routesData = allRoutes;

        console.log('Smart analysis routes fetched:', routesData?.length);
        console.log('Sample route data:', routesData?.[0]);
        if (routesData?.[0]) {
          console.log('Available fields:', Object.keys(routesData[0]));
          console.log('GPS data fields:', {
            has_gps_data: routesData[0].has_gps_data,
            track_points_count: routesData[0].track_points_count,
            start_latitude: routesData[0].start_latitude,
            start_longitude: routesData[0].start_longitude
          });
        }

        // Check how many routes have GPS data
        const routesWithGPS = routesData?.filter(r => r.has_gps_data) || [];
        const routesWithTrackPoints = routesData?.filter(r => r.track_points_count > 0) || [];
        console.log(`GPS data summary: ${routesWithGPS.length} routes with GPS flag, ${routesWithTrackPoints.length} routes with track points`);

        // Test track points availability
        if (routesData && routesData.length > 0) {
          const testRoute = routesData[0];
          console.log('Testing track points availability for first route:', testRoute.id);

          supabase
            .from('track_points')
            .select('count')
            .eq('route_id', testRoute.id)
            .then(({ data, error }) => {
              if (error) {
                console.error('Error checking track points:', error);
              } else {
                console.log('Track points count query result:', data);
              }
            });

          // Also check if track_points table exists and has data
          supabase
            .from('track_points')
            .select('latitude, longitude, route_id')
            .limit(5)
            .then(({ data, error }) => {
              if (error) {
                console.error('Error checking track_points table:', error);
              } else {
                console.log('Sample track points from database:', data);
              }
            });
        }
        
        // Debug: Check for any NULL created_at values
        const routesWithoutDate = routesData?.filter(r => !r.created_at) || [];
        if (routesWithoutDate.length > 0) {
          console.warn('Found routes without created_at:', routesWithoutDate.length);
        }
        
        // Debug: Check date range
        if (routesData && routesData.length > 0) {
          const dates = routesData.map(r => r.created_at).filter(d => d).sort();
          console.log('Date range:', {
            earliest: dates[0],
            latest: dates[dates.length - 1],
            count: dates.length
          });
        }
        
        setRoutes(routesData || []);
        
        // Analyze riding patterns in background
        if (routesData && routesData.length > 0) {
          setPatternsLoading(true);
          try {
            const pastRides = await fetchPastRides(user.id, 100);
            const patterns = analyzeRidingPatterns(pastRides);
            setRidingPatterns(patterns);
            console.log('Riding patterns analyzed:', patterns);
          } catch (patternError) {
            console.warn('Failed to analyze patterns:', patternError);
          } finally {
            setPatternsLoading(false);
          }
        }
        
      } catch (error) {
        console.error('Error fetching smart analysis data:', error);
        toast.error('Failed to load ride analysis data');
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchData();
  }, [user]);

  // Load track points for route viewing
  const loadRouteTrackPoints = async (routeId) => {
    try {
      console.log('Loading track points for route:', routeId);

      const { data, error } = await supabase
        .from('track_points')
        .select('latitude, longitude, elevation, point_index')
        .eq('route_id', routeId)
        .order('point_index');

      if (error) throw error;
      console.log('Track points loaded:', data?.length, 'for route:', routeId);
      
      // Convert to format expected by RouteMap (lat/lng instead of latitude/longitude)
      const formattedTrackPoints = (data || []).map(point => ({
        lat: point.latitude,
        lng: point.longitude,
        elevation: point.elevation,
        point_index: point.point_index
      }));

      console.log('Formatted track points sample:', formattedTrackPoints.slice(0, 3));
      console.log('Track points coordinate validation:', {
        totalPoints: formattedTrackPoints.length,
        validLats: formattedTrackPoints.filter(p => p.lat != null).length,
        validLngs: formattedTrackPoints.filter(p => p.lng != null).length,
        sampleCoordinates: formattedTrackPoints.slice(0, 3).map(p => ({ lat: p.lat, lng: p.lng }))
      });

      setRouteTrackPoints(formattedTrackPoints);
      return formattedTrackPoints;
    } catch (error) {
      console.error('Error loading track points:', error);
      toast.error('Failed to load route details');
      return [];
    }
  };

  // Open map modal for a route
  const viewRouteOnMap = async (route) => {
    console.log('Opening route:', {
      id: route.id,
      name: route.name,
      has_gps_data: route.has_gps_data,
      track_points_count: route.track_points_count,
      start_lat: route.start_latitude,
      start_lng: route.start_longitude
    });
    setSelectedRoute(route);
    setMapModalOpen(true);

    // Only try to load track points if the route has GPS data
    if (route.has_gps_data && route.track_points_count > 0) {
      await loadRouteTrackPoints(route.id);
    } else {
      console.log('Route has no GPS data, skipping track points loading');
      setRouteTrackPoints([]);
    }
  };

  // Filter routes by time - fixed to work properly
  const filteredRoutes = useMemo(() => {
    return routes.filter(route => {
      if (timeFilter === 'all') return true;
      
      const routeDate = new Date(route.created_at);
      const now = new Date();
      
      switch (timeFilter) {
        case '30d':
          return routeDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        case '90d':
          return routeDate >= new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        case 'year':
          return routeDate >= new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        default:
          return true;
      }
    });
  }, [routes, timeFilter]);

  // Separate Strava and manual routes
  const stravaRoutes = filteredRoutes.filter(r => r.imported_from === 'strava');
  const manualRoutes = filteredRoutes.filter(r => r.imported_from !== 'strava');

  // Smart statistics with pattern analysis
  const stats = useMemo(() => {
    const base = {
      totalRoutes: filteredRoutes.length,
      stravaRoutes: stravaRoutes.length,
      manualRoutes: manualRoutes.length,
      totalDistance: filteredRoutes.reduce((sum, r) => sum + (r.distance_km || 0), 0),
      totalElevation: filteredRoutes.reduce((sum, r) => sum + (r.elevation_gain_m || 0), 0),
      totalTime: filteredRoutes.reduce((sum, r) => sum + (r.duration_seconds || 0), 0),
      longestRide: Math.max(...filteredRoutes.map(r => r.distance_km || 0), 0),
      highestElevation: Math.max(...filteredRoutes.map(r => r.elevation_gain_m || 0), 0)
    };

    // Performance metrics from Strava data
    const routesWithSpeed = stravaRoutes.filter(r => r.average_speed && r.average_speed > 0);
    const routesWithHR = stravaRoutes.filter(r => r.average_heartrate && r.average_heartrate > 0);
    const routesWithPower = stravaRoutes.filter(r => r.average_watts && r.average_watts > 0);
    const routesWithEnergy = stravaRoutes.filter(r => r.kilojoules && r.kilojoules > 0);

    // Smart analysis metrics with better error handling
    let weeklyDistance = 0;
    if (filteredRoutes.length > 0 && base.totalDistance > 0) {
      try {
        const dates = filteredRoutes.map(r => new Date(r.created_at).getTime()).filter(d => !isNaN(d));
        if (dates.length > 0) {
          const daysSinceFirst = Math.max(1, (new Date().getTime() - Math.min(...dates)) / (24 * 60 * 60 * 1000));
          const weeks = Math.max(1, daysSinceFirst / 7);
          weeklyDistance = base.totalDistance / weeks;
        }
      } catch (e) {
        console.warn('Error calculating weekly distance:', e);
        weeklyDistance = 0;
      }
    }
    
    const consistencyScore = calculateConsistencyScore(filteredRoutes);
    const improvementTrend = calculateImprovementTrend(stravaRoutes);
    const diversityScore = calculateRouteDiversity(filteredRoutes);
    
    // Advanced performance metrics
    const weeklyTrainingStress = calculateWeeklyTrainingStress(stravaRoutes);
    const intensityDistribution = calculateIntensityDistribution(stravaRoutes);
    const efficiencyFactor = calculateEfficiencyFactor(stravaRoutes);
    
    return {
      ...base,
      avgDistance: base.totalRoutes > 0 ? base.totalDistance / base.totalRoutes : 0,
      weeklyDistance: weeklyDistance,
      avgSpeed: routesWithSpeed.length > 0 
        ? routesWithSpeed.reduce((sum, r) => {
            // Handle both cases: speed already in km/h or in m/s (needs conversion)
            const speed = r.average_speed > 100 ? r.average_speed : r.average_speed * 3.6;
            return sum + speed;
          }, 0) / routesWithSpeed.length
        : null,
      maxSpeed: (() => {
        const maxSpeedValue = Math.max(...stravaRoutes.map(r => r.max_speed || 0), 0);
        // Handle both cases: speed already in km/h or in m/s (needs conversion)
        return maxSpeedValue > 0 ? (maxSpeedValue > 100 ? maxSpeedValue : maxSpeedValue * 3.6) : null;
      })(),
      avgHeartRate: routesWithHR.length > 0
        ? routesWithHR
            .filter(r => r.average_heartrate >= 50 && r.average_heartrate <= 220) // Reasonable HR bounds
            .reduce((sum, r, _, arr) => sum + r.average_heartrate / arr.length, 0) || null
        : null,
      maxHeartRate: (() => {
        const maxHR = Math.max(...stravaRoutes.map(r => r.max_heartrate || 0), 0);
        return (maxHR >= 50 && maxHR <= 220) ? maxHR : null; // Reasonable HR bounds
      })(),
      avgPower: routesWithPower.length > 0
        ? routesWithPower
            .filter(r => r.average_watts >= 50 && r.average_watts <= 2000) // Reasonable power bounds
            .reduce((sum, r, _, arr) => sum + r.average_watts / arr.length, 0) || null
        : null,
      maxPower: (() => {
        const maxPower = Math.max(...stravaRoutes.map(r => r.max_watts || 0), 0);
        return (maxPower >= 50 && maxPower <= 2000) ? maxPower : null; // Reasonable power bounds
      })(),
      totalEnergy: routesWithEnergy.reduce((sum, r) => sum + (r.kilojoules || 0), 0),
      // Smart metrics
      consistencyScore,
      improvementTrend,
      diversityScore,
      weeklyTrainingStress,
      intensityDistribution,
      efficiencyFactor,
      dataQuality: {
        withSpeed: routesWithSpeed.length,
        withHR: routesWithHR.length,
        withPower: routesWithPower.length,
        withGPS: filteredRoutes.filter(r => r.start_latitude && r.start_longitude).length,
        fromStrava: stravaRoutes.length,
        dataRichness: calculateDataRichness(stravaRoutes)
      }
    };
  }, [filteredRoutes, stravaRoutes, manualRoutes]);

  // Monthly performance trends - fixed to use filtered routes
  const monthlyTrends = useMemo(() => {
    if (filteredRoutes.length === 0) return [];
    
    const monthlyData = {};
    
    filteredRoutes.forEach(route => {
      const month = getRouteDate(route).format('YYYY-MM');
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          monthName: getRouteDate(route).format('MMM YYYY'),
          rides: 0,
          distance: 0,
          time: 0,
          elevation: 0,
          speeds: [],
          heartRates: [],
          powers: [],
          energy: 0
        };
      }
      
      const data = monthlyData[month];
      data.rides += 1;
      data.distance += route.distance_km || 0;
      data.time += route.duration_seconds || 0;
      data.elevation += route.elevation_gain_m || 0;
      data.energy += route.kilojoules || 0;
      
      if (route.average_speed) data.speeds.push(route.average_speed);
      if (route.average_heartrate) data.heartRates.push(route.average_heartrate);
      if (route.average_watts) data.powers.push(route.average_watts);
    });
    
    return Object.values(monthlyData)
      .map(month => ({
        ...month,
        avgSpeed: month.speeds.length > 0 ? month.speeds.reduce((a, b) => a + b, 0) / month.speeds.length : 0,
        avgHR: month.heartRates.length > 0 ? month.heartRates.reduce((a, b) => a + b, 0) / month.heartRates.length : 0,
        avgPower: month.powers.length > 0 ? month.powers.reduce((a, b) => a + b, 0) / month.powers.length : 0
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months
  }, [filteredRoutes]);

  // Smart insights based on patterns
  const smartInsights = useMemo(() => {
    const insights = [];
    
    if (!ridingPatterns || filteredRoutes.length < 3) {
      return [{ type: 'info', title: 'Building Intelligence', message: 'Add more rides to unlock personalized insights!' }];
    }

    // Consistency insights
    if (stats.consistencyScore < 0.3) {
      insights.push({
        type: 'warning',
        title: 'Consistency Opportunity',
        message: 'Your riding frequency varies significantly. Try to establish a more regular riding schedule for better fitness gains.',
        action: 'Set weekly distance goals'
      });
    } else if (stats.consistencyScore > 0.7) {
      insights.push({
        type: 'success',
        title: 'Great Consistency!',
        message: 'You maintain excellent riding consistency. This is key to steady fitness improvements.',
        action: 'Keep up the great work'
      });
    }

    // Distance pattern insights
    if (ridingPatterns.preferredDistances?.mean) {
      const avgDistance = ridingPatterns.preferredDistances.mean;
      if (stats.avgDistance > avgDistance * 1.2) {
        insights.push({
          type: 'info',
          title: 'Distance Explorer',
          message: `You're riding ${((stats.avgDistance / avgDistance - 1) * 100).toFixed(0)}% longer than your historical average. Great for building endurance!`,
          action: 'Consider recovery rides'
        });
      }
    }

    // Performance insights
    if (stats.improvementTrend > 0.05) {
      insights.push({
        type: 'success',
        title: 'Performance Improving',
        message: 'Your average speeds show an upward trend. Your training is paying off!',
        action: 'Track power zones'
      });
    } else if (stats.improvementTrend < -0.05) {
      insights.push({
        type: 'info',
        title: 'Performance Check',
        message: 'Consider varying your training intensity or ensuring adequate recovery.',
        action: 'Add interval training'
      });
    }

    // Diversity insights
    if (stats.diversityScore < 0.3) {
      insights.push({
        type: 'suggestion',
        title: 'Route Variety',
        message: 'Try exploring different areas and route types to keep training engaging and work different muscle groups.',
        action: 'Generate new routes'
      });
    }

    // Data quality insights
    if (stats.dataQuality.dataRichness < 0.5 && stravaRoutes.length > 0) {
      insights.push({
        type: 'info',
        title: 'Enhanced Data Available',
        message: 'Connect more devices (heart rate, power meter) for deeper performance insights.',
        action: 'Upgrade data tracking'
      });
    }

    return insights.slice(0, 4); // Keep top 4 insights
  }, [stats, ridingPatterns, filteredRoutes.length, stravaRoutes.length]);

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };


  if (loading) {
    return (
      <Center style={{ height: '50vh' }}>
        <Stack align="center">
          <Loader size="lg" />
          <Text c="dimmed">Analyzing your rides...</Text>
        </Stack>
      </Center>
    );
  }

  if (routes.length === 0) {
    return (
      <Center style={{ height: '50vh' }}>
        <Stack align="center">
          <Brain size={48} color="gray" />
          <Title order={3}>No rides to analyze yet</Title>
          <Text c="dimmed" ta="center">
            Upload routes or import cycling data to unlock intelligent ride analysis and personalized insights
          </Text>
          <Group>
            <Button variant="light" leftSection={<Route size={16} />}>
              Upload Routes
            </Button>
            <Button leftSection={<Activity size={16} />}>
              Import Data
            </Button>
          </Group>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      {/* Header */}
      <Stack gap="sm">
        <Group justify="space-between" wrap="wrap">
          <Title order={2} size={{ base: 'h3', sm: 'h2' }}>
            <Group gap="xs">
              <Brain size={window.innerWidth < 640 ? 20 : 28} />
              <Text span size={{ base: 'lg', sm: 'xl' }}>Smart Analysis</Text>
            </Group>
          </Title>
          
          <Select
            value={timeFilter}
            onChange={setTimeFilter}
            data={[
              { value: 'all', label: 'All time' },
              { value: '30d', label: '30 days' },
              { value: '90d', label: '90 days' },
              { value: 'year', label: '1 year' }
            ]}
            leftSection={<Filter size={14} />}
            size="xs"
            w={{ base: 120, sm: 150 }}
          />
        </Group>
        <Text c="dimmed" size={{ base: 'xs', sm: 'sm' }}>
          {stats.totalRoutes} activities • {stats.stravaRoutes} enhanced
        </Text>
      </Stack>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<BarChart3 size={16} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="intelligence" leftSection={<Brain size={16} />}>
            Intelligence
          </Tabs.Tab>
          <Tabs.Tab value="performance" leftSection={<Zap size={16} />}>
            Performance
          </Tabs.Tab>
          <Tabs.Tab value="trends" leftSection={<TrendingUp size={16} />}>
            Trends
          </Tabs.Tab>
          <Tabs.Tab value="activities" leftSection={<Route size={16} />}>
            Activities
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          {/* Key Metrics Grid */}
          <SimpleGrid cols={{ base: 2, xs: 2, sm: 4 }} spacing={{ base: 'xs', sm: 'md' }} mb="lg">
            <Card padding={{ base: 'xs', sm: 'md' }} withBorder>
              <Stack gap={4}>
                <ThemeIcon size={{ base: 28, sm: 38 }} variant="light" color="blue" visibleFrom="sm">
                  <Route size={16} />
                </ThemeIcon>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Rides</Text>
                <Text fw={700} size={{ base: 'lg', sm: 'xl' }}>{stats.totalRoutes}</Text>
                <Text size="xs" c="blue" visibleFrom="xs">{stats.stravaRoutes} enhanced</Text>
              </Stack>
            </Card>

            <Card padding={{ base: 'xs', sm: 'md' }} withBorder>
              <Stack gap={4}>
                <ThemeIcon size={{ base: 28, sm: 38 }} variant="light" color="green" visibleFrom="sm">
                  <MapPin size={16} />
                </ThemeIcon>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Distance</Text>
                <Text fw={700} size={{ base: 'lg', sm: 'xl' }}>{formatDistance(stats.totalDistance)}</Text>
                <Text size="xs" c="green" visibleFrom="xs">~{formatDistance(stats.weeklyDistance)}/wk</Text>
              </Stack>
            </Card>

            <Card padding={{ base: 'xs', sm: 'md' }} withBorder>
              <Stack gap={4}>
                <ThemeIcon size={{ base: 28, sm: 38 }} variant="light" color="orange" visibleFrom="sm">
                  <Mountain size={16} />
                </ThemeIcon>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Elevation</Text>
                <Text fw={700} size={{ base: 'lg', sm: 'xl' }}>{formatElevation(stats.totalElevation)}</Text>
                <Text size="xs" c="orange" visibleFrom="xs">Max: {formatElevation(stats.highestElevation)}</Text>
              </Stack>
            </Card>

            <Card padding={{ base: 'xs', sm: 'md' }} withBorder>
              <Stack gap={4}>
                <ThemeIcon size={{ base: 28, sm: 38 }} variant="light" color="violet" visibleFrom="sm">
                  <Clock size={16} />
                </ThemeIcon>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Time</Text>
                <Text fw={700} size={{ base: 'lg', sm: 'xl' }}>{formatDuration(stats.totalTime)}</Text>
                {stats.totalEnergy > 0 && (
                  <Text size="xs" c="violet" visibleFrom="xs">{Math.round(stats.totalEnergy).toLocaleString()} kJ</Text>
                )}
              </Stack>
            </Card>
          </SimpleGrid>

          {/* Smart Metrics */}
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="lg">
            <Card padding="md" withBorder>
              <Group justify="space-between" mb="sm">
                <Text fw={600}>Riding Consistency</Text>
                <Badge color={stats.consistencyScore > 0.7 ? 'green' : stats.consistencyScore > 0.4 ? 'yellow' : 'red'}>
                  {(stats.consistencyScore * 100).toFixed(0)}%
                </Badge>
              </Group>
              <Progress 
                value={stats.consistencyScore * 100} 
                color={stats.consistencyScore > 0.7 ? 'green' : stats.consistencyScore > 0.4 ? 'yellow' : 'red'}
                size="md"
              />
              <Text size="sm" c="dimmed" mt="xs">
                How regular your riding schedule is
              </Text>
            </Card>

            <Card padding="md" withBorder>
              <Group justify="space-between" mb="sm">
                <Text fw={600}>Route Diversity</Text>
                <Badge color={stats.diversityScore > 0.7 ? 'green' : stats.diversityScore > 0.4 ? 'yellow' : 'red'}>
                  {(stats.diversityScore * 100).toFixed(0)}%
                </Badge>
              </Group>
              <Progress 
                value={stats.diversityScore * 100} 
                color={stats.diversityScore > 0.7 ? 'green' : stats.diversityScore > 0.4 ? 'yellow' : 'red'}
                size="md"
              />
              <Text size="sm" c="dimmed" mt="xs">
                Variety in your route selection
              </Text>
            </Card>

            <Card padding="md" withBorder>
              <Group justify="space-between" mb="sm">
                <Text fw={600}>Data Quality</Text>
                <Badge color={stats.dataQuality.dataRichness > 0.7 ? 'green' : stats.dataQuality.dataRichness > 0.4 ? 'yellow' : 'red'}>
                  {(stats.dataQuality.dataRichness * 100).toFixed(0)}%
                </Badge>
              </Group>
              <Progress 
                value={stats.dataQuality.dataRichness * 100} 
                color={stats.dataQuality.dataRichness > 0.7 ? 'green' : stats.dataQuality.dataRichness > 0.4 ? 'yellow' : 'red'}
                size="md"
              />
              <Text size="sm" c="dimmed" mt="xs">
                Richness of performance data
              </Text>
            </Card>
          </SimpleGrid>

          {/* Activity Calendar Heatmap */}
          {(() => {
            console.log('🔵 About to render ActivityHeatmap with:', {
              filteredRoutesCount: filteredRoutes.length,
              sampleRoute: filteredRoutes[0] ? {
                id: filteredRoutes[0].id,
                name: filteredRoutes[0].name,
                created_at: filteredRoutes[0].created_at,
                distance_km: filteredRoutes[0].distance_km
              } : null
            });
            return <ActivityHeatmap routes={filteredRoutes} formatDistance={formatDistance} />;
          })()}

          {/* Performance Summary */}
          {stats.stravaRoutes > 0 && (
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
              <Card padding="md" withBorder bg="blue.0">
                <Group justify="space-between">
                  <div>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Avg Speed</Text>
                    <Text fw={700} size="lg" c="blue">
                      {stats.avgSpeed ? formatSpeed(stats.avgSpeed) : 'N/A'}
                    </Text>
                    {stats.maxSpeed && (
                      <Text size="xs" c="dimmed">Max: {formatSpeed(stats.maxSpeed)}</Text>
                    )}
                  </div>
                  <ThemeIcon size={38} variant="light" color="blue">
                    <Gauge size={20} />
                  </ThemeIcon>
                </Group>
              </Card>

              {stats.avgHeartRate && (
                <Card padding="md" withBorder bg="red.0">
                  <Group justify="space-between">
                    <div>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Avg Heart Rate</Text>
                      <Text fw={700} size="lg" c="red">
                        {Math.round(stats.avgHeartRate)} bpm
                      </Text>
                      <Text size="xs" c="dimmed">Max: {stats.maxHeartRate} bpm</Text>
                    </div>
                    <ThemeIcon size={38} variant="light" color="red">
                      <Heart size={20} />
                    </ThemeIcon>
                  </Group>
                </Card>
              )}

              {stats.avgPower && (
                <Card padding="md" withBorder bg="yellow.0">
                  <Group justify="space-between">
                    <div>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Avg Power</Text>
                      <Text fw={700} size="lg" c="yellow.8">
                        {Math.round(stats.avgPower)} W
                      </Text>
                      <Text size="xs" c="dimmed">Max: {stats.maxPower} W</Text>
                    </div>
                    <ThemeIcon size={38} variant="light" color="yellow">
                      <Zap size={20} />
                    </ThemeIcon>
                  </Group>
                </Card>
              )}

              <Card padding="md" withBorder bg="grape.0">
                <Group justify="space-between">
                  <div>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Data Quality</Text>
                    <Text fw={700} size="lg" c="grape">
                      {Math.round((stats.stravaRoutes / stats.totalRoutes) * 100)}%
                    </Text>
                    <Text size="xs" c="dimmed">
                      {stats.dataQuality.withHR} HR • {stats.dataQuality.withPower} Power
                    </Text>
                  </div>
                  <ThemeIcon size={38} variant="light" color="grape">
                    <Award size={20} />
                  </ThemeIcon>
                </Group>
              </Card>
            </SimpleGrid>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="intelligence" pt="md">
          {patternsLoading ? (
            <Center py="xl">
              <Stack align="center">
                <Loader size="lg" />
                <Text c="dimmed">Analyzing your riding patterns...</Text>
              </Stack>
            </Center>
          ) : (
            <Stack gap="lg">
              {/* Smart Insights */}
              <Card withBorder p="lg">
                <Group mb="md">
                  <Brain size={24} />
                  <Title order={4}>Personalized Insights</Title>
                </Group>
                
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                  {smartInsights.map((insight, index) => (
                    <Alert
                      key={index}
                      color={
                        insight.type === 'success' ? 'green' :
                        insight.type === 'warning' ? 'yellow' :
                        insight.type === 'suggestion' ? 'blue' : 'gray'
                      }
                      title={insight.title}
                      icon={
                        insight.type === 'success' ? <CheckCircle size={16} /> :
                        insight.type === 'warning' ? <Info size={16} /> :
                        insight.type === 'suggestion' ? <Star size={16} /> :
                        <Info size={16} />
                      }
                    >
                      <Text size="sm">{insight.message}</Text>
                      {insight.action && (
                        <Text size="xs" c="dimmed" mt="xs">
                          💡 {insight.action}
                        </Text>
                      )}
                    </Alert>
                  ))}
                </SimpleGrid>
              </Card>

              {/* Riding Patterns */}
              {ridingPatterns && (
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                  {/* Distance Preferences */}
                  <Card withBorder p="md">
                    <Title order={5} mb="md">Distance Patterns</Title>
                    {ridingPatterns.preferredDistances?.mean ? (
                      <Stack gap="sm">
                        <Group justify="space-between">
                          <Text>Preferred Distance</Text>
                          <Text fw={600}>{formatDistance(ridingPatterns.preferredDistances.mean)}</Text>
                        </Group>
                        <Group justify="space-between">
                          <Text>Typical Range</Text>
                          <Text c="dimmed">
                            {formatDistance(ridingPatterns.preferredDistances.percentiles.p25)} - {formatDistance(ridingPatterns.preferredDistances.percentiles.p75)}
                          </Text>
                        </Group>
                        <Group justify="space-between">
                          <Text>Most Common</Text>
                          <Badge variant="light">
                            {ridingPatterns.preferredDistances.mostCommon.name} rides
                          </Badge>
                        </Group>
                      </Stack>
                    ) : (
                      <Text c="dimmed">Add more rides to analyze distance patterns</Text>
                    )}
                  </Card>

                  {/* Elevation Preferences */}
                  <Card withBorder p="md">
                    <Title order={5} mb="md">Elevation Patterns</Title>
                    <Stack gap="sm">
                      <Group justify="space-between">
                        <Text>Preference</Text>
                        <Badge variant="light" color="orange">
                          {ridingPatterns.elevationPreference}
                        </Badge>
                      </Group>
                      <Group justify="space-between">
                        <Text>Typical Gain</Text>
                        <Text fw={600}>{formatElevation(ridingPatterns.elevationTolerance.preferred)}</Text>
                      </Group>
                      <Group justify="space-between">
                        <Text>Comfort Range</Text>
                        <Text c="dimmed">
                          {formatElevation(ridingPatterns.elevationTolerance.min)} - {formatElevation(ridingPatterns.elevationTolerance.max)}
                        </Text>
                      </Group>
                    </Stack>
                  </Card>

                  {/* Riding Areas */}
                  {ridingPatterns.frequentAreas?.length > 0 && (
                    <Card withBorder p="md">
                      <Title order={5} mb="md">Favorite Areas</Title>
                      <Stack gap="xs">
                        {ridingPatterns.frequentAreas.slice(0, 3).map((area, index) => (
                          <Group key={index} justify="space-between">
                            <Group gap="xs">
                              <MapPin size={16} />
                              <Text size="sm">Area {index + 1}</Text>
                            </Group>
                            <Badge size="sm" variant="light">
                              {area.frequency} rides
                            </Badge>
                          </Group>
                        ))}
                      </Stack>
                    </Card>
                  )}

                  {/* Performance Confidence */}
                  <Card withBorder p="md">
                    <Title order={5} mb="md">Analysis Confidence</Title>
                    <Stack gap="md">
                      <div>
                        <Group justify="space-between" mb="xs">
                          <Text size="sm">Pattern Recognition</Text>
                          <Text size="sm" fw={600}>{(ridingPatterns.confidence * 100).toFixed(0)}%</Text>
                        </Group>
                        <Progress value={ridingPatterns.confidence * 100} color="blue" size="md" />
                      </div>
                      <Text size="xs" c="dimmed">
                        Based on {ridingPatterns.dataSource === 'strava_enhanced' ? 'enhanced Strava data' : 'basic ride data'}
                      </Text>
                      {ridingPatterns.confidence < 0.6 && (
                        <Text size="xs" c="yellow.7">
                          💡 More rides with GPS data will improve pattern accuracy
                        </Text>
                      )}
                    </Stack>
                  </Card>
                </SimpleGrid>
              )}
            </Stack>
          )}
        </Tabs.Panel>

        {/* Other tabs remain similar but simplified for existing schema */}
        <Tabs.Panel value="performance" pt="md">
          {stats.stravaRoutes === 0 ? (
            <Card withBorder p="xl">
              <Stack align="center">
                <Activity size={48} color="gray" />
                <Title order={4}>Enhanced Performance Data Unavailable</Title>
                <Text c="dimmed" ta="center">
                  Import rides with performance data (heart rate, power, speed) to unlock 
                  detailed analysis including charts and advanced metrics.
                </Text>
              </Stack>
            </Card>
          ) : (
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              {/* Training Load Analysis */}
              <Card withBorder p="md">
                <Title order={5} mb="md">Training Load Analysis</Title>
                <Stack gap="md">
                  <Group justify="space-between">
                    <Text size="sm">Weekly Training Stress</Text>
                    <Text fw={700} c={stats.weeklyTrainingStress > 500 ? 'red' : stats.weeklyTrainingStress > 300 ? 'orange' : 'green'}>
                      {Math.round(stats.weeklyTrainingStress || 0)} TSS
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Intensity Distribution</Text>
                    <Text fw={700}>
                      {Math.round(stats.intensityDistribution?.low || 0)}% / {Math.round(stats.intensityDistribution?.moderate || 0)}% / {Math.round(stats.intensityDistribution?.high || 0)}%
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Consistency Score</Text>
                    <Badge 
                      color={stats.consistencyScore > 0.8 ? 'green' : stats.consistencyScore > 0.6 ? 'yellow' : 'red'}
                      variant="filled"
                    >
                      {Math.round((stats.consistencyScore || 0) * 100)}%
                    </Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Training Efficiency</Text>
                    <Text fw={700} c={stats.efficiencyFactor > 1.0 ? 'green' : 'orange'}>
                      {(stats.efficiencyFactor || 0).toFixed(2)}
                    </Text>
                  </Group>
                  {stats.avgPower && stats.avgHeartRate && (
                    <Group justify="space-between">
                      <Text size="sm">Power/HR Ratio</Text>
                      <Text fw={700}>
                        {(stats.avgPower / stats.avgHeartRate).toFixed(1)} W/bpm
                      </Text>
                    </Group>
                  )}
                </Stack>
              </Card>

              {/* Heart Rate Distribution */}
              {stats.avgHeartRate && (
                <Card withBorder p="md">
                  <Title order={5} mb="md">Heart Rate Distribution</Title>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={createHRDistribution(stravaRoutes.filter(r => r.average_heartrate))}
                    >
                      <XAxis dataKey="zone" fontSize={14} height={50} />
                      <YAxis fontSize={14} width={60} />
                      <ChartTooltip />
                      <Bar dataKey="count" fill="#ff6b6b" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* Power Analysis */}
              {stats.avgPower && (
                <Card withBorder p="md">
                  <Title order={5} mb="md">Power Analysis</Title>
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Text>Average Power</Text>
                      <Text fw={700}>{Math.round(stats.avgPower)} W</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text>Peak Power</Text>
                      <Text fw={700}>{stats.maxPower} W</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text>Total Energy</Text>
                      <Text fw={700}>{stats.totalEnergy.toLocaleString()} kJ</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Est. Calories</Text>
                      <Text size="sm" c="dimmed">~{Math.round(stats.totalEnergy * 0.24).toLocaleString()} kcal</Text>
                    </Group>
                  </Stack>
                </Card>
              )}

              {/* Performance Summary */}
              <Card withBorder p="md">
                <Title order={5} mb="md">Performance Summary</Title>
                <List spacing="xs" size="sm">
                  <List.Item>
                    <Text span fw={500}>Best Month: </Text>
                    {monthlyTrends.length > 0 && (
                      <Text span>{monthlyTrends.reduce((best, month) => 
                        month.distance > best.distance ? month : best
                      ).monthName}</Text>
                    )}
                  </List.Item>
                  <List.Item>
                    <Text span fw={500}>Longest Ride: </Text>
                    <Text span>{formatDistance(stats.longestRide)}</Text>
                  </List.Item>
                  <List.Item>
                    <Text span fw={500}>Biggest Climb: </Text>
                    <Text span>{formatElevation(stats.highestElevation)}</Text>
                  </List.Item>
                  <List.Item>
                    <Text span fw={500}>Data Quality: </Text>
                    <Text span>{stats.dataQuality.withHR} rides with HR, {stats.dataQuality.withPower} with power</Text>
                  </List.Item>
                </List>
              </Card>
            </SimpleGrid>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="trends" pt="md">
          {monthlyTrends.length === 0 ? (
            <Card withBorder p="xl">
              <Stack align="center">
                <TrendingUp size={48} color="gray" />
                <Title order={4}>Trend Data Unavailable</Title>
                <Text c="dimmed" ta="center">
                  Need more cycling activities to show meaningful trends. 
                  Import more rides to see monthly progress charts.
                </Text>
              </Stack>
            </Card>
          ) : (
            <Stack gap="lg">
              {/* Monthly Distance Trend */}
              <Card withBorder p="md">
                <Title order={5} mb="md">Monthly Distance Progress</Title>
                <ResponsiveContainer width="100%" height={window.innerWidth < 640 ? 200 : 300}>
                  <AreaChart data={monthlyTrends}>
                    <XAxis dataKey="monthName" fontSize={14} height={50} />
                    <YAxis fontSize={14} width={80} />
                    <ChartTooltip formatter={(value) => [formatDistance(value), 'Distance']} />
                    <Area 
                      type="monotone" 
                      dataKey="distance" 
                      stroke="#228be6" 
                      fill="#228be6" 
                      fillOpacity={0.6} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              {/* Performance Trends */}
              {monthlyTrends.some(m => m.avgSpeed > 0) && (
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                  <Card withBorder p="md">
                    <Title order={5} mb="md">Speed Progression</Title>
                    <ResponsiveContainer width="100%" height={window.innerWidth < 640 ? 150 : 200}>
                      <LineChart data={monthlyTrends}>
                        <XAxis dataKey="monthName" fontSize={14} height={50} />
                        <YAxis fontSize={14} width={80} />
                        <ChartTooltip formatter={(value) => [formatSpeed(value), 'Avg Speed']} />
                        <Line 
                          type="monotone" 
                          dataKey="avgSpeed" 
                          stroke="#51cf66" 
                          strokeWidth={3}
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <Group justify="center" mt="md">
                      <Badge 
                        color={stats.improvementTrend > 0 ? 'green' : stats.improvementTrend < 0 ? 'red' : 'gray'}
                        leftSection={stats.improvementTrend > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                      >
                        {stats.improvementTrend > 0 ? 'Improving' : stats.improvementTrend < 0 ? 'Declining' : 'Stable'}
                      </Badge>
                    </Group>
                  </Card>

                  {monthlyTrends.some(m => m.avgHR > 0) && (
                    <Card withBorder p="md">
                      <Title order={5} mb="md">Heart Rate Trends</Title>
                      <ResponsiveContainer width="100%" height={window.innerWidth < 640 ? 150 : 200}>
                        <LineChart data={monthlyTrends}>
                          <XAxis dataKey="monthName" fontSize={14} height={50} />
                          <YAxis fontSize={14} width={80} />
                          <ChartTooltip formatter={(value) => [`${Math.round(value)} bpm`, 'Avg HR']} />
                          <Line 
                            type="monotone" 
                            dataKey="avgHR" 
                            stroke="#ff6b6b" 
                            strokeWidth={3}
                            dot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Card>
                  )}
                </SimpleGrid>
              )}
            </Stack>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="activities" pt="md">
          <Card withBorder p="md">
            <Group justify="space-between" mb="md">
              <Title order={5}>Recent Activities</Title>
              <Badge variant="light">{filteredRoutes.length} activities</Badge>
            </Group>
            
            <ScrollArea style={{ height: window.innerWidth < 640 ? 400 : 500 }}>
              <Stack gap="xs">
                {filteredRoutes.slice(0, 50).map((route) => (
                  <Card key={route.id} padding="sm" withBorder>
                    <Group justify="space-between">
                      <div>
                        <Group gap="xs">
                          <Text fw={500} size="sm">{route.name || 'Unnamed Route'}</Text>
                          {route.imported_from === 'strava' && (
                            <Badge size="xs" color="orange">Strava</Badge>
                          )}
                          {route.average_heartrate && (
                            <Badge size="xs" color="red">HR</Badge>
                          )}
                          {route.average_watts && (
                            <Badge size="xs" color="yellow">Power</Badge>
                          )}
                          {route.has_gps_data && (
                            <Badge size="xs" color="green">GPS</Badge>
                          )}
                        </Group>
                        <Text size="xs" c="dimmed">
                          {getRouteDate(route).format('MMM D, YYYY')}
                        </Text>
                      </div>
                      
                      <Group gap="md">
                        <Text size="xs">{formatDistance(route.distance_km || 0)}</Text>
                        <Text size="xs">↗ {formatElevation(route.elevation_gain_m || 0)}</Text>
                        {route.duration_seconds && (
                          <Text size="xs">{formatDuration(route.duration_seconds)}</Text>
                        )}
                        {route.average_speed && (
                          <Text size="xs">{formatSpeed(route.average_speed > 100 ? route.average_speed : route.average_speed * 3.6)}</Text>
                        )}
                        <ActionIcon
                          size="sm"
                          variant="light"
                          color="blue"
                          onClick={() => viewRouteOnMap(route)}
                          title="View on map"
                        >
                          <MapPin size={12} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  </Card>
                ))}
              </Stack>
            </ScrollArea>
          </Card>
        </Tabs.Panel>
      </Tabs>

      {/* Ride Detail Modal */}
      <RideDetailModal
        opened={mapModalOpen}
        onClose={() => setMapModalOpen(false)}
        route={selectedRoute}
        trackPoints={routeTrackPoints}
      />
    </Stack>
  );
};

// Helper functions for smart analysis
function calculateConsistencyScore(routes) {
  if (routes.length < 3) return 0;
  
  // Calculate gaps between rides in days
  const dates = routes.map(r => new Date(r.created_at)).sort((a, b) => a - b);
  const gaps = [];
  
  for (let i = 1; i < dates.length; i++) {
    const gap = (dates[i] - dates[i-1]) / (1000 * 60 * 60 * 24); // days
    gaps.push(gap);
  }
  
  // Calculate standard deviation of gaps
  const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  const variance = gaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / gaps.length;
  const stdDev = Math.sqrt(variance);
  
  // Convert to consistency score (lower std dev = higher consistency)
  const consistencyScore = Math.max(0, 1 - (stdDev / avgGap));
  return Math.min(1, consistencyScore);
}

function calculateImprovementTrend(routes) {
  const routesWithSpeed = routes
    .filter(r => r.average_speed && r.average_speed > 0)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  
  if (routesWithSpeed.length < 5) return 0;
  
  // Simple linear regression on speeds over time
  const n = routesWithSpeed.length;
  const sumX = routesWithSpeed.reduce((sum, _, i) => sum + i, 0);
  const sumY = routesWithSpeed.reduce((sum, r) => sum + r.average_speed, 0);
  const sumXY = routesWithSpeed.reduce((sum, r, i) => sum + i * r.average_speed, 0);
  const sumX2 = routesWithSpeed.reduce((sum, _, i) => sum + i * i, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope / (sumY / n); // Normalize by average speed
}

function calculateRouteDiversity(routes) {
  if (routes.length < 3) return 0;
  
  // Calculate diversity based on distance and location variety
  const distances = routes.map(r => r.distance_km).filter(d => d);
  const locations = routes.filter(r => r.start_latitude && r.start_longitude);
  
  let diversityScore = 0;
  
  // Distance diversity
  if (distances.length > 0) {
    const avgDist = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    const distanceVariety = distances.reduce((sum, d) => sum + Math.abs(d - avgDist), 0) / (distances.length * avgDist);
    diversityScore += Math.min(1, distanceVariety) * 0.4;
  }
  
  // Location diversity (simplified)
  if (locations.length > 1) {
    const latRange = Math.max(...locations.map(l => l.start_latitude)) - Math.min(...locations.map(l => l.start_latitude));
    const lonRange = Math.max(...locations.map(l => l.start_longitude)) - Math.min(...locations.map(l => l.start_longitude));
    const locationDiversity = Math.min(1, (latRange + lonRange) * 100); // Rough approximation
    diversityScore += locationDiversity * 0.6;
  }
  
  return Math.min(1, diversityScore);
}

function calculateDataRichness(stravaRoutes) {
  if (stravaRoutes.length === 0) return 0;
  
  let richness = 0;
  const factors = ['average_speed', 'average_heartrate', 'average_watts', 'kilojoules', 'start_latitude'];
  
  factors.forEach(factor => {
    const count = stravaRoutes.filter(r => r[factor] && r[factor] > 0).length;
    richness += (count / stravaRoutes.length) * (1 / factors.length);
  });
  
  return richness;
}

function createHRDistribution(routesWithHR) {
  if (routesWithHR.length === 0) return [];
  
  const zones = [
    { zone: 'Z1 (50-60%)', min: 0.5, max: 0.6, count: 0 },
    { zone: 'Z2 (60-70%)', min: 0.6, max: 0.7, count: 0 },
    { zone: 'Z3 (70-80%)', min: 0.7, max: 0.8, count: 0 },
    { zone: 'Z4 (80-90%)', min: 0.8, max: 0.9, count: 0 },
    { zone: 'Z5 (90%+)', min: 0.9, max: 1.1, count: 0 }
  ];
  
  const maxHR = Math.max(...routesWithHR.map(r => r.max_heartrate || r.average_heartrate));
  
  routesWithHR.forEach(route => {
    const hrRatio = route.average_heartrate / maxHR;
    zones.forEach(zone => {
      if (hrRatio >= zone.min && hrRatio < zone.max) {
        zone.count++;
      }
    });
  });
  
  return zones;
}

// Advanced performance calculation functions
function calculateWeeklyTrainingStress(stravaRoutes) {
  if (stravaRoutes.length === 0) return 0;
  
  // Calculate Training Stress Score (TSS) equivalent based on available data
  // TSS = (duration in hours × intensity factor^2 × 100)
  // For routes without power, estimate based on HR and duration
  
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const recentRoutes = stravaRoutes.filter(r => 
    new Date(r.recorded_at || r.created_at) >= oneWeekAgo
  );
  
  let totalTSS = 0;
  
  recentRoutes.forEach(route => {
    const duration = (route.duration_seconds || 0) / 3600; // Convert to hours
    let intensityFactor = 0.7; // Default moderate intensity
    
    if (route.average_watts && route.max_watts) {
      // Power-based TSS calculation
      const normalizedPower = route.normalized_power || route.average_watts;
      intensityFactor = normalizedPower / (route.max_watts * 0.95); // Estimate FTP as 95% of max
    } else if (route.average_heartrate) {
      // HR-based estimation
      const maxHR = route.max_heartrate || 190; // Default max HR
      const hrRatio = route.average_heartrate / maxHR;
      intensityFactor = Math.min(hrRatio, 1.0);
    }
    
    const routeTSS = duration * Math.pow(intensityFactor, 2) * 100;
    totalTSS += Math.min(routeTSS, 300); // Cap individual ride TSS at 300
  });
  
  return totalTSS;
}

function calculateIntensityDistribution(stravaRoutes) {
  if (stravaRoutes.length === 0) return { low: 0, moderate: 0, high: 0 };
  
  let low = 0, moderate = 0, high = 0;
  
  stravaRoutes.forEach(route => {
    let intensity = 'moderate'; // Default
    
    if (route.average_heartrate) {
      const maxHR = route.max_heartrate || 190;
      const hrRatio = route.average_heartrate / maxHR;
      
      if (hrRatio < 0.7) intensity = 'low';
      else if (hrRatio > 0.85) intensity = 'high';
      else intensity = 'moderate';
    } else if (route.average_speed) {
      // Speed-based intensity estimation
      const speed = route.average_speed > 100 ? route.average_speed : route.average_speed * 3.6;
      if (speed < 20) intensity = 'low';
      else if (speed > 30) intensity = 'high';
      else intensity = 'moderate';
    }
    
    if (intensity === 'low') low++;
    else if (intensity === 'moderate') moderate++;
    else high++;
  });
  
  const total = stravaRoutes.length;
  return {
    low: (low / total) * 100,
    moderate: (moderate / total) * 100,
    high: (high / total) * 100
  };
}

function calculateEfficiencyFactor(stravaRoutes) {
  const routesWithBothMetrics = stravaRoutes.filter(r => 
    r.average_watts && r.average_heartrate && 
    r.average_watts > 0 && r.average_heartrate > 0
  );
  
  if (routesWithBothMetrics.length === 0) return 0;
  
  // Efficiency Factor = Normalized Power / Average Heart Rate
  const efficiencySum = routesWithBothMetrics.reduce((sum, route) => {
    const power = route.normalized_power || route.average_watts;
    return sum + (power / route.average_heartrate);
  }, 0);
  
  return efficiencySum / routesWithBothMetrics.length;
}

export default SmartRideAnalysis;