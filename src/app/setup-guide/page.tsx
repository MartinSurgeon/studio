"use client";

import Link from 'next/link';

export default function SetupGuidePage() {
  return (
    <div className="container max-w-4xl mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">GeoAttend Supabase Setup Guide</h1>
        <p className="text-lg text-muted-foreground">Follow these steps to set up your Supabase backend for GeoAttend</p>
      </header>
      
      <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">1. Create a Supabase Project</h2>
        <ol className="list-decimal pl-6 space-y-4">
          <li>
            <p className="mb-2">Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Supabase</a> and sign in/sign up.</p>
          </li>
          <li>
            <p className="mb-2">Create a new project and give it a name (e.g., "geoattend").</p>
          </li>
          <li>
            <p className="mb-2">Set a secure database password (make sure to remember it).</p>
          </li>
          <li>
            <p className="mb-2">Choose a region closest to your users.</p>
          </li>
          <li>
            <p className="mb-2">Wait for your project to be created (usually takes a few minutes).</p>
          </li>
        </ol>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">2. Get Your API Keys</h2>
        <ol className="list-decimal pl-6 space-y-4">
          <li>
            <p className="mb-2">Once your project is ready, go to the project dashboard.</p>
          </li>
          <li>
            <p className="mb-2">In the left sidebar, click on "Project Settings".</p>
          </li>
          <li>
            <p className="mb-2">Click on "API" in the settings menu.</p>
          </li>
          <li>
            <p className="mb-2">You'll find your:</p>
            <ul className="list-disc pl-6 mb-2">
              <li>Project URL (e.g., <code className="bg-gray-100 p-1 rounded">https://xxxxxxxxxxxx.supabase.co</code>)</li>
              <li>API Key (anon public) - This is the one you need for client-side access</li>
            </ul>
          </li>
        </ol>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">3. Set Up Environment Variables</h2>
        <ol className="list-decimal pl-6 space-y-4">
          <li>
            <p className="mb-2">In your GeoAttend project, create or edit a file named <code className="bg-gray-100 p-1 rounded">.env.local</code> in the root directory.</p>
          </li>
          <li>
            <p className="mb-2">Add the following lines to the file:</p>
            <pre className="bg-gray-100 p-3 rounded mb-2 overflow-x-auto">
              <code>
                NEXT_PUBLIC_SUPABASE_URL=https://your-project-url.supabase.co{"\n"}
                NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
              </code>
            </pre>
          </li>
          <li>
            <p className="mb-2">Replace the placeholder values with your actual Project URL and API Key.</p>
          </li>
          <li>
            <p className="mb-2">Save the file and restart your development server.</p>
          </li>
        </ol>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">4. Create Your Database Schema</h2>
        <ol className="list-decimal pl-6 space-y-4">
          <li>
            <p className="mb-2">In your Supabase dashboard, go to the "SQL Editor" section.</p>
          </li>
          <li>
            <p className="mb-2">Create a new query and paste the schema SQL from <code className="bg-gray-100 p-1 rounded">src/lib/schema.sql</code>.</p>
          </li>
          <li>
            <p className="mb-2">Run the query to create all the required tables and functions.</p>
          </li>
        </ol>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">5. Configure Authentication</h2>
        <ol className="list-decimal pl-6 space-y-4">
          <li>
            <p className="mb-2">In your Supabase dashboard, go to "Authentication" → "Providers".</p>
            </li>
          <li>
            <p className="mb-2">Make sure "Email" is enabled.</p>
            </li>
          <li>
            <p className="mb-2">For development purposes, you might want to disable email confirmation by:</p>
            <ul className="list-disc pl-6">
              <li>Going to "Authentication" → "Settings"</li>
              <li>Turning off "Enable email confirmations"</li>
          </ul>
          </li>
        </ol>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">Common Issues and Solutions</h2>
        
        <div className="mb-4">
          <h3 className="font-medium mb-2">Issue: "Network error" or cannot connect to Supabase</h3>
          <p className="pl-4">
            <strong>Solution:</strong> Check your environment variables to ensure they're correctly set. 
            Make sure your internet connection is working and that the Supabase service is up.
          </p>
            </div>
        
        <div className="mb-4">
          <h3 className="font-medium mb-2">Issue: "Invalid API key" or authentication errors</h3>
          <p className="pl-4">
            <strong>Solution:</strong> Double-check your API key in the .env.local file. 
            Make sure you're using the "anon" public key for client-side access.
          </p>
            </div>
        
        <div className="mb-4">
          <h3 className="font-medium mb-2">Issue: "Table does not exist" errors</h3>
          <p className="pl-4">
            <strong>Solution:</strong> Make sure you've run the SQL schema script in the Supabase SQL Editor 
            to create all necessary tables and functions.
          </p>
        </div>
        
        <div className="mb-4">
          <h3 className="font-medium mb-2">Issue: "RLS policy violation" errors</h3>
          <p className="pl-4">
            <strong>Solution:</strong> Ensure that your Row Level Security (RLS) policies are configured correctly. 
            For development, you might want to temporarily disable RLS for testing.
          </p>
        </div>
      </div>
      
      <div className="flex justify-center mt-12 mb-8">
        <Link href="/">
          <button className="bg-primary text-white px-6 py-2 rounded-md">
            Return to GeoAttend
            </button>
          </Link>
      </div>
    </div>
  );
} 