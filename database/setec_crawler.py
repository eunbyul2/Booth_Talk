import os
import csv
import re
import time
from urllib.parse import urljoin, urlencode

import requests
from bs4 import BeautifulSoup


# SETEC 도메인 & 리스트 URL
BASE_URL = "https://www.setec.or.kr"
LIST_PATH = "/front/schedule/list.do"
LIST_URL = urljoin(BASE_URL, LIST_PATH)

OUTPUT_CSV = "setec_exhibitions_2025_11_12.csv"
IMAGE_DIR = "setec_images"


def fetch_list_page(session, page_index: int, start_date: str, end_date: str):
    """
    한 페이지 HTML을 가져와 BeautifulSoup으로 반환.
    start_date / end_date 형식: 'YYYY-MM-DD'
    """
    params = {
        "sIdx": "2233",
        "pageIndex": page_index,
        "searchSDate": start_date,
        "searchEDate": end_date,
        "searchCondition": "0",  # 전체
        "searchKeyword": "",
    }

    url = f"{LIST_URL}?{urlencode(params)}"
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; SummitCrawler/1.0)",
    }

    resp = session.get(url, headers=headers, timeout=10)
    if resp.status_code != 200:
        print(f"[WARN] status={resp.status_code} url={url}")
        return None

    return BeautifulSoup(resp.text, "html.parser")


def parse_list_page(soup):
    container = soup.select_one("div.exhibit_list ul")
    if container is None:
        return []

    events = []
    for li in container.select("li"):
        a_tag = li.find("a", onclick=True)
        event_id = None
        if a_tag:
            onclick = a_tag.get("onclick", "")
            m = re.search(r"fn_view\('(\d+)'\)", onclick)
            if m:
                event_id = m.group(1)

        img_tag = li.select_one("div.img img")
        img_url = None
        img_alt = None
        if img_tag:
            src = img_tag.get("src", "").strip()
            if src:
                img_url = urljoin(BASE_URL, src)
            img_alt = img_tag.get("alt", "").strip()

        txt_div = li.select_one("div.txt")
        title = None
        period_raw = None
        start_date = None
        end_date = None
        location = None

        if txt_div:
            strong = txt_div.find("strong")
            if strong:
                title = strong.get_text(strip=True)

            info_lis = txt_div.select("ul li")
            for info_li in info_lis:
                text = info_li.get_text(strip=True)
                if text.startswith("기간"):
                    period_raw = text
                    if ":" in text:
                        _, period_part = text.split(":", 1)
                        period_part = period_part.strip()
                        if " ~ " in period_part:
                            s, e = period_part.split(" ~ ", 1)
                            start_date = s.strip()
                            end_date = e.strip()
                elif text.startswith("장소"):
                    if ":" in text:
                        _, loc_part = text.split(":", 1)
                        location = loc_part.strip()

        # 여기서 실제 행사인지 한 번 더 검증
        # 제목도 없고 기간도 없으면 "등록된 전시가 없습니다" 같은 안내문으로 간주하고 skip
        if not title and not start_date and not end_date:
            continue

        events.append({
            "event_id": event_id,
            "title": title,
            "img_url": img_url,
            "img_alt": img_alt,
            "period_raw": period_raw,
            "start_date": start_date,
            "end_date": end_date,
            "location": location,
        })

    return events

def download_image(session, img_url: str, save_path: str):
    """
    이미지 한 장 다운로드.
    """
    try:
        resp = session.get(img_url, stream=True, timeout=10)
        if resp.status_code == 200:
            with open(save_path, "wb") as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            return True
        else:
            print(f"[WARN] image status={resp.status_code} url={img_url}")
            return False
    except Exception as e:
        print(f"[ERROR] image download failed {img_url} -> {e}")
        return False


def crawl_setec(start_date: str, end_date: str, delay: float = 1.0):
    """
    지정 날짜 범위에 대해 전체 페이지 크롤링.
    """
    os.makedirs(IMAGE_DIR, exist_ok=True)

    all_events = []
    session = requests.Session()

    page_index = 1
    while True:
        print(f"\n=== pageIndex={page_index} ===")
        soup = fetch_list_page(session, page_index, start_date, end_date)
        if soup is None:
            break

        events = parse_list_page(soup)
        if not events:
            print("[INFO] 더 이상 행사가 없어서 종료")
            break

        print(f"[INFO] {len(events)}건 수집")

        # 이미지 다운로드 + 메타데이터 축적
        for ev in events:
            all_events.append(ev)

            if ev["img_url"]:
                # 파일명: event_id_제목일부.jpg
                safe_title = (ev["title"] or "no_title").replace("/", "_").replace("\\", "_").strip()
                if len(safe_title) > 30:
                    safe_title = safe_title[:30]

                filename = f"{ev['event_id'] or 'noid'}_{safe_title}.jpg"
                save_path = os.path.join(IMAGE_DIR, filename)

                if not os.path.exists(save_path):
                    print(f"  - 이미지 다운로드: {filename}")
                    download_image(session, ev["img_url"], save_path)
                    time.sleep(0.3)  # 이미지 요청 간 간격
                else:
                    print(f"  - 이미 존재: {filename}")

        page_index += 1
        time.sleep(delay)  # 페이지 요청 간 간격

    return all_events


def save_csv(events, filename: str):
    if not events:
        print("[INFO] 저장할 데이터가 없습니다.")
        return

    fieldnames = [
        "event_id",
        "title",
        "img_url",
        "img_alt",
        "period_raw",
        "start_date",
        "end_date",
        "location",
    ]

    with open(filename, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for ev in events:
            writer.writerow(ev)

    print(f"[INFO] 총 {len(events)}건을 '{filename}'에 저장했습니다.")


if __name__ == "__main__":
    # 여기서 날짜 범위만 바꿔주면 됨
    START_DATE = "2025-11-01"
    END_DATE = "2025-12-31"

    events = crawl_setec(START_DATE, END_DATE, delay=1.0)
    save_csv(events, OUTPUT_CSV)
    print(f"[DONE] 이미지 폴더: {IMAGE_DIR}, 메타데이터: {OUTPUT_CSV}")
