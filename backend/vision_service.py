
import io
import os
from dotenv import load_dotenv
from PIL import Image
from google import genai
from google.genai import types
from schemas import OrderFormExtraction

# Load environment variables from .env file
load_dotenv()

# Configure the outbound proxy for PythonAnywhere
os.environ["HTTP_PROXY"] = "http://proxy.server:3128"
os.environ["HTTPS_PROXY"] = "http://proxy.server:3128"
os.environ["http_proxy"] = "http://proxy.server:3128"
os.environ["https_proxy"] = "http://proxy.server:3128"

# Retrieve API key
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY is not set in your .env file")

# Initialize Gemini client after configuring the proxy
client = genai.Client(api_key=api_key)


def extract_order_from_image(pil_image: Image.Image) -> OrderFormExtraction:
    """
    Sends the 300 DPI page image to Gemini 2.5 Flash.
    Uses structured output to extract handwritten values into a Pydantic model.
    """
    buffer = io.BytesIO()
    pil_image.save(buffer, format="PNG")
    image_bytes = buffer.getvalue()

    prompt = """
    You are an expert handwritten text reader for Fab_art Studio order forms.
    Analyze the uploaded full-page order form image and extract all handwritten details into the requested JSON structure.

    Guidelines:
    - Extract ONLY the text written by hand in each field.
    - Ignore printed form template titles (e.g., ignore "NAME -", "ORDER DATE -").
    - If a handwritten field is missing or completely illegible, set its value to "UNCLEAR".
    - If any field is marked "UNCLEAR", set 'needs_review' to true.
    """

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
            prompt
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=OrderFormExtraction,
            temperature=0.1
        )
    )

    return OrderFormExtraction.model_validate_json(response.text)
