#!/bin/bash

echo "Starting UniSync verification and build process..."

# 1. Install dependencies if needed
echo "Verifying dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
fi
if [ ! -d "backend/node_modules" ]; then
    npm install --prefix backend
fi
if [ ! -d "frontend/node_modules" ]; then
    npm install --prefix frontend
fi

# 2. Check Backend Functionalaties (Tests)
echo "Running Backend Tests..."
npm run test:backend
if [ $? -ne 0 ]; then
    echo "❌ Backend tests failed! Aborting build."
    exit 1
fi
echo "✅ Backend tests passed!"

# 3. Check Frontend Functionalities (Lint & Type Check)
echo "Running Frontend Linting..."
npm run lint:frontend
if [ $? -ne 0 ]; then
    echo "❌ Frontend linting failed! Aborting build."
    exit 1
fi
echo "✅ Frontend linting passed!"

# 4. Create Backend Build
echo "Building Backend..."
npm run build:backend
if [ $? -ne 0 ]; then
    echo "❌ Backend build failed! Aborting."
    exit 1
fi
echo "✅ Backend build created!"

# 5. Create Frontend Build
echo "Building Frontend..."
npm run build:frontend
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed! Aborting."
    exit 1
fi
echo "✅ Frontend build created!"

echo "🎉 Build successful! Everything is verified and in a working state."
