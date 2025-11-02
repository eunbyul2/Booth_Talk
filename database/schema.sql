-- 데이터베이스 생성
CREATE DATABASE exhibition_platform;

-- 데이터베이스 연결
\c exhibition_platform;

-- UUID 확장 활성화 (매직 토큰용)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. 관리자 테이블
-- ============================================
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    full_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 관리자 인덱스
CREATE INDEX idx_admins_username ON admins(username);
CREATE INDEX idx_admins_is_active ON admins(is_active);

-- 기본 관리자 계정 생성 (비밀번호: root)
INSERT INTO admins (username, password_hash, full_name) 
VALUES ('root', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7eJR0ZCWE6', '슈퍼 관리자');

COMMENT ON TABLE admins IS '관리자 계정 테이블';
COMMENT ON COLUMN admins.password_hash IS 'bcrypt 해시된 비밀번호';

-- ============================================
-- 2. 전시장 테이블
-- ============================================
CREATE TABLE venues (
    id SERIAL PRIMARY KEY,
    venue_name VARCHAR(100) NOT NULL,
    location VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    description TEXT,
    website_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 전시장 기본 데이터
INSERT INTO venues (venue_name, location, address) VALUES
('코엑스', '서울', '서울특별시 강남구 영동대로 513'),
('킨텍스', '경기', '경기도 고양시 일산서구 킨텍스로 217-60'),
('벡스코', '부산', '부산광역시 해운대구 APEC로 55'),
('DDP', '서울', '서울특별시 중구 을지로 281');

COMMENT ON TABLE venues IS '전시장 정보 테이블';

-- ============================================
-- 3. 기업 테이블
-- ============================================
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(200) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- 매직 링크 관련
    magic_token VARCHAR(255) UNIQUE,
    token_expires_at TIMESTAMP,
    
    -- 기업 정보
    business_number VARCHAR(20),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    website_url VARCHAR(255),
    
    -- 상태 및 접속 정보
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    
    -- 메타 정보
    created_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_token_expiry CHECK (
        (magic_token IS NULL AND token_expires_at IS NULL) OR
        (magic_token IS NOT NULL AND token_expires_at IS NOT NULL)
    )
);

-- 기업 인덱스
CREATE INDEX idx_companies_username ON companies(username);
CREATE INDEX idx_companies_magic_token ON companies(magic_token);
CREATE INDEX idx_companies_is_active ON companies(is_active);
CREATE INDEX idx_companies_token_expiry ON companies(token_expires_at);

COMMENT ON TABLE companies IS '기업 계정 테이블';
COMMENT ON COLUMN companies.magic_token IS '자동 로그인용 매직 링크 토큰 (7일 유효)';
COMMENT ON COLUMN companies.username IS '로그인용 아이디 (회사명 기반 자동 생성)';

-- ============================================
-- 4. 이벤트 테이블
-- ============================================
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    venue_id INTEGER REFERENCES venues(id),
    
    -- 기본 정보
    event_name VARCHAR(300) NOT NULL,
    booth_number VARCHAR(50),
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    end_date DATE,
    end_time TIME,
    
    -- 상세 정보
    description TEXT,
    participation_method TEXT,
    benefits TEXT,
    capacity INTEGER,
    current_participants INTEGER DEFAULT 0,
    
    -- 이미지 및 파일
    poster_image_url TEXT,
    additional_images TEXT[], -- PostgreSQL 배열
    pdf_url TEXT,
    
    -- OCR 데이터 (JSON 형식)
    ocr_data JSONB,
    
    -- 태그 및 카테고리
    tags VARCHAR(50)[],
    category VARCHAR(50),
    
    -- 상태
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    
    -- 메타 정보
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_event_dates CHECK (
        (end_date IS NULL AND end_time IS NULL) OR
        (end_date >= event_date)
    )
);

-- 이벤트 인덱스
CREATE INDEX idx_events_company_id ON events(company_id);
CREATE INDEX idx_events_venue_id ON events(venue_id);
CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_events_is_active ON events(is_active);
CREATE INDEX idx_events_is_featured ON events(is_featured);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_tags ON events USING GIN(tags);
CREATE INDEX idx_events_ocr_data ON events USING GIN(ocr_data);

