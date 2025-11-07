# RERUN CODE / CDX 진단 (재평가)

## 1. 배경
- 목적: 기존 전시·박람회 관리 플랫폼(Booth_Talk)을 **한국 정신건강·심리학 컨퍼런스/세미나 크롤링 & 실시간 정리 서비스**로 피벗하기 전에 코드베이스의 보안·신뢰성·재사용성을 재평가.
- 범위: `/backend` FastAPI + SQLAlchemy, `/frontend` Vite/React, `/database` 수집 스크립트, `/uploads` 정적 자산, 루트 디렉터리 전반(로그·venv·node_modules 포함).

## 2. 저장소 스냅샷
- **모놀리식 구조**: 하나의 리포지토리에 백엔드/프론트/DB 스크립트/샘플 문서(`Mini-visWork/`)가 뒤섞여 있으며, 배포/테스트/CI 체계는 존재하지 않음.
- **대형 아티팩트 커밋**: `frontend/node_modules`, 루트 `venv`, 로그(`backend/backend.log`, `frontend/frontend.log`)가 그대로 버전 관리됨 → 클론 속도 저하, 보안 리스크.
- **중복 의존성 선언**: `backend/pyproject.toml`(uv/PEP 621)과 `backend/requirements.txt`(pip)이 동시에 존재하고 내용이 다름. 실제 설치 경로(`uv.lock`, `package-lock.json`)도 혼재.
- **데이터 자산**: `database/schema.sql`은 데이터베이스 생성부터 전체 DROP/CREATE를 수행하며, 크롤러 스크립트(`koea_crawler.py`, `setec_crawler.py`, `convert_expo_data.py`)만 존재하고 서비스 코드와 연결되지 않음.
- **정적 자산**: `uploads/` 하위에 temp/permanent 디렉터리가 있으나 접근 제어·서명 URL·S3 같은 외부 스토리지 연동이 없음.

## 3. 재사용 적합성

### 강점
- **기초 모델/라우트**: `Event`, `Survey`, `Company`, `Venue` 스키마와 관람객 검색 API(`backend/routes/events_visitor.py`)는 컨퍼런스 탐색 서비스에 바로 응용 가능.
- **LLM/이미지 모듈**: `services/llm_service.py`, `services/unsplash_service.py`가 별도로 추상화되어 있어 안내문 요약·대표 이미지 생성 같은 기능을 확장하기에 용이.
- **크롤링 시도 흔적**: `database/koea_crawler.py`, `setec_crawler.py` 등 초벌 수집 스크립트가 있어 도메인 소스 조사와 필드 매핑의 출발점이 될 수 있음.

### 한계/위험
- **보안 기초 부재**: 관리자/기업 API 전 구간이 공개되어 있고, 매직링크/파일 업로드/토큰 관리가 모두 취약. 민감한 정신건강 정보에는 전혀 적합하지 않은 상태.
- **데이터 파이프라인 부재**: 현재 이벤트 생성은 수동 업로드 + LLM 추출에 의존하며, 크롤링·정규화·중복 제거·신뢰도 검증 로직이 없다.
- **운영성 부족**: Alembic 마이그레이션, 컨테이너, 메트릭, 테스트 코드, CI가 전혀 없어 재현 가능성이 떨어진다. `DATABASE_URL` 미설정 시 `database.py`가 import 단계에서 바로 `RuntimeError`를 던져 로컬 개발 onboarding도 어렵다.
- **파일 처리 위험**: 업로드된 파일을 로컬 디스크에 저장/이동하며, 경로 검증이 없어 서버 파일 탈취/삭제가 가능하다.
- **데이터 모델 미스매치**: `EventFormData.venue` 같은 필드는 ORM 모델에 존재하지 않아 입력값이 유실된다(`backend/routes/events.py:452-467`, `backend/models/event.py:21-74`).

## 4. 코드 감사 주요 발견

