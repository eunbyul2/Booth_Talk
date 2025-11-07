"""
Backfill Unsplash images for existing events

이 스크립트는 기존에 생성된 이벤트 중 이미지가 없는 것들에 대해
Unsplash API를 사용하여 자동으로 이미지를 생성합니다.

실행 방법:
    cd backend
    source .venv/bin/activate
    python backfill_unsplash_images.py
"""

import asyncio
import os
import sys
from sqlalchemy.orm import Session

# 현재 디렉토리를 Python 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import get_db
from models.event import Event
from services.unsplash_service import get_unsplash_service


async def backfill_unsplash_images():
    """기존 이벤트에 Unsplash 이미지 생성"""

    print("=" * 60)
    print("🖼️  Unsplash 이미지 자동 생성 (기존 이벤트 백필)")
    print("=" * 60)
    print()

    # 데이터베이스 세션 생성
    db: Session = next(get_db())

    try:
        # 이미지가 없는 이벤트 찾기
        events_without_image = db.query(Event).filter(
            Event.unsplash_image_url == None,
            Event.has_custom_image == False
        ).all()

        total = len(events_without_image)

        if total == 0:
            print("✅ 모든 이벤트에 이미 이미지가 있습니다!")
            return

        print(f"📊 이미지 없는 이벤트: {total}개")
        print()

        # Unsplash 서비스 초기화
        unsplash_service = get_unsplash_service()

        success_count = 0
        fail_count = 0

        # 각 이벤트에 대해 이미지 생성
        for idx, event in enumerate(events_without_image, 1):
            print(f"[{idx}/{total}] 처리 중: {event.event_name} (ID: {event.id})")

            try:
                # 태그 추출 (JSON 배열)
                tags = event.categories if event.categories else []

                # Unsplash 이미지 검색
                image_data = await unsplash_service.get_event_image(
                    event_name=event.event_name,
                    description=event.description or "",
                    tags=tags,
                    orientation="landscape"
                )

                if image_data and image_data.get("url_regular"):
                    # 이미지 URL 저장
                    event.unsplash_image_url = image_data["url_regular"]
                    db.commit()

                    print(f"  ✅ 성공: {image_data['url_regular'][:60]}...")
                    print(f"     📷 사진작가: {image_data.get('photographer', 'Unknown')}")
                    success_count += 1
                else:
                    print(f"  ⚠️  이미지를 찾을 수 없습니다")
                    fail_count += 1

            except Exception as e:
                print(f"  ❌ 오류: {str(e)}")
                fail_count += 1

            print()

            # API Rate Limit 고려 (1초 대기)
            if idx < total:
                await asyncio.sleep(1)

        # 결과 출력
        print("=" * 60)
        print("📊 백필 완료")
        print("=" * 60)
        print(f"✅ 성공: {success_count}개")
        print(f"❌ 실패: {fail_count}개")
        print(f"📝 전체: {total}개")
        print()

        if success_count > 0:
            print("🎉 이제 /visitor 페이지에서 이미지를 확인할 수 있습니다!")

    except Exception as e:
        print(f"❌ 치명적 오류: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    # 필수 환경 변수 확인
    if not os.getenv("UNSPLASH_ACCESS_KEY"):
        print("❌ UNSPLASH_ACCESS_KEY 환경 변수가 설정되지 않았습니다!")
        print("   .env 파일에 UNSPLASH_ACCESS_KEY를 추가하세요.")
        sys.exit(1)

    if not os.getenv("OPENAI_API_KEY"):
        print("❌ OPENAI_API_KEY 환경 변수가 설정되지 않았습니다!")
        print("   .env 파일에 OPENAI_API_KEY를 추가하세요.")
        sys.exit(1)

    # 비동기 실행
    asyncio.run(backfill_unsplash_images())
