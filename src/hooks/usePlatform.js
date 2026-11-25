import { useState, useEffect } from 'react';

export function usePlatform() {
  const [screenSize, setScreenSize] = useState(() => ({
    isMobile: typeof window !== 'undefined' ? window.innerWidth < 1024 : false,
    isPhone: typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  }));

  useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        isMobile: window.innerWidth < 1024,
        isPhone: window.innerWidth < 640,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    isNative: false,
    isMobile: screenSize.isMobile,
    isPhone: screenSize.isPhone,
    isDesktopWeb: !screenSize.isMobile,
    isMobileWeb: screenSize.isMobile,
  };
}
