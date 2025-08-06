#!/usr/bin/env python3
"""
PostgreSQL Boolean 저장 테스트
실제 데이터베이스에 Boolean 값을 저장할 때 문제가 있는지 확인
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from db import PgDb
import logging

# 로깅 설정
logging.basicConfig(level=logging.DEBUG)
log = logging.getLogger(__name__)

def test_postgresql_boolean():
    """PostgreSQL Boolean 저장 테스트"""
    
    try:
        # 데이터베이스 연결
        db = PgDb()
        
        # 트랜잭션 사용하여 테스트
        with db.transaction() as cur:
            # 테스트 테이블 생성 (임시)
            create_sql = '''
            CREATE TEMPORARY TABLE test_boolean (
                id SERIAL PRIMARY KEY,
                brake_value BOOLEAN
            );
            '''
            
            cur.execute(create_sql)
            log.info("임시 테스트 테이블 생성됨")
            
            # 다양한 Boolean 값 테스트
            test_values = [
                True,
                False,
                None,
                bool(1),
                bool(0)
            ]
            
            log.info("=== Boolean 값 저장 테스트 ===")
            
            for i, value in enumerate(test_values):
                try:
                    insert_sql = "INSERT INTO test_boolean (brake_value) VALUES (%s)"
                    cur.execute(insert_sql, (value,))
                    log.info(f"✅ 값 {value} (타입: {type(value)}) 저장 성공")
                except Exception as e:
                    log.error(f"❌ 값 {value} (타입: {type(value)}) 저장 실패: {e}")
                    
            # 저장된 값 확인
            select_sql = "SELECT id, brake_value FROM test_boolean ORDER BY id"
            cur.execute(select_sql)
            results = cur.fetchall()
            
            log.info("\n=== 저장된 값 확인 ===")
            for row in results:
                log.info(f"ID: {row[0]}, brake_value: {row[1]} (타입: {type(row[1])})")
                
        return True
        
    except Exception as e:
        log.error(f"PostgreSQL Boolean 테스트 실패: {e}")
        return False

if __name__ == "__main__":
    log.info("PostgreSQL Boolean 저장 테스트 시작")
    
    success = test_postgresql_boolean()
    
    if success:
        log.info("✅ PostgreSQL Boolean 저장 테스트 성공")
    else:
        log.error("❌ PostgreSQL Boolean 저장 테스트 실패")
    
    log.info("테스트 완료")
