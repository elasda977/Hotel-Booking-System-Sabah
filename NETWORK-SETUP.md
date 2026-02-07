# Network Setup Guide - ZeroTier Configuration

This guide explains how to access the hotel booking system from another computer using ZeroTier.

## Current Configuration

**ZeroTier IP Address:** `10.244.132.148`
**Backend Port:** `5000`
**Frontend Port:** `3000`

## What is ZeroTier?

ZeroTier creates a virtual private network (VPN) that allows devices to connect as if they were on the same local network, even if they're on different networks or across the internet.

## Setup Instructions

### On the Server Computer (Current Computer)

1. **ZeroTier is already installed and running**
   - Network Interface: `ztfp6i6ewq`
   - IP Address: `10.244.132.148`

2. **Start the Backend Server:**
   ```bash
   cd backend
   python app.py
   ```
   The backend will listen on `0.0.0.0:5000` (all network interfaces)

3. **Start the Frontend Server:**
   ```bash
   cd frontend
   npm start
   ```
   The frontend will run on port `3000`

4. **Get your ZeroTier Network ID:**
   ```bash
   sudo zerotier-cli listnetworks
   ```
   Save this Network ID - you'll need it for other computers.

### On the Client Computer (Another Computer)

1. **Install ZeroTier:**
   - **Linux:**
     ```bash
     curl -s https://install.zerotier.com | sudo bash
     ```

   - **Windows:**
     Download from: https://www.zerotier.com/download/

   - **macOS:**
     ```bash
     brew install zerotier-one
     ```

2. **Join the same ZeroTier network:**
   ```bash
   sudo zerotier-cli join <NETWORK_ID>
   ```
   Replace `<NETWORK_ID>` with the network ID from the server computer.

3. **Authorize the device:**
   - Go to https://my.zerotier.com/
   - Login to your ZeroTier account
   - Find your network
   - Authorize the new device

4. **Access the Hotel Booking System:**
   - **Customer Portal:** http://10.244.132.148:3000
   - **Employee Portal:** http://10.244.132.148:3000/employee
   - **Backend API:** http://10.244.132.148:5000

## Frontend Configuration

The frontend is configured to use the ZeroTier IP address automatically via environment variables.

**Configuration File:** `frontend/.env`
```
REACT_APP_API_URL=http://10.244.132.148:5000/api
```

## Troubleshooting

### Cannot Connect to Backend

1. **Check if backend is running:**
   ```bash
   curl http://10.244.132.148:5000/api/rooms
   ```

2. **Check firewall settings:**
   ```bash
   sudo ufw status
   sudo ufw allow 5000
   sudo ufw allow 3000
   ```

3. **Verify ZeroTier connection:**
   ```bash
   zerotier-cli peers
   ping 10.244.132.148
   ```

### Frontend Cannot Reach Backend

1. **Check .env file exists:**
   ```bash
   cat frontend/.env
   ```

2. **Restart frontend after .env changes:**
   ```bash
   cd frontend
   npm start
   ```

3. **Check browser console for API errors**

### ZeroTier IP Changed

If your ZeroTier IP address changes, update these files:

1. **Frontend environment:**
   ```bash
   # Edit frontend/.env
   REACT_APP_API_URL=http://NEW_ZEROTIER_IP:5000/api
   ```

2. **Restart frontend:**
   ```bash
   cd frontend
   npm start
   ```

## Alternative: Using Local Network IP

If ZeroTier is not available, you can use your local network IP:

1. **Get local IP address:**
   ```bash
   ip addr show | grep "inet " | grep -v 127.0.0.1
   ```

2. **Update frontend/.env:**
   ```
   REACT_APP_API_URL=http://YOUR_LOCAL_IP:5000/api
   ```

3. **Both computers must be on the same WiFi/LAN network**

## Security Considerations

1. **ZeroTier Network:** Make sure your ZeroTier network is set to Private
2. **Firewall:** Only open ports 3000 and 5000 for ZeroTier interface
3. **Authentication:** Consider adding employee login for production use
4. **HTTPS:** For production, use SSL/TLS certificates

## Checking Current ZeroTier IP

To verify your current ZeroTier IP address:

```bash
ip addr show ztfp6i6ewq | grep "inet "
```

Or:

```bash
sudo zerotier-cli listnetworks
```

## Network Architecture

```
Client Computer                    ZeroTier Network                Server Computer
---------------                    ----------------                ---------------
Web Browser  ------>  ZeroTier  ------>  ZeroTier  ------>  Frontend (Port 3000)
                     (VPN Tunnel)                                     |
                                                                      |
                                                              Backend (Port 5000)
                                                                      |
                                                              SQLite Database
```

## Port Summary

| Service  | Port | Access URL                          |
|----------|------|-------------------------------------|
| Frontend | 3000 | http://10.244.132.148:3000          |
| Backend  | 5000 | http://10.244.132.148:5000          |
| API      | 5000 | http://10.244.132.148:5000/api      |

## Quick Test

From any computer on the ZeroTier network:

```bash
# Test backend
curl http://10.244.132.148:5000/api/rooms

# Test if ports are open
nc -zv 10.244.132.148 5000
nc -zv 10.244.132.148 3000
```
