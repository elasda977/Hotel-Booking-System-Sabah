from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

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
            'maintenance_status': self.maintenance_status
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
