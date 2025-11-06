"""Unsplash image helper integrated with OpenAI query generation."""

from __future__ import annotations

import logging
import os
from typing import Dict, List, Optional

import aiohttp
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

logger = logging.getLogger(__name__)


class UnsplashService:
    """Service encapsulating ChatGPT-powered Unsplash searching."""

    def __init__(self) -> None:
        self.access_key = os.getenv("UNSPLASH_ACCESS_KEY", "").strip()
        self.base_url = "https://api.unsplash.com"
        self._timeout = aiohttp.ClientTimeout(total=10)
        self._query_cache: Dict[str, str] = {}

        openai_key = os.getenv("OPENAI_API_KEY", "").strip()
        self._openai_client: Optional[OpenAI] = None
        if openai_key:
            try:
                self._openai_client = OpenAI(api_key=openai_key)
            except Exception as exc:  # noqa: BLE001
                logger.warning("OpenAI 클라이언트를 초기화하지 못했습니다: %s", exc)

    def _generate_search_query(
        self,
        event_name: str,
        description: str = "",
        tags: Optional[List[str]] = None,
    ) -> str:
        """Return an optimized Unsplash query using ChatGPT (cached)."""

        tags = tags or []
        cache_key = f"{event_name}:{description}:{','.join(sorted(tags))}"
        if cache_key in self._query_cache:
            return self._query_cache[cache_key]

        fallback_keywords = [kw for kw in [event_name.strip(), description.strip()] if kw]
        fallback_keywords.extend(tag.strip() for tag in tags if tag)
        fallback_query = " ".join(fallback_keywords).strip() or "exhibition event"

        if not self._openai_client:
            self._query_cache[cache_key] = fallback_query
            return fallback_query

        system_prompt = (
            "You are a professional image search assistant. Given an event's information, "
            "generate 2-4 professional English keywords for Unsplash image search. "
            "Return only the keywords, separated by spaces."
        )

        user_prompt = (
            "Event name: {event_name}\n"
            "Description: {description}\n"
            "Tags: {tags}\n"
        ).format(
            event_name=event_name or "",
            description=description or "",
            tags=", ".join(tags) if tags else "",
        )

        try:
            response = self._openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=60,
                temperature=0.3,
            )
            query = (response.choices[0].message.content or "").strip()
        except Exception as exc:  # noqa: BLE001
            logger.warning("ChatGPT 검색어 생성 실패, 기본값 사용: %s", exc)
            query = fallback_query

        if not query:
            query = fallback_query

        self._query_cache[cache_key] = query
        return query

    async def get_event_image(
        self,
        event_name: str,
        description: str = "",
        tags: Optional[List[str]] = None,
        orientation: str = "landscape",
    ) -> Optional[Dict[str, Optional[str]]]:
        """Search Unsplash for an event related image.

        Returns a dictionary containing the primary URLs when successful.
        """

        if not self.access_key:
            logger.warning("UNSPLASH_ACCESS_KEY가 설정되지 않아 자동 이미지를 건너뜁니다.")
            return None

        query = self._generate_search_query(event_name, description, tags or [])

        headers = {"Authorization": f"Client-ID {self.access_key}"}
        params = {
            "query": query,
            "per_page": 10,
            "orientation": orientation,
            "order_by": "relevant",
        }

        try:
            async with aiohttp.ClientSession(timeout=self._timeout) as session:
                async with session.get(
                    f"{self.base_url}/search/photos",
                    headers=headers,
                    params=params,
                ) as response:
                    if response.status != 200:
                        text = await response.text()
                        logger.warning(
                            "Unsplash 검색 실패 (%s): %s",
                            response.status,
                            text,
                        )
                        return None
                    payload = await response.json()

                results = payload.get("results", [])
                if not results:
                    logger.info("Unsplash 검색 결과가 없습니다 (query=%s)", query)
                    return None

                top = results[0]
                download_location = top.get("links", {}).get("download_location")
                if download_location:
                    await self._trigger_download(download_location, headers)

                urls = top.get("urls", {})
                user = top.get("user", {})
                return {
                    "query": query,
                    "description": top.get("description") or top.get("alt_description"),
                    "photographer": user.get("name"),
                    "photographer_profile": user.get("links", {}).get("html"),
                    "url_raw": urls.get("raw"),
                    "url_full": urls.get("full"),
                    "url_regular": urls.get("regular"),
                    "url_small": urls.get("small"),
                    "download_location": download_location,
                }
        except Exception as exc:  # noqa: BLE001
            logger.error("Unsplash 이미지 검색 중 오류: %s", exc)
            return None

    async def _trigger_download(self, download_location: str, headers: Dict[str, str]) -> None:
        """Comply with Unsplash API guidelines by hitting the download endpoint."""

        if not download_location:
            return

        try:
            async with aiohttp.ClientSession(timeout=self._timeout) as session:
                async with session.get(download_location, headers=headers) as response:
                    await response.read()  # 응답 본문 읽기로 요청 완료 처리
        except Exception as exc:  # noqa: BLE001
            logger.debug("Unsplash 다운로드 트리거 실패: %s", exc)


_unsplash_service: Optional[UnsplashService] = None


def get_unsplash_service() -> UnsplashService:
    """Return a singleton instance of :class:`UnsplashService`."""

    global _unsplash_service
    if _unsplash_service is None:
        _unsplash_service = UnsplashService()
    return _unsplash_service
