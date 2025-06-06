import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { fcmToken } = await request.json();

    if (!fcmToken) {
      return NextResponse.json(
        { error: 'FCM token is required' },
        { status: 400 }
      );
    }

    // Get the current user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Update the user's FCM token in the database
    const { error: updateError } = await supabase
      .from('users')
      .update({ fcm_token: fcmToken })
      .eq('id', session.user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ 
      success: true,
      message: 'FCM token stored successfully'
    });

  } catch (error: any) {
    console.error('Error storing FCM token:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 