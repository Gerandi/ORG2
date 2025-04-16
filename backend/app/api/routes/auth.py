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
    ALGORITHM,
    TOKEN_BLACKLIST,
    USER_REFRESH_TOKENS
)
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.schemas.auth import TokenResponse, RefreshRequest, LogoutRequest

router = APIRouter(
    prefix="/auth",  # Explicitly include /auth prefix here
    tags=["Authentication"],
)

# Include user management routes
router.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="",  # No additional prefix
)

# Fix for Pydantic v2 compatibility
register_router = fastapi_users.get_register_router(UserResponse, UserCreate)
router.include_router(
    register_router,
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
    # Get the user manager instance properly from the async generator
    user_manager = await anext(fastapi_users.get_user_manager())
    
    try:
        # Use fastapi-users to authenticate
        user = await user_manager.authenticate(
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
        await user_manager.user_db.update(user)
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    except Exception as e:
        print(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authentication failed",
        )


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
        
        # Check if token is blacklisted
        token_jti = payload.get("jti")
        if token_jti and token_jti in TOKEN_BLACKLIST:
            raise credentials_exception
            
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
            
        # Get the user manager instance
        user_manager_gen = fastapi_users.get_user_manager()
        user_manager = await anext(user_manager_gen)
        
        # Verify the user exists and is active
        try:
            user = await user_manager.get(user_id)
            if not user or not user.is_active:
                raise credentials_exception
        except Exception:
            raise credentials_exception
        
        # Add the old refresh token to the blacklist
        if token_jti:
            TOKEN_BLACKLIST.add(token_jti)
            
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


@router.post("/logout")
async def logout(
    logout_request: LogoutRequest,
    user: User = Depends(current_active_user)
):
    """
    Logout the user by blacklisting their tokens.
    
    Args:
        logout_request: Contains tokens to blacklist and whether to logout from all devices
        user: Current authenticated user
    
    Returns:
        Success message
    """
    user_id = str(user.id)
    
    # Add tokens to blacklist
    if logout_request.access_token:
        try:
            # Verify and extract jti from the token
            payload = jwt.decode(
                logout_request.access_token, SECRET, algorithms=[ALGORITHM]
            )
            if payload.get("jti"):
                TOKEN_BLACKLIST.add(payload["jti"])
        except (jwt.PyJWTError, ValueError):
            pass  # Invalid token, just ignore
    
    if logout_request.refresh_token:
        try:
            # Verify and extract jti from the token
            payload = jwt.decode(
                logout_request.refresh_token, SECRET, algorithms=[ALGORITHM]
            )
            if payload.get("jti"):
                TOKEN_BLACKLIST.add(payload["jti"])
        except (jwt.PyJWTError, ValueError):
            pass  # Invalid token, just ignore
    
    # Logout from all devices if requested
    if logout_request.all_devices and user_id in USER_REFRESH_TOKENS:
        # Add all user's tokens to blacklist
        for jti in USER_REFRESH_TOKENS[user_id]:
            TOKEN_BLACKLIST.add(jti)
        # Clear the user's tokens
        USER_REFRESH_TOKENS[user_id] = []
    
    return {"detail": "Successfully logged out"}