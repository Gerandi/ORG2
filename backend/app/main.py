from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

# Import routers
from app.api.routes import projects_router, data_router, network_router, ml_router, abm_router, auth_router
from app.core.database import get_async_session, engine
from app.models.user import Base

app = FastAPI(
    title="OrgAI API",
    description="API for the OrgAI platform - A comprehensive tool for organizational behavior research",
    version="0.1.0",
)

# Set up CORS middleware to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend development server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def create_db_tables():
    """Create database tables on app startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/")
async def root():
    return {"message": "Welcome to the OrgAI API"}


@app.get("/health")
async def health_check(session: AsyncSession = Depends(get_async_session)):
    """Check API health status including database connection."""
    try:
        # Try a simple database query
        await session.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}


# Include routers from api/routes modules
app.include_router(projects_router, prefix="/api")
app.include_router(data_router, prefix="/api")
app.include_router(network_router, prefix="/api")
app.include_router(ml_router, prefix="/api")
app.include_router(abm_router, prefix="/api")
app.include_router(auth_router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)