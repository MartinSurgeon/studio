"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import type { AttendanceRecord, Class } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { MapPin, QrCode, UserCheck } from 'lucide-react';

interface AttendanceReportTableProps {
  classInstance?: Class;
  records: AttendanceRecord[];
}

export default function AttendanceReportTable({ classInstance, records }: AttendanceReportTableProps) {
  if (!classInstance) {
    return <p className="text-muted-foreground">Select a class to view its report.</p>;
  }
  
  if (records.length === 0) {
    return <p className="text-muted-foreground">No attendance records found for {classInstance.name}.</p>;
  }

  const getStatusBadgeVariant = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'Present': return 'default'; // Greenish if customized
      case 'Late': return 'secondary'; // Yellowish if customized
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
        <TableCaption>Attendance report for {classInstance.name}.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Student ID</TableHead>
            <TableHead>Check-in Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Method</TableHead>
            {classInstance.location && <TableHead>Verified Location</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="font-medium">{record.studentId}</TableCell>
              <TableCell>{new Date(record.checkInTime).toLocaleString()}</TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(record.status)} className={record.status === 'Present' ? 'bg-green-100 text-green-800 border-green-300' : record.status === 'Late' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : ''}>
                  {record.status}
                </Badge>
              </TableCell>
              <TableCell className="flex items-center">
                {getMethodIcon(record.verificationMethod)}
                <span className="ml-2">{record.verificationMethod}</span>
              </TableCell>
              {classInstance.location && (
                <TableCell>
                  {record.verifiedLocation 
                    ? `Lat: ${record.verifiedLocation.latitude.toFixed(4)}, Lon: ${record.verifiedLocation.longitude.toFixed(4)}` 
                    : 'N/A'}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Minimal QrCode icon if not available in lucide-react (it is, but as an example)
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
