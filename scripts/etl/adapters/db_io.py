from contextlib import contextmanager
from psycopg_pool import ConnectionPool
import os

class PgPool:
    def __init__(self, dsn: str | None = None):
        if dsn is None:
            dsn = os.getenv("DATABASE_URL")
            if not dsn:
                raise RuntimeError("DATABASE_URL environment variable is not set.")
        self.pool = ConnectionPool(dsn)

    def close(self):
        self.pool.close()

    def fetchall(self, query: str, *args):
        with self.pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, args)
                return cur.fetchall()

    def execute(self, query: str, *args):
        with self.pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, args)
                conn.commit()

    def executemany(self, query: str, rows):
        with self.pool.connection() as conn:
            with conn.cursor() as cur:
                cur.executemany(query, rows)
                conn.commit()

    @contextmanager
    def tx(self):
        with self.pool.connection() as conn:
            with conn.cursor() as cur:
                try:
                    yield cur
                    conn.commit()
                except Exception:
                    conn.rollback()
                    raise