import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Test basic connection
    const { data, error, count } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .limit(1);
    
    if (error) {
      console.error('API route - Supabase connection error:', error);
      
      // Additional connection testing
      const authTest = await supabase.auth.getSession();
      
      return NextResponse.json({
        success: false,
        message: 'Supabase connection error',
        error: error,
        authStatus: authTest.error ? 'Auth Error' : 'Auth OK',
        environmentVariables: {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
          anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
        }
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful',
      count: count || 0,
      environmentVariables: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
      }
    });
  } catch (error) {
    console.error('API route - Unexpected error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Unexpected error testing Supabase connection',
      error: error instanceof Error ? error.message : String(error),
      environmentVariables: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
      }
    }, { status: 500 });
  }
} 