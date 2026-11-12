import traceback
import csv
import io
import os
import re
import sqlite3
import tempfile
from datetime import date, datetime

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Response
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload
from starlette.background import BackgroundTask
from typing import List

import models, schemas, services
from database import engine, get_db
from pdf_processor import (
    convert_all_pdf_pages_to_images,
    convert_pdf_page_to_image
)
from vision_service import extract_order_from_image
import activity
from auth import OWNER, STAFF, VIEWERS
from auth_routes import router as auth_router
from customer_routes import router as customer_router
from employee_routes import router as employee_router
from work_routes import roll_over_tasks, router as work_router, set_stage
from content_routes import router as content_router


# ---------------------------------------------------------
# DATABASE VERSION CHECK
# Tables are created / changed by migrations, not on startup:
#   cd backend && alembic upgrade head
# The app needs at least migration 0006 (social media content plan).
# 0007 (unique order numbers) runs once duplicates are fixed in the app.
# ---------------------------------------------------------

def current_migration():
    from alembic.runtime.migration import MigrationContext

    with engine.connect() as connection:
        return MigrationContext.configure(connection).get_current_revision()


DB_REVISION = current_migration()

if DB_REVISION not in ("0006", "0007"):
    raise RuntimeError(
        "The database needs to be upgraded. Back up boutique.db, then run "
        "'alembic upgrade head' in the backend folder and reload the app."
    )


app = FastAPI(
    title="PDF Order Analyzer API",
    description="Backend service for processing multi-page Fab_art Studio order form PDFs."
)


# Authentication routes
app.include_router(
    auth_router,
    prefix="/api/v1"
)

# Customers, bills and boutique settings
app.include_router(customer_router)

# Team (employees) and the activity log
app.include_router(employee_router)

# Work: tasks for employees and order stages
app.include_router(work_router)

# Social media content plan
app.include_router(content_router)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # Lets the browser read the backup's file name.
    expose_headers=["Content-Disposition"],
)


# ---------------------------------------------------------
# PUBLIC ENDPOINT
# ---------------------------------------------------------

@app.get("/")
def read_root():
    return {
        "status": "ok",
        "message": "PDF Order Analyzer backend with SQLite is online!"
    }


# ---------------------------------------------------------
# PROTECTED ENDPOINTS
# ---------------------------------------------------------

# 1. Health Check PDF Upload Test
@app.post("/api/v1/health-check-upload")
async def health_check_upload(
    file: UploadFile = File(...),
    current_user: models.Employee = Depends(STAFF)
):
    """Validates uploaded file format before feeding into vision pipelines."""

    if not file.filename.endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="File must be a PDF"
        )

    contents = await file.read()

    return {
        "filename": file.filename,
        "size_bytes": len(contents),
        "status": "ready_for_processing"
    }


# The social media manager sees orders and progress, but not money or phones.
MONEY_FIELDS = (
    "advance_amount", "estimated_total", "final_total", "final_payment_amount",
    "received", "balance",
)


def for_viewer(order, user):
    data = schemas.OrderResponse.model_validate(order)
    if user.role != "social_media":
        return data
    hidden = {field: None for field in MONEY_FIELDS}
    hidden.update(received=0, contact_number=None, payment_state="none")
    if data.customer:
        hidden["customer"] = data.customer.model_copy(update={"phone": None})
    return data.model_copy(update=hidden)


# 2. Fetch all saved orders
@app.get(
    "/api/v1/orders",
    response_model=List[schemas.OrderResponse]
)
def get_orders(
    db: Session = Depends(get_db),
    current_user: models.Employee = Depends(VIEWERS)
):
    """Retrieves all stored boutique orders from SQLite."""
    roll_over_tasks(db)  # unfinished steps move to today

    orders = (
        db.query(models.Order)
        .options(
            selectinload(models.Order.customer),
            selectinload(models.Order.bill).selectinload(models.Bill.orders),
            selectinload(models.Order.tasks).selectinload(models.OrderTask.employee),
            selectinload(models.Order.content),
        )
        .all()
    )

    return [for_viewer(order, current_user) for order in orders]


