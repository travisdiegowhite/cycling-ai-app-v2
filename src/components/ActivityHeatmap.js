import React, { useMemo, useState } from 'react';
import { Paper, Title, Text, Group, Tooltip, Select, Badge } from '@mantine/core';
import dayjs from 'dayjs';
import minMax from 'dayjs/plugin/minMax';
import { getRouteDate } from '../utils/dateUtils';

dayjs.extend(minMax);

const ActivityHeatmap = ({ routes, formatDistance }) => {
  const [selectedYear, setSelectedYear] = useState('latest'); // 'latest', 'peak', or specific year
  
  
  // Generate heatmap data for the last year  
  const heatmapData = useMemo(() => {
    if (!routes || routes.length === 0) {
      return [];
    }
    
    try {
      console.log('🗓️ ActivityHeatmap: Processing', routes.length, 'routes');
    console.log('🔍 First 3 routes:', routes.slice(0, 3).map(r => ({
      id: r.id,
      name: r.name,
      created_at: r.created_at,
      distance_km: r.distance_km
    })));
    
    const today = dayjs();
    // Show last 52 weeks
    let startDate = today.subtract(52, 'weeks').startOf('week');
    let endDate = today.endOf('week');
    
    // Debug: log the date range we're showing
    console.log('📅 Date range:', {
      start: startDate.format('YYYY-MM-DD'),
      end: endDate.format('YYYY-MM-DD')
    });
    
    // Find the actual date range of the data (using proper route dates)
    if (routes.length > 0) {
      const routeDates = routes
        .map(r => {
          const routeDate = getRouteDate(r);
          return routeDate;
        })
        .filter(date => date && date.isValid());
        
      if (routeDates.length > 0) {
        const earliestRoute = dayjs.min(routeDates);
        const latestRoute = dayjs.max(routeDates);
        
        console.log('🎯 Actual data range:', {
          earliest: earliestRoute.format('YYYY-MM-DD'),
          latest: latestRoute.format('YYYY-MM-DD'),
          totalSpan: latestRoute.diff(earliestRoute, 'years', true).toFixed(1) + ' years'
        });
        
        // Show year distribution
        const yearCounts = {};
        routeDates.forEach(date => {
          const year = date.year();
          yearCounts[year] = (yearCounts[year] || 0) + 1;
        });
        const yearEntries = Object.entries(yearCounts)
          .sort(([a], [b]) => a - b);
          
        console.log('📅 Activity by year:', yearEntries
          .map(([year, count]) => `${year}: ${count} rides`)
        );
        
        console.log('📅 Recent years:', yearEntries.slice(-5)
          .map(([year, count]) => `${year}: ${count} rides`)
        );
        
        // Debug: Check if we have any recent data
        const recentYears = yearEntries.filter(([year]) => parseInt(year) >= 2024);
        console.log('🔍 2024+ data:', recentYears.length ? recentYears : 'No 2024+ data found');
        
        // Determine which time period to show based on selection
        if (selectedYear === 'latest') {
          // Show the last 52 weeks from today (current activity)
          endDate = today.endOf('week');
          startDate = today.subtract(52, 'weeks').startOf('week');
        } else if (selectedYear === 'peak') {
          // Find the year with most activity
          const peakYear = Object.entries(yearCounts)
            .sort(([,a], [,b]) => b - a)[0][0];
          startDate = dayjs(`${peakYear}-01-01`).startOf('week');
          endDate = dayjs(`${peakYear}-12-31`).endOf('week');
        } else {
          // Show specific year
          const year = parseInt(selectedYear);
          startDate = dayjs(`${year}-01-01`).startOf('week');
          endDate = dayjs(`${year}-12-31`).endOf('week');
        }
        
        console.log('📊 Showing period:', {
          selection: selectedYear,
          start: startDate.format('YYYY-MM-DD'),
          end: endDate.format('YYYY-MM-DD')
        });
      }
    }
    
    // Create a map of date -> activity data
    const activityMap = {};
    routes.forEach(route => {
      const routeDate = getRouteDate(route);
      
      if (!routeDate.isValid()) {
        console.warn('⚠️ Route with invalid date:', route.id, route.name);
        return;
      }
      
      const dateStr = routeDate.format('YYYY-MM-DD');
      
      // Debug specific route dates - show first 5 and any from 2024+
      const routeYear = routeDate.year();
      if (routes.indexOf(route) < 5 || routeYear >= 2024) {
        console.log('📍 Route date parsing:', {
          routeName: route.name,
          created_at: route.created_at,
          recorded_at: route.recorded_at,
          parsedDate: dateStr,
          parsedYear: routeYear,
          distance: route.distance_km,
          isRecent: routeYear >= 2024 ? '🔥 RECENT!' : ''
        });
      }
      
      if (!activityMap[dateStr]) {
        activityMap[dateStr] = {
          rides: 0,
          distance: 0,
          elevation: 0
        };
      }
      activityMap[dateStr].rides += 1;
      activityMap[dateStr].distance += route.distance_km || 0;
      activityMap[dateStr].elevation += route.elevation_gain_m || 0;
    });
    
    console.log('🗂️ Activity map created:', Object.keys(activityMap).length, 'days with activity');
    console.log('📈 Sample activities:', Object.entries(activityMap).slice(0, 5));
    console.log('🔍 Activity map keys (first 10):', Object.keys(activityMap).slice(0, 10));
    
    // Show latest 10 activity dates to understand data range
    const latestActivityDates = Object.keys(activityMap)
      .sort()
      .slice(-10);
    console.log('🕐 Latest activity dates in map:', latestActivityDates);
    

    // Generate weeks array
    const weeks = [];
    let currentWeek = [];
    let currentDate = startDate;

    while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
      const dateStr = currentDate.format('YYYY-MM-DD');
      const activity = activityMap[dateStr] || { rides: 0, distance: 0, elevation: 0 };
      
      // Determine intensity level (0-4) based on distance
      let level = 0;
      if (activity.distance > 0) {
        if (activity.distance >= 100) level = 4; // Epic ride
        else if (activity.distance >= 50) level = 3; // Long ride
        else if (activity.distance >= 20) level = 2; // Medium ride
        else level = 1; // Short ride
      }

      currentWeek.push({
        date: currentDate.toDate(),
        dateStr,
        level,
        activity,
        dayOfWeek: currentDate.day()
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      currentDate = currentDate.add(1, 'day');
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    console.log('📊 Final heatmap data:', {
      weeksGenerated: weeks.length,
      totalDays: weeks.reduce((sum, week) => sum + week.length, 0),
      daysWithActivity: weeks.flat().filter(day => day.level > 0).length,
      sampleWeek: weeks[0] ? weeks[0].map(d => ({
        date: d.dateStr,
        level: d.level,
        rides: d.activity.rides
      })) : []
    });
    
    return weeks;
    
    } catch (error) {
      console.error('❌ Error in ActivityHeatmap processing:', error);
      console.error('Error stack:', error.stack);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      return []; // Return empty array on error
    }
  }, [routes, selectedYear]);


  // Color scheme for cycling (different from GitHub)
  const getColor = (level) => {
    switch (level) {
      case 0: return '#f1f5f9'; // Light gray for no activity
      case 1: return '#dbeafe'; // Light blue for short rides
      case 2: return '#93c5fd'; // Medium blue for medium rides  
      case 3: return '#3b82f6'; // Blue for long rides
      case 4: return '#1d4ed8'; // Dark blue for epic rides
      default: return '#f1f5f9';
    }
  };

  const days = ['', 'M', '', 'W', '', 'F', ''];

  // Create year options from actual data - must be before any conditional returns
  const yearOptions = useMemo(() => {
    if (!routes?.length) return [];
    
    const yearCounts = {};
    routes.forEach(route => {
      const routeDate = getRouteDate(route);
      if (routeDate.isValid()) {
        const year = routeDate.year();
        yearCounts[year] = (yearCounts[year] || 0) + 1;
      }
    });
    
    const peakYear = Object.entries(yearCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0];
    
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;
    
    const options = [
      { value: 'latest', label: `Last 52 Weeks (${lastYear}-${currentYear})` },
      { value: 'peak', label: `Peak Year (${peakYear} - ${yearCounts[peakYear]} rides)` },
    ];
    
    // Add individual years
    Object.entries(yearCounts)
      .sort(([a], [b]) => b - a)
      .forEach(([year, count]) => {
        options.push({ 
          value: year, 
          label: `${year} (${count} rides)` 
        });
      });
    
    return options;
  }, [routes]);

  if (!heatmapData || heatmapData.length === 0) {
    return (
      <Paper p="md" withBorder>
        <Group justify="space-between" mb="md">
          <div>
            <Title order={4}>Activity Heatmap</Title>
            <Text size="sm" c="red">No activity data available for heatmap</Text>
          </div>
        </Group>
      </Paper>
    );
  }

  const activeDays = heatmapData.flat().filter(d => d.level > 0).length;
  const totalDays = heatmapData.flat().length;

  return (
    <Paper p="md" withBorder style={{ backgroundColor: '#f8f9fa', border: '2px solid #228be6' }}>
      <Group justify="space-between" mb="md">
        <div>
          <Title order={4} c="blue">🗓️ Activity Heatmap ({heatmapData.length} weeks)</Title>
          <Text size="sm" c="dimmed">{activeDays} active days out of {totalDays} total days</Text>
        </div>
        
        <div>
          <Select
            value={selectedYear}
            onChange={setSelectedYear}
            data={yearOptions}
            size="sm"
            w={200}
            label="Time Period"
          />
          <Group gap="xs" mt="xs">
            <Badge size="sm" color="green">{activeDays} active</Badge>
            <Badge size="sm" variant="light">{Math.round((activeDays/totalDays)*100)}% active</Badge>
          </Group>
        </div>
      </Group>

      <div style={{ overflowX: 'auto' }}>
        {/* Improved layout with month blocks */}
        <div style={{ display: 'flex' }}>
          {/* Day labels */}
          <div style={{ display: 'flex', flexDirection: 'column', marginRight: '8px', paddingTop: '24px' }}>
            {days.map((day, index) => (
              <div
                key={index}
                style={{
                  height: '12px',
                  marginBottom: '2px',
                  fontSize: '10px',
                  color: '#6b7280',
                  lineHeight: '12px',
                  textAlign: 'right',
                  width: '12px'
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Group weeks by month for better alignment */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {(() => {
              // Group weeks by month
              const monthGroups = {};
              heatmapData.forEach((week, weekIndex) => {
                if (week.length > 0) {
                  const monthKey = dayjs(week[0].date).format('YYYY-MM');
                  const monthName = dayjs(week[0].date).format('MMM');
                  
                  if (!monthGroups[monthKey]) {
                    monthGroups[monthKey] = {
                      name: monthName,
                      weeks: [],
                      fullName: dayjs(week[0].date).format('MMM YYYY')
                    };
                  }
                  monthGroups[monthKey].weeks.push({ ...week, weekIndex });
                }
              });

              return Object.entries(monthGroups).map(([monthKey, monthData]) => (
                <div key={monthKey} style={{ display: 'flex', flexDirection: 'column' }}>
                  {/* Month header */}
                  <div style={{ 
                    height: '20px', 
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Text size="xs" fw={500} c="blue.7" style={{
                      fontSize: '11px',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      width: `${monthData.weeks.length * 14}px`
                    }}>
                      {monthData.name}
                    </Text>
                  </div>
                  
                  {/* Month weeks */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '2px',
                    border: '1px solid #e1e7ef',
                    borderRadius: '4px',
                    padding: '4px',
                    backgroundColor: '#f8fafc'
                  }}>
                    {monthData.weeks.map((week, monthWeekIndex) => (
                      <div key={`${monthKey}-${monthWeekIndex}`} style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '2px' 
                      }}>
                        {week.map((day, dayIndex) => (
                          <Tooltip
                            key={`${monthKey}-${monthWeekIndex}-${dayIndex}`}
                            label={
                              <div>
                                <Text size="xs" fw={500}>
                                  {dayjs(day.date).format('MMM D, YYYY')}
                                </Text>
                                {day.activity.rides > 0 ? (
                                  <div>
                                    <Text size="xs">
                                      {day.activity.rides} ride{day.activity.rides > 1 ? 's' : ''}
                                    </Text>
                                    <Text size="xs">
                                      {formatDistance(day.activity.distance)}
                                    </Text>
                                    <Text size="xs">
                                      ↗ {Math.round(day.activity.elevation)}m elevation
                                    </Text>
                                  </div>
                                ) : (
                                  <Text size="xs">No rides</Text>
                                )}
                              </div>
                            }
                            position="top"
                            withArrow
                          >
                            <div
                              style={{
                                width: '12px',
                                height: '12px',
                                backgroundColor: getColor(day.level),
                                borderRadius: '2px',
                                cursor: 'pointer',
                                border: '1px solid #e5e7eb'
                              }}
                            />
                          </Tooltip>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: '16px', gap: '8px' }}>
          <Text size="xs" c="dimmed">Less</Text>
          {[0, 1, 2, 3, 4].map(level => (
            <div
              key={level}
              style={{
                width: '12px',
                height: '12px',
                backgroundColor: getColor(level),
                borderRadius: '2px',
                border: '1px solid #e5e7eb'
              }}
            />
          ))}
          <Text size="xs" c="dimmed">More</Text>
          <Text size="xs" c="dimmed" style={{ marginLeft: '16px' }}>
            Based on distance: 0km, &lt;20km, 20-50km, 50-100km, 100km+
          </Text>
        </div>
      </div>
    </Paper>
  );
};

export default ActivityHeatmap;