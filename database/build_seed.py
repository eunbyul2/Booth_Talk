import copy
import csv
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path(__file__).resolve().parent
SETEC_CSV = ROOT / "setec_exhibitions_2025_11_12.csv"
EXPO_CSV = ROOT / "expo_schedule_2025.csv"
SEED_SQL = ROOT / "seed.sql"

PASSWORD_HASH = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7eJR0ZCWE6"


def normalize(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        key.lstrip("\ufeff"): (value.strip() if isinstance(value, str) else value)
        for key, value in row.items()
    }


def sql_value(value: Any) -> str:
    if value is None or value == "":
        return "NULL"
    return "'{}'".format(str(value).replace("'", "''"))


def json_literal(value: Any) -> str:
    return "'{}'::JSONB".format(json.dumps(value, ensure_ascii=False).replace("'", "''"))


def bool_literal(value: bool) -> str:
    return "TRUE" if value else "FALSE"


def is_placeholder_url(url: Any) -> bool:
    if not url or not isinstance(url, str):
        return False
    lowered = url.lower()
    return "placeholder.com" in lowered or "placehold.co" in lowered


def default_has_custom_image(event: Dict[str, Any]) -> bool:
    if "has_custom_image" in event:
        return bool(event["has_custom_image"])
    image_url = event.get("image_url")
    return bool(image_url) and not is_placeholder_url(image_url)


def company_ref(name: str) -> str:
    return "(SELECT id FROM companies WHERE company_name = '{}')".format(
        name.replace("'", "''")
    )


def load_setec() -> List[Dict[str, Any]]:
    with SETEC_CSV.open(encoding="utf-8") as f:
        return [normalize(row) for row in csv.DictReader(f)]


def load_expo() -> List[Dict[str, Any]]:
    with EXPO_CSV.open(encoding="utf-8") as f:
        return [normalize(row) for row in csv.DictReader(f)]


VENUES: List[Dict[str, str]] = [
    {
        "name": "코엑스",
        "location": "서울",
        "address": "서울특별시 강남구 영동대로 513",
        "description": "국내 최대 규모의 복합 전시·컨벤션 센터",
        "website": "https://www.coexcenter.com",
    },
    {
        "name": "킨텍스",
        "location": "경기",
        "address": "경기도 고양시 일산서구 킨텍스로 217-60",
        "description": "대한민국 대표 국제 전시장",
        "website": "https://www.kintex.com",
    },
    {
        "name": "벡스코",
        "location": "부산",
        "address": "부산광역시 해운대구 APEC로 55",
        "description": "국제회의와 대형 박람회가 열리는 복합 전시장",
        "website": "https://www.bexco.co.kr",
    },
    {
        "name": "DDP",
        "location": "서울",
        "address": "서울특별시 중구 을지로 281",
        "description": "디자인과 패션, IT 행사가 열리는 복합 문화 공간",
        "website": "https://ddp.or.kr",
    },
    {
        "name": "수원컨벤션센터",
        "location": "경기",
        "address": "경기도 수원시 영통구 광교중앙로 140",
        "description": "경기 남부 대표 컨벤션센터",
        "website": "https://www.suwonconvention.co.kr",
    },
    {
        "name": "수원메쎄",
        "location": "경기",
        "address": "경기도 수원시 영통구 센트럴타운로 22",
        "description": "경기도 수원시 전시 전용 공간",
        "website": "https://www.suwonmesse.com",
    },
    {
        "name": "세텍",
        "location": "서울",
        "address": "서울특별시 강남구 남부순환로 3104",
        "description": "서울 종합 전시장",
        "website": "https://www.setec.or.kr",
    },
    {
        "name": "코엑스 마곡",
        "location": "서울",
        "address": "서울특별시 강서구 마곡중앙로 161-17",
        "description": "코엑스가 운영하는 마곡 전시장",
        "website": "https://www.coexcenter.com/magok",
    },
    {
        "name": "경주화백컨벤션센터",
        "location": "경북",
        "address": "경상북도 경주시 보문로 182",
        "description": "경주 대표 컨벤션센터",
        "website": "https://www.hico.or.kr",
    },
    {
        "name": "김대중컨벤션센터",
        "location": "광주",
        "address": "광주광역시 서구 상무누리로 30",
        "description": "광주광역시 대표 전시 컨벤션센터",
        "website": "https://www.kdjcenter.or.kr",
    },
    {
        "name": "엑스코",
        "location": "대구",
        "address": "대구광역시 북구 엑스코로 10",
        "description": "대구 대표 전시 컨벤션센터",
        "website": "https://www.exco.co.kr",
    },
]


COMPANIES: List[Dict[str, str]] = [
    {
        "company_name": "코엑스 프로모션팀",
        "username": "coex_promo",
        "business_number": "111-22-30001",
        "email": "promo@coexcenter.com",
        "phone": "02-6000-1000",
        "address": "서울특별시 강남구 영동대로 513",
        "website_url": "https://www.coexcenter.com",
    },
    {
        "company_name": "메쎄이상 이벤트팀",
        "username": "messe_events",
        "business_number": "112-33-40002",
        "email": "events@messeesang.com",
        "phone": "02-6000-2000",
        "address": "서울특별시 강남구 테헤란로 306",
        "website_url": "https://www.messeesang.com",
    },
    {
        "company_name": "서울전람 체험존",
        "username": "seoulshow_experience",
        "business_number": "113-44-50003",
        "email": "experience@megashow.co.kr",
        "phone": "02-6677-3477",
        "address": "서울특별시 강남구 영동대로 85",
        "website_url": "https://www.megashow.co.kr",
    },
    {
        "company_name": "엑스포럼 커피랩",
        "username": "expoforum_lab",
        "business_number": "114-55-60004",
        "email": "coffee@cafeshow.com",
        "phone": "02-6000-6720",
        "address": "서울특별시 강남구 봉은사로 524",
        "website_url": "https://kor.cafeshow.com",
    },
    {
        "company_name": "한국이앤엑스 체험부스",
        "username": "koreaenex_demo",
        "business_number": "115-66-70005",
        "email": "demo@koreaenex.co.kr",
        "phone": "02-6000-1108",
        "address": "서울특별시 강남구 테헤란로 100",
        "website_url": "https://koreaenex.co.kr",
    },
    {
        "company_name": "지역특산홍보관",
        "username": "local_flavors",
        "business_number": "116-77-80006",
        "email": "info@localfair.kr",
        "phone": "031-123-4567",
        "address": "경기도 수원시 팔달구 정조로 123",
        "website_url": "https://localfair.kr",
    },
    {
        "company_name": "캣케어 스튜디오",
        "username": "catcare_studio",
        "business_number": "117-88-90007",
        "email": "hello@catcarestudio.kr",
        "phone": "051-600-2025",
        "address": "부산광역시 해운대구 센텀중앙로 55",
        "website_url": "https://catcarestudio.kr",
    },
    {
        "company_name": "트래블쇼 운영사무국",
        "username": "travelshow_ops",
        "business_number": "201-11-90008",
        "email": "partner@travelshow.co.kr",
        "phone": "02-6677-3480",
        "address": "서울특별시 송파구 올림픽로 35",
        "website_url": "https://www.travelshow.co.kr",
    },
    {
        "company_name": "디자인하우스 스튜디오",
        "username": "designhouse_studio",
        "business_number": "202-22-91009",
        "email": "studio@design.co.kr",
        "phone": "02-2262-7204",
        "address": "서울특별시 중구 장충단로 8길 27",
        "website_url": "https://www.design.co.kr",
    },
    {
        "company_name": "메가쇼 주최사",
        "username": "megashow_org",
        "business_number": "203-33-92010",
        "email": "organizer@megashow.co.kr",
        "phone": "02-6677-3300",
        "address": "경기도 고양시 일산서구 킨텍스로 217-60",
        "website_url": "https://www.megashow.co.kr",
    },
    {
        "company_name": "한국막걸리협회 홍보팀",
        "username": "makgeolli_pr",
        "business_number": "204-44-93011",
        "email": "pr@makgeolli.or.kr",
        "phone": "053-718-1203",
        "address": "대구광역시 북구 엑스코로 10",
        "website_url": "https://makgeolli.or.kr",
    },
    {
        "company_name": "K-소프트웨이브 조직위",
        "username": "softwave_org",
        "business_number": "205-55-94012",
        "email": "info@k-softwave.com",
        "phone": "02-2168-9300",
        "address": "서울특별시 영등포구 여의도동 2-38",
        "website_url": "https://www.k-softwave.com",
    },
    {
        "company_name": "오씨메이커스",
        "username": "ocmakers",
        "business_number": "206-66-95013",
        "email": "hello@ocmakers.co.kr",
        "phone": "051-717-9901",
        "address": "부산광역시 해운대구 센텀동로 45",
        "website_url": "https://www.ocmakers.co.kr",
    },
    {
        "company_name": "하우징테크연구소",
        "username": "housingtech_lab",
        "business_number": "207-77-96014",
        "email": "lab@housingtech.kr",
        "phone": "062-600-7701",
        "address": "광주광역시 서구 상무누리로 30",
        "website_url": "https://housingtech.kr",
    },
    {
        "company_name": "제일좋은전람 운영팀",
        "username": "jeilshow_ops",
        "business_number": "208-88-97015",
        "email": "ops@jeilshow.co.kr",
        "phone": "070-5089-2600",
        "address": "광주광역시 서구 무진대로 904",
        "website_url": "https://www.jeilshow.co.kr",
    },
    {
        "company_name": "하이록스 코리아",
        "username": "hyrox_korea",
        "business_number": "209-99-98016",
        "email": "info@hyrox.kr",
        "phone": "070-7731-2300",
        "address": "서울특별시 강남구 테헤란로 501",
        "website_url": "https://www.hyrox.com",
    },
    {
        "company_name": "웨덱스 웨딩 서비스",
        "username": "weddex_service",
        "business_number": "210-10-99017",
        "email": "contact@weddex.com",
        "phone": "02-516-1279",
        "address": "서울특별시 강남구 논현로 150길 12",
        "website_url": "https://www.weddex.com",
    },
    {
        "company_name": "강남장애인복지관 문화사업팀",
        "username": "gangnam_culture",
        "business_number": "211-11-00018",
        "email": "culture@gnwelfare.or.kr",
        "phone": "02-445-8006",
        "address": "서울특별시 강남구 자곡로 121",
        "website_url": "https://www.gangnam.go.kr/office/activeart/main.do",
    },
    {
        "company_name": "코코스유학 컨설팅",
        "username": "kokos_consult",
        "business_number": "212-12-01019",
        "email": "consult@kokos.co.kr",
        "phone": "02-566-1178",
        "address": "서울특별시 강남구 강남대로 390",
        "website_url": "https://kokosfair.com",
    },
]


