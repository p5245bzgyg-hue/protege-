import logging
from datetime import timezone

from fastapi import APIRouter, HTTPException

from lib.db import db
from models.teach import ShareCreate, SharedSession

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/share", response_model=SharedSession)
async def create_share(body: ShareCreate):
    session = SharedSession(**body.model_dump())
    try:
        await db.shared_sessions.insert_one(session.model_dump())
    except Exception as e:  # noqa: BLE001
        logger.exception("share failed: %s", e)
        raise HTTPException(status_code=500, detail="Couldn't create a share link right now. Please try again.")
    return session


@router.get("/share/{id}", response_model=SharedSession)
async def get_share(id: str):
    doc = await db.shared_sessions.find_one({"id": id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="This shared lesson doesn't exist or was removed.")
    if doc.get("created_at") and doc["created_at"].tzinfo is None:
        doc["created_at"] = doc["created_at"].replace(tzinfo=timezone.utc)
    return SharedSession(**doc)
