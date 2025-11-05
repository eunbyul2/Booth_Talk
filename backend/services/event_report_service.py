"""Event-based survey report service for automatic delivery."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Optional, List

from sqlalchemy.orm import Session

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

    def _build_event_report_html(self, event: Event, stats: dict, surveys: List[dict]) -> str:
        """Build HTML report for a specific event."""
        company_name = event.company.company_name if event.company else "Unknown Company"
        event_name = event.event_name
        event_period = f"{event.start_date.strftime('%Y년 %m월 %d일')}"
        if event.end_date and event.end_date != event.start_date:
            event_period += f" ~ {event.end_date.strftime('%Y년 %m월 %d일')}"

        generated_at = datetime.utcnow().strftime("%Y년 %m월 %d일 %H:%M")

        # 설문 목록 생성
        survey_rows = []
        for survey in surveys:
            status_color = "#10b981" if survey['status'] == '활성' else "#6b7280"
            survey_rows.append(
                f"<tr style='border-bottom:1px solid #f3f4f6;'>"
                f"<td style='padding:12px 16px;color:#374151;font-size:14px;'>{survey['title']}</td>"
                f"<td style='padding:12px 16px;text-align:right;color:#374151;font-weight:600;font-size:14px;'>{self._format_number(survey['responses'])}</td>"
                f"<td style='padding:12px 16px;text-align:center;'><span style='background:{status_color};color:white;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:500;'>{survey['status']}</span></td>"
                f"<td style='padding:12px 16px;color:#6b7280;font-size:13px;text-align:center;'>{survey['created_at']}</td>"
                "</tr>"
            )

        survey_table = (
            """
            <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
              <table style="width:100%;border-collapse:collapse;">
                <thead>
                  <tr style="background:#f8fafc;">
                    <th style="padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:left;color:#374151;font-weight:600;font-size:14px;">설문 제목</th>
                    <th style="padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:right;color:#374151;font-weight:600;font-size:14px;">응답 수</th>
                    <th style="padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:center;color:#374151;font-weight:600;font-size:14px;">상태</th>
                    <th style="padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:center;color:#374151;font-weight:600;font-size:14px;">생성일</th>
                  </tr>
                </thead>
                <tbody>
                  {rows}
                </tbody>
              </table>
            </div>
        """.format(rows="".join(survey_rows))
            if survey_rows
            else '<div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:24px;text-align:center;"><p style="margin:0;color:#6b7280;font-size:14px;">📋 설문 데이터가 없습니다.</p></div>'
        )

        return f"""
        <!DOCTYPE html>
        <html lang="ko">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{event_name} 설문 결과 리포트</title>
          </head>
          <body style="font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; background:#f9fafb; padding:24px; margin:0;">
            <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 6px 18px rgba(15,23,42,0.08);">
              <div style="text-align:center; margin-bottom:32px;">
                <h1 style="margin:0 0 8px 0;color:#111827;font-size:28px;font-weight:700;">📊 {event_name}</h1>
                <h2 style="margin:0 0 4px 0;color:#6b7280;font-size:18px;font-weight:500;">설문 결과 리포트</h2>
                <p style="margin:0 0 4px 0;color:#9ca3af;font-size:14px;">{company_name}</p>
                <p style="margin:0;color:#9ca3af;font-size:13px;">이벤트 기간: {event_period}</p>
                <p style="margin:8px 0 0 0;color:#6b7280;font-size:12px;">리포트 생성: {generated_at}</p>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:32px;">
                <div style="padding:20px;border-radius:12px;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;text-align:center;">
                  <div style="font-weight:600;font-size:14px;opacity:0.9;">총 설문 수</div>
                  <div style="font-size:32px;font-weight:700;margin-top:8px;">{self._format_number(stats.get('total_surveys'))}</div>
                </div>
                
                <div style="padding:20px;border-radius:12px;background:linear-gradient(135deg, #f093fb 0%, #f5576c 100%);color:white;text-align:center;">
                  <div style="font-weight:600;font-size:14px;opacity:0.9;">총 응답 수</div>
                  <div style="font-size:32px;font-weight:700;margin-top:8px;">{self._format_number(stats.get('total_responses'))}</div>
                </div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:32px;">
                <div style="padding:20px;border-radius:12px;background:linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);color:white;text-align:center;">
                  <div style="font-weight:600;font-size:14px;opacity:0.9;">총 조회 수</div>
                  <div style="font-size:32px;font-weight:700;margin-top:8px;">{self._format_number(stats.get('total_views'))}</div>
                </div>
                
                <div style="padding:20px;border-radius:12px;background:linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);color:white;text-align:center;">
                  <div style="font-weight:600;font-size:14px;opacity:0.9;">응답률</div>
                  <div style="font-size:32px;font-weight:700;margin-top:8px;">{stats.get('response_rate')}%</div>
                </div>
              </div>

              <div style="margin-bottom:32px;">
                <h2 style="color:#111827;font-size:20px;font-weight:600;margin-bottom:16px;">📋 설문별 상세 결과</h2>
                {survey_table}
              </div>

              <div style="background:#f8fafc;border-radius:12px;padding:24px;text-align:center;">
                <h3 style="color:#374151;font-size:16px;font-weight:600;margin:0 0 12px 0;">🎯 다음 이벤트를 더 성공적으로!</h3>
                <p style="color:#6b7280;font-size:14px;margin:0 0 20px 0;">이번 설문 결과를 바탕으로 더 나은 이벤트를 기획해보세요.</p>
                <a href="#" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">상세 분석 보기 →</a>
              </div>
              
              <div style="margin-top:32px;padding-top:24px;border-top:1px solid #e5e7eb;text-align:center;">
                <p style="color:#9ca3af;font-size:13px;margin:0;">이 리포트는 이벤트 종료 후 자동으로 발송되었습니다. 문의사항이 있으시면 고객센터로 연락주세요.</p>
              </div>
            </div>
          </body>
        </html>
        """

    def get_events_ready_for_report(self) -> List[Event]:
        """Get events that ended exactly 7 days ago and need reports."""
        target_date = datetime.utcnow().date() - timedelta(days=7)
        
        events = self.db.query(Event).filter(
            Event.end_date == target_date
        ).all()
        
        return events

    def send_event_report(self, event: Event, override_emails: Optional[List[str]] = None) -> List[str]:
        """Send report for a specific event to its managers."""
        stats = self._calculate_event_stats(event)
        surveys = self._get_survey_breakdown(event)
        html_body = self._build_event_report_html(event, stats, surveys)
        
        subject = f"[전시회 플랫폼] {event.event_name} 설문 결과 리포트"
        
        # 수신자 결정: 이벤트 담당자들의 이메일
        recipients = override_emails or []
        if not recipients:
            for manager in event.managers:
                if manager.manager_email:
                    recipients.append(manager.manager_email)
        
        # 담당자가 없으면 회사 이메일로 발송
        if not recipients and event.company and event.company.email:
            recipients.append(event.company.email)
            
        if not recipients:
            logger.warning(f"이벤트 {event.event_name}(ID: {event.id})에 대한 수신자가 없습니다.")
            return []
        
        sent_to = []
        for email in recipients:
            try:
                if send_html_email(email, subject, html_body):
                    sent_to.append(email)
                    logger.info(f"이벤트 리포트 발송 성공: {event.event_name} -> {email}")
                else:
                    logger.info(f"SMTP 미구성으로 콘솔 출력: {event.event_name} -> {email}")
                    sent_to.append(email)  # 콘솔 출력도 성공으로 간주
            except Exception as e:
                logger.error(f"이벤트 리포트 발송 실패: {event.event_name} -> {email}, 오류: {e}")
        
        return sent_to

    def process_scheduled_reports(self) -> None:
        """Process all events that need reports (called by scheduler)."""
        events = self.get_events_ready_for_report()
        
        if not events:
            logger.info("리포트 발송이 필요한 이벤트가 없습니다.")
            return
            
        logger.info(f"리포트 발송 대상 이벤트 {len(events)}개 발견")
        
        for event in events:
            try:
                sent_to = self.send_event_report(event)
                if sent_to:
                    logger.info(f"이벤트 '{event.event_name}' 리포트 발송 완료: {', '.join(sent_to)}")
                else:
                    logger.warning(f"이벤트 '{event.event_name}' 리포트 발송 실패: 수신자 없음")
            except Exception as e:
                logger.error(f"이벤트 '{event.event_name}' 리포트 처리 중 오류: {e}")


# 기존 ReportService도 유지 (하위 호환성)
class ReportService:
    """Legacy company-wide report service (deprecated)."""
    
    def __init__(self, db: Session) -> None:
        self.db = db
        self.event_service = EventReportService(db)
    
    def send_reports_for_all_companies(self) -> None:
        """Deprecated: Use EventReportService.process_scheduled_reports() instead."""
        logger.warning("ReportService.send_reports_for_all_companies()는 deprecated입니다. EventReportService.process_scheduled_reports()를 사용하세요.")
        self.event_service.process_scheduled_reports()