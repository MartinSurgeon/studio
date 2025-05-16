import { supabase, handleSupabaseError } from '@/lib/supabase';
import type { Class } from '@/lib/types';
import type { Tables, InsertDTO, UpdateDTO } from '@/lib/database.types';

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
});

// Mapper to convert application types to database rows
const mapToClassRow = (classData: Class): InsertDTO<'classes'> => ({
  id: classData.id,
  name: classData.name,
  latitude: classData.location?.latitude || null,
  longitude: classData.location?.longitude || null,
  distance_threshold: classData.distanceThreshold,
  start_time: classData.startTime,
  end_time: classData.endTime || null,
  active: classData.active,
  lecturer_id: classData.lecturerId,
  qr_code_value: classData.qrCodeValue || null,
  qr_code_expiry: classData.qrCodeExpiry || null,
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
      const newClass = {
        ...classData,
        id: specificId || crypto.randomUUID()
      };
      
      const { data, error } = await supabase
        .from('classes')
        .insert(mapToClassRow(newClass as Class))
        .select()
        .single();
      
      if (error) {
        console.error("Error creating class:", error);
        throw error;
      }
      
      if (!data) return null;
      
      return mapToClass(data);
    } catch (error) {
      console.error("Class creation error details:", error);
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
          qrCodeExpiry: updates.qrCodeExpiry
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
  }
}; 