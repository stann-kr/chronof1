"""F1 서킷 정보 데이터베이스.

FastF1에서 제공하지 않는 서킷의 상세 정보를 보완합니다.
"""

from typing import Dict, Optional

# 알려진 F1 서킷들의 상세 정보
# 출처: Wikipedia, F1 공식 웹사이트
CIRCUIT_DATABASE = {
    # 호주
    "Melbourne": {
        "short_name": "Albert Park",
        "locality": "Melbourne", 
        "country": "Australia",
        "latitude": -37.8497,
        "longitude": 144.9681,
        "length": 5.303,  # km
        "turns": 14
    },
    
    # 바레인
    "Sakhir": {
        "short_name": "Bahrain",
        "locality": "Sakhir",
        "country": "Bahrain", 
        "latitude": 26.0325,
        "longitude": 50.5106,
        "length": 5.412,
        "turns": 15
    },
    
    # 사우디아라비아
    "Jeddah": {
        "short_name": "Jeddah Corniche",
        "locality": "Jeddah",
        "country": "Saudi Arabia",
        "latitude": 21.6319,
        "longitude": 39.1044,
        "length": 6.174,
        "turns": 27
    },
    
    # 중국 
    "Shanghai": {
        "short_name": "Shanghai",
        "locality": "Shanghai",
        "country": "China",
        "latitude": 31.3389,
        "longitude": 121.2197,
        "length": 5.451,
        "turns": 16
    },
    
    # 일본
    "Suzuka": {
        "short_name": "Suzuka",
        "locality": "Suzuka",
        "country": "Japan",
        "latitude": 34.8431,
        "longitude": 136.5407,
        "length": 5.807,
        "turns": 18
    },
    
    # 미국 (마이애미)
    "Miami": {
        "short_name": "Miami",
        "locality": "Miami Gardens",
        "country": "United States",
        "latitude": 25.9581,
        "longitude": -80.2389,
        "length": 5.412,
        "turns": 19
    },
    
    # 이탈리아 (이몰라)
    "Imola": {
        "short_name": "Imola",
        "locality": "Imola",
        "country": "Italy",
        "latitude": 44.3439,
        "longitude": 11.7167,
        "length": 4.909,
        "turns": 19
    },
    
    # 모나코
    "Monaco": {
        "short_name": "Monaco",
        "locality": "Monte Carlo",
        "country": "Monaco",
        "latitude": 43.7347,
        "longitude": 7.4206,
        "length": 3.337,
        "turns": 19
    },
    
    # 스페인
    "Barcelona": {
        "short_name": "Catalunya",
        "locality": "Montmeló",
        "country": "Spain",
        "latitude": 41.5700,
        "longitude": 2.2611,
        "length": 4.675,
        "turns": 16
    },
    
    # 캐나다
    "Montreal": {
        "short_name": "Gilles Villeneuve",
        "locality": "Montreal",
        "country": "Canada",
        "latitude": 45.5000,
        "longitude": -73.5228,
        "length": 4.361,
        "turns": 14
    },
    
    # 오스트리아
    "Spielberg": {
        "short_name": "Red Bull Ring",
        "locality": "Spielberg",
        "country": "Austria",
        "latitude": 47.2197,
        "longitude": 14.7647,
        "length": 4.318,
        "turns": 10
    },
    
    # 영국
    "Silverstone": {
        "short_name": "Silverstone",
        "locality": "Silverstone",
        "country": "United Kingdom",
        "latitude": 52.0786,
        "longitude": -1.0169,
        "length": 5.891,
        "turns": 18
    },
    
    # 헝가리
    "Budapest": {
        "short_name": "Hungaroring",
        "locality": "Mogyoród",
        "country": "Hungary",
        "latitude": 47.5789,
        "longitude": 19.2486,
        "length": 4.381,
        "turns": 14
    },
    
    # 벨기에
    "Spa": {
        "short_name": "Spa-Francorchamps",
        "locality": "Stavelot",
        "country": "Belgium",
        "latitude": 50.4372,
        "longitude": 5.9714,
        "length": 7.004,
        "turns": 19
    },
    
    # 네덜란드
    "Zandvoort": {
        "short_name": "Zandvoort",
        "locality": "Zandvoort",
        "country": "Netherlands",
        "latitude": 52.3888,
        "longitude": 4.5409,
        "length": 4.259,
        "turns": 14
    },
    
    # 이탈리아 (몬자)
    "Monza": {
        "short_name": "Monza",
        "locality": "Monza",
        "country": "Italy",
        "latitude": 45.6156,
        "longitude": 9.2811,
        "length": 5.793,
        "turns": 11
    },
    
    # 아제르바이잔
    "Baku": {
        "short_name": "Baku City Circuit",
        "locality": "Baku",
        "country": "Azerbaijan",
        "latitude": 40.3725,
        "longitude": 49.8533,
        "length": 6.003,
        "turns": 20
    },
    
    # 싱가포르
    "Marina Bay": {
        "short_name": "Marina Bay",
        "locality": "Singapore",
        "country": "Singapore",
        "latitude": 1.2914,
        "longitude": 103.8644,
        "length": 5.063,
        "turns": 23
    },
    
    # 미국 (오스틴)
    "Austin": {
        "short_name": "COTA",
        "locality": "Austin",
        "country": "United States",
        "latitude": 30.1328,
        "longitude": -97.6411,
        "length": 5.513,
        "turns": 20
    },
    
    # 멕시코
    "Mexico City": {
        "short_name": "Hermanos Rodríguez",
        "locality": "Mexico City",
        "country": "Mexico",
        "latitude": 19.4042,
        "longitude": -99.0907,
        "length": 4.304,
        "turns": 17
    },
    
    # 브라질
    "São Paulo": {
        "short_name": "Interlagos",
        "locality": "São Paulo",
        "country": "Brazil",
        "latitude": -23.7036,
        "longitude": -46.6997,
        "length": 4.309,
        "turns": 15
    },
    
    # 미국 (라스베이거스)
    "Las Vegas": {
        "short_name": "Las Vegas Strip",
        "locality": "Las Vegas",
        "country": "United States",
        "latitude": 36.1147,
        "longitude": -115.1728,
        "length": 6.201,
        "turns": 17
    },
    
    # 카타르
    "Lusail": {
        "short_name": "Lusail",
        "locality": "Lusail",
        "country": "Qatar",
        "latitude": 25.4900,
        "longitude": 51.4542,
        "length": 5.419,
        "turns": 16
    },
    
    # 아랍에미리트
    "Yas Marina": {
        "short_name": "Yas Marina",
        "locality": "Abu Dhabi",
        "country": "United Arab Emirates",
        "latitude": 24.4672,
        "longitude": 54.6031,
        "length": 5.281,
        "turns": 16
    }
}

