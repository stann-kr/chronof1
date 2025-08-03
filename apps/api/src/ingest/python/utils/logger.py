"""
ETL 로깅 유틸리티

일관된 로깅 형식과 설정을 제공합니다.
"""

import logging
import sys
from typing import Optional


def setup_logger(name: str, level: str = "INFO", 
                format_string: Optional[str] = None) -> logging.Logger:
    """로거 설정
    
    Args:
        name: 로거 이름
        level: 로그 레벨
        format_string: 로그 포맷 (선택사항)
        
    Returns:
        설정된 로거
    """
    if format_string is None:
        format_string = "%(asctime)s | %(name)-20s | %(levelname)-8s | %(message)s"
    
    # 로거 생성
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper()))
    
    # 기존 핸들러 제거 (중복 방지)
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # 콘솔 핸들러 추가
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, level.upper()))
    
    # 포매터 설정
    formatter = logging.Formatter(format_string)
    console_handler.setFormatter(formatter)
    
    logger.addHandler(console_handler)
    
    # 상위 로거로의 전파 방지
    logger.propagate = False
    
    return logger


def get_logger(name: str) -> logging.Logger:
    """기존 로거 가져오기"""
    return logging.getLogger(name)
