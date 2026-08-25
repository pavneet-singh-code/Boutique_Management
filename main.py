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

# Create SQLite tables on startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PDF Order Analyzer API",
    description="Backend service for processing handwritten order form PDFs."
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
    return {"status": "ok", "message": "PDF Order Analyzer backend with SQLite is running!"}

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

# Endpoint 2: Get all orders stored in SQLite
@app.get("/api/v1/orders", response_model=List[schemas.OrderResponse])
def get_orders(db: Session = Depends(get_db)):
    """Fetch all saved orders from SQLite database."""
    orders = db.query(models.Order).all()
    return orders

# Endpoint 3: Create a dummy order in SQLite
@app.post("/api/v1/orders/test-seed", response_model=schemas.OrderResponse)
def create_test_order(db: Session = Depends(get_db)):
    """Creates a dummy order in SQLite to test database operations."""
    new_order = models.Order(filename="sample_order_001.pdf", needs_review=True)
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    field1 = models.OrderField(
        order_id=new_order.id,
        field_name="Customer Name",
        extracted_text="Sunita Devi",
        low_confidence=False
    )
    field2 = models.OrderField(
        order_id=new_order.id,
        field_name="Phone Number",
        extracted_text="UNCLEAR",
        low_confidence=True
    )
    
    db.add_all([field1, field2])
    db.commit()
    db.refresh(new_order)
    return new_order

@app.post("/api/v1/convert-pdf-to-image")
async def render_pdf_as_image(file: UploadFile = File(...), page_number: int = 0):
    """Converts a chosen page of an uploaded PDF into a 300 DPI PNG image."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        pdf_bytes = await file.read()
        pil_image = convert_pdf_page_to_image(pdf_bytes, page_number=page_number, dpi=300)
        
        # Save PIL Image into an in-memory byte buffer
        img_io = io.BytesIO()
        pil_image.save(img_io, 'PNG')
        img_io.seek(0)
        
        # Stream the rendered image back to client
        return StreamingResponse(img_io, media_type="image/png")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/analyze-order-pdf", response_model=schemas.OrderFormExtraction)
async def analyze_order_pdf(file: UploadFile = File(...), page_number: int = 0):
    """Converts a PDF page to image and uses Gemini 2.5 Vision to extract form data."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        # Step A: Read raw binary upload
        pdf_bytes = await file.read()
        
        # Step B: Render high-resolution image via PyMuPDF (300 DPI)
        page_image = convert_pdf_page_to_image(pdf_bytes, page_number=page_number, dpi=300)
        
        # Step C: Send image to Gemini API for field recognition
        extracted_data = extract_order_from_image(page_image)
        
        return extracted_data

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
