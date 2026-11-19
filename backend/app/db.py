from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import DEFAULT_DATABASE_PATH, DEFAULT_DATABASE_URL, settings


class Base(DeclarativeBase):
    pass


if settings.database_url == DEFAULT_DATABASE_URL:
    DEFAULT_DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(settings.database_url)
