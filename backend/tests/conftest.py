import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.settings import settings


@pytest.fixture(scope='session')
def client():
    assert settings.db_name.endswith('_test'), 'Refusing mutations outside an isolated test database'
    with TestClient(app, raise_server_exceptions=True) as instance:
        yield instance
