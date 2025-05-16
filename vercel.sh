#!/bin/bash

# This script prepares the environment for Vercel deployment

# Check Node.js version
echo "Current Node.js version: $(node -v)"

# Make sure npm is up to date
npm install -g npm@latest

# Install dependencies with legacy-peer-deps flag
npm install --legacy-peer-deps

# Create a link to the next binary
mkdir -p node_modules/.bin
ln -sf ../next/dist/bin/next node_modules/.bin/next
chmod +x node_modules/.bin/next

# Test if next command is available
if command -v next &> /dev/null; then
  echo "✅ next command is available"
else
  echo "❌ next command not found. Creating an explicit path..."
  export PATH="$PATH:$(pwd)/node_modules/.bin"
  echo "Updated PATH: $PATH"
  if command -v next &> /dev/null; then
    echo "✅ next command is now available after path update"
  else
    echo "❌ Still unable to find next command"
    echo "Checking next binary location:"
    find ./node_modules -name "next" -type f -executable
  fi
fi

# Print helpful debugging info
echo "Directory structure:"
ls -la

echo "node_modules/.bin contents:"
ls -la node_modules/.bin || echo "node_modules/.bin directory not found"

echo "Setup complete" 