"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { UserRole, Class, AttendanceRecord } from '@/lib/types';
import { classService } from '@/lib/services/class.service';
import { attendanceService } from '@/lib/services/attendance.service';
import { authService, UserData } from '@/lib/services/auth.service';
import { useToast } from '@/hooks/use-toast';
import dynamic from 'next/dynamic';

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
  studentId: string | null;
  setStudentId: (id: string | null | ((val: string | null) => string | null)) => void;
  
  // New methods for Supabase integration
  fetchData: () => Promise<void>;
  syncToServer: () => Promise<boolean>;
  refreshAttendanceData: (classId?: string) => Promise<void>;
  user: UserData | null;
  isInitialized: boolean;
  logout: () => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Add this helper function after the imports but before the AppContextType interface
const clearAppState = () => {
  // Clear app-specific localStorage items
  // But use keys that don't have the tab ID prefix, as those are handled by the Supabase client
  localStorage.removeItem('geoattend-userRole');
  localStorage.removeItem('geoattend-studentId');
  localStorage.removeItem('geoattend-classes');
  localStorage.removeItem('geoattend-attendance');
  localStorage.removeItem('geoattend-testingMode');
  
  // Also remove potential sessionStorage items
  sessionStorage.removeItem('lastAttendanceRefresh');
  
  // Return a blank state
  return {
    userRole: null,
    studentId: null,
    classes: [],
    attendanceRecords: [],
    testingMode: process.env.NODE_ENV === 'development'
  };
};

// Create a client-only component for the emergency UI
const EmergencyUI = dynamic(() => Promise.resolve(({ 
  isLoading, 
  testingMode, 
  setTestingMode, 
  setIsLoading, 
  setIsInitialized, 
  setDataFetched 
}: { 
  isLoading: boolean; 
  testingMode: boolean; 
  setTestingMode: (mode: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setIsInitialized: (initialized: boolean) => void;
  setDataFetched: (fetched: boolean) => void;
}) => {
  if (!isLoading || testingMode) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/80 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
        <h2 className="text-xl font-bold text-amber-600 mb-2">Loading Taking Too Long</h2>
        <p className="mb-4">The app is taking longer than expected to load. You can continue in testing mode.</p>
        <div className="flex flex-col space-y-3">
          <button 
            className="bg-amber-100 text-amber-800 px-4 py-2 rounded hover:bg-amber-200 transition-colors"
            onClick={() => {
              setTestingMode(true);
              setIsLoading(false);
              setIsInitialized(true);
              setDataFetched(true);
              console.log("Emergency: Enabling testing mode to bypass loading");
            }}
          >
            Continue in Testing Mode
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Testing mode will allow you to use the app without waiting for the server connection.
          </p>
        </div>
      </div>
    </div>
  );
}), { ssr: false }); // Important: Disable server-side rendering

