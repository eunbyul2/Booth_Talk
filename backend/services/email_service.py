"""Email utility functions for sending magic-link messages."""
import os
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Load environment variables so local .env is respected when running uvicorn
load_dotenv()

# Default configuration values
MAIL_SERVER = os.getenv("MAIL_SERVER")
MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
MAIL_USERNAME = os.getenv("MAIL_USERNAME")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
MAIL_FROM = os.getenv("MAIL_FROM", MAIL_USERNAME)
MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "true").lower() == "true"


def _is_configured() -> bool:
    """Return True if SMTP credentials are present."""
    return all([MAIL_SERVER, MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM])


def send_magic_link_email(
    recipient_email: str,
    recipient_name: Optional[str],
    company_name: str,
    magic_link: str,
    qr_code_base64: str,
    expires_minutes: int,
) -> None:
    """Send the magic link email or log a warning when SMTP is not configured."""
    if not _is_configured():
        logger.warning(
            "SMTP 환경변수가 설정되지 않아 매직 링크 이메일을 전송하지 못했습니다.\n"
            "MAIL_SERVER / MAIL_USERNAME / MAIL_PASSWORD / MAIL_FROM 값을 .env에 채워주세요."
        )
        logger.info(
            "임시 출력) %s (%s) 에게 전송할 매직 링크: %s",
            company_name,
            recipient_email,
            magic_link,
        )
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "[전시회 플랫폼] 매직 링크 안내"
    msg["From"] = MAIL_FROM
    msg["To"] = recipient_email

    greeting = recipient_name or company_name
    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif;">
        <h2>안녕하세요 {greeting}님,</h2>
        <p>전시회 플랫폼 관리자 페이지 접속을 위한 매직 링크를 발급해 드립니다.</p>
        <p><strong>유효 시간:</strong> 약 {expires_minutes // 60}시간 ({expires_minutes}분)</p>
        <p>
          <a href="{magic_link}" style="background:#6366f1;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;">
            매직 링크로 이동
          </a>
        </p>
        <p>또는 아래 QR 코드를 휴대폰으로 스캔하세요.</p>
        <p><img src="{qr_code_base64}" alt="Magic Link QR" style="max-width:240px;" /></p>
        <hr />
        <small>본 메일은 시스템에 의해 자동 발송되었습니다.</small>
      </body>
    </html>
    """

    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(MAIL_SERVER, MAIL_PORT, timeout=30) as server:
            if MAIL_USE_TLS:
                server.starttls()
            server.login(MAIL_USERNAME, MAIL_PASSWORD)
            server.send_message(msg)
        logger.info("매직 링크 이메일을 %s 로 전송했습니다.", recipient_email)
    except Exception as exc:  # noqa: BLE001
        logger.exception("매직 링크 이메일 전송 실패: %s", exc)
        raise
