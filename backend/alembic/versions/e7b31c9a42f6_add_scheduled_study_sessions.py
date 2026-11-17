"""Add scheduled study sessions and email notification tracking.

Revision ID: e7b31c9a42f6
Revises: c8e2f1a7b9d4
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e7b31c9a42f6"
down_revision: Union[str, Sequence[str], None] = "c8e2f1a7b9d4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "scheduled_study_sessions",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column(
            "plan_id",
            sa.Integer(),
            sa.ForeignKey("study_plans.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("topic", sa.String(length=255), nullable=False),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "notify_email",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default="scheduled",
        ),
        sa.Column(
            "notification_status",
            sa.String(length=20),
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "notification_attempts",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "notification_claimed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "notification_sent_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column("notification_last_error", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.create_index(
        "ix_scheduled_study_sessions_due",
        "scheduled_study_sessions",
        ["notification_status", "end_at"],
    )
    op.create_index(
        "ix_scheduled_study_sessions_plan_id",
        "scheduled_study_sessions",
        ["plan_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_scheduled_study_sessions_plan_id",
        table_name="scheduled_study_sessions",
    )
    op.drop_index(
        "ix_scheduled_study_sessions_due",
        table_name="scheduled_study_sessions",
    )
    op.drop_table("scheduled_study_sessions")
