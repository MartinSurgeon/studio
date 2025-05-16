export type UserRole = 'student' | 'lecturer' | null;

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface Class {
  id: string;
  name: string;
  location?: GeoLocation;
  distanceThreshold: number; // meters
  startTime: string; // ISO string
  endTime?: string; // ISO string
  active: boolean;
  lecturerId: string; // For simplicity, can be a generic ID or username
  qrCodeValue?: string;
  qrCodeExpiry?: number; // Unix timestamp (milliseconds)
}

export type AttendanceStatus = 'Present' | 'Late' | 'Absent';
export type VerificationMethod = 'QR' | 'Location' | 'Manual';

export interface AttendanceRecord {
  id: string;
  classId: string;
  studentId: string; // For simplicity, can be a generic ID or username
  checkInTime: string; // ISO string
  status: AttendanceStatus;
  verificationMethod: VerificationMethod;
  verifiedLocation?: GeoLocation;
  deviceId?: string; // Added to track the device that recorded attendance
}