COEX_ROWS_RAW = [
    ("Pop-up/Event", None, None, "제2회 고메잇 강남", "Gourmet Eat Gangnam #2", "2025-11-04", "2025-11-16", "코엑스 광장", None, "주최 l 강남구청, CMC / 주관 l 코엑스, 퀸즈스마일", None, "담당자명 : Tel. 070-7734-7796", None, None, "https://www.instagram.com/gourmet_eat_gangnam/", None),
    ("Exhibition", "주최 전시", "기타", "2025 코베 베이비페어 (하반기)", "2025 COBE Baby Fair", "2025-11-06", "2025-11-09", "Hall A", "10,000원 (사전등록 시 무료입장)", "코엑스, 메쎄이상", None, "담당자명 : 윤상필 / 연락처 : 02-6121-6458 / 이메일 : cobe@esgroup.net", None, None, "https://cobe.co.kr/__coex.php", None),
    ("Exhibition", "일반 전시", "관광/오락", "트래블쇼 2025", "Travel Show 2025", "2025-11-07", "2025-11-09", "Hall D", "10,000원", "서울전람(주), 메가쇼", None, "담당자명 : 임세희 / 연락처 : 02-6677-3477 / 팩스 : 02-6677-0477 / 이메일 : travelshow@megashow.co.kr", None, None, "https://www.travelshow.co.kr", None),
    ("Exhibition", "일반 전시", "의료/건강/스포츠", "하이록스 서울", "HYROX Seoul", "2025-11-08", "2025-11-09", "Hall C", "22,000원", "하이록스 코리아 유한회사", "하이록스 코리아 유한회사", "담당자명 : 김희우 / 이메일 : heewoo@hyrox.kr", None, None, "http://hyroxsouthkorea.com", None),
    ("Convention", "국내 회의", "의료/건강/스포츠", "제398회 웨덱스 웨딩박람회", "WEDDEX WEDDING FAIR", "2025-11-08", "2025-11-09", "코엑스 3층 317~318호", "무료(예비 신랑&신부 한함)", "㈜웨덱스웨딩", "㈜웨덱스웨딩", "연락처 : 02-516-1279 / 팩스 : 02-516-1081", None, None, "https://www.weddex.com/html/weddinghall/index_weddingfair.php", None),
    ("Pop-up/Event", "국내 회의", "의료/건강/스포츠", "2025년 제2회 아트프리즘 아트페어", None, "2025-11-09", "2025-11-13", "컨퍼런스룸(남) 3F, 로비", "무료", "강남장애인복지관", "㈜웨덱스웨딩", "담당자명 : 강남장애인복지관  Tel: 02-445-8006", None, None, "https://www.gangnam.go.kr/office/activeart/main.do", None),
    ("Exhibition", "일반 전시", "기타", "2025 적십자 바자", "2025 Red Cross Bazaar", "2025-11-10", "2025-11-10", "Hall B1", "무료", "대한적십자사 여성봉사특별자문위원회", "대한적십자사", "담당자명 : 심주연 / 연락처 : 02-3705-3621 / 팩스 : 02-3705-3777 / 이메일 : rcac@redcross.or.kr", None, None, None, None),
    ("Exhibition", "주최 전시", "전기/전자/IT", "2025 AI서밋서울앤엑스포", "AI Summit Seoul & Expo", "2025-11-10", "2025-11-11", "Hall B2, 그랜드볼룸", "20,000원", "코엑스, DMK 글로벌, 한국무역협회", None, "담당자명 : AI 서밋서울앤엑스포 사무국 / 연락처 : 02-6000-1108/8197/8148 / 팩스 : 02-6944-8304 / 이메일 : AISE@coex.co.kr", None, None, "https://www.aisummit.co.kr/", None),
    ("Exhibition", "일반 전시", "예술/디자인", "2025 서울디자인페스티벌", "Seoul Design Festival 2025", "2025-11-12", "2025-11-16", "Hall C", "15,000원", "디자인하우스", "월간 디자인", "담당자명 : 서울디자인페스티벌 사무국  / 연락처 : 02-2262-7204 / 이메일 : sdf@design.co.kr", None, None, "https://seoul.designfestival.co.kr/main", None),
    ("Exhibition", "일반 전시", "예술/디자인", "디자인코리아 2025", "DESIGNKOREA 2025", "2025-11-12", "2025-11-16", "Hall D", "12,000원", "산업통상자원부", "한국디자인진흥원", "담당자명 : 강희경 / 연락처 : 031-780-2102 / 이메일 : designkorea@kidp.or.kr", None, None, "https://designkorea.kidp.or.kr/", None),
    ("Exhibition", "일반 전시", "교육/출판", "제56회서울국제유아교육전·키즈페어", "56th EDUCARE&KIDSFAIR", "2025-11-13", "2025-11-16", "Hall A, Hall B1", "10,000원", "(주)세계전람", None, "담당자명 : 이민주 / 연락처 : 02-3453-8887 / 팩스 : 02-3453-4445 / 이메일 : segefairs@gmail.com", None, None, "https://www.educare.co.kr/", None),
    ("Exhibition", "일반 전시", "예술/디자인", "한국퀼트페스티벌", "Quilt Festival in Korea", "2025-11-13", "2025-11-16", "Hall B2", "10,000원", "(주)한국퀼트페스티벌", "(주)한국퀼트페스티벌", "담당자명 : 오세욱 / 연락처 : 010-4820-4665 / 이메일 : quiltfik@naver.com", None, None, "https://www.qfik.online/", None),
    ("Convention", "국제 회의", "예술/디자인", "제51회 필리핀유학박람회", "2025 PROMO UHAK FAIR", "2025-11-15", "2025-11-15", "컨퍼런스룸 327호", None, "주식회사 엠버시유학 (필리핀사업부: 필자닷컴)", "주식회사 엠버시유학 (필리핀사업부: 필자닷컴)", "연락처 : 02-3482-0542", None, None, "http://www.promouhakfair.com/phil/index.php?kbn=coex", None),
    ("Convention", "국내 회의", "예술/디자인", "호주 뉴질랜드 유학 박람회", None, "2025-11-15", "2025-11-16", "컨퍼런스룸 308호", "무료", "코코스유학 (KOKOS)", "코코스유학 (KOKOS Korea)", "담당자명 : 박경련 (Kayla) / 연락처 : 02-566-1178 / 이메일 : kayla@ikokos.com", None, None, "https://kokosfair.com", None),
    ("Exhibition", "일반 전시", "농수산/식음료", "제24회 서울카페쇼", "The 24rd Seoul Int'l Cafe Show", "2025-11-19", "2025-11-22", "Hall A, B, C, D", "1일권 25,000원 / 다일권 50,000원", "엑스포럼, 월간커피", "엑스포럼, 리드엑시비션스코리아", "담당자명 : 변관원 / 연락처 : 02-6000-6720 / 팩스 : 02-881-5429 / 이메일 : info@cafeshow.com", None, None, "https://kor.cafeshow.com/kor/", None),
    ("Convention", "국내 회의", "농수산/식음료", "제14회 월드커피리더스포럼", "The 14th World Coffee Leaders Forum", "2025-11-19", "2025-11-22", "컨퍼런스룸(남) 3F", None, "엑스포럼", "월드커피리더스포럼 조직위원회", "담당자명 : 김승우 / 연락처 : 02-6000-6683 / 이메일 : info@wclforum.org", None, None, "http://www.wclforum.org", None),
    ("Convention", "국내 회의", "농수산/식음료", "2025 예술 일자리 박람회 - 예술로 일하다", "2025 Art Job Fair", "2025-11-20", "2025-11-21", "컨퍼런스룸E", "무료", "문화체육관광부 Ministry of Culture, Sports and Tourism", "(재)예술경영지원센터 & 한국예술인복지재단  Korea Arts Management Service (KAMS) & Korean Artist Welfare Foundation", "담당자명 :  운영사무국  2025 Arts Job Fair Event Secretariat / 이메일 : artjobfair@gmail.com", None, None, "https://artjobfair.kr/", None),
    ("Pop-up/Event", "국내 회의", "공연/이벤트", "대학내일ES 트렌드 컨퍼런스", None, "2025-11-21", "2025-11-21", "오디토리움", "일반권 149,000원 / 단체권 104,300원", "대학내일ES", "(재)예술경영지원센터 & 한국예술인복지재단  Korea Arts Management Service (KAMS) & Korean Artist Welfare Foundation", "이메일 : tcon@univ.me", None, None, "https://www.tcon.kr/TCON26", None),
    ("Convention", "국내 회의", "공연/이벤트", "세계국제학교 유학박람회", None, "2025-11-22", "2025-11-22", "317호", "무료", "더유학 / The Uhak", None, "담당자명 : 강예진 / 연락처 : 070-4617-3633 / 이메일 : marketing@theuhak.com", None, None, "https://uhak-fair.com/", None),
    ("Convention", "국내 회의", "공연/이벤트", "아일랜드유학설명회", "Ireland Study Abroad Seminar", "2025-11-22", "2025-11-22", "코엑스 컨퍼런스룸(남),3층 324호", "무료 (온라인 사전예약필수)", "아일랜드프레스티지유학 (Ireland Prestigeuhak)", "아일랜드프레스티지유학 (Ireland Prestigeuhak)", "담당자명 : 권순유 (Soonyu Kwon) / 연락처 : 010-5122-5056 / 팩스 : 02-553-7527 / 이메일 : prestigeuhak@gmail.com", None, None, "https://prestigeuhak.com/seminar_coex/", None),
    ("Exhibition", "일반 전시", "기타", "2025 해외마케팅종합대전", "Korea Grand Sourcing Fair 2025", "2025-11-26", "2025-11-27", "Hall B", "무료", "한국무역협회", None, "담당자명 : 함여민 / 연락처 : 02-6000-5371 / 팩스 : 02-6000-5343 / 이메일 : ym.ham@kita.or.kr", None, None, None, None),
    ("Convention", "국내 회의", "기타", "도쿄 기프트쇼 인 서울 2025", "Tokyo International Gift Show in Seoul 2025", "2025-11-26", "2025-11-27", "The Platz", "사전등록 : 무료 / 현장등록 : 20,000원", "비즈니스가이드사(주)", "(주)트레이드월드/코리아메세", "담당자명 : 코시이시 이나호 / 박지원 / 연락처 : 070-4610-3432 / 이메일 : seoul@giftshow.co.jp / bella@tradeworld.co.kr", None, None, None, None),
    ("Exhibition", "주최 전시", "기타", "소싱인마켓", "Sourcing in Market", "2025-11-26", "2025-11-28", "Hall C", "1차 사전등록(~10/31) 5,000원 / 2차 사전등록(11/1 ~ 11/25) 10,000원 / 현장등록 20,000원", "(주)코엑스, (사)한국MD협회", "(주)코엑스", "담당자명 : 이인희 / 연락처 : 02-6000-8091/8196 / 팩스 : 02-6944-8304 / 이메일 : sipremium@coex.co.kr", None, None, "https://www.sourcingfair.co.kr/fairDash.do", None),
    ("Exhibition", "일반 전시", "전기/전자/IT", "AIoT 국제전시회", "AIoT Korea Exhibition", "2025-11-26", "2025-11-28", "Hall D", "10,000원", "과학기술정보통신부", "케이훼어스(주), (사)한국지능형사물인터넷협회", "담당자명 : 장현태 / 연락처 : 02-555-7153 / 팩스 : 02-881-5444 / 이메일 : htjang@kfairs.com", None, None, "http://www.aiotkorea.or.kr", None),
    ("Convention", "국내 회의", "교육/출판", "[김영편입] 2026학년도 대학편입 파이널 지원전략 설명회", None, "2025-11-29", "2025-11-29", "오디토리움", None, "(주)아이비김영", None, None, None, None, "https://www.kimyoung.co.kr/presentation/2025/20251031_main_full.asp?src=image&kw=0567AD", None),
    ("Exhibition", "일반 전시", "공연/이벤트", "포켓몬 카드 게임 2026 코리안리그 시즌1", "2026 Pokémon KOREAN LEAGUE Season. 1", "2025-11-29", "2025-11-30", "Hall B1", "무료", "(주)포켓몬코리아", None, "담당자명 : 김형준 / 연락처 : 1588-4273 / 팩스 : 031-272-0488 / 이메일 : webmaster@pokemonkorea.co.kr", None, None, "https://www.pokemonkorea.co.kr/koreanleague_2026", None),
    ("Convention", "국내 회의", "교육/출판", "호주 유학박람회", None, "2025-11-29", "2025-11-30", "코엑스 컨퍼런스룸(남), 3층 307호", "무료", "iBN 유학", "iBN 유학", "담당자명 : 이문숙 (Mona Lee) / 연락처 : 02-3477-2412 / 팩스 : 02-3477-2407 / 이메일 : seoul@ibnedu.com", None, None, "http://www.uhakfestival.kr", None),
    ("Exhibition", "일반 전시", "전기/전자/IT", "제10회 대한민국 소프트웨어 대전, 소프트웨이브 2025", "SOFTWAVE 2025", "2025-12-03", "2025-12-05", "Hall A", "무료", "(주)전자신문사", "(주)전자신문사", "담당자명 : 김정억 / 연락처 : 02-2168-9332 / 팩스 : 02-2632-1785 / 이메일 : manager@k-softwave.com", None, None, "https://www.k-softwave.com", None),
    ("Exhibition", "일반 전시", "기계/과학/기술", "2025 코리아 테크 페스티벌(구 산업기술 R&D 종합대전)", "Korea Tech Festival 2025", "2025-12-03", "2025-12-05", "Hall B", "무료", "산업통상부", "한국산업기술기획평가원(KEIT), 한국산업기술진흥원(KIAT), 대한무역투자진흥공사(KOTRA), 한국산업기술시험원(KTL)", "담당자명 : 이아름 / 연락처 : 053-718-8655 / 이메일 : armong@keit.re.kr", None, None, "https://srome.keit.re.kr/srome/biz/info/rndFrutFairOccsGuid/retrieveRndFrutFairMainView.do?prgmId=XPG407110000", None),
    ("Exhibition", "일반 전시", "기계/과학/기술", "2025 대한민국발명특허대전", "2025 Korea Invention Patent Exhibition(KINPEX 2025)", "2025-12-03", "2025-12-06", "Hall C", "무료", "특허청", "한국발명진흥회", "담당자명 : 이예won / 연락처 : 02-3459-2794 / 이메일 : 519@kipa.org", None, None, "https://www.kipa.org/kinpex/", None),
    ("Exhibition", "일반 전시", "예술/디자인", "2025 상표·디자인권展", "2025 Trademark-Design Right Exhibition(TDEX 2025)", "2025-12-03", "2025-12-06", "Hall C", "무료", "특허청", "한국발명진흥회", "담당자명 : 이예원 / 연락처 : 02-3459-2794 / 이메일 : 519@kipa.org", None, None, "https://www.kipa.org/trademark", None),
    ("Exhibition", "일반 전시", "기계/과학/기술", "2025 서울국제발명전시회", "2025 Seoul International Invention Fair", "2025-12-03", "2025-12-06", "Hall C", "무료", "특허청", None, "담당자명 : 김주호 / 연락처 : 02-3459-2758 / 이메일 : iexh@kipa.org", None, None, "https://kipa.org/siif", None),
    ("Exhibition", "일반 전시", "공연/이벤트", "2025 G-PRC GLOBAL PRO ROBOT CHAMPIONSHIP", "2025 G-PRC GLOBAL PRO ROBOT CHAMPIONSHIP", "2025-12-07", "2025-12-07", "Hall A", "무료", "(주)에이럭스", "(주)에이럭스", "담당자명 : 정혜윤 / 연락처 : 02-3665-8956 / 팩스 : 02-3665-8957 / 이메일 : hychong@aluxonline.com", None, None, "https://g-prc.com/", None),
]

