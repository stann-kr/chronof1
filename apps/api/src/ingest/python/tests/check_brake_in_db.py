#!/usr/bin/env python3
"""
실제 데이터베이스에서 brake 값 확인
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from db import PgDb
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

def check_brake_values_in_db():
    """데이터베이스에서 brake 값 확인"""
    
    try:
        # 데이터베이스 연결
        db = PgDb()
        
        # 텔레메트리 테이블에서 brake 값 확인
        query = """
        SELECT 
            brake,
            COUNT(*) as count,
            COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
        FROM live_telemetry_data 
        GROUP BY brake 
        ORDER BY brake;
        """
        
        results = db.fetch_all(query)
        
        log.info("=== 데이터베이스 brake 값 분포 ===")
        if results:
            for row in results:
                brake_val, count, percentage = row
                log.info(f"brake = {brake_val}: {count:,}개 ({percentage:.1f}%)")
        else:
            log.warning("텔레메트리 데이터가 없습니다.")
            
        # 샘플 데이터 확인
        sample_query = """
        SELECT brake, speed, throttle, timestamp
        FROM live_telemetry_data 
        ORDER BY timestamp 
        LIMIT 10;
        """
        
        samples = db.fetch_all(sample_query)
        
        log.info("\n=== 샘플 텔레메트리 데이터 ===")
        if samples:
            for row in samples:
                brake, speed, throttle, timestamp = row
                log.info(f"시간: {timestamp}, brake: {brake}, speed: {speed}, throttle: {throttle}")
        else:
            log.warning("샘플 데이터가 없습니다.")
            
        return True
        
    except Exception as e:
        log.error(f"데이터베이스 brake 값 확인 실패: {e}")
        return False

if __name__ == "__main__":
    log.info("데이터베이스 brake 값 확인 시작")
    
    success = check_brake_values_in_db()
    
    if success:
        log.info("✅ 데이터베이스 brake 값 확인 완료")
    else:
        log.error("❌ 데이터베이스 brake 값 확인 실패")
    
    log.info("확인 완료")
