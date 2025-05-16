-- Create enums if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status') THEN
        CREATE TYPE attendance_status AS ENUM ('Present', 'Late', 'Absent');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_method') THEN
        CREATE TYPE verification_method AS ENUM ('QR', 'Location', 'Manual');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('student', 'lecturer');
    END IF;
END
$$;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL,
  index_number TEXT UNIQUE,
  institution_code TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT proper_index_number CHECK (
    (role = 'student' AND index_number IS NOT NULL) OR 
    (role = 'lecturer' AND index_number IS NULL)
  ),
  CONSTRAINT proper_institution_code CHECK (
    (role = 'lecturer' AND institution_code IS NOT NULL) OR 
    (role = 'student' AND institution_code IS NULL)
  )
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' AND policyname = 'Users can view their own profile'
    ) THEN
        CREATE POLICY "Users can view their own profile"
          ON users FOR SELECT
          USING (auth.uid() = id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' AND policyname = 'Users can update their own profile'
    ) THEN
        CREATE POLICY "Users can update their own profile"
          ON users FOR UPDATE
          USING (auth.uid() = id);
    END IF;
END
$$;

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_threshold DOUBLE PRECISION NOT NULL DEFAULT 100, -- Default 100 meters
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  lecturer_id UUID NOT NULL REFERENCES users(id),
  qr_code_value TEXT,
  qr_code_expiry BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for classes (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'classes' AND policyname = 'Lecturers can manage their own classes'
    ) THEN
        CREATE POLICY "Lecturers can manage their own classes"
          ON classes FOR ALL
          USING (
            auth.uid() = lecturer_id AND 
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'lecturer')
          );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'classes' AND policyname = 'All users can view classes'
    ) THEN
        CREATE POLICY "All users can view classes"
          ON classes FOR SELECT
          USING (true);
    END IF;
END
$$;

-- Attendance records table
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id),
  check_in_time TIMESTAMPTZ NOT NULL,
  status attendance_status NOT NULL,
  verification_method verification_method NOT NULL,
  verified_latitude DOUBLE PRECISION,
  verified_longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(class_id, student_id) -- Each student can only have one attendance record per class
);

-- Enable Row Level Security
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for attendance_records (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'attendance_records' AND policyname = 'Students can view their own attendance'
    ) THEN
        CREATE POLICY "Students can view their own attendance"
          ON attendance_records FOR SELECT
          USING (
            auth.uid() = student_id
          );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'attendance_records' AND policyname = 'Students can create their own attendance'
    ) THEN
        CREATE POLICY "Students can create their own attendance"
          ON attendance_records FOR INSERT
          WITH CHECK (
            auth.uid() = student_id AND
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'student')
          );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'attendance_records' AND policyname = 'Lecturers can manage attendance for their classes'
    ) THEN
        CREATE POLICY "Lecturers can manage attendance for their classes"
          ON attendance_records FOR ALL
          USING (
            EXISTS (
              SELECT 1 FROM classes c 
              WHERE c.id = class_id 
              AND c.lecturer_id = auth.uid() 
              AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'lecturer')
            )
          );
    END IF;
END
$$;

-- Create functions/triggers for audit logging if needed
-- This example creates a function that validates class is active when marking attendance
CREATE OR REPLACE FUNCTION validate_attendance_marking()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if class is active
  IF NOT EXISTS (SELECT 1 FROM classes WHERE id = NEW.class_id AND active = TRUE) THEN
    RAISE EXCEPTION 'Cannot mark attendance for inactive class';
  END IF;
  
  -- Set the status based on check-in time vs class start time
  IF EXISTS (
    SELECT 1 FROM classes 
    WHERE id = NEW.class_id 
    AND NEW.check_in_time > start_time
  ) THEN
    NEW.status = 'Late';
  ELSE
    NEW.status = 'Present';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger for validating attendance (drop first if it exists)
DROP TRIGGER IF EXISTS before_attendance_insert ON attendance_records;
CREATE TRIGGER before_attendance_insert
  BEFORE INSERT ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION validate_attendance_marking();

-- Create indexes for performance (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_classes_lecturer_id'
    ) THEN
        CREATE INDEX idx_classes_lecturer_id ON classes(lecturer_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_attendance_class_id'
    ) THEN
        CREATE INDEX idx_attendance_class_id ON attendance_records(class_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_attendance_student_id'
    ) THEN
        CREATE INDEX idx_attendance_student_id ON attendance_records(student_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_classes_active'
    ) THEN
        CREATE INDEX idx_classes_active ON classes(active);
    END IF;
END
$$;

-- Create a function to find nearby classes for location verification
CREATE OR REPLACE FUNCTION find_nearby_classes(
  lat DOUBLE PRECISION,
  long DOUBLE PRECISION,
  max_distance DOUBLE PRECISION DEFAULT 1000 -- Default 1000 meters
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  distance DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    (
      6371000 * acos(
        cos(radians(lat)) * 
        cos(radians(c.latitude)) * 
        cos(radians(c.longitude) - radians(long)) + 
        sin(radians(lat)) * 
        sin(radians(c.latitude))
      )
    ) AS distance
  FROM classes c
  WHERE 
    c.active = TRUE AND
    c.latitude IS NOT NULL AND
    c.longitude IS NOT NULL
  ORDER BY distance
  LIMIT 50;
END;
$$ LANGUAGE plpgsql; 