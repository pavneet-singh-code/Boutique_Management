"""Helpers that turn hand-written / scanned values into clean data.

Used when orders are saved or edited, so the database only ever holds:
  - order numbers as plain digits (e.g. "261025"), or NULL
  - dates as real dates
  - amounts as whole rupees (int)
"""

import re
from datetime import date

UNCLEAR = "UNCLEAR"

# The scanner often reads the "1" in "261025" as "/" -> "26/025".
_SLASH_FOR_ONE = re.compile(r"^(\d{2})/(\d{3})$")


def blank(value) -> bool:
    """True for None, empty strings and the scanner's "UNCLEAR" marker."""
    if value is None:
        return True
    text = str(value).strip()
    return text == "" or text.upper() == UNCLEAR


def clean_text(value):
    """Trimmed text, or None for empty / UNCLEAR."""
    return None if blank(value) else str(value).strip()


def normalize_order_number(value):
    """Returns (normalized number or None, note about a correction or None)."""
    if blank(value):
        return None, None
    text = re.sub(r"\s+", "", str(value))
    match = _SLASH_FOR_ONE.match(text)
    if match:
        fixed = f"{match.group(1)}1{match.group(2)}"
        return fixed, f"Order number '{text}' was auto-corrected to '{fixed}'"
    return text, None


def parse_date(value):
    """Accepts a date, YYYY-MM-DD, DD/MM/YYYY or DD/MM/YY. Returns a date or None."""
    if isinstance(value, date):
        return value
    if blank(value):
        return None
    text = str(value).strip()

    match = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})", text)
    if match:
        year, month, day = (int(g) for g in match.groups())
    else:
        match = re.match(r"^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$", text)
        if not match:
            return None
        day, month = int(match.group(1)), int(match.group(2))
        year = int(match.group(3))
        if len(match.group(3)) == 2:
            year += 2000
    try:
        return date(year, month, day)
    except ValueError:
        return None


def parse_amount(value):
    """Parses "₹8,000", "8000/-", 8000 into an int. Returns None if not a number."""
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return int(round(value))
    if blank(value):
        return None
    text = re.sub(r"(?i)[₹,\s]|rs\.?|/-", "", str(value))
    try:
        return int(round(float(text)))
    except ValueError:
        return None
