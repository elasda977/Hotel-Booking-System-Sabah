from flask import Flask, request, jsonify
from flask_cors import CORS
from models import db, Room, Booking, Agent, RoomMaintenance
from datetime import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///hotel.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'uploads/receipts'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}
CORS(app)

# Create upload folder if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

db.init_app(app)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def send_email_notification(booking):
    try:
        email = os.getenv('EMAIL_ADDRESS', 'your-email@gmail.com')
        password = os.getenv('EMAIL_PASSWORD', 'your-password')

        # Skip email if credentials are not properly configured
        if email == 'your-email@gmail.com' or password == 'your-password':
            print("Email notification skipped - credentials not configured")
            return

        msg = MIMEMultipart()
        msg['From'] = email
        msg['To'] = email
        msg['Subject'] = f'New Booking - {booking.customer_name}'

        body = f"""
        New booking received:

        Customer: {booking.customer_name}
        Email: {booking.customer_email}
        Phone: {booking.customer_phone}
        Room: {booking.room.room_number} ({booking.room.room_type})
        Check-in: {booking.check_in}
        Check-out: {booking.check_out}
        Total: RM{booking.total_price}
        """

        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP('smtp.gmail.com', 587, timeout=5)
        server.starttls()
        server.login(email, password)
        server.send_message(msg)
        server.quit()
        print("Email sent successfully")
    except Exception as e:
        print(f"Failed to send email: {e}")

def send_confirmation_email(booking):
    """Send confirmation email to customer when booking is approved"""
    try:
        email = os.getenv('EMAIL_ADDRESS', 'your-email@gmail.com')
        password = os.getenv('EMAIL_PASSWORD', 'your-password')

        # Skip email if credentials are not properly configured
        if email == 'your-email@gmail.com' or password == 'your-password':
            print("Confirmation email skipped - credentials not configured")
            return

        msg = MIMEMultipart()
        msg['From'] = email
        msg['To'] = booking.customer_email
        msg['Subject'] = f'Booking Confirmed - {booking.room.room_type}'

        body = f"""
        Dear {booking.customer_name},

        Your booking has been confirmed!

        Booking Details:
        Booking ID: {booking.id}
        Room: {booking.room.room_number} ({booking.room.room_type})
        Check-in: {booking.check_in}
        Check-out: {booking.check_out}
        Total Amount: RM{booking.total_price}

        Thank you for choosing our hotel. We look forward to welcoming you!

        Best regards,
        Hotel Management
        """

        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP('smtp.gmail.com', 587, timeout=5)
        server.starttls()
        server.login(email, password)
        server.send_message(msg)
        server.quit()
        print("Confirmation email sent successfully")
    except Exception as e:
        print(f"Failed to send confirmation email: {e}")

@app.route('/api/rooms', methods=['GET'])
def get_rooms():
    rooms = Room.query.all()
    return jsonify([room.to_dict() for room in rooms])

