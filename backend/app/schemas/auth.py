from typing import Optional
from pydantic import BaseModel

class TokenResponse(BaseModel):
    """Schema for token response containing both access and refresh tokens."""
    access_token: str
    refresh_token: str
    token_type: str

class RefreshRequest(BaseModel):
    """Schema for refresh token request."""
    refresh_token: str