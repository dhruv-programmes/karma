from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Consumer Carbon Loop API"
    demo_token: str = "demo-carbon-loop-token"
    demo_user_id: str = "11111111-1111-1111-1111-111111111111"
    cors_origins: list[str] = ["*"]
    open_products_facts_url: str = "https://world.openproductsfacts.org/api/v2/product"
    open_food_facts_url: str = "https://world.openfoodfacts.org/api/v2/product"
    request_timeout_seconds: float = 4.0
    database_url: str = "sqlite:///./carbon_loop.db"
    jwt_secret: str = "carbon-loop-super-secure-jwt-secret-key-2026"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days


settings = Settings()
