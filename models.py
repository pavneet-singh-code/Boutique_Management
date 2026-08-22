from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    needs_review = Column(Boolean, default=False)  

    fields = relationship("OrderField", back_populates="order", cascade="all, delete-orphan")

class OrderField(Base):
    __tablename__ = "order_fields"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    field_name = Column(String, nullable=False)
    extracted_text = Column(String, nullable=True)
    low_confidence = Column(Boolean, default=False)
    crop_image_path = Column(String, nullable=True)

    order = relationship("Order", back_populates="fields")
