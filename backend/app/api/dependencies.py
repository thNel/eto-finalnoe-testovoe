from typing import Annotated

from fastapi import Depends, Request

from app.keitaro.client import KeitaroClient


def get_keitaro(request: Request) -> KeitaroClient:
    return request.app.state.keitaro


Keitaro = Annotated[KeitaroClient, Depends(get_keitaro)]
