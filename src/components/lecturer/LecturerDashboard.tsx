"use client";

import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { PlusCircle, BookOpen, Users, Edit } from 'lucide-react';
import CreateClassForm from './CreateClassForm';
import ClassManagementCard from './ClassManagementCard';
import AttendanceReportTable from './AttendanceReportTable';
import { useAppContext } from '@/contexts/AppContext';
import type { Class, AttendanceRecord } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";

export default function LecturerDashboard() {
  const { classes, setClasses, attendanceRecords, setAttendanceRecords } = useAppContext();
  const [selectedClassForReport, setSelectedClassForReport] = useState<Class | null>(null);
  const [activeTab, setActiveTab] = useState("manageClasses");
  const { toast } = useToast();

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

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-foreground">Lecturer Dashboard</h1>
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
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 mb-6">
          <TabsTrigger value="manageClasses" className="py-3 text-base">
            <Edit className="mr-2 h-5 w-5" /> Manage Classes
          </TabsTrigger>
          <TabsTrigger value="attendanceReports" className="py-3 text-base">
            <BookOpen className="mr-2 h-5 w-5" /> Attendance Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manageClasses">
          {sortedClasses.length === 0 ? (
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
              <h2 className="text-2xl font-semibold mb-4">Attendance Report for: {selectedClassForReport.name}</h2>
              <AttendanceReportTable classInstance={selectedClassForReport} records={reportForSelectedClass} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
