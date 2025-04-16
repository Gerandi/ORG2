# Import all route modules here for easier importing from app.main
"""API Routes for OrgAI Platform."""

from .projects import router as projects_router
from .data import router as data_router
from .network import router as network_router
from .ml import router as ml_router
from .abm import router as abm_router
from .auth import router as auth_router