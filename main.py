import io
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

import models, schemas
from database import engine, get_db
from pdf_processor import convert_pdf_page_to_image
from vision_service import extract_order_from_image

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PDF Order Analyzer API",
    description="Backend service for processing Fab_art Studio handwritten order form PDFs."
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

# Endpoint 3: Seed dummy data into database (updated for flat schema)
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

# Endpoint 4: Render a PDF page as a high-res PNG
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

# Endpoint 5: Core Extraction Pipeline (PDF -> 300 DPI Image -> Gemini 2.5 Flash -> SQLite)
@app.post("/api/v1/analyze-order-pdf", response_model=schemas.OrderResponse)
async def analyze_and_save_order(
    file: UploadFile = File(...), 
    page_number: int = 0,
    db: Session = Depends(get_db)
):
    """Converts a PDF page to image, extracts text with Gemini, and saves to SQLite."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        # Step A: Read raw binary upload
        pdf_bytes = await file.read()
        
        # Step B: Render high-resolution image via PyMuPDF (300 DPI)
        page_image = convert_pdf_page_to_image(pdf_bytes, page_number=page_number, dpi=300)
        
        # Step C: Send image to Gemini API for field recognition
        extracted_data = extract_order_from_image(page_image)
        
        # Step D: Unpack extracted data, attach filename, and store in SQLite
        db_order = models.Order(
            filename=file.filename,
            **extracted_data.model_dump()
        )
        db.add(db_order)
        db.commit()
        db.refresh(db_order)
        
        return db_order

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))