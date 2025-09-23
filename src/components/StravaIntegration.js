// Clean backup - this was working before the edits
import React, { useState, useEffect } from 'react';
import {
  Paper,
  Text,
  Button,
  Group,
  Stack,
  Card,
  Badge,
  Alert,
  Loader,
  Center,
  Progress,
  Avatar,
  Tooltip,
  SimpleGrid,
} from '@mantine/core';
import {
  Activity,
  Users,
  MapPin,
  Calendar,
  TrendingUp,
  Download,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { stravaService } from '../utils/stravaService';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const StravaIntegration = () => {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [athlete, setAthlete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [lastImport, setLastImport] = useState(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      setLoading(true);
      const isConnected = stravaService.isConnected();
      setConnected(isConnected);

      if (isConnected) {
        try {
          const athleteData = await stravaService.getAthlete();
          setAthlete(athleteData);
          
          // Check last import date
          await checkLastImport();
        } catch (error) {
          console.warn('Failed to fetch athlete data:', error);
          // Token might be expired, disconnect
          if (error.message.includes('401') || error.message.includes('unauthorized')) {
            stravaService.disconnect();
            setConnected(false);
            setAthlete(null);
          }
        }
      }
    } catch (error) {
      console.error('Error checking Strava connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkLastImport = async () => {
    try {
      const { data, error } = await supabase
        .from('strava_imports')
        .select('imported_at, activities_imported')
        .eq('user_id', user.id)
        .order('imported_at', { ascending: false })
        .limit(1);

      if (error && error.code !== 'PGRST116') { // Not a "table doesn't exist" error
        console.error('Error checking last import:', error);
        return;
      }

      if (data && data.length > 0) {
        setLastImport(data[0]);
      }
    } catch (error) {
      console.error('Error checking last import:', error);
    }
  };

  const handleConnect = () => {
    if (!stravaService.isConfigured()) {
      toast.error('Strava integration not configured. Please check your environment variables.');
      return;
    }

    try {
      // Debug: Log the redirect URI being used
      console.log('🔍 Strava Configuration:', {
        redirectUri: stravaService.redirectUri,
        clientId: stravaService.clientId,
        windowOrigin: window.location.origin
      });
      
      const authUrl = stravaService.getAuthorizationUrl();
      console.log('🔗 Full Auth URL:', authUrl);
      
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error generating Strava auth URL:', error);
      toast.error('Failed to initiate Strava connection');
    }
  };

  const handleDisconnect = () => {
    stravaService.disconnect();
    setConnected(false);
    setAthlete(null);
    setLastImport(null);
    toast.success('Disconnected from Strava');
  };

  const importActivities = async (importType = 'recent', customLimit = null, overrideExisting = false) => {
    if (!connected) {
      toast.error('Please connect to Strava first');
      return;
    }

    try {
      setImporting(true);
      setImportProgress(10);

      console.log('🚴 Starting Strava activity import...', { importType, customLimit, overrideExisting });

      // Handle existing routes based on override setting
      let existingStravaIds = new Set();

      if (overrideExisting) {
        console.log('🔄 Override mode: Will replace existing routes with complete GPS data');
        // Get existing routes to delete them after successful import
        const existingRoutes = await getExistingStravaRoutes();
        console.log(`📋 Found ${existingRoutes.length} existing Strava routes to replace`);
      } else {
        // Get existing Strava IDs from our database to avoid duplicates
        existingStravaIds = await getExistingStravaIds();
        console.log(`📋 Found ${existingStravaIds.size} existing activities in database`);
      }
      
      let allActivities = [];
      let afterDate = null;
      
      if (importType === 'all') {
        // Import ALL activities with pagination (skip duplicates during fetch)
        console.log('🔄 Importing ALL historical activities...');
        allActivities = await importAllActivitiesOptimized(existingStravaIds);
      } else {
        // For recent imports, use the latest activity date as starting point
        afterDate = await getLatestActivityDate();
        if (afterDate) {
          console.log(`📅 Fetching activities after: ${afterDate.toISOString()}`);
        } else {
          // Fallback to last 6 months if no existing activities
          afterDate = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
          console.log(`📅 No existing activities found, fetching from: ${afterDate.toISOString()}`);
        }
        
        const limit = customLimit || 50;
        allActivities = await stravaService.getActivities({
          perPage: limit,
          after: Math.floor(afterDate.getTime() / 1000) // Strava expects Unix timestamp
        });
        
        // Filter out existing activities
        allActivities = allActivities.filter(activity => !existingStravaIds.has(activity.id.toString()));
        console.log(`📊 After filtering duplicates: ${allActivities.length} new activities to process`);
      }

      setImportProgress(30);

      // Process all the fetched activities
      const { imported, skipped, replaced } = await processActivities(allActivities, importType, existingStravaIds, overrideExisting);
      
      // Record the import
      const { error: importRecordError } = await supabase
        .from('strava_imports')
        .insert([{
          user_id: user.id,
          activities_imported: imported,
          activities_skipped: skipped,
          imported_at: new Date().toISOString()
        }]);

      if (importRecordError) {
        console.error('Error recording import:', importRecordError);
      }

      setImportProgress(100);
      
      if (imported === 0 && skipped === 0 && (replaced || 0) === 0) {
        toast.info('No new activities found to import');
      } else {
        let message;
        if (overrideExisting && replaced > 0) {
          message = `Successfully re-imported ${replaced} activities with complete GPS data!`;
          if (imported > 0) message += ` Plus ${imported} new activities.`;
          if (skipped > 0) message += ` (${skipped} skipped)`;
        } else {
          message = importType === 'all'
            ? `Successfully imported ${imported} new activities from your entire Strava history! (${skipped} skipped as duplicates)`
            : `Successfully imported ${imported} new activities! (${skipped} skipped as duplicates)`;
        }

        toast.success(message);
      }
      
      await checkLastImport();

    } catch (error) {
      console.error('Error importing Strava activities:', error);
      toast.error('Failed to import activities from Strava');
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };
  
  // Get existing Strava IDs from database
  const getExistingStravaIds = async () => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('strava_id')
        .eq('user_id', user.id)
        .not('strava_id', 'is', null);

      if (error) {
        console.error('Error fetching existing Strava IDs:', error);
        return new Set();
      }

      return new Set(data.map(route => route.strava_id.toString()));
    } catch (error) {
      console.error('Error getting existing Strava IDs:', error);
      return new Set();
    }
  };

  // Get existing Strava routes for override mode
  const getExistingStravaRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('id, strava_id, name')
        .eq('user_id', user.id)
        .not('strava_id', 'is', null);

      if (error) {
        console.error('Error fetching existing Strava routes:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting existing Strava routes:', error);
      return [];
    }
  };

  // Delete route and associated track points
  const deleteRouteWithTrackPoints = async (routeId) => {
    try {
      // Delete track points first (due to foreign key constraint)
      const { error: trackPointsError } = await supabase
        .from('track_points')
        .delete()
        .eq('route_id', routeId);

      if (trackPointsError) {
        console.error('Error deleting track points:', trackPointsError);
        return false;
      }

      // Delete the route
      const { error: routeError } = await supabase
        .from('routes')
        .delete()
        .eq('id', routeId);

      if (routeError) {
        console.error('Error deleting route:', routeError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting route with track points:', error);
      return false;
    }
  };

  // Get the date of the latest activity in our database
  const getLatestActivityDate = async () => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('recorded_at')
        .eq('user_id', user.id)
        .not('strava_id', 'is', null)
        .order('recorded_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching latest activity date:', error);
        return null;
      }

      return data.length > 0 ? new Date(data[0].recorded_at) : null;
    } catch (error) {
      console.error('Error getting latest activity date:', error);
      return null;
    }
  };

  // Optimized import for all activities that skips known duplicates
  const importAllActivitiesOptimized = async (existingStravaIds) => {
    console.log('🔄 Starting optimized complete historical import...');
    let allNewActivities = [];
    let page = 1;
    const perPage = 200; // Max allowed by Strava API
    let hasMoreData = true;
    
    try {
      while (hasMoreData) {
        console.log(`📊 Fetching page ${page} (${perPage} activities per page)...`);
        
        const pageActivities = await stravaService.getActivities({
          perPage: perPage,
          page: page
        });
        
        if (pageActivities.length === 0) {
          hasMoreData = false;
          console.log('✅ No more activities found - import complete!');
        } else {
          // Filter out activities we already have
          const newActivities = pageActivities.filter(activity => 
            !existingStravaIds.has(activity.id.toString())
          );
          
          allNewActivities = allNewActivities.concat(newActivities);
          console.log(`📈 Fetched ${pageActivities.length} activities, ${newActivities.length} new (total new: ${allNewActivities.length})`);
          
          page++;
          
          // Update progress during fetch
          setImportProgress(Math.min(10 + (page / 50) * 20, 30)); // 10-30% for fetching
          
          // Rate limiting - pause between requests to avoid hitting API limits
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
          
          // If we haven't found any new activities in this page and we have some existing data,
          // we might have reached activities we already imported
          if (newActivities.length === 0 && existingStravaIds.size > 0) {
            console.log('🔍 No new activities found in this batch, likely reached existing data');
            // Continue for a few more pages to be sure, but if next few are also empty, stop
          }
        }
        
        // Safety check to prevent infinite loops
        if (page > 50) {
          console.warn('⚠️ Reached maximum page limit (50 pages = 10,000 activities)');
          toast.info('Imported first 10,000 activities. Contact support if you need more.');
          break;
        }
      }
      
      console.log(`🎯 Total NEW activities fetched: ${allNewActivities.length}`);
      return allNewActivities;
      
    } catch (error) {
      console.error('Error during optimized historical import:', error);
      throw error;
    }
  };

  // Import ALL activities with pagination (legacy function - kept for compatibility)
  const importAllActivities = async () => {
    const existingStravaIds = await getExistingStravaIds();
    return await importAllActivitiesOptimized(existingStravaIds);
  };
  
  // Extract activity processing logic for reuse
  const processActivities = async (activities, importType = 'import', existingStravaIds = new Set(), overrideExisting = false) => {
    const cyclingActivities = activities.filter(activity => 
      activity.type === 'Ride' || activity.type === 'VirtualRide'
    );

    console.log(`📊 Found ${cyclingActivities.length} cycling activities to process`);

    if (cyclingActivities.length === 0) {
      return { imported: 0, skipped: 0, replaced: 0 };
    }

    let imported = 0;
    let skipped = 0;
    let replaced = 0;
    const baseProgress = importType === 'all' ? 30 : 30; // Account for fetching progress

    for (let i = 0; i < cyclingActivities.length; i++) {
      const activity = cyclingActivities[i];
      const progress = baseProgress + ((i / cyclingActivities.length) * (100 - baseProgress));
      setImportProgress(progress);

      try {
        // Handle existing activities based on override setting
        const activityExists = existingStravaIds.has(activity.id.toString());

        if (activityExists && !overrideExisting) {
          console.log(`⏭️ Skipping existing activity: ${activity.name} (${activity.id})`);
          skipped++;
          continue;
        } else if (activityExists && overrideExisting) {
          console.log(`🔄 Replacing existing activity: ${activity.name} (${activity.id})`);

          // Delete existing route and track points
          const existingRoute = await supabase
            .from('routes')
            .select('id')
            .eq('user_id', user.id)
            .eq('strava_id', activity.id.toString())
            .single();

          if (existingRoute.data?.id) {
            const deleteSuccess = await deleteRouteWithTrackPoints(existingRoute.data.id);
            if (!deleteSuccess) {
              console.error(`Failed to delete existing route for activity ${activity.id}`);
              skipped++;
              continue;
            }
          }
        }

        // Convert Strava activity to our format
        const convertedActivity = stravaService.convertStravaActivity(activity);

        console.log('Converting activity:', {
          id: activity.id,
          name: activity.name,
          distance: activity.distance,
          start_date: activity.start_date
        });

        // Fetch GPS track points if available
        let trackPoints = [];
        let actualHasGpsData = false;
        try {
          if (activity.start_latlng && activity.start_latlng.length === 2) {
            console.log(`📍 Fetching GPS streams for activity ${activity.id}...`);
            const streams = await stravaService.getActivityStreams(activity.id, ['latlng', 'time', 'altitude']);

            if (streams && streams.latlng && streams.latlng.data && streams.latlng.data.length > 0) {
              console.log(`✅ Got ${streams.latlng.data.length} GPS points for activity ${activity.id}`);

              // Convert Strava streams to our track points format
              trackPoints = streams.latlng.data.map((latLng, index) => ({
                latitude: latLng[0],
                longitude: latLng[1],
                elevation: streams.altitude?.data?.[index] || null,
                time_seconds: streams.time?.data?.[index] || index,
                point_index: index
              }));

              actualHasGpsData = true;
            } else {
              console.log(`⚠️ No GPS data in streams for activity ${activity.id}`);
            }
          } else {
            console.log(`⚠️ Activity ${activity.id} has no start coordinates, skipping GPS fetch`);
          }
        } catch (streamError) {
          console.warn(`Failed to fetch GPS streams for activity ${activity.id}:`, streamError.message);
          // Continue with import even if streams fail
        }

        // Prepare data for database insertion with new schema
        const routeData = {
          user_id: user.id,
          name: convertedActivity.name || `Ride ${new Date(activity.start_date).toLocaleDateString()}`,
          description: activity.description || null,
          activity_type: (activity.type || 'ride').toLowerCase(),
          
          // Strava integration
          strava_id: convertedActivity.strava_id,
          imported_from: 'strava',
          
          // Core metrics
          distance_km: convertedActivity.distance_km || 0,
          duration_seconds: convertedActivity.duration_seconds || 0,
          elevation_gain_m: convertedActivity.elevation_gain_m || 0,
          elevation_loss_m: convertedActivity.elevation_loss_m || 0,
          
          // Performance metrics
          average_speed: convertedActivity.average_speed || null,
          max_speed: convertedActivity.max_speed || null,
          average_pace: convertedActivity.average_speed ? (60 / convertedActivity.average_speed) : null,
          
          // Heart rate data
          average_heartrate: convertedActivity.average_heartrate || null,
          max_heartrate: convertedActivity.max_heartrate || null,
          
          // Power data
          average_watts: convertedActivity.average_watts || null,
          max_watts: convertedActivity.max_watts || null,
          kilojoules: convertedActivity.kilojoules || null,
          
          // Location data
          start_latitude: convertedActivity.start_latitude || null,
          start_longitude: convertedActivity.start_longitude || null,
          
          // Bounding box
          bounds_north: convertedActivity.bounds_north || null,
          bounds_south: convertedActivity.bounds_south || null,
          bounds_east: convertedActivity.bounds_east || null,
          bounds_west: convertedActivity.bounds_west || null,
          
          // Data availability flags
          has_gps_data: actualHasGpsData,
          track_points_count: trackPoints.length,
          has_heart_rate_data: !!convertedActivity.average_heartrate,
          has_power_data: !!convertedActivity.average_watts,
          
          // Timing
          recorded_at: convertedActivity.start_date,
          uploaded_at: activity.upload_id_str ? new Date().toISOString() : null,
          
          // File info
          filename: `strava_${convertedActivity.strava_id}.json`,
          
          // External links
          strava_url: `https://www.strava.com/activities/${convertedActivity.strava_id}`
        };
        
        console.log('Inserting route data:', routeData);

        // Save route to database and get the route ID
        const { data: routeResult, error: insertError } = await supabase
          .from('routes')
          .insert([routeData])
          .select('id')
          .single();

        if (insertError) {
          console.error('Error inserting activity:', {
            error: insertError,
            activityId: activity.id,
            activityName: activity.name,
            routeData: routeData
          });
          console.error('Full error details:', JSON.stringify(insertError, null, 2));
        } else {
          console.log(`✅ Successfully imported activity: ${activity.name}`);

          // Save track points if we have them
          if (trackPoints.length > 0 && routeResult?.id) {
            console.log(`📍 Saving ${trackPoints.length} track points for route ${routeResult.id}...`);

            const trackPointsWithRouteId = trackPoints.map(point => ({
              ...point,
              route_id: routeResult.id
            }));

            // Insert track points in batches to avoid Supabase limits
            const batchSize = 1000;
            let totalInserted = 0;

            for (let i = 0; i < trackPointsWithRouteId.length; i += batchSize) {
              const batch = trackPointsWithRouteId.slice(i, i + batchSize);

              const { error: trackPointsError } = await supabase
                .from('track_points')
                .insert(batch);

              if (trackPointsError) {
                console.error(`Error inserting track points batch ${i}-${i + batch.length}:`, trackPointsError);
                // Continue with next batch even if one fails
              } else {
                totalInserted += batch.length;
                console.log(`✅ Saved batch: ${batch.length} points (${totalInserted}/${trackPoints.length} total)`);
              }

              // Small delay between batches
              if (i + batchSize < trackPointsWithRouteId.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }

            console.log(`✅ Successfully saved ${totalInserted}/${trackPoints.length} track points`);
          }

          if (activityExists && overrideExisting) {
            replaced++;
          } else {
            imported++;
          }
        }

      } catch (activityError) {
        console.error(`Error processing activity ${activity.id}:`, activityError);
      }

      // Longer delay to avoid rate limiting (streams requests are more intensive)
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return { imported, skipped, replaced };
  };

  if (loading) {
    return (
      <Paper shadow="sm" p="md">
        <Center>
          <Loader />
        </Center>
      </Paper>
    );
  }

  return (
    <Paper shadow="sm" p="md">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group>
            <Avatar src="https://developers.strava.com/images/strava-logo.svg" size="sm" />
            <div>
              <Text size="lg" fw={600}>Strava Integration</Text>
              <Text size="sm" c="dimmed">Import your cycling activities for better route recommendations</Text>
            </div>
          </Group>
          
          {connected ? (
            <Badge color="green" leftSection={<CheckCircle size={12} />}>
              Connected
            </Badge>
          ) : (
            <Badge color="gray" leftSection={<XCircle size={12} />}>
              Not Connected
            </Badge>
          )}
        </Group>

        {!connected ? (
          /* Connection Card */
          <Card withBorder p="lg">
            <Stack align="center" gap="md">
              <Activity size={48} color="#FC4C02" />
              <div style={{ textAlign: 'center' }}>
                <Text size="xl" fw={600} mb="xs">Connect Your Strava Account</Text>
                <Text size="sm" c="dimmed" mb="lg">
                  Import your cycling activities to get personalized route recommendations based on your actual riding patterns.
                </Text>
              </div>
              
              <Group gap="lg" style={{ textAlign: 'center' }}>
                <div>
                  <MapPin size={20} color="#666" />
                  <Text size="xs" mt="xs">Route Patterns</Text>
                </div>
                <div>
                  <TrendingUp size={20} color="#666" />
                  <Text size="xs" mt="xs">Performance Data</Text>
                </div>
                <div>
                  <Calendar size={20} color="#666" />
                  <Text size="xs" mt="xs">Activity History</Text>
                </div>
              </Group>

              {/* Debug Info - Remove after fixing */}
              <Card withBorder p="sm" bg="yellow.0">
                <Text size="xs" fw={600} mb="xs">Debug: OAuth Configuration</Text>
                <Stack gap={4}>
                  <Text size="xs" style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    Redirect: {stravaService.redirectUri || 'Not set'}
                  </Text>
                  <Text size="xs" style={{ fontFamily: 'monospace' }}>
                    Origin: {window.location.origin}
                  </Text>
                  <Text size="xs" style={{ fontFamily: 'monospace' }}>
                    Client: {stravaService.clientId || 'Not set'}
                  </Text>
                </Stack>
              </Card>

              <Button 
                size="lg"
                color="orange"
                leftSection={<ExternalLink size={20} />}
                onClick={handleConnect}
                style={{ backgroundColor: '#FC4C02' }}
              >
                Connect to Strava
              </Button>
              
              <Text size="xs" c="dimmed" style={{ textAlign: 'center' }}>
                We'll only access your cycling activities and basic profile information.
              </Text>
            </Stack>
          </Card>
        ) : (
          /* Connected State */
          <Stack gap="md">
            {/* Athlete Info */}
            <Card withBorder p="md">
              <Group justify="space-between">
                <Group>
                  <Avatar 
                    src={athlete?.profile_medium || athlete?.profile} 
                    size="lg" 
                    alt={`${athlete?.firstname} ${athlete?.lastname}`}
                  />
                  <div>
                    <Text size="lg" fw={600}>
                      {athlete?.firstname} {athlete?.lastname}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {athlete?.city}, {athlete?.state} {athlete?.country}
                    </Text>
                    <Group gap="xs" mt="xs">
                      <Badge size="sm" variant="light">
                        <Users size={12} /> {athlete?.follower_count} followers
                      </Badge>
                      <Badge size="sm" variant="light">
                        <Activity size={12} /> {athlete?.friend_count} following
                      </Badge>
                    </Group>
                  </div>
                </Group>
                
                <Button 
                  variant="light" 
                  color="red" 
                  onClick={handleDisconnect}
                >
                  Disconnect
                </Button>
              </Group>
            </Card>

            {/* Import Activities */}
            <Card withBorder p="md">
              <div>
                <Text size="md" fw={600} mb="xs">Import Activities</Text>
                <Text size="sm" c="dimmed" mb="md">
                  Import new activities or re-import existing ones with complete GPS data
                </Text>
              </div>

              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                  <Tooltip label="Import recent activities not yet in your database">
                    <Button
                      leftSection={importing ? <Loader size={16} /> : <Download size={16} />}
                      onClick={() => importActivities('recent', 50)}
                      loading={importing}
                      disabled={importing}
                      variant="filled"
                      fullWidth
                    >
                      {importing ? 'Importing...' : 'Import New'}
                    </Button>
                  </Tooltip>

                  <Tooltip label="Import all missing activities from your Strava history">
                    <Button
                      leftSection={importing ? <Loader size={16} /> : <RefreshCw size={16} />}
                      onClick={() => importActivities('all')}
                      loading={importing}
                      disabled={importing}
                      variant="outline"
                      color="orange"
                      fullWidth
                    >
                      {importing ? 'Importing...' : 'Import All Missing'}
                    </Button>
                  </Tooltip>

                  <Tooltip label="Re-import all activities with complete GPS track data (replaces existing)">
                    <Button
                      leftSection={importing ? <Loader size={16} /> : <RefreshCw size={16} />}
                      onClick={() => importActivities('all', null, true)}
                      loading={importing}
                      disabled={importing}
                      variant="outline"
                      color="red"
                      fullWidth
                    >
                      {importing ? 'Re-importing...' : 'Re-import with GPS'}
                    </Button>
                  </Tooltip>
                </SimpleGrid>

              {importing && (
                <Progress value={importProgress} size="sm" mb="md" />
              )}

              {lastImport && (
                <Alert color="blue" variant="light">
                  <Text size="sm">
                    Last import: {new Date(lastImport.imported_at).toLocaleString()} 
                    ({lastImport.activities_imported} activities imported)
                  </Text>
                </Alert>
              )}
            </Card>

            {/* Benefits */}
            <Card withBorder p="md">
              <Text size="md" fw={600} mb="sm">What you'll get:</Text>
              <Stack gap="xs">
                <Group>
                  <CheckCircle size={16} color="green" />
                  <Text size="sm">Routes based on your actual riding patterns</Text>
                </Group>
                <Group>
                  <CheckCircle size={16} color="green" />
                  <Text size="sm">Personalized distance and elevation preferences</Text>
                </Group>
                <Group>
                  <CheckCircle size={16} color="green" />
                  <Text size="sm">Activity analysis and performance insights</Text>
                </Group>
                <Group>
                  <CheckCircle size={16} color="green" />
                  <Text size="sm">Smart route recommendations for your fitness level</Text>
                </Group>
              </Stack>
            </Card>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
};

export default StravaIntegration;