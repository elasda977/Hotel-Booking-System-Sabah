from flask import Flask, request, jsonify
from flask_cors import CORS
from models import db, Room, Booking, Agent, RoomMaintenance, RoomCategory, User, Holiday, RateRule, RateAuditLog
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import json
import jwt
from functools import wraps
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///hotel.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'uploads/receipts'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'hotel-booking-secret-key-change-in-production')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}
CORS(app)

# Create upload folder if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

db.init_app(app)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ==================== AUTH DECORATOR ====================

def require_auth(roles=None):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            token = None
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]

            if not token:
                return jsonify({'error': 'Authentication required'}), 401

            try:
                data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
                current_user = User.query.get(data['user_id'])
                if not current_user or current_user.status != 'active':
                    return jsonify({'error': 'Invalid or inactive user'}), 401
                if roles and current_user.role not in roles:
                    return jsonify({'error': 'Insufficient permissions'}), 403
                request.current_user = current_user
            except jwt.ExpiredSignatureError:
                return jsonify({'error': 'Token expired'}), 401
            except jwt.InvalidTokenError:
                return jsonify({'error': 'Invalid token'}), 401

            return f(*args, **kwargs)
        return decorated_function
    return decorator

# ==================== EMAIL HELPERS ====================

def send_email_notification(booking):
    try:
        email = os.getenv('EMAIL_ADDRESS', 'your-email@gmail.com')
        password = os.getenv('EMAIL_PASSWORD', 'your-password')

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
    try:
        email = os.getenv('EMAIL_ADDRESS', 'your-email@gmail.com')
        password = os.getenv('EMAIL_PASSWORD', 'your-password')

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

# ==================== PRICE CALCULATION ====================

def calculate_booking_price(room_price, room_type, check_in, check_out):
    """Calculate booking price with holiday multipliers and rate rules."""
    total = 0.0
    nightly_breakdown = []
    current_date = check_in

    while current_date < check_out:
        nightly_rate = room_price
        multiplier = 1.0
        notes = []

        # Check for blackout dates
        holiday = Holiday.query.filter_by(date=current_date).first()
        if holiday and holiday.is_blackout:
            return None, None, f"Blackout date: {holiday.name} on {current_date.strftime('%Y-%m-%d')}"

        # Check for rate rules (highest multiplier wins)
        active_rules = RateRule.query.filter(
            RateRule.is_active == True,
            RateRule.start_date <= current_date,
            RateRule.end_date >= current_date,
            db.or_(
                RateRule.room_category.is_(None),
                RateRule.room_category == '',
                RateRule.room_category == room_type
            )
        ).all()

        if active_rules:
            best_rule = max(active_rules, key=lambda r: r.rate_multiplier)
            multiplier = best_rule.rate_multiplier
            notes.append(f"Rate rule: {best_rule.name} (x{best_rule.rate_multiplier})")

        # Holiday multiplier stacks on top
        if holiday:
            multiplier *= holiday.rate_multiplier
            notes.append(f"Holiday: {holiday.name} (x{holiday.rate_multiplier})")

        nightly_total = round(nightly_rate * multiplier, 2)
        total += nightly_total

        nightly_breakdown.append({
            'date': current_date.strftime('%Y-%m-%d'),
            'base_rate': room_price,
            'multiplier': round(multiplier, 2),
            'total': nightly_total,
            'notes': ', '.join(notes) if notes else 'Standard rate'
        })

        current_date += timedelta(days=1)

    return round(total, 2), nightly_breakdown, None

# ==================== AUTH ENDPOINTS ====================

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(email=data.get('email')).first()

    if not user or not user.check_password(data.get('password', '')):
        return jsonify({'error': 'Invalid email or password'}), 401

    if user.status != 'active':
        return jsonify({'error': 'Account is inactive'}), 401

    token = jwt.encode({
        'user_id': user.id,
        'role': user.role,
        'exp': datetime.utcnow() + timedelta(hours=24)
    }, app.config['SECRET_KEY'], algorithm='HS256')

    return jsonify({
        'token': token,
        'user': user.to_dict()
    })

@app.route('/api/auth/me', methods=['GET'])
@require_auth()
def get_current_user():
    return jsonify(request.current_user.to_dict())

