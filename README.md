# Hotel Booking System

A simple hotel booking system with React.js frontend and Python Flask backend.

## Features

### Customer Features
- View available rooms
- Book rooms with date selection
- Receive booking confirmation
- View booking details

### Employee Features
- Dashboard with statistics (total bookings, revenue, etc.)
- View all bookings
- Manage booking status (confirm, cancel)
- Real-time notifications for new bookings
- Room status map showing occupied/available rooms
- Email notifications for new bookings

## Tech Stack

**Frontend:**
- React.js 18
- React Router for navigation
- Axios for API calls
- CSS3 for styling

**Backend:**
- Python 3
- Flask web framework
- SQLite database
- Flask-CORS for cross-origin requests
- SMTP for email notifications

## Project Structure

```
hotel-booking-system-sabah/
├── backend/
│   ├── app.py              # Main Flask application
│   ├── models.py           # Database models
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # Environment variables template
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── pages/
│   │   │   ├── HomePage.js           # Room listing
│   │   │   ├── BookingPage.js        # Booking form
│   │   │   ├── ConfirmationPage.js   # Booking confirmation
│   │   │   └── EmployeeDashboard.js  # Employee portal
│   │   ├── App.js          # Main app component
│   │   └── index.js        # Entry point
│   └── package.json        # Node dependencies
└── README.md
```

## Network Configuration

This system is configured to work over **ZeroTier network** for access from other computers.

**Current ZeroTier IP:** `10.244.132.148`

### Access URLs:
- **Customer Portal:** http://10.244.132.148:3000
- **Employee Portal:** http://10.244.132.148:3000/employee
- **Backend API:** http://10.244.132.148:5000

For detailed network setup instructions, see [NETWORK-SETUP.md](NETWORK-SETUP.md)

## Installation & Setup

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (optional but recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure email notifications (optional):
```bash
cp .env.example .env
```
Edit `.env` and add your Gmail credentials:
```
EMAIL_ADDRESS=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

**Note:** For Gmail, you need to use an App Password, not your regular password.
Create one at: https://myaccount.google.com/apppasswords

5. Run the backend server:
```bash
python app.py
```

The backend will run on `http://0.0.0.0:5000` (accessible from all network interfaces)

### Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
```

2. Configure the API URL (already set to ZeroTier IP):
```bash
# The .env file is already configured with:
# REACT_APP_API_URL=http://10.244.132.148:5000/api
```

If your ZeroTier IP is different, edit `frontend/.env`:
```bash
REACT_APP_API_URL=http://YOUR_ZEROTIER_IP:5000/api
```

3. Install dependencies:
```bash
npm install
```

4. Start the development server:
```bash
npm start
```

The frontend will run on `http://0.0.0.0:3000` (accessible from all network interfaces)

## Usage

### Accessing from Another Computer

1. Ensure both computers are on the same ZeroTier network
2. From any computer on the network, access:
   - **Customer Portal:** http://10.244.132.148:3000
   - **Employee Portal:** http://10.244.132.148:3000/employee

For detailed setup instructions, see [NETWORK-SETUP.md](NETWORK-SETUP.md)

### Customer Flow
1. Visit `http://10.244.132.148:3000` (or localhost:3000 if on the same computer)
2. Browse available rooms
3. Click "Book Now" on a room
4. Fill in booking details (name, email, phone, dates)
5. Submit booking
6. View confirmation page with booking details

### Employee Flow
1. Visit `http://10.244.132.148:3000/employee` (or localhost:3000/employee if on the same computer)
2. View dashboard with statistics
3. Click "Bookings" tab to see all bookings
4. Mark bookings as read, confirm, or cancel them
5. Click "Room Status" tab to see room availability map
6. Receive notifications for new unread bookings

## Database

The system uses SQLite database (`hotel.db`) which is created automatically on first run with sample rooms:
- 2 Single rooms ($80/night)
- 2 Double rooms ($120/night)
- 2 Suite rooms ($200/night)

## API Endpoints

### Rooms
- `GET /api/rooms` - Get all rooms
- `POST /api/rooms/<id>/availability` - Check room availability

### Bookings
- `GET /api/bookings` - Get all bookings
- `GET /api/bookings/<id>` - Get booking by ID
- `POST /api/bookings` - Create new booking
- `PUT /api/bookings/<id>` - Update booking status

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/room-status` - Get current room status
- `GET /api/notifications/unread` - Get unread notification count

## Email Notifications

When a new booking is created, the system sends an email notification to the configured email address with:
- Customer details
- Room information
- Check-in/check-out dates
- Total price

## Development Notes

- The backend runs on port 5000
- The frontend runs on port 3000
- CORS is enabled for local development
- Email notifications are optional (system works without them)
- Database is initialized with sample data on first run

## Future Enhancements

- User authentication for employees
- Payment integration
- Customer account system
- Room images
- Advanced search and filters
- Booking calendar view
- Reporting and analytics

## Troubleshooting

**Database errors:**
- Delete `hotel.db` and restart the backend to reset the database

**CORS errors:**
- Ensure both frontend and backend are running
- Check that API_URL in frontend matches backend URL

**Email not sending:**
- Verify Gmail credentials in `.env`
- Ensure you're using an App Password, not regular password
- Check firewall/antivirus settings

## License

This project is created for educational purposes.
