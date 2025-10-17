import React, { useState } from 'react';
import {
  Modal,
  Stepper,
  Button,
  Group,
  Text,
  Title,
  Stack,
  Paper,
  ThemeIcon,
  List,
  Image,
  Center,
} from '@mantine/core';
import {
  Brain,
  Plus,
  Zap,
  Map,
  Upload,
  Activity,
  CheckCircle,
  TrendingUp,
} from 'lucide-react';

const Onboarding = ({ opened, onClose }) => {
  const [active, setActive] = useState(0);

  const steps = [
    {
      label: 'Welcome',
      icon: CheckCircle,
      content: {
        title: 'Welcome to tribos.studio',
        subtitle: 'Your intelligent cycling route planning platform',
        description:
          "We're excited to have you here! tribos.studio helps you discover new routes, analyze your performance, and achieve your cycling goals using advanced algorithms and data-driven insights.",
        features: [
          'Generate personalized routes instantly',
          'Build custom routes manually',
          'Analyze your rides with smart insights',
          'Train smarter with personalized plans',
          'Discover routes from the community',
        ],
      },
    },
    {
      label: 'Smart Routes',
      icon: Brain,
      content: {
        title: 'Smart Route Planner',
        subtitle: 'Personalized routes created for you',
        description:
          'Our intelligent system analyzes your preferences, training goals, and current conditions to generate optimal cycling routes. It considers elevation, road types, weather, and scenic value.',
        features: [
          'Set your available time (15 min to 4 hours)',
          'Choose training goals: Recovery, Endurance, Intervals, or Hills',
          'Select route type: Loop, Out & Back, or Point-to-Point',
          'Get multiple route options to choose from',
          'System learns from your feedback over time',
        ],
        tip: 'Pro tip: The more rides you upload, the better the system understands your preferences!',
      },
    },
    {
      label: 'Route Builder',
      icon: Plus,
      content: {
        title: 'Route Builder & Studio',
        subtitle: 'Create and edit routes with precision',
        description:
          'Build routes manually by clicking on the map, or edit existing routes in Route Studio with professional-grade tools.',
        features: [
          'Click on the map to add waypoints',
          'Smart routing finds the best cycling paths',
          'View real-time elevation profiles',
          'Edit routes with advanced tools in Route Studio',
          'Export routes as GPX for your bike computer',
        ],
        tip: 'Pro tip: Use Route Studio for gravel profiles and advanced routing options!',
      },
    },
    {
      label: 'Training',
      icon: TrendingUp,
      content: {
        title: 'Training Dashboard',
        subtitle: 'Track your progress and optimize your training',
        description:
          'Comprehensive training hub with smart insights, performance analytics, and personalized training plans to help you reach your cycling goals.',
        features: [
          'View comprehensive ride statistics and trends',
          'Get intelligent performance insights',
          'Create personalized training plans',
          'Track training load and fitness progression',
          'Connect Strava, Wahoo, or Garmin for automatic imports',
        ],
        tip: 'Pro tip: The Training Dashboard consolidates all your riding data into actionable insights!',
      },
    },
    {
      label: 'Ready',
      icon: CheckCircle,
      content: {
        title: "You're All Set!",
        subtitle: 'Start exploring tribos.studio',
        description:
          'Ready to discover your next great ride? Here are some suggested first steps to get the most out of tribos.studio.',
        features: [
          'Generate your first smart route to explore the area',
          'Upload a recent ride to get personalized recommendations',
          'Connect your fitness apps for automatic sync',
          'Explore community routes in Route Discovery',
          'Create a training plan for your next goal',
        ],
        callToAction: 'Get Started',
      },
    },
  ];

  const nextStep = () => setActive((current) => (current < steps.length - 1 ? current + 1 : current));
  const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));

  const handleComplete = () => {
    // Mark onboarding as completed in localStorage
    localStorage.setItem('tribos_onboarding_completed', 'true');
    onClose();
  };

  const CurrentIcon = steps[active].icon;
  const currentContent = steps[active].content;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      centered
      padding="xl"
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
    >
      <Stack gap="xl">
        <Stepper active={active} onStepClick={setActive} size="sm" color="teal">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            return (
              <Stepper.Step
                key={index}
                label={step.label}
                icon={<StepIcon size={18} />}
                allowStepSelect={index < active}
              />
            );
          })}
        </Stepper>

        <Paper p="xl" radius="md" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(34, 211, 238, 0.1) 100%)' }}>
          <Stack gap="lg" align="center" ta="center">
            <ThemeIcon size={80} radius="md" variant="light" color="teal">
              <CurrentIcon size={40} />
            </ThemeIcon>

            <div>
              <Title order={2} mb="xs">
                {currentContent.title}
              </Title>
              <Text size="lg" c="dimmed" fw={500}>
                {currentContent.subtitle}
              </Text>
            </div>

            <Text size="md" c="dimmed" maw={600}>
              {currentContent.description}
            </Text>
          </Stack>
        </Paper>

        <Paper p="lg" radius="md" withBorder>
          <List
            spacing="sm"
            size="md"
            center
            icon={
              <ThemeIcon color="teal" size={24} radius="xl" variant="light">
                <CheckCircle size={16} />
              </ThemeIcon>
            }
          >
            {currentContent.features.map((feature, index) => (
              <List.Item key={index}>
                <Text>{feature}</Text>
              </List.Item>
            ))}
          </List>

          {currentContent.tip && (
            <Paper p="md" mt="md" radius="md" style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
              <Text size="sm" fw={500} c="yellow.7">
                💡 {currentContent.tip}
              </Text>
            </Paper>
          )}
        </Paper>

        <Group justify="space-between" mt="xl">
          <Button
            variant="subtle"
            onClick={prevStep}
            disabled={active === 0}
          >
            Back
          </Button>

          <Group>
            <Button
              variant="subtle"
              onClick={handleComplete}
            >
              Skip Tour
            </Button>

            {active === steps.length - 1 ? (
              <Button
                onClick={handleComplete}
                size="md"
                color="teal"
                rightSection={<CheckCircle size={18} />}
              >
                {currentContent.callToAction || 'Get Started'}
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                size="md"
                color="teal"
              >
                Next
              </Button>
            )}
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
};

export default Onboarding;