VENUE_LABEL_MAP = {
    "코엑스(COEX)": "코엑스",
    "세텍(SETEC)": "세텍",
    "킨텍스(KINTEX)": "킨텍스",
    "수원컨벤션센터(Suwon Convention Center)": "수원컨벤션센터",
    "수원메쎄(SUWON MESSE)": "수원메쎄",
    "코엑스 마곡(COEX MAGOK)": "코엑스 마곡",
    "경주화백컨벤션센터(HICO)": "경주화백컨벤션센터",
    "김대중컨벤션센터(KDJ Center)": "김대중컨벤션센터",
    "벡스코(BEXCO)": "벡스코",
    "엑스코(EXCO)": "엑스코",
}

VENUE_IDS = {
    "코엑스": 1,
    "킨텍스": 2,
    "벡스코": 3,
    "DDP": 4,
    "수원컨벤션센터": 5,
    "수원메쎄": 6,
    "세텍": 7,
    "코엑스 마곡": 8,
    "경주화백컨벤션센터": 9,
    "김대중컨벤션센터": 10,
    "엑스코": 11,
}

DEFAULT_QUESTIONS: List[Dict[str, Any]] = [
    {"id": "q1", "type": "rating", "label": "전반적인 만족도", "scale": 5},
    {
        "id": "q2",
        "type": "multi_select",
        "label": "가장 유익했던 요소",
        "options": ["현장 운영", "콘텐츠", "네트워킹", "부스 구성"],
    },
    {"id": "q3", "type": "text", "label": "추가로 듣고 싶은 내용이 있다면 남겨주세요"},
]

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Safari/17.0",
    "Mozilla/5.0 (Linux; Android 14; SM-S918N) Chrome/129.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:118.0) Gecko/20100101 Firefox/118.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    "Mozilla/5.0 (Linux; Android 14; SM-F946N) Chrome/129.0",
]

