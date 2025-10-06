import React from 'react';
import {
  Container,
  Title,
  Text,
  Button,
  Stack,
  Group,
  Grid,
  Card,
  ThemeIcon,
  Box,
  Center,
  Divider,
  Paper,
  Anchor,
  List,
  Flex,
} from '@mantine/core';
import {
  Route,
  Brain,
  TrendingUp,
  MapPin,
  Activity,
  Zap,
  Target,
  Clock,
  Globe,
  Smartphone,
  ChevronRight,
  Star,
} from 'lucide-react';

const LandingPage = ({ onGetStarted }) => {
  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Route Generation',
      description: 'Claude AI analyzes your riding patterns to create personalized routes tailored to your training goals.',
      color: 'blue',
    },
    {
      icon: TrendingUp,
      title: 'Smart Performance Analysis',
      description: 'Deep insights into your cycling data with trend analysis and personalized recommendations.',
      color: 'green',
    },
    {
      icon: Activity,
      title: 'Strava Integration',
      description: 'Seamlessly import your cycling history to enhance AI learning and route personalization.',
      color: 'orange',
    },
    {
      icon: Target,
      title: 'Training-Focused Routes',
      description: 'Routes designed for specific goals: recovery rides, interval training, climbing, or endurance.',
      color: 'purple',
    },
    {
      icon: MapPin,
      title: 'Advanced Route Builder',
      description: 'Professional-grade route creation with AI enhancements and real-time elevation profiles.',
      color: 'cyan',
    },
    {
      icon: Globe,
      title: 'Weather-Aware Planning',
      description: 'Routes adapted to current conditions with safety considerations for optimal training.',
      color: 'teal',
    },
  ];

  const benefits = [
    'Discover new routes that match your riding style',
    'Train smarter with AI-optimized workout routes',
    'Track progress with comprehensive analytics',
    'Export routes to any GPS device or app',
    'Learn from your actual riding patterns',
    'Stay motivated with personalized challenges',
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Container size="lg" py={80}>
        <Center>
          <Stack align="center" spacing="xl" maw={700}>
            <Group spacing="md" align="center">
              <ThemeIcon size={60} variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
                <Route size={32} />
              </ThemeIcon>
              <Title order={1} size={48} fw={700} c="blue">
                Cycling AI
              </Title>
            </Group>

            <Title order={2} size={36} fw={600} ta="center" lh={1.3}>
              Intelligent Route Planning for
              <Text component="span" c="blue" inherit> Serious Cyclists</Text>
            </Title>

            <Text size="xl" c="dimmed" ta="center" lh={1.6} maw={600}>
              Stop riding the same routes. Let AI create personalized cycling routes
              that learn from your riding patterns, adapt to weather conditions,
              and help you achieve your training goals.
            </Text>

            <Group spacing="md" mt="xl">
              <Button
                size="lg"
                onClick={onGetStarted}
                rightSection={<ChevronRight size={20} />}
                variant="gradient"
                gradient={{ from: 'blue', to: 'cyan' }}
              >
                Start Planning Routes
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
              >
                See How It Works
              </Button>
            </Group>
          </Stack>
        </Center>
      </Container>

      <Divider />

      {/* Features Section */}
      <Container size="lg" py={80} id="features">
        <Stack spacing={60}>
          <Center>
            <Stack align="center" spacing="md">
              <Title order={2} size={32} ta="center">
                Beyond Basic Route Planning
              </Title>
              <Text size="lg" c="dimmed" ta="center" maw={600}>
                Traditional route planners just connect points. We use AI to understand
                how you ride and create routes that make you a better cyclist.
              </Text>
            </Stack>
          </Center>

          <Grid>
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Grid.Col key={index} span={{ base: 12, md: 6, lg: 4 }}>
                  <Card shadow="sm" padding="lg" h="100%">
                    <Stack spacing="md">
                      <ThemeIcon size={50} color={feature.color} variant="light">
                        <Icon size={24} />
                      </ThemeIcon>
                      <Title order={4} size="lg" fw={600}>
                        {feature.title}
                      </Title>
                      <Text c="dimmed" size="sm" lh={1.5}>
                        {feature.description}
                      </Text>
                    </Stack>
                  </Card>
                </Grid.Col>
              );
            })}
          </Grid>
        </Stack>
      </Container>

      <Divider />

      {/* Benefits Section */}
      <Container size="lg" py={80}>
        <Grid align="center">
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack spacing="xl">
              <Title order={2} size={32}>
                Training Made Intelligent
              </Title>
              <Text size="lg" c="dimmed" lh={1.6}>
                Whether you're training for an event, exploring new areas, or just
                want better rides, our AI learns from your actual cycling data to
                suggest routes that challenge and inspire you.
              </Text>
              <List
                spacing="sm"
                size="md"
                icon={
                  <ThemeIcon size={20} color="green" variant="light">
                    <Star size={12} />
                  </ThemeIcon>
                }
              >
                {benefits.map((benefit, index) => (
                  <List.Item key={index}>{benefit}</List.Item>
                ))}
              </List>
              <Button
                size="md"
                onClick={onGetStarted}
                rightSection={<ChevronRight size={18} />}
              >
                Get Started Free
              </Button>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper shadow="md" p="xl" bg="gray.0">
              <Stack spacing="lg">
                <Title order={3} size="lg" ta="center">
                  How It Works
                </Title>
                <Stack spacing="md">
                  <Flex align="center" gap="md">
                    <ThemeIcon size={32} color="blue" variant="filled">
                      <Text size="sm" fw={700}>1</Text>
                    </ThemeIcon>
                    <Text size="sm">Connect your Strava account to import riding history</Text>
                  </Flex>
                  <Flex align="center" gap="md">
                    <ThemeIcon size={32} color="blue" variant="filled">
                      <Text size="sm" fw={700}>2</Text>
                    </ThemeIcon>
                    <Text size="sm">AI analyzes your patterns, preferences, and training data</Text>
                  </Flex>
                  <Flex align="center" gap="md">
                    <ThemeIcon size={32} color="blue" variant="filled">
                      <Text size="sm" fw={700}>3</Text>
                    </ThemeIcon>
                    <Text size="sm">Get personalized route recommendations for any goal</Text>
                  </Flex>
                  <Flex align="center" gap="md">
                    <ThemeIcon size={32} color="blue" variant="filled">
                      <Text size="sm" fw={700}>4</Text>
                    </ThemeIcon>
                    <Text size="sm">Export to any GPS device and start riding smarter</Text>
                  </Flex>
                </Stack>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>
      </Container>

      <Divider />

      {/* Technical Highlights */}
      <Container size="lg" py={80}>
        <Center>
          <Stack align="center" spacing="xl" maw={800}>
            <Title order={2} size={32} ta="center">
              Built for Performance
            </Title>
            <Text size="lg" c="dimmed" ta="center" lh={1.6}>
              Professional-grade tools powered by cutting-edge AI. No compromises on
              data quality, route accuracy, or user experience.
            </Text>

            <Grid mt="xl">
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Stack align="center" spacing="xs">
                  <ThemeIcon size={40} color="blue" variant="light">
                    <Brain size={20} />
                  </ThemeIcon>
                  <Text fw={600}>Claude AI</Text>
                  <Text size="xs" c="dimmed" ta="center">Advanced reasoning</Text>
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Stack align="center" spacing="xs">
                  <ThemeIcon size={40} color="green" variant="light">
                    <Zap size={20} />
                  </ThemeIcon>
                  <Text fw={600}>Real-time</Text>
                  <Text size="xs" c="dimmed" ta="center">Instant route generation</Text>
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Stack align="center" spacing="xs">
                  <ThemeIcon size={40} color="orange" variant="light">
                    <Activity size={20} />
                  </ThemeIcon>
                  <Text fw={600}>Data-Rich</Text>
                  <Text size="xs" c="dimmed" ta="center">Full analytics suite</Text>
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Stack align="center" spacing="xs">
                  <ThemeIcon size={40} color="purple" variant="light">
                    <Smartphone size={20} />
                  </ThemeIcon>
                  <Text fw={600}>Universal</Text>
                  <Text size="xs" c="dimmed" ta="center">Works with any device</Text>
                </Stack>
              </Grid.Col>
            </Grid>
          </Stack>
        </Center>
      </Container>

      <Divider />

      {/* CTA Section */}
      <Container size="lg" py={80}>
        <Center>
          <Stack align="center" spacing="xl" maw={600}>
            <Title order={2} size={32} ta="center">
              Ready to Ride Smarter?
            </Title>
            <Text size="lg" c="dimmed" ta="center" lh={1.6}>
              Join cyclists who are discovering new routes, improving their training,
              and riding with purpose. Get started in less than 2 minutes.
            </Text>
            <Button
              size="xl"
              onClick={onGetStarted}
              rightSection={<ChevronRight size={24} />}
              variant="gradient"
              gradient={{ from: 'blue', to: 'cyan' }}
            >
              Create Your Account
            </Button>
            <Text size="sm" c="dimmed">
              Free to start • No credit card required
            </Text>
          </Stack>
        </Center>
      </Container>

      {/* Footer */}
      <Box bg="gray.1" py={40}>
        <Container size="lg">
          <Stack spacing="md">
            <Center>
              <Group spacing="md">
                <Route size={24} color="#2196f3" />
                <Text size="sm" c="dimmed">
                  © 2024 Cycling AI. Intelligent route planning for serious cyclists.
                </Text>
              </Group>
            </Center>
            <Center>
              <Group spacing="lg">
                <Anchor href="/privacy" size="sm" c="dimmed">
                  Privacy Policy
                </Anchor>
                <Anchor href="/terms" size="sm" c="dimmed">
                  Terms of Service
                </Anchor>
                <Anchor href="mailto:travis@tribos.studio" size="sm" c="dimmed">
                  Contact
                </Anchor>
              </Group>
            </Center>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;