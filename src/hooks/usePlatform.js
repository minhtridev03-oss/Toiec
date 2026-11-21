import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export function usePlatform() {
  const isNative = Capacitor.isNativePlatform();
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
    isNative,                                            // Đang chạy trong Android APK Capacitor
    isMobile: screenSize.isMobile,                       // Màn hình di động / tablet (< 1024px)
    isPhone: screenSize.isPhone,                         // Màn hình điện thoại (< 640px)
    isDesktopWeb: !isNative && !screenSize.isMobile,     // Trình duyệt Web Laptop / Desktop (>= 1024px)
    isMobileWeb: !isNative && screenSize.isMobile,       // Trình duyệt Web trên Điện thoại / iPad (< 1024px)
  };
}
