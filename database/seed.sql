-- Booth Talk seed data (matches SQLAlchemy ORM schema)
-- Run after applying database/schema.sql

BEGIN;

-- Reset tables and sequences
TRUNCATE TABLE
    system_logs,
    event_views,
    event_likes,
    survey_responses,
    surveys,
    event_managers,
    event_tags,
    tags,
    events,
    companies,
    venues,
    admins
RESTART IDENTITY CASCADE;

-- 1. Admin account --------------------------------------------------------
INSERT INTO admins (id, username, password_hash, email, full_name, is_active)
VALUES (1, 'root', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7eJR0ZCWE6', 'admin@boothtalk.com', '슈퍼 관리자', TRUE);

-- 2. Venues ---------------------------------------------------------------
INSERT INTO venues (id, venue_name, location, address, description, website_url, is_active)
VALUES
    (1, '코엑스', '서울', '서울특별시 강남구 영동대로 513', '국내 최대 규모의 복합 전시·컨벤션 센터', 'https://www.coexcenter.com', TRUE),
    (2, '킨텍스', '경기', '경기도 고양시 일산서구 킨텍스로 217-60', '대한민국 대표 국제 전시장', 'https://www.kintex.com', TRUE),
    (3, '벡스코', '부산', '부산광역시 해운대구 APEC로 55', '국제회의와 대형 박람회가 열리는 복합 전시장', 'https://www.bexco.co.kr', TRUE),
    (4, 'DDP', '서울', '서울특별시 중구 을지로 281', '디자인과 패션, IT 행사가 열리는 복합 문화 공간', 'https://ddp.or.kr', TRUE);

-- 3. Companies ------------------------------------------------------------
INSERT INTO companies (
    id,
    company_name,
    username,
    password_hash,
    business_number,
    email,
    phone,
    address,
    website_url,
    is_active,
    created_by
) VALUES
    (1, '농업회사법인', 'nongup', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7eJR0ZCWE6', '123-45-67890', 'contact@nongup.com', '02-1234-5678', '서울특별시 강남구 테헤란로 123', 'https://nongup.com', TRUE, 1),
    (2, '(주)대일피비', 'daeilpb', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7eJR0ZCWE6', '234-56-78901', 'info@daeilpb.com', '02-2345-6789', '서울특별시 서초구 서초대로 456', 'https://daeilpb.com', TRUE, 1),
    (3, '특별한헬스클럽', 'healthclub', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7eJR0ZCWE6', '345-67-89012', 'hello@healthclub.com', '031-3456-7890', '경기도 성남시 분당구 판교로 789', 'https://healthclub.com', TRUE, 1),
    (4, '협찬투어', 'hyupchantour', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7eJR0ZCWE6', '456-78-90123', 'contact@hyupchantour.com', '051-4567-8901', '부산광역시 해운대구 센텀중앙로 101', 'https://hyupchantour.com', TRUE, 1),
    (5, 'TechCorp', 'techcorp', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7eJR0ZCWE6', '567-89-01234', 'hello@techcorp.com', '02-7890-1234', '서울특별시 강남구 봉은사로 501', 'https://techcorp.com', TRUE, 1),
    (6, 'ElecTech', 'electech', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7eJR0ZCWE6', '678-90-12345', 'support@electech.com', '031-6789-0123', '경기도 고양시 일산동구 중앙로 700', 'https://electech.co.kr', TRUE, 1),
    (7, 'BioInnovate', 'bioinnovate', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7eJR0ZCWE6', '789-01-23456', 'contact@bioinnovate.com', '051-7890-1234', '부산광역시 해운대구 센텀남대로 35', 'https://bioinnovate.kr', TRUE, 1),
    (8, 'ABC Corporation', 'abccorp', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7eJR0ZCWE6', '890-12-34567', 'hello@abccorp.com', '02-8901-2345', '서울특별시 송파구 올림픽로 300', 'https://abc-corp.kr', TRUE, 1);

-- 4. Events ---------------------------------------------------------------
INSERT INTO events (
    id,
    company_id,
    venue_id,
    event_name,
    event_type,
    booth_number,
    location,
    latitude,
    longitude,
    start_date,
    end_date,
    start_time,
    end_time,
    description,
    participation_method,
    benefits,
    capacity,
    current_participants,
    image_url,
    additional_images,
    pdf_url,
    ocr_data,
    categories,
    is_active,
    is_featured,
    view_count,
    like_count
) VALUES
    (1, 1, 1, '[S0902] 농업회사법인(주)해남진호드모', '전시회', 'B5001', '코엑스 제1전시관 A·B·C', '37.5113', '127.0592', '2025-10-29', '2025-11-01', '11:00', '15:00', '당일 조달로 시작', '현장 방문 및 사전 등록', '무료 시식, 할인 쿠폰 제공', 100, 48, 'https://via.placeholder.com/400x200/FF6B6B/FFFFFF?text=농업회사법인', '["https://via.placeholder.com/120x120/FF6B6B/FFFFFF?text=농업회사법인"]'::JSONB, NULL, '{}'::JSONB, '["2025 코엑스 푸드위크", "식품"]'::JSONB, TRUE, TRUE, 420, 68),
    (2, 2, 1, '[B5201] (주)대일피비', '전시회', 'B5201', '코엑스 제1전시관 A·B·C', '37.5113', '127.0592', '2025-10-29', '2025-11-01', '11:00', '15:00', '세계각국의 맛을 시음', '자유 관람', '무료 시식, 경품 추첨', 150, 72, 'https://via.placeholder.com/400x200/4ECDC4/FFFFFF?text=대일피비', '["https://via.placeholder.com/120x120/4ECDC4/FFFFFF?text=대일피비"]'::JSONB, NULL, '{}'::JSONB, '["2025 코엑스 푸드위크", "식품"]'::JSONB, TRUE, TRUE, 315, 54),
    (3, 3, 1, '[특별관] 헬스클럽레저 컴퍼니', '체험', 'A-312', '코엑스 특별관', '37.5113', '127.0592', '2025-10-29', '2025-11-01', '10:00', '17:00', '헬시플레저 라이프 공유소', '사전 예약 권장', '건강 상담, 샘플 증정', 80, 36, 'https://via.placeholder.com/400x200/95E1D3/FFFFFF?text=헬스클럽', '["https://via.placeholder.com/120x120/95E1D3/FFFFFF?text=헬스클럽"]'::JSONB, NULL, '{}'::JSONB, '["2025 코엑스 푸드위크", "건강/웰빙"]'::JSONB, TRUE, FALSE, 198, 36),
    (4, 4, 1, '[B5001] 협찬투어', '문화이벤트', 'B5001', '코엑스 B홀', '37.5113', '127.0592', '2025-10-29', '2025-11-01', '10:00', '17:00', '스페인 타파스 문화 체험 및 올리브 탐방', '현장 등록 가능', '여행 상담, 할인 쿠폰', 120, 52, 'https://via.placeholder.com/400x200/F38181/FFFFFF?text=협찬투어', '["https://via.placeholder.com/120x120/F38181/FFFFFF?text=협찬투어"]'::JSONB, NULL, '{}'::JSONB, '["2025 코엑스 푸드위크", "여행/문화"]'::JSONB, TRUE, TRUE, 256, 41),
    (5, 1, 1, '[S0902] 농업회사법인(주)해남진호드모 스페셜', '전시회', 'S0902', '코엑스 제1전시관 A·B·C', '37.5113', '127.0592', '2025-10-29', '2025-11-01', '11:00', '15:00', '당일 조달로 시작 (스페셜 세션)', '현장 방문', '무료 시식, 기념품 증정', 100, 30, 'https://via.placeholder.com/400x200/AA96DA/FFFFFF?text=농업회사법인', '["https://via.placeholder.com/120x120/AA96DA/FFFFFF?text=농업회사법인"]'::JSONB, NULL, '{}'::JSONB, '["2025 코엑스 푸드위크", "식품", "스페셜"]'::JSONB, TRUE, TRUE, 184, 32),
    (6, 5, 1, 'AI Summit Seoul & EXPO', '컨퍼런스', 'B-123', '코엑스 그랜드볼룸', '37.5113', '127.0592', '2025-11-10', '2025-11-10', '14:00', '17:00', 'AI 기술의 최신 트렌드와 혁신적인 솔루션을 소개하는 컨퍼런스', '현장 참여 또는 QR 코드 스캔', '기념품 증정, 경품 추첨 이벤트, 무료 상담', 500, 210, 'https://via.placeholder.com/400x200/1E3A8A/FFFFFF?text=AI+Summit+Seoul', '["https://via.placeholder.com/120x120/1E3A8A/FFFFFF?text=AI+Summit"]'::JSONB, NULL, '{}'::JSONB, '["AI Summit Seoul", "기술"]'::JSONB, TRUE, TRUE, 512, 124),
    (7, 6, 2, '전자제품 박람회 라이브 데모', '전시회', 'E-210', '킨텍스 제2전시관', '37.6688', '126.7459', '2025-11-06', '2025-11-06', '11:00', '15:00', '최신 전자제품을 직접 체험하는 라이브 데모 세션', '현장 등록', '무료 체험, 경품 추첨', 300, 145, 'https://via.placeholder.com/400x200/0EA5E9/FFFFFF?text=ElecTech+Live', '["https://via.placeholder.com/120x120/0EA5E9/FFFFFF?text=ElecTech"]'::JSONB, NULL, '{}'::JSONB, '["킨텍스 테크 엑스포", "전자제품"]'::JSONB, TRUE, TRUE, 342, 88),
    (8, 7, 3, '바이오 테크놀로지 세미나', '세미나', 'C-305', '벡스코 제1전시장', '35.1689', '129.1361', '2025-10-15', '2025-10-15', '10:00', '12:00', '차세대 바이오 테크놀로지 연구 동향을 공유하는 세미나', '사전 등록 필수', '전문가 Q&A 세션', 200, 162, 'https://via.placeholder.com/400x200/22C55E/FFFFFF?text=Bio+Seminar', '["https://via.placeholder.com/120x120/22C55E/FFFFFF?text=Bio"]'::JSONB, NULL, '{}'::JSONB, '["부산 모빌리티 쇼", "바이오"]'::JSONB, TRUE, FALSE, 198, 27),
    (9, 8, 3, '모빌리티 테스트 드라이브', '체험', 'Outdoor-01', '벡스코 야외 전시장', '35.1689', '129.1361', '2025-11-21', '2025-11-23', '09:00', '17:00', '전기차와 자율주행 차량을 직접 체험하는 시승 이벤트', '현장 등록 및 안전 교육 이수', '시승 기념품, 한정판 굿즈', 250, 94, 'https://via.placeholder.com/400x200/FBBF24/FFFFFF?text=Mobility+Drive', '["https://via.placeholder.com/120x120/FBBF24/FFFFFF?text=Mobility"]'::JSONB, NULL, '{}'::JSONB, '["부산 모빌리티 쇼", "자동차"]'::JSONB, TRUE, TRUE, 276, 64);

-- 5. Tags -----------------------------------------------------------------
INSERT INTO tags (id, name, color)
VALUES
    (1, '농산물', '#FF6B6B'),
    (2, '시식', '#F97316'),
    (3, '수입식품', '#4ECDC4'),
    (4, '건강식품', '#10B981'),
    (5, '웰빙', '#14B8A6'),
    (6, '여행', '#F59E0B'),
    (7, '문화체험', '#FBBF24'),
    (8, 'AI', '#1E3A8A'),
    (9, '컨퍼런스', '#4338CA'),
    (10, '세미나', '#6366F1'),
    (11, '가전', '#0EA5E9'),
    (12, '시연', '#38BDF8'),
    (13, '헬스케어', '#22C55E'),
    (14, '전기차', '#FACC15'),
    (15, '시승', '#FB923C');

-- 6. Event <-> Tag mapping -----------------------------------------------
INSERT INTO event_tags (event_id, tag_id) VALUES
    (1, 1), (1, 2),
    (2, 2), (2, 3),
    (3, 4), (3, 5),
    (4, 6), (4, 7),
    (5, 1), (5, 2),
    (6, 8), (6, 9),
    (7, 11), (7, 12),
    (8, 10), (8, 13),
    (9, 14), (9, 15);

-- 7. Event managers -------------------------------------------------------
INSERT INTO event_managers (
    id,
    event_id,
    manager_name,
    manager_phone,
    manager_email,
    manager_position,
    manager_department,
    notes,
    is_primary,
    added_by
) VALUES
    (1, 1, '김해남', '010-1234-5678', 'kim@nongup.com', '영업 팀장', '영업부', '농산물 전문가', TRUE, 1),
    (2, 2, '이대일', '010-2345-6789', 'lee@daeilpb.com', '수입 담당', '수입팀', '영어, 일본어 가능', TRUE, 1),
    (3, 3, '박건강', '010-3456-7890', 'park@healthclub.com', '영양 상담사', '건강관리팀', '영양사 자격증 보유', TRUE, 1),
    (4, 4, '최여행', '010-4567-8901', 'choi@hyupchantour.com', '여행 기획자', '기획팀', '스페인 전문 기획', TRUE, 1),
    (5, 5, '정농부', '010-5678-9012', 'jung@nongup.com', '생산 관리자', '생산팀', '유기농 인증 전문가', TRUE, 1),
    (6, 6, '정가영', '010-6789-0123', 'jung@techcorp.com', '컨퍼런스 매니저', '마케팅본부', '세션 전반 진행 총괄', TRUE, 1),
    (7, 7, '박전자', '010-7890-1234', 'park@electech.com', '제품 매니저', '제품기획팀', '라이브 데모 진행 책임', TRUE, 1),
    (8, 8, '장바이오', '010-8901-2345', 'jang@bioinnovate.com', '연구 디렉터', 'R&D센터', '세미나 연사 조율', TRUE, 1),
    (9, 9, '오승한', '010-9012-3456', 'oh@abccorp.com', '모빌리티 PM', '모빌리티사업부', '시승 안전 교육 담당', TRUE, 1);

-- 8. Surveys --------------------------------------------------------------
INSERT INTO surveys (
    id,
    event_id,
    title,
    description,
    questions,
    is_active,
    require_email,
    require_phone,
    current_responses,
    start_date,
    end_date
) VALUES (
    1,
    6,
    '이벤트 만족도 조사',
    'AI Summit Seoul & EXPO 참가자 대상 만족도 조사',
    '[
        {"id": 1, "question_text": "이벤트 전반적인 만족도는?", "question_type": "rating", "is_required": true},
        {"id": 2, "question_text": "가장 좋았던 점은?", "question_type": "checkbox", "choices": ["유익한 정보", "친절한 직원", "좋은 사은품", "편리한 위치"], "is_required": true},
        {"id": 3, "question_text": "개선이 필요한 점은?", "question_type": "textarea", "is_required": false},
        {"id": 4, "question_text": "제품 품질 만족도", "question_type": "radio", "choices": ["매우 만족", "만족", "보통", "불만족"], "is_required": true}
    ]'::JSONB,
    TRUE,
    TRUE,
    FALSE,
    125,
    '2025-11-10 09:00:00+09',
    '2025-11-30 23:59:59+09'
);

-- 9. Survey responses -----------------------------------------------------
INSERT INTO survey_responses (
    id,
    survey_id,
    respondent_name,
    respondent_email,
    respondent_company,
    booth_number,
    answers,
    rating,
    review
) VALUES
    (1, 1, '홍길동', 'hong@example.com', 'TechCorp', 'B-123', '{"1": 5, "2": ["유익한 정보", "좋은 사은품"], "3": "AI 데모가 인상적이었습니다.", "4": "매우 만족"}'::JSONB, 5, '전반적으로 매우 만족했습니다.'),
    (2, 1, '김철수', 'kim@example.com', 'ElecTech', 'E-210', '{"1": 4, "2": ["친절한 직원", "편리한 위치"], "3": "좌석이 조금 부족했습니다.", "4": "만족"}'::JSONB, 4, '스태프가 매우 친절했습니다.'),
    (3, 1, '이영희', 'lee@example.com', 'BioInnovate', 'C-305', '{"1": 5, "2": ["유익한 정보"], "3": "세션이 더 길었으면 좋겠습니다.", "4": "매우 만족"}'::JSONB, 5, '콘텐츠 구성이 알찼습니다.');

-- 10. Event likes --------------------------------------------------------
INSERT INTO event_likes (id, event_id, session_id, ip_address)
VALUES
    (1, 6, 'session-tech-001', '203.0.113.10'),
    (2, 6, 'session-tech-002', '203.0.113.11'),
    (3, 7, 'session-electech-001', '198.51.100.21'),
    (4, 9, 'session-mobility-001', '198.51.100.45');

-- 11. Event views --------------------------------------------------------
INSERT INTO event_views (id, event_id, session_id, ip_address, user_agent, referer)
VALUES
    (1, 6, 'session-tech-001', '203.0.113.10', 'Mozilla/5.0 (Macintosh)', 'https://boothtalk.com/visitor/events'),
    (2, 6, 'session-tech-003', '203.0.113.12', 'Mozilla/5.0 (Windows NT 10.0)', 'https://boothtalk.com/visitor/events'),
    (3, 7, 'session-electech-001', '198.51.100.21', 'Mozilla/5.0 (Linux)', 'https://boothtalk.com/visitor/events'),
    (4, 9, 'session-mobility-001', '198.51.100.45', 'Mozilla/5.0 (iPhone)', 'https://boothtalk.com/visitor/events');

-- 12. Sequence alignment --------------------------------------------------
SELECT setval(pg_get_serial_sequence('admins', 'id'), COALESCE((SELECT MAX(id) FROM admins), 1), TRUE);
SELECT setval(pg_get_serial_sequence('venues', 'id'), COALESCE((SELECT MAX(id) FROM venues), 1), TRUE);
SELECT setval(pg_get_serial_sequence('companies', 'id'), COALESCE((SELECT MAX(id) FROM companies), 1), TRUE);
SELECT setval(pg_get_serial_sequence('events', 'id'), COALESCE((SELECT MAX(id) FROM events), 1), TRUE);
SELECT setval(pg_get_serial_sequence('tags', 'id'), COALESCE((SELECT MAX(id) FROM tags), 1), TRUE);
SELECT setval(pg_get_serial_sequence('event_managers', 'id'), COALESCE((SELECT MAX(id) FROM event_managers), 1), TRUE);
SELECT setval(pg_get_serial_sequence('surveys', 'id'), COALESCE((SELECT MAX(id) FROM surveys), 1), TRUE);
SELECT setval(pg_get_serial_sequence('survey_responses', 'id'), COALESCE((SELECT MAX(id) FROM survey_responses), 1), TRUE);
SELECT setval(pg_get_serial_sequence('event_likes', 'id'), COALESCE((SELECT MAX(id) FROM event_likes), 1), TRUE);
SELECT setval(pg_get_serial_sequence('event_views', 'id'), COALESCE((SELECT MAX(id) FROM event_views), 1), TRUE);

COMMIT;

SELECT 'Seed data inserted successfully!' AS status;
