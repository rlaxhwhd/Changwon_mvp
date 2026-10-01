"""Shared retrieval adapter; personal context never enters the vector index."""
from pathlib import Path

import httpx
from fastapi import HTTPException

from .settings import settings


def headers():
    if not settings.rag_enabled or not settings.rag_key_file:
        raise HTTPException(503, '근거 자료 검색 서비스 설정이 필요합니다.')
    return {'X-Rag-Key': Path(settings.rag_key_file).read_text().strip()}


def sources(payload):
    return [{'id': f'R{i + 1}', 'kind': 'knowledge', 'title': doc['title'],
             'url': '', 'snippet': doc['text'], 'origin': doc['source'], 'version': doc['version']}
            for i, doc in enumerate(payload['documents'])]


async def retrieve(query: str, kind: str = 'chat'):
    async with httpx.AsyncClient(timeout=15, trust_env=False) as client:
        response = await client.post(settings.rag_url + '/search', headers=headers(),
                                     json={'query': query[:400], 'kind': kind})
        response.raise_for_status()
        return sources(response.json())


def retrieve_sync(query: str, kind: str):
    with httpx.Client(timeout=15, trust_env=False) as client:
        response = client.post(settings.rag_url + '/search', headers=headers(),
                               json={'query': query[:400], 'kind': kind})
        response.raise_for_status()
        return sources(response.json())
