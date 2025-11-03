-- ============================================
-- 테스트 쿼리 모음
-- ============================================

-- 1. 전시회 정보 조회
SELECT * FROM exhibitions WHERE is_active = TRUE;

-- 2. 특정 전시회의 모든 이벤트 조회
SELECT 
    e.id,
    e.event_name,
    c.company_name,
    e.booth_number,
    e.time_slots,
    e.description,
    e.benefits,
    e.poster_image_url
FROM events e
JOIN companies c ON e.company_id = c.id
WHERE e.exhibition_id = 1
ORDER BY e.event_date, e.event_time;

-- 3. 통합 뷰를 사용한 조회 (전시회 정보 포함)
SELECT 
    id,
    event_name,
    company_name,
    booth_number,
    time_slots,
    exhibition_name,
    exhibition_code,
    exhibition_start_date,
    exhibition_end_date,
    exhibition_hall_info,
    venue_name
FROM v_events_with_details
WHERE exhibition_id = 1
ORDER BY event_date, event_time;

-- 4. 전시회별 이벤트 개수
SELECT 
    ex.exhibition_name,
    ex.exhibition_code,
    COUNT(e.id) as event_count
FROM exhibitions ex
LEFT JOIN events e ON ex.id = e.exhibition_id
GROUP BY ex.id, ex.exhibition_name, ex.exhibition_code;

-- 5. 담당자 정보 포함 조회
SELECT 
    e.event_name,
    c.company_name,
    e.booth_number,
    em.manager_name,
    em.manager_phone,
    em.manager_email
FROM events e
JOIN companies c ON e.company_id = c.id
LEFT JOIN event_managers em ON e.id = em.event_id
WHERE e.exhibition_id = 1;

-- 6. 특정 날짜의 이벤트 조회
SELECT 
    e.event_name,
    c.company_name,
    e.booth_number,
    e.time_slots,
    e.description
FROM events e
JOIN companies c ON e.company_id = c.id
WHERE e.event_date = '2025-10-29'
ORDER BY e.event_time;

-- 7. 시간대별 이벤트 개수
SELECT 
    unnest(time_slots) as time_slot,
    COUNT(*) as event_count
FROM events
WHERE exhibition_id = 1
GROUP BY time_slot
ORDER BY time_slot;

-- 8. Frontend API용 JSON 형식 조회
SELECT json_build_object(
    'exhibition', (
        SELECT json_build_object(
            'id', ex.id,
            'name', ex.exhibition_name,
            'code', ex.exhibition_code,
            'start_date', ex.start_date,
            'end_date', ex.end_date,
            'hall_info', ex.hall_info,
            'venue_name', v.venue_name,
            'location', v.location
        )
        FROM exhibitions ex
        LEFT JOIN venues v ON ex.venue_id = v.id
        WHERE ex.id = 1
    ),
    'events', (
        SELECT json_agg(
            json_build_object(
                'id', e.id,
                'event_name', e.event_name,
                'company_name', c.company_name,
                'booth_number', e.booth_number,
                'time_slots', e.time_slots,
                'description', e.description,
                'benefits', e.benefits,
                'poster_image_url', e.poster_image_url,
                'category', e.category,
                'tags', e.tags
            )
        )
        FROM events e
        JOIN companies c ON e.company_id = c.id
        WHERE e.exhibition_id = 1
        ORDER BY e.event_date, e.event_time
    )
) as api_response;

-- 9. 데이터 확인 (전체 개수)
SELECT 
    'exhibitions' as table_name, COUNT(*) as count FROM exhibitions
UNION ALL
SELECT 'events', COUNT(*) FROM events
UNION ALL
SELECT 'companies', COUNT(*) FROM companies
UNION ALL
SELECT 'event_managers', COUNT(*) FROM event_managers;

-- 10. 샘플 데이터 삭제 (필요시)
-- DELETE FROM event_managers WHERE event_id IN (SELECT id FROM events WHERE exhibition_id = 1);
-- DELETE FROM events WHERE exhibition_id = 1;
-- DELETE FROM exhibitions WHERE id = 1;
-- DELETE FROM companies WHERE username IN ('nongup', 'daeilpb', 'healthclub', 'hyupchantour', 'nongup2');
