from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config import settings
from app.db.seed import seed_database_if_empty
from app.db.session import Base, SessionLocal, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schema
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database_if_empty(db)
    finally:
        db.close()
    yield


api = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)

api.include_router(router)


@api.get("/")
def root():
    return {
        "name": settings.app_name,
        "docs": "/docs",
        "health": "/api/v1/health",
    }


# Keep CORS outside FastAPI's error middleware. Otherwise an unhandled 500 is
# returned by Starlette before the CORS middleware can add its headers, which
# makes the browser report a misleading "CORS missing" error. The response is
# still a real 500; it just remains observable from the web client.
app = CORSMiddleware(
    api,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
