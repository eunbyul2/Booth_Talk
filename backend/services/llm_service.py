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
이 이미지는 전시회/이벤트 포스터입니다.
다음 정보를 정확하게 추출하여 JSON 형식으로 반환해주세요:

{
    "form_data": {
        "eventName": "이벤트/전시회 제목 (필수)",
        "boothNumber": "부스 번호 또는 위치 (있는 경우만, 없으면 빈 문자열)",
        "date": "날짜 (YYYY-MM-DD 형식으로 변환, 기간이면 시작일-종료일)",
        "time": "시간 (HH:MM-HH:MM 형식, 예: 10:00-18:00)",
        "description": "이벤트 상세 설명 (최대 200자, 주요 내용 요약)",
        "participationMethod": "참여 방법 (예: 현장 등록, 사전 신청, 자유 입장 등)",
        "benefits": "참여 혜택 (예: 무료 입장, 기념품 증정, 할인 등)"
    },
    "tags": [
        "주요 특징이나 키워드를 5-10개의 태그로",
        "예: 무료관람, 어린이환영, 체험가능, 사진촬영가능, 주차가능, 반려동물동반가능 등"
    ],
    "categories": [
        "이벤트 카테고리 (최대 3개)",
        "미술, 사진, 조각, 디자인, 공예, 패션, 건축, 미디어아트, 설치미술, 현대미술, 전통미술, 음악, 공연, 체험, 교육, 세미나, 박람회 등"
    ],
    "target_audience": [
        "대상 관람객 (최대 3개)",
        "전체, 성인, 어린이, 청소년, 가족, 전문가, 학생 등"
    ],
    "atmosphere": [
        "분위기/톤 (최대 3개)",
        "고급스러운, 캐주얼한, 활기찬, 조용한, 교육적인, 체험형, 인터랙티브 등"
    ]
}

중요 규칙:
1. 정보가 이미지에 없으면 빈 문자열 "" 또는 빈 배열 [] 사용
2. 날짜는 반드시 YYYY-MM-DD 형식으로 변환
3. 태그는 사용자가 검색할 때 유용한 키워드로 생성
4. 한국어로 작성
5. description은 매력적이고 간결하게 작성
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
        
        response = self.openai_client.chat.completions.create(
            model="gpt-4-vision-preview",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": image_url}
                        }
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
