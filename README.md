# 🎨 전시회 플랫폼

전시회 이벤트를 관리하고, 관람객이 실시간으로 입장 가능한 이벤트를 찾을 수 있는 플랫폼

---

## 📂 폴더 구조

```
Booth-Talk/
├── backend/               백엔드 (FastAPI)
│   ├── models/           데이터베이스 모델 (10개 테이블)
│   ├── routes/           API 엔드포인트
│   │   ├── auth.py      인증 API
│   │   ├── events.py    이벤트 CRUD
│   │   └── events_visitor.py  🆕 관람객용 (시간 필터링)
│   ├── services/         외부 서비스 (LLM, 인증)
│   ├── main.py          서버 실행 파일
│   ├── database.py      DB 연결
│   ├── requirements.txt  의존성 (pip)
│   ├── pyproject.toml   의존성 (uv) + Python 3.10
│   └── .env.example     환경 변수 예시
│
├── frontend/             프론트엔드 (React)
│   ├── src/
│   │   ├── components/visitor/  🆕 관람객 컴포넌트
│   │   │   ├── EventExplorer.tsx  메인 페이지
│   │   │   ├── EventCard.tsx      이벤트 카드
│   │   │   └── TimeFilter.tsx     시간 필터
│   │   ├── pages/visitor/       기존 관람객 페이지
│   │   ├── styles/              CSS
│   │   │   ├── global.css
│   │   │   └── EventExplorer.css  🆕
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── index.html
│
├── database/             데이터베이스
│   └── schema.sql       테이블 정의
│
└── README.md            이 파일
```

---

## 🚀 빠른 시작

### 1️⃣ PostgreSQL (Neon) 설정

