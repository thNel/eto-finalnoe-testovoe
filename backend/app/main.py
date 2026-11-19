from contextlib import asynccontextmanager
from typing import Literal

import httpx
from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.campaign_routes import router as campaign_router
from app.config import settings
from app.db import engine
from app.keitaro import KeitaroClient, KeitaroError


@asynccontextmanager
async def lifespan(app: FastAPI):
    base_url = f"{str(settings.keitaro_base_url).rstrip('/')}/admin_api/v1/"
    async with httpx.AsyncClient(
        base_url=base_url,
        timeout=httpx.Timeout(15, connect=5),
        headers={"Accept": "application/json", "User-Agent": "KeitaroCampaignManager/0.1"},
    ) as http:
        app.state.keitaro = KeitaroClient(http, settings.keitaro_api_key.get_secret_value())
        yield


app = FastAPI(title="Keitaro Campaign Manager", lifespan=lifespan)
router = APIRouter(prefix="/api/v1")


@app.exception_handler(KeitaroError)
async def handle_keitaro_error(_: Request, error: KeitaroError) -> JSONResponse:
    return JSONResponse(
        status_code=error.status,
        content={"detail": {"message": str(error), "upstream_status": error.upstream_status}},
    )


@router.get("/health")
def health() -> dict[str, Literal["ok"]]:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError as error:
        raise HTTPException(status_code=503, detail="Database unavailable") from error

    return {"status": "ok"}


router.include_router(campaign_router)
app.include_router(router)
