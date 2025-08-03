"""
데이터베이스 연결 관리

PostgreSQL 데이터베이스 연결과 트랜잭션을 관리합니다.
"""

import logging
from typing import Optional
from db import PgDb
from repositories import CommonRepository, LiveRepository

log = logging.getLogger(__name__)


class DatabaseManager:
    """데이터베이스 연결 관리자"""
    
    def __init__(self):
        """데이터베이스 연결 초기화"""
        self.db = None
        self.common_repo = None
        self.live_repo = None
        self._initialize_connections()
    
    def _initialize_connections(self):
        """데이터베이스 연결 및 저장소 초기화"""
        try:
            self.db = PgDb()
            self.common_repo = CommonRepository(self.db)
            self.live_repo = LiveRepository(self.db)
            log.info("데이터베이스 연결 초기화 완료")
        except Exception as e:
            log.error(f"데이터베이스 연결 초기화 실패: {e}")
            raise
    
    def get_common_repository(self) -> CommonRepository:
        """공통 저장소 반환"""
        if not self.common_repo:
            raise RuntimeError("공통 저장소가 초기화되지 않았습니다")
        return self.common_repo
    
    def get_live_repository(self) -> LiveRepository:
        """라이브 저장소 반환"""
        if not self.live_repo:
            raise RuntimeError("라이브 저장소가 초기화되지 않았습니다")
        return self.live_repo
    
    def get_database(self) -> PgDb:
        """데이터베이스 인스턴스 반환"""
        if not self.db:
            raise RuntimeError("데이터베이스가 초기화되지 않았습니다")
        return self.db
    
    def test_connection(self) -> bool:
        """데이터베이스 연결 테스트"""
        try:
            result = self.db.fetch_one("SELECT 1 as test")
            return result[0] == 1
        except Exception as e:
            log.error(f"데이터베이스 연결 테스트 실패: {e}")
            return False
    
    def close(self):
        """데이터베이스 연결 종료"""
        try:
            if self.db:
                self.db.close()
                log.info("데이터베이스 연결 종료")
        except Exception as e:
            log.error(f"데이터베이스 연결 종료 중 오류: {e}")
