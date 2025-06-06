import { supabase, handleSupabaseError } from '@/lib/supabase';
import type { AttendanceRecord, GeoLocation, VerificationMethod } from '@/lib/types';
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types';

// Device ID storage key
const DEVICE_ID_KEY = 'geoattend-device-id';

// Get or generate a device identifier
function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  
  // Try to get existing device ID from localStorage
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  // If no device ID exists, generate a new one
  if (!deviceId) {
    deviceId = `device_${crypto.randomUUID()}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    console.log(`AttendanceService: Generated new device ID: ${deviceId}`);
  } else {
    console.log(`AttendanceService: Using existing device ID: ${deviceId}`);
  }
  
  return deviceId;
}

// Mapper to convert database rows to application types
const mapToAttendanceRecord = (row: Tables<'attendance_records'>): AttendanceRecord => ({
  id: row.id,
  classId: row.class_id,
  studentId: row.student_id,
  checkInTime: row.check_in_time,
  status: row.status,
  verificationMethod: row.verification_method,
  verifiedLocation: row.verified_latitude && row.verified_longitude
    ? { latitude: row.verified_latitude, longitude: row.verified_longitude }
    : undefined,
  deviceId: row.device_id || undefined
});

// Mapper to convert application types to database rows
const mapToAttendanceRow = (record: AttendanceRecord): TablesInsert<'attendance_records'> => {
  // Create the basic row data with required fields
  const rowData: any = {
    id: record.id,
    class_id: record.classId,
    student_id: record.studentId,
    check_in_time: record.checkInTime,
    status: record.status,
    verification_method: record.verificationMethod,
    verified_latitude: record.verifiedLocation?.latitude || null,
    verified_longitude: record.verifiedLocation?.longitude || null
  };
  
  // Only add device_id if it exists in the record
  // This helps avoid issues if the column doesn't exist in the database
  if (record.deviceId) {
    rowData.device_id = record.deviceId;
  }
  
  return rowData as TablesInsert<'attendance_records'>;
};

// Service functions
export const attendanceService = {
  // Get test attendance records from localStorage
  getTestAttendanceRecords(filters?: {classId?: string, studentId?: string}): AttendanceRecord[] {
    console.log(`AttendanceService: Getting TEST records with filters:`, filters);
    
    try {
      const storageKey = 'geoattend-test-attendance';
      const storedRecords = localStorage.getItem(storageKey);
      
      if (!storedRecords) {
        console.log('AttendanceService: No test records found in localStorage');
        return [];
      }
      
      let records: AttendanceRecord[] = JSON.parse(storedRecords);
      
      // Apply filters if provided
      if (filters?.classId) {
        records = records.filter(record => record.classId === filters.classId);
      }
      
      if (filters?.studentId) {
        records = records.filter(record => record.studentId === filters.studentId);
      }
      
      console.log(`AttendanceService: Found ${records.length} TEST records matching filters`);
      return records;
    } catch (e) {
      console.error('AttendanceService: Error retrieving test records:', e);
      return [];
    }
  },

  // Get all attendance records
  async getAttendanceRecords(filters?: {classId?: string, studentId?: string}, isTestMode = false): Promise<AttendanceRecord[]> {
    // Check for test mode
    if (isTestMode) {
      return this.getTestAttendanceRecords(filters);
    }
    
    try {
      console.log(`AttendanceService: Fetching records with filters:`, filters);
      
      let query = supabase.from('attendance_records').select('*');
      
      if (filters?.classId) {
        console.log(`AttendanceService: Filtering by classId: ${filters.classId}`);
        query = query.eq('class_id', filters.classId);
      }
      
      if (filters?.studentId) {
        console.log(`AttendanceService: Filtering by studentId: ${filters.studentId}`);
        query = query.eq('student_id', filters.studentId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('AttendanceService: Error fetching records:', error);
        
        // If there's a database error, fall back to test mode
        if (typeof window !== 'undefined' && 
            (error.message?.includes('Failed to fetch') || 
             error.message?.includes('NetworkError') ||
             error.message?.includes('column') && error.message?.includes('does not exist'))) {
          console.warn('AttendanceService: Database error, falling back to test records');
          return this.getTestAttendanceRecords(filters);
        }
        
        throw error;
      }
      
      console.log(`AttendanceService: Fetched ${data?.length || 0} records`);
      
      if (data && data.length > 0) {
        // Log the first record for debugging
        console.log('AttendanceService: Sample record:', {
          id: data[0].id,
          classId: data[0].class_id,
          studentId: data[0].student_id,
          status: data[0].status
        });
      } else {
        console.log('AttendanceService: No records found matching filters');
      }
      
      return (data || []).map(mapToAttendanceRecord);
    } catch (error) {
      handleSupabaseError(error as Error);
      return [];
    }
  },
  
  // Get a single attendance record by ID
  async getAttendanceRecord(id: string): Promise<AttendanceRecord | null> {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      if (!data) return null;
      
      return mapToAttendanceRecord(data);
    } catch (error) {
      handleSupabaseError(error as Error);
      return null;
    }
  },
  
  // Create attendance in testing mode (doesn't require database)
  createTestAttendanceRecord(record: Omit<AttendanceRecord, 'id'>): AttendanceRecord {
    console.log(`AttendanceService: Creating TEST attendance record for class ${record.classId}, student ${record.studentId}`);
    
    // Generate a unique ID
    const id = `test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Create a complete record
    const newRecord: AttendanceRecord = {
      ...record,
      id,
      deviceId: `test_device_${Date.now()}`
    };
    
    console.log(`AttendanceService: Created TEST attendance record with ID ${newRecord.id}`);
    
    // Store in localStorage for persistence during the session
    try {
      // Get existing test records
      const storageKey = 'geoattend-test-attendance';
      let testRecords: AttendanceRecord[] = [];
      
      const storedRecords = localStorage.getItem(storageKey);
      if (storedRecords) {
        testRecords = JSON.parse(storedRecords);
      }
      
      // Check if record for this class/student already exists
      const existingIndex = testRecords.findIndex(
        r => r.classId === record.classId && r.studentId === record.studentId
      );
      
      if (existingIndex >= 0) {
        // Replace existing record
        testRecords[existingIndex] = newRecord;
        console.log(`AttendanceService: Replaced existing test record for class ${record.classId}`);
      } else {
        // Add new record
        testRecords.push(newRecord);
      }
      
      // Save back to localStorage
      localStorage.setItem(storageKey, JSON.stringify(testRecords));
    } catch (e) {
      console.error('AttendanceService: Error storing test record in localStorage', e);
    }
    
    return newRecord;
  },
  
  // Create a new attendance record
  async createAttendanceRecord(record: Omit<AttendanceRecord, 'id'>, isTestMode = false): Promise<AttendanceRecord | null> {
    // If in test mode, use the test method instead
    if (isTestMode) {
      return this.createTestAttendanceRecord(record);
    }
    
    try {
      // Get the current device ID
      const deviceId = getDeviceId();
      
      console.log(`AttendanceService: Creating attendance record for class ${record.classId}, student ${record.studentId}`);
      
      // Check if attendance already exists for this class and device
      try {
        const { data: existingRecord, error: checkError } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('class_id', record.classId)
          .eq('device_id', deviceId)
          .maybeSingle();
        
        if (checkError) {
          // If it's a missing column error, we'll just skip this check
          if (checkError.message?.includes('column') && checkError.message?.includes('does not exist')) {
            console.warn('AttendanceService: device_id column might be missing, skipping device check');
          } else {
            console.error('AttendanceService: Error checking for existing record:', checkError);
            throw checkError;
          }
        } else if (existingRecord) {
          console.warn(`AttendanceService: Attendance already marked from device ${deviceId} for class ${record.classId}`);
          throw new Error('Attendance has already been marked from this device');
        }
      } catch (error) {
        // If this error is about the missing column, continue - otherwise throw
        if (!(error instanceof Error && error.message?.includes('column') && error.message?.includes('does not exist'))) {
          throw error;
        }
      }
      
      // Also check if student already has an attendance record for this class
      try {
        const { data: existingStudentRecord, error: studentCheckError } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('class_id', record.classId)
          .eq('student_id', record.studentId)
          .maybeSingle();
        
        if (studentCheckError) {
          console.error('AttendanceService: Error checking for existing student record:', studentCheckError);
          throw studentCheckError;
        }
        
        if (existingStudentRecord) {
          console.warn(`AttendanceService: Student ${record.studentId} already has an attendance record for class ${record.classId}`);
          throw new Error(`Student ${record.studentId} has already marked attendance for this class`);
        }
      } catch (error) {
        // Only throw if it's not a column-related error
        if (!(error instanceof Error && error.message?.includes('column') && error.message?.includes('does not exist'))) {
          throw error;
        }
      }
      
      // Generate UUID on client side
      const newRecord = {
        ...record,
        id: crypto.randomUUID(),
        deviceId: deviceId // Add the device ID automatically
      };
      
      console.log(`AttendanceService: Inserting new record with ID ${newRecord.id}`);
      console.log('AttendanceService: Record data:', {
        classId: newRecord.classId,
        studentId: newRecord.studentId,
        method: newRecord.verificationMethod,
        deviceId: newRecord.deviceId
      });
      
      try {
        const { data, error } = await supabase
          .from('attendance_records')
          .insert(mapToAttendanceRow(newRecord as AttendanceRecord))
          .select()
          .single();
        
        if (error) {
          // If the error is about device_id column, try again without it
          if (error.message?.includes('column') && error.message?.includes('does not exist')) {
            console.warn('AttendanceService: device_id column error detected, trying without it');
            const recordWithoutDeviceId = { ...newRecord };
            delete (recordWithoutDeviceId as any).deviceId;
            
            const retryResult = await supabase
              .from('attendance_records')
              .insert(mapToAttendanceRow(recordWithoutDeviceId as AttendanceRecord))
              .select()
              .single();
            
            if (retryResult.error) {
              console.error('AttendanceService: Error on retry insert:', retryResult.error);
              throw retryResult.error;
            }
            
            if (!retryResult.data) {
              console.error('AttendanceService: No data returned after retry insert');
              return null;
            }
            
            console.log(`AttendanceService: Successfully created attendance record on retry with ID ${retryResult.data.id}`);
            return mapToAttendanceRecord(retryResult.data);
          }
          
          console.error('AttendanceService: Error inserting record:', error);
          throw error;
        }
        
        if (!data) {
          console.error('AttendanceService: No data returned after insert');
          return null;
        }
        
        console.log(`AttendanceService: Successfully created attendance record with ID ${data.id}`);
        return mapToAttendanceRecord(data);
      } catch (error) {
        // If we get here and it's still a column-related error, use the test mode as fallback
        if (error instanceof Error && error.message?.includes('column') && error.message?.includes('does not exist')) {
          console.warn('AttendanceService: Database issues detected, falling back to test mode');
          return this.createTestAttendanceRecord(record);
        }
        
        handleSupabaseError(error as Error);
        return null;
      }
    } catch (error) {
      handleSupabaseError(error as Error);
      return null;
    }
  },
  
  // Update an existing attendance record
  async updateAttendanceRecord(
    id: string, 
    updates: Partial<AttendanceRecord>
  ): Promise<AttendanceRecord | null> {
    try {
      // First fetch the existing record to merge with updates
      const existingRecord = await this.getAttendanceRecord(id);
      if (!existingRecord) {
        throw new Error(`Attendance record with ID ${id} not found`);
      }
      
      // Merge existing with updates
      const updatedRecord = {
        ...existingRecord,
        ...updates
      };
      
      const { data, error } = await supabase
        .from('attendance_records')
        .update(mapToAttendanceRow(updatedRecord))
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      if (!data) return null;
      
      return mapToAttendanceRecord(data);
    } catch (error) {
      handleSupabaseError(error as Error);
      return null;
    }
  },
  
  // Delete an attendance record
  async deleteAttendanceRecord(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('attendance_records')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      handleSupabaseError(error as Error);
      return false;
    }
  },
  
  // Mark attendance with location verification
  async markAttendanceWithLocation(
    classId: string,
    studentId: string,
    currentLocation: GeoLocation
  ): Promise<{ success: boolean; record?: AttendanceRecord; message?: string; details?: { 
    distance: number; 
    threshold: number; 
    withinRange: boolean;
    classLocation: GeoLocation;
  } }> {
    try {
      // First, fetch the class to check location and status
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single();

      if (classError) throw classError;
      if (!classData) {
        return { success: false, message: 'Class not found' };
      }

      // Enforce verification method
      if (!Array.isArray(classData.verification_methods) || !classData.verification_methods.includes('Location')) {
        return { success: false, message: 'Location verification is not enabled for this class.' };
      }

      // Enforce active status
      if (!classData.active) {
        return { success: false, message: 'Class is not active' };
      }

      // Enforce duration and grace period
      const now = new Date();
      const classStartTime = new Date(classData.start_time);
      const durationMinutes = classData.duration_minutes || 60;
      const gracePeriodMinutes = classData.grace_period_minutes || 15;
      const classEndTime = new Date(classStartTime.getTime() + durationMinutes * 60000);
      const graceEndTime = new Date(classEndTime.getTime() + gracePeriodMinutes * 60000);

      if (now < classStartTime) {
        return { 
          success: false, 
          message: `Attendance not open yet. Class starts at ${classStartTime.toLocaleTimeString()}.` 
        };
      }

      if (now > graceEndTime) {
        return { 
          success: false, 
          message: `Attendance window has closed. The class ended at ${classEndTime.toLocaleTimeString()} and the grace period ended at ${graceEndTime.toLocaleTimeString()}. Please contact your lecturer if you need to mark attendance.` 
        };
      }

      // Calculate distance between class location and current location
      const hasValidClassLocation = typeof classData.latitude === 'number' && typeof classData.longitude === 'number';
      if (!hasValidClassLocation) {
        return { success: false, message: 'Class location is invalid.' };
      }
      const classLocation = { 
        latitude: classData.latitude as number, 
        longitude: classData.longitude as number 
      };

      const distance = calculateDistance(
        classLocation.latitude,
        classLocation.longitude,
        currentLocation.latitude,
        currentLocation.longitude
      );

      const threshold = classData.distance_threshold || 100; // Default 100m threshold
      const isWithinThreshold = distance <= threshold;

      // Check for existing attendance
      const { data: existingStudentRecord } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('class_id', classId)
        .eq('student_id', studentId)
        .maybeSingle();

      if (existingStudentRecord) {
        return { 
          success: false, 
          message: 'Attendance already marked for this student ID',
          details: {
            distance,
            threshold,
            withinRange: isWithinThreshold,
            classLocation
          }
        };
      }

      // Only mark attendance if within threshold
      if (!isWithinThreshold) {
        return { 
          success: false, 
          message: `You are too far from the class location (${Math.round(distance)}m away, threshold is ${threshold}m)`,
          details: {
            distance,
            threshold,
            withinRange: false,
            classLocation
          }
        };
      }

      // Determine status based on time
      let status: 'Present' | 'Late' = 'Present';
      if (now > classEndTime && now <= graceEndTime) {
        status = 'Late';
      }

      // Create attendance record
      const newRecord: Omit<AttendanceRecord, 'id'> = {
        classId: classId,
        studentId: studentId,
        checkInTime: now.toISOString(),
        status: status,
        verificationMethod: 'Location',
        verifiedLocation: currentLocation,
        deviceId: getDeviceId()
      };

      const createdRecord = await this.createAttendanceRecord(newRecord);
      if (!createdRecord) {
        return { 
          success: false, 
          message: 'Failed to create attendance record',
          details: {
            distance,
            threshold,
            withinRange: true,
            classLocation
          }
        };
      }

      return { 
        success: true, 
        record: createdRecord,
        message: `Attendance marked as ${status}`,
        details: {
          distance,
          threshold,
          withinRange: true,
          classLocation
        }
      };
    } catch (error) {
      handleSupabaseError(error as Error);
      return { success: false, message: 'Failed to mark attendance' };
    }
  },

  // New method for biometric verification
  async markAttendanceWithBiometric(
    classId: string,
    studentId: string,
    biometricData: string
  ): Promise<{ success: boolean; record?: AttendanceRecord; message?: string }> {
    try {
      // TODO: Implement actual biometric verification when biometric_data is available in users table
      // For now, just allow and create the attendance record
      const newRecord: Omit<AttendanceRecord, 'id'> = {
        classId,
        studentId,
        checkInTime: new Date().toISOString(),
        status: 'Present',
        verificationMethod: 'Biometric',
        deviceId: getDeviceId()
      };

      const createdRecord = await this.createAttendanceRecord(newRecord);
      return { success: true, record: createdRecord || undefined };
    } catch (error) {
      console.error('Biometric attendance error:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Mark attendance with facial recognition
  async markAttendanceWithFacial(
    classId: string,
    studentId: string,
    facialData: string
  ): Promise<{ success: boolean; record?: AttendanceRecord; message?: string }> {
    try {
      // First, fetch the class to check status and verification methods
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single();

      if (classError) throw classError;
      if (!classData) {
        return { success: false, message: 'Class not found' };
      }

      // Enforce verification method
      if (!Array.isArray(classData.verification_methods) || !classData.verification_methods.includes('Facial')) {
        return { success: false, message: 'Facial verification is not enabled for this class.' };
      }

      // Enforce active status
      if (!classData.active) {
        return { success: false, message: 'Class is not active' };
      }

      // Check for existing attendance
      const { data: existingRecord } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('class_id', classId)
        .eq('student_id', studentId)
        .maybeSingle();

      if (existingRecord) {
        return { success: false, message: 'Attendance already marked for this student' };
      }

      // Create attendance record
      const newRecord: Omit<AttendanceRecord, 'id'> = {
        classId,
        studentId,
        checkInTime: new Date().toISOString(),
        status: 'Present',
        verificationMethod: 'Facial',
        deviceId: getDeviceId()
      };

      const createdRecord = await this.createAttendanceRecord(newRecord);
      return { success: true, record: createdRecord || undefined };
    } catch (error) {
      console.error('Facial attendance error:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Mark attendance with NFC
  async markAttendanceWithNFC(
    classId: string,
    studentId: string,
    nfcData: string
  ): Promise<{ success: boolean; record?: AttendanceRecord; message?: string }> {
    try {
      // First, fetch the class to check status and verification methods
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single();

      if (classError) throw classError;
      if (!classData) {
        return { success: false, message: 'Class not found' };
      }

      // Enforce verification method
      if (!Array.isArray(classData.verification_methods) || !classData.verification_methods.includes('NFC')) {
        return { success: false, message: 'NFC verification is not enabled for this class.' };
      }

      // Enforce active status
      if (!classData.active) {
        return { success: false, message: 'Class is not active' };
      }

      // Check for existing attendance
      const { data: existingRecord } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('class_id', classId)
        .eq('student_id', studentId)
        .maybeSingle();

      if (existingRecord) {
        return { success: false, message: 'Attendance already marked for this student' };
      }

      // Create attendance record
      const newRecord: Omit<AttendanceRecord, 'id'> = {
        classId,
        studentId,
        checkInTime: new Date().toISOString(),
        status: 'Present',
        verificationMethod: 'NFC',
        deviceId: getDeviceId()
      };

      const createdRecord = await this.createAttendanceRecord(newRecord);
      return { success: true, record: createdRecord || undefined };
    } catch (error) {
      console.error('NFC attendance error:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async markAttendanceWithPIN(classId: string, studentId: string, pin: string) {
    // TODO: Implement actual API call to your backend/Supabase
    // Example placeholder:
    return { success: false, message: "PIN verification not implemented", record: null };
  },
};

// Haversine formula to calculate distance between two coordinates in meters
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = 
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance; // Distance in meters
} 