import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

// Create a single supabase client for interacting with your database
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Generate a unique ID for this browser tab
const getTabId = () => {
  // Check if we're in the browser environment
  if (typeof window === 'undefined') {
    return 'server-side';
  }
  
  // Try to get existing tab ID or create a new one
  let tabId = sessionStorage.getItem('geoattend-tab-id');
  if (!tabId) {
    tabId = `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('geoattend-tab-id', tabId);
  }
  return tabId;
};

// Create a custom storage object that uses the tab ID in the keys
class TabSpecificStorage {
  tabId: string;
  
  constructor() {
    this.tabId = getTabId();
  }
  
  getItem(key: string): string | null {
    const tabSpecificKey = `${this.tabId}:${key}`;
    return localStorage.getItem(tabSpecificKey);
  }
  
  setItem(key: string, value: string) {
    const tabSpecificKey = `${this.tabId}:${key}`;
    localStorage.setItem(tabSpecificKey, value);
  }
  
  removeItem(key: string) {
    const tabSpecificKey = `${this.tabId}:${key}`;
    localStorage.removeItem(tabSpecificKey);
  }
}

// Create a tab-specific storage instance
const tabStorage = typeof window !== 'undefined' ? new TabSpecificStorage() : null;

// Log environment availability for debugging
console.log('Supabase URL:', supabaseUrl ? supabaseUrl : 'Missing URL');
console.log('Supabase Anon Key available:', !!supabaseAnonKey);
console.log('Supabase Service Key available:', !!supabaseServiceKey);
console.log('Tab ID:', typeof window !== 'undefined' ? getTabId() : 'server-side');

// Log any potential URL formatting issues
if (supabaseUrl && (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://'))) {
  console.error('Supabase URL format issue: URL should start with http:// or https://');
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env.local file.');
  console.error('Run node setup-supabase.js to set up your environment variables.');
}

// Custom fetch function that ensures API key is included
const customFetch = (url: RequestInfo | URL, options: RequestInit = {}) => {
  // This covers cases where options.headers might be undefined or null
  const headers = new Headers(options.headers || {});
  
  // Always ensure apikey is set in headers
  if (!headers.has('apikey') && supabaseAnonKey) {
    headers.set('apikey', supabaseAnonKey);
  }
  
  // Always ensure Authorization is set if apikey is available
  if (!headers.has('Authorization') && supabaseAnonKey) {
    headers.set('Authorization', `Bearer ${supabaseAnonKey}`);
  }
  
  // Create a new options object with the modified headers
  const newOptions = {
    ...options,
    headers
  };
  
  return fetch(url, newOptions);
};

// Create the Supabase client with tab-specific storage
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Use tab-specific storage if available
    storage: tabStorage as any,
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'x-application-name': 'geoattend',
      'x-tab-id': typeof window !== 'undefined' ? getTabId() : 'server',
    },
    // Use the custom fetch function
    fetch: customFetch,
  },
  // Retry options
  db: {
    schema: 'public',
  },
  // Reduce batch size for more reliable operations
  realtime: {
    params: {
      eventsPerSecond: 5,
    },
  },
});

// Remove the connection test that might be causing issues
/* Removing problematic connection test
supabase.from('users').select('count(*)', { count: 'exact', head: true })
  .then(({ count, error }) => {
    if (error) {
      console.error('Supabase connection test failed:', error.message);
      console.error('This indicates a problem with your Supabase configuration or connectivity.');
      console.error('Details:', error);
    } else {
      console.log('Supabase connection successful. Database contains user records:', count);
    }
  })
  .catch(error => {
    console.error('Failed to test Supabase connection:', error);
  });
*/

// Simple one-time auth check without throwing errors
setTimeout(() => {
  console.log('Checking auth status...');
  supabase.auth.getSession()
    .then(({ data }) => {
      console.log('Auth check: Session is', data.session ? 'active' : 'not active');
    })
    .catch(() => {
      console.log('Auth check: Unable to verify session');
    });
}, 3000);

// Create admin client with service role for administrative tasks
// Note: This should only be used server-side and not exposed to the browser
export const supabaseAdmin = supabaseServiceKey 
  ? createClient<Database>(supabaseUrl, supabaseServiceKey)
  : null;

// Helper function to handle errors
export const handleSupabaseError = (error: Error | unknown) => {
  // Check if error is empty or undefined
  if (!error) {
    console.error('Supabase error: Undefined or null error object received');
    return;
  }
  
  // Handle case where error is an empty object
  if (typeof error === 'object' && Object.keys(error as object).length === 0) {
    console.error('Supabase error: Empty error message received.');
    console.error('This is typically a CORS or network connectivity issue:');
    console.error('1. Make sure localhost:9004 is added to the allowed domains in Supabase Auth settings');
    console.error('2. Check your internet connection and firewall settings');
    console.error('3. Verify the Supabase service is up and your project is active');
    
    // Try to get more information about the current session
    supabase.auth.getSession().then(({ data }) => {
      console.log('Current session status:', data.session ? 'Active' : 'No active session');
    }).catch(sessionError => {
      console.error('Failed to get session info:', sessionError);
    });
    
    return;
  }
  
  // Log specific error message details
  if (typeof error === 'object' && 'message' in (error as any)) {
    const errorMsg = (error as any).message;
    const errorHint = (error as any).hint;
    console.error(`Supabase error: ${errorMsg}`);
    if (errorHint) console.error(`Hint: ${errorHint}`);
    
    // Special case for API key errors
    if (errorMsg === 'No API key found in request') {
      console.error('API KEY ERROR: The Supabase API key is missing in the request.');
      console.error('Current API key state:', supabaseAnonKey ? 'API key is set' : 'API key is missing');
      console.error('ENV var length:', supabaseAnonKey.length);
      console.error('Make sure NEXT_PUBLIC_SUPABASE_ANON_KEY is correctly set in .env.local');
      console.error('Try restarting the server after updating environment variables');
    }
  } else {
    console.error('Supabase error:', error);
  }
  
  // If it's an Error object, we can access the message
  if (error instanceof Error) {
    // Special handling for specific error types
    if (error.message && error.message.includes('display_name')) {
      console.error('Column error detected. This might be due to the Supabase schema not being properly applied.');
      console.error('Try running the SQL script from src/lib/schema.sql in your Supabase SQL editor.');
    }
    
    if (error.message && error.message.includes('For security purposes')) {
      console.error('Rate limiting detected. Wait a moment before trying again.');
    }
    
    if (error.message && error.message.includes('violates row-level security policy')) {
      console.error('RLS policy error. This might be due to incorrect permissions.');
      console.error('Try running the rls-fix.sql script in your Supabase SQL editor.');
    }
    
    if (error.message && error.message.includes('Email not confirmed')) {
      console.error('Email confirmation required. The user needs to confirm their email before they can log in.');
      console.error('To disable email confirmation for testing, run the disable-email-confirm.sql script.');
    }
    
    if (error.message && error.message.includes('JWT')) {
      console.error('Authentication token issue. Try signing out and back in.');
    }
    
    if (error.message && error.message.includes('network')) {
      console.error('Network error. Check your internet connection and Supabase service status.');
    }
  }
}; 