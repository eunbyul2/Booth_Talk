-- Booth Talk database schema (aligned with SQLAlchemy models)
-- This script recreates all tables to match backend ORM definitions.

-- Database bootstrap -------------------------------------------------------
CREATE DATABASE exhibition_platform;
\connect exhibition_platform;

-- Clean existing objects when re-running the script -----------------------
DROP TABLE IF EXISTS system_logs CASCADE;
DROP TABLE IF EXISTS event_views CASCADE;
DROP TABLE IF EXISTS event_likes CASCADE;
DROP TABLE IF EXISTS survey_responses CASCADE;
DROP TABLE IF EXISTS surveys CASCADE;
DROP TABLE IF EXISTS event_managers CASCADE;
DROP TABLE IF EXISTS event_tags CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS venues CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- Optional extensions ------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Admins ---------------------------------------------------------------
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    full_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admins_is_active ON admins (is_active);

COMMENT ON TABLE admins IS '관리자 계정 테이블';
COMMENT ON COLUMN admins.password_hash IS 'bcrypt 해시된 비밀번호';

-- 2. Venues ---------------------------------------------------------------
CREATE TABLE venues (
    id SERIAL PRIMARY KEY,
    venue_name VARCHAR(100) NOT NULL,
    location VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    description TEXT,
    website_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_venues_name ON venues (venue_name);
CREATE INDEX idx_venues_location ON venues (location);

COMMENT ON TABLE venues IS '전시장 정보 테이블';

-- 3. Companies ------------------------------------------------------------
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(200) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    magic_token VARCHAR(255) UNIQUE,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    business_number VARCHAR(20),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    website_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES admins (id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_token_expiry
        CHECK (
            (magic_token IS NULL AND token_expires_at IS NULL) OR
            (magic_token IS NOT NULL AND token_expires_at IS NOT NULL)
        )
);

CREATE INDEX idx_companies_is_active ON companies (is_active);
CREATE INDEX idx_companies_magic_token ON companies (magic_token);
CREATE INDEX idx_companies_token_expiry ON companies (token_expires_at);

COMMENT ON TABLE companies IS '기업 계정 테이블';
COMMENT ON COLUMN companies.magic_token IS '매직 링크 토큰';

-- 4. Events ---------------------------------------------------------------
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    venue_id INTEGER REFERENCES venues (id) ON DELETE SET NULL,
    event_name VARCHAR(300) NOT NULL,
    event_type VARCHAR(100),
    booth_number VARCHAR(50),
    location VARCHAR(255),
    latitude VARCHAR(50),
    longitude VARCHAR(50),
    start_date DATE NOT NULL,
    end_date DATE,
    start_time VARCHAR(10),
    end_time VARCHAR(10),
    description TEXT,
    participation_method VARCHAR(255),
    benefits TEXT,
    capacity INTEGER,
    current_participants INTEGER DEFAULT 0,
    image_url VARCHAR(1024),
    additional_images JSONB DEFAULT '[]'::JSONB,
    pdf_url VARCHAR(1024),
    ocr_data JSONB,
    categories JSONB DEFAULT '[]'::JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_event_dates
        CHECK (
            end_date IS NULL OR start_date <= end_date
        )
);

CREATE INDEX idx_events_company_id ON events (company_id);
CREATE INDEX idx_events_venue_id ON events (venue_id);
CREATE INDEX idx_events_start_date ON events (start_date);
CREATE INDEX idx_events_event_type ON events (event_type);
CREATE INDEX idx_events_is_active ON events (is_active);
CREATE INDEX idx_events_is_featured ON events (is_featured);

COMMENT ON TABLE events IS '이벤트/프로그램 정보 테이블';
COMMENT ON COLUMN events.categories IS '카테고리 목록 (JSONB)';

