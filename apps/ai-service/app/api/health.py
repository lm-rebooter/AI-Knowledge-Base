from fastapi import APIRouter
from typing import Dict

router = APIRouter(tags=["health"])


@router.get("/health")
def healthcheck() -> Dict[str, str]:
    return {"status": "ok"}
