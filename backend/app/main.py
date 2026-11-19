from typing import Literal

from fastapi import APIRouter, FastAPI, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.db import engine

app = FastAPI(title="Keitaro Campaign Manager")
router = APIRouter(prefix="/api/v1")


@router.get("/health")
def health() -> dict[str, Literal["ok"]]:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Database unavailable") from error

    return {"status": "ok"}


app.include_router(router)
