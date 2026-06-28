"""Application configuration loaded from environment variables.

Uses Pydantic Settings so we get typing, validation, and a single source of
truth for every env var the app expects.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./creditsim.db"
    cors_origins: str = "http://localhost:3000"
    environment: str = "local"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
