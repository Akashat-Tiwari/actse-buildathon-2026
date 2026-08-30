from fastapi import APIRouter
from .endpoints.transactions import router as transactions_router

api_router = APIRouter()
api_router.include_router(transactions_router)
