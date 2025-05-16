-- Add device_id column to attendance_records table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance_records' AND column_name = 'device_id'
    ) THEN
        -- Add the device_id column
        ALTER TABLE attendance_records ADD COLUMN device_id TEXT;
        
        -- Remove the unique constraint since we now need to allow multiple records
        -- but with different device IDs
        ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_class_id_student_id_key;
        
        -- Create a new unique constraint that includes device_id
        ALTER TABLE attendance_records ADD CONSTRAINT attendance_records_class_id_student_id_device_id_key 
        UNIQUE (class_id, student_id, device_id);
        
        -- Set any existing records to have a default device ID
        UPDATE attendance_records SET device_id = 'migrated_record' WHERE device_id IS NULL;
    END IF;
END
$$; 