# 3. Seed dummy data
@app.post(
    "/api/v1/orders/test-seed",
    response_model=schemas.OrderResponse
)
def create_test_order(
    db: Session = Depends(get_db),
    current_user: models.Employee = Depends(OWNER)
):
    """Creates a dummy order to verify database read/write functionality."""

    new_order = models.Order(
        filename="sample_order_001.pdf",
        order_number="26833",
        customer_name="Sunita Devi",
        additional_info="(Vandana)",
        order_date=date(2026, 8, 16),
        deliver_date=date(2026, 8, 27),
        what_to_design="Beta Ka Salwar",
        needs_review=False
    )

    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    return new_order


# 4. Convert PDF page to image
@app.post("/api/v1/convert-pdf-to-image")
async def render_pdf_as_image(
    file: UploadFile = File(...),
    page_number: int = 0,
    current_user: models.Employee = Depends(STAFF)
):
    """Converts a chosen PDF page into a high-resolution PNG."""

    if not file.filename.endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="File must be a PDF"
        )

    try:
        pdf_bytes = await file.read()

        pil_image = convert_pdf_page_to_image(
            pdf_bytes,
            page_number=page_number,
            dpi=300
        )

        img_io = io.BytesIO()
        pil_image.save(img_io, "PNG")
        img_io.seek(0)

        return StreamingResponse(
            img_io,
            media_type="image/png"
        )

    except ValueError as ve:
        raise HTTPException(
            status_code=400,
            detail=str(ve)
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# 5. Analyze uploaded order PDF
@app.post(
    "/api/v1/analyze-order-pdf",
    response_model=List[schemas.OrderScan]
)
async def analyze_order_pdf(
    file: UploadFile = File(...),
    current_user: models.Employee = Depends(STAFF)
):
    """
    Converts every page in an uploaded PDF to high-resolution images,
    runs Gemini analysis on each page, and returns the extracted
    order data without saving anything to SQLite.
    """

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="File must be a PDF"
        )

    try:
        print("STEP 1: Reading PDF", flush=True)
        pdf_bytes = await file.read()

        # Convert every page
        print("STEP 2: Converting PDF pages", flush=True)
        page_images = convert_all_pdf_pages_to_images(
            pdf_bytes,
            dpi=300
        )

        print(f"STEP 3: Converted {len(page_images)} pages", flush=True)
        extracted_orders = []

        # Check proxy environment variables
        import os

        for name in (
            "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY",
            "http_proxy", "https_proxy", "all_proxy", "no_proxy"
        ):
            print(
                f"WEB APP {name}:",
                "SET" if os.getenv(name) else "NOT SET",
                flush=True
            )

        # Analyze every page
        for index, image in enumerate(page_images):
            print(f"STEP 4: Calling Gemini for page {index + 1}", flush=True)

            extracted_data = extract_order_from_image(image)
            print(f"STEP 5: Gemini completed page {index + 1}", flush=True)

            order_data = schemas.OrderScan(
                filename=f"{file.filename} (Page {index + 1})",
                **extracted_data.model_dump()
            )

            extracted_orders.append(order_data)

        return extracted_orders

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

# 6. Save reviewed orders
@app.post(
    "/api/v1/orders/bulk-save",
    response_model=List[schemas.OrderResponse]
)
def bulk_save_orders(
    orders: List[schemas.OrderCreate],
    db: Session = Depends(get_db),
    current_user: models.Employee = Depends(STAFF)
):
    """
    Saves reviewed orders to SQLite.

    Orders are only saved after the user has reviewed,
    edited, or deleted pages on the frontend.
    """

    if not orders:
        raise HTTPException(
            status_code=400,
            detail="No orders provided"
        )

    if any(not order.order_number for order in orders):
        raise HTTPException(
            status_code=422,
            detail={
                "code": "order_number_required",
                "numbers": [],
                "message": "Every order needs an order number.",
            },
        )

    duplicates = find_duplicate_numbers(db, [order.order_number for order in orders])
    if duplicates:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "duplicate_order_numbers",
                "numbers": duplicates,
                "message": "These order numbers are already used: " + ", ".join(duplicates),
            },
        )

    saved_orders = []

    try:
        for order in orders:
            values = order.model_dump()
            customer = services.resolve_customer(
                db,
                customer_id=values.pop("customer_id"),
                name=values.get("customer_name"),
                phone=values.get("contact_number"),
            )
            db_order = models.Order(**values, customer_id=customer.id if customer else None)
            db.add(db_order)
            db.flush()
            activity.log(
                db, current_user, "order", db_order.id, "created",
                label=activity.order_label(db_order),
                source="upload" if db_order.filename else "manual",
                file=db_order.filename,
            )
            saved_orders.append(db_order)

        # Commit everything together
        db.commit()

        # Refresh to get IDs and created_at
        for order in saved_orders:
            db.refresh(order)

        return saved_orders

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail={
                "code": "duplicate_order_numbers",
                "numbers": [],
                "message": "An order number is already used.",
            },
        )

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to save orders: {str(e)}"
        )


