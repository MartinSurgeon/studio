// Script to test if API key is being properly included in Supabase requests
const https = require('https');
require('dotenv').config({ path: '.env.local' });

// Get values from .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('===========================================');
console.log('API Key Test');
console.log('===========================================');

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables. Check your .env.local file.');
  process.exit(1);
}

console.log('Supabase URL:', supabaseUrl);
console.log('API Key available:', !!supabaseKey);
console.log('API Key length:', supabaseKey.length);
console.log('First 10 chars:', supabaseKey.substring(0, 10));
console.log('Last 5 chars:', supabaseKey.substring(supabaseKey.length - 5));

// Create a simple request to test the API key
const hostname = new URL(supabaseUrl).hostname;
const path = '/rest/v1/users?select=count';

// Test 1: With headers
console.log('\nTest 1: With API key in headers');
const options1 = {
  hostname,
  port: 443,
  path,
  method: 'GET',
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`
  }
};

makeRequest(options1, 'Test 1');

// Test 2: Without headers 
console.log('\nTest 2: Without API key in headers (should fail)');
const options2 = {
  hostname,
  port: 443,
  path,
  method: 'GET',
  // No headers
};

makeRequest(options2, 'Test 2');

// Test 3: With API key in query parameter
console.log('\nTest 3: With API key in query parameter');
const options3 = {
  hostname,
  port: 443,
  path: `${path}&apikey=${encodeURIComponent(supabaseKey)}`,
  method: 'GET',
};

makeRequest(options3, 'Test 3');

function makeRequest(options, testName) {
  const req = https.request(options, (res) => {
    console.log(`${testName} - Status code: ${res.statusCode}`);
    
    if (res.statusCode === 200) {
      console.log(`${testName} - SUCCESS: The API key was accepted`);
    } else if (res.statusCode === 401 || res.statusCode === 403) {
      console.log(`${testName} - FAILED: Authentication error (${res.statusCode})`);
    } else {
      console.log(`${testName} - Unexpected status code: ${res.statusCode}`);
    }
    
    // Read response data
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (data) {
        try {
          const parsed = JSON.parse(data);
          console.log(`${testName} - Response:`, parsed);
        } catch (e) {
          console.log(`${testName} - Raw response:`, data.substring(0, 100));
        }
      }
      
      if (testName === 'Test 3') {
        console.log('\n===========================================');
        console.log('Tests completed. Check results above.');
        console.log('===========================================');
      }
    });
  });
  
  req.on('error', (e) => {
    console.error(`${testName} - Request error:`, e.message);
  });
  
  req.end();
} 