@app.route('/api/auth/change-password', methods=['POST'])
@require_auth()
def change_password():
    data = request.json
    user = request.current_user

    if not user.check_password(data.get('current_password', '')):
        return jsonify({'error': 'Current password is incorrect'}), 400

    user.set_password(data['new_password'])
    db.session.commit()
    return jsonify({'message': 'Password changed successfully'})

# ==================== USER MANAGEMENT (admin only) ====================

@app.route('/api/users', methods=['GET'])
@require_auth(roles=['admin'])
def get_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify([u.to_dict() for u in users])

@app.route('/api/users', methods=['POST'])
@require_auth(roles=['admin'])
def create_user():
    data = request.json

    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400

    user = User(
        name=data['name'],
        email=data['email'],
        role=data.get('role', 'employee'),
        status=data.get('status', 'active')
    )
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201

@app.route('/api/users/<int:user_id>', methods=['PUT'])
@require_auth(roles=['admin'])
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.json

    if 'name' in data:
        user.name = data['name']
    if 'email' in data:
        existing = User.query.filter_by(email=data['email']).first()
        if existing and existing.id != user_id:
            return jsonify({'error': 'Email already exists'}), 400
        user.email = data['email']
    if 'role' in data:
        user.role = data['role']
    if 'status' in data:
        user.status = data['status']
    if 'password' in data and data['password']:
        user.set_password(data['password'])

    db.session.commit()
    return jsonify(user.to_dict())

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@require_auth(roles=['admin'])
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    if user.id == request.current_user.id:
        return jsonify({'error': 'Cannot delete your own account'}), 400
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'User deleted successfully'})

# ==================== CATEGORY ENDPOINTS ====================

@app.route('/api/categories', methods=['GET'])
def get_categories():
    categories = RoomCategory.query.order_by(RoomCategory.name).all()
    return jsonify([c.to_dict() for c in categories])

@app.route('/api/categories', methods=['POST'])
@require_auth(roles=['admin'])
def create_category():
    data = request.json
    if RoomCategory.query.filter_by(name=data['name']).first():
        return jsonify({'error': 'Category name already exists'}), 400

    category = RoomCategory(
        name=data['name'],
        description=data.get('description', ''),
        base_price=data['base_price'],
        capacity=data['capacity']
    )
    db.session.add(category)
    db.session.commit()
    return jsonify(category.to_dict()), 201

@app.route('/api/categories/<int:category_id>', methods=['PUT'])
@require_auth(roles=['admin'])
def update_category(category_id):
    category = RoomCategory.query.get_or_404(category_id)
    data = request.json

    if 'name' in data:
        existing = RoomCategory.query.filter_by(name=data['name']).first()
        if existing and existing.id != category_id:
            return jsonify({'error': 'Category name already exists'}), 400
        category.name = data['name']
    if 'description' in data:
        category.description = data['description']
    if 'base_price' in data:
        category.base_price = data['base_price']
    if 'capacity' in data:
        category.capacity = data['capacity']

    db.session.commit()
    return jsonify(category.to_dict())

@app.route('/api/categories/<int:category_id>', methods=['DELETE'])
@require_auth(roles=['admin'])
def delete_category(category_id):
    category = RoomCategory.query.get_or_404(category_id)
    if Room.query.filter_by(category_id=category_id).first():
        return jsonify({'error': 'Cannot delete category with rooms assigned to it'}), 400
    db.session.delete(category)
    db.session.commit()
    return jsonify({'message': 'Category deleted successfully'})

# ==================== HOLIDAY ENDPOINTS ====================

@app.route('/api/holidays', methods=['GET'])
@require_auth()
def get_holidays():
    holidays = Holiday.query.order_by(Holiday.date).all()
    return jsonify([h.to_dict() for h in holidays])

@app.route('/api/holidays', methods=['POST'])
@require_auth(roles=['admin'])
def create_holiday():
    data = request.json
    date = datetime.strptime(data['date'], '%Y-%m-%d').date()

    if Holiday.query.filter_by(date=date).first():
        return jsonify({'error': 'A holiday already exists on this date'}), 400

    holiday = Holiday(
        name=data['name'],
        date=date,
        rate_multiplier=data.get('rate_multiplier', 1.5),
        is_blackout=data.get('is_blackout', False)
    )
    db.session.add(holiday)
    db.session.commit()
    return jsonify(holiday.to_dict()), 201

