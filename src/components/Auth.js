import React, { useState } from 'react';
import {
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Alert,
  Container,
  Stack,
  Group,
  Anchor,
  Divider,
} from '@mantine/core';
import { Route, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LandingPage from './LandingPage';
import { enableDemoMode } from '../utils/demoData';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(true); // Default to sign up
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [isDemoLogin, setIsDemoLogin] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { signIn, signUp, signInWithGoogle } = useAuth();

  // Demo account credentials (read-only)
  const DEMO_EMAIL = 'demo@tribos.studio';
  const DEMO_PASSWORD = 'demo2024tribos';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) throw error;
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
      // User will be redirected to Google, then back to the app
    } catch (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  const handleDemoLogin = () => {
    console.log('🎯 Starting demo mode (no authentication required)');
    setLoading(true);

    // Enable demo mode - uses mock data instead of real authentication
    enableDemoMode();

    // Trigger a page reload to activate demo mode
    // The AuthContext will detect demo mode and provide mock session
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  // Show landing page by default, auth form when requested
  if (!showAuth) {
    return (
      <LandingPage
        onGetStarted={() => setShowAuth(true)}
        onTryDemo={handleDemoLogin}
      />
    );
  }

  return (
    <Container size={420} my={40}>
      <Group justify="center" mb={30}>
        <Route size={32} color="#2196f3" />
        <Title order={1} c="blue">tribos.studio</Title>
      </Group>

      <Paper withBorder shadow="md" p={30} radius="md">
        <Title order={2} ta="center" mb="md">
          {isSignUp ? 'Create Your Free Account' : 'Welcome Back'}
        </Title>

        <Text c="dimmed" size="sm" ta="center" mb="xl">
          {isSignUp
            ? 'Start planning smarter routes in under 2 minutes. No credit card required.'
            : 'Sign in to access your cycling routes and training data'
          }
        </Text>

        {error && (
          <Alert icon={<AlertCircle size={16} />} color="red" mb="md">
            {error}
          </Alert>
        )}

        <Button
          onClick={handleGoogleSignIn}
          loading={googleLoading}
          size="md"
          variant="default"
          fullWidth
          leftSection={
            !googleLoading && (
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
            )
          }
        >
          {googleLoading ? 'Signing in...' : `${isSignUp ? 'Sign up' : 'Sign in'} with Google`}
        </Button>

        <Divider label="or" labelPosition="center" my="lg" />

        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              size="md"
            />

            <PasswordInput
              label="Password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              size="md"
            />

            <Button type="submit" loading={loading} size="md" mt="sm">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Button>
          </Stack>
        </form>

        <Text ta="center" mt="md">
          {isSignUp ? 'Already have an account?' : 'Need an account?'}{' '}
          <Anchor
            component="button"
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </Anchor>
        </Text>

        <Text ta="center" mt="lg">
          <Anchor
            component="button"
            type="button"
            onClick={() => setShowAuth(false)}
            size="sm"
          >
            ← Back to home
          </Anchor>
        </Text>
      </Paper>
    </Container>
  );
};

export default Auth;
