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
  Plus,
  Sparkles,
  Users,
  HelpCircle,
} from 'lucide-react';

const LandingPage = ({ onGetStarted }) => {
  const features = [
    {
      icon: Brain,
      title: 'AI Route Generator',
      description: 'Claude AI creates personalized routes based on your time, goals, and preferences. From recovery rides to hill training.',
      color: 'teal',
    },
    {
      icon: Plus,
      title: 'Route Builder & Studio',
      description: 'Build custom routes manually or edit with professional tools. Includes gravel profiles and smart cycling-focused routing.',
      color: 'cyan',
    },
    {
      icon: Sparkles,
      title: 'Smart Analysis & Training',
      description: 'Upload ride data for AI-powered insights. Create personalized training plans and track your progress over time.',
      color: 'blue',
    },
    {
      icon: Users,
      title: 'Community Routes',
      description: 'Discover and share routes with other cyclists. Privacy-first design with optional route sharing and comments.',
      color: 'purple',
    },
    {
      icon: Activity,
      title: 'Fitness App Integration',
      description: 'Connect Strava, Wahoo, or Garmin to import activities and sync routes to your bike computer automatically.',
      color: 'orange',
    },
    {
      icon: HelpCircle,
      title: 'Guided Experience',
      description: 'Interactive onboarding, contextual help, and comprehensive guides to help you master every feature quickly.',
      color: 'green',
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
              <Route size={48} color="#10b981" style={{ filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.5))' }} />
              <Title
                order={1}
                size={48}
                fw={800}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #22d3ee 50%, #fbbf24 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '-0.05em',
                }}
              >
                tribos.studio
              </Title>
            </Group>

            <Title order={2} size={36} fw={600} ta="center" lh={1.3}>
              AI-powered cycling route intelligence
            </Title>

            <Text size="xl" c="dimmed" ta="center" lh={1.6} maw={600}>
              Discover new routes with AI, build custom routes with professional tools,
              analyze your performance, and connect with a community of cyclists.
              Everything you need for smarter cycling in one place.
            </Text>

            <Group spacing="md" mt="xl">
              <Button
                size="lg"
                onClick={onGetStarted}
                rightSection={<ChevronRight size={20} />}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #22d3ee 100%)',
                }}
              >
                Get Started Free
              </Button>
              <Button
                size="lg"
                variant="outline"
                style={{
                  borderColor: '#10b981',
                  color: '#10b981',
                }}
                onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
              >
                Explore Features
              </Button>
            </Group>
            <Text size="sm" c="dimmed" mt="md">
              Free to use • Interactive onboarding • No credit card required
            </Text>
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
                Everything You Need for Smarter Cycling
              </Title>
              <Text size="lg" c="dimmed" ta="center" maw={600}>
                From AI-powered route generation to professional editing tools,
                performance analysis, and community features—all designed to help you
                discover better routes and ride with purpose.
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
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #22d3ee 100%)',
              }}
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
                <Route size={24} color="#10b981" style={{ filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.3))' }} />
                <Text size="sm" c="dimmed">
                  © 2024 tribos.studio
                </Text>
              </Group>
            </Center>
            <Center>
              <Text size="xs" c="dimmed">
                AI-powered cycling route intelligence
              </Text>
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