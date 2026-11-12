"""Employees (separate logins with roles) and the activity log.

- employees: FA-001 style ID, role, colour, PIN (hashed), active flag,
  token_version (to log someone out everywhere) and lock-out after wrong PINs.
- activity_log: who did what, and when.
- The existing owner password login becomes employee FA-001 (role owner).
  Set a phone number and PIN for it in Settings -> My profile.

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-12
"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "employees",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("employee_code", sa.String(), nullable=True, unique=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("phone", sa.String(), nullable=True, unique=True),
        sa.Column("role", sa.String(), nullable=False, server_default="worker"),
        sa.Column("color", sa.String(), nullable=True),
        sa.Column("pin_hash", sa.String(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failed_attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)")),
    )
    op.create_index("ix_employees_id", "employees", ["id"])

    op.create_table(
        "activity_log",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("actor_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
        sa.Column("entity", sa.String(), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("label", sa.String(), nullable=True),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)")),
    )
    op.create_index("ix_activity_log_id", "activity_log", ["id"])
    op.create_index("ix_activity_log_actor_id", "activity_log", ["actor_id"])
    op.create_index("ix_activity_log_entity_id", "activity_log", ["entity_id"])
    op.create_index("ix_activity_log_created_at", "activity_log", ["created_at"])

    # The first owner: the person who has been using the shared password.
    op.execute(
        "INSERT INTO employees (id, employee_code, name, role, color, active, token_version, failed_attempts) "
        "VALUES (1, 'FA-001', 'Owner', 'owner', '#2563eb', 1, 0, 0)"
    )


def downgrade():
    op.drop_table("activity_log")
    op.drop_table("employees")
