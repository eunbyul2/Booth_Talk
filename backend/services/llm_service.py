# services/llm_service.py
"""
LLM API 연동 서비스 - 이벤트 폼 자동 완성 + 태그 생성
"""

import os
from typing import Optional, Dict, Any, List
import openai
import anthropic
from dotenv import load_dotenv
import json

load_dotenv()


class LLMService:
    """LLM API 통합 서비스"""
    
    def __init__(self):
        self.openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.anthropic_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.default_provider = os.getenv("LLM_PROVIDER", "openai")
    
    
    async def analyze_and_fill_event_form(
        self, 
        image_url: str,
        provider: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        이벤트 이미지 분석 → 폼 자동 완성 + 태그 생성
        
        Args:
            image_url: 분석할 이미지 URL (포스터, 전단지 등)
            provider: LLM 제공자 (openai/anthropic)
            
        Returns:
            dict: {
                "form_data": {
                    "eventName": "이벤트 제목",
                    "boothNumber": "부스 번호",
                    "date": "날짜",
                    "time": "시간",
                    "description": "설명",
                    "participationMethod": "참여 방법",
                    "benefits": "혜택"
                },
                "tags": ["태그1", "태그2", ...],
                "categories": ["카테고리1", "카테고리2"],
                "confidence": 0.95
            }
        """
        provider = provider or self.default_provider
        
        prompt = """
이 이미지를 분석하여 이벤트/전시회/박람회 정보를 추출해주세요.
이벤트 유형에 관계없이 아래 JSON 형식으로 정확하게 반환해주세요.

🎯 분석 가이드:
1. 이벤트 유형을 먼저 파악하세요 (전시회/박람회/컨퍼런스/세미나/공연/체험행사 등)
2. 각 유형에 맞는 정보를 추출하세요
3. 한국어와 영어가 혼재되어 있어도 모두 인식하세요
4. 날짜/시간은 반드시 표준 형식으로 변환하세요

📅 날짜 변환 규칙:
- 모든 날짜 → YYYY-MM-DD 형식
- 예: "12월 15일" → startDate: "2024-12-15", endDate: "2024-12-15"
- 기간: "12/15-12/17" → startDate: "2024-12-15", endDate: "2024-12-17"
- 단일 날짜인 경우 시작과 종료 날짜를 동일하게 설정

🕒 시간 변환 규칙:
- 24시간 형식으로 통일: "오후 2시" → startTime: "14:00", endTime: ""
- 범위: "오전 9시-오후 6시" → startTime: "09:00", endTime: "18:00"
- AM/PM 처리: "9 AM - 6 PM" → startTime: "09:00", endTime: "18:00"
- 단일 시간인 경우 endTime은 빈 문자열
- 다양한 형식 지원:
  * "AM 9:00 ~ PM 6:00" → startTime: "09:00", endTime: "18:00"
  * "9am-6pm" → startTime: "09:00", endTime: "18:00"
  * "오전 10시 30분 - 오후 5시" → startTime: "10:30", endTime: "17:00"
  * "Morning 9:30" → startTime: "09:30", endTime: ""

📍 장소 추출 가이드:
- location: 메인 장소명 (코엑스, 킨텍스, 서울역 등)
- venue: 세부 위치 (1층 A홀, 컨퍼런스룸, 야외무대 등)
- boothNumber: 부스/좌석 번호

🏷️ 스마트 태그 생성:
이벤트 유형과 내용을 분석하여 검색에 유용한 태그를 자동 생성하세요.
- 전시회: "작품감상", "사진촬영가능", "도록판매"
- 박람회: "체험가능", "상담가능", "신제품"
- 컨퍼런스: "전문가강연", "네트워킹", "자료제공"
- 공연: "좌석예약", "드레스코드", "공연시간"
- 체험행사: "참여형", "가족환영", "재료제공"

{
    "form_data": {
        "eventName": "정확한 이벤트명",
        "boothNumber": "부스번호",
        "location": "도시/지역명", 
        "venue": "상세 장소명",
        "startDate": "YYYY-MM-DD (시작 날짜)",
        "endDate": "YYYY-MM-DD (종료 날짜, 단일 날짜인 경우 시작 날짜와 동일)",
        "startTime": "HH:MM (시작 시간, 24시간제)",
        "endTime": "HH:MM (종료 시간, 24시간제)",
        "description": "이벤트 핵심 내용 (150자 이내)",
        "participationMethod": "참여 방법",
        "benefits": "혜택/제공사항"
    },
    "tags": [
        "이벤트 유형과 특성에 맞는 검색용 태그 5-8개"
    ],
    "categories": [
        "이벤트 카테고리 1-3개 (자동 분류)"
    ],
    "target_audience": [
        "대상 관람객"
    ],
    "atmosphere": [
        "이벤트 분위기"
    ]
}

⚠️ 중요: 이미지에 없는 정보는 빈 문자열 ""로 처리하세요.
"""
        
        if provider == "openai":
            result = await self._analyze_with_openai(image_url, prompt)
        else:
            result = await self._analyze_with_claude(image_url, prompt)
        
        # 신뢰도 추가 (LLM 응답의 완성도 평가)
        result["confidence"] = self._calculate_confidence(result.get("form_data", {}))
        
        return result
    
    
    async def _analyze_with_openai(self, image_url: str, prompt: str) -> Dict[str, Any]:
        """OpenAI GPT-4 Vision으로 이미지 분석"""
        
        # 로컬 파일인지 URL인지 확인
        if image_url.startswith(("http://", "https://")):
            # URL인 경우
            image_input = {
                "type": "image_url",
                "image_url": {"url": image_url}
            }
        else:
            # 로컬 파일인 경우 base64로 인코딩
            import base64
            
            try:
                with open(image_url, "rb") as image_file:
                    image_data = image_file.read()
                    image_base64 = base64.b64encode(image_data).decode()
                    
                # 파일 확장자로 MIME 타입 결정
                import mimetypes
                mime_type, _ = mimetypes.guess_type(image_url)
                if not mime_type or not mime_type.startswith('image/'):
                    mime_type = 'image/jpeg'  # 기본값
                
                image_input = {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{mime_type};base64,{image_base64}"
                    }
                }
            except Exception as e:
                raise ValueError(f"이미지 파일을 읽을 수 없습니다: {e}")
        
        response = self.openai_client.chat.completions.create(
            model="gpt-4o",  # 최신 GPT-4o 모델 사용
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        image_input
                    ]
                }
            ],
            max_tokens=1500,
            temperature=0.2  # 정확성을 위해 낮게 설정
        )
        
        result_text = response.choices[0].message.content
        
        # JSON 파싱
        try:
            if "```json" in result_text:
                json_str = result_text.split("```json")[1].split("```")[0].strip()
            else:
                json_str = result_text
            
            result = json.loads(json_str)
            return result
        except Exception as e:
            print(f"JSON 파싱 오류: {e}")
            return {
                "form_data": {},
                "tags": [],
                "categories": [],
                "error": str(e),
                "raw_response": result_text
            }
    
    
    async def _analyze_with_claude(self, image_url: str, prompt: str) -> Dict[str, Any]:
        """Anthropic Claude Vision으로 이미지 분석"""
        
        import requests
        import base64
        
        # 이미지를 base64로 변환
        image_data = requests.get(image_url).content
        image_base64 = base64.b64encode(image_data).decode()
        
        message = self.anthropic_client.messages.create(
            model="claude-3-opus-20240229",
            max_tokens=1500,
            temperature=0.2,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": image_base64,
                            },
                        },
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ],
                }
            ],
        )
        
        result_text = message.content[0].text
        
        # JSON 파싱
        try:
            if "```json" in result_text:
                json_str = result_text.split("```json")[1].split("```")[0].strip()
            else:
                json_str = result_text
            
            result = json.loads(json_str)
            return result
        except Exception as e:
            print(f"JSON 파싱 오류: {e}")
            return {
                "form_data": {},
                "tags": [],
                "categories": [],
                "error": str(e),
                "raw_response": result_text
            }
    
    
    def _calculate_confidence(self, form_data: Dict) -> float:
        """
        폼 데이터의 완성도 평가 (0.0 ~ 1.0)
        """
        required_fields = ["eventName", "date", "description"]
        optional_fields = ["boothNumber", "time", "participationMethod", "benefits"]
        
        filled_required = sum(1 for field in required_fields if form_data.get(field))
        filled_optional = sum(1 for field in optional_fields if form_data.get(field))
        
        # 필수 필드 80%, 선택 필드 20%
        required_score = (filled_required / len(required_fields)) * 0.8
        optional_score = (filled_optional / len(optional_fields)) * 0.2
        
        return round(required_score + optional_score, 2)
    
    
    async def enhance_description(
        self,
        original_description: str,
        event_name: str,
        provider: Optional[str] = None
    ) -> str:
        """
        이벤트 설명 개선 (사용자가 수동 입력한 경우)
        
        Args:
            original_description: 원본 설명
            event_name: 이벤트 이름
            provider: LLM 제공자
            
        Returns:
            str: 개선된 설명
        """
        provider = provider or self.default_provider
        
        prompt = f"""
다음 이벤트 설명을 더 매력적이고 전문적으로 개선해주세요:

이벤트명: {event_name}
현재 설명: {original_description}

요구사항:
- 2-3문단, 150-200자
- 방문객에게 흥미 유발
- 전문적이면서 친근한 톤
- 핵심 내용 강조
"""
        
        if provider == "openai":
            response = self.openai_client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500,
                temperature=0.7
            )
            return response.choices[0].message.content
        else:
            message = self.anthropic_client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=500,
                temperature=0.7,
                messages=[{"role": "user", "content": prompt}]
            )
            return message.content[0].text
    
    
    async def generate_additional_tags(
        self,
        form_data: Dict[str, str],
        existing_tags: List[str],
        provider: Optional[str] = None
    ) -> List[str]:
        """
        폼 데이터를 기반으로 추가 태그 생성
        
        Args:
            form_data: 이벤트 폼 데이터
            existing_tags: 기존 태그 목록
            provider: LLM 제공자
            
        Returns:
            list: 추가 태그 (중복 제거)
        """
        provider = provider or self.default_provider
        
        prompt = f"""
다음 이벤트 정보를 바탕으로 검색과 필터링에 유용한 태그를 5-10개 생성해주세요:

이벤트명: {form_data.get('eventName', '')}
설명: {form_data.get('description', '')}
참여 방법: {form_data.get('participationMethod', '')}
혜택: {form_data.get('benefits', '')}

기존 태그: {', '.join(existing_tags)}

새로운 태그는 다음과 같은 형식으로:
- 특징: 무료관람, 사전예약필수, 현장등록가능
- 편의: 주차가능, 대중교통접근성, 휠체어접근가능
- 대상: 어린이환영, 가족단위, 전문가추천
- 체험: 사진촬영가능, 체험프로그램, 인터랙티브
- 분위기: 조용한분위기, 활기찬, 교육적인

JSON 배열로만 반환: ["태그1", "태그2", ...]
"""
        
        if provider == "openai":
            response = self.openai_client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=300,
                temperature=0.5
            )
            result_text = response.choices[0].message.content
        else:
            message = self.anthropic_client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=300,
                temperature=0.5,
                messages=[{"role": "user", "content": prompt}]
            )
            result_text = message.content[0].text
        
        # JSON 파싱
        try:
            if "```json" in result_text:
                json_str = result_text.split("```json")[1].split("```")[0].strip()
            elif "[" in result_text:
                # 배열 부분만 추출
                json_str = result_text[result_text.find("["):result_text.rfind("]")+1]
            else:
                json_str = result_text
            
            new_tags = json.loads(json_str)
            
            # 기존 태그와 중복 제거
            unique_tags = [tag for tag in new_tags if tag not in existing_tags]
            
            return unique_tags[:10]  # 최대 10개
        except:
            return []


# 싱글톤 인스턴스
llm_service = LLMService()
