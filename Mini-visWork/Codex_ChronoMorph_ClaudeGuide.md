# ChronoMorph Scroll Opera · Claude Code 프롬프트 가이드
- Created: 2025-11-06T23:10:01+09:00
- Author: Codex

## 1. 목적
- ChronoMorph Scroll Opera 샘플 페이지의 미감(빛 번짐, 스크롤 타임라인, `--glow` 프로퍼티)을 Claude Code CLI 적용용으로 정리한 가이드입니다.
- Claude에게 HTML·CSS 구조를 생성 혹은 유지보수시키고 싶을 때 아래 프롬프트 템플릿을 복붙·가감해서 사용하세요.

## 2. Claude Code 입력용 핵심 메시지
````markdown
당신은 CSS 실험 페이지 ChronoMorph Scroll Opera를 유지·확장하는 프론트엔드 디자이너입니다.

### 스타일 지침
- dark 모드 전용 분위기, 배경: radial gradient 2개 + #040214.
- 텍스트 기본: Pretendard Variable / Inter / Spoqa Han Sans Neo / Noto Sans KR, font-size: clamp(16px, 1.1vw, 18px).
- `--glow` 커스텀 프로퍼티와 `@property`를 계속 사용해 광도 애니메이션을 제어할 것.
- `.scene` 섹션은 최소 높이 120vh, 3D 관객 시점: `transform-style: preserve-3d`, `perspective`는 부모 `.opera`에서 제어.
- 각 `.scene`에 가상 요소 `::before`, `::after`를 유지해 conic-gradient + radial-gradient 조합의 빛 레이어를 제공.
- 스크롤 인터랙션은 `@scroll-timeline`, `animation-range`를 사용해 입장/퇴장 애니메이션을 동기화.
- 접근성: `prefers-reduced-motion` 대응을 유지. 모바일(≤820px)에서 `clamp` 기반 패딩/보더 조정.

### 해야 할 작업
- (예) 새로운 Act V 추가 및 관련 색상 토큰 확장.
- (예) `.meter` 고정 바에 tooltips 추가.

### 산출물
- HTML + CSS를 단일 파일 또는 컴포넌트 구조로 출력.
- 기존 구조를 리팩토링할 경우 요약 설명 포함.
````

## 3. Claude Code 사용 시 흐름
- **Step 1**: Mini-visWork 폴더 열기 → `Codex_ChronoMorph_Sample.html` 확인.
- **Step 2**: 변경점에 맞춰 위 템플릿에서 “해야 할 작업” 섹션을 요구 사항으로 수정.
- **Step 3**: Claude에게 “변경 후 전체 파일 출력” 또는 “패치 형태로 제시” 중 원하는 방식을 명시.
- **Step 4**: 프롬프트 전송 전, “접근성”과 “반응형” 방향성이 포함되었는지 체크.
- **Step 5**: Claude가 제안한 코드 검토 → 필요 시 “`--glow` 스케일을 더 낮춰줘” 등 후속 지시.

## 4. 발전 아이디어
- **Act 조합 확장**: `data-scene` 값에 따라 `--accent-h`, `--accent-l`를 자동 계산하는 CSS 변수 함수 도입.
- **스티키 내비**: `position: sticky` 메뉴를 도입하고 `.scene` 진입 시 `:target`으로 포커스와 메타정보 동기화.
- **Houdini 적용**: 배경 톱니 무늬를 CSS Paint API로 추출하고 Claude에게 `paint(worklet);`을 연결하도록 지시.
- **Fallback 준비**: Scroll-timeline 미지원 환경용으로 순차 페이드 인/아웃 키프레임을 별도 정의하게 부탁.

## 5. 자주 쓰는 확인 질문 (Claude에게)
- “Scroll Timeline을 못 쓰는 브라우저에서는 어떤 fallback을 제공했는가?”
- “`.scene::before`와 `::after`의 blend-mode 조합이 겹칠 때 대비를 어떻게 조정했는가?”
- “`prefers-reduced-motion` 설정이 켜졌을 때 기대 동작은?”
- “모바일 브레이크포인트에서 타이포 계층 구조가 유지되는가?”

이 파일을 Claude Code CLI에 첨부하거나, 프롬프트 작성 전 참고용으로 열어두면 ChronoMorph 스타일을 일관되게 유지하는 데 도움이 됩니다.
