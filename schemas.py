from pydantic import BaseModel, Field
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

class OrderFormExtraction(BaseModel):
    customer_name: Optional[str] = Field(None, description="Name written next to NAME -")
    additional_info: Optional[str] = Field(None, description="Text under ADDITIONAL INFO e.g. (Vandana)")
    order_date: Optional[str] = Field(None, description="Date next to ORDER DATE")
    deliver_date: Optional[str] = Field(None, description="Date next to DELIVER DATE")
    order_number: Optional[str] = Field(None, description="Order number next to ORDER NUMBER")
    contact_number: Optional[str] = Field(None, description="Phone number next to CONTACT NUMBER")
    what_to_design: Optional[str] = Field(None, description="Text written under WHAT TO DESIGN section e.g. Beta Ka Salwar")
    advance_payment: Optional[str] = Field(None, description="Amount in ADVANCE PAYMENT box")
    total_amount: Optional[str] = Field(None, description="Amount in TOTAL box")
    needs_review: bool = Field(False, description="Set to True if any key handwritten field is illegible or unclear")
