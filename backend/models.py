from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, nullable=True)
    notes = Column(Text, nullable=True)  # measurements, preferences
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    orders = relationship("Order", back_populates="customer")
    bills = relationship("Bill", back_populates="customer")


class Bill(Base):
    """Groups one or more of a customer's suits into a single final bill."""

    __tablename__ = "bills"

    id = Column(Integer, primary_key=True, index=True)
    bill_number = Column(String, unique=True, nullable=False)  # B-2611-004
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    discount = Column(Integer, nullable=False, default=0)
    status = Column(String, nullable=False, default="draft")  # draft | sent | paid
    issued_on = Column(Date, nullable=False)
    paid_on = Column(Date, nullable=True)
    created_by = Column(Integer, nullable=True)  # employee id (Phase 2)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    customer = relationship("Customer", back_populates="bills")
    orders = relationship("Order", back_populates="bill")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=True)
    # Unique once migration 0005 has run (after duplicates are cleaned up).
    order_number = Column(String, index=True, unique=True, nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True, index=True)
    # Name / phone exactly as written on the order form.
    customer_name = Column(String, nullable=True)
    additional_info = Column(String, nullable=True)
    contact_number = Column(String, nullable=True)
    order_date = Column(Date, nullable=True)
    deliver_date = Column(Date, nullable=True)
    what_to_design = Column(Text, nullable=True)

    # Payment step 1: advance when the order is taken
    advance_amount = Column(Integer, nullable=True)
    advance_date = Column(Date, nullable=True)
    # The rough total written on the order form (the real total is set on the bill)
    estimated_total = Column(Integer, nullable=True)
    # Payment step 2: final bill
    final_total = Column(Integer, nullable=True)
    billed_date = Column(Date, nullable=True)
    bill_id = Column(Integer, ForeignKey("bills.id"), nullable=True, index=True)
    # Payment step 3: the rest of the money
    final_payment_amount = Column(Integer, nullable=True)
    final_payment_date = Column(Date, nullable=True)

    needs_review = Column(Boolean, default=False)
    # Things the clean-up could not fix automatically (e.g. an unreadable date).
    import_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    customer = relationship("Customer", back_populates="orders")
    bill = relationship("Bill", back_populates="orders")

    # ---- Worked-out values (never typed in) ----
    @property
    def bill_number(self):
        return self.bill.bill_number if self.bill else None

    @property
    def bill_status(self):
        return self.bill.status if self.bill else None

    @property
    def received(self):
        return (self.advance_amount or 0) + (self.final_payment_amount or 0)

    @property
    def balance(self):
        """Still to collect. Only known once the final total is set on a bill."""
        if self.final_total is None:
            return None
        discount = self.bill_discount_share
        return max(0, self.final_total - discount - self.received)

    @property
    def bill_discount_share(self):
        """This suit's part of the bill's discount (split by price)."""
        if not self.bill or not self.bill.discount or self.final_total is None:
            return 0
        shares = split_discount(self.bill)
        return shares.get(self.id, 0)

    @property
    def payment_state(self):
        if self.final_payment_date or (self.bill and self.bill.status == "paid"):
            return "paid"
        if self.final_total is not None:
            return "billed"
        if self.advance_amount:
            return "advance"
        return "none"


def split_discount(bill):
    """Splits a bill's discount across its suits in proportion to their price.
    Any rounding leftover goes to the last suit, so the parts always add up."""
    orders = sorted(bill.orders, key=lambda o: o.id)
    total = sum(o.final_total or 0 for o in orders)
    discount = min(bill.discount or 0, total)
    shares, given = {}, 0
    for index, order in enumerate(orders):
        if index == len(orders) - 1:
            share = discount - given
        else:
            share = (discount * (order.final_total or 0)) // total if total else 0
        shares[order.id] = share
        given += share
    return shares


class AppSetting(Base):
    """Simple key/value settings, e.g. the boutique's UPI ID for bills."""

    __tablename__ = "app_settings"

    key = Column(String, primary_key=True)
    value = Column(Text, nullable=True)


# ---------------------------------------------------------------- Team

ROLES = ("owner", "uploader", "worker", "social_media")

# Employee colours: clear and easy to tell apart, and never the status colours
# (green = ready, orange = needs review, red = late). Always shown with the
# person's initials or name, so colour is never the only signal.
EMPLOYEE_COLORS = (
    "#2563eb",  # blue
    "#7c3aed",  # violet
    "#0d9488",  # teal
    "#db2777",  # pink
    "#4f46e5",  # indigo
    "#0284c7",  # sky
    "#9333ea",  # purple
    "#92400e",  # brown
    "#475569",  # slate
    "#c026d3",  # magenta
)


def default_color(employee_id):
    return EMPLOYEE_COLORS[(employee_id - 1) % len(EMPLOYEE_COLORS)]


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_code = Column(String, unique=True, nullable=True)  # FA-001
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, nullable=True)
    role = Column(String, nullable=False, default="worker")
    color = Column(String, nullable=True)
    pin_hash = Column(String, nullable=True)
    active = Column(Boolean, nullable=False, default=True)
    # Increase to log this person out everywhere (old tokens stop working).
    token_version = Column(Integer, nullable=False, default=0)
    failed_attempts = Column(Integer, nullable=False, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ActivityLog(Base):
    __tablename__ = "activity_log"

    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, ForeignKey("employees.id"), nullable=True, index=True)
    entity = Column(String, nullable=False)  # order | customer | bill | employee | settings | backup | login
    entity_id = Column(Integer, nullable=True, index=True)
    action = Column(String, nullable=False)  # created | updated | deleted | merged | paid | …
    label = Column(String, nullable=True)  # e.g. "#261023 Simran" - kept even if the thing is deleted
    details = Column(Text, nullable=True)  # JSON: {"changes": {"field": [old, new]}, ...}
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    actor = relationship("Employee")
