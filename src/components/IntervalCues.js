import React from 'react';
import { Card, Text, Stack, Group, Badge, Timeline, ThemeIcon } from '@mantine/core';
import { Activity, TrendingUp, Zap, Mountain, Heart } from 'lucide-react';
import { getZoneColor, getZoneName } from '../utils/intervalCues';

const IntervalCues = ({ cues }) => {
  if (!cues || cues.length === 0) {
    return null;
  }

  // Get icon for cue type
  const getIcon = (type) => {
    if (type.includes('warmup')) return <Heart size={16} />;
    if (type.includes('cooldown')) return <Heart size={16} />;
    if (type.includes('interval')) return <Zap size={16} />;
    if (type.includes('hill')) return <Mountain size={16} />;
    if (type.includes('surge') || type.includes('tempo')) return <TrendingUp size={16} />;
    return <Activity size={16} />;
  };

  // Get color for cue type
  const getCueColor = (cue) => {
    if (cue.type === 'warmup') return 'green';
    if (cue.type === 'cooldown') return 'blue';
    if (cue.type === 'interval-hard') return 'red';
    if (cue.type === 'interval-recovery') return 'cyan';
    if (cue.type === 'hill-climb') return 'orange';
    if (cue.type === 'endurance-surge') return 'yellow';
    return 'gray';
  };

  return (
    <Card withBorder p="md" style={{ backgroundColor: '#f8f9fa' }}>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Text size="sm" fw={600}>
            Workout Structure
          </Text>
          <Badge color="blue" variant="light" size="sm">
            {cues.length} segments
          </Badge>
        </Group>

        <Timeline active={cues.length} bulletSize={24} lineWidth={2}>
          {cues.map((cue, index) => (
            <Timeline.Item
              key={index}
              bullet={
                <ThemeIcon
                  size={24}
                  variant="filled"
                  color={getCueColor(cue)}
                  radius="xl"
                >
                  {getIcon(cue.type)}
                </ThemeIcon>
              }
              title={
                <Group gap="xs">
                  <Text size="sm" fw={500}>
                    {cue.instruction.split(':')[0]}
                  </Text>
                  <Badge size="xs" color={getZoneColor(cue.zone)} variant="filled">
                    Zone {cue.zone}
                  </Badge>
                </Group>
              }
            >
              <Text size="xs" c="dimmed" mt={4}>
                {cue.instruction.split(':')[1] || cue.instruction}
              </Text>
              <Text size="xs" c="dimmed" mt={2}>
                📍 At {cue.startDistance.toFixed(1)}km - {cue.endDistance.toFixed(1)}km
              </Text>
            </Timeline.Item>
          ))}
        </Timeline>

        <Card withBorder p="xs" style={{ backgroundColor: 'white' }}>
          <Text size="xs" fw={500} mb="xs">
            Training Zones Reference:
          </Text>
          <Stack gap={4}>
            {[1, 2, 3, 4, 5].map((zone) => (
              <Group key={zone} gap="xs">
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: getZoneColor(zone),
                  }}
                />
                <Text size="xs" c="dimmed">
                  Zone {zone}: {getZoneName(zone)}
                </Text>
              </Group>
            ))}
          </Stack>
        </Card>
      </Stack>
    </Card>
  );
};

export default IntervalCues;
