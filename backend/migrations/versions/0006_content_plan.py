"""Social media content plan.

- content_items: reels / posts / stories with platforms, format, a linked
  order (optional), who does it, when it should go out (India time), stage
  (idea -> planned -> shooting -> editing -> ready_to_post -> posted) and the
  link once posted.
- orders.ok_to_post: the customer allows this outfit on social media.

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-12
"""
from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("orders") as batch:
        batch.add_column(sa.Column("ok_to_post", sa.Boolean(), nullable=False, server_default=sa.false()))

    op.create_table(
        "content_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("brief", sa.Text(), nullable=True),
        sa.Column("platforms", sa.Text(), nullable=True),
        sa.Column("format", sa.String(), nullable=False, server_default="reel"),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id", ondelete="SET NULL"), nullable=True),
        sa.Column("assigned_to", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("scheduled_for", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="idea"),
        sa.Column("posted_url", sa.String(), nullable=True),
        sa.Column("posted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)")),
    )
    op.create_index("ix_content_items_id", "content_items", ["id"])
    op.create_index("ix_content_items_order_id", "content_items", ["order_id"])


def downgrade():
    op.drop_table("content_items")
    with op.batch_alter_table("orders") as batch:
        batch.drop_column("ok_to_post")
