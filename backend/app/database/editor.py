from sqlalchemy import JSON, Integer
from sqlalchemy.orm import Mapped, Session, mapped_column

from app.database.connection import Base, engine


class EditorState(Base):
    __tablename__ = "campaign_editor_state"

    campaign_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    version: Mapped[int] = mapped_column(default=0)
    draft: Mapped[dict | None] = mapped_column(JSON(none_as_null=True), nullable=True)
    removed: Mapped[dict] = mapped_column(JSON, default=dict)
    pins: Mapped[dict] = mapped_column(JSON, default=dict)


def load_state(campaign_id: int) -> EditorState:
    with Session(engine) as session:
        return session.get(EditorState, campaign_id) or EditorState(
            campaign_id=campaign_id, version=0, draft=None, removed={}, pins={}
        )


def save_state(state: EditorState) -> None:
    with Session(engine) as session:
        session.merge(state)
        session.commit()
