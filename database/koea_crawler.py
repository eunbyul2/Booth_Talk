import requests
from bs4 import BeautifulSoup
from urllib.parse import urlencode
import time
import csv

BASE_URL = "https://www.keoa.org/directory/schedule?mod=list"  # 실제 도메인


def fetch_schedule_page(year: int, month: int, page: int):
    """
    특정 연도/월/페이지의 HTML을 가져온 뒤 BeautifulSoup 객체를 반환.
    """
    params = {
        "cur_y": year,
        "cur_m": month,
        "mod": "list",
        "pg": page,
    }
    url = f"{BASE_URL}?{urlencode(params)}"
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; ExpoCrawler/1.0; +https://example.com)"
    }

    resp = requests.get(url, headers=headers, timeout=10)
    if resp.status_code != 200:
        return None  # 페이지 없음 또는 에러로 간주

    return BeautifulSoup(resp.text, "html.parser")


def parse_events_from_soup(soup, year: int, month: int, page: int):
    """
    한 페이지의 soup에서 행사 리스트를 파싱해서 리스트[dict]로 반환.
    """
    table = soup.select_one("table.board-list tbody")
    if table is None:
        return []

    events = []
    rows = table.select("tr")
    for row in rows:
        cols = row.find_all("td")
        if len(cols) < 5:
            continue  # 구조가 안 맞으면 스킵

        # 번호
        no = cols[0].get_text(strip=True)

        # 전시회명 + data-value
        subject_td = cols[1]
        a_tag = subject_td.find("a")
        if a_tag:
            title = a_tag.get_text(strip=True)
            expo_id = a_tag.get("data-value", "").strip()
        else:
            title = subject_td.get_text(strip=True)
            expo_id = ""

        # 주최
        organizer = cols[2].get_text(strip=True)

        # 개최기간
        period_text = cols[3].get_text(strip=True)
        start_date, end_date = None, None
        if " ~ " in period_text:
            parts = period_text.split(" ~ ")
            if len(parts) == 2:
                start_date = parts[0].strip()
                end_date = parts[1].strip()

        # 개최장소
        venue = cols[4].get_text(strip=True)

        events.append({
            "year": year,
            "month": month,
            "page": page,
            "no": no,
            "expo_id": expo_id,
            "title": title,
            "organizer": organizer,
            "period_raw": period_text,
            "start_date": start_date,
            "end_date": end_date,
            "venue": venue,
        })

    return events


def crawl_year(year: int, start_month: int = 1, end_month: int = 12, delay: float = 1.0):
    """
    특정 연도에 대해 start_month ~ end_month까지
    각 월의 모든 페이지를 순회하면서 데이터를 수집.
    """
    all_events = []

    for month in range(start_month, end_month + 1):
        page = 1
        while True:
            soup = fetch_schedule_page(year, month, page)
            if soup is None:
                # HTTP 에러나 페이지 없음 → 해당 월의 크롤링 종료
                break

            events = parse_events_from_soup(soup, year, month, page)
            if not events:
                # 더 이상 데이터가 없으면 이 월은 종료
                break

            all_events.extend(events)
            print(f"[{year}-{month:02d}] page {page} → {len(events)}건 수집")

            page += 1
            time.sleep(delay)  # 서버에 부담 덜 주기 위한 딜레이

    return all_events


def save_to_csv(events, filename: str):
    """
    수집한 행사 데이터를 CSV로 저장.
    """
    if not events:
        print("저장할 데이터가 없습니다.")
        return

    fieldnames = [
        "year", "month", "page", "no",
        "expo_id", "title", "organizer",
        "period_raw", "start_date", "end_date",
        "venue",
    ]

    with open(filename, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for e in events:
            writer.writerow(e)

    print(f"총 {len(events)}건을 '{filename}' 파일로 저장했습니다.")


if __name__ == "__main__":
    # 2025-10 ~ 2026-06까지 (연도/월 범위 생성)
    year_month_list = []

    # 2025년 10, 11, 12월
    for m in range(10, 13):
        year_month_list.append((2025, m))

    for year, month in year_month_list:
        print(f"\n=== {year}-{month:02d} 크롤링 시작 ===")
        events = crawl_one_month(year, month, delay=0.5)
        filename = f"expo_schedule_{year}_{month:02d}.csv"
        save_to_csv(events, filename)