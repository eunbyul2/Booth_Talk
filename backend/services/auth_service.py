# services/auth_service.py
"""
매직 링크 + QR 코드 + 이메일 발송 서비스
"""

import secrets
import qrcode
from io import BytesIO
from datetime import datetime, timedelta
from typing import Optional
import base64

from sqlalchemy.orm import Session
from fastapi import BackgroundTasks

from models.company import Company
from services.email_service import send_magic_link_email


class MagicLinkService:
    """매직 링크 생성 및 관리"""
    
    def __init__(self, db: Session):
        self.db = db
        self.link_expiry_minutes = 20160  # 2주 (14일 * 24시간 * 60분)
    
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
        
        # 4. 매직 링크 URL 생성
        base_url = "https://your-domain.com"  # 환경변수로 관리
        magic_link = f"{base_url}/auth/verify?token={token}"
        
        # 5. QR 코드 생성
        qr_code_base64 = self._generate_qr_code(magic_link)
        
        # 6. 이메일 발송 (백그라운드)
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
        
        # 토큰 만료 확인
        if company.token_expires_at < datetime.utcnow():
            return None
        
        # 토큰 사용 처리 (1회용)
        company.magic_token = None
        company.token_expires_at = None
        company.last_login_at = datetime.utcnow()
        self.db.commit()

        return company
