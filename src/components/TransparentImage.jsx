import React, { useRef, useEffect, useState } from 'react';

export default function TransparentImage({ src, alt, className, tolerance = 240 }) {
  const canvasRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
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

        // Remove white/light background
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // If pixel is close to white, make it transparent
          if (r > tolerance && g > tolerance && b > tolerance) {
            data[i + 3] = 0; 
          } else {
            // Basic anti-aliasing edge softening
            const avg = (r + g + b) / 3;
            if (avg > tolerance - 30) {
               data[i + 3] = Math.max(0, 255 - (avg - (tolerance - 30)) * 8);
            }
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        setLoaded(true);
      } catch (e) {
        console.error("Canvas image processing failed", e);
        // Fallback: just show the canvas (though it will have the background)
        setLoaded(true);
      }
    };
  }, [src, tolerance]);

  return (
    <canvas 
      ref={canvasRef}
      className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      title={alt}
    />
  );
}
