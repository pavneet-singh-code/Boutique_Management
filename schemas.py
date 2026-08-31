from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

# Base schema used by Gemini Structured Output
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

# Schema returned to frontend after saving in SQLite
class OrderResponse(OrderFormExtraction):
    id: int
    filename: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True