| 심각도 | 영역 | 이슈 | 근거 | 영향 & 조치 |
| --- | --- | --- | --- | --- |
| **High** | 인증/인가 | 관리자·기업 라우트 전체에 JWT/세션 검증이 전무해 누구나 기업 현황, 설문, 응답을 열람·변경 가능. | `backend/routes/admin.py:118`, `backend/routes/companies.py:68` | RBAC 미들웨어 도입, 토큰 속성(`role`) 확인, 경량 관리자 패널이라도 기본 보호 필수. |
| **High** | 이벤트 생성 파이프라인 | `/api/events`는 인증 없이 호출되며, 요청 본문에서 임의 `company_id`를 받아 이벤트를 삽입한다. | `backend/routes/events.py:367-468` | 외부인이 임의 이벤트/스팸/피싱 콘텐츠를 업로드할 수 있음. 최소한 회사 토큰을 검증하고 server-side company_id를 강제해야 함. |
| **High** | 파일 경로 검증 부재 | 업로드 시 `safe_filename = f"{uuid}_{file.filename}"`만 사용하여 `../` 경로를 허용하고, `temp_image_path` 값을 그대로 `shutil.move`에 전달. | `backend/routes/events.py:321-349`, `backend/routes/events.py:412-426` | 경로 traversal로 서버 임의 파일을 덮어쓰거나 삭제 가능. 업로드 파일명 정규화, temp 디렉터리 화이트리스트 검사, signed token 기반 검증 필요. |
| **High** | 매직 링크 보안 | 고정 SECRET_KEY 기본값, 14일+ 만료, 검증 후 토큰 미폐기, 발송 이메일도 실제 전송 안 됨. | `backend/services/auth_service.py:31`, `backend/services/auth_service.py:106`, `backend/services/auth_service.py:193`, `backend/services/email_service.py:53-86` | 토큰 탈취 시 장기간 악용 가능. SECRET_KEY 필수화, 만료 10–30분, 1회성, SMTP 미구성 시 오류 반환, 감사 로그 필요. |
| **High** | 저장소 위생 | `venv/`, `frontend/node_modules/`, `*.log`가 커밋되어 있고 `.gitignore`도 부실. | 리포지토리 루트 | 의존성 주입/보안 스캔 불가, 협업 friction 증가. `.gitignore` 정비 + 히스토리 정리 필수. |
| **Medium** | 기업 계정 생성 | 관리자 API가 bcrypt를 “나중에” 라며 `"$2b$12${temp_password}_hashed"` 문자열을 그대로 저장 → 로그인/검증 실패. | `backend/routes/admin.py:225-234` | 새로 만든 기업 계정이 즉시 unusable. 올바른 `passlib` 해시 사용 또는 임시 비밀번호 별도 보관 필요. |
| **Medium** | 리포트 통계 왜곡 | 조회수·응답률을 `responses * 3`으로 임의 계산하고, `send_html_email` 실패도 성공으로 처리. | `backend/services/event_report_service.py:34-89`, `backend/services/event_report_service.py:200-215` | KPI 신뢰성 없음. 실제 `EventView`/`EventLike`를 사용해 계산하고, 이메일 전송 결과를 정확히 보고해야 함. |
| **Medium** | Legacy ReportService 오류 | `services/report_service.py`는 `get_company_dashboard`를 import 하지 않아 호출 시 `NameError`. | `backend/services/report_service.py:181` | 관리자 API에서 해당 서비스를 사용할 경우 즉시 오류. 불필요한 파일 제거 또는 의존성 주입 필요. |
| **Medium** | DB 스크립트 위험 | `database/schema.sql`이 데이터베이스를 생성하고 모든 테이블을 `DROP ... CASCADE` 후 재생성함. | `database/schema.sql:4-20` | 실서버에서 실행 시 즉시 데이터 손실. 마이그레이션 도구(Alembic)로 대체하거나 dev 전용으로 분리. |
| **Medium** | 크롤러 스크립트 완성도 | `database/koea_crawler.py`는 `crawl_one_month` 함수를 호출하지만 정의되어 있지 않아 실행 불가. | `database/koea_crawler.py:145-156` | 현행 크롤링 파이프라인이 작동하지 않음. 함수명을 정리하고 ETL 파이프라인으로 편입해야 함. |
| **Medium** | LLM 호출 방식 | `services/llm_service.py`가 FastAPI async 라우트 안에서 동기 OpenAI/Anthropic SDK를 호출하여 이벤트 루프를 블로킹. | `backend/services/llm_service.py:57-189` | 동시 요청 증가 시 전체 API 지연. Async 클라이언트 또는 작업 큐로 분리해야 함. |
| **Low** | 데이터 필드 손실 | `EventFormData.venue`는 ORM에 대응 필드가 없어 저장되지 않는다. | `backend/routes/events.py:452-467`, `backend/models/event.py:21-74` | 향후 세미나 세부장소/트랙 정보를 잃게 됨. 스키마 확장 또는 별도 `EventVenueDetail` 테이블 필요. |

