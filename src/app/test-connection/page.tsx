"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from '@/components/core/LoadingSpinner';

export default function TestConnectionPage() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function testConnection() {
      setLoading(true);
      try {
        const startTime = Date.now();
        const { data, error, count } = await supabase
          .from('users')
          .select('*', { count: 'exact' })
          .limit(1);
        const endTime = Date.now();
        
        setResults({
          success: !error,
          message: error ? 'Connection failed' : 'Connection successful',
          error: error,
          data: data,
          count: count,
          timing: `${endTime - startTime}ms`,
          url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not available',
          keyAvailable: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        });
      } catch (error) {
        setResults({
          success: false,
          message: 'Unexpected error',
          error: error instanceof Error ? error.message : String(error),
          timing: 'Failed',
          url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not available',
          keyAvailable: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        });
      } finally {
        setLoading(false);
      }
    }

    testConnection();
  }, []);

  const hasNetworkIssue = (results?.error && results.error.message === "");

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Supabase Connection Test</h1>
        <p className="text-lg text-muted-foreground">Diagnosing your Supabase connection issues</p>
      </header>

      <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">Connection Test Results</h2>
        {loading ? (
          <LoadingSpinner text="Testing connection..." />
        ) : (
          <div>
            <div className={`p-4 mb-4 rounded-md ${results.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className="font-bold">{results.message}</p>
              <p className="text-sm">Response time: {results.timing}</p>
            </div>

            <h3 className="font-medium mb-2">Connection Details:</h3>
            <ul className="space-y-2 text-sm mb-4">
              <li><strong>Supabase URL:</strong> <span className={!results.url || results.url === 'Not available' ? 'text-red-500' : 'text-green-500'}>{results.url}</span></li>
              <li><strong>API Key Available:</strong> <span className={!results.keyAvailable ? 'text-red-500' : 'text-green-500'}>{results.keyAvailable ? 'Yes' : 'No'}</span></li>
            </ul>

            {results.error && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">Error Details:</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                  {results.error.message || 'Empty error message (likely network issues)'}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {!loading && hasNetworkIssue && (
        <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">Troubleshooting - Empty Error Message</h2>
          <div className="mb-4 p-4 bg-yellow-50 rounded border border-yellow-200">
            <h3 className="font-bold mb-2">Network Connection Issue Detected</h3>
            <p className="mb-2">The empty error message typically indicates network connectivity problems:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Check your internet connection</li>
              <li>Verify your Supabase project URL is correct</li>
              <li>Make sure your Supabase project is active</li>
              <li>Check CORS settings in your Supabase project</li>
              <li>Try connecting from a different network</li>
            </ul>
          </div>
        </div>
      )}
      
      <div className="flex justify-center space-x-4 my-6">
        <Link href="/" className="bg-primary text-white px-4 py-2 rounded-md">
          Return to Home
        </Link>
        <button 
          onClick={() => window.location.reload()}
          className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md"
        >
          Retest Connection
        </button>
      </div>
    </div>
  );
} 