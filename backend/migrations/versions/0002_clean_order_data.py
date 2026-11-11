"""Clean existing order data and switch to proper column types.

- Order numbers: trimmed; "26/025" -> "261025" (scanner read "1" as "/");
  "UNCLEAR" / empty -> NULL.
- Dates: "02/10/26" and "2026-10-02" -> real dates. Unreadable dates
  (e.g. "19/26/10") become NULL, the order is flagged for review and the
  original text is kept in import_notes.
- Amounts: "8,000" -> 8000 (whole rupees).
- "UNCLEAR" in text fields -> NULL (order flagged for review).
- New column import_notes.

The clean-up logic is copied here (not imported) so this migration keeps
doing exactly the same thing even if the app code changes later.

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-11
"""
import re
from datetime import date

from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def _blank(value):
    return value is None or str(value).strip() == "" or str(value).strip().upper() == "UNCLEAR"


def _number(value):
    if _blank(value):
        return None, None
    text = re.sub(r"\s+", "", str(value))
    match = re.match(r"^(\d{2})/(\d{3})$", text)
    if match:
        fixed = f"{match.group(1)}1{match.group(2)}"
        return fixed, f"Order number '{text}' was auto-corrected to '{fixed}'"
    return text, None


def _date(value):
    if _blank(value):
        return None
    text = str(value).strip()
    match = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})", text)
    if match:
        year, month, day = (int(g) for g in match.groups())
    else:
        match = re.match(r"^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$", text)
        if not match:
            return None
        day, month, year = int(match.group(1)), int(match.group(2)), int(match.group(3))
        if len(match.group(3)) == 2:
            year += 2000
    try:
        return date(year, month, day).isoformat()
    except ValueError:
        return None


def _amount(value):
    if _blank(value):
        return None
    text = re.sub(r"(?i)[₹,\s]|rs\.?|/-", "", str(value))
    try:
        return int(round(float(text)))
    except ValueError:
        return None


TEXT_FIELDS = ("customer_name", "additional_info", "contact_number", "what_to_design")


def upgrade():
    bind = op.get_bind()
    rows = bind.execute(sa.text("SELECT * FROM orders")).mappings().all()
    cleaned = {}  # id -> (dates, notes), written after the new columns exist

    for row in rows:
        notes = []
        review = bool(row["needs_review"])
        values = {}

        number, note = _number(row["order_number"])
        values["order_number"] = number
        if note:
            notes.append(note)
        if row["order_number"] is not None and str(row["order_number"]).strip().upper() == "UNCLEAR":
            review = True

        for field in TEXT_FIELDS:
            raw = row[field]
            if raw is not None and str(raw).strip().upper() == "UNCLEAR":
                review = True
            values[field] = None if _blank(raw) else str(raw).strip()

        dates = {}
        for field in ("order_date", "deliver_date"):
            raw = row[field]
            parsed = _date(raw)
            if parsed is None and not _blank(raw):
                notes.append(f"{field} '{raw}' could not be read")
                review = True
            if raw is not None and str(raw).strip().upper() == "UNCLEAR":
                review = True
            dates[field] = parsed

        for field in ("advance_payment", "total_amount"):
            raw = row[field]
            parsed = _amount(raw)
            if parsed is None and not _blank(raw):
                notes.append(f"{field} '{raw}' is not a number")
                review = True
            if raw is not None and str(raw).strip().upper() == "UNCLEAR":
                review = True
            values[field] = None if parsed is None else str(parsed)

        values["needs_review"] = review
        assignments = ", ".join(f"{key} = :{key}" for key in values)
        bind.execute(
            sa.text(f"UPDATE orders SET {assignments} WHERE id = :id"),
            {**values, "id": row["id"]},
        )
        cleaned[row["id"]] = (dates, "; ".join(notes) or None)

    # Amounts: plain digits now, so SQLite's CAST to INTEGER during the table
    # rebuild is exact. Dates get brand-new columns instead, because a CAST
    # to DATE would turn "2026-10-02" into the number 2026.
    with op.batch_alter_table("orders") as batch:
        batch.add_column(sa.Column("import_notes", sa.Text(), nullable=True))
        batch.add_column(sa.Column("order_date_clean", sa.Date(), nullable=True))
        batch.add_column(sa.Column("deliver_date_clean", sa.Date(), nullable=True))
        batch.alter_column("advance_payment", existing_type=sa.String(), type_=sa.Integer())
        batch.alter_column("total_amount", existing_type=sa.String(), type_=sa.Integer())

    for order_id, (dates, notes) in cleaned.items():
        bind.execute(
            sa.text(
                "UPDATE orders SET order_date_clean = :order_date, "
                "deliver_date_clean = :deliver_date, import_notes = :notes WHERE id = :id"
            ),
            {**dates, "notes": notes, "id": order_id},
        )

    with op.batch_alter_table("orders") as batch:
        batch.drop_column("order_date")
        batch.drop_column("deliver_date")
        batch.alter_column("order_date_clean", new_column_name="order_date", existing_type=sa.Date())
        batch.alter_column("deliver_date_clean", new_column_name="deliver_date", existing_type=sa.Date())


def downgrade():
    with op.batch_alter_table("orders") as batch:
        batch.drop_column("import_notes")
        batch.alter_column("order_date", existing_type=sa.Date(), type_=sa.String())
        batch.alter_column("deliver_date", existing_type=sa.Date(), type_=sa.String())
        batch.alter_column("advance_payment", existing_type=sa.Integer(), type_=sa.String())
        batch.alter_column("total_amount", existing_type=sa.Integer(), type_=sa.String())
