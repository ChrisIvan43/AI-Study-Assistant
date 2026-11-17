"""Add email change verification fields.

Revision ID: c8e2f1a7b9d4
Revises: a91c7e2d4f60
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c8e2f1a7b9d4"
down_revision: Union[str, Sequence[str], None] = "a91c7e2d4f60"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.add_column(
        "users",
        sa.Column("pending_email", sa.String(length=255), nullable=True),
    )

    op.add_column(
        "users",
        sa.Column("pending_email_token_hash", sa.String(length=64), nullable=True),
    )

    op.add_column(
        "users",
        sa.Column("pending_email_expires_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.add_column(
        "users",
        sa.Column("email_change_requested_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_index(
        "uq_users_pending_email",
        "users",
        ["pending_email"],
        unique=True,
    )

    op.create_index(
        "uq_users_pending_email_token_hash",
        "users",
        ["pending_email_token_hash"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_users_pending_email_token_hash", table_name="users")
    op.drop_index("uq_users_pending_email", table_name="users")

    op.drop_column("users", "email_change_requested_at")
    op.drop_column("users", "pending_email_expires_at")
    op.drop_column("users", "pending_email_token_hash")
    op.drop_column("users", "pending_email")
    op.drop_column("users", "email_verified_at")
