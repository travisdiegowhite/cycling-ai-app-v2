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
} from '@mantine/core';
import { Route, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LandingPage from './LandingPage';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [isDemoLogin, setIsDemoLogin] = useState(false);

  const { signIn, signUp } = useAuth();

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

  const handleDemoLogin = async () => {
    console.log('🎯 Demo login initiated');
    setError(null);
    setLoading(true);
    setIsDemoLogin(true);

    try {
      console.log('🔐 Attempting to sign in with:', DEMO_EMAIL);
      console.log('Supabase URL:', process.env.REACT_APP_SUPABASE_URL);

      const { data, error } = await signIn(DEMO_EMAIL, DEMO_PASSWORD);

      if (error) {
        console.error('❌ Demo login error:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          name: error.name,
          code: error.code
        });
        throw error;
      }

      console.log('✅ Demo login successful!', data);
    } catch (error) {
      console.error('❌ Demo login failed:', error);

      // Provide specific error message based on error type
      let errorMessage = 'Failed to sign in to demo account. ';

      if (error.message && error.message.includes('Database error')) {
        errorMessage += 'There is a database configuration issue in Supabase. Please check:\n' +
                       '1. Run fix_auth_500_error.sql in Supabase SQL Editor\n' +
                       '2. Check for custom triggers on auth.users table\n' +
                       '3. Verify all referenced tables exist';
      } else if (error.status === 400) {
        errorMessage += 'Invalid credentials or user not found.';
      } else {
        errorMessage += error.message || 'Unknown error occurred.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
      setIsDemoLogin(false);
    }
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
        <Title order={1} c="blue">Cycling AI</Title>
      </Group>

      <Paper withBorder shadow="md" p={30} radius="md">
        <Title order={2} ta="center" mb="md">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </Title>

        <Text c="dimmed" size="sm" ta="center" mb="xl">
          {isSignUp
            ? 'Get started with intelligent route recommendations'
            : 'Sign in to access your cycling routes'
          }
        </Text>

        {error && (
          <Alert icon={<AlertCircle size={16} />} color="red" mb="md">
            {error}
          </Alert>
        )}

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
