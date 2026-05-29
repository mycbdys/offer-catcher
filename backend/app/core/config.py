import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Offer Catcher API"
    DEBUG: bool = True
    DATABASE_URL: str = "sqlite+aiosqlite:///./offer_catcher.db"
    SYNC_DATABASE_URL: str = "sqlite:///./offer_catcher.db"
    SECRET_KEY: str = "dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440

    # LLM API (OpenAI-compatible: DeepSeek, OpenAI, etc.)
    LLM_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", os.getenv("OPENAI_API_KEY", ""))
    LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "https://api.deepseek.com/v1")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "deepseek-chat")

    # Upload settings
    MAX_UPLOAD_SIZE_MB: int = 10

    # Scraper settings
    SCRAPER_DELAY_MIN: float = 3.0
    SCRAPER_DELAY_MAX: float = 8.0
    SCRAPER_MAX_PAGES: int = 10
    LOG_LEVEL: str = "INFO"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
