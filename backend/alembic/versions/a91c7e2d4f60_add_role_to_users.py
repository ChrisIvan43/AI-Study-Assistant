"""Add role to users.

Revision ID: a91c7e2d4f60
Revises: fd0afbaf4a87
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a91c7e2d4f60"
down_revision: Union[str, Sequence[str], None] = "fd0afbaf4a87"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "role",
            sa.String(length=20),
            nullable=False,
            server_default="student",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "role")
