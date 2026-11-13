import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  fetchAvatarFramesFromSupabase,
  getCachedAvatarFrames,
  getAvatarFrameById,
  checkFrameUnlockStatus,
  FRAME_CATEGORIES,
  DEFAULT_FALLBACK_FRAMES,
} from '../lib/avatarFrames';

const AvatarFramesContext = createContext({
  frames: DEFAULT_FALLBACK_FRAMES,
  loading: false,
  refreshFrames: async () => {},
  getFrameById: () => DEFAULT_FALLBACK_FRAMES[0],
  checkUnlockStatus: () => ({ isUnlocked: true, progressText: '' }),
  FRAME_CATEGORIES,
});

export function AvatarFramesProvider({ children }) {
  const [frames, setFrames] = useState(() => getCachedAvatarFrames());
  const [loading, setLoading] = useState(false);

  const refreshFrames = useCallback(async (includeInactive = false) => {
    setLoading(true);
    try {
      const fresh = await fetchAvatarFramesFromSupabase(includeInactive);
      if (fresh && fresh.length > 0) {
        setFrames(fresh);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshFrames();

    // Listen for local updates dispatched from admin or other tabs
    const handleLocalUpdate = (e) => {
      if (e.detail && Array.isArray(e.detail)) {
        setFrames(e.detail);
      }
    };
    window.addEventListener('toiec-avatar-frames-updated', handleLocalUpdate);

    // Supabase Realtime channel subscription
    const channel = supabase
      .channel('realtime:avatar_frames')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'avatar_frames' },
        () => {
          refreshFrames();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('toiec-avatar-frames-updated', handleLocalUpdate);
      supabase.removeChannel(channel);
    };
  }, [refreshFrames]);

  const value = useMemo(
    () => ({
      frames,
      loading,
      refreshFrames,
      getFrameById: (id) => {
        const found = frames.find((f) => f.id === id);
        return found || getAvatarFrameById(id);
      },
      checkUnlockStatus: checkFrameUnlockStatus,
      FRAME_CATEGORIES,
    }),
    [frames, loading, refreshFrames]
  );

  return (
    <AvatarFramesContext.Provider value={value}>
      {children}
    </AvatarFramesContext.Provider>
  );
}

export function useAvatarFrames() {
  const context = useContext(AvatarFramesContext);
  if (!context) {
    // Graceful fallback outside provider
    return {
      frames: getCachedAvatarFrames(),
      loading: false,
      refreshFrames: async () => {},
      getFrameById: getAvatarFrameById,
      checkUnlockStatus: checkFrameUnlockStatus,
      FRAME_CATEGORIES,
    };
  }
  return context;
}
