"""데이터베이스 연결 및 트랜잭션 관리 유틸리티."""

from contextlib import contextmanager
from psycopg_pool import ConnectionPool
import os
import logging

log = logging.getLogger("chronof1.ingest.db")

class PgDb:
    """PostgreSQL 데이터베이스 클래스.
    
    ConnectionPool을 사용하여 연결을 관리하고, 트랜잭션 및 쿼리 실행을 위한 
    유틸리티 메서드를 제공합니다.
    """
    
    def __init__(self, dsn: str | None = None):
        """PgDb 인스턴스를 초기화합니다.
        
        Args:
            dsn: 데이터베이스 연결 문자열. 없으면 DATABASE_URL 환경 변수 사용.
        """
        if dsn is None:
            dsn = os.getenv("DATABASE_URL")
            if not dsn:
                raise RuntimeError("DATABASE_URL 환경 변수가 설정되지 않았습니다.")
        
        log.info("PostgreSQL 연결 풀 초기화 중...")
        self.pool = ConnectionPool(dsn)
        log.info("PostgreSQL 연결 풀 초기화 완료")
    
    def close(self):
        """연결 풀을 종료합니다."""
        self.pool.close()
        log.info("PostgreSQL 연결 풀 종료됨")
    
    def fetch_one(self, query: str, *args):
        """단일 행을 조회합니다.
        
        Args:
            query: SQL 쿼리
            *args: 쿼리 파라미터
            
        Returns:
            조회된 단일 행 또는 None
        """
        with self.pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, args)
                return cur.fetchone()
    
    def fetch_all(self, query: str, *args):
        """모든 행을 조회합니다.
        
        Args:
            query: SQL 쿼리
            *args: 쿼리 파라미터
            
        Returns:
            조회된 모든 행의 리스트
        """
        with self.pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, args)
                return cur.fetchall()
    
    def execute(self, query: str, *args):
        """쿼리를 실행하고 커밋합니다.
        
        Args:
            query: SQL 쿼리
            *args: 쿼리 파라미터
        """
        with self.pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, args)
                conn.commit()
    
    def execute_many(self, query: str, rows):
        """여러 행을 한 번에 실행하고 커밋합니다.
        
        Args:
            query: SQL 쿼리 (파라미터는 %s로 표시)
            rows: 실행할 행 데이터 리스트
        """
        with self.pool.connection() as conn:
            with conn.cursor() as cur:
                cur.executemany(query, rows)
                conn.commit()
    
    @contextmanager
    def transaction(self):
        """트랜잭션 컨텍스트 매니저.
        
        여러 쿼리를 하나의 트랜잭션으로 실행할 때 사용합니다.
        예외 발생 시 자동으로 롤백합니다.
        
        Yields:
            커서 객체
        """
        with self.pool.connection() as conn:
            with conn.cursor() as cur:
                try:
                    yield cur
                    conn.commit()
                except Exception as e:
                    conn.rollback()
                    log.error(f"트랜잭션 실패, 롤백됨: {e}")
                    raise
