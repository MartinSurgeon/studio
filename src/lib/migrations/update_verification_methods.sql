-- Drop the existing enum type and recreate it with new values
ALTER TABLE attendance_records 
  ALTER COLUMN verification_method TYPE TEXT;

DROP TYPE verification_method;

CREATE TYPE verification_method AS ENUM ('QR', 'Location', 'Manual', 'Biometric', 'Facial', 'NFC');

ALTER TABLE attendance_records 
  ALTER COLUMN verification_method TYPE verification_method 
  USING verification_method::verification_method; 