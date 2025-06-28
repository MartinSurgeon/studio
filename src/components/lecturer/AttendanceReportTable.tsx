"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import type { AttendanceRecord, Class } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { MapPin, QrCode, UserCheck } from 'lucide-react';
import { userService } from '@/lib/services/user.service';
import { useState, useEffect } from 'react';

interface AttendanceReportTableProps {
  classInstance?: Class;
  records: AttendanceRecord[];
}

export default function AttendanceReportTable({ classInstance, records }: AttendanceReportTableProps) {
  // Add logging to help debug record issues
  console.log(`AttendanceReportTable: Rendering for class ${classInstance?.name || 'none'} with ${records.length} records`);
  
  // Add state to store student data
  const [studentData, setStudentData] = useState<Record<string, { indexNumber?: string, displayName?: string }>>({});
  
  // Fetch student information when records change
  useEffect(() => {
    const fetchStudentData = async () => {
      if (!records.length) return;
      
      const newStudentData: Record<string, { indexNumber?: string, displayName?: string }> = {};
      
      // Use Promise.all to fetch all student data in parallel
      await Promise.all(records.map(async (record) => {
        try {
          const student = await userService.getUserById(record.studentId);
          if (student) {
            newStudentData[record.studentId] = {
              indexNumber: student.indexNumber,
              displayName: student.displayName
            };
          }
        } catch (error) {
          console.error('Error fetching student data:', error);
        }
      }));
      
      setStudentData(newStudentData);
    };
    
    fetchStudentData();
  }, [records]);
  
  // Export handler
  const handleExport = async () => {
    if (!classInstance?.id) return;
    const response = await fetch(`/api/attendance/export?classId=${classInstance.id}`);
    if (!response.ok) {
      alert('Failed to export attendance data.');
      return;
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${classInstance.id}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };
  
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
      {/* Export Button */}
      <div className="flex justify-end p-4">
        <button
          onClick={handleExport}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow transition"
          disabled={!classInstance?.id}
        >
          Export Attendance (CSV)
        </button>
      </div>
      <Table>
        <TableCaption>
          <div className="flex flex-col items-center space-y-1">
            <span className="font-medium">Attendance Report for {classInstance.name}</span>
            <span className="text-sm text-muted-foreground">
              {records.length} student{records.length !== 1 ? 's' : ''} recorded
            </span>
          </div>
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Student Information</TableHead>
            <TableHead>Check-in Details</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Verification</TableHead>
            {classInstance.location && <TableHead>Location</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {studentData[record.studentId]?.displayName || 'Unknown Student'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Index: {studentData[record.studentId]?.indexNumber || record.studentId}
                  </span>
                </div>
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
                        : 'bg-red-100 text-red-800 border-red-300'
                  }
                >
                  {record.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  {getMethodIcon(record.verificationMethod)}
                  <div className="ml-2 flex flex-col">
                    <span className="text-sm">{record.verificationMethod}</span>
                    <span className="text-xs text-muted-foreground">
                      {record.verificationMethod === 'Location' ? 'GPS Verified' :
                       record.verificationMethod === 'QR' ? 'QR Code Scan' :
                       'Manual Check'}
                    </span>
                  </div>
                </div>
              </TableCell>
              {classInstance.location && (
                <TableCell>
                  {record.verifiedLocation ? (
                    <div className="flex flex-col">
                      <div className="flex items-center text-sm">
                        <MapPin className="h-4 w-4 text-green-500 mr-1" />
                        <span>Within range</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Lat: {record.verifiedLocation.latitude.toFixed(4)},
                        Lon: {record.verifiedLocation.longitude.toFixed(4)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">N/A</span>
                  )}
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