def get_circuit_info(location: str) -> Optional[Dict]:
    """위치 이름을 기반으로 서킷 정보를 반환합니다.
    
    Args:
        location: FastF1에서 제공하는 Location 값
        
    Returns:
        서킷 정보 딕셔너리 또는 None
    """
    # 정확한 매칭 우선 시도
    if location in CIRCUIT_DATABASE:
        return CIRCUIT_DATABASE[location]
    
    # 부분 매칭 시도 (대소문자 무시)
    location_lower = location.lower()
    for key, data in CIRCUIT_DATABASE.items():
        if key.lower() in location_lower or location_lower in key.lower():
            return data
    
    return None

def get_season_dates(year: int) -> tuple:
    """시즌의 대략적인 시작과 종료 날짜를 반환합니다.
    
    Args:
        year: 시즌 연도
        
    Returns:
        (시작일, 종료일) 튜플 (month, day)
    """
    # F1 시즌은 보통 3월 초에 시작해서 12월 초에 끝남
    # 2020년 이후 코로나로 인한 일정 변화를 고려
    
    if year >= 2020:
        # 코로나 이후 시즌 일정
        start_month, start_day = 3, 1  # 3월 초
        end_month, end_day = 12, 15    # 12월 중순
    else:
        # 전통적인 시즌 일정
        start_month, start_day = 3, 15  # 3월 중순
        end_month, end_day = 11, 30     # 11월 말
    
    return (start_month, start_day), (end_month, end_day)
