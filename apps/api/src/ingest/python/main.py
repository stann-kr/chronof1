#!/usr/bin/env python3
"""
ChronoF1 ETL 메인 스크립트

FastF1 데이터를 ChronoF1 PostgreSQL 데이터베이스에 적재하는 ETL 파이프라인입니다.

Author: ChronoF1 Team
Date: 2025-08-01
"""

import os
import sys
import logging
import argparse
from datetime import datetime
from typing import List, Optional
from dotenv import load_dotenv

# 로컬 모듈 임포트
from core.database import DatabaseManager
from core.etl_processor import ETLProcessor
from core.config import ETLConfig
from utils.logger import setup_logger

# 환경 변수 로드
load_dotenv(os.path.join(os.path.dirname(__file__), '../../../../../.env'), override=True)

# 로거 설정
log = setup_logger(__name__)


class ChronoF1ETL:
    """ChronoF1 ETL 메인 클래스"""
    
    def __init__(self):
        """ETL 초기화"""
        self.config = ETLConfig()
        self.db_manager = DatabaseManager()
        self.processor = ETLProcessor(self.db_manager)
    
    def run_season(self, year: int, round_spec: Optional[str] = None, 
                   include_telemetry: bool = False, force: bool = False) -> bool:
        """시즌 데이터 적재
        
        Args:
            year: 시즌 연도
            round_spec: 라운드 지정 (None=전체, 숫자=특정라운드, "1-5"=범위)
            include_telemetry: 텔레메트리 데이터 포함 여부
            force: 기존 데이터 덮어쓰기 여부
            
        Returns:
            성공 여부
        """
        try:
            log.info(f"시즌 {year} ETL 시작 (라운드: {round_spec or '전체'}, 텔레메트리: {include_telemetry})")
            
            # 세션 타입 정의 (우선순위 순)
            session_types = ['R', 'Q', 'SQ', 'S', 'FP3', 'FP2', 'FP1']
            
            if round_spec:
                # 라운드 범위 파싱
                round_numbers = self._parse_round_spec(round_spec)
                return self._process_rounds(year, round_numbers, session_types, include_telemetry, force)
            else:
                # 전체 시즌 처리
                return self._process_season(year, session_types, include_telemetry, force)
                
        except Exception as e:
            log.error(f"시즌 {year} ETL 실패: {e}")
            return False
    
    def run_season_range(self, start_year: int, end_year: int, 
                        include_telemetry: bool = False, force: bool = False) -> bool:
        """시즌 범위 데이터 적재
        
        Args:
            start_year: 시작 시즌
            end_year: 종료 시즌
            include_telemetry: 텔레메트리 데이터 포함 여부
            force: 기존 데이터 덮어쓰기 여부
            
        Returns:
            성공 여부
        """
        try:
            log.info(f"시즌 범위 {start_year}-{end_year} ETL 시작")
            
            success_count = 0
            total_count = end_year - start_year + 1
            
            for year in range(start_year, end_year + 1):
                if self.run_season(year, include_telemetry=include_telemetry, force=force):
                    success_count += 1
                    log.info(f"시즌 {year} 완료 ({success_count}/{total_count})")
                else:
                    log.error(f"시즌 {year} 실패")
            
            log.info(f"시즌 범위 ETL 완료: {success_count}/{total_count} 성공")
            return success_count == total_count
            
        except Exception as e:
            log.error(f"시즌 범위 {start_year}-{end_year} ETL 실패: {e}")
            return False
    
    def _parse_round_spec(self, round_spec: str) -> List[int]:
        """라운드 사양 파싱
        
        Args:
            round_spec: 라운드 사양 ("5", "1-5", "3,5,7", "1,3-5,8" 등)
            
        Returns:
            라운드 번호 리스트
        """
        round_numbers = []
        
        try:
            # 콤마로 분리하여 각 부분을 처리
            parts = [part.strip() for part in round_spec.split(",")]
            
            for part in parts:
                if "-" in part:
                    # 범위 형식 (예: "3-5")
                    start_str, end_str = part.split("-", 1)
                    start_round = int(start_str.strip())
                    end_round = int(end_str.strip())
                    
                    if start_round > end_round:
                        raise ValueError(f"시작 라운드({start_round})가 종료 라운드({end_round})보다 큽니다")
                    
                    round_numbers.extend(range(start_round, end_round + 1))
                else:
                    # 단일 라운드 형식 (예: "5")
                    round_numbers.append(int(part))
            
            # 라운드 번호 유효성 검사
            for round_num in round_numbers:
                if round_num < 1 or round_num > 30:  # F1은 보통 최대 24라운드
                    log.warning(f"라운드 번호 {round_num}는 일반적인 범위(1-30)를 벗어납니다")
            
            final_rounds = sorted(set(round_numbers))  # 중복 제거 및 정렬
            log.info(f"라운드 파싱 완료: '{round_spec}' → {final_rounds}")
            return final_rounds
                    
        except ValueError as e:
            raise ValueError(f"잘못된 라운드 형식 '{round_spec}': {e}")
    
    def _process_rounds(self, year: int, round_numbers: List[int], session_types: List[str], 
                       include_telemetry: bool, force: bool) -> bool:
        """특정 라운드들 처리"""
        try:
            log.info(f"라운드 {round_numbers} 처리 시작")
            
            success_count = 0
            total_rounds = len(round_numbers)
            
            for round_num in round_numbers:
                if self._process_round(year, round_num, session_types, include_telemetry, force):
                    success_count += 1
                    log.info(f"라운드 {round_num} 완료 ({success_count}/{total_rounds})")
                else:
                    log.error(f"라운드 {round_num} 실패")
            
            log.info(f"라운드 처리 완료: {success_count}/{total_rounds} 성공")
            return success_count > 0
            
        except Exception as e:
            log.error(f"라운드 처리 실패: {e}")
            return False

    def _process_season(self, year: int, session_types: List[str], 
                       include_telemetry: bool, force: bool) -> bool:
        """전체 시즌 처리"""
        try:
            # 시즌 일정 가져오기
            schedule = self.processor.fetch_season_schedule(year)
            
            success_count = 0
            total_rounds = len(schedule)
            
            for round_data in schedule:
                round_num = round_data['round']
                
                if self._process_round(year, round_num, session_types, include_telemetry, force):
                    success_count += 1
                    log.info(f"라운드 {round_num} 완료 ({success_count}/{total_rounds})")
                else:
                    log.error(f"라운드 {round_num} 실패")
            
            log.info(f"시즌 {year} 완료: {success_count}/{total_rounds} 라운드 성공")
            return success_count > 0
            
        except Exception as e:
            log.error(f"시즌 {year} 처리 실패: {e}")
            return False
    
    def _process_round(self, year: int, round_num: int, session_types: List[str], 
                      include_telemetry: bool, force: bool) -> bool:
        """특정 라운드 처리"""
        try:
            log.info(f"라운드 {round_num} 처리 시작")
            
            # 존재하는 세션 타입만 필터링
            available_sessions = self._get_available_sessions(year, round_num, session_types)
            if not available_sessions:
                log.warning(f"라운드 {round_num}에 처리 가능한 세션이 없습니다.")
                return False
            
            log.info(f"라운드 {round_num} 처리 대상 세션: {available_sessions}")
            success_count = 0
            
            for session_type in available_sessions:
                try:
                    if self.processor.process_session(year, round_num, session_type, 
                                                    include_telemetry, force):
                        success_count += 1
                        log.info(f"세션 {session_type} 완료")
                    else:
                        log.warning(f"세션 {session_type} 처리 실패 또는 건너뜀")
                        
                except Exception as e:
                    log.error(f"세션 {session_type} 처리 중 오류: {e}")
            
            log.info(f"라운드 {round_num} 완료: {success_count}개 세션 성공")
            return success_count > 0
            
        except Exception as e:
            log.error(f"라운드 {round_num} 처리 실패: {e}")
            return False
    
    def _get_available_sessions(self, year: int, round_num: int, session_types: List[str]) -> List[str]:
        """해당 라운드에서 사용 가능한 세션 타입들을 반환"""
        available_sessions = []
        
        for session_type in session_types:
            if self.processor._session_exists(year, round_num, session_type):
                available_sessions.append(session_type)
            else:
                log.debug(f"세션 {session_type}이 {year} R{round_num}에 존재하지 않음")
        
        return available_sessions
    
    def close(self):
        """리소스 정리"""
        if self.db_manager:
            self.db_manager.close()