@app.route('/api/holidays/<int:holiday_id>', methods=['PUT'])
@require_auth(roles=['admin'])
def update_holiday(holiday_id):
    holiday = Holiday.query.get_or_404(holiday_id)
    data = request.json

    if 'name' in data:
        holiday.name = data['name']
    if 'date' in data:
        new_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        existing = Holiday.query.filter_by(date=new_date).first()
        if existing and existing.id != holiday_id:
            return jsonify({'error': 'A holiday already exists on this date'}), 400
        holiday.date = new_date
    if 'rate_multiplier' in data:
        holiday.rate_multiplier = data['rate_multiplier']
    if 'is_blackout' in data:
        holiday.is_blackout = data['is_blackout']

    db.session.commit()
    return jsonify(holiday.to_dict())

@app.route('/api/holidays/<int:holiday_id>', methods=['DELETE'])
@require_auth(roles=['admin'])
def delete_holiday(holiday_id):
    holiday = Holiday.query.get_or_404(holiday_id)
    db.session.delete(holiday)
    db.session.commit()
    return jsonify({'message': 'Holiday deleted successfully'})

# ==================== RATE RULE ENDPOINTS ====================

@app.route('/api/rates', methods=['GET'])
@require_auth()
def get_rates():
    rates = RateRule.query.order_by(RateRule.start_date.desc()).all()
    return jsonify([r.to_dict() for r in rates])

@app.route('/api/rates', methods=['POST'])
@require_auth(roles=['admin'])
def create_rate():
    data = request.json
    start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
    end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()

    rate = RateRule(
        name=data['name'],
        room_category=data.get('room_category') or None,
        start_date=start_date,
        end_date=end_date,
        rate_multiplier=data['rate_multiplier'],
        is_active=data.get('is_active', True),
        created_by=request.current_user.id
    )
    db.session.add(rate)
    db.session.commit()

    # Audit log
    log = RateAuditLog(
        rate_rule_id=rate.id,
        action='created',
        new_values=json.dumps(rate.to_dict()),
        changed_by=request.current_user.id
    )
    db.session.add(log)
    db.session.commit()

    return jsonify(rate.to_dict()), 201

@app.route('/api/rates/<int:rate_id>', methods=['PUT'])
@require_auth(roles=['admin'])
def update_rate(rate_id):
    rate = RateRule.query.get_or_404(rate_id)
    data = request.json
    old_values = rate.to_dict()

    if 'name' in data:
        rate.name = data['name']
    if 'room_category' in data:
        rate.room_category = data['room_category'] or None
    if 'start_date' in data:
        rate.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
    if 'end_date' in data:
        rate.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
    if 'rate_multiplier' in data:
        rate.rate_multiplier = data['rate_multiplier']
    if 'is_active' in data:
        rate.is_active = data['is_active']

    db.session.commit()

    log = RateAuditLog(
        rate_rule_id=rate.id,
        action='updated',
        old_values=json.dumps(old_values),
        new_values=json.dumps(rate.to_dict()),
        changed_by=request.current_user.id
    )
    db.session.add(log)
    db.session.commit()

    return jsonify(rate.to_dict())

@app.route('/api/rates/<int:rate_id>', methods=['DELETE'])
@require_auth(roles=['admin'])
def delete_rate(rate_id):
    rate = RateRule.query.get_or_404(rate_id)
    old_values = rate.to_dict()

    log = RateAuditLog(
        rate_rule_id=rate.id,
        action='deleted',
        old_values=json.dumps(old_values),
        changed_by=request.current_user.id
    )
    db.session.add(log)
    db.session.delete(rate)
    db.session.commit()

    return jsonify({'message': 'Rate rule deleted successfully'})

@app.route('/api/rates/<int:rate_id>/history', methods=['GET'])
@require_auth()
def get_rate_history(rate_id):
    logs = RateAuditLog.query.filter_by(rate_rule_id=rate_id).order_by(RateAuditLog.changed_at.desc()).all()
    return jsonify([l.to_dict() for l in logs])

# ==================== PRICE CALCULATION ENDPOINT ====================

