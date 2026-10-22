FROM python:3.12-slim
# Bootstrap with the SHA256 published in the Python security announcement (2026-10-20).
# pip vendors its own CA bundle; updating standalone certifi alone is insufficient.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && sed -i 's|^mozilla/emSign_ECC_Root_CA_-_G3.crt$|!mozilla/emSign_ECC_Root_CA_-_G3.crt|' /etc/ca-certificates.conf \
    && update-ca-certificates --fresh \
    && rm -rf /var/lib/apt/lists/* \
    && python -m pip --isolated install --no-cache-dir --upgrade \
       "pip @ https://files.pythonhosted.org/packages/3f/06/3e4420302363fbb71be3c7f35ce042f54bfca330e3e66b3a2e3c4cca579f/pip-26.2.2-py3-none-any.whl#sha256=fd7f4dfa8190e014013b9f08f3e973f4e4c26ffd179a204895533a7254813a70" \
    && python -m pip --isolated install --no-cache-dir --upgrade "certifi>=2026.10.19" \
    && python -c "import pathlib, ssl, certifi, pip._vendor.certifi as pc; bad='emSign ECC Root CA - G3'; assert all(bad not in pathlib.Path(c.where()).read_text() for c in (certifi, pc)); assert all(bad not in str(c['subject']) for c in ssl.create_default_context().get_ca_certs())"
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