1. [Neon 콘솔](https://console.neon.tech/)에서 프로젝트를 생성합니다. (Region은 `AWS Asia Pacific 1 (Singapore)` 권장)
2. `Connect` 버튼을 눌러 `Database URL`을 복사합니다. 예: `postgresql://neondb_owner:***@ep-example.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
3. `backend/.env` 파일의 `DATABASE_URL` 값을 위 URL로 교체합니다. (비밀번호는 절대 Git에 커밋하지 마세요)
4. 필요한 경우 `database/schema.sql` 또는 Alembic 마이그레이션으로 스키마를 초기화합니다.

### 2️⃣ 백엔드 실행

```bash
cd backend
```

**macOS / Linux**

```bash
# 1) uv 가상환경 생성 (최초 1회)
uv venv -p python3.10

# 2) 가상환경 활성화
source .venv/bin/activate

# 3) 프로젝트 의존성 설치 (editable 모드)
uv pip install -e .

# 4) 환경 변수 템플릿 복사 (최초 1회)
cp .env.example .env

# 5) 서버 실행 (Neon DATABASE_URL이 .env에 설정되어 있어야 합니다)
uv run uvicorn main:app --reload
```

**Windows (PowerShell)**

```powershell
# 1) uv 가상환경 생성 (최초 1회)
uv venv -p python3.10

# 2) 가상환경 활성화
source .venv/Scripts/activate

# 3) 프로젝트 의존성 설치 (editable 모드)
uv pip install -e .

# 4) 환경 변수 템플릿 복사 (최초 1회)
Copy-Item .env.example -Destination .env

# 5) 서버 실행 (Neon DATABASE_URL이 .env에 설정되어 있어야 합니다)
uv run uvicorn main:app --reload
```

> PowerShell에서 스크립트 실행이 막히면 `Set-ExecutionPolicy -Scope Process RemoteSigned` 명령으로 임시 허용 후 다시 시도하세요.

**서버**: http://localhost:8000  
**API 문서**: http://localhost:8000/docs

### 3️⃣ 프론트엔드 실행

```bash
cd frontend

npm install
npm run dev
```

**웹사이트**: http://localhost:3000

---

## ✨ 주요 기능

### 🏢 관리자 (Admin)

- 기업 계정 생성
- 매직 링크 발급
- 전체 데이터 조회

### 🏭 기업 (Company)

- 매직 링크로 자동 로그인
- 이벤트 등록 (사진 업로드 → LLM 자동 추출)
- 설문조사 생성

### 👥 관람객 (Visitor) 🆕

- **실시간 입장 가능 이벤트** - 현재 시간 기준 자동 필터링
- **방문 시간 변경** - 원하는 날짜/시간으로 검색
- **빠른 시간 선택** - 오전 9시, 정오, 오후 3시, 오후 6시
- **상세 필터** - 이벤트 타입, 장소, 회사명
- **그리드/리스트 뷰** - 원하는 방식으로 보기
- **통계 대시보드** - 전체/진행중/예정 이벤트

---

## 📡 API 엔드포인트

### 인증

```
POST /api/auth/login          로그인
POST /api/auth/magic-login    매직 링크 로그인
```

### 이벤트 (기업용)

```
GET    /api/events           이벤트 목록
POST   /api/events           이벤트 생성
PUT    /api/events/{id}      이벤트 수정
DELETE /api/events/{id}      이벤트 삭제
```

### 🆕 이벤트 (관람객용)

```
GET /api/visitor/events           검색 (시간 기반 필터링)
GET /api/visitor/events/{id}      상세 조회
GET /api/visitor/events/stats     통계
```

**파라미터:**

- `visit_date`: 방문 날짜 (YYYY-MM-DD)
- `visit_time`: 방문 시간 (HH:MM)
- `event_type`: 이벤트 타입
- `location`: 장소
- `company_name`: 회사명
- `only_available`: 입장 가능만 (true/false)

---

## 🎨 프론트엔드 사용법

### App.jsx에 라우트 추가

```jsx
import EventExplorer from "./components/visitor/EventExplorer";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 기존 라우트 */}
        <Route path="/" element={<VisitorHome />} />

        {/* 🆕 새로운 이벤트 탐색 페이지 */}
        <Route path="/explore" element={<EventExplorer />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### 사용 예시

```jsx
// 현재 시간 기준 입장 가능한 이벤트
<EventExplorer />

// 특정 시간으로 검색
// 사용자가 UI에서 날짜/시간 선택 가능
```

---

## 🛠 기술 스택

**백엔드:**

- Python 3.10
- FastAPI
- SQLAlchemy
- PostgreSQL
- Anthropic Claude API (LLM)

**프론트엔드:**

- React 18
- TypeScript
- Vite
- CSS3

---

## 💡 핵심 파일 설명

### 백엔드

| 파일                       | 설명                                         |
| -------------------------- | -------------------------------------------- |
| `main.py`                  | 서버 시작점, 라우터 등록                     |
| `database.py`              | PostgreSQL 연결                              |
| `models/`                  | 데이터베이스 테이블 정의 (Company, Event 등) |
| `routes/events_visitor.py` | 🆕 관람객용 API (시간 필터링)                |
| `services/llm_service.py`  | LLM 이미지 분석 (이벤트 정보 추출)           |

### 프론트엔드

| 파일                                   | 설명                |
| -------------------------------------- | ------------------- |
| `App.jsx`                              | 라우팅 설정         |
| `components/visitor/EventExplorer.tsx` | 🆕 메인 탐색 페이지 |
| `components/visitor/EventCard.tsx`     | 🆕 이벤트 카드 UI   |
| `components/visitor/TimeFilter.tsx`    | 🆕 시간 필터 UI     |
| `styles/EventExplorer.css`             | 🆕 깔끔한 스타일    |

---

## 🔐 환경 변수 (.env)

```bash
# 데이터베이스
DATABASE_URL=postgresql://neondb_owner:****************@ep-wandering-cell-a119aa7q-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# LLM API
ANTHROPIC_API_KEY=sk-ant-...

# JWT 인증
SECRET_KEY=your-secret-key-here
```

---

### 1️⃣ PostgreSQL 초기화 (Neon)

Neon 프로젝트를 생성한 뒤 `DATABASE_URL`만 설정하면 별도의 로컬 설치가 필요 없습니다. 스키마는 다음 중 한 가지 방식으로 적용하세요.

```bash
# SQL 스키마 직접 로드 (Neon에서 받은 URL 사용)
psql "postgresql://..." -f database/schema.sql

# 또는 Alembic 사용 시
cd backend
uv run alembic upgrade head
```

> 다른 클라우드 DB를 사용해도 무방하지만, 모든 팀원이 동일한 `DATABASE_URL`을 사용해야 합니다.

### 2️⃣ 샘플 데이터 시드 적용

`database/seed.sql`에는 지금까지 프론트/백엔드에서 하드코딩으로 사용하던 기본 데이터(전시장, 전시회, 기업, 이벤트, 담당자, 설문, 응답 등)가 모두 정리되어 있습니다. 테이블 스키마를 적용한 뒤 아래 명령을 실행하면 동일한 초기 데이터를 손쉽게 채울 수 있습니다.

```bash
# 스키마를 반영한 같은 데이터베이스 URL 사용
psql "postgresql://..." -f database/seed.sql
```

- `TRUNCATE ... RESTART IDENTITY`를 포함하고 있으므로 실행 시 기존 데이터는 모두 초기화됩니다.
- 루트 관리자 계정(`root` / 비밀번호 `root`), 샘플 기업 8개, 이벤트 9개, 담당자 및 설문 응답 데이터가 함께 생성됩니다.
- **팀 전체가 같은 Neon 프로젝트를 사용한다면 스키마 적용 이후 이 시드 스크립트를 공통으로 실행해야 동일한 더미 데이터를 공유할 수 있습니다.**

필요 시 언제든지 다시 실행해 초기 상태로 되돌릴 수 있습니다.

---

## 📝 데이터베이스 테이블

1. `admins` - 관리자
2. `companies` - 기업 (매직 링크)
3. `events` - 이벤트
4. `event_managers` - 담당자
5. `surveys` - 설문조사
6. `survey_responses` - 설문 응답
7. `event_likes` - 좋아요
8. `event_views` - 조회 로그
9. `tags` - 태그
10. `venues` - 전시장

---

## 👥 역할별 체크리스트

- **백엔드 담당**
  - Neon 프로젝트의 `DATABASE_URL`을 `.env`에 반영하고 `uvicorn main:app --reload`로 실제 연결을 확인합니다.
  - `database/schema.sql` 또는 Alembic 마이그레이션으로 스키마/시드 데이터를 적용해 팀에서 동일한 데이터를 확인할 수 있도록 합니다.
- **프론트엔드 팀**
  - `frontend/src/pages/**` 내의 모의 데이터를 실제 API 응답으로 대체하고, `AddManagerModal` 제출 로직을 백엔드 엔드포인트와 연동합니다.
  - 새로 추가된 `Header`, `AddManagerModal` 컴포넌트 스타일이 디자인 가이드와 맞는지 검토하고 반응형 동작을 점검합니다.
- **데브옵스/QA**
  - Neon 대시보드에서 필요 시 추가 브랜치/데이터베이스를 생성하고 접근 권한을 관리합니다.
  - 프론트/백엔드가 동시에 구동된 환경에서 핵심 사용자 흐름(기업 로그인 → 이벤트 등록 → 관람객 설문)을 점검하고 이슈를 추적합니다.

---

## ❓ FAQ

**Q: Python 버전은?**  
A: Python 3.10 사용 (pyproject.toml 참고)

**Q: 데이터베이스는?**  
A: PostgreSQL 14 이상

**Q: LLM API 없이 사용 가능?**  
A: 가능. 단, 이벤트 자동 추출 기능은 사용 불가

**Q: 프론트엔드만 실행 가능?**  
A: 가능. 단, API 호출 시 에러 발생
