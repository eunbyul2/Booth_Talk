#!/usr/bin/env python3
"""
CSV 전시회 데이터를 SQL INSERT 문으로 변환하는 스크립트
"""

import csv
import random
from datetime import datetime, time

def convert_csv_to_sql():
    # CSV 파일 읽기
    with open('expo_schedule_2025.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        expo_data = list(reader)
    
    # Venue 매핑 (CSV venue -> DB venue_id)
    venue_mapping = {
        '코엑스(COEX)': 1,
        '킨텍스(KINTEX)': 2,
        '벡스코(BEXCO)': 3,
        '코엑스 마곡(COEX MAGOK)': 1,  # 코엑스 계열로 분류
        '수원컨벤션센터(Suwon Convention Center)': 5,  # 새로 추가할 venue
        'aT센터(aT Center)': 6,
        '수원메쎄(SUWON MESSE)': 7,
        '세텍(SETEC)': 8,
        '송도컨벤시아(Songdo ConvensiA)': 9,
        '경주화백컨벤션센터(HICO)': 10,
        '김대중컨벤션센터(KDJ Center)': 11,
        '엑스코(EXCO)': 12,
        'etc(기타)': 1  # 기타는 코엑스로 분류
    }
    
    # 새로운 venues SQL 생성
    new_venues = [
        "(5, '수원컨벤션센터', '경기', '경기도 수원시 영통구 광교중앙로 140', '수원시 대표 컨벤션센터', 'https://suwonconvention.co.kr', TRUE)",
        "(6, 'aT센터', '서울', '서울특별시 서초구 강남대로 27', '농수산식품 전문 전시컨벤션센터', 'https://www.atcenter.or.kr', TRUE)",
        "(7, '수원메쎄', '경기', '경기도 수원시 영통구 센트럴타운로 22', '수원시 전시컨벤션센터', 'https://www.suwonmesse.com', TRUE)",
        "(8, '세텍', '서울', '서울특별시 강남구 남부순환로 3104', '서울 종합 전시장', 'https://www.setec.or.kr', TRUE)",
        "(9, '송도컨벤시아', '인천', '인천광역시 연수구 센트럴로 123', '송도국제도시 컨벤션센터', 'https://www.songdoconvensia.com', TRUE)",
        "(10, '경주화백컨벤션센터', '경북', '경상북도 경주시 보문로 182', '경주 대표 컨벤션센터', 'https://www.hico.or.kr', TRUE)",
        "(11, '김대중컨벤션센터', '광주', '광주광역시 서구 상무누리로 30', '광주 대표 컨벤션센터', 'https://www.kimdaejungconventioncenter.go.kr', TRUE)",
        "(12, '엑스코', '대구', '대구광역시 북구 엑스코로 10', '대구 전시컨벤션센터', 'https://www.exco.co.kr', TRUE)"
    ]
    
    # Company 생성 (전시회 주최자 기반)
    organizers = set()
    for row in expo_data:
        organizer = row['organizer'].split(',')[0].strip()  # 첫 번째 주최자만 사용
        if organizer:
            organizers.add(organizer)
    
    company_list = list(organizers)[:20]  # 최대 20개 회사
    
    # Events SQL 생성
    events_sql = []
    
    for i, row in enumerate(expo_data, 1):
        if i > 50:  # 최대 50개 이벤트만
            break
            
        # 랜덤 데이터 생성
        organizer = row['organizer'].split(',')[0].strip()
        company_id = (company_list.index(organizer) % len(company_list)) + 1 if organizer in company_list else 1
        venue_id = venue_mapping.get(row['venue'], 1)
        
        # 부스 번호 생성
        booth_number = f"B{random.randint(1000, 9999)}"
        
        # 시간 설정 (기본값)
        start_time = "09:00"
        end_time = "18:00"
        
        # 설명 생성
        description = f"{row['title']} - {row['organizer'][:50]}..."
        
        # 카테고리 생성
        categories = [row['title'][:30], "전시회"]
        
        # 랜덤 데이터
        capacity = random.randint(100, 500)
        current_participants = random.randint(20, capacity//2)
        view_count = random.randint(50, 1000)
        like_count = random.randint(5, 100)
        
        event_sql = f"""    ({i}, {company_id}, {venue_id}, '{row['title'].replace("'", "''")}', '전시회', '{booth_number}', '{row['venue']}', '37.5113', '127.0592', '{row['start_date']}', '{row['end_date']}', '{start_time}', '{end_time}', '{description.replace("'", "''")}', '현장 방문', '전시 관람, 정보 제공', {capacity}, {current_participants}, 'https://via.placeholder.com/400x200/FF6B6B/FFFFFF?text=Exhibition', '[\"https://via.placeholder.com/120x120/FF6B6B/FFFFFF?text=Expo\"]'::JSONB, NULL, '{{}}'::JSONB, '{categories}'::JSONB, TRUE, {random.choice(['TRUE', 'FALSE'])}, {view_count}, {like_count})"""
        
        events_sql.append(event_sql)
    
    # Company SQL 생성
    companies_sql = []
    for i, company in enumerate(company_list, 1):
        username = f"company{i:02d}"
        company_sql = f"""    ({i}, '{company.replace("'", "''")}', '{username}', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7eJR0ZCWE6', '{random.randint(100, 999)}-{random.randint(10, 99)}-{random.randint(10000, 99999)}', '{username}@example.com', '02-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}', '서울특별시 강남구 테헤란로 {random.randint(100, 999)}', 'https://{username}.com', TRUE, 1)"""
        companies_sql.append(company_sql)
    
    print("-- 새로운 Venues 추가")
    print("INSERT INTO venues (id, venue_name, location, address, description, website_url, is_active)")
    print("VALUES")
    print(",\n".join(new_venues) + ";")
    print()
    
    print("-- 실제 전시회 주최자 기반 Companies")
    print("INSERT INTO companies (")
    print("    id, company_name, username, password_hash, business_number, email, phone, address, website_url, is_active, created_by")
    print(") VALUES")
    print(",\n".join(companies_sql) + ";")
    print()
    
    print("-- 실제 2025 전시회 데이터 기반 Events")
    print("INSERT INTO events (")
    print("    id, company_id, venue_id, event_name, event_type, booth_number, location, latitude, longitude,")
    print("    start_date, end_date, start_time, end_time, description, participation_method, benefits,")
    print("    capacity, current_participants, image_url, additional_images, pdf_url, ocr_data, categories,")
    print("    is_active, is_featured, view_count, like_count")
    print(") VALUES")
    print(",\n".join(events_sql) + ";")

if __name__ == "__main__":
    convert_csv_to_sql()