"""Order plans (steps per suit), stages, trial dates and specialities.

- orders: status (received | in_work | ready | delivered | cancelled),
  status_confirmed, trial_date, delivered_at.
- order_tasks: the plan of each suit - steps in order (position), each with
  a speciality (materials, cutting, machine, handwork, stitching,
  final_check, social_media, other), an optional person, a due date and
  original_due_date (unfinished steps move to the next day).
- employees: skills (their specialities; several allowed).
- Old orders whose delivery date has passed are NOT marked delivered: they
  get status_confirmed = false, and the app asks the owner about them.

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-12
"""
from datetime import date

from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("orders") as batch:
        batch.add_column(sa.Column("status", sa.String(), nullable=False, server_default="received"))
        batch.add_column(sa.Column("status_confirmed", sa.Boolean(), nullable=False, server_default=sa.true()))
        batch.add_column(sa.Column("trial_date", sa.Date(), nullable=True))
        batch.add_column(sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True))

    with op.batch_alter_table("employees") as batch:
        batch.add_column(sa.Column("skills", sa.Text(), nullable=True))

    op.create_table(
        "order_tasks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("task", sa.String(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="assigned"),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("original_due_date", sa.Date(), nullable=True),
        sa.Column("assigned_by", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)")),
    )
    op.create_index("ix_order_tasks_id", "order_tasks", ["id"])
    op.create_index("ix_order_tasks_order_id", "order_tasks", ["order_id"])
    op.create_index("ix_order_tasks_employee_id", "order_tasks", ["employee_id"])

    # Old orders past their delivery date: ask the owner instead of guessing.
    op.get_bind().execute(
        sa.text(
            "UPDATE orders SET status_confirmed = 0 "
            "WHERE deliver_date IS NOT NULL AND deliver_date < :today"
        ),
        {"today": date.today().isoformat()},
    )


def downgrade():
    op.drop_table("order_tasks")
    with op.batch_alter_table("employees") as batch:
        batch.drop_column("skills")
    with op.batch_alter_table("orders") as batch:
        batch.drop_column("delivered_at")
        batch.drop_column("trial_date")
        batch.drop_column("status_confirmed")
        batch.drop_column("status")
