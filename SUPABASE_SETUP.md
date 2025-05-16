# Trakzy Supabase Setup Guide

This guide will help you connect your Trakzy application to Supabase for cloud data storage and authentication.

## Step 1: Get Your Supabase Credentials

1. Go to your Supabase dashboard (https://app.supabase.io)
2. Open your "Trakzy" project
3. Navigate to Project Settings > API
4. Copy the following values:
   - Project URL (e.g., https://your-project-ref.supabase.co)
   - Project API Keys > anon public key 

## Step 2: Update Environment Variables

1. Open `.env.local` in the root of your project
2. Update the following variables with your copied values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Save the file

## Step 3: Set Up Your Database Schema

1. In your Supabase dashboard, go to the SQL Editor
2. Create a new query
3. Copy the entire contents of `src/lib/schema.sql` 
4. Paste into the SQL Editor and run the query
5. Verify that the tables and functions were created successfully

## Step 4: Configure Authentication

1. In your Supabase dashboard, go to Authentication > Settings
2. Enable "Email Auth" for sign-in providers
3. Under "Site URL", set the URL to your website (e.g., http://localhost:9004 for local development)
4. Set the Redirect URLs to:
   - http://localhost:9004
   - http://localhost:9004/auth/callback

## Step 5: Test the Connection

1. Start your development server
2. Create a user account through the app's sign-up page
3. Try adding a class and marking attendance
4. Check your Supabase Tables to see if the data is being saved

## Troubleshooting

### Cannot Access Supabase

Make sure your environment variables are set correctly in `.env.local`. You might need to restart your Next.js server after changing these values.

### Authentication Issues

If users can't sign in or sign up:
1. Check that Email Auth is enabled in your Supabase dashboard
2. Verify that the Site URL and Redirect URLs are set correctly
3. Make sure your RLS (Row Level Security) policies are set up properly

### Geolocation Issues

If you're experiencing geolocation errors:
1. Ensure your browser allows location access for your site
2. HTTPS is required for geolocation in production environments
3. Check the implementation of the geolocation feature in the code

### Data Not Syncing

If data isn't syncing between the app and Supabase:
1. Check browser console for errors
2. Verify network requests in the browser's developer tools
3. Check Supabase logs for any errors
4. Ensure RLS policies allow the operations you're trying to perform

## Additional Resources

- [Supabase Documentation](https://supabase.io/docs)
- [Next.js & Supabase Guide](https://supabase.io/docs/guides/with-nextjs)
- [Row Level Security Guide](https://supabase.io/docs/guides/auth/row-level-security) 