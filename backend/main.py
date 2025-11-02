"""
전시회 플랫폼 메인 서버
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from routes import auth, events, events_visitor
import os
from dotenv import load_dotenv

app = FastAPI(
    title="전시회 플랫폼 API",
    description="전시회 이벤트 관리 플랫폼",
    version="2.0"
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
