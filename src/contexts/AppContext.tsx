"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { UserRole, Class, AttendanceRecord } from '@/lib/types';

interface AppContextType {
  userRole: UserRole;
  setUserRole: (role: UserRole | ((val: UserRole) => UserRole)) => void;
  classes: Class[];
  setClasses: (classes: Class[] | ((val: Class[]) => Class[])) => void;
  attendanceRecords: AttendanceRecord[];
  setAttendanceRecords: (records: AttendanceRecord[] | ((val: AttendanceRecord[]) => AttendanceRecord[])) => void;
  testingMode: boolean;
  setTestingMode: (mode: boolean | ((val: boolean) => boolean)) => void;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [userRole, setUserRole] = useLocalStorage<UserRole>('geoattend-userRole', null);
  const [classes, setClasses] = useLocalStorage<Class[]>('geoattend-classes', []);
  const [attendanceRecords, setAttendanceRecords] = useLocalStorage<AttendanceRecord[]>('geoattend-attendance', []);
  const [testingMode, setTestingMode] = useLocalStorage<boolean>('geoattend-testingMode', process.env.NODE_ENV === 'development'); // Default true in dev
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This effect helps ensure that localStorage has been read before rendering children
    // useful if initial state depends on localStorage and causes flicker/mismatch
    setIsLoading(false); 
  }, []);


  return (
    <AppContext.Provider value={{ 
      userRole, setUserRole,
      classes, setClasses,
      attendanceRecords, setAttendanceRecords,
      testingMode, setTestingMode,
      isLoading
    }}>
      {!isLoading && children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