## 5. 피벗(정신건강 컨퍼런스/세미나) 고려 사항
1. **수집 파이프라인**: 현재 크롤러는 CSV 저장까지만 지원하며, 데이터 정규화·중복 제거·출처 메타데이터 관리가 없다. 정신건강 세미나의 다변화된 출처(학회·병원·정부)를 다루려면 모듈화된 크롤러 + 표준화 레이어 + 검수 워크플로우가 필수다.
2. **신뢰도/품질 표시**: 의료·심리학 행사 특성상 출처 검증, 연자 자격, 학점 인정 여부 등을 명시해야 한다. 현 스키마에는 해당 필드가 없으므로 `Event` 확장 및 보조 테이블 설계가 필요하다.
3. **실시간성/알림**: APScheduler는 단일 프로세스 내에서만 안전하게 동작하므로 다중 인스턴스 배포 시 중복 실행된다. Celery/Temporal과 같은 분산 작업 큐를 도입하거나 서버리스 크론을 고려해야 한다.
4. **보안과 개인정보**: 관람객 설문, 기업 연락처 등 민감 데이터가 포함되어 있으므로 최소한 HTTPS, JWT/세션 보호, 감사 로그, 비공개 관리자 UI가 요구된다.
5. **프론트엔드 조정**: 현 UI는 전시회/설문 중심이다. 세미나 크롤링 서비스로 전환하려면 세션/연자/등록 링크/신청 상태 등 새로운 컴포넌트와 지도/캘린더 UX가 필요하다.

## 6. 권장 로드맵
1. **저장소/환경 정리**  
   - `.gitignore` 정비 및 `venv/`, `node_modules/`, 로그 제거.  
   - 의존성 선언을 하나의 포맷(예: `pyproject.toml` + `uv.lock`)으로 통일하고 Dependabot/취약점 스캔 연결.
2. **보안 기초 구축**  
   - FastAPI `Depends`로 JWT 인증 미들웨어를 만들고 관리자/기업/공개 라우트를 분리.  
   - 매직링크 토큰 정책 강화(짧은 만료, 1회성, 서명 파라미터, SMTP 실패 시 오류 리턴).  
   - 파일 업로드: 파일명 정규화, temp 토큰 서명, 안티바이러스/크기 제한, 오브젝트 스토리지 이전.
3. **데이터 모델 및 ETL 설계**  
   - `Event` 스키마에 세미나 전용 필드(세션/연자/온라인 여부 등) 추가.  
   - 크롤러 스크립트를 모듈화하여 API/워커에서 재사용하고, 중복 제거 규칙을 정의.  
   - Alembic 기반 마이그레이션, 샘플 `.env.example` 정비, seed 데이터 → mental-health 도메인으로 교체.
4. **비동기/작업 분리**  
   - LLM/Unsplash/이메일 호출을 작업 큐로 옮기고, API는 작업 ID만 반환.  
   - APScheduler 대신 분산 안전한 스케줄러 도입 또는 외부 크론 사용.
5. **품질 확보**  
   - 최소 단위 테스트(예: 이벤트 필터링, 설문 통계)와 ESLint/Prettier/ruff 등 정적 분석 도입.  
   - 관리자/기업 주요 플로우에 대해 상태 기반 e2e 테스트 작성.
6. **제품 맞춤화**  
   - 정신건강 컨퍼런스 대상 사용자 리서치를 바탕으로 필터/알림/콜투액션 정의.  
   - Google Maps API 키 노출 대신 백엔드 proxy 또는 API 제한 설정.

