#!/bin/bash

echo "Starting Hotel Booking System Frontend..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "Starting React development server on all network interfaces..."
HOST=0.0.0.0 npm start
