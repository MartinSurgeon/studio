import { NextResponse } from 'next/server';

export async function GET() {
  // Check Supabase environment variables
  const supabaseEnv = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
  };

  return NextResponse.json({
    supabase: supabaseEnv
  });
} 