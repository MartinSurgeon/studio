"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RoleSelection from '@/components/core/RoleSelection';
import { useAppContext } from '@/contexts/AppContext';
import LoadingSpinner from '@/components/core/LoadingSpinner';
import Link from 'next/link';
import SupabaseTroubleshooting from '@/components/core/SupabaseTroubleshooting';

export default function HomePage() {
  const { userRole, isLoading, isInitialized } = useAppContext();
  const nextRouter = useRouter();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  // Create a compatible router interface
  const router = {
    replace: (path: string) => nextRouter.push(path)
  };

  useEffect(() => {
    if (!isLoading && userRole) {
      router.replace('/dashboard');
    }
  }, [userRole, isLoading, router]);

  // Add a timeout to detect if loading takes too long
  useEffect(() => {
    if (isLoading) {
      const timeoutId = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000); // 10 seconds timeout
      
      return () => clearTimeout(timeoutId);
    }
  }, [isLoading]);

  // If still loading and we've detected it's taking too long, show the troubleshooting component
  if (isLoading && loadingTimeout) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <SupabaseTroubleshooting 
          onContinue={() => setLoadingTimeout(false)} 
        />
      </div>
    );
  }

  // The normal loading spinner for initial loading
  if (isLoading || userRole) {
    return <LoadingSpinner text="Loading GeoAttend..." fullScreen timeoutMs={15000} />;
  }

  return (
    <div>
      <RoleSelection />
      <div style={{ textAlign: 'center', marginTop: '20px' }} className="space-y-2">
        <Link href="/setup-guide">
          <button
            style={{
              padding: '8px 16px',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Supabase Setup Guide
          </button>
        </Link>
        <div className="mt-3">
          <Link href="/test-connection">
            <button
              style={{
                padding: '8px 16px',
                backgroundColor: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Test Supabase Connection
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
