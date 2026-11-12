"""Make the order number required and unique.

Run this only after the duplicates / missing numbers have been fixed on the
app's "Order number check" screen. If any problems are left, the migration
stops, lists them and changes nothing.

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-11
"""
from alembic import op
import sqlalchemy as sa

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    missing = bind.execute(
        sa.text("SELECT id, customer_name FROM orders WHERE order_number IS NULL OR TRIM(order_number) = ''")
    ).all()
    duplicates = bind.execute(
        sa.text(
            "SELECT order_number, COUNT(*) FROM orders "
            "WHERE order_number IS NOT NULL GROUP BY order_number HAVING COUNT(*) > 1"
        )
    ).all()

    if missing or duplicates:
        lines = ["Cannot make order numbers unique yet. Fix these on the 'Order number check' screen first:"]
        for order_id, name in missing:
            lines.append(f"  - order id {order_id} ({name or 'no name'}) has no order number")
        for number, count in duplicates:
            lines.append(f"  - order number {number} is used {count} times")
        raise RuntimeError("\n".join(lines))

    with op.batch_alter_table("orders") as batch:
        batch.drop_index("ix_orders_order_number")
        batch.alter_column("order_number", existing_type=sa.String(), nullable=False)
        batch.create_index("ix_orders_order_number", ["order_number"], unique=True)


def downgrade():
    with op.batch_alter_table("orders") as batch:
        batch.drop_index("ix_orders_order_number")
        batch.alter_column("order_number", existing_type=sa.String(), nullable=True)
        batch.create_index("ix_orders_order_number", ["order_number"], unique=False)
