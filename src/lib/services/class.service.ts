import { supabase, handleSupabaseError } from '@/lib/supabase';
import type { Class, RecurrencePattern, ScheduleType } from '@/lib/types';
import type { Tables, InsertDTO, UpdateDTO } from '@/lib/database.types';
import { addDays, addWeeks, addMonths, isAfter, isBefore, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

// Mapper to convert database rows to application types
const mapToClass = (row: Tables<'classes'>): Class => ({
  id: row.id,
  name: row.name,
  location: row.latitude && row.longitude 
    ? { latitude: row.latitude, longitude: row.longitude } 
    : undefined,
  distanceThreshold: row.distance_threshold,
  startTime: row.start_time,
  endTime: row.end_time || undefined,
  active: row.active === true,
  lecturerId: row.lecturer_id,
  qrCodeValue: row.qr_code_value || undefined,
  qrCodeExpiry: row.qr_code_expiry || undefined,
  createdAt: row.created_at,
  scheduleType: row.schedule_type as ScheduleType,
  recurrencePattern: row.recurrence_pattern,
  durationMinutes: row.duration_minutes,
  gracePeriodMinutes: row.grace_period_minutes,
  autoStart: row.auto_start,
  autoEnd: row.auto_end,
  nextOccurrence: row.next_occurrence as string | undefined
});

// Mapper to convert application types to database rows
const mapToClassRow = (classData: Class): InsertDTO<'classes'> => ({
  id: classData.id,
  name: classData.name,
  latitude: classData.location?.latitude || null,
  longitude: classData.location?.longitude || null,
  distance_threshold: classData.distanceThreshold ?? 100,
  start_time: classData.startTime,
  end_time: classData.endTime || null,
  active: classData.active,
  lecturer_id: classData.lecturerId,
  qr_code_value: classData.qrCodeValue || null,
  qr_code_expiry: classData.qrCodeExpiry || null,
  created_at: classData.createdAt,
  schedule_type: classData.scheduleType ?? 'one-time',
  recurrence_pattern: classData.recurrencePattern ?? null,
  duration_minutes: classData.durationMinutes ?? 60,
  grace_period_minutes: classData.gracePeriodMinutes ?? 15,
  auto_start: classData.autoStart ?? false,
  auto_end: classData.autoEnd ?? false,
  next_occurrence: classData.nextOccurrence || null
});

// Ensure API key is included in all requests
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const headers = { 'apikey': supabaseKey || '' };
console.log('ClassService: API key available:', !!supabaseKey);

// Service functions
export const classService = {
  // Get all classes
  async getClasses(lecturerId?: string): Promise<Class[]> {
    try {
      console.log('getClasses: Starting request');
      
      let query = supabase
        .from('classes')
        .select('*');
      
      if (lecturerId) {
        query = query.eq('lecturer_id', lecturerId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('getClasses error:', error);
        throw error;
      }
      
      console.log(`getClasses: Retrieved ${data?.length || 0} classes`);
      return (data || []).map(mapToClass);
    } catch (error) {
      console.error('getClasses exception:', error);
      handleSupabaseError(error as Error);
      return [];
    }
  },
  
  // Get a single class by ID
  async getClass(id: string): Promise<Class | null> {
    try {
      console.log(`Fetching class with ID: ${id}`);
      
      // Validate ID format first
      if (!id || typeof id !== 'string') {
        throw new Error(`Invalid class ID: ${id}`);
      }
      
      // Check for valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        console.warn(`Class ID ${id} is not a valid UUID format. This may cause database errors.`);
      }
      
      // Get current authentication status before query
      const { data: authData } = await supabase.auth.getSession();
      console.log(`Auth status before query: ${authData.session ? 'Authenticated' : 'Not authenticated'}`);
      
      console.log(`Executing Supabase query for class: ${id}`);
      const { data, error, status, statusText } = await supabase
        .from('classes')
        .select('*')
        .eq('id', id)
        .single();
      
      // Log detailed response info
      console.log(`Query response status: ${status} ${statusText}`);
      
      if (error) {
        console.error(`Error fetching class ${id}:`, error);
        throw error;
      }
      
      if (!data) {
        console.log(`No class found with ID: ${id}`);
        return null;
      }
      
      console.log(`Successfully retrieved class: ${data.name}`);
      return mapToClass(data);
    } catch (error) {
      console.error(`Error in getClass(${id}):`, error);
      handleSupabaseError(error as Error);
      return null;
    }
  },
  
  // Create a new class
  async createClass(classData: Omit<Class, 'id'>, specificId?: string): Promise<Class | null> {
    try {
      // Validate lecturer_id is a valid UUID
      if (!classData.lecturerId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(classData.lecturerId)) {
        console.error(`Invalid lecturer_id format: "${classData.lecturerId}". Must be a valid UUID.`);
        throw new Error(`Invalid lecturer_id format. Must be a valid UUID.`);
      }

      // Verify the lecturer exists in the users table
      const { data: lecturer, error: lecturerError } = await supabase
        .from('users')
        .select('id')
        .eq('id', classData.lecturerId)
        .eq('role', 'lecturer')
        .single();
      
      if (lecturerError || !lecturer) {
        console.error(`Lecturer with ID ${classData.lecturerId} not found in users table`);
        throw new Error(`Lecturer with ID ${classData.lecturerId} not found. Make sure the lecturer exists in the users table.`);
      }

      // Generate UUID on client side or use the provided ID
      const now = new Date().toISOString();
      const newClass: Class = {
        ...classData,
        id: specificId || uuidv4(),
        createdAt: (classData as any).createdAt || now,
        scheduleType: (classData as any).scheduleType || 'one-time',
        durationMinutes: (classData as any).durationMinutes ?? 60,
        gracePeriodMinutes: (classData as any).gracePeriodMinutes ?? 15,
        autoStart: (classData as any).autoStart ?? false,
        autoEnd: (classData as any).autoEnd ?? false,
        recurrencePattern: (classData as any).recurrencePattern ?? null,
        nextOccurrence: (classData as any).nextOccurrence || null,
      };
      
      const { data, error } = await supabase
        .from('classes')
        .insert(mapToClassRow(newClass as Class))
        .select()
        .single();
      
      if (error) {
        console.error("Error creating class:", error, { classData: newClass });
        throw error;
      }
      
      if (!data) {
        console.error("No data returned from Supabase after insert", { classData: newClass });
        return null;
      }
      
      return mapToClass(data);
    } catch (error) {
      console.error("Class creation error details:", error, { classData });
      handleSupabaseError(error as Error);
      return null;
    }
  },
  
  // Update an existing class
  async updateClass(id: string, updates: Partial<Class>): Promise<Class | null> {
    try {
      // First fetch the existing class to merge with updates
      const existingClass = await this.getClass(id);
      
      if (!existingClass) {
        console.log(`Class with ID ${id} not found. Creating a new class instead.`);
        
        // Make sure we have all required fields for a new class
        if (!updates.name || !updates.lecturerId) {
          throw new Error(`Cannot create a new class without required fields: name and lecturerId`);
        }
        
        // Create a complete class object for creation
        const newClassData: Omit<Class, 'id'> = {
          name: updates.name,
          lecturerId: updates.lecturerId,
          startTime: updates.startTime || new Date().toISOString(),
          active: updates.active !== undefined ? updates.active : false,
          distanceThreshold: updates.distanceThreshold || 50, // Default threshold
          location: updates.location,
          endTime: updates.endTime,
          qrCodeValue: updates.qrCodeValue,
          qrCodeExpiry: updates.qrCodeExpiry,
          createdAt: updates.createdAt || new Date().toISOString(),
          scheduleType: updates.scheduleType || 'one-time',
          durationMinutes: updates.durationMinutes || 60,
          gracePeriodMinutes: updates.gracePeriodMinutes || 15,
          autoStart: updates.autoStart || false,
          autoEnd: updates.autoEnd || false,
          recurrencePattern: updates.recurrencePattern || undefined,
          nextOccurrence: updates.nextOccurrence || undefined
        };
        
        try {
          // First try to create with the specified ID
          console.log(`Attempting to create class with specific ID: ${id}`);
          return await this.createClass(newClassData, id);
        } catch (createError) {
          // If that fails (e.g., due to ID format issues), create with a new ID
          console.log(`Failed to create with specific ID. Creating with new ID.`, createError);
          return await this.createClass(newClassData);
        }
      }
      
      // If we're updating lecturer_id, validate it's a proper UUID
      if (updates.lecturerId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(updates.lecturerId)) {
        console.error(`Invalid lecturer_id format in update: "${updates.lecturerId}". Must be a valid UUID.`);
        throw new Error(`Invalid lecturer_id format. Must be a valid UUID.`);
      }

      // If updating lecturer_id, verify the lecturer exists
      if (updates.lecturerId && updates.lecturerId !== existingClass.lecturerId) {
        const { data: lecturer, error: lecturerError } = await supabase
          .from('users')
          .select('id')
          .eq('id', updates.lecturerId)
          .eq('role', 'lecturer')
          .single();
        
        if (lecturerError || !lecturer) {
          console.error(`Lecturer with ID ${updates.lecturerId} not found in users table`);
          throw new Error(`Lecturer with ID ${updates.lecturerId} not found. Make sure the lecturer exists in the users table.`);
        }
      }
      
      // Merge existing with updates
      const updatedClass = {
        ...existingClass,
        ...updates
      };
      
      console.log("Updating class with data:", mapToClassRow(updatedClass));
      
      const { data, error } = await supabase
        .from('classes')
        .update(mapToClassRow(updatedClass))
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error("Error updating class:", error);
        // Check for specific errors related to lecturer_id
        if (error.message?.includes('lecturer_id')) {
          console.error("lecturer_id error detected. Current value:", updatedClass.lecturerId);
          if (error.message.includes('violates foreign key constraint')) {
            throw new Error(`The lecturer ID "${updatedClass.lecturerId}" is not a valid reference to a lecturer in the users table.`);
          }
        }
        throw error;
      }
      
      if (!data) return null;
      
      return mapToClass(data);
    } catch (error) {
      console.error("Class update error details:", error);
      handleSupabaseError(error as Error);
      return null;
    }
  },
  
  // Delete a class
  async deleteClass(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      handleSupabaseError(error as Error);
      return false;
    }
  },

  // Get all classes for a lecturer
  async getLecturerClasses(lecturerId: string): Promise<Class[]> {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('lecturer_id', lecturerId)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data.map(mapToClass);
  },

  // Generate next occurrence for recurring classes
  async generateNextOccurrence(classId: string): Promise<Class | null> {
    const classInstance = await this.getClass(classId);
    if (!classInstance || !classInstance.recurrencePattern) return null;

    const pattern = classInstance.recurrencePattern;
    const lastOccurrence = parseISO(classInstance.nextOccurrence || classInstance.startTime);
    let nextDate: Date;

    switch (pattern.frequency) {
      case 'daily':
        nextDate = addDays(lastOccurrence, pattern.interval);
        break;
      case 'weekly':
        nextDate = addWeeks(lastOccurrence, pattern.interval);
        break;
      case 'monthly':
        nextDate = addMonths(lastOccurrence, pattern.interval);
        break;
      default:
        return null;
    }

    // Check if we've reached the end date
    if (pattern.endDate && isAfter(nextDate, parseISO(pattern.endDate))) {
      return null;
    }

    // Create new class instance
    const newClass: Omit<Class, 'id'> = {
      ...classInstance,
      startTime: nextDate.toISOString(),
      endTime: classInstance.endTime ? 
        new Date(nextDate.getTime() + (parseISO(classInstance.endTime).getTime() - parseISO(classInstance.startTime).getTime()))
        .toISOString() : undefined,
      nextOccurrence: nextDate.toISOString()
    };

    return this.createClass(newClass);
  },

  // Handle auto-start/end for classes
  async handleAutoStartEnd(): Promise<void> {
    const now = new Date();
    
    // Get all active classes
    const { data: activeClasses, error } = await supabase
      .from('classes')
      .select('*')
      .eq('active', true);

    if (error) throw error;

    for (const classData of activeClasses) {
      const classInstance = mapToClass(classData);
      const startTime = parseISO(classInstance.startTime);
      const endTime = classInstance.endTime ? parseISO(classInstance.endTime) : null;

      // Handle auto-start
      if (classInstance.autoStart && 
          isBefore(startTime, now) && 
          (!endTime || isAfter(endTime, now))) {
        await this.updateClass(classInstance.id, {
          ...classInstance,
          active: true
        });
      }

      // Handle auto-end
      if (classInstance.autoEnd && endTime && isAfter(now, endTime)) {
        await this.updateClass(classInstance.id, {
          ...classInstance,
          active: false
        });

        // Generate next occurrence for recurring classes
        if (classInstance.scheduleType !== 'one-time') {
          await this.generateNextOccurrence(classInstance.id);
        }
      }
    }
  }
}; 