IP_BASES = ["203.0.113.", "198.51.100.", "192.0.2."]

RESPONDENT_POOL = [
    {"name": "김하늘", "email_prefix": "haneul.kim", "phone": "01023457812", "company": "카페코리아"},
    {"name": "박도연", "email_prefix": "doyeon.park", "phone": "01099881234", "company": "빈랩"},
    {"name": "이윤지", "email_prefix": "yoonji.lee", "phone": "01055551212", "company": "라떼아트코리아"},
    {"name": "정민재", "email_prefix": "minjae.jeong", "phone": "01011112222", "company": "스마트시티연구원"},
    {"name": "오소연", "email_prefix": "soyoun.oh", "phone": "01034567890", "company": "IoT 파트너스"},
    {"name": "윤재훈", "email_prefix": "jaehoon.yoon", "phone": "01030305050", "company": "시티인프라"},
    {"name": "이세훈", "email_prefix": "sehune.lee", "phone": "01060607878", "company": "그린홈디자인"},
    {"name": "문지혜", "email_prefix": "jihye.moon", "phone": "01090901212", "company": "패시브하우스연구소"},
    {"name": "신민호", "email_prefix": "minho.shin", "phone": "01033334444", "company": "에코에너지솔루션"},
    {"name": "장은우", "email_prefix": "eunwoo.jang", "phone": "01077778888", "company": "고메푸드"},
    {"name": "윤세린", "email_prefix": "serin.yoon", "phone": "01022223333", "company": "푸드랩"},
    {"name": "홍수빈", "email_prefix": "soobin.hong", "phone": "01090901010", "company": "치즈클럽"},
    {"name": "서지우", "email_prefix": "jiwoo.seo", "phone": "01074128899", "company": "브루마스터스"},
    {"name": "오하림", "email_prefix": "harim.oh", "phone": "01033556677", "company": "크래프트브루"},
    {"name": "정태양", "email_prefix": "taeyang.jeong", "phone": "01099995555", "company": "술브릿지"},
    {"name": "임서윤", "email_prefix": "seoyoon.lim", "phone": "01042425656", "company": "펫러브"},
    {"name": "백호진", "email_prefix": "hojin.baek", "phone": "01025257878", "company": "캣케어코리아"},
    {"name": "정동훈", "email_prefix": "donghun.jeong", "phone": "01098981010", "company": "펫웰케어"},
    {"name": "Daniel Kim", "email_prefix": "daniel.kim", "phone": "01077771122", "company": "서울투어즈"},
    {"name": "Sakura Ito", "email_prefix": "sakura.ito", "phone": "01082829292", "company": "Japan Travel Consulting"},
    {"name": "이서호", "email_prefix": "seoho.lee", "phone": "01065654545", "company": "로컬트립"},
    {"name": "최다온", "email_prefix": "daon.choi", "phone": "01012127878", "company": "브랜드스튜디오"},
    {"name": "Melissa Park", "email_prefix": "melissa.park", "phone": "01030304040", "company": "Creative Link"},
    {"name": "김해린", "email_prefix": "haerin.kim", "phone": "01043436565", "company": "콜라보나우"},
    {"name": "전수빈", "email_prefix": "subin.jeon", "phone": "01059592323", "company": "펫프리미엄"},
    {"name": "이보람", "email_prefix": "boram.lee", "phone": "01078783434", "company": "펫케어하우스"},
    {"name": "조민혁", "email_prefix": "minhyuk.jo", "phone": "01098984545", "company": "펫비즈"},
    {"name": "이지섭", "email_prefix": "jiseob.lee", "phone": "01062624141", "company": "퍼멘트랩"},
    {"name": "Soojin Lee", "email_prefix": "soojin.lee", "phone": "01074749898", "company": "크래프트술"},
    {"name": "황은채", "email_prefix": "eunchae.hwang", "phone": "01051516262", "company": "브루웍스"},
    {"name": "김지안", "email_prefix": "jian.kim", "phone": "01026264848", "company": "벤처파트너스"},
    {"name": "박채린", "email_prefix": "chaerin.park", "phone": "01045456767", "company": "클라우드이노베이터스"},
    {"name": "이준혁", "email_prefix": "junhyuk.lee", "phone": "01081819292", "company": "AI 인사이트"},
    {"name": "김유리", "email_prefix": "yuri.kim", "phone": "01056564545", "company": "아트컬렉티브"},
    {"name": "배소정", "email_prefix": "sojeong.bae", "phone": "01023234545", "company": "일러스트허브"},
    {"name": "박소연", "email_prefix": "soyeon.park", "phone": "01070708585", "company": "아트플래너"},
    {"name": "장은호", "email_prefix": "eunho.jang", "phone": "01067674545", "company": "스마트빌드"},
    {"name": "한지수", "email_prefix": "jisoo.han", "phone": "01048483232", "company": "그린홈테크"},
    {"name": "이건우", "email_prefix": "gunwoo.lee", "phone": "01056567878", "company": "스마트시티랩"},
    {"name": "장보민", "email_prefix": "bomin.jang", "phone": "01098987676", "company": "카페드림"},
    {"name": "민지영", "email_prefix": "jiyoung.min", "phone": "01021214343", "company": "카페랩"},
    {"name": "홍가람", "email_prefix": "garam.hong", "phone": "01045457878", "company": "브루스타트"},
]

RESPONSES_PER_EVENT = 5

