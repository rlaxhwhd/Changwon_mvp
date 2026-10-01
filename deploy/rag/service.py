"""Private, CPU-only retrieval service. Corpus is a reviewed build artifact."""
import hashlib
import json
import os
import secrets
import threading
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException
from fastembed import TextEmbedding
from pydantic import BaseModel, ConfigDict, Field

MODEL = os.environ.get('EMBEDDING_MODEL', 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')
CORPUS = Path(__file__).with_name('corpus.json').read_bytes()
VERSION = hashlib.sha256(CORPUS).hexdigest()
DOCUMENTS = {row['id']: row for row in json.loads(CORPUS)}
COLLECTION = 'dreamcatch_career_' + VERSION[:12] + '_minilm384'
QDRANT = os.environ.get('QDRANT_URL', 'http://qdrant:6333')
model = None
lock = threading.Lock()
ready = False


def key(name):
    return Path('/run/secrets/' + name).read_text().strip()


def authenticated(x_rag_key: str = Header(default='')):
    if not secrets.compare_digest(x_rag_key, key('rag_key')):
        raise HTTPException(401, 'Authentication required')


def qdrant(method, path, **kwargs):
    with httpx.Client(timeout=30, trust_env=False) as client:
        response = client.request(method, QDRANT + path, headers={'api-key': key('qdrant_key')}, **kwargs)
        response.raise_for_status()
        return response.json()


def initialize():
    global model, ready
    model = TextEmbedding(MODEL, cache_dir='/models', threads=2, local_files_only=True)
    existing = qdrant('GET', '/collections')['result']['collections']
    if not any(item['name'] == COLLECTION for item in existing):
        qdrant('PUT', '/collections/' + COLLECTION, json={
            'vectors': {'size': 384, 'distance': 'Cosine'}, 'on_disk_payload': True,
        })
    chunks = []
    for document in DOCUMENTS.values():
        # Short overlapping passages fit this small multilingual encoder's
        # 128-token window. Retrieval returns their complete reviewed parent.
        for offset in range(0, len(document['text']), 80):
            passage = document['title'] + ': ' + document['text'][offset:offset + 100]
            chunks.append((document, offset, passage))
    vectors = model.passage_embed([item[2] for item in chunks], batch_size=8)
    points = []
    for (document, offset, _), vector in zip(chunks, vectors):
        points.append({'id': str(uuid.uuid5(uuid.NAMESPACE_URL, VERSION + document['id'] + str(offset))),
                       'vector': vector.tolist(), 'payload': {'documentId': document['id'],
                           'kinds': document['kinds'], 'version': VERSION}})
    for offset in range(0, len(points), 32):
        qdrant('PUT', '/collections/' + COLLECTION + '/points?wait=true', json={'points': points[offset:offset + 32]})
    count = qdrant('POST', '/collections/' + COLLECTION + '/points/count', json={'exact': True})['result']['count']
    if count != len(points):
        raise RuntimeError('Incomplete knowledge index')
    ready = True


@asynccontextmanager
async def lifespan(app):
    initialize()
    yield


app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)


class Search(BaseModel):
    model_config = ConfigDict(extra='forbid')
    query: str = Field(min_length=1, max_length=400)
    kind: Literal['chat', 'roadmap', 'diagnosis', 'counsel', 'comprehensive'] = 'chat'


@app.get('/healthz')
def health():
    if not ready:
        raise HTTPException(503, 'Index not ready')
    return {'status': 'ok', 'documents': len(DOCUMENTS), 'version': VERSION, 'model': MODEL}


@app.post('/search', dependencies=[Depends(authenticated)])
def search(body: Search):
    if not lock.acquire(blocking=False):
        raise HTTPException(429, 'Retrieval is busy; retry shortly')
    try:
        vector = next(model.query_embed(body.query)).tolist()
        request = {'query': vector, 'limit': 16, 'with_payload': True,
                   'score_threshold': 0.2}
        if body.kind != 'chat':
            request['filter'] = {'must': [{'key': 'kinds', 'match': {'value': body.kind}}]}
        hits = qdrant('POST', '/collections/' + COLLECTION + '/points/query', json=request)['result']['points']
        results = []
        seen = set()
        for hit in hits:
            document_id = hit['payload']['documentId']
            if document_id in seen:
                continue
            seen.add(document_id)
            results.append({**DOCUMENTS[document_id], 'score': hit['score'], 'version': VERSION})
            if len(results) == 3:
                break
        return {'documents': results, 'version': VERSION, 'model': MODEL}
    finally:
        lock.release()


@app.get('/documents/{document_id}', dependencies=[Depends(authenticated)])
def document(document_id: str):
    if document_id not in DOCUMENTS:
        raise HTTPException(404, 'Document not found')
    return {**DOCUMENTS[document_id], 'version': VERSION}
