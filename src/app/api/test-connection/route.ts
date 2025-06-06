import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const results: { 
    supabase: { 
      status: string; 
      error: string | null; 
      data: { count: number } | null 
    } 
  } = {
    supabase: { status: 'unknown', error: '', data: null }
  };

  // Test Supabase
  try {
    const { data, error } = await supabase.from('users').select('id').limit(1);
    
    if (error) {
      results.supabase.status = 'error';
      results.supabase.error = error.message;
    } else {
      results.supabase.status = 'connected';
      results.supabase.data = { count: data?.length || 0 };
    }
  } catch (error) {
    results.supabase.status = 'error';
    results.supabase.error = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(results);
} 