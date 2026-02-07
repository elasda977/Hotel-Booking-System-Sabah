#!/bin/bash

echo "=== ZeroTier Network Information ==="
echo ""

# Check if ZeroTier is installed
if ! command -v zerotier-cli &> /dev/null; then
    echo "ZeroTier is not installed!"
    exit 1
fi

# Get ZeroTier interface
ZT_INTERFACE=$(ip link show | grep '^[0-9]*: zt' | awk -F': ' '{print $2}')

if [ -z "$ZT_INTERFACE" ]; then
    echo "No ZeroTier network interface found!"
    echo "Make sure you're connected to a ZeroTier network."
    exit 1
fi

# Get IP address
ZT_IP=$(ip addr show $ZT_INTERFACE | grep "inet " | awk '{print $2}' | cut -d'/' -f1)

echo "ZeroTier Interface: $ZT_INTERFACE"
echo "ZeroTier IP Address: $ZT_IP"
echo ""
echo "=== Access URLs ==="
echo "Customer Portal: http://$ZT_IP:3000"
echo "Employee Portal: http://$ZT_IP:3000/employee"
echo "Backend API: http://$ZT_IP:5000"
echo ""
echo "=== Update Configuration ==="
echo "If the IP address has changed, update frontend/.env with:"
echo "REACT_APP_API_URL=http://$ZT_IP:5000/api"
