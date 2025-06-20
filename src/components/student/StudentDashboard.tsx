"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ActiveClassCard from './ActiveClassCard';
import AttendanceHistoryTable from './AttendanceHistoryTable';
import { useAppContext } from '@/contexts/AppContext';
import type { AttendanceRecord, Class } from '@/lib/types';
import { 
  ListChecks, 
  History, 
  Users, 
  Search, 
  User, 
  BarChart, 
  Award, 
  Calendar, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Map,
  Edit,
  PieChart,
  BookOpen
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/core/LoadingSpinner';
import { classService } from '@/lib/services/class.service';
import { attendanceService } from '@/lib/services/attendance.service';
import { NotificationService } from '@/app/services/notification.service';

export default function StudentDashboard() {
  const { classes, setClasses, attendanceRecords, setAttendanceRecords, studentId, user, refreshAttendanceData } = useAppContext();
  const [activeTab, setActiveTab] = useState("activeClasses");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [fetchingClasses, setFetchingClasses] = useState(false);
  const [fetchAttempted, setFetchAttempted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const classesRef = useRef(classes);
  const isRefreshingRef = useRef(isRefreshing);

  const notificationService = new NotificationService();

  useEffect(() => {
    classesRef.current = classes;
  }, [classes]);

  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  // Function to refresh classes data
  const refreshClassesData = useCallback(async (showToast = false) => {
    if (!studentId || isRefreshingRef.current) return;
    setIsRefreshing(true);
    console.log("StudentDashboard: Refreshing classes data");
    try {
      // Fetch all available classes (including newly created ones)
      const fetchedClasses = await classService.getClasses();
      if (fetchedClasses && JSON.stringify(fetchedClasses) !== JSON.stringify(classesRef.current)) {
        setClasses(fetchedClasses);
        if (showToast) {
          toast({
            title: 'Classes Updated',
            description: `Found ${fetchedClasses.length - classesRef.current.length > 0 ? 'new' : 'updated'} classes`,
          });
        }
      }
      // Also refresh attendance records
      await refreshAttendanceData();
    } catch (error) {
      console.error('StudentDashboard: Error refreshing classes:', error);
      if (showToast) {
        toast({
          title: 'Refresh Failed',
          description: 'Could not update class data. Please try again.',
          variant: 'destructive'
        });
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [studentId, setClasses, toast, refreshAttendanceData]);

  // Set up polling for class updates
  useEffect(() => {
    if (!studentId) return;
    console.log("StudentDashboard: Setting up class data polling");
    const pollingInterval = setInterval(() => {
      refreshClassesData(false);
    }, 60000);
    const emergencyTimer = setTimeout(() => {
      if (isLoading) {
        console.log("EMERGENCY: Dashboard still loading after 8 seconds, automatically switching to offline mode");
        toast({
          title: "Loading Taking Too Long",
          description: "Automatically switching to offline mode to improve your experience.",
        });
        window.location.href = '/?enableTestingMode=true';
      }
    }, 8000);
    return () => {
      console.log("StudentDashboard: Cleaning up class polling");
      clearInterval(pollingInterval);
      clearTimeout(emergencyTimer);
    };
  }, [studentId, refreshClassesData, isLoading, toast]);

  // Listen for class created/updated events
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Define the event handler
    const handleClassUpdated = () => {
      console.log('StudentDashboard: Class updated event received');
      // Refresh class list
      refreshClassesData(true);
    };
    
    // Add event listener
    window.addEventListener('class-updated', handleClassUpdated);
    
    // Clean up
    return () => {
      window.removeEventListener('class-updated', handleClassUpdated);
    };
  }, [refreshClassesData]);

  // First check if student ID is set
  useEffect(() => {
    // Short delay to prevent flash on fast checks
    const timer = setTimeout(() => {
      if (!studentId) {
        toast({
          title: "Index Number Required",
          description: "You must set your student index number before accessing the dashboard.",
          variant: "destructive"
        });
        router.push('/student/profile-setup');
      } else {
        setIsLoading(false);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [studentId, router, toast]);

  // Fetch classes from Supabase
  useEffect(() => {
    // Only fetch if we haven't already, we're not loading, and we have a studentId
    if (!isLoading && studentId && !fetchAttempted) {
      const fetchData = async () => {
        setFetchingClasses(true);
        setFetchAttempted(true); // Mark as attempted to prevent loops
        
        try {
          console.log("StudentDashboard: Starting fetch of classes");
          // Fetch all available classes
          const fetchedClasses = await classService.getClasses();
          if (fetchedClasses && fetchedClasses.length > 0) {
            console.log(`StudentDashboard: Fetched ${fetchedClasses.length} classes from Supabase`);
            setClasses(fetchedClasses);
          } else {
            console.log('StudentDashboard: No classes found in database');
          }

          // Fetch student's attendance records
          console.log(`StudentDashboard: Fetching attendance records for student ${studentId}`);
          const fetchedRecords = await attendanceService.getAttendanceRecords({ studentId });
          if (fetchedRecords && fetchedRecords.length > 0) {
            console.log(`StudentDashboard: Fetched ${fetchedRecords.length} attendance records for student`);
            setAttendanceRecords(fetchedRecords);
          } else {
            console.log('StudentDashboard: No attendance records found for student');
          }
        } catch (error) {
          console.error('StudentDashboard: Error fetching classes or attendance records:', error);
          toast({
            title: 'Error Fetching Data',
            description: 'Could not load class data from the server. Please try refreshing the page.',
            variant: 'destructive'
          });
        } finally {
          setFetchingClasses(false);
        }
      };

      fetchData();
    }
  }, [isLoading, studentId, fetchAttempted, toast]);

  const handleMarkAttendance = (newRecord: AttendanceRecord) => {
    console.log("StudentDashboard: Adding new attendance record:", {
      id: newRecord.id,
      classId: newRecord.classId,
      studentId: newRecord.studentId,
      method: newRecord.verificationMethod
    });
    
    // Check if the record already exists to prevent duplicates
    const recordExists = attendanceRecords.some(
      record => record.id === newRecord.id || 
        (record.classId === newRecord.classId && record.studentId === newRecord.studentId)
    );
    
    if (recordExists) {
      console.log("StudentDashboard: Record already exists in attendance records, skipping");
      return;
    }
    
    setAttendanceRecords(prevRecords => [...prevRecords, newRecord]);
    
    // Also trigger a refresh of attendance data after a short delay
    // This ensures the new record appears in statistics and history
    setTimeout(() => {
      refreshClassesData(false);
    }, 2000);
  };

  const activeClasses = useMemo(() => {
    return classes.filter(c => c.active);
  }, [classes]);
  
  const filteredActiveClasses = useMemo(() => {
    if (!searchQuery) return activeClasses;
    const query = searchQuery.toLowerCase();
    return activeClasses.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.lecturerId.toLowerCase().includes(query)
    );
  }, [activeClasses, searchQuery]);
  
  const studentAttendanceHistory = useMemo(() => {
    return attendanceRecords.filter(ar => ar.studentId === studentId);
  }, [attendanceRecords, studentId]);

  // Calculate student statistics
  const studentStats = useMemo(() => {
    // Total classes student has attended
    const attendedClassIds = new Set(studentAttendanceHistory.map(record => record.classId));
    const totalClassesAttended = attendedClassIds.size;
    
    // Status breakdown
    const statusCounts = studentAttendanceHistory.reduce((acc, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Attendance rate
    const totalPossibleClasses = classes.length;
    const attendanceRate = totalPossibleClasses > 0 
      ? (totalClassesAttended / totalPossibleClasses) * 100 
      : 0;
    
    // Check-in methods
    const checkInMethods = studentAttendanceHistory.reduce((acc, record) => {
      acc[record.verificationMethod] = (acc[record.verificationMethod] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Recent classes
    const recentClasses = [...studentAttendanceHistory]
      .sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime())
      .slice(0, 3)
      .map(record => {
        const classInfo = classes.find(c => c.id === record.classId);
        return {
          ...record,
          className: classInfo?.name || 'Unknown Class'
        };
      });
      
    return {
      totalClassesAttended,
      statusCounts,
      attendanceRate,
      checkInMethods,
      recentClasses
    };
  }, [studentAttendanceHistory, classes]);

  // Set up notifications for active classes
  useEffect(() => {
    const setupNotifications = async () => {
      const hasPermission = await notificationService.requestPermission();
      if (hasPermission) {
        await notificationService.scheduleMultipleClassNotifications(activeClasses);
      }
    };

    setupNotifications();
  }, [activeClasses]);

  // Handle class start events
  useEffect(() => {
    const handleClassStart = (event: Event) => {
      const customEvent = event as CustomEvent<{ classId: string }>;
      const classItem = classes.find(c => c.id === customEvent.detail.classId);
      if (classItem) {
        notificationService.notifyClassStarted(classItem);
      }
    };

    window.addEventListener('class-started', handleClassStart);
    return () => {
      window.removeEventListener('class-started', handleClassStart);
    };
  }, [classes]);

  // Handle mark attendance from notification
  useEffect(() => {
    const handleMarkAttendanceFromNotification = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const markAttendance = urlParams.get('markAttendance');
      const classId = urlParams.get('classId');

      if (markAttendance === 'true' && classId) {
        const classItem = classes.find(c => c.id === classId);
        if (classItem) {
          // Trigger attendance marking
          const activeClassCard = document.querySelector(`[data-class-id="${classId}"]`);
          if (activeClassCard) {
            const markAttendanceButton = activeClassCard.querySelector('[data-action="mark-attendance"]');
            if (markAttendanceButton instanceof HTMLElement) {
              markAttendanceButton.click();
            }
          }
        }
      }
    };

    handleMarkAttendanceFromNotification();
  }, [classes]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <LoadingSpinner />
      </div>
    );
  }

  // Display message if studentId is missing (fallback security)
  if (!studentId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <AlertTriangle className="h-16 w-16 text-yellow-500" />
        <h2 className="text-xl font-bold">Student ID Required</h2>
        <p className="text-center max-w-md text-muted-foreground">
          {user ? 
            `Welcome ${user.displayName || user.email}! You must set your student index number before you can mark attendance or view classes.` :
            'You must set your student index number before you can mark attendance or view classes.'
          }
        </p>
        <Button onClick={() => router.push('/student/profile-setup')}>
          Set Up Your Profile
        </Button>
      </div>
    );
  }

  // Get first character from student ID for the avatar
  const studentInitial = studentId.charAt(0).toUpperCase();

  return (
    <div className="space-y-8">
      {/* Header with Student Info */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Student Dashboard</h1>
          <p className="text-muted-foreground mt-1">Track your attendance and manage your classes</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex flex-col items-end">
            <span className="text-base font-semibold">
              {user?.displayName || 'Student'}
            </span>
            <div className="flex items-center text-sm text-muted-foreground">
              <User className="h-4 w-4 mr-1" />
              <span>Index: {user?.indexNumber || studentId}</span>
            </div>
          </div>
          <Avatar className="h-10 w-10">
            <AvatarImage 
              src={`https://api.dicebear.com/7.x/initials/svg?seed=${studentInitial}`}
              className="bg-primary/10"
            />
            <AvatarFallback>{studentInitial}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Present</p>
                <h3 className="text-2xl font-bold text-green-700">
                  {studentStats.statusCounts?.Present || 0}
                </h3>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Classes</p>
                <h3 className="text-2xl font-bold text-blue-700">
                  {studentStats.totalClassesAttended}
                </h3>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Attendance Rate</p>
                <h3 className="text-2xl font-bold text-yellow-700">
                  {studentStats.attendanceRate.toFixed(0)}%
                </h3>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Award className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 mb-6">
          <TabsTrigger value="activeClasses" className="py-3">
            <ListChecks className="mr-2 h-5 w-5" />
            <span className="hidden sm:inline">Active Classes</span>
            <span className="sm:hidden">Active</span>
          </TabsTrigger>
          <TabsTrigger value="statistics" className="py-3">
            <BarChart className="mr-2 h-5 w-5" />
            <span className="hidden sm:inline">Statistics</span>
            <span className="sm:hidden">Stats</span>
          </TabsTrigger>
          <TabsTrigger value="attendanceHistory" className="py-3">
            <History className="mr-2 h-5 w-5" />
            <span className="hidden sm:inline">Attendance History</span>
            <span className="sm:hidden">History</span>
          </TabsTrigger>
          <TabsTrigger value="manageClasses" className="hidden lg:flex py-3">
            <Edit className="mr-2 h-5 w-5" />
            <span>Manage Classes</span>
          </TabsTrigger>
          <TabsTrigger value="statistics2" className="hidden lg:flex py-3">
            <PieChart className="mr-2 h-5 w-5" />
            <span>Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="hidden lg:flex py-3">
            <BookOpen className="mr-2 h-5 w-5" />
            <span>Reports</span>
          </TabsTrigger>
        </TabsList>

        {/* Active Classes Tab */}
        <TabsContent value="activeClasses">
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search classes by name or lecturer..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)} 
                className="pl-9"
              />
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refreshClassesData(true)}
              disabled={isRefreshing}
              className="w-full sm:w-auto"
            >
              {isRefreshing ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" text="" />
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  <span>Refresh Classes</span>
                </>
              )}
            </Button>
          </div>
          
          {fetchingClasses || isRefreshing ? (
            <div className="flex justify-center items-center py-20">
              <LoadingSpinner text={isRefreshing ? "Refreshing classes..." : "Loading classes..."} />
            </div>
          ) : filteredActiveClasses.length === 0 ? (
            <Card className="bg-muted/50">
              <CardContent className="flex flex-col items-center justify-center py-10">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-xl font-medium text-muted-foreground">No active classes found</p>
                {searchQuery ? (
                  <p className="text-sm text-muted-foreground mt-1">Try a different search term</p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">Classes created by lecturers will appear here</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredActiveClasses.map(classItem => (
                <ActiveClassCard
                  key={classItem.id}
                  classItem={classItem}
                  studentId={studentId}
                  onMarkAttendance={handleMarkAttendance}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="statistics">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Attendance Summary</h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Total: {studentStats.totalClassesAttended}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold text-green-600">
                      {studentStats.statusCounts?.Present || 0}
                    </span>
                    <span className="text-sm text-muted-foreground">Present</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold text-yellow-600">
                      {studentStats.statusCounts?.Late || 0}
                    </span>
                    <span className="text-sm text-muted-foreground">Late</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold text-red-600">
                      {studentStats.statusCounts?.Absent || 0}
                    </span>
                    <span className="text-sm text-muted-foreground">Absent</span>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-yellow-50 rounded-md">
                  <div className="text-xl font-bold text-center text-yellow-700">
                    {studentStats.attendanceRate.toFixed(0)}%
                  </div>
                  <div className="text-sm text-yellow-700 flex items-center mt-2">
                    <Award className="mr-1 h-4 w-4" /> Attendance Rate
                  </div>
                </div>
              </Card>
            </div>
            
            {/* Attendance Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Attendance Progress</CardTitle>
                <CardDescription>Your attendance rate over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Overall Progress</span>
                      <span className="text-sm font-medium">{studentStats.attendanceRate.toFixed(0)}%</span>
                    </div>
                    <Progress className="h-2 mt-2" value={studentStats.attendanceRate} />
                  </div>
                  
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-2">Check-in Methods</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm">QR Code: {studentStats.checkInMethods?.QR || 0}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="text-sm">Location: {studentStats.checkInMethods?.Location || 0}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-2">Recent Class Check-ins</h4>
                    {studentStats.recentClasses.length > 0 ? (
                      <div className="space-y-2">
                        {studentStats.recentClasses.map(record => (
                          <div key={record.id} className="p-2 bg-muted rounded-md flex justify-between items-center">
                            <div>
                              <div className="font-medium">{record.className}</div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(record.checkInTime).toLocaleString()}
                              </div>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              record.status === 'Present' ? 'bg-green-100 text-green-800' : 
                              record.status === 'Late' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-red-100 text-red-800'
                            }`}>
                              {record.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No recent check-ins</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attendanceHistory">
          <AttendanceHistoryTable records={studentAttendanceHistory} classes={classes} />
        </TabsContent>

        <TabsContent value="manageClasses">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Class Management</CardTitle>
                <CardDescription>View and manage your enrolled classes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-10 text-muted-foreground">
                  Class management features coming soon
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="statistics2">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Analytics</CardTitle>
                <CardDescription>View comprehensive attendance analytics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-10 text-muted-foreground">
                  Detailed analytics features coming soon
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Reports</CardTitle>
                <CardDescription>Generate and view attendance reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-10 text-muted-foreground">
                  Report generation features coming soon
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
