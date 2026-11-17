"""Add initial account email verification token fields.

Revision ID: f4a91b2c6d80
Revises: e7b31c9a42f6
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f4a91b2c6d80"
down_revision: Union[str, Sequence[str], None] = "e7b31c9a42f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("email_verification_token_hash", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("email_verification_expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("email_verification_requested_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "email_verification_requested_at")
    op.drop_column("users", "email_verification_expires_at")
    op.drop_column("users", "email_verification_token_hash")