@app.route('/api/bookings/calculate-price', methods=['POST'])
def calculate_price():
    data = request.json
    check_in = datetime.strptime(data['check_in'], '%Y-%m-%d').date()
    check_out = datetime.strptime(data['check_out'], '%Y-%m-%d').date()
    room_price = float(data['room_price'])
    room_type = data.get('room_type', '')

    total, breakdown, error = calculate_booking_price(room_price, room_type, check_in, check_out)

    if error:
        return jsonify({'error': error}), 400

    return jsonify({
        'total_price': total,
        'breakdown': breakdown,
        'nights': len(breakdown)
    })

# ==================== ROOM ENDPOINTS ====================

@app.route('/api/rooms', methods=['GET'])
def get_rooms():
    rooms = Room.query.all()
    return jsonify([room.to_dict() for room in rooms])

@app.route('/api/rooms/available', methods=['GET'])
def get_available_rooms():
    check_in_str = request.args.get('check_in')
    check_out_str = request.args.get('check_out')
    capacity = request.args.get('capacity', type=int)

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

    query = Room.query
    if capacity:
        query = query.filter(Room.capacity >= capacity)

    all_rooms = query.all()

    available_rooms = []
    for room in all_rooms:
        conflicting_bookings = Booking.query.filter(
            Booking.room_id == room.id,
            Booking.status != 'cancelled',
            Booking.check_in < check_out,
            Booking.check_out > check_in
        ).first()

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

# ==================== BOOKING ENDPOINTS ====================

@app.route('/api/bookings', methods=['POST'])
def create_booking():
    data = request.json

    check_in = datetime.strptime(data['check_in'], '%Y-%m-%d').date()
    check_out = datetime.strptime(data['check_out'], '%Y-%m-%d').date()

    # Handle booking by room type (auto-assignment)
    if 'room_type' in data and 'room_id' not in data:
        room_type = data['room_type']

        rooms_of_type = Room.query.filter_by(room_type=room_type).all()

        if not rooms_of_type:
            return jsonify({'error': 'Room type not found'}), 404

        available_room = None
        for room in rooms_of_type:
            if room.maintenance_status == 'maintenance' or room.maintenance_status == 'closed':
                continue

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
        room_for_price = available_room
    else:
        room_id = data.get('room_id')

        if not room_id:
            return jsonify({'error': 'Either room_id or room_type is required'}), 400

        room = Room.query.get(room_id)
        if not room:
            return jsonify({'error': 'Room not found'}), 404

        if room.maintenance_status == 'maintenance' or room.maintenance_status == 'closed':
            return jsonify({'error': 'Room is currently in maintenance and cannot be booked'}), 400

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

        room_for_price = room

    # Server-side price calculation
    total, breakdown, price_error = calculate_booking_price(
        room_for_price.price_per_night, room_for_price.room_type, check_in, check_out
    )

    if price_error:
        return jsonify({'error': price_error}), 400

    # Use server-calculated price, fall back to client price if calculation returns 0
    final_price = total if total > 0 else data.get('total_price', 0)

    booking = Booking(
        room_id=room_id,
        customer_name=data['customer_name'],
        customer_email=data['customer_email'],
        customer_phone=data['customer_phone'],
        check_in=check_in,
        check_out=check_out,
        total_price=final_price,
        status='pending',
        agent_id=data.get('agent_id')
    )

    db.session.add(booking)
    db.session.commit()

    send_email_notification(booking)

    return jsonify(booking.to_dict()), 201

@app.route('/api/bookings', methods=['GET'])
@require_auth()
def get_bookings():
    bookings = Booking.query.order_by(Booking.created_at.desc()).all()
    return jsonify([booking.to_dict() for booking in bookings])

@app.route('/api/bookings/<int:booking_id>', methods=['GET'])
def get_booking(booking_id):
    booking = Booking.query.get_or_404(booking_id)
    return jsonify(booking.to_dict())

@app.route('/api/bookings/<int:booking_id>', methods=['PUT'])
@require_auth()
def update_booking(booking_id):
    booking = Booking.query.get_or_404(booking_id)
    data = request.json

    old_status = booking.status

    if 'room_id' in data:
        new_room = Room.query.get(data['room_id'])
        if not new_room:
            return jsonify({'error': 'Room not found'}), 404

        current_room = Room.query.get(booking.room_id)
        if new_room.room_type != current_room.room_type:
            return jsonify({'error': 'Can only assign room of same type'}), 400

        conflicting = Booking.query.filter(
            Booking.room_id == new_room.id,
            Booking.id != booking_id,
            Booking.status != 'cancelled',
            Booking.check_in < booking.check_out,
            Booking.check_out > booking.check_in
        ).first()

        if conflicting:
            return jsonify({'error': 'Selected room is not available for these dates'}), 400

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

    if old_status != 'confirmed' and booking.status == 'confirmed':
        send_confirmation_email(booking)

    return jsonify(booking.to_dict())

