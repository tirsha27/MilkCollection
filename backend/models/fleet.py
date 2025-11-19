#models/fleet.py
from sqlalchemy import Column, String, Float, Boolean, DateTime, Integer, JSON, CheckConstraint, ForeignKey
from sqlalchemy.sql import func
from database.session import Base

class Fleet(Base):
    __tablename__ = "fleet"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    vehicle_code = Column(String(10), unique=True, nullable=False, index=True)
    vehicle_name = Column(String(100), nullable=False)
    vehicle_number = Column(String(15), unique=True, nullable=False)
    category = Column(String(10), nullable=False)

    # capacity
    capacity_cans = Column(Float, nullable=False)
    capacity_liters = Column(Float, nullable=False)

    # chilling center mapping
    chilling_center_id = Column(String(36), nullable=True)

    # details
    realistic_specs = Column(JSON, nullable=False)
    driver_details = Column(JSON, nullable=True)
    # Optimization-related fields
    category_name = Column(String(20), nullable=True)  # For optimizer grouping
    fixed_cost = Column(Float, default=300.0)          # Base cost per route
    cost_per_km = Column(Float, default=5.0)           # Cost per kilometer
    service_time = Column(Integer, default=15)         # Minutes required per stop
    vehicle_count = Column(Integer, default=1)         # For grouping stats

    current_latitude = Column(Float, nullable=True)
    current_longitude = Column(Float, nullable=True)

    is_available = Column(Boolean, default=True)
    maintenance_due = Column(DateTime(timezone=True), nullable=True)

    upload_batch_id = Column(String(36), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("category IN ('mini', 'small')", name='check_vehicle_category'),
    )

    def __repr__(self):
        return f"<Fleet {self.vehicle_code}: {self.vehicle_name} ({self.vehicle_number})>"
