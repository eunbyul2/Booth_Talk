"""
전시회 플랫폼 메인 서버
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from routes import auth, events, events_visitor
from routes import companies
from routes import admin as admin_routes
import os
from dotenv import load_dotenv
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import atexit
from contextlib import asynccontextmanager

# 스케줄러 초기화
scheduler = BackgroundScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 시 실행되는 함수"""
    # 앱 시작 시
    start_scheduler()
    yield
    # 앱 종료 시
    stop_scheduler()

def start_scheduler():
    """스케줄러 시작"""
    try:
        # 매일 오전 10시에 이벤트 리포트 발송 확인 (7일 전 종료된 이벤트들)
        scheduler.add_job(
            send_weekly_reports,
            CronTrigger(hour=10, minute=0),  # 매일 오전 10시
            id='event_reports',
            max_instances=1,
            replace_existing=True
        )
        
        # 매시간마다 임시 파일 정리 (고아 파일)
        scheduler.add_job(
            cleanup_orphaned_files,
            CronTrigger(minute=0),  # 매시간 정각
            id='cleanup_orphaned',
            max_instances=1,
            replace_existing=True
        )
        
        # 매일 새벽 2시에 오래된 임시 파일 정리
        scheduler.add_job(
            cleanup_old_temp_files,
            CronTrigger(hour=2, minute=0),  # 매일 새벽 2시
            id='cleanup_old_temp',
            max_instances=1,
            replace_existing=True
        )
        
        scheduler.start()
        logging.info("이벤트 기반 리포트 및 파일 정리 스케줄러가 시작되었습니다.")
    except Exception as e:
        logging.error(f"스케줄러 시작 실패: {e}")

def stop_scheduler():
    """스케줄러 중지"""
    try:
        if scheduler.running:
            scheduler.shutdown()
            logging.info("스케줄러가 중지되었습니다.")
    except Exception as e:
        logging.error(f"스케줄러 중지 실패: {e}")

def send_weekly_reports():
    """이벤트 종료 후 7일이 지난 이벤트들의 리포트 발송 작업"""
    try:
        from database import get_db
        from services.event_report_service import EventReportService
        
        db = next(get_db())
        report_service = EventReportService(db)
        report_service.process_scheduled_reports()
        logging.info("이벤트 기반 리포트 발송 완료")
    except Exception as e:
        logging.error(f"이벤트 리포트 발송 실패: {e}")
    finally:
        if 'db' in locals():
            db.close()


def cleanup_orphaned_files():
    """고아 임시 파일 정리 (1시간 지난 파일)"""
    try:
        from services.cleanup_service import cleanup_service
        cleanup_service.cleanup_orphaned_temp_files()
    except Exception as e:
        logging.error(f"고아 파일 정리 실패: {e}")


def cleanup_old_temp_files():
    """오래된 임시 파일 정리 (24시간 지난 파일)"""
    try:
        from services.cleanup_service import cleanup_service
        cleanup_service.cleanup_temp_files()
    except Exception as e:
        logging.error(f"임시 파일 정리 실패: {e}")

app = FastAPI(
    title="전시회 플랫폼 API",
    description="전시회 이벤트 관리 플랫폼",
    version="2.0",
    lifespan=lifespan
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Google Maps API key endpoint - 라우터보다 먼저 등록
load_dotenv()

@app.get("/api/visitor/maps-api-key")
@app.get("/api/maps-api-key")
@app.get("/maps-api-key")
def get_maps_api_key():
    """Google Maps API 키 반환"""
    key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not key:
        raise HTTPException(status_code=404, detail="GOOGLE_MAPS_API_KEY not set in backend/.env")
    return {"key": key}

# 라우터 등록
app.include_router(auth.router, prefix="/api/auth", tags=["인증"])
app.include_router(events.router, prefix="/api/events", tags=["이벤트"])
app.include_router(events_visitor.router, prefix="/api", tags=["관람객"])  # 🆕 추가
app.include_router(companies.router, prefix="/api", tags=["기업"])
app.include_router(admin_routes.router, prefix="/api", tags=["관리자"])

# 정적 파일 서빙 (업로드된 이미지)
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)

@app.get("/")
def root():
    return {
        "message": "전시회 플랫폼 API",
        "version": "2.0",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
