from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DC_", env_file=".env", extra="ignore")
    db_host: str = "127.0.0.1"
    db_port: int = 15432
    db_name: str = "dreamcatch"
    db_user: str = "dc_app"
    db_password: str = ""
    db_password_file: str | None = None
    environment: str = "development"
    development_identity: bool = True
    development_token_file: str | None = None
    # 업로드 파일의 바이트 정본. 웹루트 밖의 관리 볼륨이며 정적 서빙하지 않는다
    # (DB.md #41). 다운로드는 API 가 소유·범위를 확인한 뒤 스트리밍한다.
    # ⚠ DB 백업에 포함되지 않는다 — 별도 백업이 필요하다.
    file_root: str = "var/files"
    file_max_bytes: int = 10 * 1024 * 1024
    roadmap_provider: Literal['disabled', 'openai-compatible', 'fixture'] = 'disabled'
    roadmap_api_url: str = 'https://api.openai.com/v1/chat/completions'
    roadmap_model: str = ''
    roadmap_api_key: SecretStr = SecretStr('')
    roadmap_api_key_file: str | None = None
    roadmap_timeout_seconds: float = Field(default=45, ge=1, le=60)

    def connection_kwargs(self) -> dict:
        password = self.db_password
        if self.db_password_file:
            password = Path(self.db_password_file).read_text().strip()
        return dict(host=self.db_host, port=self.db_port, dbname=self.db_name,
                    user=self.db_user, password=password, connect_timeout=5,
                    application_name="dreamcatch-api")


settings = Settings()
