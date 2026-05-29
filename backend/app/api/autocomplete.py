"""Autocomplete API for schools and majors."""

from fastapi import APIRouter, Query
from app.services.school_data import search_schools, search_majors, search_cities, TOP_CITIES

router = APIRouter()


@router.get("/schools")
async def autocomplete_schools(q: str = Query(default=""), limit: int = Query(default=8, le=20)):
    results = search_schools(q, limit)
    return [{"name": r["name"], "tier": r["tier"], "city": r["city"]} for r in results]


@router.get("/majors")
async def autocomplete_majors(q: str = Query(default=""), limit: int = Query(default=8, le=20)):
    return search_majors(q, limit)


@router.get("/cities")
async def autocomplete_cities(q: str = Query(default=""), limit: int = Query(default=12, le=30)):
    return search_cities(q, limit)