EVENTS: List[Dict[str, Any]] = [
    {
        "company": "엑스포럼 커피랩",
        "exhibition_title": "제24회 서울카페쇼",
        "exhibition_start": "2025-11-19",
        "event_name": "라떼 아트 챔피언십 공개전",
        "event_type": "체험 프로그램",
        "booth_number": "C201",
        "location": "Hall A 체험존",
        "start_date": "2025-11-20",
        "end_date": "2025-11-20",
        "start_time": "11:00",
        "end_time": "14:00",
        "description": "월드 바리스타 챔피언과 함께하는 라떼 아트 실전 시연 및 테이스팅",
        "participation_method": "현장 선착순 등록",
        "benefits": "참가자 한정 기념 굿즈 제공",
        "image_url": "https://images.boothtalk.test/events/latte-art.jpg",
        "categories": ["커피", "체험"],
        "tag_names": ["커피", "체험"],
        "manager": {
            "manager_name": "박수현",
            "manager_phone": "02-6000-6721",
            "manager_email": "barista_lead@cafeshow.com",
            "manager_position": "운영팀장",
            "manager_department": "엑스포럼 커피랩",
            "notes": "월드 바리스타 챔피언 일정 및 시연 진행 총괄",
        },
        "survey": {
            "title": "라떼 아트 챔피언십 공개전 만족도 조사",
            "description": "카페쇼 체험존 방문객 의견을 수집합니다.",
            "require_email": False,
            "require_phone": False,
            "max_responses": 500,
        },
    },
    {
        "company": "코엑스 프로모션팀",
        "exhibition_title": "AIoT 국제전시회",
        "exhibition_start": "2025-11-26",
        "event_name": "스마트 센서 신제품 브리핑",
        "event_type": "기술 발표",
        "booth_number": "D312",
        "location": "Hall D 세미나존",
        "start_date": "2025-11-27",
        "end_date": "2025-11-27",
        "start_time": "13:00",
        "end_time": "15:00",
        "description": "차세대 스마트 시티 구축을 위한 IoT 센서 라인업 발표와 데모",
        "participation_method": "사전 등록자 우선 입장",
        "benefits": "사전 등록자 한정 개발 키트 할인 쿠폰",
        "image_url": "https://images.boothtalk.test/events/aiot-briefing.jpg",
        "categories": ["IoT", "세미나"],
        "tag_names": ["IoT", "세미나"],
        "manager": {
            "manager_name": "정도현",
            "manager_phone": "02-6000-8100",
            "manager_email": "iot_briefing@coexcenter.com",
            "manager_position": "프로젝트 매니저",
            "manager_department": "코엑스 프로모션팀",
            "notes": "공식 기자단 대응 및 발표 세션 총괄",
        },
        "survey": {
            "title": "스마트 센서 신제품 브리핑 만족도 조사",
            "description": "IoT 발표 세션 참가자 만족도를 조사합니다.",
            "require_email": True,
            "require_phone": False,
            "max_responses": 300,
        },
    },
    {
        "company": "메쎄이상 이벤트팀",
        "exhibition_title": "2025 서울건축박람회",
        "exhibition_start": "2025-11-06",
        "event_name": "제로에너지 하우스 투어",
        "event_type": "체험 프로그램",
        "booth_number": "A105",
        "location": "제1전시실 모델하우스 구역",
        "start_date": "2025-11-07",
        "end_date": "2025-11-08",
        "start_time": "10:30",
        "end_time": "16:00",
        "description": "패시브하우스 전문가와 함께 에너지 절감 솔루션을 체험하는 가이드 투어",
        "participation_method": "현장 QR 체크인",
        "benefits": "설계 상담 바우처 제공",
        "image_url": "https://images.boothtalk.test/events/zero-energy-house.jpg",
        "categories": ["건축", "친환경"],
        "tag_names": ["건축", "친환경"],
        "manager": {
            "manager_name": "이가영",
            "manager_phone": "02-6000-3025",
            "manager_email": "greenhouse@messeesang.com",
            "manager_position": "현장 디렉터",
            "manager_department": "메쎄이상 이벤트팀",
            "notes": "투어 가이드 편성 및 동선 관리",
        },
        "survey": {
            "title": "제로에너지 하우스 투어 만족도 조사",
            "description": "패시브하우스 투어 참가자 피드백을 수집합니다.",
            "require_email": False,
            "require_phone": True,
            "max_responses": 200,
        },
    },
    {
        "company": "서울전람 체험존",
        "exhibition_title": "메가푸드쇼 2025 (메가푸드쇼)",
        "exhibition_start": "2025-11-13",
        "event_name": "수입치즈 마스터클래스",
        "event_type": "쿠킹 쇼",
        "booth_number": "F210",
        "location": "테이스팅 스테이지",
        "start_date": "2025-11-14",
        "end_date": "2025-11-14",
        "start_time": "12:00",
        "end_time": "13:30",
        "description": "소믈리에와 함께하는 유럽 치즈 페어링 및 레시피 시연",
        "participation_method": "온라인 사전 예약",
        "benefits": "테이스팅 키트 제공",
        "image_url": "https://images.boothtalk.test/events/cheese-class.jpg",
        "categories": ["식음료", "시연"],
        "tag_names": ["식음료", "시연"],
        "manager": {
            "manager_name": "김태호",
            "manager_phone": "02-6677-4401",
            "manager_email": "cheese_master@megashow.co.kr",
            "manager_position": "시연 총괄",
            "manager_department": "서울전람 체험존",
            "notes": "소믈리에 섭외 및 테이스팅 키트 준비",
        },
        "survey": {
            "title": "수입치즈 마스터클래스 만족도 조사",
            "description": "테이스팅 프로그램 후기를 남겨주세요.",
            "require_email": False,
            "require_phone": False,
            "max_responses": 400,
        },
    },
    {
        "company": "지역특산홍보관",
        "exhibition_title": "2025 대한민국막걸리엑스포 대구(막스포 대구) (MAXPO DAEGU 2025)",
        "exhibition_start": "2025-12-05",
        "event_name": "프리미엄 막걸리 시음회",
        "event_type": "시음 이벤트",
        "booth_number": "T318",
        "location": "Hall 3 테이스팅 라운지",
        "start_date": "2025-12-05",
        "end_date": "2025-12-07",
        "start_time": "15:00",
        "end_time": "17:00",
        "description": "전국 양조장이 선보이는 한정판 막걸리를 전문 소믈리에와 함께 시음",
        "participation_method": "현장 예약 및 연령 확인",
        "benefits": "참가자 기념 잔 증정",
        "image_url": "https://images.boothtalk.test/events/makgeolli-tasting.jpg",
        "categories": ["주류", "체험"],
        "tag_names": ["주류", "체험"],
        "manager": {
            "manager_name": "박미연",
            "manager_phone": "053-718-1203",
            "manager_email": "makgeolli_tasting@localfair.kr",
            "manager_position": "운영 매니저",
            "manager_department": "지역특산홍보관",
            "notes": "참가자 연령 확인 및 제품 공급사 조율",
        },
        "survey": {
            "title": "프리미엄 막걸리 시음회 만족도 조사",
            "description": "시음회 참여자 만족도와 의견을 수집합니다.",
            "require_email": False,
            "require_phone": True,
            "max_responses": 250,
        },
    },
    {
        "company": "캣케어 스튜디오",
        "exhibition_title": "2025 부산캣쇼 (부산캣쇼)",
        "exhibition_start": "2025-11-28",
        "event_name": "캣니스 헬스케어 상담 세션",
        "event_type": "상담 프로그램",
        "booth_number": "B117",
        "location": "Hall 2 케어존",
        "start_date": "2025-11-29",
        "end_date": "2025-11-30",
        "start_time": "10:00",
        "end_time": "17:00",
        "description": "수의사와 트레이너가 진행하는 맞춤형 반려묘 건강 상담 및 용품 추천",
        "participation_method": "사전 예약 우선, 현장 대기 접수",
        "benefits": "맞춤형 헬스케어 키트 제공",
        "image_url": "https://images.boothtalk.test/events/cat-health.jpg",
        "categories": ["펫", "상담"],
        "tag_names": ["펫", "상담"],
        "manager": {
            "manager_name": "최소연",
            "manager_phone": "051-600-2088",
            "manager_email": "catcare_manager@catcarestudio.kr",
            "manager_position": "케어 매니저",
            "manager_department": "캣케어 스튜디오",
            "notes": "수의사 상담 일정 및 부스 운영 총괄",
        },
        "survey": {
            "title": "캣니스 헬스케어 상담 세션 만족도 조사",
            "description": "반려묘 건강 상담 프로그램 만족도를 확인합니다.",
            "require_email": True,
            "require_phone": True,
            "max_responses": 350,
        },
    },
    {
        "company": "트래블쇼 운영사무국",
        "exhibition_title": "트래블쇼 2025",
        "exhibition_start": "2025-11-07",
        "event_name": "트래블쇼 글로벌 파트너 미팅",
        "event_type": "B2B 네트워킹",
        "booth_number": "D-Partners",
        "location": "Hall D B2B 라운지",
        "start_date": "2025-11-08",
        "end_date": "2025-11-08",
        "start_time": "15:00",
        "end_time": "17:30",
        "description": "해외 바이어와 국내 관광 업체 간 파트너십 미팅 세션",
        "participation_method": "사전 매칭 후 입장",
        "benefits": "글로벌 바이어 리스트 공유",
        "image_url": "https://images.boothtalk.test/events/travel-partner.jpg",
        "categories": ["관광", "네트워킹"],
        "tag_names": ["관광", "네트워킹"],
        "manager": {
            "manager_name": "윤예린",
            "manager_phone": "02-6677-3400",
            "manager_email": "partners@travelshow.co.kr",
            "manager_position": "B2B 매니저",
            "manager_department": "트래블쇼 운영사무국",
            "notes": "사전 매칭 및 바이어 응대 총괄",
        },
        "survey": {
            "title": "트래블쇼 글로벌 파트너 미팅 만족도 조사",
            "description": "B2B 라운지 참가 기업 의견을 수집합니다.",
            "require_email": True,
            "require_phone": True,
            "max_responses": 200,
        },
    },
    {
        "company": "디자인하우스 스튜디오",
        "exhibition_title": "2025 서울디자인페스티벌",
        "exhibition_start": "2025-11-12",
        "event_name": "서울디자인페스티벌 컬래버 브랜드 피칭",
        "event_type": "브랜드 피칭",
        "booth_number": "C-Stage",
        "location": "Hall C 메인 스테이지",
        "start_date": "2025-11-13",
        "end_date": "2025-11-13",
        "start_time": "14:00",
        "end_time": "16:00",
        "description": "신규 디자인 브랜드가 컬래버 사례를 발표하고 공동 프로젝트를 제안하는 피칭 세션",
        "participation_method": "사전 신청 및 현장 배지 확인",
        "benefits": "선정 브랜드 협업 기회 제공",
        "image_url": "https://images.boothtalk.test/events/design-pitch.jpg",
        "categories": ["디자인", "브랜딩"],
        "tag_names": ["디자인", "브랜딩"],
        "manager": {
            "manager_name": "홍시아",
            "manager_phone": "02-2262-7205",
            "manager_email": "pitch@designfestival.co.kr",
            "manager_position": "프로그램 큐레이터",
            "manager_department": "디자인하우스 스튜디오",
            "notes": "피칭 브랜드 섭외 및 심사위원 운영",
        },
        "survey": {
            "title": "서울디자인페스티벌 컬래버 브랜드 피칭 만족도 조사",
            "description": "피칭 프로그램 참가자 반응을 확인합니다.",
            "require_email": True,
            "require_phone": False,
            "max_responses": 250,
        },
    },
    {
        "company": "메가쇼 주최사",
        "exhibition_title": "2025 메가주 일산(하) (MEGAZOO)",
        "exhibition_start": "2025-11-21",
        "event_name": "메가주 프리미엄 펫푸드 체험관",
        "event_type": "체험 프로그램",
        "booth_number": "P220",
        "location": "킨텍스 제2전시장 펫푸드존",
        "start_date": "2025-11-21",
        "end_date": "2025-11-23",
        "start_time": "09:30",
        "end_time": "18:00",
        "description": "고단백 프리미엄 펫푸드 브랜드 시식 및 영양 상담",
        "participation_method": "현장 QR 체크인",
        "benefits": "펫푸드 샘플팩 제공",
        "image_url": "https://images.boothtalk.test/events/petfood-experience.jpg",
        "categories": ["펫", "체험"],
        "tag_names": ["펫", "체험"],
        "manager": {
            "manager_name": "안도현",
            "manager_phone": "02-6677-3305",
            "manager_email": "petzone@megashow.co.kr",
            "manager_position": "체험존 매니저",
            "manager_department": "메가쇼 주최사",
            "notes": "체험 샘플 재고 및 상담 스케줄 관리",
        },
        "survey": {
            "title": "메가주 프리미엄 펫푸드 체험관 만족도 조사",
            "description": "펫푸드 체험 프로그램 만족도를 조사합니다.",
            "require_email": False,
            "require_phone": True,
            "max_responses": 600,
        },
    },
    {
        "company": "한국막걸리협회 홍보팀",
        "exhibition_title": "2025 대한민국막걸리엑스포 대구(막스포 대구) (MAXPO DAEGU 2025)",
        "exhibition_start": "2025-12-05",
        "event_name": "막걸리 양조장 마스터클래스",
        "event_type": "교육 세션",
        "booth_number": "T350",
        "location": "Hall 3 아카데미존",
        "start_date": "2025-12-06",
        "end_date": "2025-12-06",
        "start_time": "11:00",
        "end_time": "13:00",
        "description": "대한민국 대표 양조장이 전통 발효 노하우를 공개하는 심화 클래스",
        "participation_method": "사전 신청자 대상",
        "benefits": "양조 노트 및 레시피북 제공",
        "image_url": "https://images.boothtalk.test/events/makgeolli-masterclass.jpg",
        "categories": ["주류", "시연"],
        "tag_names": ["주류", "시연"],
        "manager": {
            "manager_name": "장도형",
            "manager_phone": "053-718-1301",
            "manager_email": "academy@makgeolli.or.kr",
            "manager_position": "교육 디렉터",
            "manager_department": "한국막걸리협회 홍보팀",
            "notes": "양조장 섭외 및 교육 커리큘럼 구성",
        },
        "survey": {
            "title": "막걸리 양조장 마스터클래스 만족도 조사",
            "description": "전통주 교육 콘텐츠에 대한 의견을 남겨주세요.",
            "require_email": True,
            "require_phone": False,
            "max_responses": 180,
        },
    },
    {
        "company": "K-소프트웨이브 조직위",
        "exhibition_title": "제10회 대한민국 소프트웨어 대전, 소프트웨이브 2025",
        "exhibition_start": "2025-12-03",
        "event_name": "소프트웨이브 스타트업 쇼케이스",
        "event_type": "스타트업 데모",
        "booth_number": "A-Startup",
        "location": "Hall A 스타트업 라운지",
        "start_date": "2025-12-04",
        "end_date": "2025-12-04",
        "start_time": "13:00",
        "end_time": "17:00",
        "description": "AI·클라우드 스타트업의 솔루션 데모와 투자자 미팅 프로그램",
        "participation_method": "사전 등록 및 현장 확인",
        "benefits": "투자자 메일링 리스트 제공",
        "image_url": "https://images.boothtalk.test/events/softwave-startup.jpg",
        "categories": ["소프트웨어", "스타트업"],
        "tag_names": ["소프트웨어", "스타트업"],
        "manager": {
            "manager_name": "이태준",
            "manager_phone": "02-2168-9332",
            "manager_email": "startup@k-softwave.com",
            "manager_position": "스타트업 프로그램 매니저",
            "manager_department": "K-소프트웨이브 조직위",
            "notes": "데모 스케줄 및 투자자 매칭 담당",
        },
        "survey": {
            "title": "소프트웨이브 스타트업 쇼케이스 만족도 조사",
            "description": "스타트업 데모 세션에 대한 의견을 남겨주세요.",
            "require_email": True,
            "require_phone": False,
            "max_responses": 300,
        },
    },
    {
        "company": "오씨메이커스",
        "exhibition_title": "부산일러스트레이션페어V.6 (부일페V.6)",
        "exhibition_start": "2025-11-21",
        "event_name": "부산일러스트레이션페어 젊은작가 토크",
        "event_type": "토크 세션",
        "booth_number": "B-Talk",
        "location": "Hall 1 토크라운지",
        "start_date": "2025-11-22",
        "end_date": "2025-11-22",
        "start_time": "16:00",
        "end_time": "17:30",
        "description": "신진 일러스트 작가들이 작품 세계와 협업 경험을 공유하는 토크",
        "participation_method": "현장 선착순 입장",
        "benefits": "작가 사인 엽서 제공",
        "image_url": "https://images.boothtalk.test/events/illustration-talk.jpg",
        "categories": ["일러스트", "세미나"],
        "tag_names": ["일러스트", "세미나"],
        "manager": {
            "manager_name": "조미소",
            "manager_phone": "051-717-9902",
            "manager_email": "talk@ocmakers.co.kr",
            "manager_position": "프로그램 매니저",
            "manager_department": "오씨메이커스",
            "notes": "참여 작가 섭외 및 토크 진행 운영",
        },
        "survey": {
            "title": "부산일러스트레이션페어 젊은작가 토크 만족도 조사",
            "description": "토크 프로그램 만족도를 확인합니다.",
            "require_email": False,
            "require_phone": False,
            "max_responses": 180,
        },
    },
    {
        "company": "하우징테크연구소",
        "exhibition_title": "2025 광주경향하우징페어(하) (경향하우징페어)",
        "exhibition_start": "2025-11-27",
        "event_name": "광주경향하우징 신기술 세미나",
        "event_type": "기술 세미나",
        "booth_number": "G205",
        "location": "컨벤션홀 세미나실",
        "start_date": "2025-11-28",
        "end_date": "2025-11-28",
        "start_time": "10:00",
        "end_time": "12:00",
        "description": "스마트 주거 솔루션과 건축 자재 신기술을 소개하는 세미나",
        "participation_method": "현장 등록",
        "benefits": "세미나 자료집 제공",
        "image_url": "https://images.boothtalk.test/events/housing-tech.jpg",
        "categories": ["건축", "주거"],
        "tag_names": ["건축", "주거"],
        "manager": {
            "manager_name": "김도율",
            "manager_phone": "062-600-7702",
            "manager_email": "seminar@housingtech.kr",
            "manager_position": "연구소장",
            "manager_department": "하우징테크연구소",
            "notes": "세미나 강연자 및 자료 개발 총괄",
        },
        "survey": {
            "title": "광주경향하우징 신기술 세미나 만족도 조사",
            "description": "세미나 참석자 의견을 수집합니다.",
            "require_email": False,
            "require_phone": False,
            "max_responses": 220,
        },
    },
    {
        "company": "제일좋은전람 운영팀",
        "exhibition_title": "카페 창업쇼 in 광주 (d&c show)",
        "exhibition_start": "2025-12-11",
        "event_name": "카페 창업쇼 바리스타 부스 체험",
        "event_type": "체험 프로그램",
        "booth_number": "C109",
        "location": "Hall A 체험존",
        "start_date": "2025-12-11",
        "end_date": "2025-12-13",
        "start_time": "10:00",
        "end_time": "18:00",
        "description": "카페 창업 준비자를 위한 바리스타 장비 실습과 창업 상담",
        "participation_method": "현장 예약",
        "benefits": "창업 가이드북 제공",
        "image_url": "https://images.boothtalk.test/events/cafe-startup.jpg",
        "categories": ["창업", "커피"],
        "tag_names": ["창업", "커피"],
        "manager": {
            "manager_name": "김도하",
            "manager_phone": "070-5089-2601",
            "manager_email": "startup@jeilshow.co.kr",
            "manager_position": "운영팀장",
            "manager_department": "제일좋은전람 운영팀",
            "notes": "창업 컨설턴트 스케줄 및 체험존 운영",
        },
        "survey": {
            "title": "카페 창업쇼 바리스타 부스 체험 만족도 조사",
            "description": "카페 창업 준비에 도움이 되었는지 의견을 들려주세요.",
            "require_email": True,
            "require_phone": True,
            "max_responses": 400,
        },
    },
]

