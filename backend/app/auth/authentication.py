import os
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, Request, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from fastapi_users import FastAPIUsers
from fastapi_users.authentication import (
    AuthenticationBackend, 
    BearerTransport, 
    JWTStrategy,
)
from fastapi_users.manager import BaseUserManager, UUIDIDMixin
from passlib.context import CryptContext
import jwt
from pydantic import EmailStr

from app.core.database import get_user_db
from app.models.user import User

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """Generate password hash."""
    return pwd_context.hash(password)

# JWT configuration
# Use environment variable for production, fallback to local secret for development
SECRET = os.getenv("JWT_SECRET", "YOUR_SECRET_KEY_CHANGE_THIS_IN_PRODUCTION")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30  # 30 days
REFRESH_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30 * 3  # 90 days

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

class UserManager(BaseUserManager[User, int]):
    """User manager for authentication and user operations."""
    
    reset_password_token_secret = SECRET
    verification_token_secret = SECRET
    
    async def on_after_register(self, user: User, request: Optional[Request] = None):
        """Callback for post-registration actions."""
        print(f"User {user.id} has registered.")
    
    async def on_after_login(self, user: User, request: Optional[Request] = None):
        """Update last login date."""
        user.last_login = datetime.utcnow()
        await self.user_db.update(user)
    
    async def validate_password(self, password: str, user: User) -> None:
        """
        Validate password meets requirements.
        
        Args:
            password: The password to validate
            user: The user this password is for
        
        Raises:
            InvalidPasswordException: If password doesn't meet requirements
        """
        # Check password length
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters long")
        
        # Check for at least one uppercase, one lowercase, and one digit
        has_upper = any(c.isupper() for c in password)
        has_lower = any(c.islower() for c in password)
        has_digit = any(c.isdigit() for c in password)
        
        if not (has_upper and has_lower and has_digit):
            raise ValueError(
                "Password must contain at least one uppercase letter, "
                "one lowercase letter, and one digit"
            )
        
        # Check if password contains email or username
        if user.email and user.email.split('@')[0].lower() in password.lower():
            raise ValueError("Password cannot contain your email address")
        
        if user.username and user.username.lower() in password.lower():
            raise ValueError("Password cannot contain your username")


# Authentication setup
bearer_transport = BearerTransport(tokenUrl="api/auth/login")


def get_jwt_strategy() -> JWTStrategy:
    """Create JWT strategy for authentication."""
    return JWTStrategy(secret=SECRET, lifetime_seconds=ACCESS_TOKEN_EXPIRE_MINUTES * 60)


# Create custom JWT functions with refresh token support
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a new JWT access token.
    
    Args:
        data: Data to encode in the token
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a new JWT refresh token.
    
    Args:
        data: Data to encode in the token
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT refresh token
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta if expires_delta else timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """
    Get the current user from the JWT token.
    
    Args:
        token: JWT token from request
        
    Returns:
        User object
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        token_type: str = payload.get("type")
        
        if user_id is None or token_type != "access":
            raise credentials_exception
            
        # In a real implementation, get the user from the database
        # For now, just return a dummy user
        # TODO: Implement actual user lookup from database
        
    except jwt.PyJWTError:
        raise credentials_exception
        
    # If we had a user object, we'd return it here
    # For now, just raise an exception as this isn't fully implemented
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Full JWT user lookup not implemented yet"
    )


auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)


async def get_user_manager(user_db=Depends(get_user_db)):
    """Get user manager."""
    yield UserManager(user_db)


fastapi_users = FastAPIUsers[User, int](
    get_user_manager,
    [auth_backend],
)

# Reusable dependencies for protected routes
current_active_user = fastapi_users.current_user(active=True)
current_superuser = fastapi_users.current_user(active=True, superuser=True)