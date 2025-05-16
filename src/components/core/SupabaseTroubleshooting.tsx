import React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface SupabaseTroubleshootingProps {
  onRetry?: () => void;
  onContinue?: () => void;
  onGoHome?: () => void;
}

export default function SupabaseTroubleshooting({ 
  onRetry = () => window.location.reload(),
  onContinue,
  onGoHome
}: SupabaseTroubleshootingProps) {
  // Test the Supabase connection on mount
  const [connectionStatus, setConnectionStatus] = React.useState<'loading' | 'success' | 'error'>('loading');
  const [errorDetails, setErrorDetails] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    const testConnection = async () => {
      try {
        const { error } = await supabase.from('users').select('count(*)', { count: 'exact', head: true });
        
        if (error) {
          console.error('Supabase connection test failed:', error.message);
          setConnectionStatus('error');
          setErrorDetails(error.message);
        } else {
          setConnectionStatus('success');
        }
      } catch (error) {
        console.error('Failed to test Supabase connection:', error);
        setConnectionStatus('error');
        setErrorDetails(error instanceof Error ? error.message : 'Unknown error');
      }
    };
    
    testConnection();
  }, []);
  
  // Get environment info to help with debugging
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center">
      <h2 className="text-xl font-bold mb-4">Supabase Connection Issues</h2>
      
      <div className="mb-4 p-3 rounded-md bg-yellow-50 border border-yellow-200">
        <p className="font-medium text-left">
          Connection Status: 
          {connectionStatus === 'loading' && <span className="text-blue-600"> Testing...</span>}
          {connectionStatus === 'success' && <span className="text-green-600"> Connected</span>}
          {connectionStatus === 'error' && <span className="text-red-600"> Error</span>}
        </p>
        {errorDetails && (
          <p className="text-sm mt-1 text-left text-red-600 break-words">
            Error: {errorDetails}
          </p>
        )}
      </div>
      
      <p className="mb-4 text-left">We're having trouble connecting to the Supabase backend. Please check:</p>
      
      <ul className="text-left list-disc pl-6 mb-6 space-y-2">
        <li>
          <strong>Environment Variables:</strong> Make sure your <code>.env.local</code> file includes:
          <ul className="text-xs pl-4 mt-1 space-y-1 font-mono">
            <li className={!supabaseUrl ? 'text-red-500' : 'text-green-600'}>
              NEXT_PUBLIC_SUPABASE_URL
              {supabaseUrl ? ` ✓` : ` ✗ (missing)`}
            </li>
            <li className={!hasAnonKey ? 'text-red-500' : 'text-green-600'}>
              NEXT_PUBLIC_SUPABASE_ANON_KEY
              {hasAnonKey ? ` ✓` : ` ✗ (missing)`}
            </li>
          </ul>
        </li>
        <li><strong>Network:</strong> Check your internet connection</li>
        <li><strong>Supabase Service:</strong> Verify your Supabase project is active</li>
        <li><strong>CORS Settings:</strong> Make sure your Supabase project allows requests from your domain</li>
      </ul>
      
      <div className="flex flex-col gap-3 mb-6">
        {onRetry && (
          <button 
            onClick={onRetry}
            className="bg-primary text-white px-4 py-2 rounded-md"
          >
            Refresh Page
          </button>
        )}
        
        {onContinue && (
          <button 
            onClick={onContinue}
            className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md"
          >
            Continue Anyway
          </button>
        )}
        
        {onGoHome && (
          <button 
            onClick={onGoHome}
            className="bg-muted text-muted-foreground px-4 py-2 rounded-md"
          >
            Go to Home Page
          </button>
        )}
      </div>
      
      <div className="text-sm text-muted-foreground">
        <Link href="/setup-guide" className="text-primary hover:underline">
          View Supabase Setup Guide
        </Link>
      </div>
    </div>
  );
} 