@app.route('/api/bookings/<int:booking_id>/available-rooms', methods=['GET'])
@require_auth()
def get_available_rooms_for_booking(booking_id):
    booking = Booking.query.get_or_404(booking_id)
    current_room = Room.query.get(booking.room_id)

    rooms_of_type = Room.query.filter_by(room_type=current_room.room_type).all()

    available_rooms = []
    for room in rooms_of_type:
        if room.maintenance_status in ['maintenance', 'closed']:
            continue

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
@require_auth()
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
@require_auth()
def get_room_status():
    today = datetime.now().date()
    rooms = Room.query.all()

    room_status = []
    for room in rooms:
        if room.maintenance_status == 'maintenance':
            status = 'maintenance'
            current_booking = None
        elif room.maintenance_status == 'closed':
            status = 'closed'
            current_booking = None
        else:
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

# ==================== AGENT ENDPOINTS ====================

@app.route('/api/agents', methods=['GET'])
def get_agents():
    agents = Agent.query.order_by(Agent.created_at.desc()).all()
    return jsonify([agent.to_dict() for agent in agents])

@app.route('/api/agents', methods=['POST'])
def create_agent():
    data = request.json

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
@require_auth()
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
        agent.status = data['status']

    db.session.commit()
    return jsonify(agent.to_dict())

@app.route('/api/agents/<int:agent_id>', methods=['DELETE'])
@require_auth()
def delete_agent(agent_id):
    agent = Agent.query.get_or_404(agent_id)
    db.session.delete(agent)
    db.session.commit()
    return jsonify({'message': 'Agent deleted successfully'})

# ==================== AGENT TRANSACTIONS ====================

@app.route('/api/agents/<int:agent_id>/bookings', methods=['GET'])
@require_auth()
def get_agent_bookings(agent_id):
    agent = Agent.query.get_or_404(agent_id)
    bookings = Booking.query.filter_by(agent_id=agent_id).order_by(Booking.created_at.desc()).all()

    total_revenue = sum(b.total_price for b in bookings if b.status == 'confirmed')
    confirmed = sum(1 for b in bookings if b.status == 'confirmed')
    pending = sum(1 for b in bookings if b.status == 'pending')
    cancelled = sum(1 for b in bookings if b.status == 'cancelled')

    return jsonify({
        'agent': agent.to_dict(),
        'bookings': [b.to_dict() for b in bookings],
        'summary': {
            'total': len(bookings),
            'confirmed': confirmed,
            'pending': pending,
            'cancelled': cancelled,
            'revenue': total_revenue
        }
    })

@app.route('/api/agents/transactions-summary', methods=['GET'])
@require_auth()
def get_agent_transactions_summary():
    agents = Agent.query.all()
    summaries = []

    for agent in agents:
        bookings = Booking.query.filter_by(agent_id=agent.id).all()
        total_revenue = sum(b.total_price for b in bookings if b.status == 'confirmed')
        confirmed = sum(1 for b in bookings if b.status == 'confirmed')
        pending = sum(1 for b in bookings if b.status == 'pending')
        cancelled = sum(1 for b in bookings if b.status == 'cancelled')

        summaries.append({
            'agent': agent.to_dict(),
            'total_bookings': len(bookings),
            'confirmed': confirmed,
            'pending': pending,
            'cancelled': cancelled,
            'revenue': total_revenue
        })

    return jsonify(summaries)

# ==================== ROOM MAINTENANCE ENDPOINTS ====================

@app.route('/api/room-maintenance', methods=['GET'])
@require_auth()
def get_room_maintenance():
    maintenance_records = RoomMaintenance.query.order_by(RoomMaintenance.created_at.desc()).all()
    return jsonify([record.to_dict() for record in maintenance_records])

