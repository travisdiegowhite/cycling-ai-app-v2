import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { isDemoMode, getDemoSession, demoUser, disableDemoMode } from '../utils/demoData';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if in demo mode first
    if (isDemoMode()) {
      console.log('✅ Demo mode active - using mock data');
      const demoSession = getDemoSession();
      setUser(demoSession?.user ?? null);
      setLoading(false);
      return;
    }

    // Normal authentication flow
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes in auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = (email, password) => {
    return supabase.auth.signUp({
      email,
      password,
    });
  };

  const signIn = (email, password) => {
    return supabase.auth.signInWithPassword({
      email,
      password,
    });
  };

  const signOut = () => {
    // If in demo mode, just disable it and reload
    if (isDemoMode()) {
      disableDemoMode();
      window.location.reload();
      return Promise.resolve({ error: null });
    }

    return supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signUp,
      signIn,
      signOut,
      isDemoMode: isDemoMode(),
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
