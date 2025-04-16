from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi_users import models
from datetime import datetime
from typing import Dict, Any
import jwt

from app.auth.authentication import (
    fastapi_users, 
    auth_backend, 
    current_active_user,
    create_access_token,
    create_refresh_token,
    SECRET,
    ALGORITHM
)
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.schemas.auth import TokenResponse, RefreshRequest

router = APIRouter(
    prefix="/auth",  # Explicitly include /auth prefix here
    tags=["Authentication"],
)

# Include user management routes
router.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="",  # No additional prefix
)

router.include_router(
    fastapi_users.get_register_router(UserResponse, UserCreate),
    prefix="",  # No additional prefix
)

router.include_router(
    fastapi_users.get_reset_password_router(),
    prefix="",  # No additional prefix
)

router.include_router(
    fastapi_users.get_verify_router(UserResponse),
    prefix="",  # No additional prefix
)

router.include_router(
    fastapi_users.get_users_router(UserResponse, UserUpdate),
    prefix="/users",  # Users routes will be under /api/auth/users
)


@router.post("/login/access-refresh-token", response_model=TokenResponse)
async def login_access_refresh_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    OAuth2 compatible login endpoint that returns both access and refresh tokens.
    """
    # Use fastapi-users to authenticate
    user = await fastapi_users.get_user_manager().authenticate(
        form_data.username, form_data.password
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect username or password",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )
    
    # Create access and refresh tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    # Update last login date
    user.last_login = datetime.utcnow()
    user_manager = fastapi_users.get_user_manager()
    await (await user_manager.get_user_db()).update(user)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/refresh-token", response_model=TokenResponse)
async def refresh_token(refresh_request: RefreshRequest):
    """
    Create a new access token using a refresh token.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode the refresh token
        payload = jwt.decode(
            refresh_request.refresh_token, SECRET, algorithms=[ALGORITHM]
        )
        
        # Verify it's a refresh token
        token_type = payload.get("type")
        if token_type != "refresh":
            raise credentials_exception
            
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        
        # In a real implementation, verify the user exists and is active
        # For now, we'll just create new tokens
        
        # Create new tokens
        access_token = create_access_token(data={"sub": user_id})
        refresh_token = create_refresh_token(data={"sub": user_id})
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
        
    except jwt.PyJWTError:
        raise credentials_exception


@router.get("/me", response_model=UserResponse)
async def get_current_user(user: User = Depends(current_active_user)):
    """Get current authenticated user."""
    return user


@router.get("/check-auth")
async def check_authentication(user: User = Depends(current_active_user)):
    """Simple endpoint to check if user is authenticated."""
    return {"is_authenticated": True, "user_id": user.id}