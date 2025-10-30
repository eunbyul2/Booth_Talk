# routes/auth.py
"""
인증 라우트 - 매직 링크 + QR 코드 + 이메일
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from database import get_db
from models.company import Company
from services.auth_service import MagicLinkService


router = APIRouter(prefix="/auth", tags=["인증"])


class MagicLinkRequest(BaseModel):
    """매직 링크 요청"""
    email: EmailStr
    company_name: str


class MagicLinkResponse(BaseModel):
    """매직 링크 응답"""
    success: bool
    message: str
    magic_link: str
    qr_code: str
    expires_at: str
    email_sent_to: str


@router.post("/magic-link", response_model=MagicLinkResponse)
async def request_magic_link(
    request: MagicLinkRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    매직 링크 + QR 코드 생성 및 이메일 발송
    
    - 이메일로 매직 링크 발송
    - QR 코드 이미지 포함
    - 30분 후 자동 만료
    - 1회용 링크
    
    ## 사용 예시
    ```json
    {
        "email": "manager@company.com",
        "company_name": "ABC Company"
    }
    ```
    """
    
    # 1. 회사 정보 조회
    company = db.query(Company).filter(
        Company.email == request.email,
        Company.company_name == request.company_name
    ).first()
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="등록되지 않은 이메일 또는 회사명입니다."
        )
    
    # 2. 매직 링크 생성 + QR 코드 + 이메일 발송
    magic_link_service = MagicLinkService(db)
    result = magic_link_service.generate_magic_link(company, background_tasks)
    
    return MagicLinkResponse(
        success=True,
        message=f"{request.email}로 매직 링크가 발송되었습니다. 이메일을 확인하거나 QR 코드를 스캔하세요.",
        **result
    )


@router.get("/verify")
async def verify_magic_link(
    token: str,
    db: Session = Depends(get_db)
):
    """
    매직 링크 검증 및 로그인 처리
    
    - URL: /auth/verify?token=xxxxx
    - 토큰 검증
    - 세션 생성
    - 대시보드로 리다이렉트
    """
    
    # 토큰 검증
    magic_link_service = MagicLinkService(db)
    company = magic_link_service.verify_magic_link(token)
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않거나 만료된 링크입니다."
        )
    
    # 실제로는 JWT 토큰 생성 후 프론트엔드로 리다이렉트
    # 여기서는 간단히 처리
    
    return {
        "success": True,
        "message": "로그인 성공!",
        "company": {
            "id": company.id,
            "name": company.company_name,
            "email": company.email,
        },
        "redirect_url": f"/dashboard?company_id={company.id}"
    }


@router.post("/resend-magic-link")
async def resend_magic_link(
    request: MagicLinkRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    매직 링크 재발송
    
    - 이전 링크 만료 처리
    - 새 링크 생성 및 발송
    """
    
    # 회사 정보 조회
    company = db.query(Company).filter(
        Company.email == request.email
    ).first()
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="등록되지 않은 이메일입니다."
        )
    
    # 기존 토큰 무효화
    company.magic_token = None
    company.token_expires_at = None
    db.commit()
    
    # 새 매직 링크 생성
    magic_link_service = MagicLinkService(db)
    result = magic_link_service.generate_magic_link(company, background_tasks)
    
    return {
        "success": True,
        "message": "새 매직 링크가 발송되었습니다.",
        "email_sent_to": company.email
    }