TAG_COLORS = {
    "커피": "#c67c4f",
    "체험": "#f39c12",
    "IoT": "#0d47a1",
    "세미나": "#1abc9c",
    "건축": "#6c5ce7",
    "친환경": "#2ecc71",
    "식음료": "#e67e22",
    "시연": "#9b59b6",
    "주류": "#34495e",
    "펫": "#e84393",
    "상담": "#16a085",
    "관광": "#ff9f43",
    "네트워킹": "#8e44ad",
    "디자인": "#ff7675",
    "브랜딩": "#d35400",
    "소프트웨어": "#2980b9",
    "스타트업": "#27ae60",
    "일러스트": "#fd79a8",
    "주거": "#95a5a6",
    "창업": "#f1c40f",
}


def build_coex_rows() -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for raw in COEX_ROWS_RAW:
        rows.append(
            {
                "category": raw[0],
                "classification": raw[1],
                "sector": raw[2],
                "title": raw[3],
                "subtitle": raw[4],
                "start": raw[5],
                "end": raw[6],
                "hall": raw[7],
                "admission": raw[8],
                "organizer": raw[9],
                "host": raw[10],
                "contact_info": raw[11],
                "group_contact": raw[12],
                "ticket_contact": raw[13],
                "website_url": raw[14],
                "ticket_url": raw[15],
            }
        )
    return rows


def prepare_events() -> List[Dict[str, Any]]:
    prepared: List[Dict[str, Any]] = []
    base_questions = json.loads(json.dumps(DEFAULT_QUESTIONS, ensure_ascii=False))
    for index, event in enumerate(EVENTS):
        event_copy = copy.deepcopy(event)
        event_copy["survey"]["questions"] = json.loads(
            json.dumps(base_questions, ensure_ascii=False)
        )
        event_copy["responses"] = generate_responses(index, event_copy)
        prepared.append(event_copy)
    return prepared


