"""Utility helpers for building and sending event survey reports."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Optional, List

from sqlalchemy.orm import Session
from sqlalchemy import func

from models import Company, Event, EventManager, Survey, SurveyResponse
from services.email_service import send_html_email

logger = logging.getLogger(__name__)


class EventReportService:
    """Generate and send survey reports for completed events."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def _format_number(self, value: Optional[int]) -> str:
        if value is None:
            return "0"
        return f"{value:,}"

    def _calculate_event_stats(self, event: Event) -> dict:
        """Calculate statistics for a specific event."""
        total_surveys = len(event.surveys)
        active_surveys = sum(1 for survey in event.surveys if survey.is_active)
        total_responses = sum(survey.current_responses or 0 for survey in event.surveys)
        
        # 가상의 조회수 (실제로는 EventView 테이블에서 가져와야 함)
        total_views = total_responses * 3  # 응답 대비 조회수 비율 가정
        
        # 응답률 계산
        response_rate = (total_responses / total_views * 100) if total_views > 0 else 0
        
        return {
            'total_surveys': total_surveys,
            'active_surveys': active_surveys,
            'total_responses': total_responses,
            'total_views': total_views,
            'response_rate': round(response_rate, 1)
        }

    def _get_survey_breakdown(self, event: Event) -> List[dict]:
        """Get detailed survey breakdown for the event."""
        surveys = []
        for survey in event.surveys:
            surveys.append({
                'title': survey.title or f"설문 {survey.id}",
                'responses': survey.current_responses or 0,
                'status': '활성' if survey.is_active else '종료',
                'created_at': survey.created_at.strftime('%Y-%m-%d') if survey.created_at else '-'
            })
        return surveys

    def _build_report_html(self, report: dict) -> str:
        company = report.get("company", {})
        stats = report.get("stats", {})
        recent_events = report.get("recent_events", [])

        generated_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

        rows = []
        for event in recent_events:
            status = event.get("status", "ended")
            status_label = {
                "ongoing": "진행중",
                "active": "진행중",
                "upcoming": "예정",
                "ended": "종료",
            }.get(status, "종료")
            status_color = {
                "ongoing": "#10b981",
                "active": "#10b981", 
                "upcoming": "#f59e0b",
                "ended": "#6b7280",
            }.get(status, "#6b7280")
            
            rows.append(
                f"<tr style='border-bottom:1px solid #f3f4f6;'>"
                f"<td style='padding:12px 16px;color:#374151;font-size:14px;'>{event.get('name', '-')}</td>"
                f"<td style='padding:12px 16px;color:#6b7280;font-size:13px;'>{event.get('start_date', '-')}{' ~ ' + event['end_date'] if event.get('end_date') else ''}</td>"
                f"<td style='padding:12px 16px;text-align:right;color:#374151;font-weight:600;font-size:14px;'>{self._format_number(event.get('response_count'))}</td>"
                f"<td style='padding:12px 16px;text-align:center;'><span style='background:{status_color};color:white;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:500;'>{status_label}</span></td>"
                "</tr>"
            )

        events_table = (
            """
            <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
              <table style="width:100%;border-collapse:collapse;">
                <thead>
                  <tr style="background:#f8fafc;">
                    <th style="padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:left;color:#374151;font-weight:600;font-size:14px;">이벤트명</th>
                    <th style="padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:left;color:#374151;font-weight:600;font-size:14px;">기간</th>
                    <th style="padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:right;color:#374151;font-weight:600;font-size:14px;">응답 수</th>
                    <th style="padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:center;color:#374151;font-weight:600;font-size:14px;">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {rows}
                </tbody>
              </table>
            </div>
        """.format(rows="".join(rows))
            if rows
            else '<div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:24px;text-align:center;"><p style="margin:0;color:#6b7280;font-size:14px;">📅 최근 5개 이내 이벤트 데이터가 없습니다.</p></div>'
        )

        return f"""
        <!DOCTYPE html>
        <html lang="ko">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{company.get('name', '기업')} 리포트</title>
          </head>
          <body style="font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; background:#f9fafb; padding:24px; margin:0;">
            <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 6px 18px rgba(15,23,42,0.08);">
              <div style="text-align:center; margin-bottom:32px;">
                <h1 style="margin:0 0 8px 0;color:#111827;font-size:28px;font-weight:700;">{company.get('name', '기업')} 주간 리포트</h1>
                <p style="margin:0;color:#6b7280;font-size:14px;">발행 시각: {generated_at}</p>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:32px;">
                <div style="padding:20px;border-radius:12px;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;text-align:center;">
                  <div style="font-weight:600;font-size:14px;opacity:0.9;">총 이벤트</div>
                  <div style="font-size:32px;font-weight:700;margin-top:8px;">{self._format_number(stats.get('total_events'))}</div>
                </div>
                
                <div style="padding:20px;border-radius:12px;background:linear-gradient(135deg, #f093fb 0%, #f5576c 100%);color:white;text-align:center;">
                  <div style="font-weight:600;font-size:14px;opacity:0.9;">진행 중 설문</div>
                  <div style="font-size:32px;font-weight:700;margin-top:8px;">{self._format_number(stats.get('active_surveys'))}</div>
                </div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:32px;">
                <div style="padding:20px;border-radius:12px;background:linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);color:white;text-align:center;">
                  <div style="font-weight:600;font-size:14px;opacity:0.9;">총 응답 수</div>
                  <div style="font-size:32px;font-weight:700;margin-top:8px;">{self._format_number(stats.get('total_responses'))}</div>
                </div>
                
                <div style="padding:20px;border-radius:12px;background:linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);color:white;text-align:center;">
                  <div style="font-weight:600;font-size:14px;opacity:0.9;">총 조회 수</div>
                  <div style="font-size:32px;font-weight:700;margin-top:8px;">{self._format_number(stats.get('total_views'))}</div>
                </div>
              </div>

              <div style="margin-bottom:32px;">
                <h2 style="color:#111827;font-size:20px;font-weight:600;margin-bottom:16px;">📊 최근 이벤트 현황</h2>
                {events_table}
              </div>

              <div style="background:#f8fafc;border-radius:12px;padding:24px;text-align:center;">
                <h3 style="color:#374151;font-size:16px;font-weight:600;margin:0 0 12px 0;">🔍 더 자세한 분석이 필요하신가요?</h3>
                <p style="color:#6b7280;font-size:14px;margin:0 0 20px 0;">상세 데이터와 인사이트는 관리자 대시보드에서 확인하실 수 있습니다.</p>
                <a href="#" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">대시보드 바로가기 →</a>
              </div>
              
              <div style="margin-top:32px;padding-top:24px;border-top:1px solid #e5e7eb;text-align:center;">
                <p style="color:#9ca3af;font-size:13px;margin:0;">이 리포트는 자동으로 발송되었습니다. 문의사항이 있으시면 고객센터로 연락주세요.</p>
              </div>
            </div>
          </body>
        </html>
        """

    def _fetch_company(self, company_id: int) -> Company:
        company = self.db.query(Company).filter(Company.id == company_id).first()
        if not company:
            raise ValueError("기업 정보를 찾을 수 없습니다.")
        return company

    def generate_company_report(self, company_id: int) -> dict:
        """Return dashboard data for the company as a plain dict."""
        report = get_company_dashboard(company_id=company_id, db=self.db)
        return report.model_dump()

    def send_company_report(self, company_id: int, override_email: Optional[str] = None) -> str:
        """Build and deliver a report email for a company.

        Returns the recipient email address on success.
        """
        company = self._fetch_company(company_id)
        recipient = override_email or company.email
        if not recipient:
            raise ValueError("회사 이메일이 없어 리포트를 전송할 수 없습니다.")

        report_dict = self.generate_company_report(company_id)
        html_body = self._build_report_html(report_dict)
        subject = f"[전시회 플랫폼] {company.company_name} 리포트"

        if not send_html_email(recipient, subject, html_body):
            logger.info("SMTP 미구성으로 인해 %s 리포트를 콘솔에만 출력합니다.", company.company_name)

        return recipient

    def send_reports_for_all_companies(self) -> None:
        """Send reports to every active company."""
        companies = self.db.query(Company).filter(Company.is_active.is_(True)).all()
        logger.info("주기적 리포트 발송 시작 - 대상 기업 %d개", len(companies))
        for company in companies:
            try:
                self.send_company_report(company.id)
            except ValueError as exc:
                logger.warning("%s 리포트 발송 건너뜀: %s", company.company_name, exc)
            except Exception as exc:  # noqa: BLE001
                logger.exception("%s 리포트 발송 실패", company.company_name, exc_info=exc)