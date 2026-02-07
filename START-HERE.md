# 🏨 Hotel Booking System - START HERE

Welcome! This guide will help you get started quickly.

## 🌐 Network Configuration

✅ **ZeroTier Network Configured**
- Your ZeroTier IP: **10.244.132.148**
- Interface: ztfp6i6ewq
- Ready for remote access!

## 🚀 Quick Start (5 Minutes)

### Step 1: Check Your Network IP
```bash
./get-zerotier-ip.sh
```

### Step 2: Start the Backend
```bash
./start-backend.sh
```
Or manually:
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

### Step 3: Start the Frontend (New Terminal)
```bash
./start-frontend.sh
```
Or manually:
```bash
cd frontend
npm install
npm start
```

### Step 4: Access the Application

**From this computer:**
- http://localhost:3000 (Customer Portal)
- http://localhost:3000/employee (Employee Portal)

**From another computer (on same ZeroTier network):**
- http://10.244.132.148:3000 (Customer Portal)
- http://10.244.132.148:3000/employee (Employee Portal)

## 📚 Documentation Guide

Choose the guide that fits your needs:

| Document | When to Use |
|----------|-------------|
| **QUICKSTART.md** | First time setup, basic usage |
| **SETUP-REMOTE-ACCESS.md** | Setting up access from another computer |
| **NETWORK-SETUP.md** | Detailed ZeroTier configuration |
| **README.md** | Complete system documentation |
| **NETWORK-CHANGES.md** | Technical details of network changes |

## 🎯 Common Tasks

### Access from Another Computer

1. On the other computer, install ZeroTier
2. Join the same ZeroTier network
3. Open browser to http://10.244.132.148:3000

👉 See **SETUP-REMOTE-ACCESS.md** for detailed steps

### Enable Email Notifications

1. Copy backend/.env.example to backend/.env
2. Add your Gmail credentials
3. Restart backend

👉 See **README.md** for Gmail App Password setup

### Change Network Configuration

1. Run `./get-zerotier-ip.sh` to check current IP
2. Edit `frontend/.env` if IP changed
3. Restart frontend

👉 See **NETWORK-SETUP.md** for troubleshooting

## ✨ Features

### Customer Features
- Browse available rooms
- Book rooms with date selection
- Get booking confirmation
- Automatic price calculation

### Employee Features
- Dashboard with statistics
- View all bookings
- Manage booking status
- Room availability map
- Email notifications for new bookings
- Real-time notification counter

## 🔍 Testing the System

### Quick Test - Local Access
```bash
# Visit in browser:
http://localhost:3000
# Click "Book Now" on any room
# Fill in details and complete booking
```

### Quick Test - Remote Access
```bash
# From another computer on ZeroTier network:
curl http://10.244.132.148:5000/api/rooms

# Visit in browser:
http://10.244.132.148:3000
```

## ⚡ Useful Commands

**Check ZeroTier IP:**
```bash
./get-zerotier-ip.sh
```

**Test API Connection:**
```bash
curl http://10.244.132.148:5000/api/rooms
```

**Check if Ports are Open:**
```bash
nc -zv 10.244.132.148 5000
nc -zv 10.244.132.148 3000
```

**View Backend Logs:**
Backend logs appear in the terminal where you ran `python app.py`

**Reset Database:**
```bash
rm backend/hotel.db
# Restart backend to create fresh database with sample data
```

## 🛠 Troubleshooting

### Backend won't start
- Check if Python is installed: `python --version`
- Check if virtual environment is activated
- Check for port 5000 in use: `lsof -i :5000`

### Frontend won't start
- Check if Node.js is installed: `node --version`
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`
- Check for port 3000 in use: `lsof -i :3000`

### Can't access from another computer
- Check both computers are on same ZeroTier network
- Check firewall: `sudo ufw allow 3000 && sudo ufw allow 5000`
- Ping the server: `ping 10.244.132.148`

👉 See **SETUP-REMOTE-ACCESS.md** for detailed troubleshooting

## 📁 Project Structure

```
hotel-booking-system-sabah/
├── backend/              # Python Flask backend
│   ├── app.py           # Main API server
│   ├── models.py        # Database models
│   └── requirements.txt # Python dependencies
├── frontend/            # React.js frontend
│   ├── src/
│   │   ├── pages/      # React pages
│   │   └── App.js      # Main app component
│   ├── .env            # Network configuration
│   └── package.json    # Node dependencies
└── Documentation files
```

## 🎓 Learning Path

**Beginner (Just want to use it):**
1. Read this file (START-HERE.md)
2. Follow Quick Start above
3. Refer to QUICKSTART.md if needed

**Intermediate (Setting up remote access):**
1. Read SETUP-REMOTE-ACCESS.md
2. Configure ZeroTier on client computer
3. Test access from client

**Advanced (Understanding the system):**
1. Read README.md for full documentation
2. Read NETWORK-SETUP.md for network details
3. Read NETWORK-CHANGES.md for technical details

## 🔐 Default Sample Data

The system includes 6 sample rooms:
- **Single (101, 102):** $80/night, 1 person
- **Double (201, 202):** $120/night, 2 people
- **Suite (301, 302):** $200/night, 4 people

## 📞 Need Help?

1. **Check Documentation:**
   - QUICKSTART.md - Basic setup
   - SETUP-REMOTE-ACCESS.md - Remote access setup
   - NETWORK-SETUP.md - Network troubleshooting
   - README.md - Complete documentation

2. **Run Diagnostic:**
   ```bash
   ./get-zerotier-ip.sh
   ```

3. **Test Connection:**
   ```bash
   curl http://10.244.132.148:5000/api/rooms
   ```

## ⚠️ Important Notes

- Backend runs on port **5000**
- Frontend runs on port **3000**
- Database file: `backend/hotel.db`
- ZeroTier IP: **10.244.132.148** (may change)
- Email notifications are **optional**

## 🎉 Ready to Go!

Start the system and test it:

```bash
# Terminal 1
./start-backend.sh

# Terminal 2 (new terminal)
./start-frontend.sh

# Then visit:
# http://localhost:3000 (local)
# http://10.244.132.148:3000 (remote)
```

---

**Questions?** Check the documentation files listed above or the README.md file.

**Ready to deploy to production?** Consider adding HTTPS, authentication, and proper database backup.
