"""Store one draft and editor metadata per campaign."""

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "campaign_editor_state",
        sa.Column("campaign_id", sa.Integer(), primary_key=True, autoincrement=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("draft", sa.JSON(), nullable=True),
        sa.Column("removed", sa.JSON(), nullable=False),
        sa.Column("pins", sa.JSON(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("campaign_editor_state")
