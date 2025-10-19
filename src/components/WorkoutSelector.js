import React, { useState, useMemo } from 'react';
import {
  Card,
  Select,
  Badge,
  Group,
  Text,
  Stack,
  Accordion,
  Button,
  Grid,
  NumberInput,
  MultiSelect,
  SegmentedControl,
  Alert,
  Divider,
  ActionIcon,
  Tooltip,
  Modal,
  Table
} from '@mantine/core';
import {
  Info,
  TrendingUp,
  Clock,
  Activity,
  Zap,
  Target,
  Filter,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import WORKOUT_LIBRARY_DEFAULT, { WORKOUT_LIBRARY, getWorkoutsByCategory, getWorkoutsByDifficulty } from '../data/workoutLibrary';
import { TRAINING_ZONES } from '../utils/trainingPlans';

// Use default export if named export doesn't exist
const LIBRARY = WORKOUT_LIBRARY || WORKOUT_LIBRARY_DEFAULT || {};

// Debug: Log library on load
console.log('Workout Library loaded:', {
  totalWorkouts: Object.keys(LIBRARY).length,
  firstWorkout: Object.keys(LIBRARY)[0],
  sampleWorkout: Object.values(LIBRARY)[0]
});

/**
 * Comprehensive Workout Selector Component
 * Allows users to browse and select from the complete workout library
 */
const WorkoutSelector = ({
  onWorkoutSelect,
  selectedWorkoutId = null,
  showFilters = true,
  compact = false
}) => {
  const [filters, setFilters] = useState({
    category: 'all',
    difficulty: 'all',
    minDuration: 0,
    maxDuration: 300,
    minTSS: 0,
    maxTSS: 200,
    tags: []
  });
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedWorkoutForDetail, setSelectedWorkoutForDetail] = useState(null);

  // Get all unique tags from workout library
  const allTags = useMemo(() => {
    const tags = new Set();
    Object.values(LIBRARY).forEach(workout => {
      workout.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, []);

  // Filter workouts based on current filters
  const filteredWorkouts = useMemo(() => {
    return Object.values(LIBRARY).filter(workout => {
      // Category filter
      if (filters.category !== 'all' && workout.category !== filters.category) {
        return false;
      }

      // Difficulty filter
      if (filters.difficulty !== 'all' && workout.difficulty !== filters.difficulty) {
        return false;
      }

      // Duration filter
      if (workout.duration < filters.minDuration || workout.duration > filters.maxDuration) {
        return false;
      }

      // TSS filter
      if (workout.targetTSS < filters.minTSS || workout.targetTSS > filters.maxTSS) {
        return false;
      }

      // Tags filter
      if (filters.tags.length > 0) {
        const hasAllTags = filters.tags.every(tag => workout.tags.includes(tag));
        if (!hasAllTags) return false;
      }

      return true;
    });
  }, [filters]);

  // Group workouts by category
  const workoutsByCategory = useMemo(() => {
    const grouped = {};
    filteredWorkouts.forEach(workout => {
      if (!grouped[workout.category]) {
        grouped[workout.category] = [];
      }
      grouped[workout.category].push(workout);
    });
    return grouped;
  }, [filteredWorkouts]);

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'recovery', label: 'Recovery' },
    { value: 'endurance', label: 'Endurance' },
    { value: 'tempo', label: 'Tempo' },
    { value: 'sweet_spot', label: 'Sweet Spot' },
    { value: 'threshold', label: 'Threshold' },
    { value: 'vo2max', label: 'VO2 Max' },
    { value: 'climbing', label: 'Climbing' },
    { value: 'anaerobic', label: 'Anaerobic' },
    { value: 'racing', label: 'Race Prep' }
  ];

  const difficultyOptions = [
    { value: 'all', label: 'All Levels' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
  ];

  const handleWorkoutClick = (workout) => {
    if (onWorkoutSelect) {
      onWorkoutSelect(workout);
    }
  };

  const showWorkoutDetail = (workout) => {
    setSelectedWorkoutForDetail(workout);
    setDetailModalOpen(true);
  };

  const resetFilters = () => {
    setFilters({
      category: 'all',
      difficulty: 'all',
      minDuration: 0,
      maxDuration: 300,
      minTSS: 0,
      maxTSS: 200,
      tags: []
    });
  };

  const WorkoutCard = ({ workout, isSelected }) => {
    const zoneInfo = workout.primaryZone ? TRAINING_ZONES[workout.primaryZone] : null;

    return (
      <Card
        withBorder
        p="md"
        style={{
          cursor: 'pointer',
          borderColor: isSelected ? 'var(--mantine-color-blue-6)' : undefined,
          borderWidth: isSelected ? 2 : 1,
          backgroundColor: isSelected ? 'var(--mantine-color-blue-0)' : undefined
        }}
        onClick={() => handleWorkoutClick(workout)}
      >
        <Stack gap="xs">
          <Group justify="space-between" align="flex-start">
            <div style={{ flex: 1 }}>
              <Text fw={600} size="sm">{workout.name}</Text>
              <Text size="xs" c="dimmed" lineClamp={2} mt={4}>
                {workout.description}
              </Text>
            </div>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                showWorkoutDetail(workout);
              }}
            >
              <Info size={16} />
            </ActionIcon>
          </Group>

          <Group gap="xs" wrap="wrap">
            <Badge size="sm" variant="light" leftSection={<Clock size={12} />}>
              {workout.duration}min
            </Badge>
            <Badge size="sm" variant="light" leftSection={<Activity size={12} />}>
              {workout.targetTSS} TSS
            </Badge>
            {zoneInfo && (
              <Badge size="sm" variant="light" color={zoneInfo.color}>
                {zoneInfo.name}
              </Badge>
            )}
            <Badge
              size="sm"
              variant="outline"
              color={
                workout.difficulty === 'beginner' ? 'green' :
                workout.difficulty === 'intermediate' ? 'yellow' : 'red'
              }
            >
              {workout.difficulty}
            </Badge>
          </Group>

          {workout.tags.some(tag => tag.includes('2025-research')) && (
            <Badge size="xs" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
              2025 Research-Backed
            </Badge>
          )}
        </Stack>
      </Card>
    );
  };

  const WorkoutDetailModal = ({ workout }) => {
    if (!workout) return null;

    const zoneInfo = workout.primaryZone ? TRAINING_ZONES[workout.primaryZone] : null;

    return (
      <Modal
        opened={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={<Text fw={700} size="lg">{workout.name}</Text>}
        size="lg"
      >
        <Stack gap="md">
          {/* Quick Stats */}
          <Group gap="xs" wrap="wrap">
            <Badge size="lg" variant="light" leftSection={<Clock size={14} />}>
              {workout.duration} minutes
            </Badge>
            <Badge size="lg" variant="light" leftSection={<Activity size={14} />}>
              {workout.targetTSS} TSS
            </Badge>
            <Badge size="lg" variant="light" leftSection={<Zap size={14} />}>
              IF: {workout.intensityFactor.toFixed(2)}
            </Badge>
            {zoneInfo && (
              <Badge size="lg" variant="filled" color={zoneInfo.color}>
                {zoneInfo.name}
              </Badge>
            )}
            <Badge
              size="lg"
              color={
                workout.difficulty === 'beginner' ? 'green' :
                workout.difficulty === 'intermediate' ? 'yellow' : 'red'
              }
            >
              {workout.difficulty}
            </Badge>
          </Group>

          <Divider />

          {/* Description */}
          <div>
            <Text size="sm" fw={600} mb="xs">Description</Text>
            <Text size="sm">{workout.description}</Text>
          </div>

          {/* Coach Notes */}
          {workout.coachNotes && (
            <Alert icon={<BookOpen size={16} />} title="Coach Notes" color="blue">
              <Text size="sm">{workout.coachNotes}</Text>
            </Alert>
          )}

          {/* Workout Structure */}
          <div>
            <Text size="sm" fw={600} mb="xs">Workout Structure</Text>
            <Card withBorder p="sm" bg="gray.0">
              {workout.structure.warmup && (
                <Text size="sm">
                  <strong>Warmup:</strong> {workout.structure.warmup.duration}min @ {workout.structure.warmup.powerPctFTP}% FTP
                </Text>
              )}

              {workout.structure.main && (
                <Text size="sm" mt="xs">
                  <strong>Main:</strong> {renderMainStructure(workout.structure.main)}
                </Text>
              )}

              {workout.structure.cooldown && (
                <Text size="sm" mt="xs">
                  <strong>Cooldown:</strong> {workout.structure.cooldown.duration}min @ {workout.structure.cooldown.powerPctFTP}% FTP
                </Text>
              )}
            </Card>
          </div>

          {/* Focus Area */}
          <div>
            <Text size="sm" fw={600} mb="xs">Training Focus</Text>
            <Badge size="lg" variant="light">
              {workout.focusArea.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>

          {/* Tags */}
          {workout.tags.length > 0 && (
            <div>
              <Text size="sm" fw={600} mb="xs">Tags</Text>
              <Group gap="xs">
                {workout.tags.map(tag => (
                  <Badge key={tag} size="sm" variant="outline">
                    {tag}
                  </Badge>
                ))}
              </Group>
            </div>
          )}

          {/* Action Button */}
          <Button
            fullWidth
            leftSection={<Target size={16} />}
            onClick={() => {
              handleWorkoutClick(workout);
              setDetailModalOpen(false);
            }}
          >
            Select This Workout
          </Button>
        </Stack>
      </Modal>
    );
  };

  const renderMainStructure = (main) => {
    if (Array.isArray(main)) {
      const firstItem = main[0];
      if (firstItem.type === 'repeat') {
        return `${firstItem.sets}x ${firstItem.work.duration}min @ ${firstItem.work.powerPctFTP}% FTP`;
      }
      return `${main.length} segments`;
    }
    return 'Custom structure';
  };

  // Early return if library is empty
  if (!LIBRARY || Object.keys(LIBRARY).length === 0) {
    return (
      <Alert icon={<Info size={16} />} title="Workout Library Not Loaded" color="red">
        The workout library failed to load. Please refresh the page or contact support.
      </Alert>
    );
  }

  if (compact) {
    // Compact mode - just a dropdown
    // Format data according to Mantine v8 grouped data requirements
    const workoutsByCategory = {};

    Object.values(LIBRARY).forEach(workout => {
      const categoryLabel = workout.category ?
        workout.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) :
        'Other';

      if (!workoutsByCategory[categoryLabel]) {
        workoutsByCategory[categoryLabel] = [];
      }

      workoutsByCategory[categoryLabel].push({
        value: workout.id || '',
        label: `${workout.name || 'Unknown'} (${workout.duration || 0}min, ${workout.targetTSS || 0} TSS)`
      });
    });

    // Convert to Mantine's grouped data format: [{ group: 'Name', items: [...] }]
    const workoutOptions = Object.entries(workoutsByCategory).map(([group, items]) => ({
      group,
      items
    }));

    console.log('Workout options for dropdown:', {
      totalGroups: workoutOptions.length,
      sample: workoutOptions[0],
      structure: 'grouped'
    });

    return (
      <Select
        label="Choose Workout"
        placeholder="Select a workout from the library"
        data={workoutOptions}
        value={selectedWorkoutId || null}
        onChange={(workoutId) => {
          console.log('Workout selected from dropdown:', workoutId);
          if (!workoutId) return;
          const workout = LIBRARY[workoutId];
          console.log('Found workout object:', workout);
          if (workout && onWorkoutSelect) {
            onWorkoutSelect(workout);
          }
        }}
        searchable
        leftSection={<Activity size={16} />}
        clearable
      />
    );
  }

  return (
    <Stack gap="md">
      {showFilters && (
        <Card withBorder p="md">
          <Stack gap="md">
            <Group justify="space-between">
              <Text size="sm" fw={600}>Filters</Text>
              <Button
                size="xs"
                variant="subtle"
                onClick={resetFilters}
                leftSection={<Filter size={14} />}
              >
                Reset
              </Button>
            </Group>

            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Select
                  label="Category"
                  data={categoryOptions}
                  value={filters.category}
                  onChange={(val) => setFilters({ ...filters, category: val })}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Select
                  label="Difficulty"
                  data={difficultyOptions}
                  value={filters.difficulty}
                  onChange={(val) => setFilters({ ...filters, difficulty: val })}
                />
              </Grid.Col>
            </Grid>

            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <NumberInput
                  label="Duration Range"
                  placeholder="Min duration"
                  value={filters.minDuration}
                  onChange={(val) => setFilters({ ...filters, minDuration: val })}
                  min={0}
                  max={300}
                  suffix=" min"
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <NumberInput
                  placeholder="Max duration"
                  value={filters.maxDuration}
                  onChange={(val) => setFilters({ ...filters, maxDuration: val })}
                  min={0}
                  max={300}
                  suffix=" min"
                  mt={24}
                />
              </Grid.Col>
            </Grid>

            <MultiSelect
              label="Filter by Tags"
              placeholder="Select tags"
              data={allTags}
              value={filters.tags}
              onChange={(val) => setFilters({ ...filters, tags: val })}
              searchable
            />

            <Text size="xs" c="dimmed">
              Showing {filteredWorkouts.length} workout{filteredWorkouts.length !== 1 ? 's' : ''}
            </Text>
          </Stack>
        </Card>
      )}

      {Object.keys(workoutsByCategory).length === 0 ? (
        <Alert icon={<Info size={16} />} title="No workouts found" color="yellow">
          No workouts match your current filters. Try adjusting the filters or reset to see all workouts.
        </Alert>
      ) : (
        <Accordion variant="separated" defaultValue={Object.keys(workoutsByCategory)[0]}>
          {Object.entries(workoutsByCategory).map(([category, workouts]) => (
            <Accordion.Item key={category} value={category}>
              <Accordion.Control>
                <Group>
                  <Text fw={600} tt="capitalize">
                    {category.replace('_', ' ')}
                  </Text>
                  <Badge size="sm">{workouts.length}</Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="sm">
                  {workouts.map(workout => (
                    <WorkoutCard
                      key={workout.id}
                      workout={workout}
                      isSelected={selectedWorkoutId === workout.id}
                    />
                  ))}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      )}

      {selectedWorkoutForDetail && (
        <WorkoutDetailModal workout={selectedWorkoutForDetail} />
      )}
    </Stack>
  );
};

export default WorkoutSelector;