@app.route('/api/room-maintenance', methods=['POST'])
@require_auth()
def create_room_maintenance():
    data = request.json

    start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()

    maintenance = RoomMaintenance(
        room_id=data['room_id'],
        start_date=start_date,
        end_date=None,
        reason=data.get('reason', ''),
        status='ongoing'
    )

    room = Room.query.get(data['room_id'])
    if room:
        room.maintenance_status = 'maintenance'

    db.session.add(maintenance)
    db.session.commit()

    return jsonify(maintenance.to_dict()), 201

@app.route('/api/room-maintenance/<int:maintenance_id>', methods=['PUT'])
@require_auth()
def update_room_maintenance(maintenance_id):
    maintenance = RoomMaintenance.query.get_or_404(maintenance_id)
    data = request.json

    if 'end_date' in data:
        if data['end_date']:
            maintenance.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
            maintenance.status = 'completed'
            room = Room.query.get(maintenance.room_id)
            if room:
                room.maintenance_status = 'operational'

    if 'reason' in data:
        maintenance.reason = data['reason']

    if 'status' in data:
        maintenance.status = data['status']

    db.session.commit()
    return jsonify(maintenance.to_dict())

# Room History Endpoint
@app.route('/api/room-history', methods=['GET'])
@require_auth()
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
@require_auth()
def create_room():
    data = request.json

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
        maintenance_status=data.get('maintenance_status', 'operational'),
        category_id=data.get('category_id')
    )

    db.session.add(room)
    db.session.commit()

    return jsonify(room.to_dict()), 201

@app.route('/api/rooms/<int:room_id>', methods=['PUT'])
@require_auth()
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
    if 'category_id' in data:
        room.category_id = data['category_id']

    db.session.commit()
    return jsonify(room.to_dict())

@app.route('/api/rooms/<int:room_id>', methods=['DELETE'])
@require_auth()
def delete_room(room_id):
    room = Room.query.get_or_404(room_id)
    db.session.delete(room)
    db.session.commit()
    return jsonify({'message': 'Room deleted successfully'})

# ==================== INIT DB ====================

