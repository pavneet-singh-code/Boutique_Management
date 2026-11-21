"""Photos on orders (fabric, design reference, finished piece).

The pictures live on Cloudinary; this table keeps which order they belong
to, their Cloudinary id and who added them.

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-21
"""
from alembic import op
import sqlalchemy as sa

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "order_photos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("note", sa.String(), nullable=True),
        sa.Column("public_id", sa.String(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("bytes", sa.Integer(), nullable=True),
        sa.Column("uploaded_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("public_id"),
    )
    op.create_index("ix_order_photos_id", "order_photos", ["id"])
    op.create_index("ix_order_photos_order_id", "order_photos", ["order_id"])


def downgrade():
    op.drop_index("ix_order_photos_order_id", table_name="order_photos")
    op.drop_index("ix_order_photos_id", table_name="order_photos")
    op.drop_table("order_photos")
