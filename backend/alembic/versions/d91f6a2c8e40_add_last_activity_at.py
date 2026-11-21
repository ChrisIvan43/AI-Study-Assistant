"""Add last activity timestamp for student inactivity reminders.

Revision ID: d91f6a2c8e40
Revises: b7c2e9a41d63
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d91f6a2c8e40"
down_revision: Union[str, Sequence[str], None] = "b7c2e9a41d63"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Preserve the most recent known login as the initial activity timestamp.
    op.execute(
        """
        UPDATE users
        SET last_activity_at = last_login_at
        WHERE last_activity_at IS NULL
          AND last_login_at IS NOT NULL
        """
    )


def downgrade() -> None:
    op.drop_column("users", "last_activity_at")
