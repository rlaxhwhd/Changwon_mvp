"""Standalone gate tests: no database or project lifespan required."""
import pytest
from fastapi import FastAPI, Response
from fastapi.testclient import TestClient

from app import demo_access as gate


@pytest.fixture
def client(tmp_path, monkeypatch):
    password = tmp_path / 'password'
    key = tmp_path / 'key'
    password.write_text('test-demo-password\n')
    key.write_text('a' * 64)
    monkeypatch.setattr(gate.settings, 'demo_password_file', str(password))
    monkeypatch.setattr(gate.settings, 'demo_session_key_file', str(key))
    app = FastAPI()
    app.include_router(gate.router)
    @app.get('/app-unauthorized')
    def app_unauthorized():
        return Response(status_code=401)
    with TestClient(app, base_url='https://demo.test', follow_redirects=False) as c:
        yield c


def sign_in(client, password='test-demo-password'):
    return client.post('/__demo/session', data={'username': 'demo', 'password': password},
                       headers={'Origin': 'https://demo.test'})


def test_cookie_survives_app_401_and_navigation(client):
    assert client.get('/__demo/check').status_code == 401
    response = sign_in(client)
    assert response.status_code == 303
    cookie = response.headers['set-cookie']
    for flag in ('HttpOnly', 'Secure', 'SameSite=lax', 'Max-Age=28800', 'Path=/'):
        assert flag in cookie
    assert 'test-demo-password' not in cookie
    assert client.get('/__demo/check').status_code == 204
    assert client.get('/app-unauthorized').status_code == 401
    assert client.get('/__demo/check').status_code == 204
    assert client.get('/__demo/login').status_code == 303


def test_invalid_password_does_not_echo_or_challenge(client):
    response = sign_in(client, 'wrong-private-value')
    assert response.status_code == 200
    assert 'role="alert"' in response.text
    assert 'wrong-private-value' not in response.text
    assert 'www-authenticate' not in response.headers
    assert 'set-cookie' not in response.headers
    assert client.get('/__demo/check').status_code == 401


def test_rejects_cross_origin_and_oversized_login(client):
    assert client.post('/__demo/session', data={'username': 'demo', 'password': 'test-demo-password'},
                       headers={'Origin': 'https://other.test'}).status_code == 403
    assert sign_in(client, 'x' * 5000).status_code == 413


def test_expiry_and_tampering(client, monkeypatch):
    sign_in(client)
    token = client.cookies.get(gate.COOKIE)
    assert gate.valid_session(token, b'a' * 64)
    assert not gate.valid_session(token + 'x', b'a' * 64)
    assert not gate.valid_session(token, b'b' * 64)
    now = gate.time.time()
    monkeypatch.setattr(gate.time, 'time', lambda: now + gate.TTL + 1)
    assert client.get('/__demo/check').status_code == 401


def test_disabled_gate_fails_closed(client, monkeypatch):
    monkeypatch.setattr(gate.settings, 'demo_password_file', None)
    assert client.get('/__demo/check').status_code == 404
    assert client.get('/__demo/login').status_code == 404
