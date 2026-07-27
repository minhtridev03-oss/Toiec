import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { fetchUserStreak, fetchTotalLearnedWords } from '../lib/api';
import { supabase } from '../lib/supabaseClient';

const StatsContext = createContext({ streak: 0, learnedWords: 0, refreshStats: () => {} });

export function StatsProvider({ children }) {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [learnedWords, setLearnedWords] = useState(0);

  const refreshStats = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [s, w] = await Promise.all([
        fetchUserStreak(user.id),
        fetchTotalLearnedWords(user.id),
      ]);
      setStreak(s);
      setLearnedWords(w);
    } catch (err) {
      console.error('StatsContext: refresh failed', err);
    }
  }, [user?.id]);

  // Fetch on mount / user change
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // Realtime: lắng nghe bảng user_topic_vocabularies và user_practice_sessions → tự cập nhật không cần manual refresh
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`stats-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_topic_vocabularies',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refreshStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_practice_sessions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refreshStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refreshStats]);

  return (
    <StatsContext.Provider value={{ streak, learnedWords, refreshStats }}>
      {children}
    </StatsContext.Provider>
  );
}

export const useStats = () => useContext(StatsContext);

