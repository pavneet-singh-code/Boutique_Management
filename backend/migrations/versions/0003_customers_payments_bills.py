"""Customers, three-step payments and bills.

- New tables: customers, bills, app_settings.
- Orders get: customer_id, bill_id, advance_date, final_total, billed_date,
  final_payment_amount, final_payment_date.
- Renamed: advance_payment -> advance_amount ("money received so far" is now
  payment step 1), total_amount -> estimated_total (the rough total written on
  the order form; the real total is set on the bill).
- Existing orders are grouped into customers:
    * same name (ignoring case, spaces and punctuation), or
    * same phone number (last 10 digits).
  Names that only *might* be the same person (Manjot / Manjoot) stay
  separate - the app suggests merging them and the owner decides.

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-12
"""
import re
from collections import Counter

from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def _name_key(name):
    return re.sub(r"[^a-z0-9]", "", (name or "").lower())


def _phone_key(phone):
    digits = re.sub(r"\D", "", phone or "")
    return digits[-10:] if len(digits) >= 8 else None


def upgrade():
    op.create_table(
        "customers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("phone", sa.String(), nullable=True, unique=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)")),
    )
    op.create_index("ix_customers_id", "customers", ["id"])

    op.create_table(
        "bills",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("bill_number", sa.String(), nullable=False, unique=True),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("discount", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(), nullable=False, server_default="draft"),
        sa.Column("issued_on", sa.Date(), nullable=False),
        sa.Column("paid_on", sa.Date(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)")),
    )
    op.create_index("ix_bills_id", "bills", ["id"])

    op.create_table(
        "app_settings",
        sa.Column("key", sa.String(), primary_key=True),
        sa.Column("value", sa.Text(), nullable=True),
    )

    with op.batch_alter_table("orders") as batch:
        batch.alter_column("advance_payment", new_column_name="advance_amount", existing_type=sa.Integer())
        batch.alter_column("total_amount", new_column_name="estimated_total", existing_type=sa.Integer())
        batch.add_column(sa.Column("customer_id", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("advance_date", sa.Date(), nullable=True))
        batch.add_column(sa.Column("final_total", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("billed_date", sa.Date(), nullable=True))
        batch.add_column(sa.Column("bill_id", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("final_payment_amount", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("final_payment_date", sa.Date(), nullable=True))
        batch.create_foreign_key("fk_orders_customer", "customers", ["customer_id"], ["id"])
        batch.create_foreign_key("fk_orders_bill", "bills", ["bill_id"], ["id"])
        batch.create_index("ix_orders_customer_id", ["customer_id"])
        batch.create_index("ix_orders_bill_id", ["bill_id"])

    bind = op.get_bind()

    # Advance received: date it with the order date (or the day it was saved).
    bind.execute(sa.text(
        "UPDATE orders SET advance_date = COALESCE(order_date, DATE(created_at)) "
        "WHERE advance_amount IS NOT NULL"
    ))

    # ---- Group existing orders into customers (union by name or phone) ----
    rows = bind.execute(sa.text(
        "SELECT id, customer_name, contact_number FROM orders ORDER BY id"
    )).mappings().all()

    parent = {}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a, b):
        parent[find(a)] = find(b)

    first_by_key = {}
    for row in rows:
        if not _name_key(row["customer_name"]):
            continue  # orders without a name stay without a customer
        parent[row["id"]] = row["id"]
        for key in (("name", _name_key(row["customer_name"])), ("phone", _phone_key(row["contact_number"]))):
            if key[1] is None:
                continue
            if key in first_by_key:
                union(row["id"], first_by_key[key])
            else:
                first_by_key[key] = row["id"]

    groups = {}
    for row in rows:
        if row["id"] in parent:
            groups.setdefault(find(row["id"]), []).append(row)

    for members in groups.values():
        names = Counter(r["customer_name"].strip() for r in members)
        name = names.most_common(1)[0][0]
        phone = next((r["contact_number"].strip() for r in members if _phone_key(r["contact_number"])), None)
        result = bind.execute(
            sa.text("INSERT INTO customers (name, phone) VALUES (:name, :phone)"),
            {"name": name, "phone": phone},
        )
        customer_id = result.lastrowid
        bind.execute(
            sa.text(f"UPDATE orders SET customer_id = :cid WHERE id IN ({','.join(str(r['id']) for r in members)})"),
            {"cid": customer_id},
        )


def downgrade():
    with op.batch_alter_table("orders") as batch:
        batch.drop_index("ix_orders_bill_id")
        batch.drop_index("ix_orders_customer_id")
        batch.drop_constraint("fk_orders_bill", type_="foreignkey")
        batch.drop_constraint("fk_orders_customer", type_="foreignkey")
        for column in (
            "final_payment_date", "final_payment_amount", "bill_id",
            "billed_date", "final_total", "advance_date", "customer_id",
        ):
            batch.drop_column(column)
        batch.alter_column("estimated_total", new_column_name="total_amount", existing_type=sa.Integer())
        batch.alter_column("advance_amount", new_column_name="advance_payment", existing_type=sa.Integer())
    op.drop_table("app_settings")
    op.drop_table("bills")
    op.drop_table("customers")
