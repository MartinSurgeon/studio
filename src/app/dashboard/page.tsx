"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import LecturerDashboard from '@/components/lecturer/LecturerDashboard';
import StudentDashboard from '@/components/student/StudentDashboard';
import LoadingSpinner from '@/components/core/LoadingSpinner';
import Link from 'next/link';
import SupabaseTroubleshooting from '@/components/core/SupabaseTroubleshooting';

export default function DashboardPage() {
  const { userRole, isLoading, studentId, isInitialized } = useAppContext();
  const router = useRouter();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  useEffect(() => {
    // If the user is a student but hasn't set up their profile, redirect to profile setup
    if (!isLoading && userRole === 'student' && !studentId) {
      router.push('/student/profile-setup');
    }
  }, [isLoading, userRole, studentId, router]);

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
          onGoHome={() => router.push('/')}
        />
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner text="Loading dashboard..." fullScreen={false} timeoutMs={15000} />;
  }

  if (userRole === 'lecturer') {
    return <LecturerDashboard />;
  }

  if (userRole === 'student') {
    // Only show the dashboard if the student has set up their profile
    if (studentId) {
      return <StudentDashboard />;
    } else {
      return <LoadingSpinner text="Redirecting to profile setup..." fullScreen={false} />;
    }
  }
  
  // If we're initialized but there's no role, show the no role message with a link back home
  if (isInitialized && !userRole) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center">
          <h2 className="text-xl font-bold mb-4">No Role Selected</h2>
          <p className="mb-6">Please select a role (student or lecturer) to continue.</p>
          <Link href="/">
            <button className="bg-primary text-white px-4 py-2 rounded-md">
              Go to Role Selection
            </button>
          </Link>
        </div>
      </div>
    );
  }
  
  // Fallback, though layout should redirect if no role
  return <p>No role selected or role is invalid. Please select a role.</p>; 
}
