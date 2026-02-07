# Quick Start Guide

## Option 1: Using Startup Scripts (Linux/Mac)

### Terminal 1 - Backend
```bash
./start-backend.sh
```

### Terminal 2 - Frontend
```bash
./start-frontend.sh
```

## Option 2: Manual Setup

### Terminal 1 - Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### Terminal 2 - Frontend
```bash
cd frontend
npm install
npm start
```

## Access the Application

### From the Same Computer (Local Access):
- **Customer Portal:** http://localhost:3000
- **Employee Portal:** http://localhost:3000/employee
- **Backend API:** http://localhost:5000

### From Another Computer (ZeroTier Network Access):
- **Customer Portal:** http://10.244.132.148:3000
- **Employee Portal:** http://10.244.132.148:3000/employee
- **Backend API:** http://10.244.132.148:5000

**Note:** For access from another computer, both devices must be on the same ZeroTier network.
See [NETWORK-SETUP.md](NETWORK-SETUP.md) for detailed setup instructions.

## Default Sample Data

The system includes 6 sample rooms:
- Single rooms: 101, 102 ($80/night)
- Double rooms: 201, 202 ($120/night)
- Suite rooms: 301, 302 ($200/night)

## Email Notifications (Optional)

To enable email notifications:

1. Create `.env` file in backend directory:
```bash
cd backend
cp .env.example .env
```

2. Edit `.env` with your Gmail credentials:
```
EMAIL_ADDRESS=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

3. Get Gmail App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Generate new app password
   - Use this password in `.env` file

## Testing the System

### Customer Flow:
1. Go to http://10.244.132.148:3000 (or http://localhost:3000 if on server)
2. Click "Book Now" on any room
3. Fill in booking details
4. Submit and see confirmation

### Employee Flow:
1. Go to http://10.244.132.148:3000/employee (or http://localhost:3000/employee if on server)
2. View Dashboard statistics
3. Check Bookings tab to manage orders
4. View Room Status map

## Troubleshooting

**Port already in use:**
- Backend: Change port in `backend/app.py` (last line)
- Frontend: Set PORT=3001 in frontend/.env

**Module not found:**
- Backend: Make sure virtual environment is activated
- Frontend: Delete node_modules and run `npm install` again

**Database issues:**
- Delete `backend/hotel.db` to reset database
