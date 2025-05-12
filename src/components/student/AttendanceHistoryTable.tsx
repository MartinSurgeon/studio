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

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden">
      <Table>
        <TableCaption>Your attendance history.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Class Name</TableHead>
            <TableHead>Check-in Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Verification Method</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.sort((a,b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()).map((record) => (
            <TableRow key={record.id}>
              <TableCell className="font-medium">{getClassName(record.classId)}</TableCell>
              <TableCell>{new Date(record.checkInTime).toLocaleString()}</TableCell>
              <TableCell>
                <Badge 
                  variant={getStatusBadgeVariant(record.status)}
                  className={record.status === 'Present' ? 'bg-green-100 text-green-800 border-green-300' : record.status === 'Late' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : ''}
                >
                  {record.status}
                </Badge>
              </TableCell>
              <TableCell className="flex items-center">
                 {getMethodIcon(record.verificationMethod)}
                <span className="ml-2">{record.verificationMethod}</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}


// Minimal QrCode icon
function QrCode(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="5" height="5" x="3" y="3" rx="1" />
      <rect width="5" height="5" x="16" y="3" rx="1" />
      <rect width="5" height="5" x="3" y="16" rx="1" />
      <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
      <path d="M21 21v.01" />
      <path d="M12 7v3a2 2 0 0 1-2 2H7" />
      <path d="M3 12h.01" />
      <path d="M12 3h.01" />
      <path d="M12 16v.01" />
      <path d="M16 12h.01" />
      <path d="M21 12v.01" />
      <path d="M12 21v-3a2 2 0 0 0-2-2H7" />
      <path d="M7 21h.01" />
    </svg>
  );
}
