import React, { useState, useEffect } from 'react';
import { Card, Text, Group, Badge, Stack, ActionIcon, Tooltip, Button } from '@mantine/core';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { WORKOUT_TYPES } from '../utils/trainingPlans';

/**
 * Training Calendar Component
 * Displays monthly calendar with planned workouts
 */
const TrainingCalendar = ({ activePlan }) => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [plannedWorkouts, setPlannedWorkouts] = useState([]);

  // Load planned workouts for current month
  useEffect(() => {
    if (!user?.id || !activePlan?.id) return;
    loadPlannedWorkouts();
  }, [user?.id, activePlan?.id, currentDate]);

  const loadPlannedWorkouts = async () => {
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      // Calculate which week numbers are in this month
      const planStartDate = new Date(activePlan.started_at);
      const weekNumbers = [];
      for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 7)) {
        const weeksSinceStart = Math.floor((d - planStartDate) / (7 * 24 * 60 * 60 * 1000)) + 1;
        if (weeksSinceStart > 0 && weeksSinceStart <= activePlan.duration_weeks) {
          weekNumbers.push(weeksSinceStart);
        }
      }

      const { data } = await supabase
        .from('planned_workouts')
        .select('*')
        .eq('plan_id', activePlan.id)
        .in('week_number', weekNumbers);

      if (data) {
        setPlannedWorkouts(data);
      }
    } catch (error) {
      console.error('Failed to load planned workouts:', error);
    }
  };

  // Get days in month
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  // Get workout for a specific date
  const getWorkoutForDate = (date) => {
    if (!date || !activePlan) return null;

    const planStartDate = new Date(activePlan.started_at);
    const daysSinceStart = Math.floor((date - planStartDate) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.floor(daysSinceStart / 7) + 1;
    const dayOfWeek = date.getDay();

    return plannedWorkouts.find(
      w => w.week_number === weekNumber && w.day_of_week === dayOfWeek
    );
  };

  // Navigate months
  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const days = getDaysInMonth();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <Card withBorder p="md">
      {/* Calendar Header */}
      <Group justify="space-between" mb="md">
        <Text size="lg" fw={600}>{monthName}</Text>
        <Group gap="xs">
          <ActionIcon variant="subtle" onClick={previousMonth}>
            <ChevronLeft size={18} />
          </ActionIcon>
          <ActionIcon variant="subtle" onClick={nextMonth}>
            <ChevronRight size={18} />
          </ActionIcon>
        </Group>
      </Group>

      {!activePlan && (
        <Text c="dimmed" ta="center" py="xl">
          No active training plan. Create a plan to start scheduling workouts.
        </Text>
      )}

      {activePlan && (
        <>
          {/* Day Names */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '4px',
            marginBottom: '8px'
          }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <Text key={day} size="xs" fw={600} c="dimmed" ta="center">
                {day}
              </Text>
            ))}
          </div>

          {/* Calendar Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '4px'
          }}>
            {days.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} style={{ minHeight: 80 }} />;
              }

              const workout = getWorkoutForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();
              const isPast = date < new Date() && !isToday;

              return (
                <Card
                  key={index}
                  withBorder
                  p="xs"
                  style={{
                    minHeight: 80,
                    backgroundColor: isToday ? '#e7f5ff' : isPast ? '#f8f9fa' : 'white',
                    border: isToday ? '2px solid #228be6' : '1px solid #dee2e6',
                    opacity: isPast ? 0.6 : 1
                  }}
                >
                  <Stack gap={4}>
                    <Text size="xs" fw={600}>
                      {date.getDate()}
                    </Text>
                    {workout && (
                      <Tooltip label={WORKOUT_TYPES[workout.workout_type]?.name || workout.workout_type}>
                        <Badge
                          size="xs"
                          color={WORKOUT_TYPES[workout.workout_type]?.color || 'gray'}
                          variant="light"
                          style={{ cursor: 'pointer' }}
                        >
                          {WORKOUT_TYPES[workout.workout_type]?.icon || '🚴'}
                        </Badge>
                      </Tooltip>
                    )}
                    {workout && (
                      <Text size="xs" c="dimmed">
                        {workout.target_duration}min
                      </Text>
                    )}
                    {workout?.completed && (
                      <Badge size="xs" color="green" variant="filled">
                        ✓
                      </Badge>
                    )}
                  </Stack>
                </Card>
              );
            })}
          </div>

          {/* Legend */}
          <Group gap="xs" mt="md">
            <Text size="xs" c="dimmed">Legend:</Text>
            {Object.entries(WORKOUT_TYPES).slice(1, 6).map(([key, type]) => (
              <Group gap={4} key={key}>
                <Text size="lg">{type.icon}</Text>
                <Text size="xs">{type.name}</Text>
              </Group>
            ))}
          </Group>
        </>
      )}
    </Card>
  );
};

export default TrainingCalendar;
