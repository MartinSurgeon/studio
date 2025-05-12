"use client";
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/core/Header';
import { useAppContext } from '@/contexts/AppContext';
import LoadingSpinner from '@/components/core/LoadingSpinner';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { userRole, isLoading } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !userRole) {
      router.replace('/');
    }
  }, [userRole, isLoading, router]);

  if (isLoading || !userRole) {
    return <LoadingSpinner text="Verifying session..." fullScreen />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        GeoAttend &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
