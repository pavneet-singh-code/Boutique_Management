from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from database import Base

class Order(Base):
    __tablename__ = "orders"

    # Fixed typo: primary_key=True (was primary_index=True)
    id = Column(Integer, primary_key=True, index=True) 
    filename = Column(String, nullable=True)
    order_number = Column(String, index=True, nullable=True)
    customer_name = Column(String, nullable=True)
    additional_info = Column(String, nullable=True)
    order_date = Column(String, nullable=True)
    deliver_date = Column(String, nullable=True)
    contact_number = Column(String, nullable=True)
    what_to_design = Column(Text, nullable=True)
    advance_payment = Column(String, nullable=True)
    total_amount = Column(String, nullable=True)
    needs_review = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())