import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { unparse } from 'papaparse';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get('classId');
  console.log('Export API called with classId:', classId);
  if (!classId) {
    console.error('Missing classId in request');
    return NextResponse.json({ error: 'Missing classId' }, { status: 400 });
  }

  // Fetch attendance records for the class, joining with users and classes
  const { data, error } = await supabase
    .from('attendance_records')
    .select(`
      check_in_time,
      status,
      verification_method,
      verified_latitude,
      verified_longitude,
      created_at,
      users:student_id(display_name, index_number, email),
      classes:class_id(name)
    `)
    .eq('class_id', classId);

  console.log('Supabase query result:', { data, error });

  if (error) {
    console.error('Supabase error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    console.warn('No attendance records found for classId:', classId);
    return NextResponse.json({ error: 'No attendance records found.' }, { status: 404 });
  }

  // Prepare CSV data with readable headers
  const csvData = data.map((row: any) => ({
    'Name': row.users?.display_name || '',
    'Student Index Number': row.users?.index_number || '',
    'Email': row.users?.email || '',
    'Class Name': row.classes?.name || '',
    'Check-in Time': row.check_in_time,
    'Status': row.status,
    'Verification Method': row.verification_method,
    'Verified Latitude': row.verified_latitude,
    'Verified Longitude': row.verified_longitude,
    'Record Created At': row.created_at,
  }));

  // Use class name for filename if available
  const className = data[0]?.classes?.[0]?.name?.replace(/[^a-zA-Z0-9-_]/g, '_') || classId;
  const csv = unparse(csvData);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="attendance-${className}.csv"`,
    },
  });
} 