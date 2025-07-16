#!/usr/bin/env python3
"""
사용 가능한 F1 세션 목록을 가져오는 스크립트
"""

import argparse
import json
import sys
import fastf1
from fastf1.ergast import Ergast

def main():
    parser = argparse.ArgumentParser(description='List available F1 sessions')
    parser.add_argument('--year', type=int, help='Season year')
    
    args = parser.parse_args()
    
    try:
        # Ergast API를 통한 데이터 로드
        ergast = Ergast()
        
        if args.year:
            # 특정 연도의 모든 라운드 가져오기
            ergast.season(args.year)
            races = ergast.get_race_schedule()
            
            result = []
            for _, race in races.iterrows():
                race_data = {
                    'year': args.year,
                    'round': race['round'],
                    'event_name': race['raceName'],
                    'circuit_name': race['circuitName'],
                    'date': race['date'],
                    'sessions': [
                        {'session_key': f"{args.year}_{race['round']}_FP1", 'session_type': 'FP1', 'name': 'Practice 1'},
                        {'session_key': f"{args.year}_{race['round']}_FP2", 'session_type': 'FP2', 'name': 'Practice 2'},
                        {'session_key': f"{args.year}_{race['round']}_FP3", 'session_type': 'FP3', 'name': 'Practice 3'},
                        {'session_key': f"{args.year}_{race['round']}_Q", 'session_type': 'Q', 'name': 'Qualifying'},
                        {'session_key': f"{args.year}_{race['round']}_R", 'session_type': 'R', 'name': 'Race'}
                    ]
                }
                
                # 스프린트 경주가 있는 경우 추가
                if 'sprint' in race and race['sprint']:
                    race_data['sessions'].append(
                        {'session_key': f"{args.year}_{race['round']}_SQ", 'session_type': 'SQ', 'name': 'Sprint Qualifying'}
                    )
                    race_data['sessions'].append(
                        {'session_key': f"{args.year}_{race['round']}_S", 'session_type': 'S', 'name': 'Sprint Race'}
                    )
                
                result.append(race_data)
        else:
            # 사용 가능한 모든 연도 목록
            current_year = 2025  # 현재 연도를 하드코딩
            years = list(range(2018, current_year + 1))  # 2018년부터 현재까지
            result = {'available_years': years}
        
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            'error': str(e)
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()
