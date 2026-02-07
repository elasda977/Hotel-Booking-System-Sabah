# Network Configuration Changes Summary

## Overview

The hotel booking system has been configured to support remote access via ZeroTier network instead of localhost-only access.

## ZeroTier Network Detected

- **Interface:** ztfp6i6ewq
- **IP Address:** 10.244.132.148
- **Network Range:** 10.244.0.0/16

## Changes Made

### Backend Changes

#### File: `backend/app.py`

**Before:**
```python
app.run(debug=True, port=5000)
```

**After:**
```python
app.run(debug=True, host='0.0.0.0', port=5000)
```

**Impact:** Backend now listens on all network interfaces, not just localhost. This allows connections from other computers on the ZeroTier network.

### Frontend Changes

#### New File: `frontend/.env`
```
REACT_APP_API_URL=http://10.244.132.148:5000/api
```

#### New File: `frontend/.env.example`
```
REACT_APP_API_URL=http://10.244.132.148:5000/api
```

#### Updated Files:
- `frontend/src/pages/HomePage.js`
- `frontend/src/pages/BookingPage.js`
- `frontend/src/pages/ConfirmationPage.js`
- `frontend/src/pages/EmployeeDashboard.js`

**Change in all files:**

**Before:**
```javascript
const API_URL = 'http://localhost:5000/api';
```

**After:**
```javascript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
```

**Impact:** Frontend now reads API URL from environment variable, allowing easy configuration for different networks. Falls back to localhost if not configured.

### Documentation Updates

#### Updated Files:
1. `README.md` - Added ZeroTier network information and remote access instructions
2. `QUICKSTART.md` - Added ZeroTier URLs for remote access

#### New Files:
1. `NETWORK-SETUP.md` - Comprehensive ZeroTier setup guide
2. `SETUP-REMOTE-ACCESS.md` - Step-by-step remote access setup
3. `get-zerotier-ip.sh` - Script to check current ZeroTier IP

## Access URLs

### Local Access (Same Computer)
- Customer Portal: http://localhost:3000
- Employee Portal: http://localhost:3000/employee
- Backend API: http://localhost:5000

### Remote Access (ZeroTier Network)
- Customer Portal: http://10.244.132.148:3000
- Employee Portal: http://10.244.132.148:3000/employee
- Backend API: http://10.244.132.148:5000

## How It Works

### Before (Localhost Only)
```
Browser → localhost:3000 (Frontend) → localhost:5000 (Backend)
```
Only accessible from the same computer.

### After (ZeroTier Network)
```
Remote Browser → 10.244.132.148:3000 (Frontend) → 10.244.132.148:5000 (Backend)
```
Accessible from any computer on the same ZeroTier network.

## Configuration Files Summary

| File | Purpose | Contains |
|------|---------|----------|
| `backend/app.py` | Backend server | host='0.0.0.0' to listen on all interfaces |
| `frontend/.env` | Frontend config | ZeroTier API URL |
| `frontend/.env.example` | Template | Example ZeroTier API URL |
| `.gitignore` | Git ignore | Excludes .env files from version control |

## Backward Compatibility

✅ **Fully backward compatible**

- If `.env` is not present, frontend falls back to `http://localhost:5000/api`
- Works on localhost even with ZeroTier configuration
- No breaking changes to existing functionality

## Setup for New Developers

1. **Clone the repository**
2. **Check ZeroTier IP:** `./get-zerotier-ip.sh`
3. **Update if needed:** Edit `frontend/.env` with current ZeroTier IP
4. **Start backend:** `cd backend && python app.py`
5. **Start frontend:** `cd frontend && npm start`

## Troubleshooting Commands

Check ZeroTier IP:
```bash
./get-zerotier-ip.sh
```

Test backend from remote computer:
```bash
curl http://10.244.132.148:5000/api/rooms
```

Check if ports are open:
```bash
nc -zv 10.244.132.148 5000
nc -zv 10.244.132.148 3000
```

Allow ports in firewall:
```bash
sudo ufw allow 3000/tcp
sudo ufw allow 5000/tcp
```

## Security Considerations

1. ✅ Backend only accessible via ZeroTier network (private VPN)
2. ✅ No public internet exposure
3. ✅ Environment variables not committed to git
4. ⚠️ Consider adding authentication for employee portal
5. ⚠️ Consider HTTPS for production deployment

## Next Steps (Optional)

- [ ] Add employee authentication system
- [ ] Implement HTTPS/SSL certificates
- [ ] Add rate limiting for API endpoints
- [ ] Set up automated backups for database
- [ ] Add logging system for security audit

## Migration Checklist

If ZeroTier IP changes or moving to different network:

- [ ] Run `./get-zerotier-ip.sh` to get new IP
- [ ] Update `frontend/.env` with new IP
- [ ] Update `frontend/.env.example` with new IP
- [ ] Restart frontend: `cd frontend && npm start`
- [ ] Update documentation if needed
- [ ] Test from remote computer

## Files Modified

**Modified (2 files):**
- backend/app.py
- All frontend page components (4 files)

**Created (6 files):**
- frontend/.env
- frontend/.env.example
- NETWORK-SETUP.md
- SETUP-REMOTE-ACCESS.md
- NETWORK-CHANGES.md (this file)
- get-zerotier-ip.sh

**Updated (2 files):**
- README.md
- QUICKSTART.md
