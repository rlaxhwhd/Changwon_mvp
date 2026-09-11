from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from .settings import settings

pool = ConnectionPool(kwargs={**settings.connection_kwargs(), 'row_factory': dict_row},
                      min_size=1, max_size=5, open=False, timeout=10)


def connection():
    with pool.connection() as conn:
        # These scoped roster/metadata queries are short OLTP requests. Compiling the
        # expanded views costs ~2s even for 120 students; execution takes milliseconds.
        # Keep the setting transaction-local so maintenance/analytical sessions differ.
        conn.execute('SET LOCAL jit = off')
        yield conn
