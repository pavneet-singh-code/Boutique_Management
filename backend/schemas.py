from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from cleaning import (
    blank,
    clean_text,
    normalize_order_number,
    parse_amount,
    parse_date,
)


# Schema used by Gemini Structured Output (raw hand-written text, all strings)
class OrderFormExtraction(BaseModel):
    customer_name: Optional[str] = Field(
        None,
        description="Name written next to NAME -"
    )

    additional_info: Optional[str] = Field(
        None,
        description="Text under ADDITIONAL INFO e.g. (Vandana)"
    )

    order_date: Optional[str] = Field(
        None,
        description="Date next to ORDER DATE"
    )

    deliver_date: Optional[str] = Field(
        None,
        description="Date next to DELIVER DATE"
    )

    order_number: Optional[str] = Field(
        None,
        description="Order number next to ORDER NUMBER"
    )

    contact_number: Optional[str] = Field(
        None,
        description="Phone number next to CONTACT NUMBER"
    )

    what_to_design: Optional[str] = Field(
        None,
        description="Text written under WHAT TO DESIGN section e.g. Beta Ka Salwar"
    )

    advance_payment: Optional[str] = Field(
        None,
        description="Amount in ADVANCE PAYMENT box"
    )

    total_amount: Optional[str] = Field(
        None,
        description="Amount in TOTAL box"
    )

    needs_review: bool = Field(
        False,
        description="Set to True if any key handwritten field is illegible or unclear"
    )


# What the scan endpoint returns: raw extraction + which page it came from.
# advance_payment -> the order's advance_amount, total_amount -> estimated_total.
class OrderScan(OrderFormExtraction):
    filename: Optional[str] = None


TEXT_FIELDS = ("customer_name", "additional_info", "contact_number", "what_to_design", "filename")
DATE_FIELDS = ("order_date", "deliver_date", "advance_date")
AMOUNT_FIELDS = ("advance_amount", "estimated_total")


def _is_unclear(value):
    return isinstance(value, str) and value.strip().upper() == "UNCLEAR"


def _clean_order_input(data, partial):
    """Cleans incoming order values. Anything that can't be understood becomes
    empty, the order is flagged for review and a note says what was wrong."""
    if not isinstance(data, dict):
        return data
    data = dict(data)
    notes = []
    unclear = False

    def present(field):
        return field in data or not partial

    if present("order_number"):
        raw = data.get("order_number")
        unclear |= _is_unclear(raw)
        number, note = normalize_order_number(raw)
        data["order_number"] = number
        if note:
            notes.append(note)

    for field in TEXT_FIELDS:
        if present(field):
            raw = data.get(field)
            unclear |= _is_unclear(raw)
            data[field] = clean_text(raw)

    for field in DATE_FIELDS:
        if present(field):
            raw = data.get(field)
            parsed = parse_date(raw)
            if parsed is None and not blank(raw):
                notes.append(f"{field} '{raw}' could not be read")
                unclear = True
            unclear |= _is_unclear(raw)
            data[field] = parsed

    for field in AMOUNT_FIELDS:
        if present(field):
            raw = data.get(field)
            parsed = parse_amount(raw)
            if parsed is None and not blank(raw):
                notes.append(f"{field} '{raw}' is not a number")
                unclear = True
            unclear |= _is_unclear(raw)
            data[field] = parsed

    # An advance without a date is dated with the order date.
    if not partial and data.get("advance_amount") is not None and not data.get("advance_date"):
        data["advance_date"] = data.get("order_date") or date.today()

    if unclear and not partial:
        data["needs_review"] = True
    if notes:
        data["import_notes"] = "; ".join(notes)
    return data


# ---------------------------------------------------------------- Orders

class OrderCreate(BaseModel):
    filename: Optional[str] = None
    order_number: Optional[str] = None
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    additional_info: Optional[str] = None
    contact_number: Optional[str] = None
    order_date: Optional[date] = None
    deliver_date: Optional[date] = None
    what_to_design: Optional[str] = None
    advance_amount: Optional[int] = None
    advance_date: Optional[date] = None
    estimated_total: Optional[int] = None
    needs_review: bool = False
    import_notes: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def clean(cls, data):
        return _clean_order_input(data, partial=False)


# PATCH: only the fields that were sent are changed.
# The final total and final payment are set through bills, not here.
class OrderUpdate(BaseModel):
    order_number: Optional[str] = None
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    additional_info: Optional[str] = None
    contact_number: Optional[str] = None
    order_date: Optional[date] = None
    deliver_date: Optional[date] = None
    what_to_design: Optional[str] = None
    advance_amount: Optional[int] = None
    advance_date: Optional[date] = None
    estimated_total: Optional[int] = None
    needs_review: Optional[bool] = None

    @model_validator(mode="before")
    @classmethod
    def clean(cls, data):
        cleaned = _clean_order_input(data, partial=True)
        if isinstance(cleaned, dict):
            cleaned.pop("import_notes", None)
        return cleaned


class CustomerBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    phone: Optional[str] = None


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: Optional[str] = None
    order_number: Optional[str] = None
    customer_id: Optional[int] = None
    customer: Optional[CustomerBrief] = None
    customer_name: Optional[str] = None
    additional_info: Optional[str] = None
    contact_number: Optional[str] = None
    order_date: Optional[date] = None
    deliver_date: Optional[date] = None
    what_to_design: Optional[str] = None

    advance_amount: Optional[int] = None
    advance_date: Optional[date] = None
    estimated_total: Optional[int] = None
    final_total: Optional[int] = None
    billed_date: Optional[date] = None
    bill_id: Optional[int] = None
    bill_number: Optional[str] = None
    bill_status: Optional[str] = None
    final_payment_amount: Optional[int] = None
    final_payment_date: Optional[date] = None
    # Worked out on the server (see models.Order)
    received: int = 0
    balance: Optional[int] = None
    payment_state: str = "none"  # none | advance | billed | paid

    needs_review: bool = False
    import_notes: Optional[str] = None
    created_at: datetime


# ---------------------------------------------------------------- Customers

class CustomerCreate(BaseModel):
    name: str = Field(min_length=1)
    phone: Optional[str] = None
    notes: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def clean(cls, data):
        if isinstance(data, dict):
            data = {**data, "name": clean_text(data.get("name")) or "", "phone": clean_text(data.get("phone"))}
        return data


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def clean(cls, data):
        if isinstance(data, dict):
            data = dict(data)
            for field in ("name", "phone"):
                if field in data:
                    data[field] = clean_text(data[field])
        return data


class CustomerSummary(BaseModel):
    id: int
    name: str
    phone: Optional[str] = None
    notes: Optional[str] = None
    order_count: int
    last_order_date: Optional[date] = None
    total_value: int          # final totals, or estimates where not billed yet
    received: int             # money received so far
    balance_due: int          # billed but not yet paid
    unbilled_count: int       # orders without a bill
    created_at: datetime


class MergeRequest(BaseModel):
    other_id: int


# ---------------------------------------------------------------- Bills

class BillLineInput(BaseModel):
    order_id: int
    final_total: int = Field(ge=0)


class BillCreate(BaseModel):
    customer_id: int
    lines: List[BillLineInput] = Field(min_length=1)
    discount: int = Field(0, ge=0)
    issued_on: Optional[date] = None


class BillUpdate(BaseModel):
    lines: Optional[List[BillLineInput]] = None
    discount: Optional[int] = Field(None, ge=0)


class BillPaid(BaseModel):
    paid_on: Optional[date] = None


class BillLine(BaseModel):
    order_id: int
    order_number: Optional[str] = None
    what_to_design: Optional[str] = None
    order_date: Optional[date] = None
    final_total: int
    advance_amount: int


class BillResponse(BaseModel):
    id: int
    bill_number: str
    customer: CustomerBrief
    discount: int
    status: str
    issued_on: date
    paid_on: Optional[date] = None
    lines: List[BillLine]
    subtotal: int
    advance_total: int
    amount_due: int
    created_at: datetime


class CustomerDetail(CustomerSummary):
    orders: List[OrderResponse]
    bills: List[BillResponse]


# ---------------------------------------------------------------- Settings

class AppSettings(BaseModel):
    boutique_name: Optional[str] = None
    upi_id: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    bill_note: Optional[str] = None


# ---------------------------------------------------------------- Team

from typing import Any, Dict, Literal  # noqa: E402

Role = Literal["owner", "uploader", "worker", "social_media"]


class EmployeeBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_code: Optional[str] = None
    name: str
    role: str
    color: Optional[str] = None
    active: bool = True


class EmployeeOut(EmployeeBrief):
    phone: Optional[str] = None
    has_pin: bool = False
    last_login_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    @model_validator(mode="before")
    @classmethod
    def add_has_pin(cls, data):
        if hasattr(data, "pin_hash"):
            return {
                "id": data.id,
                "employee_code": data.employee_code,
                "name": data.name,
                "role": data.role,
                "color": data.color,
                "active": data.active,
                "phone": data.phone,
                "has_pin": bool(data.pin_hash),
                "last_login_at": data.last_login_at,
                "created_at": data.created_at,
            }
        return data


HEX_COLOR = r"^#[0-9a-fA-F]{6}$"


class EmployeeCreate(BaseModel):
    name: str = Field(min_length=1)
    phone: str = Field(min_length=8)
    role: Role
    pin: str
    color: Optional[str] = Field(None, pattern=HEX_COLOR)


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[Role] = None
    color: Optional[str] = Field(None, pattern=HEX_COLOR)
    active: Optional[bool] = None


class PinReset(BaseModel):
    pin: str


class ActivityOut(BaseModel):
    id: int
    actor: Optional[EmployeeBrief] = None
    entity: str
    entity_id: Optional[int] = None
    action: str
    label: Optional[str] = None
    details: Dict[str, Any] = {}
    created_at: datetime
