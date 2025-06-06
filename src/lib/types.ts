export type UserRole = 'student' | 'lecturer' | null;

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export type ScheduleType = 'one-time' | 'daily' | 'weekly' | 'custom';

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  daysOfWeek?: number[]; // 0-6 for Sunday-Saturday
  daysOfMonth?: number[]; // 1-31
  endDate?: string; // ISO date string
  occurrences?: number;
}

export interface Class {
  id: string;
  name: string;
  location?: GeoLocation;
  distanceThreshold?: number;
  startTime: string;
  endTime?: string;
  active: boolean;
  lecturerId: string;
  qrCodeValue?: string;
  qrCodeExpiry?: number;
  createdAt: string;
  scheduleType: ScheduleType;
  recurrencePattern?: RecurrencePattern;
  durationMinutes: number;
  gracePeriodMinutes: number;
  autoStart: boolean;
  autoEnd: boolean;
  nextOccurrence?: string;
  verification_methods: VerificationMethod[];
}

export type AttendanceStatus = 'Present' | 'Late' | 'Absent';
export type VerificationMethod = 'QR' | 'Location' | 'Manual' | 'Biometric' | 'Facial' | 'NFC';

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
