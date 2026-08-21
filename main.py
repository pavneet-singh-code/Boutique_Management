from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="PDF Order Analyzer API",
    description="Backend service for processing handwritten order form PDFs."
)

# Essential for MERN stack integration: Allows React frontend to talk to FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    """Health check endpoint to ensure server is online."""
    return {"status": "ok", "message": "PDF Order Analyzer backend is running!"}

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