def find_duplicate_numbers(db: Session, numbers, exclude_id=None):
    """Order numbers that are repeated in `numbers` or already saved."""
    seen, repeated = set(), set()
    for number in numbers:
        if not number:
            continue
        if number in seen:
            repeated.add(number)
        seen.add(number)
    if seen:
        query = db.query(models.Order.order_number).filter(
            models.Order.order_number.in_(seen)
        )
        if exclude_id is not None:
            query = query.filter(models.Order.id != exclude_id)
        repeated.update(row[0] for row in query.all())
    return sorted(repeated)


# Order-number / data problems for the "Order number check" screen
ORDER_NUMBER_FORMAT = re.compile(r"^\d{6}$")


@app.get("/api/v1/orders/data-check")
def data_check(
    db: Session = Depends(get_db),
    current_user: models.Employee = Depends(STAFF),
):
    """Lists the problems that must be fixed before order numbers can be
    made unique, plus dates that look wrong."""

    orders = db.query(models.Order).order_by(models.Order.id).all()

    def as_dict(order):
        return schemas.OrderResponse.model_validate(order).model_dump(mode="json")

    groups = {}
    for order in orders:
        if order.order_number:
            groups.setdefault(order.order_number, []).append(order)

    duplicates = [
        {"order_number": number, "orders": [as_dict(o) for o in group]}
        for number, group in sorted(groups.items())
        if len(group) > 1
    ]
    missing = [as_dict(o) for o in orders if not o.order_number]
    unusual = [
        as_dict(o)
        for o in orders
        if o.order_number and not ORDER_NUMBER_FORMAT.match(o.order_number)
    ]

    date_problems = []
    for order in orders:
        reasons = []
        saved_year = order.created_at.year if order.created_at else datetime.now().year
        for field in ("order_date", "deliver_date"):
            value = getattr(order, field)
            if value and abs(value.year - saved_year) > 1:
                reasons.append(f"{field}_year")
        if order.order_date and order.deliver_date and order.deliver_date < order.order_date:
            reasons.append("delivery_before_order")
        if order.import_notes and "could not be read" in order.import_notes:
            reasons.append("unreadable_date")
        if reasons:
            date_problems.append({"order": as_dict(order), "reasons": reasons})

    return {
        "unique_enforced": DB_REVISION == "0007",
        "duplicates": duplicates,
        "missing": missing,
        "unusual_format": unusual,
        "date_problems": date_problems,
        "blocking": len(duplicates) + len(missing),
    }


# Download a consistent copy of the whole database (for backups on your PC)
@app.get("/api/v1/admin/backup")
def download_backup(current_user: models.Employee = Depends(OWNER), db: Session = Depends(get_db)):
    db_path = engine.url.database
    if not db_path or not os.path.exists(db_path):
        raise HTTPException(status_code=500, detail="Database file not found")

    handle, temp_path = tempfile.mkstemp(suffix=".db")
    os.close(handle)
    source = sqlite3.connect(db_path)
    target = sqlite3.connect(temp_path)
    try:
        source.backup(target)  # consistent copy, even while the app is writing
    finally:
        target.close()
        source.close()

    activity.log(db, current_user, "backup", None, "downloaded")
    db.commit()

    stamp = datetime.now().strftime("%Y-%m-%d_%H-%M")
    return FileResponse(
        temp_path,
        media_type="application/octet-stream",
        filename=f"boutique-backup-{stamp}.db",
        background=BackgroundTask(os.remove, temp_path),
    )


