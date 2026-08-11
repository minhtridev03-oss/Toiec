import { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authEvent, setAuthEvent] = useState(null);
  const userIdRef = useRef(null);

  useEffect(() => {
    // Helper: only update user state if the user ID actually changed
    const updateUser = (newUser) => {
      const newId = newUser?.id ?? null;
      if (newId !== userIdRef.current) {
        userIdRef.current = newId;
        setUser(newUser);
      }
    };

    // Check active sessions and sets the user
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      updateUser(session?.user ?? null);
      setLoading(false);
    };
    
    checkUser();

    // Listen for changes on auth state (log in, log out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthEvent(_event);
      // Only update user if the user actually changed (prevents re-renders on token refresh)
      updateUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Memoize context value to prevent unnecessary re-renders of all consumers
  const value = useMemo(() => ({
    user,
    loading,
    authEvent
  }), [user, loading, authEvent]);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
