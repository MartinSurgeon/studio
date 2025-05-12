"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RoleSelection from '@/components/core/RoleSelection';
import { useAppContext } from '@/contexts/AppContext';
import LoadingSpinner from '@/components/core/LoadingSpinner';

export default function HomePage() {
  const { userRole, isLoading } = useAppContext();
  const nextRouter = useRouter();
  
  // Create a compatible router interface
  const router = {
    replace: (path: string) => nextRouter.push(path)
  };

  useEffect(() => {
    if (!isLoading && userRole) {
      router.replace('/dashboard');
    }
  }, [userRole, isLoading, router]);

  if (isLoading || userRole) {
    return <LoadingSpinner text="Loading GeoAttend..." fullScreen />;
  }

  return <RoleSelection />;
}
