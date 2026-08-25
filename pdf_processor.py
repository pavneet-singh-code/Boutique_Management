import pymupdf as fitz
from PIL import Image
import io
from typing import List

def convert_pdf_page_to_image(pdf_bytes: bytes, page_number: int = 0, dpi: int = 300) -> Image.Image:
    """
    Converts a specific PDF page to a high-resolution PIL Image using PyMuPDF.
    DPI defaults to 300 to preserve clarity for handwritten field recognition.
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    
    if page_number >= len(doc):
        raise ValueError(f"Page index {page_number} out of range. Document has {len(doc)} pages.")
    
    page = doc[page_number]
    
    pix = page.get_pixmap(dpi=dpi)
    
    img_bytes = pix.tobytes("png")
    image = Image.open(io.BytesIO(img_bytes))
    
    return image

def convert_all_pdf_pages_to_images(pdf_bytes: bytes, dpi: int = 300) -> List[Image.Image]:
    """Converts every page in a multi-page PDF document to a list of 300 DPI PIL Images."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    images = []
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        pix = page.get_pixmap(dpi=dpi)
        img_bytes = pix.tobytes("png")
        images.append(Image.open(io.BytesIO(img_bytes)))
        
    return images