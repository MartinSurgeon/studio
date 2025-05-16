"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import type { AttendanceRecord, Class } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { MapPin, QrCode, UserCheck, CalendarDays } from 'lucide-react';

interface AttendanceHistoryTableProps {
  records: AttendanceRecord[];
  classes: Class[]; // To get class names
}

export default function AttendanceHistoryTable({ records, classes }: AttendanceHistoryTableProps) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 border rounded-lg shadow-sm bg-card">
        <CalendarDays className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-xl font-semibold text-muted-foreground">No Attendance History</p>
        <p className="text-sm text-muted-foreground">You haven't attended any classes yet.</p>
      </div>
    );
  }

  const getClassName = (classId: string) => {
    const classInfo = classes.find(c => c.id === classId);
    return classInfo ? classInfo.name : 'Unknown Class';
  };

  const getStatusBadgeVariant = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'Present': return 'default';
      case 'Late': return 'secondary';
      case 'Absent': return 'destructive';
      default: return 'outline';
    }
  };

  const getMethodIcon = (method: AttendanceRecord['verificationMethod']) => {
    switch (method) {
      case 'Location': return <MapPin className="h-4 w-4 text-blue-500" />;
      case 'QR': return <QrCode className="h-4 w-4 text-purple-500" />;
      case 'Manual': return <UserCheck className="h-4 w-4 text-orange-500" />;
      default: return null;
    }
  };

  const sortedRecords = records.sort((a,b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime());

  return (
    <div className="overflow-x-auto rounded-lg border shadow-sm">
      <Table>
        <TableCaption>Your attendance history.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Class Name</TableHead>
            <TableHead>Lecturer</TableHead>
            <TableHead>Date & Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Method</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRecords.length > 0 ? (
            sortedRecords.map((record) => {
              const classInfo = classes.find(c => c.id === record.classId);
              return (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    {classInfo?.name || 'Unknown Class'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {classInfo?.lecturerName || 'Unknown Lecturer'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {new Date(record.checkInTime).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(record.checkInTime).toLocaleTimeString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={getStatusBadgeVariant(record.status)} 
                      className={
                        record.status === 'Present' 
                          ? 'bg-green-100 text-green-800 border-green-300' 
                          : record.status === 'Late' 
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-300' 
                            : ''
                      }
                    >
                      {record.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex items-center">
                    {getMethodIcon(record.verificationMethod)}
                    <span className="ml-2">{record.verificationMethod}</span>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                No attendance records found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
