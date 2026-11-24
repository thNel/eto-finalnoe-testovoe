"""Record the last observed offer IDs for each stream."""

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("campaign_editor_state", sa.Column("published_offers", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("campaign_editor_state", "published_offers")
