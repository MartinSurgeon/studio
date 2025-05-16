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
  // Add logging to help debug record issues
  console.log(`AttendanceReportTable: Rendering for class ${classInstance?.name || 'none'} with ${records.length} records`);
  
  if (!classInstance) {
    return <p className="text-muted-foreground">Select a class to view its report.</p>;
  }
  
  if (records.length === 0) {
    console.log(`AttendanceReportTable: No records found for class ${classInstance.id} (${classInstance.name})`);
    return <p className="text-muted-foreground">No attendance records found for {classInstance.name}.</p>;
  }

  // Log the records for debugging
  console.log(`AttendanceReportTable: Records found:`, records.map(r => ({ 
    id: r.id, 
    studentId: r.studentId, 
    status: r.status, 
    time: new Date(r.checkInTime).toLocaleString() 
  })));

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
      case 'QR': return <QrCode className="h-4 w-4 text-purple-500" />; // Using Lucide's QrCode
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
            <TableHead>Student Index Number</TableHead>
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
// The local SVG icon component QrCode was removed as lucide-react provides QrCode.
// If a custom SVG was required, it should be named uniquely, e.g., QrCodeSvgIcon.
