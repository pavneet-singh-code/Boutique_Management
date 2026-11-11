"""Customer matching and bill calculations shared by the API routes."""

import re
from datetime import date

from fastapi import HTTPException
from sqlalchemy.orm import Session

import models
import schemas


def name_key(name):
    return re.sub(r"[^a-z0-9]", "", (name or "").lower())


def phone_key(phone):
    digits = re.sub(r"\D", "", phone or "")
    return digits[-10:] if len(digits) >= 8 else None


def conflict(code, message, **extra):
    raise HTTPException(status_code=409, detail={"code": code, "message": message, "numbers": [], **extra})


# ---------------------------------------------------------------- Customers

def find_customer_by_phone(db: Session, phone, exclude_id=None):
    key = phone_key(phone)
    if not key:
        return None
    for customer in db.query(models.Customer).filter(models.Customer.phone.isnot(None)).all():
        if customer.id != exclude_id and phone_key(customer.phone) == key:
            return customer
    return None


def resolve_customer(db: Session, customer_id=None, name=None, phone=None):
    """Which customer an order belongs to:
    the chosen customer, else the one with the same phone, else the one with
    exactly the same name, else a new customer. Orders without a name get none."""
    if customer_id:
        customer = db.get(models.Customer, customer_id)
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        if phone and not customer.phone and not find_customer_by_phone(db, phone, exclude_id=customer.id):
            customer.phone = phone
        return customer

    by_phone = find_customer_by_phone(db, phone)
    if by_phone:
        return by_phone

    key = name_key(name)
    if not key:
        return None
    same_name = [c for c in db.query(models.Customer).all() if name_key(c.name) == key]
    if len(same_name) == 1:
        customer = same_name[0]
        if phone and not customer.phone:
            customer.phone = phone
        return customer

    customer = models.Customer(name=name.strip(), phone=phone or None)
    db.add(customer)
    db.flush()
    return customer


def order_value(order):
    return order.final_total if order.final_total is not None else (order.estimated_total or 0)


def customer_summary(customer: models.Customer) -> dict:
    orders = customer.orders
    dates = [o.order_date for o in orders if o.order_date]
    return {
        "id": customer.id,
        "name": customer.name,
        "phone": customer.phone,
        "notes": customer.notes,
        "order_count": len(orders),
        "last_order_date": max(dates) if dates else None,
        "total_value": sum(order_value(o) for o in orders),
        "received": sum(o.received for o in orders),
        "balance_due": sum(o.balance or 0 for o in orders if o.payment_state == "billed"),
        "unbilled_count": sum(1 for o in orders if o.bill_id is None),
        "created_at": customer.created_at,
    }


# ---------------------------------------------------------------- Bills

def next_bill_number(db: Session, on: date) -> str:
    prefix = f"B-{on.strftime('%y%m')}-"
    numbers = [
        int(b.bill_number.rsplit("-", 1)[1])
        for b in db.query(models.Bill).filter(models.Bill.bill_number.like(f"{prefix}%")).all()
        if b.bill_number.rsplit("-", 1)[1].isdigit()
    ]
    return f"{prefix}{(max(numbers) + 1 if numbers else 1):03d}"


def bill_response(bill: models.Bill) -> dict:
    orders = sorted(bill.orders, key=lambda o: (o.order_date or date.min, o.id))
    lines = [
        {
            "order_id": o.id,
            "order_number": o.order_number,
            "what_to_design": o.what_to_design,
            "order_date": o.order_date,
            "final_total": o.final_total or 0,
            "advance_amount": o.advance_amount or 0,
        }
        for o in orders
    ]
    subtotal = sum(line["final_total"] for line in lines)
    advance_total = sum(line["advance_amount"] for line in lines)
    discount = min(bill.discount or 0, subtotal)
    return {
        "id": bill.id,
        "bill_number": bill.bill_number,
        "customer": schemas.CustomerBrief.model_validate(bill.customer).model_dump(),
        "discount": discount,
        "status": bill.status,
        "issued_on": bill.issued_on,
        "paid_on": bill.paid_on,
        "lines": lines,
        "subtotal": subtotal,
        "advance_total": advance_total,
        "amount_due": max(0, subtotal - discount - advance_total),
        "created_at": bill.created_at,
    }


def set_bill_lines(db: Session, bill: models.Bill, lines):
    """Puts exactly these suits (with their final prices) on the bill."""
    wanted = {line.order_id: line.final_total for line in lines}
    if len(wanted) != len(lines):
        raise HTTPException(status_code=422, detail="The same suit is on the bill twice.")

    orders = db.query(models.Order).filter(models.Order.id.in_(wanted)).all()
    if len(orders) != len(wanted):
        raise HTTPException(status_code=404, detail="One of the orders was not found.")

    for order in orders:
        if order.customer_id != bill.customer_id:
            conflict(
                "order_other_customer",
                f"Order {order.order_number or order.id} belongs to another customer.",
            )
        if order.bill_id and order.bill_id != bill.id:
            conflict(
                "order_already_billed",
                f"Order {order.order_number or order.id} is already on bill {order.bill.bill_number}.",
            )

    # Suits taken off the bill go back to "not billed".
    for order in list(bill.orders):
        if order.id not in wanted:
            order.bill_id = None
            order.final_total = None
            order.billed_date = None

    for order in orders:
        order.bill_id = bill.id
        order.final_total = wanted[order.id]
        order.billed_date = bill.issued_on


def mark_bill_paid(bill: models.Bill, paid_on: date):
    """Records payment step 3 on every suit of the bill."""
    shares = models.split_discount(bill)
    for order in bill.orders:
        owed = (order.final_total or 0) - shares.get(order.id, 0) - (order.advance_amount or 0)
        order.final_payment_amount = max(0, owed)
        order.final_payment_date = paid_on
    bill.status = "paid"
    bill.paid_on = paid_on


def mark_bill_unpaid(bill: models.Bill):
    for order in bill.orders:
        order.final_payment_amount = None
        order.final_payment_date = None
    bill.status = "sent"
    bill.paid_on = None
