# backend/models/optimization.py

from sqlalchemy import Column, String, JSON, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import declarative_base, relationship
from database.session import Base
import uuid

Base = declarative_base()

class OptimizationRun(Base):
    __tablename__ = "optimization_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trigger_type = Column(String, nullable=False)
    trigger_details = Column(JSON, nullable=True)
    status = Column(String, nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    results_summary = Column(JSON, nullable=True)
    manual_changes = Column(JSON, nullable=True)
    # ✅ Add missing columns here
    input_config = Column(JSON, nullable=True)
    result = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship
    changes = relationship("OptimizationChange", back_populates="run", cascade="all, delete")


class OptimizationChange(Base):
    __tablename__ = "optimization_changes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    optimization_run_id = Column(UUID(as_uuid=True), ForeignKey("optimization_runs.id"))
    change_type = Column(String, nullable=True)
    entity_type = Column(String, nullable=True)
    entity_id = Column(String, nullable=True)
    before_state = Column(JSON, nullable=True)
    after_state = Column(JSON, nullable=True)
    impact_metrics = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    run = relationship("OptimizationRun", back_populates="changes")