// Create a client-only component for the auth error UI
const AuthErrorUI = dynamic(() => Promise.resolve(({ 
  authError, 
  setTestingMode, 
  setAuthError, 
  setIsInitialized,
  setIsLoading,
  setDataFetched
}: { 
  authError: string | null; 
  setTestingMode: (mode: boolean) => void;
  setAuthError: (error: string | null) => void;
  setIsInitialized: (initialized: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setDataFetched: (fetched: boolean) => void;
}) => {
  if (!authError) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/80 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
        <h2 className="text-xl font-bold text-amber-600 mb-2">Connection Issue</h2>
        <p className="mb-4">{authError}</p>
        <div className="flex flex-col space-y-3">
          <button 
            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 transition-colors"
            onClick={() => window.location.reload()}
          >
            Retry Connection
          </button>
          <button 
            className="bg-amber-100 text-amber-800 px-4 py-2 rounded hover:bg-amber-200 transition-colors"
            onClick={() => {
              setTestingMode(true);
              setAuthError(null);
              setIsInitialized(true);
              setIsLoading(false);
              setDataFetched(true);
              console.log("Enabling testing mode after connection issue");
            }}
          >
            Continue in Testing Mode
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Testing mode lets you explore the app's functionality offline. Note that attendance records will not be permanently saved.
          </p>
        </div>
      </div>
    </div>
  );
}), { ssr: false }); // Important: Disable server-side rendering

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [userRole, setUserRole] = useLocalStorage<UserRole>('geoattend-userRole', null);
  const [studentId, setStudentId] = useLocalStorage<string | null>('geoattend-studentId', null);
  const [classes, setClasses] = useLocalStorage<Class[]>('geoattend-classes', []);
  const [attendanceRecords, setAttendanceRecords] = useLocalStorage<AttendanceRecord[]>('geoattend-attendance', []);
  const [testingMode, setTestingMode] = useLocalStorage<boolean>('geoattend-testingMode', process.env.NODE_ENV === 'development');
  
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { toast } = useToast();

  // Function to refresh attendance data (can be called from anywhere)
  const refreshAttendanceData = async (classId?: string) => {
    if (!user || !userRole) {
      console.log("AppContext: Cannot refresh - missing user or role");
      return;
    }
    
    // Prevent concurrent refreshes
    if (isRefreshing) {
      console.log("AppContext: Refresh already in progress, skipping");
      return;
    }
    
    // Add some debouncing - track last refresh time
    const now = Date.now();
    const lastRefreshKey = 'lastAttendanceRefresh';
    const lastRefresh = window.sessionStorage.getItem(lastRefreshKey);
    
    if (lastRefresh) {
      const lastRefreshTime = parseInt(lastRefresh, 10);
      const timeSinceLastRefresh = now - lastRefreshTime;
      
      // Only allow refresh if it's been at least 10 seconds since the last one
      // Unless it's a manual refresh for a specific class
      if (!classId && timeSinceLastRefresh < 10000) {
        console.log(`AppContext: Refresh too soon (${timeSinceLastRefresh}ms since last refresh), skipping`);
        return;
      }
    }
    
    // Update the last refresh time
    window.sessionStorage.setItem(lastRefreshKey, now.toString());
    
    console.log(`AppContext: Refreshing attendance data ${classId ? `for class ${classId}` : 'for all classes'}`);
    setIsRefreshing(true);
    
    try {
      let fetchedRecords: AttendanceRecord[] = [];
      
      if (userRole === 'lecturer') {
        // For lecturers, refresh attendance for one or all of their classes
        if (classId) {
          // Refresh for a specific class
          fetchedRecords = await attendanceService.getAttendanceRecords({ classId });
          console.log(`AppContext: Fetched ${fetchedRecords.length} attendance records for class ${classId}`);
          
          // Update only the records for this class, keep others unchanged
          const otherRecords = attendanceRecords.filter(rec => rec.classId !== classId);
          setAttendanceRecords([...otherRecords, ...fetchedRecords]);
        } else {
          // Refresh for all classes taught by this lecturer
          const activeClasses = classes.filter(c => c.active);
          console.log(`AppContext: Fetching records for ${activeClasses.length} active classes`);
          
          if (activeClasses.length === 0) {
            console.log("AppContext: No active classes to refresh");
            return;
          }
          
          const classIds = activeClasses.map(c => c.id);
          for (const id of classIds) {
            try {
              const records = await attendanceService.getAttendanceRecords({ classId: id });
              fetchedRecords = [...fetchedRecords, ...records];
            } catch (classError) {
              console.error(`AppContext: Error fetching records for class ${id}:`, classError);
              // Continue with other classes
            }
          }
          console.log(`AppContext: Fetched ${fetchedRecords.length} total attendance records for all active classes`);
          
          // Keep records from inactive classes
          const inactiveClasses = classes.filter(c => !c.active);
          const inactiveClassIds = inactiveClasses.map(c => c.id);
          const inactiveRecords = attendanceRecords.filter(rec => inactiveClassIds.includes(rec.classId));
          
          const updatedRecords = [...inactiveRecords, ...fetchedRecords];
          
          // Only update if there are actual changes
          const recordsChanged = 
            updatedRecords.length !== attendanceRecords.length || 
            JSON.stringify(updatedRecords) !== JSON.stringify(attendanceRecords);
          
          if (recordsChanged) {
            console.log("AppContext: Updating attendance records with changes");
            setAttendanceRecords(updatedRecords);
          } else {
            console.log("AppContext: No changes in attendance records");
          }
        }
      } else if (userRole === 'student' && studentId) {
        // For students, refresh their own attendance records
        fetchedRecords = await attendanceService.getAttendanceRecords({ studentId });
        console.log(`AppContext: Fetched ${fetchedRecords.length} attendance records for student ${studentId}`);
        
        // Only update if there are actual changes
        const recordsChanged = 
          fetchedRecords.length !== attendanceRecords.length || 
          JSON.stringify(fetchedRecords) !== JSON.stringify(attendanceRecords);
        
        if (recordsChanged) {
          setAttendanceRecords(fetchedRecords);
        } else {
          console.log("AppContext: No changes in student attendance records");
        }
      }
    } catch (error) {
      console.error('AppContext: Error refreshing attendance data', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Listen for attendance-marked events
  useEffect(() => {
    // Safely check for browser environment
    if (typeof window === 'undefined') return;
    
    // Define the event handler
    const handleAttendanceMarked = async (event: Event) => {
      const customEvent = event as CustomEvent<{classId: string}>;
      console.log('AppContext: Attendance marked event received:', customEvent.detail);
      
      // Wait a moment to ensure the database has processed the record
      setTimeout(() => {
        if (customEvent.detail.classId) {
          console.log(`AppContext: Refreshing after attendance marked for class ${customEvent.detail.classId}`);
          refreshAttendanceData(customEvent.detail.classId);
        }
      }, 1500);
    };
    
    // Add event listener
    console.log('AppContext: Adding attendance-marked event listener');
    window.addEventListener('attendance-marked', handleAttendanceMarked);
    
    // Clean up
    return () => {
      console.log('AppContext: Removing attendance-marked event listener');
      window.removeEventListener('attendance-marked', handleAttendanceMarked);
    };
  }, [userRole, user]); // Remove the refreshAttendanceData dependency to prevent infinite loops

  // Initial load - check if user is authenticated with Supabase
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      
      // Skip authentication checks if testing mode is enabled
      if (testingMode) {
        console.log('Testing mode enabled: skipping authentication check');
        setIsLoading(false);
        setIsInitialized(true);
        return;
      }
      
      // Add timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.error('Authentication initialization timed out after 10 seconds');
        setIsLoading(false);
        setIsInitialized(true);
        // Use a more user-friendly error message
        setAuthError('We\'re having trouble connecting to the server. This could be due to network issues or system maintenance.');
      }, 10000);
      
      try {
        const userData = await authService.getCurrentUser();
        
        // Clear the timeout since we got a response
        clearTimeout(timeoutId);
        
        setUser(userData);
        
        // If we have a user from Supabase, use that role
        if (userData) {
          setUserRole(userData.role);
          if (userData.role === 'student') {
            setStudentId(userData.id);
          }
        }
      } catch (error) {
        // Clear the timeout since we got a response (even if it's an error)
        clearTimeout(timeoutId);
        
        console.error('Error initializing auth', error);
        
        // Provide a more user-friendly error message
        if (error instanceof Error) {
          if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            setAuthError('Network connection issue. Please check your internet connection and try again.');
          } else if (error.message.includes('Invalid API key')) {
            setAuthError('System configuration issue. Please contact support for assistance.');
          } else {
            setAuthError('Unable to connect to the service. Please try again later.');
          }
        } else {
          setAuthError('Connection issue. Please try refreshing the page.');
        }
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, [setUserRole, setStudentId, testingMode]);

  // Fetch data from Supabase
  const fetchData = async () => {
    if (!user || dataFetched) return;
    
    console.log("AppContext: fetchData called - starting data fetch");
    setIsLoading(true);
    
    try {
      // Mark as fetched to prevent duplicate fetches
      setDataFetched(true);
      
      // Fetch classes
      let fetchedClasses: Class[] = [];
      if (userRole === 'lecturer') {
        console.log(`AppContext: Fetching classes for lecturer ${user.id}`);
        fetchedClasses = await classService.getClasses(user.id);
      } else if (userRole === 'student') {
        // For students, we need a different approach to fetch classes they're enrolled in
        console.log("AppContext: Fetching all classes for student");
        fetchedClasses = await classService.getClasses(); // For now, fetch all classes
      }
      
      if (fetchedClasses.length > 0) {
        console.log(`AppContext: Setting ${fetchedClasses.length} classes`);
        setClasses(fetchedClasses);
      } else {
        console.log("AppContext: No classes found");
      }
      
      // Fetch attendance records
      let fetchedRecords: AttendanceRecord[] = [];
      if (userRole === 'lecturer') {
        // Get all attendance records for classes taught by this lecturer
        const classIds = fetchedClasses.map(c => c.id);
        console.log(`AppContext: Fetching attendance records for ${classIds.length} classes`);
        for (const classId of classIds) {
          const records = await attendanceService.getAttendanceRecords({ classId });
          fetchedRecords = [...fetchedRecords, ...records];
        }
      } else if (userRole === 'student' && studentId) {
        // Get attendance records for this student
        console.log(`AppContext: Fetching attendance records for student ${studentId}`);
        fetchedRecords = await attendanceService.getAttendanceRecords({ studentId });
      }
      
      if (fetchedRecords.length > 0) {
        console.log(`AppContext: Setting ${fetchedRecords.length} attendance records`);
        setAttendanceRecords(fetchedRecords);
      } else {
        console.log("AppContext: No attendance records found");
      }
    } catch (error) {
      console.error('AppContext: Error fetching data', error);
    } finally {
    setIsLoading(false); 
    }
  };

  // Sync local data to Supabase
  const syncToServer = async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      setIsLoading(true);
      
      // Sync classes
      if (userRole === 'lecturer') {
        for (const classItem of classes) {
          // Check if class exists in Supabase
          const existingClass = await classService.getClass(classItem.id);
          
          if (existingClass) {
            // Update
            await classService.updateClass(classItem.id, classItem);
          } else {
            // Create
            await classService.createClass(classItem);
          }
        }
      }
      
      // Sync attendance records
      for (const record of attendanceRecords) {
        // Check if record exists in Supabase
        const existingRecord = await attendanceService.getAttendanceRecord(record.id);
        
        if (existingRecord) {
          // Update
          await attendanceService.updateAttendanceRecord(record.id, record);
        } else {
          // Create
          await attendanceService.createAttendanceRecord(record);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error syncing data to server', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // This effect ensures that localStorage has been read before rendering children
  useEffect(() => {
    if (isInitialized && user && !dataFetched) {
      // Skip data fetching if in testing mode
      if (testingMode) {
        console.log("AppContext: Skipping data fetch in testing mode");
        setDataFetched(true);
        setIsLoading(false);
        return;
      }
      
      // If we're initialized and have a user, fetch data from Supabase
      console.log("AppContext: Triggering initial data fetch");
      
      // Add timeout to prevent infinite loading during data fetch
      const fetchTimeoutId = setTimeout(() => {
        console.error('Data fetching timed out after 15 seconds');
        setIsLoading(false);
        setDataFetched(true); // Mark as fetched to prevent retries
        // Don't show an error message for this - just silently recover
        // Users will still see the UI with empty data, which is better than an error
        toast({
          title: "Slow connection detected",
          description: "Some data might not be up to date. Pull down to refresh when needed.",
          duration: 5000,
        });
      }, 15000);
      
      fetchData().finally(() => {
        clearTimeout(fetchTimeoutId);
      });
    } else if (isInitialized && !user) {
      // If initialized but no user, make sure we're not in loading state
      setIsLoading(false);
    }
  }, [isInitialized, user, dataFetched, testingMode, toast]);

  // Add a proper logout method that handles both Supabase and local state
  const logout = async (): Promise<boolean> => {
    console.log("AppContext: Logging out user");
    setIsLoading(true);
    
    try {
      // Call Supabase auth signOut
      const success = await authService.signOut();
      
      if (success) {
        // Clear all application state
        setUser(null);
        
        // Use the helper function to clear state
        const clearedState = clearAppState();
        setUserRole(clearedState.userRole);
        setStudentId(clearedState.studentId);
        setClasses(clearedState.classes);
        setAttendanceRecords(clearedState.attendanceRecords);
        setTestingMode(clearedState.testingMode);
        
        setDataFetched(false);
        console.log("AppContext: Logout successful, all data cleared");
        return true;
      } else {
        console.error("AppContext: Supabase logout failed");
        return false;
      }
    } catch (error) {
      console.error("AppContext: Error during logout", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppContext.Provider value={{ 
      userRole, setUserRole,
      classes, setClasses,
      attendanceRecords, setAttendanceRecords,
      testingMode, setTestingMode,
      isLoading,
      studentId, setStudentId,
      fetchData,
      syncToServer,
      refreshAttendanceData,
      user,
      isInitialized,
      logout
    }}>
      {/* EMERGENCY FIX: Always render children regardless of loading state to prevent perpetual loading */}
      {children}
      
      {/* Show the error dialog only if there's an actual auth error */}
      {authError && (
        <AuthErrorUI 
          authError={authError}
          setTestingMode={setTestingMode}
          setAuthError={setAuthError}
          setIsInitialized={setIsInitialized}
          setIsLoading={setIsLoading}
          setDataFetched={setDataFetched}
        />
      )}

      {/* EMERGENCY FIX: Add a timeout bypass that forces testing mode after 5 seconds of loading */}
      {isLoading && !testingMode && (
        <EmergencyUI 
          isLoading={isLoading}
          testingMode={testingMode}
          setTestingMode={setTestingMode}
          setIsLoading={setIsLoading}
          setIsInitialized={setIsInitialized}
          setDataFetched={setDataFetched}
        />
      )}
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