# 7. Export orders as CSV
@app.get("/api/v1/orders/export")
def export_orders_csv(
    db: Session = Depends(get_db),
    current_user: models.Employee = Depends(STAFF)
):
    """Exports all stored order records as a downloadable CSV."""

    orders = db.query(models.Order).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # CSV header
    writer.writerow([
        "ID",
        "Filename",
        "Order Number",
        "Customer",
        "Name On Order",
        "Additional Info",
        "Contact Number",
        "Order Date",
        "Deliver Date",
        "What To Design",
        "Estimated Total",
        "Advance Amount",
        "Advance Date",
        "Bill Number",
        "Final Total",
        "Billed Date",
        "Final Payment",
        "Final Payment Date",
        "Received",
        "Balance",
        "Payment State",
        "Needs Review",
        "Created At",
    ])

    # CSV rows
    for o in orders:
        writer.writerow([
            o.id,
            o.filename,
            o.order_number,
            o.customer.name if o.customer else "",
            o.customer_name,
            o.additional_info,
            o.contact_number,
            o.order_date,
            o.deliver_date,
            o.what_to_design,
            o.estimated_total,
            o.advance_amount,
            o.advance_date,
            o.bill_number,
            o.final_total,
            o.billed_date,
            o.final_payment_amount,
            o.final_payment_date,
            o.received,
            o.balance,
            o.payment_state,
            o.needs_review,
            o.created_at,
        ])

    output.seek(0)

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition":
                "attachment; filename=boutique_orders.csv"
        }
    )


# 8. Fetch a single order
@app.get(
    "/api/v1/orders/{order_id}",
    response_model=schemas.OrderResponse
)
def get_order_by_id(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.Employee = Depends(VIEWERS)
):
    """Retrieves full details for a specific order."""
    roll_over_tasks(db)

    order = (
        db.query(models.Order)
        .filter(models.Order.id == order_id)
        .first()
    )

    if not order:
        raise HTTPException(
            status_code=404,
            detail=f"Order with ID {order_id} not found"
        )

    return for_viewer(order, current_user)


# 9. Update an order
@app.patch(
    "/api/v1/orders/{order_id}",
    response_model=schemas.OrderResponse
)
def update_order_field(
    order_id: int,
    order_update: schemas.OrderUpdate,
    db: Session = Depends(get_db),
    current_user: models.Employee = Depends(STAFF)
):
    """Updates one or multiple fields for a saved order."""

    db_order = (
        db.query(models.Order)
        .filter(models.Order.id == order_id)
        .first()
    )

    if not db_order:
        raise HTTPException(
            status_code=404,
            detail=f"Order with ID {order_id} not found"
        )

    # Only update fields actually provided
    update_data = order_update.model_dump(
        exclude_unset=True
    )

    if "order_number" in update_data and not update_data["order_number"]:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "order_number_required",
                "numbers": [],
                "message": "Every order needs an order number.",
            },
        )

    if update_data.get("customer_id"):
        services.resolve_customer(db, customer_id=update_data["customer_id"])
    if "customer_id" in update_data and db_order.bill_id and update_data["customer_id"] != db_order.customer_id:
        services.conflict(
            "order_already_billed",
            "This suit is on a bill. Remove it from the bill before changing the customer.",
        )

    new_number = update_data.get("order_number")
    if new_number and new_number != db_order.order_number:
        if find_duplicate_numbers(db, [new_number], exclude_id=order_id):
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "duplicate_order_numbers",
                    "numbers": [new_number],
                    "message": f"Order number {new_number} is already used.",
                },
            )

    new_status = update_data.pop("status", None)
    before = activity.snapshot(db_order, update_data.keys())
    for key, value in update_data.items():
        setattr(db_order, key, value)
    if update_data:
        activity.log(
            db, current_user, "order", db_order.id, "updated",
            label=activity.order_label(db_order),
            changes=activity.changes(before, activity.snapshot(db_order, update_data.keys())),
        )
    if new_status:
        set_stage(db, current_user, db_order, new_status)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail={
                "code": "order_number_required",
                "numbers": [],
                "message": "Every order needs its own order number.",
            },
        )
    db.refresh(db_order)

    return db_order


# 10. Delete an order
@app.delete("/api/v1/orders/{order_id}")
def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.Employee = Depends(OWNER),
):
    order = (
        db.query(models.Order)
        .filter(models.Order.id == order_id)
        .first()
    )

    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.bill_id:
        services.conflict(
            "order_already_billed",
            f"This suit is on bill {order.bill.bill_number}. Remove it from the bill first.",
        )

    activity.log(
        db, current_user, "order", order.id, "deleted",
        label=activity.order_label(order),
        design=order.what_to_design,
    )
    db.delete(order)
    db.commit()

    return {"message": "Order deleted successfully"}
