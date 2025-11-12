"""
Configuration Management
Loads environment variables from .env file
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application Settings"""
    
    # Database Configuration
    DATABASE_URL: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_HOST: str
    POSTGRES_PORT: int
    POSTGRES_DB: str
    
    # API Configuration
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Milk Collection Optimization API"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Constants
    CAN_TO_LITER_RATIO: float = 40.0
    MAX_UPLOAD_SIZE_MB: int = 10
    
    # CORS Settings
    ALLOWED_ORIGINS: List[str] = ["*"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"


# Create settings instance
settings = Settings()


# Print configuration on startup (only in debug mode)
if settings.DEBUG:
    print("\n" + "="*60)
    print(f"🚀 {settings.PROJECT_NAME} v{settings.VERSION}")
    print("="*60)
    print(f"📊 Database: {settings.POSTGRES_DB}")
    print(f"🌐 Host: {settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}")
    print(f"🔧 Debug Mode: {settings.DEBUG}")
    print(f"📦 Can to Liter Ratio: 1 can = {settings.CAN_TO_LITER_RATIO} liters")
    print("="*60 + "\n")
