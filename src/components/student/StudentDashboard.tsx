"use client";

import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ActiveClassCard from './ActiveClassCard';
import AttendanceHistoryTable from './AttendanceHistoryTable';
import { useAppContext } from '@/contexts/AppContext';
import type { AttendanceRecord, Class } from '@/lib/types';
import { STUDENT_MOCK_ID } from '@/config';
import { ListChecks, History, Users } from 'lucide-react';

export default function StudentDashboard() {
  const { classes, attendanceRecords, setAttendanceRecords } = useAppContext();
  const [activeTab, setActiveTab] = useState("activeClasses");

  const handleMarkAttendance = (newRecord: AttendanceRecord) => {
    setAttendanceRecords(prevRecords => [...prevRecords, newRecord]);
  };

  const activeClasses = useMemo(() => {
    return classes.filter(c => c.active && !c.endTime);
  }, [classes]);
  
  const studentAttendanceHistory = useMemo(() => {
    return attendanceRecords.filter(ar => ar.studentId === STUDENT_MOCK_ID);
  }, [attendanceRecords]);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-foreground">Student Dashboard</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 mb-6">
          <TabsTrigger value="activeClasses" className="py-3 text-base">
            <ListChecks className="mr-2 h-5 w-5" /> Active Classes
          </TabsTrigger>
          <TabsTrigger value="attendanceHistory" className="py-3 text-base">
            <History className="mr-2 h-5 w-5" /> Attendance History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activeClasses">
          {activeClasses.length === 0 ? (
            <div className="text-center py-10">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-xl text-muted-foreground">No active classes at the moment.</p>
              <p className="text-sm text-muted-foreground">Check back later or contact your lecturer.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeClasses.map(classInstance => {
                const existingAttendance = studentAttendanceHistory.find(
                  ar => ar.classId === classInstance.id
                );
                return (
                  <ActiveClassCard 
                    key={classInstance.id} 
                    classInstance={classInstance} 
                    onMarkAttendance={handleMarkAttendance}
                    existingAttendance={existingAttendance}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="attendanceHistory">
          <AttendanceHistoryTable records={studentAttendanceHistory} classes={classes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