def init_db():
    with app.app_context():
        db.drop_all()
        db.create_all()

        # Seed default admin user
        if User.query.count() == 0:
            admin = User(
                name='Admin',
                email='admin@hotel.com',
                role='admin',
                status='active'
            )
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
            print("Default admin user created: admin@hotel.com / admin123")

        # Seed default categories
        if RoomCategory.query.count() == 0:
            categories = [
                RoomCategory(name='Deluxe Room', description='Elegant room with modern amenities', base_price=150, capacity=2),
                RoomCategory(name='Superior Family Room', description='Spacious family room with multiple beds', base_price=280, capacity=4),
                RoomCategory(name='Grand Suite', description='Luxurious suite for large groups', base_price=480, capacity=8),
                RoomCategory(name='Presidential Suite', description='Ultimate luxury suite', base_price=750, capacity=2),
            ]
            for cat in categories:
                db.session.add(cat)
            db.session.commit()
            print("Default room categories created")

        if Room.query.count() == 0:
            # Get category IDs
            deluxe = RoomCategory.query.filter_by(name='Deluxe Room').first()
            family = RoomCategory.query.filter_by(name='Superior Family Room').first()
            grand = RoomCategory.query.filter_by(name='Grand Suite').first()
            presidential = RoomCategory.query.filter_by(name='Presidential Suite').first()

            rooms = [
                # Deluxe Rooms (2 pax - 5 rooms)
                Room(room_number='101', room_type='Deluxe Room', price_per_night=150, capacity=2, category_id=deluxe.id,
                     description='Elegant room with modern amenities and comfortable queen bed',
                     image_url='https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800',
                     amenities='Free WiFi, Air Conditioning, Queen Bed, City View, Mini Bar, Smart TV'),
                Room(room_number='102', room_type='Deluxe Room', price_per_night=150, capacity=2, category_id=deluxe.id,
                     description='Stylish room with premium bedding and contemporary design',
                     image_url='https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
                     amenities='Free WiFi, Air Conditioning, Queen Bed, City View, Mini Bar, Smart TV'),
                Room(room_number='103', room_type='Deluxe Room', price_per_night=150, capacity=2, category_id=deluxe.id,
                     description='Cozy deluxe room with private balcony and city views',
                     image_url='https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800',
                     amenities='Free WiFi, Air Conditioning, Queen Bed, Balcony, Mini Bar, Smart TV'),
                Room(room_number='104', room_type='Deluxe Room', price_per_night=150, capacity=2, category_id=deluxe.id,
                     description='Bright and spacious room with natural lighting',
                     image_url='https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800',
                     amenities='Free WiFi, Air Conditioning, Queen Bed, City View, Mini Bar, Smart TV'),
                Room(room_number='105', room_type='Deluxe Room', price_per_night=150, capacity=2, category_id=deluxe.id,
                     description='Modern deluxe room with sophisticated decor',
                     image_url='https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800',
                     amenities='Free WiFi, Air Conditioning, Queen Bed, City View, Mini Bar, Smart TV'),

                # Superior Family Rooms (4 pax - 5 rooms)
                Room(room_number='201', room_type='Superior Family Room', price_per_night=280, capacity=4, category_id=family.id,
                     description='Spacious family room with 2 queen beds and sitting area',
                     image_url='https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800',
                     amenities='Free WiFi, Air Conditioning, 2 Queen Beds, Sofa, Mini Bar, Smart TV, Coffee Maker'),
                Room(room_number='202', room_type='Superior Family Room', price_per_night=280, capacity=4, category_id=family.id,
                     description='Family-friendly room with separate sleeping and living areas',
                     image_url='https://images.unsplash.com/photo-1591088398332-8a7791972843?w=800',
                     amenities='Free WiFi, Air Conditioning, 2 Queen Beds, Sofa, Mini Bar, Smart TV, Coffee Maker'),
                Room(room_number='203', room_type='Superior Family Room', price_per_night=280, capacity=4, category_id=family.id,
                     description='Modern family suite with premium comfort',
                     image_url='https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800',
                     amenities='Free WiFi, Air Conditioning, 2 Queen Beds, Sofa, Mini Bar, Smart TV, Coffee Maker'),
                Room(room_number='204', room_type='Superior Family Room', price_per_night=280, capacity=4, category_id=family.id,
                     description='Large family room with panoramic city views',
                     image_url='https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=800',
                     amenities='Free WiFi, Air Conditioning, 2 Queen Beds, City View, Mini Bar, Smart TV, Coffee Maker'),
                Room(room_number='205', room_type='Superior Family Room', price_per_night=280, capacity=4, category_id=family.id,
                     description='Comfortable family accommodation with modern facilities',
                     image_url='https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800',
                     amenities='Free WiFi, Air Conditioning, 2 Queen Beds, Sofa, Mini Bar, Smart TV, Coffee Maker'),

                # Grand Suite (8 pax - 3 rooms)
                Room(room_number='301', room_type='Grand Suite', price_per_night=480, capacity=8, category_id=grand.id,
                     description='Luxurious suite with multiple bedrooms perfect for large groups',
                     image_url='https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800',
                     amenities='Free WiFi, Air Conditioning, 4 Bedrooms, Living Room, Kitchen, Dining Area, Smart TV, Washing Machine'),
                Room(room_number='302', room_type='Grand Suite', price_per_night=480, capacity=8, category_id=grand.id,
                     description='Premium group accommodation with separate living and dining areas',
                     image_url='https://images.unsplash.com/photo-1629140727571-9b5c6f6267b4?w=800',
                     amenities='Free WiFi, Air Conditioning, 4 Bedrooms, Living Room, Kitchen, Balcony, Smart TV, Washing Machine'),
                Room(room_number='303', room_type='Grand Suite', price_per_night=480, capacity=8, category_id=grand.id,
                     description='Spacious multi-bedroom suite with modern amenities and stunning views',
                     image_url='https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=800',
                     amenities='Free WiFi, Air Conditioning, 4 Bedrooms, Living Room, Kitchen, City View, Smart TV, Washing Machine'),

                # Presidential Suite (2 pax - 2 rooms)
                Room(room_number='401', room_type='Presidential Suite', price_per_night=750, capacity=2, category_id=presidential.id,
                     description='Ultimate luxury suite with exclusive amenities and breathtaking views',
                     image_url='https://images.unsplash.com/photo-1631049552240-59c37f38802b?w=800',
                     amenities='Free WiFi, King Bed, Private Balcony, Jacuzzi, Living Room, Dining Area, Butler Service, Premium Minibar'),
                Room(room_number='402', room_type='Presidential Suite', price_per_night=750, capacity=2, category_id=presidential.id,
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
