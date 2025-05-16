"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { PlusCircle, BookOpen, Users, Edit, PieChart, Calendar, Clock } from 'lucide-react';
import CreateClassForm from './CreateClassForm';
import ClassManagementCard from './ClassManagementCard';
import AttendanceReportTable from './AttendanceReportTable';
import { useAppContext } from '@/contexts/AppContext';
import type { Class, AttendanceRecord, AttendanceStatus } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { classService } from '@/lib/services/class.service';
import { attendanceService } from '@/lib/services/attendance.service';

export default function LecturerDashboard() {
  const { classes, setClasses, attendanceRecords, setAttendanceRecords, user } = useAppContext();
  const [selectedClassForReport, setSelectedClassForReport] = useState<Class | null>(null);
  const [activeTab, setActiveTab] = useState("manageClasses");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const [fetchAttempted, setFetchAttempted] = useState(false);

  // Function to refresh attendance data for active classes
  const refreshAttendanceData = useCallback(async (showToastOrClassId: boolean | string = false) => {
    if (!user || !user.id || !classes.length) {
      console.log("LecturerDashboard: Cannot refresh - missing user or classes");
      return;
    }
    
    // Prevent refreshing if already in progress
    if (isRefreshing) {
      console.log("LecturerDashboard: Refresh already in progress, skipping");
      return;
    }
    
    // Determine if we should show toast and if we're filtering for a specific class
    const showToast = typeof showToastOrClassId === 'boolean' ? showToastOrClassId : true;
    const specificClassId = typeof showToastOrClassId === 'string' ? showToastOrClassId : undefined;
    
    try {
      setIsRefreshing(true);
      console.log(`LecturerDashboard: Refreshing attendance data${specificClassId ? ` for class ${specificClassId}` : ''}`);
      
      // Determine which class IDs to fetch
      let classIdsToFetch: string[] = [];
      
      if (specificClassId) {
        // If a specific class ID was provided, only fetch for that class
        classIdsToFetch = [specificClassId];
      } else {
        // Otherwise, only fetch for active classes to reduce database load
        classIdsToFetch = classes.filter(cls => cls.active).map(cls => cls.id);
      }
      
      if (classIdsToFetch.length === 0) {
        console.log("LecturerDashboard: No classes to refresh");
        setIsRefreshing(false);
        return;
      }
      
      // Fetch attendance records for each class
      let newRecords: AttendanceRecord[] = [];
      for (const classId of classIdsToFetch) {
        try {
          console.log(`LecturerDashboard: Fetching attendance for class ${classId}`);
          const records = await attendanceService.getAttendanceRecords({ classId });
          newRecords = [...newRecords, ...records];
        } catch (error) {
          console.error(`LecturerDashboard: Error fetching attendance for class ${classId}:`, error);
          // Continue with other classes if one fails
        }
      }
      
      // If refreshing a specific class, keep all other records
      let updatedRecords: AttendanceRecord[];
      
      if (specificClassId) {
        // Remove old records for the specific class
        const otherRecords = attendanceRecords.filter(rec => rec.classId !== specificClassId);
        // Add new records for the specific class
        updatedRecords = [...otherRecords, ...newRecords];
      } else {
        // Keep records from inactive classes and add the new records
        const inactiveClassIds = classes.filter(cls => !cls.active).map(cls => cls.id);
        const inactiveRecords = attendanceRecords.filter(rec => inactiveClassIds.includes(rec.classId));
        updatedRecords = [...inactiveRecords, ...newRecords];
      }
      
      console.log(`LecturerDashboard: Refreshed with ${newRecords.length} attendance records`);
      
      // Compare arrays to avoid unnecessary state updates
      const recordsChanged = 
        updatedRecords.length !== attendanceRecords.length || 
        JSON.stringify(updatedRecords) !== JSON.stringify(attendanceRecords);
      
      if (recordsChanged) {
        setAttendanceRecords(updatedRecords);
        if (showToast) {
          toast({
            title: 'Attendance Updated',
            description: specificClassId 
              ? `Refreshed attendance records for selected class`
              : `Found ${updatedRecords.length - attendanceRecords.length} new attendance records`,
          });
        }
      } else {
        console.log("LecturerDashboard: No changes in attendance records");
        if (showToast) {
          toast({
            title: 'No Changes',
            description: 'No new attendance records found',
          });
        }
      }
    } catch (error) {
      console.error('LecturerDashboard: Error refreshing attendance data:', error);
      if (showToast) {
        toast({
          title: 'Refresh Failed',
          description: 'Could not update attendance records',
          variant: 'destructive'
        });
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [user, classes, attendanceRecords, toast, setAttendanceRecords, isRefreshing]);

  // Fetch classes from Supabase on component mount
  useEffect(() => {
    // Only fetch if we haven't already and have a valid user
    if (fetchAttempted || !user || !user.id) return;
    
    const fetchClasses = async () => {
      setIsLoading(true);
      setFetchAttempted(true); // Mark as attempted to prevent loops
      
      try {
        console.log("LecturerDashboard: Starting fetch of classes");
        const fetchedClasses = await classService.getClasses(user.id);
        if (fetchedClasses && fetchedClasses.length > 0) {
          console.log(`LecturerDashboard: Fetched ${fetchedClasses.length} classes from Supabase`);
          setClasses(fetchedClasses);
          
          // Fetch attendance records for these classes
          let allRecords: AttendanceRecord[] = [];
          for (const cls of fetchedClasses) {
            const records = await attendanceService.getAttendanceRecords({ classId: cls.id });
            allRecords = [...allRecords, ...records];
          }
          
          if (allRecords.length > 0) {
            console.log(`LecturerDashboard: Fetched ${allRecords.length} attendance records from Supabase`);
            setAttendanceRecords(allRecords);
          }
        } else {
          console.log("LecturerDashboard: No classes found or fetch returned empty array");
        }
      } catch (error) {
        console.error('LecturerDashboard: Error fetching classes:', error);
        toast({
          title: 'Error Fetching Data',
          description: 'Could not load your classes from the database',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchClasses();
    // Only depend on user and fetchAttempted, not on the setters which could cause loops
  }, [user, fetchAttempted, toast]);

  // Set up polling for attendance updates
  useEffect(() => {
    // Only set up polling if we have classes and a valid user
    if (!classes.length || !user || !user.id) return;
    
    // Check for active classes
    const hasActiveClasses = classes.some(cls => cls.active);
    if (!hasActiveClasses) {
      console.log("LecturerDashboard: No active classes, skipping attendance polling setup");
      return;
    }
    
    console.log("LecturerDashboard: Setting up attendance polling");
    
    // Only poll every 60 seconds (increased from 30 seconds) to reduce server load
    const pollingInterval = setInterval(() => {
      if (!isRefreshing) {
        console.log("LecturerDashboard: Polling interval triggered");
        refreshAttendanceData();
      } else {
        console.log("LecturerDashboard: Skipping poll as refresh already in progress");
      }
    }, 60000); // 60 seconds
    
    // Clean up interval on unmount or when dependencies change
    return () => {
      console.log("LecturerDashboard: Cleaning up attendance polling");
      clearInterval(pollingInterval);
    };
  }, [classes, user, refreshAttendanceData]);

  // Listen for cross-tab attendance updates using BroadcastChannel
  useEffect(() => {
    // Skip on server side
    if (typeof window === 'undefined' || !window.BroadcastChannel) return;
    
    console.log("LecturerDashboard: Setting up BroadcastChannel listener for attendance updates");
    
    try {
      const broadcastChannel = new BroadcastChannel('geoattend-attendance');
      
      const handleAttendanceUpdate = (event: MessageEvent) => {
        if (event.data && event.data.type === 'attendance-marked') {
          console.log("LecturerDashboard: Received cross-tab attendance update for class", event.data.classId);
          
          // Add a small delay to ensure the database has been updated
          setTimeout(() => {
            refreshAttendanceData(true);
          }, 1000);
        }
      };
      
      broadcastChannel.addEventListener('message', handleAttendanceUpdate);
      
      return () => {
        console.log("LecturerDashboard: Removing BroadcastChannel listener");
        broadcastChannel.removeEventListener('message', handleAttendanceUpdate);
        broadcastChannel.close();
      };
    } catch (error) {
      console.error("LecturerDashboard: Error setting up BroadcastChannel", error);
      return () => {}; // Empty cleanup function
    }
  }, [refreshAttendanceData]);

  const handleClassCreated = (newClass: Class) => {
    setClasses(prevClasses => [...prevClasses, newClass]);
  };

  const handleUpdateClass = (updatedClass: Class) => {
    setClasses(prevClasses => prevClasses.map(c => c.id === updatedClass.id ? updatedClass : c));
    if (selectedClassForReport?.id === updatedClass.id) {
      setSelectedClassForReport(updatedClass);
    }
  };

  const handleDeleteClass = (classId: string) => {
    setClasses(prevClasses => prevClasses.filter(c => c.id !== classId));
    setAttendanceRecords(prevRecords => prevRecords.filter(ar => ar.classId !== classId));
    if (selectedClassForReport?.id === classId) {
      setSelectedClassForReport(null);
      setActiveTab("manageClasses"); // Switch tab if report was for deleted class
    }
    toast({ title: "Class Deleted", description: "The class and its attendance records have been removed.", variant: "destructive" });
  };

  const handleViewReport = (classId: string) => {
    const classToReport = classes.find(c => c.id === classId);
    if (classToReport) {
      setSelectedClassForReport(classToReport);
      setActiveTab("attendanceReports");
    }
  };

  const reportForSelectedClass = useMemo(() => {
    if (!selectedClassForReport) return [];
    return attendanceRecords.filter(ar => ar.classId === selectedClassForReport.id);
  }, [selectedClassForReport, attendanceRecords]);

  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [classes]);

  // Statistics calculations
  const statistics = useMemo(() => {
    const totalClasses = classes.length;
    const activeClasses = classes.filter(c => c.active).length;
    const completedClasses = classes.filter(c => !c.active && c.endTime).length;
    
    // Attendance statistics
    const totalAttendance = attendanceRecords.length;
    const statusCounts = attendanceRecords.reduce((acc, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      return acc;
    }, {} as Record<AttendanceStatus, number>);
    
    const attendanceRate = totalClasses > 0 
      ? (statusCounts["Present"] || 0) / totalAttendance * 100 
      : 0;
    
    // Method statistics
    const verificationMethods = attendanceRecords.reduce((acc, record) => {
      const method = record.verificationMethod;
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Recent activity
    const recentAttendance = [...attendanceRecords]
      .sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime())
      .slice(0, 5);
    
    return {
      totalClasses,
      activeClasses,
      completedClasses,
      totalAttendance,
      statusCounts,
      attendanceRate,
      verificationMethods,
      recentAttendance
    };
  }, [classes, attendanceRecords]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-foreground">Lecturer Dashboard</h1>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">
            Welcome, {user?.displayName || user?.email?.split('@')[0] || 'Lecturer'}
          </span>
          <Avatar>
            <AvatarImage 
              src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.displayName?.charAt(0) || 'L'}`} 
            />
            <AvatarFallback>{user?.displayName?.charAt(0) || 'L'}</AvatarFallback>
          </Avatar>
        </div>
        <div className="flex gap-2">
          {activeTab === "manageClasses" && (
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-5 w-5" /> Create New Class
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg" aria-describedby="create-class-form">
                <DialogTitle>Create New Class</DialogTitle>
                <CreateClassForm onClassCreated={handleClassCreated} />
              </DialogContent>
            </Dialog>
          )}
          <Button 
            variant="outline" 
            onClick={() => refreshAttendanceData(true)}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <div className="h-4 w-4 border-2 border-primary border-t-transparent animate-spin mr-2 rounded-full" />
            ) : (
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4 mr-2" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
            )}
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 mb-6">
          <TabsTrigger value="manageClasses" className="py-3 text-base">
            <Edit className="mr-2 h-5 w-5" /> Manage Classes
          </TabsTrigger>
          <TabsTrigger value="statistics" className="py-3 text-base">
            <PieChart className="mr-2 h-5 w-5" /> Statistics
          </TabsTrigger>
          <TabsTrigger value="attendanceReports" className="py-3 text-base">
            <BookOpen className="mr-2 h-5 w-5" /> Attendance Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manageClasses">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : sortedClasses.length === 0 ? (
            <div className="text-center py-10">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-xl text-muted-foreground">No classes found.</p>
              <p className="text-sm text-muted-foreground">Create a new class to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedClasses.map(classInstance => (
                <ClassManagementCard 
                  key={classInstance.id} 
                  classInstance={classInstance} 
                  attendanceRecords={attendanceRecords}
                  onUpdateClass={handleUpdateClass}
                  onDeleteClass={handleDeleteClass}
                  onViewReport={handleViewReport}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="statistics">
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Dashboard Statistics</h2>
            
            {/* Classes Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 flex flex-col items-center justify-center bg-blue-50">
                <div className="text-4xl font-bold text-blue-600">{statistics.totalClasses}</div>
                <div className="text-sm text-blue-700 flex items-center mt-2">
                  <Calendar className="mr-1 h-4 w-4" /> Total Classes
                </div>
              </Card>
              
              <Card className="p-4 flex flex-col items-center justify-center bg-green-50">
                <div className="text-4xl font-bold text-green-600">{statistics.activeClasses}</div>
                <div className="text-sm text-green-700 flex items-center mt-2">
                  <Clock className="mr-1 h-4 w-4" /> Active Classes
                </div>
              </Card>
              
              <Card className="p-4 flex flex-col items-center justify-center bg-purple-50">
                <div className="text-4xl font-bold text-purple-600">{statistics.totalAttendance}</div>
                <div className="text-sm text-purple-700 flex items-center mt-2">
                  <Users className="mr-1 h-4 w-4" /> Total Attendances
                </div>
              </Card>
            </div>
            
            {/* Attendance Statistics */}
            <div className="mt-6">
              <h3 className="text-xl font-medium mb-4">Attendance Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-4">
                  <h4 className="text-lg font-medium mb-3">Status Breakdown</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                        <span>Present</span>
                      </div>
                      <span className="font-medium">{statistics.statusCounts?.Present || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                        <span>Late</span>
                      </div>
                      <span className="font-medium">{statistics.statusCounts?.Late || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                        <span>Absent</span>
                      </div>
                      <span className="font-medium">{statistics.statusCounts?.Absent || 0}</span>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4">
                  <h4 className="text-lg font-medium mb-3">Verification Methods</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                        <span>QR Code</span>
                      </div>
                      <span className="font-medium">{statistics.verificationMethods?.QR || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                        <span>Location</span>
                      </div>
                      <span className="font-medium">{statistics.verificationMethods?.Location || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-gray-500 mr-2"></div>
                        <span>Manual</span>
                      </div>
                      <span className="font-medium">{statistics.verificationMethods?.Manual || 0}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
            
            {/* Recent Activity */}
            <div className="mt-6">
              <h3 className="text-xl font-medium mb-4">Recent Attendance Activity</h3>
              <Card className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {statistics.recentAttendance.length > 0 ? statistics.recentAttendance.map(record => {
                      const classInfo = classes.find(c => c.id === record.classId);
                      return (
                        <tr key={record.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{record.studentId}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{classInfo?.name || 'Unknown'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(record.checkInTime).toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              record.status === 'Present' ? 'bg-green-100 text-green-800' :
                              record.status === 'Late' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{record.verificationMethod}</td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No recent attendance records</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="attendanceReports">
          {!selectedClassForReport && (
            <div className="text-center py-10">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-xl text-muted-foreground">Select a class to view its report.</p>
              <p className="text-sm text-muted-foreground">You can view reports from the "Manage Classes" tab.</p>
            </div>
          )}
          {selectedClassForReport && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">Attendance Report for: {selectedClassForReport.name}</h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Refresh only the data for this specific class
                    toast({ title: "Refreshing", description: "Updating attendance records..." });
                    refreshAttendanceData(selectedClassForReport.id);
                  }}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent animate-spin mr-2 rounded-full" />
                  ) : (
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-4 w-4 mr-2" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                      />
                    </svg>
                  )}
                  Refresh Report
                </Button>
              </div>
              <AttendanceReportTable classInstance={selectedClassForReport} records={reportForSelectedClass} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