def generate_responses(event_index: int, event: Dict[str, Any]) -> List[Dict[str, Any]]:
    responses: List[Dict[str, Any]] = []
    start_date = datetime.fromisoformat(event["start_date"])
    end_date = datetime.fromisoformat(event["end_date"])
    start_hour, start_minute = [int(x) for x in event["start_time"].split(":")]
    duration_days = max((end_date - start_date).days, 0)
    rating_pattern = [5, 4, 5, 5, 4]

    for offset in range(RESPONSES_PER_EVENT):
        pool_person = RESPONDENT_POOL[
            (event_index * RESPONSES_PER_EVENT + offset) % len(RESPONDENT_POOL)
        ]
        rating = rating_pattern[offset % len(rating_pattern)]
        q2_choices = ["콘텐츠"]
        if rating >= 4:
            q2_choices.append("현장 운영")
        if "네트워킹" in event["tag_names"] and rating >= 5:
            q2_choices.append("네트워킹")
        if rating >= 5 and "부스 구성" not in q2_choices:
            q2_choices.append("부스 구성")
        q2_choices = list(dict.fromkeys(q2_choices))

        q3_positive = f"{event['event_name']} 관련 추가 자료를 이메일로 보내주세요."
        q3_improve = f"{event['event_name']} 현장 운영을 조금만 더 개선해주시면 좋겠습니다."
        q3_answer = q3_positive if rating >= 5 else q3_improve

        answers = [
            {"questionId": "q1", "answer": rating},
            {"questionId": "q2", "answer": q2_choices},
            {"questionId": "q3", "answer": q3_answer},
        ]

        review_positive = f"{event['event_name']} 프로그램이 매우 유익했습니다."
        review_improve = f"{event['event_name']} 프로그램이 좋았지만 좌석이 조금 부족했어요."
        review = review_positive if rating >= 5 else review_improve

        day_offset = min(offset, duration_days)
        base_date = start_date + timedelta(days=day_offset)
        hour = (start_hour + 2 + offset) % 24
        minute = (start_minute + offset * 11) % 60
        submitted_dt = base_date.replace(hour=hour, minute=minute, second=0)

        ip_base = IP_BASES[(event_index + offset) % len(IP_BASES)]
        ip_addr = ip_base + str(20 + (event_index * RESPONSES_PER_EVENT + offset) % 180)
        user_agent = USER_AGENTS[(event_index + offset) % len(USER_AGENTS)]

        email = f"{pool_person['email_prefix']}+{event_index * RESPONSES_PER_EVENT + offset}@example.com"
        digits = pool_person["phone"]
        prefix_digits = digits[:-4]
        tail_digits = int(digits[-4:])
        new_tail = (tail_digits + (event_index * RESPONSES_PER_EVENT + offset) * 7) % 10000
        phone_digits = f"{prefix_digits}{new_tail:04d}"
        phone_formatted = f"{phone_digits[:3]}-{phone_digits[3:7]}-{phone_digits[7:]}"

        responses.append(
            {
                "respondent_name": pool_person["name"],
                "respondent_email": email,
                "respondent_phone": phone_formatted,
                "respondent_company": pool_person["company"],
                "booth_number": event["booth_number"],
                "answers": answers,
                "rating": rating,
                "review": review,
                "ip_address": ip_addr,
                "user_agent": user_agent,
                "submitted_at": submitted_dt.strftime("%Y-%m-%d %H:%M:%S") + "+09",
            }
        )

    return responses


