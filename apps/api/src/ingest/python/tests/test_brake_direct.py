#!/usr/bin/env python3
"""
브레이크 값을 직접 PostgreSQL에 저장하는 테스트 스크립트.
"""

import os
import logging
import psycopg2
import pandas as pd
from dotenv import load_dotenv
import re
from datetime import datetime

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
)
log = logging.getLogger("test_brake_direct")

def main():
    """메인 함수."""
    # .env 파일 로드
    load_dotenv()

    # DATABASE_URL에서 접속 정보 추출
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        log.error('DATABASE_URL 환경 변수를 찾을 수 없습니다.')
        return
    
    # postgresql://username:password@host:port/database 형식 파싱
    match = re.match(r'postgresql://(.+?):(.+?)@(.+?):(\d+)/(.+)', db_url)
    if not match:
        log.error('DATABASE_URL 형식이 올바르지 않습니다.')
        return
    
    db_user, db_password, db_host, db_port, db_name = match.groups()
    
    # 데이터베이스 연결
    try:
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            database=db_name,
            user=db_user,
            password=db_password
        )
        conn.autocommit = False  # 트랜잭션 사용
        
        with conn.cursor() as cur:
            # 테스트 드라이버 세션 확인
            cur.execute("SELECT id FROM live_driver_sessions ORDER BY id DESC LIMIT 1")
            driver_session_id = cur.fetchone()[0]
            log.info(f"테스트에 사용할 드라이버 세션 ID: {driver_session_id}")
            
            # 테스트 데이터 생성 (True, False, None 값을 포함한 데이터)
            test_data = [
                (driver_session_id, datetime.now(), None, None, None, 100.0, 10000.0, 4, 80.0, True, 0, 1000.0, 0.5, None, None, "test"),
                (driver_session_id, datetime.now(), None, None, None, 120.0, 12000.0, 5, 90.0, False, 0, 1100.0, 0.6, None, None, "test"),
                (driver_session_id, datetime.now(), None, None, None, 140.0, 13000.0, 6, 100.0, True, 0, 1200.0, 0.7, None, None, "test"),
                (driver_session_id, datetime.now(), None, None, None, 160.0, 14000.0, 7, 0.0, False, 0, 1300.0, 0.8, None, None, "test"),
                (driver_session_id, datetime.now(), None, None, None, 180.0, 15000.0, 8, 10.0, None, 0, 1400.0, 0.9, None, None, "test")
            ]
            
            # 테스트 데이터 삽입
            sql = '''
            INSERT INTO "live_telemetry_data" 
            (driver_session_id, timestamp, lap_number, session_time, lap_time,
             speed, rpm, gear, throttle, brake, drs, 
             distance, relative_distance, driver_ahead, distance_to_driver_ahead, source) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            '''
            
            cur.executemany(sql, test_data)
            conn.commit()
            log.info(f"테스트 데이터 {len(test_data)}개 삽입됨")
            
            # 삽입된 데이터 확인
            cur.execute('''
                SELECT id, speed, throttle, brake, gear 
                FROM "live_telemetry_data" 
                WHERE source = 'test' 
                ORDER BY id DESC 
                LIMIT 10
            ''')
            
            rows = cur.fetchall()
            log.info("삽입된 테스트 데이터:")
            for row in rows:
                log.info(f"ID: {row[0]}, Speed: {row[1]}, Throttle: {row[2]}, Brake: {row[3]}, Gear: {row[4]}")
        
        conn.close()
        log.info("테스트 완료")
        
    except Exception as e:
        log.error(f"데이터베이스 오류: {e}")

if __name__ == "__main__":
    main()
