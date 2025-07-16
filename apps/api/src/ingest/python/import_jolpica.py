#!/usr/bin/env python3
"""
Jolpica API를 사용하여 F1 타이밍 데이터를 가져오는 스크립트
"""

import argparse
import json
import sys
import requests
from datetime import datetime
import time

def main():
    parser = argparse.ArgumentParser(description='Import F1 timing data from Jolpica API')
    parser.add_argument('--session-key', type=str, required=True, help='Session key (format: YEAR_ROUND_SESSION)')
    
    args = parser.parse_args()
    
    try:
        # 세션 키에서 연도, 라운드, 세션 타입 파싱
        parts = args.session_key.split('_')
        if len(parts) != 3:
            raise ValueError("Invalid session key format. Expected: YEAR_ROUND_SESSION")
            
        year = int(parts[0])
        round_num = int(parts[1])
        session_type = parts[2]
        
        # Jolpica API 엔드포인트
        base_url = "https://api.jolpica-f1.com/v1"  # 가상의 API 주소
        
        # 세션 정보 가져오기
        session_url = f"{base_url}/seasons/{year}/rounds/{round_num}/sessions/{session_type}"
        session_response = requests.get(session_url)
        
        if session_response.status_code != 200:
            raise Exception(f"Failed to fetch session data: {session_response.status_code}")
            
        session_data = session_response.json()
        
        # 타이밍 데이터 가져오기
        timing_url = f"{session_url}/timing"
        timing_response = requests.get(timing_url)
        
        if timing_response.status_code != 200:
            raise Exception(f"Failed to fetch timing data: {timing_response.status_code}")
            
        timing_data = timing_response.json()
        
        # 결과 구성
        result = {
            "session": session_data,
            "timing_frames": timing_data["frames"],
            "total_frames": len(timing_data["frames"]),
            "first_frame": timing_data["frames"][0]["frame_number"] if timing_data["frames"] else None,
            "last_frame": timing_data["frames"][-1]["frame_number"] if timing_data["frames"] else None,
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            'error': str(e)
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()
