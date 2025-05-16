// Script to test Supabase connection
const https = require('https');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// Get values from .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('===========================================');
console.log('Supabase Connection Checker');
console.log('===========================================');

// Check .env.local
if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ ERROR: Missing environment variables');
  console.log('\nPlease check your .env.local file for:');
  console.log(`- NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Found' : '❌ Missing'}`);
  console.log(`- NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseKey ? '✅ Found' : '❌ Missing'}`);
  
  console.log('\nTry running:\n  npm run create-env\n');
  process.exit(1);
}

// URL validation
if (!supabaseUrl.startsWith('https://')) {
  console.error('\n❌ ERROR: Invalid Supabase URL format');
  console.log(`Your URL "${supabaseUrl}" does not start with https://`);
  console.log('Please use the URL from your Supabase project dashboard');
  process.exit(1);
}

// Key validation (basic check)
if (!supabaseKey.includes('.') || supabaseKey.length < 20) {
  console.error('\n❌ ERROR: Suspicious API key format');
  console.log('Your API key does not look like a valid Supabase anon key');
  console.log('Please use the anon key from your Supabase project dashboard');
  process.exit(1);
}

console.log('\n📋 Configuration:');
console.log(`- Supabase URL: ${supabaseUrl}`);
console.log(`- API Key: ${supabaseKey.substring(0, 10)}...${supabaseKey.substring(supabaseKey.length - 5)}`);

console.log('\n🔍 Testing connection...');

// Extract the hostname from the URL
const hostname = new URL(supabaseUrl).hostname;

// Try to make a simple API request to test connectivity
const options = {
  hostname: hostname,
  port: 443,
  path: '/rest/v1/users?select=count',
  method: 'GET',
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`
  }
};

const req = https.request(options, (res) => {
  console.log(`\n📡 Status code: ${res.statusCode}`);
  
  // Handle response
  if (res.statusCode === 200) {
    console.log('✅ Connection successful! Your Supabase project is reachable.');
    console.log('\n🎉 Your configuration appears to be correct.');
  } else if (res.statusCode === 404) {
    console.log('❌ The "users" table was not found. You need to run the schema SQL script.');
    console.log('\nPlease go to the Supabase SQL Editor and run the schema.sql file.');
  } else if (res.statusCode === 401 || res.statusCode === 403) {
    console.log('❌ Authentication error! Your API key might be incorrect.');
  } else {
    console.log(`❌ Unexpected status code: ${res.statusCode}.`);
  }
  
  // Print headers for debugging
  console.log('\n📋 Response headers:');
  console.log(JSON.stringify(res.headers, null, 2));
  
  // Read response data
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (data) {
      try {
        console.log('\n📋 Response data:');
        const parsedData = JSON.parse(data);
        console.log(JSON.stringify(parsedData, null, 2));
      } catch (e) {
        console.log('Raw response:', data);
      }
    }
    
    console.log('\n===========================================');
  });
});

req.on('error', (e) => {
  console.error(`\n❌ Connection error: ${e.message}`);
  
  if (e.code === 'ENOTFOUND') {
    console.log('\nThe Supabase hostname could not be resolved.');
    console.log('1. Check your internet connection');
    console.log('2. Verify the Supabase URL is correct');
    console.log('3. Make sure your Supabase project is active');
  }
  
  console.log('\n===========================================');
});

req.end(); 