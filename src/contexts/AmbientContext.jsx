import { createContext, useContext, useEffect, useState } from 'react';

const AmbientContext = createContext(null);

const DEFAULT_SETTINGS = {
  videoEnabled: true,
  currentVideo: '/assets/videos/1027.mp4',
  dimOverlay: 0.35,
};

export function AmbientProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('ambient_settings_v1');
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  });

  const [isVideoPlaying, setIsVideoPlaying] = useState(true);

  // Save settings on update
  useEffect(() => {
    try {
      localStorage.setItem('ambient_settings_v1', JSON.stringify({
        videoEnabled: settings.videoEnabled,
        currentVideo: settings.currentVideo,
        dimOverlay: settings.dimOverlay,
      }));
    } catch {
      // Ignore quota error
    }
  }, [settings]);

  const toggleVideo = () => {
    setSettings((prev) => ({ ...prev, videoEnabled: !prev.videoEnabled }));
  };

  const togglePlayVideo = () => {
    setIsVideoPlaying((prev) => !prev);
  };

  const setDimOverlay = (val) => {
    setSettings((prev) => ({ ...prev, dimOverlay: val }));
  };

  const value = {
    videoEnabled: settings.videoEnabled,
    isVideoPlaying,
    setIsVideoPlaying,
    togglePlayVideo,
    toggleVideo,
    currentVideo: settings.currentVideo,
    dimOverlay: settings.dimOverlay,
    setDimOverlay,
  };

  return <AmbientContext.Provider value={value}>{children}</AmbientContext.Provider>;
}

export function useAmbient() {
  const context = useContext(AmbientContext);
  if (!context) {
    throw new Error('useAmbient must be used within an AmbientProvider');
  }
  return context;
}
