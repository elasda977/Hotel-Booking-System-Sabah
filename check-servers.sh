#!/bin/bash

echo "================================"
echo "Hotel Booking System - Server Status Check"
echo "================================"
echo ""

# Check if backend is running
echo "1. Checking Backend (Port 5000)..."
if ss -tlnp | grep -q ":5000"; then
    echo "   ✓ Backend is RUNNING"
    ss -tlnp | grep ":5000"
else
    echo "   ✗ Backend is NOT running"
    echo "   → Start with: ./start-backend.sh"
fi
echo ""

# Check if frontend is running
echo "2. Checking Frontend (Port 3000)..."
if ss -tlnp | grep -q ":3000"; then
    echo "   ✓ Frontend is RUNNING"
    ss -tlnp | grep ":3000"
else
    echo "   ✗ Frontend is NOT running"
    echo "   → Start with: ./start-frontend.sh"
fi
echo ""

# Display network IPs
echo "3. Your Network IP Addresses:"
echo "   Local WiFi: 192.168.1.26"
echo "   Local WiFi: 192.168.1.24"
echo "   ZeroTier:   10.244.132.148"
echo ""

echo "4. Access URLs:"
if ss -tlnp | grep -q ":3000"; then
    echo "   ✓ http://192.168.1.26:3000"
    echo "   ✓ http://192.168.1.24:3000"
    echo "   ✓ http://10.244.132.148:3000"
else
    echo "   ✗ Servers not running - start them first"
fi
echo ""

# Test API if backend is running
if ss -tlnp | grep -q ":5000"; then
    echo "5. Testing Backend API..."
    curl -s http://localhost:5000/api/rooms > /dev/null && echo "   ✓ API is responding" || echo "   ✗ API not responding"
else
    echo "5. Backend not running - cannot test API"
fi

echo ""
echo "================================"
