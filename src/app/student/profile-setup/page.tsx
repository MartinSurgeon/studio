"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StudentProfileSetup from '@/components/student/StudentProfileSetup';
import { useAppContext } from '@/contexts/AppContext';
import LoadingSpinner from '@/components/core/LoadingSpinner';

export default function StudentProfileSetupPage() {
  const { userRole, isLoading, studentId } = useAppContext();
  const router = useRouter();
  
  useEffect(() => {
    // If not student, redirect to home
    if (!isLoading && userRole !== 'student') {
      router.push('/');
    }
    
    // If student already has profile, redirect to dashboard
    if (!isLoading && userRole === 'student' && studentId) {
      router.push('/dashboard');
    }
  }, [isLoading, userRole, studentId, router]);

  if (isLoading) {
    return <LoadingSpinner text="Loading..." fullScreen />;
  }

  if (userRole !== 'student') {
    return <LoadingSpinner text="Redirecting..." fullScreen />;
  }
  
  return <StudentProfileSetup />;
} 