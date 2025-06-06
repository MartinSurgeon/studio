-- Add fcm_token column to users table
ALTER TABLE users ADD COLUMN fcm_token TEXT;

-- Add index for faster lookups
CREATE INDEX idx_users_fcm_token ON users(fcm_token);
