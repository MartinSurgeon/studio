# Trakzy

Trakzy is a student attendance tracking application that uses location-based and QR code verification methods.

## Setup

### Prerequisites

- Node.js 18 or newer
- npm or yarn
- A Supabase account

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/trakzy.git
   cd trakzy
   ```

2. Install dependencies:
   ```
   npm install
   ```

### Supabase Setup

1. Create a Supabase project at [https://supabase.com](https://supabase.com)

2. Run the setup script to configure your Supabase environment variables:
   ```
   npm run setup-supabase
   ```
   This will prompt you for your Supabase URL and anonymous key.

3. Set up your database schema:
   - Go to your Supabase dashboard
   - Navigate to the SQL Editor
   - Copy the contents from `src/lib/schema.sql`
   - Run the SQL to create the necessary tables and functions

4. Configure authentication:
   - In your Supabase dashboard, go to Authentication > Settings
   - Enable "Email Auth" for sign-in providers
   - Set your site URL and redirect URLs to:
     - http://localhost:9004
     - http://localhost:9004/auth/callback

### Development

Start the development server:

```
npm run dev:alt
```

The application will be available at http://localhost:9004

## Features

- User authentication (student and lecturer roles)
- Class management for lecturers
- Attendance tracking using:
  - QR code scanning
  - Location verification
  - Manual registration
- Attendance analytics and reporting

## Database Schema

The application uses three main tables:
- users: Store user information and roles
- classes: Store class details including location and schedule
- attendance_records: Track student attendance for each class

## Troubleshooting

If you encounter issues:

1. Check that your Supabase environment variables are correctly set
2. Verify that the database tables are properly created
3. Make sure authentication is properly configured in your Supabase project
4. For more detailed guidance, refer to `SUPABASE_SETUP.md`
