FROM python:3.12-slim
WORKDIR /service
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
ENV EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
RUN python -c "import os; from fastembed import TextEmbedding; TextEmbedding(os.environ['EMBEDDING_MODEL'], cache_dir='/models', threads=2)"
COPY service.py corpus.json ./
RUN useradd --system --uid 10001 rag && chmod -R a+rX /models
ENV HF_HUB_OFFLINE=1 HF_HUB_DISABLE_TELEMETRY=1 TOKENIZERS_PARALLELISM=false
USER 10001
CMD ["uvicorn", "service:app", "--host", "0.0.0.0", "--port", "8090", "--workers", "1"]
