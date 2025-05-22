'use client';

import { useEffect } from 'react';
import { backgroundService } from '@/lib/services/background.service';

export default function BackgroundServiceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Start the background service
    backgroundService.start();

    // Cleanup on unmount
    return () => {
      backgroundService.stop();
    };
  }, []);

  return <>{children}</>;
} 