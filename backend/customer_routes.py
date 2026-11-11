"""Customers, bills and boutique settings."""

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

import models
import schemas
import services
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/api/v1", dependencies=[Depends(get_current_user)])


def get_customer_or_404(db: Session, customer_id: int) -> models.Customer:
    customer = db.get(models.Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


def check_phone_free(db: Session, phone, exclude_id=None):
    if phone and services.find_customer_by_phone(db, phone, exclude_id=exclude_id):
        services.conflict("phone_in_use", f"Phone number {phone} already belongs to another customer.")


# ---------------------------------------------------------------- Customers

@router.get("/customers", response_model=List[schemas.CustomerSummary])
def list_customers(db: Session = Depends(get_db)):
    customers = (
        db.query(models.Customer)
        .options(selectinload(models.Customer.orders).selectinload(models.Order.bill))
        .all()
    )
    return [services.customer_summary(c) for c in customers]


@router.get("/customers/{customer_id}", response_model=schemas.CustomerDetail)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = get_customer_or_404(db, customer_id)
    return {
        **services.customer_summary(customer),
        "orders": sorted(customer.orders, key=lambda o: (o.order_date or date.min, o.id)),
        "bills": [services.bill_response(b) for b in sorted(customer.bills, key=lambda b: b.id)],
    }


@router.post("/customers", response_model=schemas.CustomerSummary)
def create_customer(data: schemas.CustomerCreate, db: Session = Depends(get_db)):
    check_phone_free(db, data.phone)
    customer = models.Customer(name=data.name, phone=data.phone, notes=data.notes)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return services.customer_summary(customer)


@router.patch("/customers/{customer_id}", response_model=schemas.CustomerSummary)
def update_customer(customer_id: int, data: schemas.CustomerUpdate, db: Session = Depends(get_db)):
    customer = get_customer_or_404(db, customer_id)
    changes = data.model_dump(exclude_unset=True)
    if "name" in changes and not changes["name"]:
        raise HTTPException(status_code=422, detail="Customer name cannot be empty.")
    if "phone" in changes:
        check_phone_free(db, changes["phone"], exclude_id=customer.id)
    for key, value in changes.items():
        setattr(customer, key, value)
    db.commit()
    db.refresh(customer)
    return services.customer_summary(customer)


@router.post("/customers/{customer_id}/merge", response_model=schemas.CustomerSummary)
def merge_customers(customer_id: int, data: schemas.MergeRequest, db: Session = Depends(get_db)):
    """Moves everything from `other_id` into this customer and removes the other."""
    keep = get_customer_or_404(db, customer_id)
    other = get_customer_or_404(db, data.other_id)
    if keep.id == other.id:
        raise HTTPException(status_code=422, detail="Choose two different customers.")

    # Move through the relationships (not just the ids), so deleting `other`
    # below can't unlink these orders and bills.
    for order in list(other.orders):
        order.customer = keep
    for bill in list(other.bills):
        bill.customer = keep
    if not keep.phone and other.phone:
        phone, other.phone = other.phone, None
        db.flush()
        keep.phone = phone
    if other.notes:
        keep.notes = f"{keep.notes}\n{other.notes}" if keep.notes else other.notes

    db.flush()
    db.delete(other)
    db.commit()
    db.refresh(keep)
    return services.customer_summary(keep)


@router.delete("/customers/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = get_customer_or_404(db, customer_id)
    if customer.orders:
        services.conflict("customer_has_orders", "This customer still has orders.")
    db.delete(customer)
    db.commit()
    return {"message": "Customer deleted"}


# ---------------------------------------------------------------- Bills

def get_bill_or_404(db: Session, bill_id: int) -> models.Bill:
    bill = db.get(models.Bill, bill_id)
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    return bill


@router.get("/bills", response_model=List[schemas.BillResponse])
def list_bills(
    customer_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Bill).options(selectinload(models.Bill.orders))
    if customer_id:
        query = query.filter(models.Bill.customer_id == customer_id)
    if status:
        query = query.filter(models.Bill.status == status)
    return [services.bill_response(b) for b in query.order_by(models.Bill.id.desc()).all()]


@router.get("/bills/{bill_id}", response_model=schemas.BillResponse)
def get_bill(bill_id: int, db: Session = Depends(get_db)):
    return services.bill_response(get_bill_or_404(db, bill_id))


@router.post("/bills", response_model=schemas.BillResponse)
def create_bill(data: schemas.BillCreate, db: Session = Depends(get_db)):
    get_customer_or_404(db, data.customer_id)
    issued_on = data.issued_on or date.today()
    bill = models.Bill(
        bill_number=services.next_bill_number(db, issued_on),
        customer_id=data.customer_id,
        discount=data.discount,
        status="draft",
        issued_on=issued_on,
    )
    db.add(bill)
    db.flush()
    services.set_bill_lines(db, bill, data.lines)
    db.commit()
    return services.bill_response(get_bill_or_404(db, bill.id))


@router.patch("/bills/{bill_id}", response_model=schemas.BillResponse)
def update_bill(bill_id: int, data: schemas.BillUpdate, db: Session = Depends(get_db)):
    bill = get_bill_or_404(db, bill_id)
    if bill.status == "paid":
        services.conflict("bill_paid", "A paid bill can't be changed. Mark it unpaid first.")
    if data.lines is not None:
        if not data.lines:
            raise HTTPException(status_code=422, detail="A bill needs at least one suit.")
        services.set_bill_lines(db, bill, data.lines)
    if data.discount is not None:
        bill.discount = data.discount
    db.commit()
    return services.bill_response(get_bill_or_404(db, bill_id))


@router.post("/bills/{bill_id}/sent", response_model=schemas.BillResponse)
def mark_sent(bill_id: int, db: Session = Depends(get_db)):
    bill = get_bill_or_404(db, bill_id)
    if bill.status == "draft":
        bill.status = "sent"
        db.commit()
    return services.bill_response(get_bill_or_404(db, bill_id))


@router.post("/bills/{bill_id}/paid", response_model=schemas.BillResponse)
def mark_paid(bill_id: int, data: schemas.BillPaid, db: Session = Depends(get_db)):
    bill = get_bill_or_404(db, bill_id)
    services.mark_bill_paid(bill, data.paid_on or date.today())
    db.commit()
    return services.bill_response(get_bill_or_404(db, bill_id))


@router.post("/bills/{bill_id}/unpaid", response_model=schemas.BillResponse)
def mark_unpaid(bill_id: int, db: Session = Depends(get_db)):
    bill = get_bill_or_404(db, bill_id)
    services.mark_bill_unpaid(bill)
    db.commit()
    return services.bill_response(get_bill_or_404(db, bill_id))


@router.delete("/bills/{bill_id}")
def delete_bill(bill_id: int, db: Session = Depends(get_db)):
    bill = get_bill_or_404(db, bill_id)
    if bill.status == "paid":
        services.conflict("bill_paid", "A paid bill can't be deleted. Mark it unpaid first.")
    for order in list(bill.orders):
        order.bill_id = None
        order.final_total = None
        order.billed_date = None
    db.flush()
    db.delete(bill)
    db.commit()
    return {"message": "Bill deleted"}


# ---------------------------------------------------------------- Settings

SETTING_KEYS = list(schemas.AppSettings.model_fields)


@router.get("/settings", response_model=schemas.AppSettings)
def get_settings(db: Session = Depends(get_db)):
    rows = {row.key: row.value for row in db.query(models.AppSetting).all()}
    return {key: rows.get(key) for key in SETTING_KEYS}


@router.put("/settings", response_model=schemas.AppSettings)
def save_settings(data: schemas.AppSettings, db: Session = Depends(get_db)):
    for key, value in data.model_dump().items():
        row = db.get(models.AppSetting, key)
        value = value.strip() if isinstance(value, str) and value.strip() else None
        if row:
            row.value = value
        else:
            db.add(models.AppSetting(key=key, value=value))
    db.commit()
    return get_settings(db)
