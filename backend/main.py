import csv
import io

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Response
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

import models, schemas
from database import engine, get_db
from pdf_processor import (
    convert_all_pdf_pages_to_images,
    convert_pdf_page_to_image
)
from vision_service import extract_order_from_image
from auth import get_current_user
from auth_routes import router as auth_router


# Automatically create or sync SQLite tables on startup
models.Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="PDF Order Analyzer API",
    description="Backend service for processing multi-page Fab_art Studio order form PDFs."
)


# Authentication routes
app.include_router(
    auth_router,
    prefix="/api/v1"
)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    current_user: str = Depends(get_current_user)
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


# 2. Fetch all saved orders
@app.get(
    "/api/v1/orders",
    response_model=List[schemas.OrderResponse]
)
def get_orders(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Retrieves all stored boutique orders from SQLite."""

    orders = db.query(models.Order).all()

    return orders


# 3. Seed dummy data
@app.post(
    "/api/v1/orders/test-seed",
    response_model=schemas.OrderResponse
)
def create_test_order(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Creates a dummy order to verify database read/write functionality."""

    new_order = models.Order(
        filename="sample_order_001.pdf",
        order_number="26833",
        customer_name="Sunita Devi",
        additional_info="(Vandana)",
        order_date="16/08/26",
        deliver_date="27/08/26",
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
    current_user: str = Depends(get_current_user)
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
    response_model=List[schemas.OrderCreate]
)
async def analyze_order_pdf(
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user)
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
        pdf_bytes = await file.read()

        # Convert every page
        page_images = convert_all_pdf_pages_to_images(
            pdf_bytes,
            dpi=300
        )

        extracted_orders = []

        # Analyze every page
        for index, image in enumerate(page_images):

            extracted_data = extract_order_from_image(image)

            order_data = schemas.OrderCreate(
                filename=f"{file.filename} (Page {index + 1})",
                **extracted_data.model_dump()
            )

            extracted_orders.append(order_data)

        return extracted_orders

    except Exception as e:
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
    current_user: str = Depends(get_current_user)
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

    saved_orders = []

    try:
        for order in orders:

            db_order = models.Order(
                filename=order.filename,
                order_number=order.order_number,
                customer_name=order.customer_name,
                additional_info=order.additional_info,
                order_date=order.order_date,
                deliver_date=order.deliver_date,
                contact_number=order.contact_number,
                what_to_design=order.what_to_design,
                advance_payment=order.advance_payment,
                total_amount=order.total_amount,
                needs_review=order.needs_review,
            )

            db.add(db_order)
            saved_orders.append(db_order)

        # Commit everything together
        db.commit()

        # Refresh to get IDs and created_at
        for order in saved_orders:
            db.refresh(order)

        return saved_orders

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to save orders: {str(e)}"
        )

# 7. Export orders as CSV
@app.get("/api/v1/orders/export")
def export_orders_csv(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
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
        "Customer Name",
        "Additional Info",
        "Order Date",
        "Deliver Date",
        "Contact Number",
        "What To Design",
        "Advance Payment",
        "Total Amount",
        "Needs Review",
        "Created At"
    ])

    # CSV rows
    for o in orders:
        writer.writerow([
            o.id,
            o.filename,
            o.order_number,
            o.customer_name,
            o.additional_info,
            o.order_date,
            o.deliver_date,
            o.contact_number,
            o.what_to_design,
            o.advance_payment,
            o.total_amount,
            o.needs_review,
            o.created_at
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
    current_user: str = Depends(get_current_user)
):
    """Retrieves full details for a specific order."""

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

    return order


# 9. Update an order
@app.patch(
    "/api/v1/orders/{order_id}",
    response_model=schemas.OrderResponse
)
def update_order_field(
    order_id: int,
    order_update: schemas.OrderUpdate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
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

    for key, value in update_data.items():
        setattr(db_order, key, value)

    db.commit()
    db.refresh(db_order)

    return db_order