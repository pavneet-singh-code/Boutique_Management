import csv
import io
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Response
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

import models, schemas
from database import engine, get_db
from pdf_processor import convert_all_pdf_pages_to_images, convert_pdf_page_to_image
from vision_service import extract_order_from_image

# Automatically create or sync SQLite tables on startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PDF Order Analyzer API",
    description="Backend service for processing multi-page Fab_art Studio order form PDFs."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "PDF Order Analyzer backend with SQLite is online!"}

# Endpoint 1: Health Check PDF Upload Test
@app.post("/api/v1/health-check-upload")
async def health_check_upload(file: UploadFile = File(...)):
    """Validates uploaded file format before feeding into vision pipelines."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    contents = await file.read()
    
    return {
        "filename": file.filename,
        "size_bytes": len(contents),
        "status": "ready_for_processing"
    }

# Endpoint 2: Fetch all saved orders from SQLite
@app.get("/api/v1/orders", response_model=List[schemas.OrderResponse])
def get_orders(db: Session = Depends(get_db)):
    """Retrieves all stored boutique orders from the SQLite database."""
    orders = db.query(models.Order).all()
    return orders

# Endpoint 3: Seed dummy data into database
@app.post("/api/v1/orders/test-seed", response_model=schemas.OrderResponse)
def create_test_order(db: Session = Depends(get_db)):
    """Creates a dummy order in SQLite to verify database read/write functionality."""
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

# Endpoint 4: Render a single page as high-res PNG (useful for UI previews)
@app.post("/api/v1/convert-pdf-to-image")
async def render_pdf_as_image(file: UploadFile = File(...), page_number: int = 0):
    """Converts a chosen page of an uploaded PDF into a 300 DPI PNG image for inspection."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        pdf_bytes = await file.read()
        pil_image = convert_pdf_page_to_image(pdf_bytes, page_number=page_number, dpi=300)
        
        img_io = io.BytesIO()
        pil_image.save(img_io, 'PNG')
        img_io.seek(0)
        
        return StreamingResponse(img_io, media_type="image/png")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint 5: Core Multi-Page Pipeline (Analyzes ALL pages in the uploaded PDF)
@app.post("/api/v1/analyze-order-pdf", response_model=List[schemas.OrderResponse])
async def analyze_and_save_order(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    """
    Converts EVERY page in an uploaded PDF to high-res images,
    runs Gemini analysis on each page, and saves every extracted order form to SQLite.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        pdf_bytes = await file.read()
        
        # 1. Render ALL pages to high-res images automatically
        page_images = convert_all_pdf_pages_to_images(pdf_bytes, dpi=300)
        
        saved_orders = []
        
        # 2. Iterate through every page and process through Gemini + DB
        for index, image in enumerate(page_images):
            extracted_data = extract_order_from_image(image)
            
            db_order = models.Order(
                filename=f"{file.filename} (Page {index + 1})",
                **extracted_data.model_dump()
            )
            db.add(db_order)
            db.commit()
            db.refresh(db_order)
            
            saved_orders.append(db_order)
        
        return saved_orders

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# 6. Export orders as CSV download
@app.get("/api/v1/orders/export")
def export_orders_csv(db: Session = Depends(get_db)):
    """Exports all stored order records as a downloadable CSV file."""
    orders = db.query(models.Order).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Write CSV Header
    writer.writerow([
        "ID", "Filename", "Order Number", "Customer Name", "Additional Info",
        "Order Date", "Deliver Date", "Contact Number", "What To Design",
        "Advance Payment", "Total Amount", "Needs Review", "Created At"
    ])

    # Write Data Rows
    for o in orders:
        writer.writerow([
            o.id, o.filename, o.order_number, o.customer_name, o.additional_info,
            o.order_date, o.deliver_date, o.contact_number, o.what_to_design,
            o.advance_payment, o.total_amount, o.needs_review, o.created_at
        ])

    output.seek(0)
    
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=boutique_orders.csv"}
    )

# 7. Fetch full details of a single order by ID
@app.get("/api/v1/orders/{order_id}", response_model=schemas.OrderResponse)
def get_order_by_id(order_id: int, db: Session = Depends(get_db)):
    """Retrieves full details for a specific order by ID."""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order with ID {order_id} not found")
    return order

# 8. Correct/Update fields for a specific order
@app.patch("/api/v1/orders/{order_id}", response_model=schemas.OrderResponse)
def update_order_field(
    order_id: int,
    order_update: schemas.OrderUpdate,
    db: Session = Depends(get_db)
):
    """Updates one or multiple handwritten fields for a saved order."""
    db_order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail=f"Order with ID {order_id} not found")

    # Exclude unset fields so we only update fields provided in request body
    update_data = order_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_order, key, value)

    db.commit()
    db.refresh(db_order)
    return db_order