from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class RoomCategory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    base_price = db.Column(db.Float, nullable=False)
    capacity = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    rooms = db.relationship('Room', backref='category', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'base_price': self.base_price,
            'capacity': self.capacity,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }

class Room(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    room_number = db.Column(db.String(10), unique=True, nullable=False)
    room_type = db.Column(db.String(50), nullable=False)
    price_per_night = db.Column(db.Float, nullable=False)
    capacity = db.Column(db.Integer, nullable=False)
    description = db.Column(db.Text)
    image_url = db.Column(db.String(500))
    amenities = db.Column(db.Text)
    maintenance_status = db.Column(db.String(20), default='operational')  # operational, maintenance, closed
    category_id = db.Column(db.Integer, db.ForeignKey('room_category.id'), nullable=True)
    bookings = db.relationship('Booking', backref='room', lazy=True)
    maintenance_records = db.relationship('RoomMaintenance', backref='room', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'room_number': self.room_number,
            'room_type': self.room_type,
            'price_per_night': self.price_per_night,
            'capacity': self.capacity,
            'description': self.description,
            'image_url': self.image_url,
            'amenities': self.amenities,
            'maintenance_status': self.maintenance_status,
            'category_id': self.category_id
        }

class Booking(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey('room.id'), nullable=False)
    agent_id = db.Column(db.Integer, db.ForeignKey('agent.id'), nullable=True)  # null if direct customer booking
    customer_name = db.Column(db.String(100), nullable=False)
    customer_email = db.Column(db.String(100), nullable=False)
    customer_phone = db.Column(db.String(20), nullable=False)
    check_in = db.Column(db.Date, nullable=False)
    check_out = db.Column(db.Date, nullable=False)
    total_price = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, confirmed, cancelled
    receipt_url = db.Column(db.String(500), nullable=True)  # path to uploaded receipt
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    read_by_employee = db.Column(db.Boolean, default=False)

    def to_dict(self):
        agent_name = None
        if self.agent_id:
            agent = Agent.query.get(self.agent_id)
            if agent:
                agent_name = agent.name

        return {
            'id': self.id,
            'room_id': self.room_id,
            'room_number': self.room.room_number,
            'room_type': self.room.room_type,
            'customer_name': self.customer_name,
            'customer_email': self.customer_email,
            'customer_phone': self.customer_phone,
            'check_in': self.check_in.strftime('%Y-%m-%d'),
            'check_out': self.check_out.strftime('%Y-%m-%d'),
            'total_price': self.total_price,
            'status': self.status,
            'receipt_url': self.receipt_url,
            'agent_id': self.agent_id,
            'agent_name': agent_name,
            'booking_type': 'Agent' if self.agent_id else 'Guest',
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'read_by_employee': self.read_by_employee
        }

class Agent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    company = db.Column(db.String(100))
    status = db.Column(db.String(20), default='pending')  # pending, approved, suspended
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    bookings = db.relationship('Booking', backref='agent', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'company': self.company,
            'status': self.status,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }

class RoomMaintenance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey('room.id'), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=True)  # null if still in maintenance
    reason = db.Column(db.Text)
    status = db.Column(db.String(20), default='ongoing')  # ongoing, completed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        days_closed = 0
        if self.end_date:
            days_closed = (self.end_date - self.start_date).days
        elif self.status == 'ongoing':
            days_closed = (datetime.utcnow().date() - self.start_date).days

        return {
            'id': self.id,
            'room_id': self.room_id,
            'room_number': self.room.room_number,
            'room_type': self.room.room_type,
            'start_date': self.start_date.strftime('%Y-%m-%d'),
            'end_date': self.end_date.strftime('%Y-%m-%d') if self.end_date else None,
            'reason': self.reason,
            'status': self.status,
            'days_closed': days_closed,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), default='employee')  # admin, employee
    status = db.Column(db.String(20), default='active')  # active, inactive
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'status': self.status,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }

class Holiday(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    date = db.Column(db.Date, unique=True, nullable=False)
    rate_multiplier = db.Column(db.Float, default=1.5)
    is_blackout = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'date': self.date.strftime('%Y-%m-%d'),
            'rate_multiplier': self.rate_multiplier,
            'is_blackout': self.is_blackout,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }

class RateRule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    room_category = db.Column(db.String(100), nullable=True)  # null = applies to all
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    rate_multiplier = db.Column(db.Float, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    audit_logs = db.relationship('RateAuditLog', backref='rate_rule', lazy=True)

    def to_dict(self):
        creator = None
        if self.created_by:
            user = User.query.get(self.created_by)
            if user:
                creator = user.name
        return {
            'id': self.id,
            'name': self.name,
            'room_category': self.room_category,
            'start_date': self.start_date.strftime('%Y-%m-%d'),
            'end_date': self.end_date.strftime('%Y-%m-%d'),
            'rate_multiplier': self.rate_multiplier,
            'is_active': self.is_active,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'created_by': self.created_by,
            'created_by_name': creator
        }

class RateAuditLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    rate_rule_id = db.Column(db.Integer, db.ForeignKey('rate_rule.id'), nullable=False)
    action = db.Column(db.String(20), nullable=False)  # created, updated, deleted
    old_values = db.Column(db.Text, nullable=True)  # JSON string
    new_values = db.Column(db.Text, nullable=True)  # JSON string
    changed_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    changed_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        changer = None
        if self.changed_by:
            user = User.query.get(self.changed_by)
            if user:
                changer = user.name
        return {
            'id': self.id,
            'rate_rule_id': self.rate_rule_id,
            'action': self.action,
            'old_values': self.old_values,
            'new_values': self.new_values,
            'changed_by': self.changed_by,
            'changed_by_name': changer,
            'changed_at': self.changed_at.strftime('%Y-%m-%d %H:%M:%S')
        }
