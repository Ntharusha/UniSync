#!/bin/bash

echo "Starting UniSync Cleanup & Launch..."

# Kill existing processes on ports 3001 (backend) and 5173 (frontend)
echo "Freeing up ports 3001 and 5173..."
fuser -k 3001/tcp 2>/dev/null
fuser -k 5173/tcp 2>/dev/null

# Install dependencies if node_modules don't exist
if [ ! -d "node_modules" ]; then
    echo "Installing root dependencies..."
    npm install
fi

if [ ! -d "backend/node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install --prefix backend
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install --prefix frontend
fi

# Run the project
echo "Launching UniSync..."
npm start
