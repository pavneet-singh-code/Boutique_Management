from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

import models, schemas
from database import engine, get_db

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

# Test route: Get all orders stored in SQLite
@app.get("/api/v1/orders", response_model=List[schemas.OrderResponse])
def get_orders(db: Session = Depends(get_db)):
    """Fetch all saved orders from SQLite database."""
    orders = db.query(models.Order).all()
    return orders

# Test route: Create a mock order in SQLite
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