@app.route('/api/rooms/available', methods=['GET'])
def get_available_rooms():
    check_in_str = request.args.get('check_in')
    check_out_str = request.args.get('check_out')
    capacity = request.args.get('capacity', type=int)

    # If no dates provided, return all rooms (optionally filtered by capacity)
    if not check_in_str or not check_out_str:
        query = Room.query
        if capacity:
            query = query.filter(Room.capacity >= capacity)
        all_rooms = query.all()
        return jsonify([room.to_dict() for room in all_rooms])

    try:
        check_in = datetime.strptime(check_in_str, '%Y-%m-%d').date()
        check_out = datetime.strptime(check_out_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

    if check_in >= check_out:
        return jsonify({'error': 'Check-out date must be after check-in date'}), 400

    # Start with all rooms that meet capacity requirement
    query = Room.query
    if capacity:
        query = query.filter(Room.capacity >= capacity)

    all_rooms = query.all()

    # Check availability for each room but return ALL rooms with availability info
    available_rooms = []
    for room in all_rooms:
        conflicting_bookings = Booking.query.filter(
            Booking.room_id == room.id,
            Booking.status != 'cancelled',
            Booking.check_in < check_out,
            Booking.check_out > check_in
        ).first()

        # Include room only if it's available for the selected dates
        if not conflicting_bookings:
            available_rooms.append(room)

    return jsonify([room.to_dict() for room in available_rooms])

@app.route('/api/rooms/<int:room_id>/availability', methods=['POST'])
def check_availability(room_id):
    data = request.json
    check_in = datetime.strptime(data['check_in'], '%Y-%m-%d').date()
    check_out = datetime.strptime(data['check_out'], '%Y-%m-%d').date()

    conflicting_bookings = Booking.query.filter(
        Booking.room_id == room_id,
        Booking.status != 'cancelled',
        Booking.check_in < check_out,
        Booking.check_out > check_in
    ).all()

    return jsonify({'available': len(conflicting_bookings) == 0})

@app.route('/api/bookings', methods=['POST'])
def create_booking():
    data = request.json

    check_in = datetime.strptime(data['check_in'], '%Y-%m-%d').date()
    check_out = datetime.strptime(data['check_out'], '%Y-%m-%d').date()

    # Handle booking by room type (auto-assignment)
    if 'room_type' in data and 'room_id' not in data:
        room_type = data['room_type']

        # Find all rooms of this type
        rooms_of_type = Room.query.filter_by(room_type=room_type).all()

        if not rooms_of_type:
            return jsonify({'error': 'Room type not found'}), 404

        # Find first available room of this type
        available_room = None
        for room in rooms_of_type:
            # Skip rooms in maintenance status
            if room.maintenance_status == 'maintenance' or room.maintenance_status == 'closed':
                continue

            # Check for conflicting maintenance records
            conflicting_maintenance = RoomMaintenance.query.filter(
                RoomMaintenance.room_id == room.id,
                RoomMaintenance.status == 'ongoing',
                RoomMaintenance.start_date < check_out,
                db.or_(
                    RoomMaintenance.end_date.is_(None),
                    RoomMaintenance.end_date > check_in
                )
            ).first()

            if conflicting_maintenance:
                continue

            conflicting_bookings = Booking.query.filter(
                Booking.room_id == room.id,
                Booking.status != 'cancelled',
                Booking.check_in < check_out,
                Booking.check_out > check_in
            ).first()

            if not conflicting_bookings:
                available_room = room
                break

        if not available_room:
            return jsonify({'error': 'No rooms of this type available for selected dates'}), 400

        room_id = available_room.id
    else:
        # Handle booking by specific room ID (legacy)
        room_id = data.get('room_id')

        if not room_id:
            return jsonify({'error': 'Either room_id or room_type is required'}), 400

        # Check if room is in maintenance
        room = Room.query.get(room_id)
        if not room:
            return jsonify({'error': 'Room not found'}), 404

        if room.maintenance_status == 'maintenance' or room.maintenance_status == 'closed':
            return jsonify({'error': 'Room is currently in maintenance and cannot be booked'}), 400

        # Check for conflicting maintenance records
        conflicting_maintenance = RoomMaintenance.query.filter(
            RoomMaintenance.room_id == room_id,
            RoomMaintenance.status == 'ongoing',
            RoomMaintenance.start_date < check_out,
            db.or_(
                RoomMaintenance.end_date.is_(None),
                RoomMaintenance.end_date > check_in
            )
        ).first()

        if conflicting_maintenance:
            return jsonify({'error': 'Room has scheduled maintenance during selected dates'}), 400

        conflicting_bookings = Booking.query.filter(
            Booking.room_id == room_id,
            Booking.status != 'cancelled',
            Booking.check_in < check_out,
            Booking.check_out > check_in
        ).all()

        if conflicting_bookings:
            return jsonify({'error': 'Room not available for selected dates'}), 400

    booking = Booking(
        room_id=room_id,
        customer_name=data['customer_name'],
        customer_email=data['customer_email'],
        customer_phone=data['customer_phone'],
        check_in=check_in,
        check_out=check_out,
        total_price=data['total_price'],
        status='pending',  # Changed from 'confirmed' to 'pending'
        agent_id=data.get('agent_id')  # Optional agent ID for agent bookings
    )

    db.session.add(booking)
    db.session.commit()

    send_email_notification(booking)

    return jsonify(booking.to_dict()), 201

@app.route('/api/bookings', methods=['GET'])
def get_bookings():
    bookings = Booking.query.order_by(Booking.created_at.desc()).all()
    return jsonify([booking.to_dict() for booking in bookings])

@app.route('/api/bookings/<int:booking_id>', methods=['GET'])
def get_booking(booking_id):
    booking = Booking.query.get_or_404(booking_id)
    return jsonify(booking.to_dict())

@app.route('/api/bookings/<int:booking_id>', methods=['PUT'])
def update_booking(booking_id):
    booking = Booking.query.get_or_404(booking_id)
    data = request.json

    old_status = booking.status

    # Allow changing room_id when approving (admin assigns specific room)
    if 'room_id' in data:
        new_room = Room.query.get(data['room_id'])
        if not new_room:
            return jsonify({'error': 'Room not found'}), 404

        # Verify room is same type as original booking
        current_room = Room.query.get(booking.room_id)
        if new_room.room_type != current_room.room_type:
            return jsonify({'error': 'Can only assign room of same type'}), 400

        # Check room is available for the booking dates
        conflicting = Booking.query.filter(
            Booking.room_id == new_room.id,
            Booking.id != booking_id,
            Booking.status != 'cancelled',
            Booking.check_in < booking.check_out,
            Booking.check_out > booking.check_in
        ).first()

        if conflicting:
            return jsonify({'error': 'Selected room is not available for these dates'}), 400

        # Check maintenance status
        if new_room.maintenance_status in ['maintenance', 'closed']:
            return jsonify({'error': 'Selected room is under maintenance'}), 400

        booking.room_id = new_room.id

    if 'status' in data:
        booking.status = data['status']
    if 'read_by_employee' in data:
        booking.read_by_employee = data['read_by_employee']
    if 'receipt_url' in data:
        booking.receipt_url = data['receipt_url']

    db.session.commit()

    # Send confirmation email if status changed to confirmed
    if old_status != 'confirmed' and booking.status == 'confirmed':
        send_confirmation_email(booking)

    return jsonify(booking.to_dict())

@app.route('/api/bookings/<int:booking_id>/available-rooms', methods=['GET'])
def get_available_rooms_for_booking(booking_id):
    """Get available rooms of same type for a booking's dates"""
    booking = Booking.query.get_or_404(booking_id)
    current_room = Room.query.get(booking.room_id)

    # Find all rooms of same type
    rooms_of_type = Room.query.filter_by(room_type=current_room.room_type).all()

    available_rooms = []
    for room in rooms_of_type:
        # Skip rooms in maintenance
        if room.maintenance_status in ['maintenance', 'closed']:
            continue

        # Check for conflicting bookings (excluding current booking)
        conflicting = Booking.query.filter(
            Booking.room_id == room.id,
            Booking.id != booking_id,
            Booking.status != 'cancelled',
            Booking.check_in < booking.check_out,
            Booking.check_out > booking.check_in
        ).first()

        if not conflicting:
            room_dict = room.to_dict()
            room_dict['is_current'] = (room.id == booking.room_id)
            available_rooms.append(room_dict)

    return jsonify(available_rooms)

@app.route('/api/notifications/unread', methods=['GET'])
def get_unread_notifications():
    count = Booking.query.filter_by(read_by_employee=False).count()
    return jsonify({'count': count})

@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    total_bookings = Booking.query.count()
    pending_bookings = Booking.query.filter_by(status='pending').count()
    confirmed_bookings = Booking.query.filter_by(status='confirmed').count()
    total_revenue = db.session.query(db.func.sum(Booking.total_price)).filter(
        Booking.status == 'confirmed'
    ).scalar() or 0

    return jsonify({
        'total_bookings': total_bookings,
        'pending_bookings': pending_bookings,
        'confirmed_bookings': confirmed_bookings,
        'total_revenue': total_revenue
    })

@app.route('/api/room-status', methods=['GET'])
def get_room_status():
    today = datetime.now().date()
    rooms = Room.query.all()

    room_status = []
    for room in rooms:
        # First check maintenance status
        if room.maintenance_status == 'maintenance':
            status = 'maintenance'
            current_booking = None
        elif room.maintenance_status == 'closed':
            status = 'closed'
            current_booking = None
        else:
            # Check for current bookings
            current_booking = Booking.query.filter(
                Booking.room_id == room.id,
                Booking.status != 'cancelled',
                Booking.check_in <= today,
                Booking.check_out > today
            ).first()
            status = 'occupied' if current_booking else 'available'

        room_status.append({
            'room': room.to_dict(),
            'status': status,
            'current_booking': current_booking.to_dict() if current_booking else None
        })

    return jsonify(room_status)

# Receipt Upload Endpoint
@app.route('/api/bookings/<int:booking_id>/upload-receipt', methods=['POST'])
def upload_receipt(booking_id):
    booking = Booking.query.get_or_404(booking_id)

    if 'receipt' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['receipt']

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(f"booking_{booking_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}")
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        booking.receipt_url = filepath
        db.session.commit()

        return jsonify({'message': 'Receipt uploaded successfully', 'receipt_url': filepath})

    return jsonify({'error': 'Invalid file type'}), 400

# Agent Management Endpoints
@app.route('/api/agents', methods=['GET'])
def get_agents():
    agents = Agent.query.order_by(Agent.created_at.desc()).all()
    return jsonify([agent.to_dict() for agent in agents])

@app.route('/api/agents', methods=['POST'])
def create_agent():
    data = request.json

    # Check if agent with email already exists
    existing_agent = Agent.query.filter_by(email=data['email']).first()
    if existing_agent:
        return jsonify({'error': 'Agent with this email already exists'}), 400

    agent = Agent(
        name=data['name'],
        email=data['email'],
        phone=data['phone'],
        company=data.get('company', ''),
        status='pending'
    )

    db.session.add(agent)
    db.session.commit()

    return jsonify(agent.to_dict()), 201

@app.route('/api/agents/<int:agent_id>', methods=['GET'])
def get_agent(agent_id):
    agent = Agent.query.get_or_404(agent_id)
    return jsonify(agent.to_dict())

@app.route('/api/agents/<int:agent_id>', methods=['PUT'])
def update_agent(agent_id):
    agent = Agent.query.get_or_404(agent_id)
    data = request.json

    if 'name' in data:
        agent.name = data['name']
    if 'email' in data:
        agent.email = data['email']
    if 'phone' in data:
        agent.phone = data['phone']
    if 'company' in data:
        agent.company = data['company']
    if 'status' in data:
        agent.status = data['status']  # approved, suspended, pending

    db.session.commit()
    return jsonify(agent.to_dict())

@app.route('/api/agents/<int:agent_id>', methods=['DELETE'])
def delete_agent(agent_id):
    agent = Agent.query.get_or_404(agent_id)
    db.session.delete(agent)
    db.session.commit()
    return jsonify({'message': 'Agent deleted successfully'})

# Room Maintenance Endpoints
@app.route('/api/room-maintenance', methods=['GET'])
def get_room_maintenance():
    maintenance_records = RoomMaintenance.query.order_by(RoomMaintenance.created_at.desc()).all()
    return jsonify([record.to_dict() for record in maintenance_records])

@app.route('/api/room-maintenance', methods=['POST'])
def create_room_maintenance():
    data = request.json

    start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()

    maintenance = RoomMaintenance(
        room_id=data['room_id'],
        start_date=start_date,
        end_date=None,  # End date is only set when maintenance is completed
        reason=data.get('reason', ''),
        status='ongoing'  # Always start as ongoing, only complete via explicit action
    )

    # Update room maintenance status
    room = Room.query.get(data['room_id'])
    if room:
        room.maintenance_status = 'maintenance'

    db.session.add(maintenance)
    db.session.commit()

    return jsonify(maintenance.to_dict()), 201

@app.route('/api/room-maintenance/<int:maintenance_id>', methods=['PUT'])
def update_room_maintenance(maintenance_id):
    maintenance = RoomMaintenance.query.get_or_404(maintenance_id)
    data = request.json

    if 'end_date' in data:
        if data['end_date']:
            maintenance.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
            maintenance.status = 'completed'
            # Update room status back to operational
            room = Room.query.get(maintenance.room_id)
            if room:
                room.maintenance_status = 'operational'

    if 'reason' in data:
        maintenance.reason = data['reason']

    if 'status' in data:
        maintenance.status = data['status']

    db.session.commit()
    return jsonify(maintenance.to_dict())

# Room History Endpoint (with date filtering)
@app.route('/api/room-history', methods=['GET'])
def get_room_history():
    date_filter = request.args.get('date')
    room_id = request.args.get('room_id', type=int)

    query = Booking.query

    if date_filter:
        filter_date = datetime.strptime(date_filter, '%Y-%m-%d').date()
        query = query.filter(
            Booking.check_in <= filter_date,
            Booking.check_out >= filter_date
        )

    if room_id:
        query = query.filter(Booking.room_id == room_id)

    bookings = query.order_by(Booking.check_in.desc()).all()

    # Also get maintenance records
    maintenance_query = RoomMaintenance.query

    if date_filter:
        filter_date = datetime.strptime(date_filter, '%Y-%m-%d').date()
        maintenance_query = maintenance_query.filter(
            RoomMaintenance.start_date <= filter_date,
            db.or_(
                RoomMaintenance.end_date >= filter_date,
                RoomMaintenance.end_date == None
            )
        )

    if room_id:
        maintenance_query = maintenance_query.filter(RoomMaintenance.room_id == room_id)

    maintenance_records = maintenance_query.order_by(RoomMaintenance.start_date.desc()).all()

    return jsonify({
        'bookings': [booking.to_dict() for booking in bookings],
        'maintenance': [record.to_dict() for record in maintenance_records]
    })

# Room Add/Edit Endpoints
@app.route('/api/rooms', methods=['POST'])
def create_room():
    data = request.json

    # Check if room number already exists
    existing_room = Room.query.filter_by(room_number=data['room_number']).first()
    if existing_room:
        return jsonify({'error': 'Room number already exists'}), 400

    room = Room(
        room_number=data['room_number'],
        room_type=data['room_type'],
        price_per_night=data['price_per_night'],
        capacity=data['capacity'],
        description=data.get('description', ''),
        image_url=data.get('image_url', ''),
        amenities=data.get('amenities', ''),
        maintenance_status=data.get('maintenance_status', 'operational')
    )

    db.session.add(room)
    db.session.commit()

    return jsonify(room.to_dict()), 201

@app.route('/api/rooms/<int:room_id>', methods=['PUT'])
def update_room(room_id):
    room = Room.query.get_or_404(room_id)
    data = request.json

    if 'room_number' in data:
        room.room_number = data['room_number']
    if 'room_type' in data:
        room.room_type = data['room_type']
    if 'price_per_night' in data:
        room.price_per_night = data['price_per_night']
    if 'capacity' in data:
        room.capacity = data['capacity']
    if 'description' in data:
        room.description = data['description']
    if 'image_url' in data:
        room.image_url = data['image_url']
    if 'amenities' in data:
        room.amenities = data['amenities']
    if 'maintenance_status' in data:
        room.maintenance_status = data['maintenance_status']

    db.session.commit()
    return jsonify(room.to_dict())

@app.route('/api/rooms/<int:room_id>', methods=['DELETE'])
def delete_room(room_id):
    room = Room.query.get_or_404(room_id)
    db.session.delete(room)
    db.session.commit()
    return jsonify({'message': 'Room deleted successfully'})

def init_db():
    with app.app_context():
        db.drop_all()
        db.create_all()

        if Room.query.count() == 0:
            rooms = [
                # Deluxe Rooms (2 pax - 5 rooms)
                Room(room_number='101', room_type='Deluxe Room', price_per_night=150, capacity=2,
                     description='Elegant room with modern amenities and comfortable queen bed',
                     image_url='https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800',
                     amenities='Free WiFi, Air Conditioning, Queen Bed, City View, Mini Bar, Smart TV'),
                Room(room_number='102', room_type='Deluxe Room', price_per_night=150, capacity=2,
                     description='Stylish room with premium bedding and contemporary design',
                     image_url='https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
                     amenities='Free WiFi, Air Conditioning, Queen Bed, City View, Mini Bar, Smart TV'),
                Room(room_number='103', room_type='Deluxe Room', price_per_night=150, capacity=2,
                     description='Cozy deluxe room with private balcony and city views',
                     image_url='https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800',
                     amenities='Free WiFi, Air Conditioning, Queen Bed, Balcony, Mini Bar, Smart TV'),
                Room(room_number='104', room_type='Deluxe Room', price_per_night=150, capacity=2,
                     description='Bright and spacious room with natural lighting',
                     image_url='https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
                     amenities='Free WiFi, Air Conditioning, Queen Bed, City View, Mini Bar, Smart TV'),
                Room(room_number='105', room_type='Deluxe Room', price_per_night=150, capacity=2,
                     description='Modern deluxe room with sophisticated decor',
                     image_url='https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800',
                     amenities='Free WiFi, Air Conditioning, Queen Bed, City View, Mini Bar, Smart TV'),

                # Superior Family Rooms (4 pax - 5 rooms)
                Room(room_number='201', room_type='Superior Family Room', price_per_night=280, capacity=4,
                     description='Spacious family room with 2 queen beds and sitting area',
                     image_url='https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800',
                     amenities='Free WiFi, Air Conditioning, 2 Queen Beds, Sofa, Mini Bar, Smart TV, Coffee Maker'),
                Room(room_number='202', room_type='Superior Family Room', price_per_night=280, capacity=4,
                     description='Family-friendly room with separate sleeping and living areas',
                     image_url='https://images.unsplash.com/photo-1591088398332-8a7791972843?w=800',
                     amenities='Free WiFi, Air Conditioning, 2 Queen Beds, Sofa, Mini Bar, Smart TV, Coffee Maker'),
                Room(room_number='203', room_type='Superior Family Room', price_per_night=280, capacity=4,
                     description='Modern family suite with premium comfort',
                     image_url='https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800',
                     amenities='Free WiFi, Air Conditioning, 2 Queen Beds, Sofa, Mini Bar, Smart TV, Coffee Maker'),
                Room(room_number='204', room_type='Superior Family Room', price_per_night=280, capacity=4,
                     description='Large family room with panoramic city views',
                     image_url='https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=800',
                     amenities='Free WiFi, Air Conditioning, 2 Queen Beds, City View, Mini Bar, Smart TV, Coffee Maker'),
                Room(room_number='205', room_type='Superior Family Room', price_per_night=280, capacity=4,
                     description='Comfortable family accommodation with modern facilities',
                     image_url='https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800',
                     amenities='Free WiFi, Air Conditioning, 2 Queen Beds, Sofa, Mini Bar, Smart TV, Coffee Maker'),

                # Grand Suite (8 pax - 3 rooms)
                Room(room_number='301', room_type='Grand Suite', price_per_night=480, capacity=8,
                     description='Luxurious suite with multiple bedrooms perfect for large groups',
                     image_url='https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800',
                     amenities='Free WiFi, Air Conditioning, 4 Bedrooms, Living Room, Kitchen, Dining Area, Smart TV, Washing Machine'),
                Room(room_number='302', room_type='Grand Suite', price_per_night=480, capacity=8,
                     description='Premium group accommodation with separate living and dining areas',
                     image_url='https://images.unsplash.com/photo-1629140727571-9b5c6f6267b4?w=800',
                     amenities='Free WiFi, Air Conditioning, 4 Bedrooms, Living Room, Kitchen, Balcony, Smart TV, Washing Machine'),
                Room(room_number='303', room_type='Grand Suite', price_per_night=480, capacity=8,
                     description='Spacious multi-bedroom suite with modern amenities and stunning views',
                     image_url='https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=800',
                     amenities='Free WiFi, Air Conditioning, 4 Bedrooms, Living Room, Kitchen, City View, Smart TV, Washing Machine'),

                # Presidential Suite (2 pax - 2 rooms)
                Room(room_number='401', room_type='Presidential Suite', price_per_night=750, capacity=2,
                     description='Ultimate luxury suite with exclusive amenities and breathtaking views',
                     image_url='https://images.unsplash.com/photo-1631049552240-59c37f38802b?w=800',
                     amenities='Free WiFi, King Bed, Private Balcony, Jacuzzi, Living Room, Dining Area, Butler Service, Premium Minibar'),
                Room(room_number='402', room_type='Presidential Suite', price_per_night=750, capacity=2,
                     description='Exquisite penthouse suite with unparalleled luxury and personalized service',
                     image_url='https://images.unsplash.com/photo-1591088398332-8a7791972843?w=800',
                     amenities='Free WiFi, King Bed, Ocean View, Jacuzzi, Living Room, Dining Area, Butler Service, Premium Minibar'),
            ]

            for room in rooms:
                db.session.add(room)

            db.session.commit()
            print("Database initialized with sample rooms")

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)