def parse_arguments():
    """명령행 인수 파싱"""
    parser = argparse.ArgumentParser(
        description="ChronoF1 ETL - FastF1 데이터를 PostgreSQL에 적재",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
사용 예시:
  python main.py 2024                    # 2024 시즌 전체
  python main.py 2024 5                  # 2024 시즌 5라운드만
  python main.py 2024 1-5                # 2024 시즌 1-5라운드
  python main.py 2024 3,5,7              # 2024 시즌 3,5,7라운드
  python main.py 2022-2024               # 2022-2024 시즌 범위
  python main.py 2023 --telemetry        # 2023 시즌 + 텔레메트리
  python main.py 2024 --force            # 기존 데이터 덮어쓰기
        """
    )
    
    parser.add_argument(
        "season",
        help="시즌 연도 (예: 2024) 또는 시즌 범위 (예: 2022-2024)"
    )
    
    parser.add_argument(
        "round",
        nargs="?",
        help="라운드 지정 (예: 5, 1-5, 3,5,7) - 선택사항"
    )
    
    parser.add_argument(
        "--telemetry",
        action="store_true",
        help="텔레메트리 데이터도 함께 적재"
    )
    
    parser.add_argument(
        "--force",
        action="store_true",
        help="기존 데이터가 있어도 덮어쓰기"
    )
    
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="로그 레벨 설정"
    )
    
    return parser.parse_args()


def main():
    """메인 함수"""
    args = parse_arguments()
    
    # 로그 레벨 설정
    logging.getLogger().setLevel(getattr(logging, args.log_level))
    
    etl = None
    
    try:
        # ETL 인스턴스 생성
        etl = ChronoF1ETL()
        
        # 시즌 파싱
        if "-" in args.season:
            # 시즌 범위 처리
            start_year, end_year = map(int, args.season.split("-"))
            
            if args.round:
                log.error("시즌 범위와 특정 라운드는 함께 사용할 수 없습니다.")
                return 1
            
            success = etl.run_season_range(
                start_year, end_year, 
                include_telemetry=args.telemetry,
                force=args.force
            )
        else:
            # 단일 시즌 처리
            year = int(args.season)
            
            success = etl.run_season(
                year, 
                round_spec=args.round,
                include_telemetry=args.telemetry,
                force=args.force
            )
        
        return 0 if success else 1
        
    except ValueError as e:
        log.error(f"잘못된 시즌 형식: {args.season}")
        return 1
    except KeyboardInterrupt:
        log.info("사용자에 의해 중단됨")
        return 1
    except Exception as e:
        log.error(f"예상치 못한 오류: {e}")
        return 1
    finally:
        if etl:
            etl.close()


if __name__ == "__main__":
    sys.exit(main())
