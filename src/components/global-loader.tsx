
'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export function GlobalLoader({ isLoading }: { isLoading: boolean }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isLoading) {
      setProgress(0);
      // Simulate loading progress
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + 10;
        });
      }, 100);
      return () => clearInterval(interval);
    } else {
      // Complete the loading and fade out
      setProgress(100);
      const timer = setTimeout(() => setProgress(0), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);
  
  const isVisible = progress > 0 && progress < 100;

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 h-[3px] bg-primary z-[9999] transition-all duration-300 ease-out',
        isVisible ? 'opacity-100' : 'opacity-0'
      )}
      style={{
         width: `${progress}%`,
         boxShadow: '0 0 10px hsl(var(--primary)),0 0 5px hsl(var(--primary))'
      }}
    ></div>
  );
}