COMMENT ON TABLE events IS '이벤트 정보 테이블';
COMMENT ON COLUMN events.ocr_data IS 'OCR로 추출한 팜플렛 정보 (JSON)';
COMMENT ON COLUMN events.additional_images IS '추가 이미지 URL 배열';

-- ============================================
-- 5. 이벤트 담당자 테이블 ⭐ 핵심!
-- ============================================
CREATE TABLE event_managers (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
    -- 담당자 정보
    manager_name VARCHAR(100) NOT NULL,
    manager_phone VARCHAR(20),
    manager_email VARCHAR(100),
    manager_position VARCHAR(100),
    manager_department VARCHAR(100),
    
    -- 추가 정보
    notes TEXT, -- 관리자 전용 메모
    is_primary BOOLEAN DEFAULT FALSE, -- 주 담당자 여부
    
    -- 메타 정보
    added_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 담당자 인덱스
CREATE INDEX idx_managers_event_id ON event_managers(event_id);
CREATE INDEX idx_managers_email ON event_managers(manager_email);
CREATE INDEX idx_managers_phone ON event_managers(manager_phone);
CREATE INDEX idx_managers_is_primary ON event_managers(is_primary);

COMMENT ON TABLE event_managers IS '이벤트 담당자 정보 테이블 (관리자가 별도 관리)';
COMMENT ON COLUMN event_managers.notes IS '관리자 전용 메모 (기업은 볼 수 없음)';
COMMENT ON COLUMN event_managers.is_primary IS '주 담당자 여부 (한 이벤트에 여러 담당자 가능)';

-- ============================================
-- 6. 설문조사 테이블
-- ============================================
CREATE TABLE surveys (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
    -- 설문 정보
    title VARCHAR(300) NOT NULL,
    description TEXT,
    
    -- 질문 (JSON 배열)
    questions JSONB NOT NULL,
    -- 예시: [
    --   {
    --     "id": 1,
    --     "type": "text",
    --     "question": "방문 목적은?",
    --     "required": true
    --   },
    --   {
    --     "id": 2,
    --     "type": "choice",
    --     "question": "만족도는?",
    --     "options": ["매우 만족", "만족", "보통", "불만족"],
    --     "required": true
    --   }
    -- ]
    
    -- 설정
    is_active BOOLEAN DEFAULT TRUE,
    require_email BOOLEAN DEFAULT FALSE,
    require_phone BOOLEAN DEFAULT FALSE,
    max_responses INTEGER,
    current_responses INTEGER DEFAULT 0,
    
    -- 기간
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    
    -- 메타 정보
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_survey_dates CHECK (
        (start_date IS NULL AND end_date IS NULL) OR
        (end_date >= start_date)
    )
);

-- 설문조사 인덱스
CREATE INDEX idx_surveys_event_id ON surveys(event_id);
CREATE INDEX idx_surveys_is_active ON surveys(is_active);
CREATE INDEX idx_surveys_questions ON surveys USING GIN(questions);

COMMENT ON TABLE surveys IS '설문조사 테이블';
COMMENT ON COLUMN surveys.questions IS '질문 목록 (JSONB 형식)';

-- ============================================
-- 7. 설문 응답 테이블
-- ============================================
CREATE TABLE survey_responses (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    
    -- 응답자 정보
    respondent_name VARCHAR(100),
    respondent_email VARCHAR(100),
    respondent_phone VARCHAR(20),
    respondent_company VARCHAR(200),
    booth_number VARCHAR(50),
    
    -- 응답 데이터 (JSON)
    answers JSONB NOT NULL,
    -- 예시: {
    --   "1": "신제품 구경",
    --   "2": "매우 만족",
    --   "3": "친절하고 좋았습니다"
    -- }
    
    -- 평가
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    review TEXT,
    
    -- IP 및 디바이스 정보
    ip_address INET,
    user_agent TEXT,
    
    -- 메타 정보
    submitted_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_rating_range CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
);

-- 응답 인덱스
CREATE INDEX idx_responses_survey_id ON survey_responses(survey_id);
CREATE INDEX idx_responses_submitted_at ON survey_responses(submitted_at);
CREATE INDEX idx_responses_rating ON survey_responses(rating);
CREATE INDEX idx_responses_booth ON survey_responses(booth_number);
CREATE INDEX idx_responses_answers ON survey_responses USING GIN(answers);

COMMENT ON TABLE survey_responses IS '설문 응답 테이블';
COMMENT ON COLUMN survey_responses.answers IS '응답 내용 (JSONB 형식)';

-- ============================================
-- 8. 좋아요 테이블 (관람객이 이벤트 찜하기)
-- ============================================
CREATE TABLE event_likes (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
    -- 사용자 식별 (비회원이므로 세션/쿠키 기반)
    session_id VARCHAR(255) NOT NULL,
    ip_address INET,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(event_id, session_id)
);

-- 좋아요 인덱스
CREATE INDEX idx_likes_event_id ON event_likes(event_id);
CREATE INDEX idx_likes_session_id ON event_likes(session_id);

COMMENT ON TABLE event_likes IS '이벤트 좋아요 테이블';
COMMENT ON COLUMN event_likes.session_id IS '브라우저 세션 ID (비회원 식별용)';

-- ============================================
-- 9. 이벤트 조회 로그 테이블
-- ============================================
CREATE TABLE event_views (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
    -- 방문자 정보
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    referer TEXT,
    
    viewed_at TIMESTAMP DEFAULT NOW()
);

-- 조회 로그 인덱스
CREATE INDEX idx_views_event_id ON event_views(event_id);
CREATE INDEX idx_views_viewed_at ON event_views(viewed_at);
CREATE INDEX idx_views_session_id ON event_views(session_id);

COMMENT ON TABLE event_views IS '이벤트 조회 로그';

-- ============================================
-- 10. 시스템 로그 테이블
-- ============================================
CREATE TABLE system_logs (
    id SERIAL PRIMARY KEY,
    
    -- 로그 정보
    log_level VARCHAR(20) NOT NULL, -- INFO, WARNING, ERROR, CRITICAL
    log_type VARCHAR(50) NOT NULL, -- AUTH, API, DATABASE, SYSTEM
    message TEXT NOT NULL,
    details JSONB,
    
    -- 관련 정보
    user_type VARCHAR(20), -- admin, company, visitor
    user_id INTEGER,
    ip_address INET,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    status_code INTEGER,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- 시스템 로그 인덱스
CREATE INDEX idx_logs_log_level ON system_logs(log_level);
CREATE INDEX idx_logs_log_type ON system_logs(log_type);
CREATE INDEX idx_logs_created_at ON system_logs(created_at);
CREATE INDEX idx_logs_user_id ON system_logs(user_id);

COMMENT ON TABLE system_logs IS '시스템 로그 테이블';

-- ============================================
-- 트리거 함수들
-- ============================================

-- 1. updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'updated_at 컬럼을 자동으로 현재 시간으로 업데이트';

-- 트리거 적용
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_managers_updated_at BEFORE UPDATE ON event_managers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_surveys_updated_at BEFORE UPDATE ON surveys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. 이벤트 좋아요 수 자동 업데이트
CREATE OR REPLACE FUNCTION update_event_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE events SET like_count = like_count + 1 WHERE id = NEW.event_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE events SET like_count = like_count - 1 WHERE id = OLD.event_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_event_like_count() IS '이벤트 좋아요 수를 자동으로 증감';

CREATE TRIGGER trigger_event_like_count
    AFTER INSERT OR DELETE ON event_likes
    FOR EACH ROW EXECUTE FUNCTION update_event_like_count();

-- 3. 설문 응답 수 자동 업데이트
CREATE OR REPLACE FUNCTION update_survey_response_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE surveys SET current_responses = current_responses + 1 WHERE id = NEW.survey_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE surveys SET current_responses = current_responses - 1 WHERE id = OLD.survey_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_survey_response_count() IS '설문 응답 수를 자동으로 증감';

CREATE TRIGGER trigger_survey_response_count
    AFTER INSERT OR DELETE ON survey_responses
    FOR EACH ROW EXECUTE FUNCTION update_survey_response_count();

-- ============================================
-- 뷰(View) 생성
-- ============================================

-- 1. 이벤트 통합 뷰 (담당자 포함)
CREATE OR REPLACE VIEW v_events_with_details AS
SELECT 
    e.*,
    c.company_name,
    c.username AS company_username,
    v.venue_name,
    v.location AS venue_location,
    COALESCE(
        json_agg(
            json_build_object(
                'id', em.id,
                'name', em.manager_name,
                'phone', em.manager_phone,
                'email', em.manager_email,
                'position', em.manager_position,
                'is_primary', em.is_primary
            )
        ) FILTER (WHERE em.id IS NOT NULL),
        '[]'::json
    ) AS managers
FROM events e
LEFT JOIN companies c ON e.company_id = c.id
LEFT JOIN venues v ON e.venue_id = v.id
LEFT JOIN event_managers em ON e.id = em.event_id
GROUP BY e.id, c.company_name, c.username, v.venue_name, v.location;

COMMENT ON VIEW v_events_with_details IS '이벤트 상세 정보 통합 뷰 (담당자 포함)';

-- 2. 관리자용 통계 뷰
CREATE OR REPLACE VIEW v_admin_statistics AS
SELECT
    (SELECT COUNT(*) FROM companies WHERE is_active = TRUE) AS active_companies,
    (SELECT COUNT(*) FROM events WHERE is_active = TRUE) AS active_events,
    (SELECT COUNT(*) FROM surveys WHERE is_active = TRUE) AS active_surveys,
    (SELECT COUNT(*) FROM survey_responses) AS total_responses,
    (SELECT COUNT(*) FROM event_likes) AS total_likes,
    (SELECT COUNT(*) FROM event_views) AS total_views;

COMMENT ON VIEW v_admin_statistics IS '관리자 대시보드용 통계 뷰';

-- ============================================
-- 샘플 데이터 입력
-- ============================================

-- 샘플 기업 5개 (비밀번호: root)
INSERT INTO companies (company_name, username, password_hash, business_number, email, phone, address, website_url, created_by) VALUES
('테크코퍼레이션', 'techcorp', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7eJR0ZCWE6', '123-45-67890', 'contact@techcorp.com', '02-1234-5678', '서울특별시 강남구 테헤란로 123', 'https://techcorp.com', 1),
('글로벌이노베이션', 'globalinno', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7eJR0ZCWE6', '234-56-78901', 'info@globalinno.com', '02-2345-6789', '서울특별시 서초구 서초대로 456', 'https://globalinno.com', 1),
('스마트솔루션즈', 'smartsol', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7eJR0ZCWE6', '345-67-89012', 'hello@smartsol.com', '031-3456-7890', '경기도 성남시 분당구 판교로 789', 'https://smartsol.com', 1),
('퓨처테크놀로지', 'futuretech', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7eJR0ZCWE6', '456-78-90123', 'contact@futuretech.com', '051-4567-8901', '부산광역시 해운대구 센텀중앙로 101', 'https://futuretech.com', 1),
('디지털크리에이티브', 'digitalcreative', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7eJR0ZCWE6', '567-89-01234', 'info@digitalcreative.com', '02-5678-9012', '서울특별시 마포구 월드컵북로 202', 'https://digitalcreative.com', 1);

-- 샘플 이벤트 5개
INSERT INTO events (company_id, venue_id, event_name, booth_number, event_date, event_time, end_date, end_time, description, participation_method, benefits, capacity, category, tags, is_featured) VALUES
(1, 1, 'AI Summit 2025', 'A-101', '2025-11-10', '10:00:00', '2025-11-12', '18:00:00', '최신 AI 기술과 머신러닝 솔루션을 만나보세요. 실시간 데모와 전문가 상담이 제공됩니다.', '현장 방문 및 사전 등록', '무료 굿즈, 기술 자료집 제공', 200, 'IT/기술', ARRAY['AI', '머신러닝', '기술'], TRUE),
(2, 2, '글로벌 비즈니스 엑스포', 'B-205', '2025-11-15', '09:00:00', '2025-11-17', '19:00:00', '해외 진출을 위한 비즈니스 네트워킹 행사. 글로벌 파트너사와의 1:1 미팅 기회를 제공합니다.', '사전 예약 필수', '무료 컨설팅, 네트워킹 디너', 150, '비즈니스', ARRAY['글로벌', '네트워킹', '수출'], TRUE),
(3, 1, '스마트홈 페스티벌', 'C-312', '2025-11-20', '11:00:00', '2025-11-22', '20:00:00', 'IoT 기반 스마트홈 솔루션 체험관. 최신 스마트 가전과 홈 오토메이션 시스템을 직접 체험해보세요.', '자유 관람', '체험 이벤트 참여 시 경품 추첨', 300, 'IT/기술', ARRAY['IoT', '스마트홈', '가전'], FALSE),
(4, 3, '미래 모빌리티 쇼', 'D-418', '2025-11-25', '10:30:00', '2025-11-27', '17:30:00', '전기차, 자율주행, 미래 교통 솔루션 전시회. 시승 이벤트와 기술 세미나가 진행됩니다.', '현장 등록 가능', '시승 참여자 커피 쿠폰 제공', 250, '자동차/모빌리티', ARRAY['전기차', '자율주행', '모빌리티'], TRUE),
(5, 4, '크리에이티브 디자인 위크', 'E-520', '2025-12-01', '13:00:00', '2025-12-03', '21:00:00', '디자이너와 크리에이터를 위한 축제. 워크샵, 포트폴리오 리뷰, 작품 전시가 함께 진행됩니다.', '사전 등록 및 현장 등록', '워크샵 무료 참여, 작품집 제공', 180, '디자인/예술', ARRAY['디자인', '크리에이티브', '워크샵'], FALSE);

-- 샘플 담당자 5개
INSERT INTO event_managers (event_id, manager_name, manager_phone, manager_email, manager_position, manager_department, notes, is_primary, added_by) VALUES
(1, '홍길동', '010-1234-5678', 'hong@techcorp.com', '마케팅 팀장', '마케팅부', 'AI 전문가, 기술 설명 가능', TRUE, 1),
(2, '김영희', '010-2345-6789', 'kim@globalinno.com', '해외사업 본부장', '해외사업부', '영어, 중국어 가능', TRUE, 1),
(3, '이철수', '010-3456-7890', 'lee@smartsol.com', '제품 기획자', '제품기획팀', 'IoT 제품 전문가', TRUE, 1),
(4, '박민수', '010-4567-8901', 'park@futuretech.com', '기술영업 이사', '영업부', '자동차 산업 경력 10년', TRUE, 1),
(5, '정수진', '010-5678-9012', 'jung@digitalcreative.com', '크리에이티브 디렉터', '디자인팀', '국제 디자인 어워드 수상 경력', TRUE, 1);

-- ============================================
-- 권한 설정 (선택사항)
-- ============================================

-- 애플리케이션 전용 사용자 생성 (필요시 주석 해제)
-- CREATE USER exhibition_app WITH PASSWORD 'your_secure_password';
-- GRANT CONNECT ON DATABASE exhibition_platform TO exhibition_app;
-- GRANT USAGE ON SCHEMA public TO exhibition_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO exhibition_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO exhibition_app;

-- ============================================
-- 유용한 쿼리 모음
-- ============================================

-- 모든 이벤트와 담당자 조회
-- SELECT * FROM v_events_with_details;

-- 담당자가 없는 이벤트 찾기
-- SELECT e.id, e.event_name, c.company_name
-- FROM events e
-- LEFT JOIN companies c ON e.company_id = c.id
-- LEFT JOIN event_managers em ON e.id = em.event_id
-- WHERE em.id IS NULL AND e.is_active = TRUE;

-- 통계 확인
-- SELECT * FROM v_admin_statistics;

-- ============================================
-- 완료!
-- ============================================
SELECT 'Database schema created successfully!' AS status;
SELECT 'Total tables: ' || COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
