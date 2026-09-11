from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from .settings import settings

pool = ConnectionPool(kwargs={**settings.connection_kwargs(), 'row_factory': dict_row},
                      min_size=1, max_size=5, open=False, timeout=10)


def connection():
    with pool.connection() as conn:
        yield conn
