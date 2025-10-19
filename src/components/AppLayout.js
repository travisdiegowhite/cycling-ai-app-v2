import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppShell,
  Container,
  Group,
  Button,
  Text,
  Avatar,
  Menu,
  UnstyledButton,
  Burger,
  Flex,
  Badge,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Map, Upload, User, LogOut, Route, Brain, Activity, Plus, Zap, FileText, Scale, TrendingUp, Globe, Book, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import UnitSettings from './UnitSettings';

const AppLayout = ({ children, activePage, setActivePage }) => {
  const { user, signOut, isDemoMode } = useAuth();
  const [opened, { toggle }] = useDisclosure();
  const navigate = useNavigate();
  
  const handleNavigation = (page, path) => {
    setActivePage(page);
    navigate(path);
    // Close mobile menu after navigation
    if (opened) {
      toggle();
    }
  };

  if (!user) {
    return (
      <Container size="sm" py={80}>
        {children}
      </Container>
    );
  }

  return (
    <AppShell
      header={{ height: { base: 60, sm: 70 } }}
      navbar={{
        width: { base: 250, sm: 280 },
        breakpoint: 'md',
        collapsed: { mobile: !opened },
      }}
      padding={{ base: 'xs', sm: 'md' }}
    >
      <AppShell.Header>
        <Group h="100%" px={{ base: 'xs', sm: 'md' }} justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="sm" />
            <Group gap="xs" visibleFrom="xs">
              <Route size={28} color="#10b981" style={{ filter: 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.4))' }} />
              <Text
                size={{ base: 'xl', sm: '2xl' }}
                fw={800}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #22d3ee 50%, #fbbf24 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.05em',
                  textShadow: '0 0 30px rgba(16, 185, 129, 0.3)'
                }}
              >
                tribos.studio
              </Text>
            </Group>
          </Group>

          <Group gap={{ base: 'xs', sm: 'sm' }}>
            <UnitSettings />
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="xs">
                    <Avatar size={{ base: 30, sm: 36 }} color={isDemoMode ? "teal" : "blue"}>
                      <User size={20} />
                    </Avatar>
                    <div style={{ flex: 1, display: { base: 'none', sm: 'block' } }}>
                      <Text size="sm" fw={500} visibleFrom="sm">
                        {isDemoMode ? 'Demo User' : user.email?.split('@')[0] || 'User'}
                      </Text>
                      <Text size="xs" c="dimmed" visibleFrom="sm">
                        {isDemoMode ? 'Exploring features' : user.email}
                      </Text>
                    </div>
                  </Group>
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown>
                {isDemoMode && (
                  <Menu.Item
                    leftSection={<UserPlus size={16} />}
                    onClick={signOut}
                    style={{
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(34, 211, 238, 0.1) 100%)',
                      fontWeight: 600,
                      color: '#10b981',
                    }}
                  >
                    Create Account
                  </Menu.Item>
                )}
                <Menu.Item leftSection={<LogOut size={16} />} onClick={signOut}>
                  {isDemoMode ? 'Exit Demo' : 'Sign out'}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Flex direction="column" gap="xs">
          <Button
            variant={activePage === 'ai-routes' ? 'filled' : 'subtle'}
            leftSection={<Brain size={18} />}
            onClick={() => handleNavigation('ai-routes', '/')}
            justify="flex-start"
            fullWidth
          >
            Smart Route Planner
          </Button>

          <Button
            variant={activePage === 'route-builder' ? 'filled' : 'subtle'}
            leftSection={<Plus size={18} />}
            onClick={() => handleNavigation('route-builder', '/route-builder')}
            justify="flex-start"
            fullWidth
          >
            Route Builder
          </Button>

          <Button
            variant={activePage === 'route-studio' ? 'filled' : 'subtle'}
            leftSection={<Zap size={18} />}
            onClick={() => handleNavigation('route-studio', '/route-studio')}
            justify="flex-start"
            fullWidth
            style={{
              background: activePage === 'route-studio'
                ? 'linear-gradient(135deg, #10b981 0%, #22d3ee 100%)'
                : undefined,
              color: activePage === 'route-studio' ? 'white' : undefined
            }}
          >
            Route Studio
          </Button>

          <Button
            variant={activePage === 'training' ? 'filled' : 'subtle'}
            leftSection={<TrendingUp size={18} />}
            onClick={() => handleNavigation('training', '/training')}
            justify="flex-start"
            fullWidth
          >
            Training Dashboard
          </Button>

          <Button
            variant={activePage === 'workouts' ? 'filled' : 'subtle'}
            leftSection={<Book size={18} />}
            onClick={() => handleNavigation('workouts', '/workouts')}
            justify="flex-start"
            fullWidth
          >
            Workout Library
          </Button>

          <Button
            variant={activePage === 'routes' ? 'filled' : 'subtle'}
            leftSection={<Route size={18} />}
            onClick={() => handleNavigation('routes', '/routes')}
            justify="flex-start"
            fullWidth
          >
            My Routes
          </Button>

          <Button
            variant={activePage === 'discover' ? 'filled' : 'subtle'}
            leftSection={<Globe size={18} />}
            onClick={() => handleNavigation('discover', '/discover')}
            justify="flex-start"
            fullWidth
          >
            Discover Routes
          </Button>

          <Button
            variant={activePage === 'upload' ? 'filled' : 'subtle'}
            leftSection={<Upload size={18} />}
            onClick={() => handleNavigation('upload', '/upload')}
            justify="flex-start"
            fullWidth
          >
            Upload Routes
          </Button>

          <Button
            variant={activePage === 'strava' ? 'filled' : 'subtle'}
            leftSection={<Activity size={18} />}
            onClick={() => handleNavigation('strava', '/strava')}
            justify="flex-start"
            fullWidth
          >
            Import from Fitness Apps
          </Button>
        </Flex>

        <Container mt="auto" p={0}>
          <Flex direction="column" gap="xs" mb="sm">
            <Button
              variant="subtle"
              size="xs"
              leftSection={<FileText size={14} />}
              onClick={() => window.open('/privacy-policy', '_blank')}
              justify="flex-start"
              fullWidth
              c="dimmed"
            >
              Privacy Policy
            </Button>
            <Button
              variant="subtle"
              size="xs"
              leftSection={<Scale size={14} />}
              onClick={() => window.open('/terms-of-service', '_blank')}
              justify="flex-start"
              fullWidth
              c="dimmed"
            >
              Terms of Service
            </Button>
          </Flex>
          <Text size="xs" c="dimmed" ta="center" mb="xs">
            tribos.studio
          </Text>
          <Text size="xs" c="dimmed" ta="center">
            Intelligent cycling route planning
          </Text>
        </Container>
      </AppShell.Navbar>

      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
};

export default AppLayout;
