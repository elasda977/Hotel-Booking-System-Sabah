# Remote Access Setup - Complete Guide

This guide will help you set up the hotel booking system for access from another computer using ZeroTier.

## Current Configuration

✅ **ZeroTier Detected**
- Interface: `ztfp6i6ewq`
- IP Address: `10.244.132.148`
- Backend configured to listen on all interfaces (`0.0.0.0:5000`)
- Frontend configured with ZeroTier API URL

## Step-by-Step Setup

### On the Server Computer (This Computer)

#### 1. Check Your ZeroTier IP

Run this command anytime to check your current ZeroTier IP:

```bash
./get-zerotier-ip.sh
```

#### 2. Get Your ZeroTier Network ID

You'll need this to connect other computers:

```bash
# If you have sudo access:
sudo zerotier-cli listnetworks

# Alternative: Check the interface name
ip addr show ztfp6i6ewq
```

Save the Network ID (format: 16 hexadecimal characters like `a0cbf4b62a1234ab`)

#### 3. Start the Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

You should see:
```
* Running on http://0.0.0.0:5000
```

#### 4. Start the Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm start
```

The app will be available at http://10.244.132.148:3000

### On the Client Computer (Remote Access)

#### 1. Install ZeroTier

**Ubuntu/Debian Linux:**
```bash
curl -s https://install.zerotier.com | sudo bash
```

**Windows:**
1. Download from https://www.zerotier.com/download/
2. Run the installer
3. Follow the installation wizard

**macOS:**
```bash
brew install zerotier-one
```

Or download from https://www.zerotier.com/download/

#### 2. Join the ZeroTier Network

```bash
sudo zerotier-cli join <NETWORK_ID>
```

Replace `<NETWORK_ID>` with the network ID from step 2 above.

#### 3. Authorize the Device

**Option A: Using ZeroTier Central (Recommended)**
1. Go to https://my.zerotier.com/
2. Log in to your ZeroTier account
3. Click on your network
4. Find the new device in the "Members" section
5. Check the "Auth" checkbox to authorize it

**Option B: Command Line (if you have access)**
```bash
sudo zerotier-cli set <NETWORK_ID> <DEVICE_ID> authorized=true
```

#### 4. Verify Connection

Check if you can ping the server:

```bash
ping 10.244.132.148
```

Test the backend API:

```bash
curl http://10.244.132.148:5000/api/rooms
```

#### 5. Access the Application

Open a web browser on the client computer:

- **Customer Booking:** http://10.244.132.148:3000
- **Employee Portal:** http://10.244.132.148:3000/employee

## Troubleshooting

### Cannot Connect to Server

**1. Check ZeroTier connection on both computers:**

Server:
```bash
ip addr show ztfp6i6ewq
```

Client:
```bash
zerotier-cli peers
zerotier-cli listnetworks
```

**2. Verify firewall settings on server:**

```bash
# Allow ports 3000 and 5000
sudo ufw allow 3000/tcp
sudo ufw allow 5000/tcp

# Or allow all traffic on ZeroTier interface
sudo ufw allow in on ztfp6i6ewq
```

**3. Test connectivity:**

From client computer:
```bash
# Test if ports are reachable
nc -zv 10.244.132.148 5000
nc -zv 10.244.132.148 3000

# Test HTTP connection
curl -v http://10.244.132.148:5000/api/rooms
```

### Frontend Cannot Reach Backend

**1. Check if .env file exists:**
```bash
cat frontend/.env
```

Should contain:
```
REACT_APP_API_URL=http://10.244.132.148:5000/api
```

**2. Restart frontend after any .env changes:**
```bash
cd frontend
npm start
```

**3. Check browser console:**
- Press F12 in your browser
- Check Console tab for errors
- Check Network tab to see API requests

### ZeroTier IP Changed

If your ZeroTier IP address changes:

**1. Get new IP:**
```bash
./get-zerotier-ip.sh
```

**2. Update frontend/.env:**
```bash
nano frontend/.env
# Change to: REACT_APP_API_URL=http://NEW_IP:5000/api
```

**3. Restart frontend:**
```bash
cd frontend
npm start
```

## Alternative: Local Network Access

If you don't want to use ZeroTier and both computers are on the same WiFi/LAN:

**1. Get your local IP address:**
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

**2. Update frontend/.env:**
```
REACT_APP_API_URL=http://YOUR_LOCAL_IP:5000/api
```

**3. Access from other computer:**
```
http://YOUR_LOCAL_IP:3000
```

## Security Checklist

- [ ] ZeroTier network is set to **Private** (not Public)
- [ ] Only authorized devices are connected
- [ ] Firewall only allows necessary ports (3000, 5000)
- [ ] Email credentials are in `.env` file (not committed to git)
- [ ] Consider adding authentication for employee portal in production

## Testing Checklist

- [ ] Backend starts without errors
- [ ] Frontend starts and loads
- [ ] Can access from server computer (localhost:3000)
- [ ] Can ping server from client computer
- [ ] Can curl backend API from client
- [ ] Can access frontend from client browser
- [ ] Can create a booking from client
- [ ] Employee portal works from client
- [ ] Email notifications work (if configured)

## Quick Reference

**Check ZeroTier IP:**
```bash
./get-zerotier-ip.sh
```

**Start Backend:**
```bash
cd backend && python app.py
```

**Start Frontend:**
```bash
cd frontend && npm start
```

**Test API from Client:**
```bash
curl http://10.244.132.148:5000/api/rooms
```

**View Backend Logs:**
The Flask server will show all API requests in the terminal

**View Frontend Logs:**
Check the browser console (F12)

## Need Help?

1. Check [NETWORK-SETUP.md](NETWORK-SETUP.md) for detailed network configuration
2. Check [README.md](README.md) for general system documentation
3. Check [QUICKSTART.md](QUICKSTART.md) for quick setup guide

## Architecture Diagram

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │         │                  │         │                 │
│  Client         │◄───────►│  ZeroTier Cloud  │◄───────►│  Server         │
│  Computer       │         │  (VPN Tunnel)    │         │  Computer       │
│                 │         │                  │         │                 │
│  Web Browser    │         │  10.244.x.x/16   │         │  Backend :5000  │
│  :3000          │         │                  │         │  Frontend :3000 │
│                 │         │                  │         │  Database       │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```
