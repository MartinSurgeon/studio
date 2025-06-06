import { NextResponse } from 'next/server';
import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: 'geoattend-xihty'
});

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { userId, title, body } = await request.json();

    if (!userId || !title || !body) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the user's FCM token from the database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('fcm_token')
      .eq('id', userId)
      .single();

    if (userError || !user?.fcm_token) {
      return NextResponse.json(
        { error: 'User FCM token not found' },
        { status: 404 }
      );
    }

    const message = {
      notification: {
        title,
        body
      },
      token: user.fcm_token
    };

    const response = await getMessaging().send(message);
    
    return NextResponse.json({ 
      success: true, 
      messageId: response 
    });

  } catch (error: any) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 