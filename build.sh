#!/bin/bash
# Make sure the script uses bash

# Print environment information for debugging
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "Current directory: $(pwd)"
echo "Directory contents: $(ls -la)"
echo "NODE_PATH: $NODE_PATH"

# Ensure node_modules/.bin is in PATH
export PATH="$PATH:$(pwd)/node_modules/.bin"
echo "Updated PATH: $PATH"

# Run the build command using npx
npx next build 