def build_seed(
    coex_rows: List[Dict[str, Any]],
    setec_rows: List[Dict[str, Any]],
    expo_rows: List[Dict[str, Any]],
    events: List[Dict[str, Any]],
) -> str:
    lines: List[str] = []

    lines.append("-- Booth Talk seed data aligned with Venue -> Exhibition -> Event hierarchy")
    lines.append("BEGIN;\n")
    lines.append(
        "TRUNCATE TABLE\n"
        "    system_logs,\n"
        "    event_views,\n"
        "    event_likes,\n"
        "    survey_responses,\n"
        "    surveys,\n"
        "    event_managers,\n"
        "    event_tags,\n"
        "    tags,\n"
        "    events,\n"
        "    exhibitions,\n"
        "    companies,\n"
        "    venues,\n"
        "    admins\n"
        "RESTART IDENTITY CASCADE;\n"
    )

    lines.append("-- 1. Admin ---------------------------------------------------------------")
    lines.append(
        "INSERT INTO admins (username, password_hash, email, full_name, is_active)\n"
        "VALUES ('root', '{hash}', 'admin@boothtalk.com', '슈퍼 관리자', TRUE);\n".format(hash=PASSWORD_HASH)
    )

    lines.append("-- 2. Venues --------------------------------------------------------------")
    venue_values = [
        "    ({}, {}, {}, {}, {}, TRUE)".format(
            sql_value(v["name"]),
            sql_value(v["location"]),
            sql_value(v["address"]),
            sql_value(v["description"]),
            sql_value(v["website"]),
        )
        for v in VENUES
    ]
    lines.append(
        "INSERT INTO venues (venue_name, location, address, description, website_url, is_active)\n"
        "VALUES\n" + ",\n".join(venue_values) + ";\n"
    )

    lines.append("-- 3. Companies ----------------------------------------------------------")
    company_values = [
        "    ({name}, {username}, '{pwd}', {biz}, {email}, {phone}, {address}, {website}, TRUE, 1)".format(
            name=sql_value(c["company_name"]),
            username=sql_value(c["username"]),
            pwd=PASSWORD_HASH,
            biz=sql_value(c["business_number"]),
            email=sql_value(c["email"]),
            phone=sql_value(c["phone"]),
            address=sql_value(c["address"]),
            website=sql_value(c["website_url"]),
        )
        for c in COMPANIES
    ]
    lines.append(
        "INSERT INTO companies (\n"
        "    company_name,\n"
        "    username,\n"
        "    password_hash,\n"
        "    business_number,\n"
        "    email,\n"
        "    phone,\n"
        "    address,\n"
        "    website_url,\n"
        "    is_active,\n"
        "    created_by\n"
        ") VALUES\n" + ",\n".join(company_values) + ";\n"
    )

    lines.append("-- 4. Exhibitions (COEX) -------------------------------------------------")
    coex_values = [
        "    (1, NULL, {source}, {title}, {subtitle}, {category}, {classification}, {sector}, {hall}, {admission}, {organizer}, {host}, {contact}, {group_contact}, {ticket_contact}, {website}, {ticket_url}, NULL, NULL, NULL, {start}, {end})".format(
            source=sql_value(None),
            title=sql_value(row["title"]),
            subtitle=sql_value(row["subtitle"]),
            category=sql_value(row["category"]),
            classification=sql_value(row["classification"]),
            sector=sql_value(row["sector"]),
            hall=sql_value(row["hall"]),
            admission=sql_value(row["admission"]),
            organizer=sql_value(row["organizer"]),
            host=sql_value(row["host"]),
            contact=sql_value(row["contact_info"]),
            group_contact=sql_value(row["group_contact"]),
            ticket_contact=sql_value(row["ticket_contact"]),
            website=sql_value(row["website_url"]),
            ticket_url=sql_value(row["ticket_url"]),
            start=sql_value(row["start"]),
            end=sql_value(row["end"]),
        )
        for row in coex_rows
    ]
    lines.append(
        "INSERT INTO exhibitions (venue_id, company_id, source_event_id, title, subtitle, category, classification, sector, hall_location, admission_fee, organizer, host, contact_info, group_contact, ticket_contact, website_url, ticket_url, image_url, image_alt, description, start_date, end_date)\n"
        "VALUES\n" + ",\n".join(coex_values) + ";\n"
    )

    lines.append("-- 4-1. Exhibitions (SETEC) ----------------------------------------------")
    setec_values = [
        "    (7, NULL, {source}, {title}, NULL, 'Exhibition', '공식 일정', NULL, {hall}, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, {image_url}, {image_alt}, NULL, {start}, {end})".format(
            source=sql_value(row["event_id"]),
            title=sql_value(row["title"]),
            hall=sql_value(row.get("location")),
            image_url=sql_value(row.get("img_url")),
            image_alt=sql_value(row.get("img_alt")),
            start=sql_value(row["start_date"]),
            end=sql_value(row.get("end_date") or row["start_date"]),
        )
        for row in setec_rows
    ]
    lines.append(
        "INSERT INTO exhibitions (venue_id, company_id, source_event_id, title, subtitle, category, classification, sector, hall_location, admission_fee, organizer, host, contact_info, group_contact, ticket_contact, website_url, ticket_url, image_url, image_alt, description, start_date, end_date)\n"
        "VALUES\n" + ",\n".join(setec_values) + ";\n"
    )

    lines.append("-- 4-2. Exhibitions (Regional schedule) --------------------------------")
    expo_values: List[str] = []
    for row in expo_rows:
        if row["venue"] in ("세텍(SETEC)", "코엑스(COEX)"):
            continue
        venue_label = VENUE_LABEL_MAP.get(row["venue"])
        if not venue_label:
            continue
        venue_id = VENUE_IDS[venue_label]
        expo_values.append(
            "    ({venue_id}, NULL, {source}, {title}, NULL, 'Exhibition', '일반 전시', NULL, NULL, NULL, {organizer}, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, {start}, {end})".format(
                venue_id=venue_id,
                source=sql_value(row["expo_id"]),
                title=sql_value(row["title"]),
                organizer=sql_value(row.get("organizer")),
                start=sql_value(row["start_date"]),
                end=sql_value(row.get("end_date") or row["start_date"]),
            )
        )
    lines.append(
        "INSERT INTO exhibitions (venue_id, company_id, source_event_id, title, subtitle, category, classification, sector, hall_location, admission_fee, organizer, host, contact_info, group_contact, ticket_contact, website_url, ticket_url, image_url, image_alt, description, start_date, end_date)\n"
        "VALUES\n" + ",\n".join(expo_values) + ";\n"
    )

    lines.append("-- 5. Events --------------------------------------------------------------")
    event_values = [
        "    ({company}, (SELECT id FROM exhibitions WHERE title = {title} AND start_date = {start_date}), {event_name}, {event_type}, {booth}, {location}, {start}, {end}, {start_time}, {end_time}, {description}, {method}, {benefits}, {image}, {unsplash}, {has_custom}, {categories})".format(
            company=company_ref(event["company"]),
            title=sql_value(event["exhibition_title"]),
            start_date=sql_value(event["exhibition_start"]),
            event_name=sql_value(event["event_name"]),
            event_type=sql_value(event["event_type"]),
            booth=sql_value(event["booth_number"]),
            location=sql_value(event["location"]),
            start=sql_value(event["start_date"]),
            end=sql_value(event["end_date"]),
            start_time=sql_value(event["start_time"]),
            end_time=sql_value(event["end_time"]),
            description=sql_value(event["description"]),
            method=sql_value(event["participation_method"]),
            benefits=sql_value(event["benefits"]),
            image=sql_value(event["image_url"]),
            unsplash=sql_value(event.get("unsplash_image_url")),
            has_custom=bool_literal(default_has_custom_image(event)),
            categories=json_literal(event["categories"]),
        )
        for event in events
    ]
    lines.append(
        "INSERT INTO events (company_id, exhibition_id, event_name, event_type, booth_number, location, start_date, end_date, start_time, end_time, description, participation_method, benefits, image_url, unsplash_image_url, has_custom_image, categories)\n"
        "VALUES\n" + ",\n".join(event_values) + ";\n"
    )

    lines.append("-- 6. Exhibition company sync -------------------------------------------")
    lines.append(
        "UPDATE exhibitions SET company_id = e.company_id\n"
        "FROM events e\n"
        "WHERE e.exhibition_id = exhibitions.id\n"
        "  AND exhibitions.company_id IS NULL;\n"
    )

    lines.append("-- 7. Event Managers ------------------------------------------------------")
    manager_values = [
        "    ((SELECT id FROM events WHERE event_name = {event_name}), {name}, {phone}, {email}, {position}, {department}, {notes}, TRUE, 1)".format(
            event_name=sql_value(event["event_name"]),
            name=sql_value(event["manager"]["manager_name"]),
            phone=sql_value(event["manager"]["manager_phone"]),
            email=sql_value(event["manager"]["manager_email"]),
            position=sql_value(event["manager"]["manager_position"]),
            department=sql_value(event["manager"]["manager_department"]),
            notes=sql_value(event["manager"]["notes"]),
        )
        for event in events
    ]
    lines.append(
        "INSERT INTO event_managers (event_id, manager_name, manager_phone, manager_email, manager_position, manager_department, notes, is_primary, added_by)\n"
        "VALUES\n" + ",\n".join(manager_values) + ";\n"
    )

    lines.append("-- 8. Tags ----------------------------------------------------------------")
    tag_set = sorted({tag for event in events for tag in event["tag_names"]})
    tag_values = [
        "    ({name}, {color})".format(
            name=sql_value(tag),
            color=sql_value(TAG_COLORS.get(tag, "#888888")),
        )
        for tag in tag_set
    ]
    lines.append(
        "INSERT INTO tags (name, color)\nVALUES\n" + ",\n".join(tag_values) + ";\n"
    )

    lines.append("-- 9. Event Tags ----------------------------------------------------------")
    event_tag_values = [
        "    ((SELECT id FROM events WHERE event_name = {event_name}), (SELECT id FROM tags WHERE name = {tag}))".format(
            event_name=sql_value(event["event_name"]),
            tag=sql_value(tag)
        )
        for event in events
        for tag in event["tag_names"]
    ]
    lines.append(
        "INSERT INTO event_tags (event_id, tag_id)\nVALUES\n" + ",\n".join(event_tag_values) + ";\n"
    )

    lines.append("-- 10. Surveys ------------------------------------------------------------")
    survey_values = [
        "    ((SELECT id FROM events WHERE event_name = {event_name}), {title}, {description}, {questions}, TRUE, {require_email}, {require_phone}, {max_responses}, {current_responses}, {start_ts}, {end_ts})".format(
            event_name=sql_value(event["event_name"]),
            title=sql_value(event["survey"]["title"]),
            description=sql_value(event["survey"]["description"]),
            questions=json_literal(event["survey"]["questions"]),
            require_email="TRUE" if event["survey"]["require_email"] else "FALSE",
            require_phone="TRUE" if event["survey"]["require_phone"] else "FALSE",
            max_responses=event["survey"]["max_responses"],
            current_responses=len(event["responses"]),
            start_ts=sql_value(event["start_date"] + " 09:00:00+09"),
            end_ts=sql_value(event["end_date"] + " 23:59:00+09"),
        )
        for event in events
    ]
    lines.append(
        "INSERT INTO surveys (event_id, title, description, questions, is_active, require_email, require_phone, max_responses, current_responses, start_date, end_date)\n"
        "VALUES\n" + ",\n".join(survey_values) + ";\n"
    )

    lines.append("-- 11. Survey Responses ---------------------------------------------------")
    response_values = [
        "    ((SELECT id FROM surveys WHERE title = {survey_title}), {name}, {email}, {phone}, {company}, {booth}, {answers}, {rating}, {review}, {ip}, {user_agent}, {submitted})".format(
            survey_title=sql_value(event["survey"]["title"]),
            name=sql_value(response["respondent_name"]),
            email=sql_value(response["respondent_email"]),
            phone=sql_value(response["respondent_phone"]),
            company=sql_value(response["respondent_company"]),
            booth=sql_value(response["booth_number"]),
            answers=json_literal(response["answers"]),
            rating=response["rating"],
            review=sql_value(response["review"]),
            ip=sql_value(response["ip_address"]),
            user_agent=sql_value(response["user_agent"]),
            submitted=sql_value(response["submitted_at"]),
        )
        for event in events
        for response in event["responses"]
    ]
    lines.append(
        "INSERT INTO survey_responses (survey_id, respondent_name, respondent_email, respondent_phone, respondent_company, booth_number, answers, rating, review, ip_address, user_agent, submitted_at)\n"
        "VALUES\n" + ",\n".join(response_values) + ";\n"
    )

    lines.append("-- 12. Sequence alignment --------------------------------------------------")
    lines.extend(
        [
            "SELECT setval(pg_get_serial_sequence('admins', 'id'), COALESCE((SELECT MAX(id) FROM admins), 1), TRUE);",
            "SELECT setval(pg_get_serial_sequence('venues', 'id'), COALESCE((SELECT MAX(id) FROM venues), 1), TRUE);",
            "SELECT setval(pg_get_serial_sequence('companies', 'id'), COALESCE((SELECT MAX(id) FROM companies), 1), TRUE);",
            "SELECT setval(pg_get_serial_sequence('exhibitions', 'id'), COALESCE((SELECT MAX(id) FROM exhibitions), 1), TRUE);",
            "SELECT setval(pg_get_serial_sequence('events', 'id'), COALESCE((SELECT MAX(id) FROM events), 1), TRUE);",
            "SELECT setval(pg_get_serial_sequence('tags', 'id'), COALESCE((SELECT MAX(id) FROM tags), 1), TRUE);",
            "SELECT setval(pg_get_serial_sequence('event_managers', 'id'), COALESCE((SELECT MAX(id) FROM event_managers), 1), TRUE);",
            "SELECT setval(pg_get_serial_sequence('surveys', 'id'), COALESCE((SELECT MAX(id) FROM surveys), 1), TRUE);",
            "SELECT setval(pg_get_serial_sequence('survey_responses', 'id'), COALESCE((SELECT MAX(id) FROM survey_responses), 1), TRUE);",
            "SELECT setval(pg_get_serial_sequence('event_likes', 'id'), COALESCE((SELECT MAX(id) FROM event_likes), 1), TRUE);",
            "SELECT setval(pg_get_serial_sequence('event_views', 'id'), COALESCE((SELECT MAX(id) FROM event_views), 1), TRUE);",
        ]
    )

    lines.append("\nCOMMIT;\n")
    lines.append("SELECT 'Seed data inserted successfully!' AS status;\n")

    return "\n".join(lines)


def main() -> None:
    coex_rows = build_coex_rows()
    setec_rows = load_setec()
    expo_rows = load_expo()
    events = prepare_events()
    seed_sql = build_seed(coex_rows, setec_rows, expo_rows, events)
    SEED_SQL.write_text(seed_sql, encoding="utf-8")
    print(f"Wrote seed.sql with {seed_sql.count(chr(10)) + 1} lines")


if __name__ == "__main__":
    main()
