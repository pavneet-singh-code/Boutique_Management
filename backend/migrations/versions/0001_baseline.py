"""Baseline: the orders table as it existed before migrations were added.

Creates the table on a brand-new database; does nothing on the existing
PythonAnywhere database (the table is already there).

Revision ID: 0001
Revises:
Create Date: 2026-11-11
"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    if "orders" in sa.inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("filename", sa.String(), nullable=True),
        sa.Column("order_number", sa.String(), nullable=True),
        sa.Column("customer_name", sa.String(), nullable=True),
        sa.Column("additional_info", sa.String(), nullable=True),
        sa.Column("order_date", sa.String(), nullable=True),
        sa.Column("deliver_date", sa.String(), nullable=True),
        sa.Column("contact_number", sa.String(), nullable=True),
        sa.Column("what_to_design", sa.Text(), nullable=True),
        sa.Column("advance_payment", sa.String(), nullable=True),
        sa.Column("total_amount", sa.String(), nullable=True),
        sa.Column("needs_review", sa.Boolean(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=True,
        ),
    )
    op.create_index("ix_orders_id", "orders", ["id"])
    op.create_index("ix_orders_order_number", "orders", ["order_number"])


def downgrade():
    op.drop_table("orders")
