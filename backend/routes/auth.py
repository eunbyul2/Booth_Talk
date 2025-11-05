# routes/auth.py
"""
인증 라우트 - 매직 링크 + QR 코드 + 이메일
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from database import get_db
from models.company import Company
from services.auth_service import (
    MagicLinkService,
    create_access_token,
    verify_password,
)


router = APIRouter(tags=["인증"])


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
    email_sent_to: str | None = None


class CompanyInfo(BaseModel):
    id: int
    name: str
    email: str | None = None
    username: str


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    company: CompanyInfo


class MagicLinkVerifyResponse(BaseModel):
    success: bool
    access_token: str
    token_type: str
    company: CompanyInfo
    redirect_url: str | None = None


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


@router.get("/magic-verify", response_model=MagicLinkVerifyResponse)
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
    
    print(f"🔍 토큰 검증 시작: {token}")
    
    # 토큰 검증
    magic_link_service = MagicLinkService(db)
    company = magic_link_service.verify_magic_link(token)
    
    print(f"🔍 토큰 검증 결과: {company}")
    
    if not company:
        print(f"❌ 토큰 검증 실패: {token}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않거나 만료된 링크입니다."
        )
    
    print(f"✅ 토큰 검증 성공: {company.company_name}")
    
    # 실제로는 JWT 토큰 생성 후 프론트엔드로 리다이렉트
    # 여기서는 간단히 처리
    
    access_token = create_access_token({"sub": str(company.id), "role": "company"})

    return MagicLinkVerifyResponse(
        success=True,
        access_token=access_token,
        token_type="bearer",
        company=CompanyInfo(
            id=company.id,
            name=company.company_name,
            email=company.email,
            username=company.username,
        ),
        redirect_url=f"/company/dashboard?company_id={company.id}"
    )


@router.post("/resend-magic-link", response_model=MagicLinkResponse)
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

    return MagicLinkResponse(
        success=True,
        message="새 매직 링크가 발송되었습니다.",
        **result
    )


@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    db: Session = Depends(get_db)
):
    """기업 계정 로그인 (아이디/비밀번호)"""

    company: Company | None = db.query(Company).filter(Company.username == payload.username).first()

    if not company or not verify_password(payload.password, company.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="아이디 또는 비밀번호가 올바르지 않습니다.",
        )

    access_token = create_access_token({"sub": str(company.id), "role": "company"})
    company.last_login_at = datetime.utcnow()
    company.login_count = (company.login_count or 0) + 1
    db.add(company)
    db.commit()

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        company=CompanyInfo(
            id=company.id,
            name=company.company_name,
            email=company.email,
            username=company.username,
        ),
    )
