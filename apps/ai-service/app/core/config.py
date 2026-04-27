from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ai_service_port: int = 8000
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-3-small"
    vector_store: str = "faiss"
    pinecone_api_key: str = ""
    pinecone_index: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


settings = Settings()
