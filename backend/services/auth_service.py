# services/auth_service.py
"""Authentication helpers including magic link service and JWT utilities."""

import base64
import os
import secrets
from datetime import datetime, timedelta, timezone
from io import BytesIO
from typing import Optional

import qrcode
from fastapi import BackgroundTasks
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from models.company import Company
from services.email_service import send_magic_link_email


pwd_context = CryptContext(
    schemes=["bcrypt"], 
    deprecated="auto",
    bcrypt__rounds=12,
)


def _get_jwt_settings() -> tuple[str, str, int]:
    """환경 변수에서 JWT 관련 설정을 로드."""

    secret_key = os.getenv("SECRET_KEY") or "change-me"
    algorithm = os.getenv("ALGORITHM", "HS256")
    default_expire = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    return secret_key, algorithm, default_expire


def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    """bcrypt 해시와 사용자가 입력한 비밀번호를 비교."""

    if not plain_password or not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """비밀번호를 bcrypt 해시로 변환."""
    # bcrypt는 72바이트 제한이 있으므로 필요시 자름
    if len(password.encode('utf-8')) > 72:
        password = password[:72]
    return pwd_context.hash(password)


def generate_temporary_password() -> str:
    """
    관리자가 기업 계정 생성 시 사용할 8자리 임시 비밀번호 생성.
    영문 대소문자 + 숫자 조합으로 안전한 패스워드 생성.
    
    Returns:
        str: 8자리 임시 비밀번호 (예: "Kj3n8Qm2")
    """
    import random
    import string
    
    # 대문자, 소문자, 숫자 각각 최소 1개씩 포함
    chars = []
    chars.append(random.choice(string.ascii_uppercase))  # 대문자 1개
    chars.append(random.choice(string.ascii_lowercase))  # 소문자 1개
    chars.append(random.choice(string.digits))          # 숫자 1개
    
    # 나머지 5자리는 모든 문자에서 랜덤 선택
    all_chars = string.ascii_letters + string.digits
    for _ in range(5):
        chars.append(random.choice(all_chars))
    
    # 순서 섞기
    random.shuffle(chars)
    
    return ''.join(chars)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """JWT 액세스 토큰 생성."""

    secret_key, algorithm, default_expire = _get_jwt_settings()
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=default_expire))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, secret_key, algorithm=algorithm)


def decode_access_token(token: str) -> Optional[dict]:
    """JWT 토큰을 디코드하고 실패 시 None 반환."""

    secret_key, algorithm, _ = _get_jwt_settings()
    try:
        return jwt.decode(token, secret_key, algorithms=[algorithm])
    except JWTError:
        return None


class MagicLinkService:
    """매직 링크 생성 및 관리"""

    def __init__(self, db: Session):
        self.db = db
        self.link_expiry_minutes = int(os.getenv("MAGIC_LINK_EXPIRY_MINUTES", "20160"))
    
    def generate_magic_link(
        self, 
        company: Company,
        background_tasks: BackgroundTasks
    ) -> dict:
        """
        매직 링크 생성 + QR 코드 생성 + 이메일 발송
        
        Args:
            company: 기업 정보
            background_tasks: FastAPI 백그라운드 작업
            
        Returns:
            dict: 매직 링크, QR 코드 정보
        """
        # 1. 토큰 생성
        token = secrets.token_urlsafe(32)
        
        # 2. 만료 시간 설정
        expires_at = datetime.utcnow() + timedelta(minutes=self.link_expiry_minutes)
        
        # 3. DB에 저장
        company.magic_token = token
        company.token_expires_at = expires_at
        self.db.commit()

        # 4. 매직 링크 URL 생성 (프론트엔드 기준)
        base_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000").rstrip("/")
        magic_link = f"{base_url}/company/magic-login?token={token}"
        
        # 5. QR 코드 생성
        qr_code_base64 = self._generate_qr_code(magic_link)
        
        # 6. 이메일 발송 (백그라운드)
        if company.email:
            background_tasks.add_task(
                send_magic_link_email,
                recipient_email=company.email,
                recipient_name=company.company_name,
                company_name=company.company_name,
                magic_link=magic_link,
                qr_code_base64=qr_code_base64,
                expires_minutes=self.link_expiry_minutes,
            )
        
        return {
            "magic_link": magic_link,
            "qr_code": qr_code_base64,
            "expires_at": expires_at.isoformat(),
            "email_sent_to": company.email,
        }
    
    def _generate_qr_code(self, url: str) -> str:
        """
        URL을 QR 코드 이미지로 변환 (Base64)
        
        Args:
            url: QR 코드로 만들 URL
            
        Returns:
            str: Base64로 인코딩된 PNG 이미지
        """
        # QR 코드 생성
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(url)
        qr.make(fit=True)
        
        # 이미지 생성
        img = qr.make_image(fill_color="black", back_color="white")
        
        # BytesIO로 변환
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        
        # Base64 인코딩
        img_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_base64}"
    
    def verify_magic_link(self, token: str) -> Optional[Company]:
        """
        매직 링크 토큰 검증
        
        Args:
            token: 검증할 토큰
            
        Returns:
            Company: 유효하면 회사 정보, 아니면 None
        """
        company = self.db.query(Company).filter(
            Company.magic_token == token
        ).first()
        
        if not company:
            return None
        
        # 토큰 만료 확인 (timezone-aware datetime 사용)
        current_time = datetime.now(timezone.utc)
        if company.token_expires_at < current_time:
            return None
        
        # 개발 중에는 토큰을 삭제하지 않음 (재사용 가능)
        # TODO: 프로덕션에서는 1회용으로 변경 필요
        # company.magic_token = None
        # company.token_expires_at = None
        company.last_login_at = current_time
        self.db.commit()

        return company
