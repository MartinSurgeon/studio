#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const envFilePath = path.join(process.cwd(), '.env.local');

console.log('\n===== Trakzy Supabase Setup =====\n');
console.log('This script will help you set up your Supabase environment variables.');
console.log('Please get your Supabase URL and anonymous key from your Supabase dashboard.');
console.log('You can find these under Settings > API in your project.\n');

// Promisify the question function
function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function setupEnv() {
  try {
    // Check if .env.local already exists
    let envContent = '';
    
    if (fs.existsSync(envFilePath)) {
      envContent = fs.readFileSync(envFilePath, 'utf8');
      console.log('Found existing .env.local file. Will update Supabase variables.');
    }
    
    // Get Supabase URL
    const supabaseUrl = await question('Supabase URL: ');
    if (!supabaseUrl) {
      throw new Error('Supabase URL is required');
    }
    
    // Get Supabase Anon Key
    const supabaseAnonKey = await question('Supabase Anon Key: ');
    if (!supabaseAnonKey) {
      throw new Error('Supabase Anon Key is required');
    }
    
    // Update or add variables
    const envLines = envContent.split('\n');
    const newEnvLines = [];
    
    let hasSupabaseUrl = false;
    let hasSupabaseAnonKey = false;
    
    // Update existing variables
    for (const line of envLines) {
      if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
        newEnvLines.push(`NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}`);
        hasSupabaseUrl = true;
      } else if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
        newEnvLines.push(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey}`);
        hasSupabaseAnonKey = true;
      } else if (line.trim() !== '') {
        // Keep other environment variables, except Firebase ones
        if (!line.startsWith('NEXT_PUBLIC_FIREBASE_')) {
          newEnvLines.push(line);
        }
      }
    }
    
    // Add variables if they don't exist yet
    if (!hasSupabaseUrl) {
      newEnvLines.push(`NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}`);
    }
    
    if (!hasSupabaseAnonKey) {
      newEnvLines.push(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey}`);
    }
    
    // Write new .env.local file
    fs.writeFileSync(envFilePath, newEnvLines.join('\n'));
    
    console.log('\n✅ Supabase environment variables have been successfully set up!');
    console.log('\nNext steps:');
    console.log('1. Make sure you\'ve created the required tables in your Supabase project');
    console.log('   You can run the SQL from src/lib/schema.sql in the Supabase SQL Editor');
    console.log('2. Start your Next.js development server: npm run dev:alt\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('Please try again.');
  } finally {
    rl.close();
  }
}

setupEnv(); 