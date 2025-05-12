"use client";

import { useAppContext } from '@/contexts/AppContext';
import LecturerDashboard from '@/components/lecturer/LecturerDashboard';
import StudentDashboard from '@/components/student/StudentDashboard';
import LoadingSpinner from '@/components/core/LoadingSpinner';

export default function DashboardPage() {
  const { userRole, isLoading } = useAppContext();

  if (isLoading) {
    return <LoadingSpinner text="Loading dashboard..." fullScreen={false} />;
  }

  if (userRole === 'lecturer') {
    return <LecturerDashboard />;
  }

  if (userRole === 'student') {
    return <StudentDashboard />;
  }
  
  // Fallback, though layout should redirect if no role
  return <p>No role selected or role is invalid. Please select a role.</p>; 
}
