"""
ChronoF1 ETL 설정 관리

ETL 파이프라인의 설정을 중앙에서 관리합니다.
"""

import os
from typing import Optional


class ETLConfig:
    """ETL 설정 클래스"""
    
    def __init__(self):
        """설정 초기화"""
        self.cache_path = self._get_cache_path()
        self.log_level = os.getenv("ETL_LOG_LEVEL", "INFO")
        self.batch_size = int(os.getenv("ETL_BATCH_SIZE", "1000"))
        self.enable_cache = os.getenv("ETL_ENABLE_CACHE", "true").lower() == "true"
        
    def _get_cache_path(self) -> str:
        """캐시 경로 가져오기"""
        cache_path = os.getenv("FASTF1_CACHE_PATH")
        if cache_path:
            return cache_path
        
        # 기본 캐시 경로 (프로젝트 루트의 cache 폴더)
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.join(current_dir, "../../../../../..")
        return os.path.abspath(os.path.join(project_root, "cache"))
    
    @property
    def database_url(self) -> str:
        """데이터베이스 URL"""
        return os.getenv("DATABASE_URL")
    
    @property
    def is_debug(self) -> bool:
        """디버그 모드 여부"""
        return self.log_level.upper() == "DEBUG"