-- 5. Event Managers -------------------------------------------------------
CREATE TABLE event_managers (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    manager_name VARCHAR(100) NOT NULL,
    manager_phone VARCHAR(20),
    manager_email VARCHAR(100),
    manager_position VARCHAR(100),
    manager_department VARCHAR(100),
    notes TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    added_by INTEGER REFERENCES admins (id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_event_managers_event_id ON event_managers (event_id);
CREATE INDEX idx_event_managers_phone ON event_managers (manager_phone);
CREATE INDEX idx_event_managers_email ON event_managers (manager_email);
CREATE INDEX idx_event_managers_primary ON event_managers (is_primary);

COMMENT ON TABLE event_managers IS '이벤트 담당자 테이블';

-- 6. Tags & association ---------------------------------------------------
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    color VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE event_tags (
    event_id INTEGER NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, tag_id)
);

COMMENT ON TABLE tags IS '태그 마스터';
COMMENT ON TABLE event_tags IS '이벤트-태그 매핑';

-- 7. Surveys --------------------------------------------------------------
CREATE TABLE surveys (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    questions JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    require_email BOOLEAN DEFAULT FALSE,
    require_phone BOOLEAN DEFAULT FALSE,
    max_responses INTEGER,
    current_responses INTEGER DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_survey_dates
        CHECK (
            (start_date IS NULL AND end_date IS NULL) OR
            (start_date IS NOT NULL AND end_date IS NOT NULL AND start_date <= end_date)
        )
);

CREATE INDEX idx_surveys_event_id ON surveys (event_id);
CREATE INDEX idx_surveys_is_active ON surveys (is_active);
CREATE INDEX idx_surveys_start_date ON surveys (start_date);

COMMENT ON TABLE surveys IS '설문조사 테이블';

-- 8. Survey Responses -----------------------------------------------------
CREATE TABLE survey_responses (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER NOT NULL REFERENCES surveys (id) ON DELETE CASCADE,
    respondent_name VARCHAR(100),
    respondent_email VARCHAR(100),
    respondent_phone VARCHAR(20),
    respondent_company VARCHAR(200),
    booth_number VARCHAR(50),
    answers JSONB NOT NULL,
    rating INTEGER,
    review TEXT,
    ip_address INET,
    user_agent TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_rating_range
        CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5))
);

CREATE INDEX idx_responses_survey_id ON survey_responses (survey_id);
CREATE INDEX idx_responses_submitted_at ON survey_responses (submitted_at);
CREATE INDEX idx_responses_rating ON survey_responses (rating);
CREATE INDEX idx_responses_booth ON survey_responses (booth_number);

COMMENT ON TABLE survey_responses IS '설문 응답 테이블';

-- 9. Event Likes ---------------------------------------------------------
CREATE TABLE event_likes (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_event_like UNIQUE (event_id, session_id)
);

CREATE INDEX idx_event_likes_event_id ON event_likes (event_id);
CREATE INDEX idx_event_likes_session_id ON event_likes (session_id);

COMMENT ON TABLE event_likes IS '이벤트 좋아요';

-- 10. Event Views --------------------------------------------------------
CREATE TABLE event_views (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    referer TEXT,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_event_views_event_id ON event_views (event_id);
CREATE INDEX idx_event_views_session_id ON event_views (session_id);
CREATE INDEX idx_event_views_viewed_at ON event_views (viewed_at);

COMMENT ON TABLE event_views IS '이벤트 조회 로그';

-- 11. System Logs (optional) ---------------------------------------------
CREATE TABLE system_logs (
    id SERIAL PRIMARY KEY,
    log_level VARCHAR(20) NOT NULL,
    log_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    details JSONB,
    user_type VARCHAR(20),
    user_id INTEGER,
    ip_address INET,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    status_code INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_system_logs_level ON system_logs (log_level);
CREATE INDEX idx_system_logs_type ON system_logs (log_type);
CREATE INDEX idx_system_logs_created_at ON system_logs (created_at);
CREATE INDEX idx_system_logs_user ON system_logs (user_id);

COMMENT ON TABLE system_logs IS '시스템 로그 테이블';

-- 12. Updated_at trigger --------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'updated_at 컬럼을 자동으로 현재 시간으로 업데이트';

CREATE TRIGGER trg_admins_updated
    BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_companies_updated
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_events_updated
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_event_managers_updated
    BEFORE UPDATE ON event_managers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_surveys_updated
    BEFORE UPDATE ON surveys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_tags_updated
    BEFORE UPDATE ON tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 13. Completion summary --------------------------------------------------
SELECT 'Database schema created successfully!' AS status;
SELECT 'Total tables: ' || COUNT(*) AS table_count
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
