import React, { useRef, useEffect, useState } from 'react';

// In-memory cache for processed transparent images
const imageCache = new Map();

export default function TransparentImage({ src, alt, className, tolerance = 240, removeColor = 'auto' }) {
  const canvasRef = useRef(null);
  const cacheKey = `${src}_${tolerance}_${removeColor}`;
  const [cachedDataUrl, setCachedDataUrl] = useState(() => imageCache.get(cacheKey) || null);
  const [loaded, setLoaded] = useState(() => Boolean(imageCache.get(cacheKey)));

  useEffect(() => {
    if (imageCache.has(cacheKey)) {
      setCachedDataUrl(imageCache.get(cacheKey));
      setLoaded(true);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = src;

    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);

      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        let isDarkBg = false;
        if (removeColor === 'black') {
          isDarkBg = true;
        } else if (removeColor === 'white') {
          isDarkBg = false;
        } else {
          // Auto-detect based on top-left pixel
          isDarkBg = data[0] < 50 && data[1] < 50 && data[2] < 50;
        }

        const darkTolerance = 25;

        // Remove background and watermarks
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          if (isDarkBg) {
             const maxVal = Math.max(r, g, b);
             const minVal = Math.min(r, g, b);
             const saturationDiff = maxVal - minVal;

             if (maxVal < darkTolerance) {
               data[i + 3] = 0;
             } else if (saturationDiff < 50) {
               data[i + 3] = 0;
             } else if (maxVal < darkTolerance + 35) {
               data[i + 3] = Math.max(0, 255 - ((darkTolerance + 35) - maxVal) * 8);
             }
          } else {
             const maxVal = Math.max(r, g, b);
             const minVal = Math.min(r, g, b);
             const saturationDiff = maxVal - minVal;

             if (saturationDiff < 45 && maxVal > 150) {
               data[i + 3] = 0; 
             } else {
               if (maxVal > 200 && saturationDiff < 60) {
                  data[i + 3] = Math.max(0, 255 - (maxVal - 200) * 4);
               }
             }
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        const dataUrl = canvas.toDataURL();
        imageCache.set(cacheKey, dataUrl);
        setCachedDataUrl(dataUrl);
        setLoaded(true);
      } catch (e) {
        console.error("Canvas image processing failed", e);
        setLoaded(true);
      }
    };
  }, [src, tolerance, removeColor, cacheKey]);

  if (cachedDataUrl) {
    return (
      <img
        src={cachedDataUrl}
        alt={alt || ''}
        className={`${className} transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <canvas 
      ref={canvasRef}
      className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      title={alt}
    />
  );
}
