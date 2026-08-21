from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class OrderFieldBase(BaseModel):
    field_name: str
    extracted_text: Optional[str] = None
    low_confidence: bool = False
    crop_image_path: Optional[str] = None

class OrderFieldResponse(OrderFieldBase):
    id: int
    order_id: int

    class Config:
        from_attributes = True

class OrderResponse(BaseModel):
    id: int
    filename: str
    created_at: datetime
    needs_review: bool
    fields: List[OrderFieldResponse] = []

    class Config:
        from_attributes = True
