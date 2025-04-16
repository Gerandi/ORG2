from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
import pydantic

# Monkey patch for Pydantic v2 compatibility with fastapi-users
# Add create_update_dict method to BaseModel if it doesn't exist
# This is needed for fastapi-users compatibility with Pydantic v2
if not hasattr(pydantic.BaseModel, 'create_update_dict'):
    def create_update_dict_patch(self, **kwargs):
        exclude_unset = kwargs.pop("exclude_unset", True)
        exclude_none = kwargs.pop("exclude_none", False)
        exclude = kwargs.pop("exclude", set())
        include = kwargs.pop("include", None)
        by_alias = kwargs.pop("by_alias", False)
        exclude_defaults = kwargs.pop("exclude_defaults", False)
        
        # In Pydantic v2, model_dump replaces dict()
        return self.model_dump(
            exclude_unset=exclude_unset,
            exclude_none=exclude_none,
            exclude=exclude,
            include=include,
            by_alias=by_alias,
            exclude_defaults=exclude_defaults,
            **kwargs
        )
    pydantic.BaseModel.create_update_dict = create_update_dict_patch

# Monkey patch for fastapi-users sqlalchemy adapter compatibility
from fastapi_users.db import SQLAlchemyUserDatabase
original_get_by_email = SQLAlchemyUserDatabase.get_by_email

async def patched_get_by_email(self, email):
    """Look up a user by email with better error handling for Pydantic v2."""
    try:
        return await original_get_by_email(self, email)
    except Exception as e:
        print(f"Error in get_by_email: {e}")
        # Return None instead of raising an error for non-existent users
        return None

SQLAlchemyUserDatabase.get_by_email = patched_get_by_email

# Import routers
from app.api.routes import projects_router, data_router, network_router, ml_router, abm_router, auth_router
from app.core.database import get_async_session, engine
# Import models from models.py which includes complete model definitions with relationships
from app.models.models import Base

app = FastAPI(
    title="OrgAI API",
    description="API for the OrgAI platform - A comprehensive tool for organizational behavior research",
    version="0.1.0",
)

# Set up CORS middleware to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"],  # Frontend development servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,  # Cache preflight requests for 10 minutes
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