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
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Map, Upload, User, LogOut, Route, Brain, Activity, Sparkles, Plus, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import UnitSettings from './UnitSettings';

const AppLayout = ({ children, activePage, setActivePage }) => {
  const { user, signOut } = useAuth();
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
                Cycling AI
              </Text>
            </Group>
          </Group>

          <Group gap={{ base: 'xs', sm: 'sm' }}>
            <UnitSettings />
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="xs">
                    <Avatar size={{ base: 30, sm: 36 }} color="blue">
                      <User size={20} />
                    </Avatar>
                    <div style={{ flex: 1, display: { base: 'none', sm: 'block' } }}>
                      <Text size="sm" fw={500} visibleFrom="sm">
                        {user.email?.split('@')[0] || 'User'}
                      </Text>
                      <Text size="xs" c="dimmed" visibleFrom="sm">
                        {user.email}
                      </Text>
                    </div>
                  </Group>
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item leftSection={<LogOut size={16} />} onClick={signOut}>
                  Sign out
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
            AI Route Generator
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
            variant={activePage === 'upload' ? 'filled' : 'subtle'}
            leftSection={<Upload size={18} />}
            onClick={() => handleNavigation('upload', '/upload')}
            justify="flex-start"
            fullWidth
          >
            Upload Routes
          </Button>
          
          <Button
            variant={activePage === 'map' ? 'filled' : 'subtle'}
            leftSection={<Map size={18} />}
            onClick={() => handleNavigation('map', '/map')}
            justify="flex-start"
            fullWidth
          >
            View Routes
          </Button>

          <Button
            variant={activePage === 'smart-analysis' ? 'filled' : 'subtle'}
            leftSection={<Sparkles size={18} />}
            onClick={() => handleNavigation('smart-analysis', '/smart-analysis')}
            justify="flex-start"
            fullWidth
          >
            Smart Analysis
          </Button>
          
          <Button
            variant={activePage === 'strava' ? 'filled' : 'subtle'}
            leftSection={<Activity size={18} />}
            onClick={() => handleNavigation('strava', '/strava')}
            justify="flex-start"
            fullWidth
          >
            Strava Integration
          </Button>
        </Flex>

        <Container mt="auto" p={0}>
          <Text size="xs" c="dimmed" ta="center">
            Built with React and powered by AI for smarter cycling experiences.
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
