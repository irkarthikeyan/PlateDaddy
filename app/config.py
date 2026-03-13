from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./platedaddy.db"
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLIC_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    DEFAULT_CHARGE_AMOUNT: int = 500  # $5.00 in cents
    DEFAULT_CURRENCY: str = "usd"
    VIDEO_CAMERA_INDEX: int = 0
    VIDEO_DETECTION_INTERVAL: float = 0.5  # seconds between OCR runs
    VIDEO_DEDUP_SECONDS: int = 10  # suppress duplicate plate for N seconds
    JWT_SECRET_KEY: str = "change-me-in-production-use-a-long-random-string"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_DAYS: int = 7

    model_config = {"env_file": ".env"}


settings = Settings()