## 7. 결론
전체 코드베이스는 “기업이 직접 이벤트를 등록하고 설문을 수집”하는 용도로 설계되어 있으며, **외부 세미나를 자동 크롤링하여 실시간 큐레이션**하기 위한 보안·데이터·운영 기반이 거의 없다.  
보안 리스크(무인증, 파일 탈취, 토큰 관리)와 운영 리스크(마이그레이션 부재, 작업 큐 미사용)를 먼저 해소한 뒤, 세미나 도메인에 맞는 ETL/스키마/UX를 단계적으로 구축해야 한다.

---

## 부록: 자동화 도구용 상세 이슈 서술

| slug | severity | files | description | suggested_fix_steps |
| --- | --- | --- | --- | --- |
| `repo-fat-artifacts` | high | `frontend/node_modules`, `venv`, `backend/backend.log`, `frontend/frontend.log` | 빌드 아티팩트·가상환경·로그가 git에 커밋되어 있음. | `.gitignore` 강화 → `git rm -r --cached`로 제거 → 팀 공지. |
| `deps-dual-definition` | medium | `backend/pyproject.toml`, `backend/requirements.txt` | 동일 의존성을 두 파일에 상이하게 명시하여 버전 충돌 위험. | 단일 패키지 매니저 선택, 한 파일만 유지, 잠금파일 커밋. |
| `admin-auth-missing` | high | `backend/routes/admin.py:118`, `backend/routes/companies.py:68` | 관리자/기업 API 전 구간이 무방비. | JWT/세션 미들웨어 추가, role 기반 접근 제어 도입. |
| `events-create-no-auth` | high | `backend/routes/events.py:367-468` | 이벤트 생성이 인증 없이 가능하며 임의 `company_id`를 수용. | 인증 강제, server-side company binding, rate limit. |
| `upload-path-traversal` | high | `backend/routes/events.py:321-349` | 파일명 정규화가 없어 `../` 경로를 통한 임의 파일 쓰기 가능. | `pathlib.Path`로 normalize, 허용 디렉터리 체크. |
| `temp-image-path-rce` | high | `backend/routes/events.py:412-426` | 클라이언트가 `temp_image_path`에 임의 경로를 전달하면 서버 파일을 `shutil.move`로 삭제 가능. | 서명된 토큰/DB로 temp 파일 추적, 경로 화이트리스트. |
| `magic-link-insecure` | high | `backend/services/auth_service.py`, `backend/services/email_service.py` | SECRET_KEY 기본값, 장기 만료, 토큰 재사용, 이메일 미전송. | 환경 변수 강제, 만료 단축, 토큰 1회성, SMTP 필수화. |
| `company-password-placeholder` | medium | `backend/routes/admin.py:225-234` | 새 기업의 `password_hash`가 유효한 bcrypt가 아님. | Passlib `get_password_hash` 사용, 생성 시 이메일 전달. |
| `fake-analytics` | medium | `backend/services/event_report_service.py:34`, `backend/services/event_report_service.py:200` | 조회수/응답률이 임의 값이고 이메일 실패도 성공 처리. | 실제 테이블 집계, 전송 실패 시 오류 반환. |
| `report-service-nameerror` | medium | `backend/services/report_service.py:181` | `get_company_dashboard` 미 import로 서비스 호출 시 NameError. | 모듈 import 추가 또는 Legacy 서비스 삭제. |
| `schema-destructive` | medium | `database/schema.sql:4-20` | `CREATE DATABASE` + 전 테이블 DROP을 포함해 실서버 실행 시 위험. | 마이그레이션 도구로 대체, dev 전용 스크립트로 이동. |
| `crawler-missing-func` | medium | `database/koea_crawler.py:145-156` | 존재하지 않는 `crawl_one_month`를 호출하여 실행 불가. | 함수 정의 추가 또는 `crawl_year` 호출로 수정. |
| `llm-sync-blocking` | medium | `backend/services/llm_service.py:57-189` | 동기 SDK를 async 라우트에서 호출. | Async HTTP 클라이언트 또는 작업 큐 사용. |
| `event-venue-loss` | low | `backend/routes/events.py:452-467`, `backend/models/event.py:21-74` | `EventFormData.venue`가 DB에 저장되지 않아 정보 손실. | 모델 필드 추가 또는 별도 릴레이션 생성. |

각 row는 `slug` 키를 통해 다른 LLM/CLI 분석 도구가 정확히 동일 이슈를 추적할 수 있도록 구성했다.
