# 추천 이력 조회 + 위성사진 상세보기 + 디자인 개선

## 배경

기존 `/test/recommendations` 페이지(업로드 → 폴링 → 결과 확인)에 이어, 다음 세 가지를 추가한다:
1. 로그인 사용자가 과거에 업로드했던 추천 작업 이력을 목록으로 조회하고, 항목을 클릭해 상세를 다시 볼 수 있는 기능.
2. 각 추천 후보지 카드에서 "상세보기"를 누르면 해당 주소의 위성사진을 확인할 수 있는 기능.
3. 업로드 폼과 이력 목록 전반의 디자인 개선(기존 프로젝트의 CSS 변수/톤 재사용).

이 문서는 기존 `2026-07-28-recommendation-test-page-design.md` 스펙을 대체하지 않고 확장한다. 새 페이지를 만들지 않고 기존 `RecommendationTestPage.jsx`를 확장한다.

## 범위

- `src/pages/RecommendationTestPage.jsx` 확장 (신규 페이지 아님).
- `src/api/recommendationApi.js`에 이력 조회 함수 추가.
- `src/components/MapView.jsx`에 `height` prop 추가(기존 호출부 하위 호환 유지).
- 신규 CSS 파일 `src/styles/RecommendationTest.css`.
- 다른 페이지는 건드리지 않는다.

## API 연동

### `GET /recommendations/me` (신규 함수: `fetchMyRecommendations`)

- 인증: 로그인 필요 (`Authorization: Bearer ...`는 `axiosInstance.js`의 `attachAuthHeader` 인터셉터가 로그인 상태면 자동 첨부 — 별도 처리 불필요).
- 파라미터 없음. 항상 최근 10건.
- 응답 (로그인 상태, 200):
  ```json
  {
    "success": true,
    "message": "추천 이력 조회 성공",
    "data": [
      { "id": 17, "originalFilename": "대전광역시_유휴공간.xlsx", "status": "DONE", "stage": null, "errorMessage": null, "createdAt": "2026-07-28T14:16:38" }
    ]
  }
  ```
- 비로그인 시 응답 형태(200/success:false 또는 401/403)는 **확정되지 않음** — 프론트는 응답 형태와 무관하게 안전하게 동작해야 한다:
  - 1차 게이트: `useAuth().isLoggedIn`이 `true`일 때만 이 함수를 호출한다. `isLoggedIn`이 `false`면 API를 호출하지 않고 즉시 "로그인 후 확인할 수 있습니다" 안내만 표시한다.
  - 그럼에도 호출이 실패(200+success:false 또는 4xx)하면 catch에서 목록을 빈 배열로 처리하고 조용히 안내 문구를 보여준다 (별도 에러 토스트 없음 — `skipErrorModal: true`).
- `fetchMyRecommendations()`는 `data.data`(배열)를 반환.

### `GET /recommendations/{id}` (기존 `fetchRecommendation`, 변경 없음)

이력 항목 클릭 시 이 함수를 재사용해 상세를 가져온다. 이미 DONE/FAILED인 항목은 1회 호출로 즉시 표시(폴링 불필요), RUNNING/QUEUED면 기존 폴링 로직을 재개한다.

### 위성사진 — 기존 `fetchMapSearch` + `/api/vworld-key` 재사용

- `src/api/mapApi.jsx`의 `fetchMapSearch(keyword)`로 주소를 지오코딩해 좌표(`point.x`, `point.y`)를 얻는다 (기존 `DashboardPage.jsx`의 `selectSearchResult`와 동일 패턴).
- VWorld API 키는 기존 `DashboardPage.jsx`와 동일하게 `fetch('/api/vworld-key')`로 가져온다.
- 지오코딩 결과가 없거나 실패하면 "위성사진을 불러올 수 없습니다" 안내로 대체한다.

## 페이지 확장: `src/pages/RecommendationTestPage.jsx`

### 공통 함수로 리팩터링: `trackJob(id)`

기존 `handleUpload`에 있던 "즉시 1회 조회 + 15초 간격 폴링 시작" 로직을 `trackJob(id)` 함수로 추출한다. `handleUpload`(새 업로드 성공 시)와 이력 항목 클릭 핸들러 양쪽에서 이 함수를 호출한다.

- `trackJob(id)`는 상태를 초기화(`funnel`/`recommendations`/`errorMessage`/`stage`를 리셋)하고 `setJobId(id)` 후 1회 조회를 수행한다.
- 조회 결과가 이미 DONE 또는 FAILED면 그대로 표시하고 폴링을 시작하지 않는다.
- 조회 결과가 RUNNING/QUEUED면 기존과 동일하게 15초 간격 폴링을 시작한다.
- 새로운 `trackJob` 호출은 항상 먼저 기존 폴링을 정지(`stopPolling`)한 뒤 시작한다 (이력 항목을 연달아 클릭해도 폴링이 중첩되지 않도록).

### 내 이력 섹션 (업로드 폼 아래, 결과 섹션 위)

- `useAuth()`에서 `isLoggedIn`을 가져온다.
- `isLoggedIn`이 `false`: "로그인 후 확인할 수 있습니다." 안내만 표시.
- `isLoggedIn`이 `true`:
  - 페이지 마운트 시 `fetchMyRecommendations()` 호출해 `history` 상태에 저장.
  - 업로드가 성공적으로 큐에 등록된 직후, 그리고 `trackJob`으로 추적 중이던 작업이 DONE 또는 FAILED에 도달한 직후에 목록을 다시 불러온다.
  - 각 항목: 파일명(`originalFilename`) + 상태 배지(`status`, 색상: DONE=teal, FAILED=red, RUNNING/QUEUED=amber) + 생성일시(`createdAt`을 `toLocaleString('ko-KR')`로 포맷). `status === 'FAILED'`면 `errorMessage`를 작은 글씨로 함께 표시.
  - 항목 클릭 시 `trackJob(item.id)` 호출.

### 추천 카드별 "상세보기" (위성사진)

- 각 추천 카드(현재 `recommendations.map(...)` 블록)에 "상세보기" 버튼을 추가한다.
- 카드별로 `satelliteState`(`idle | loading | loaded | error`)와 좌표를 로컬 상태(예: 카드 인덱스를 키로 하는 객체)로 관리한다.
- 클릭 시:
  1. 아직 VWorld API 키를 가져오지 않았으면 `/api/vworld-key`로 가져온다 (카드 간 공유, 페이지 레벨 상태로 1회만 fetch).
  2. `fetchMapSearch(site.address)`로 지오코딩. 결과가 없으면 해당 카드에 "위성사진을 불러올 수 없습니다" 표시.
  3. 성공하면 카드 내부에 `<MapView apiKey={apiKey} setMap={...} height="320px" />`를 렌더링하고, `setMap`으로 받은 지도 인스턴스에 `map.getView().setCenter(fromLonLat([lon, lat]))`, `setZoom(19)`를 적용한다.
- 이미 로드된 카드는 버튼을 다시 눌러도 재요청하지 않고 토글(펼치기/접기)한다.
- JSON 원본(`<pre>{JSON.stringify(item, null, 2)}</pre>`)은 기존과 동일하게 항상 노출 유지 — 상세보기는 이것과 별개로 위성사진만 추가한다.

## `src/components/MapView.jsx` 변경

- `height` prop 추가, 기본값 `'50vh'`(기존 `DashboardPage.jsx` 호출부는 prop을 넘기지 않으므로 동작 변화 없음).
- 컴포넌트 최상위 `<div>`의 `style={{ width: '100%', height: '50vh' }}`를 `style={{ width: '100%', height }}`로 변경.

## 디자인

- 신규 `src/styles/RecommendationTest.css`, `src/index.css`의 기존 CSS 변수(`--navy-900`, `--teal-600`, `--teal-100`, `--solar-500`, `--slate-*`, `--surface`, `--shadow-soft` 등) 재사용.
- 업로드 폼: 카드형 패널(`--surface` 배경, `--shadow-soft` 그림자, 둥근 모서리).
- 상태 배지: DONE=teal 계열, FAILED=red 계열(프로젝트에 기존 red 변수가 없으면 새로 하나 정의), RUNNING/QUEUED=solar(amber) 계열 배경의 pill 형태.
- 추천 카드: `Dashboard.css`의 `grade-card`/`candidate-list` 톤(둥근 모서리, 그림자, 점수 강조)을 참고해 유사한 느낌으로 맞춘다(그대로 복사하지 않고 이 페이지 전용 클래스로 새로 작성).
- 인라인 `style` 속성은 모두 제거하고 CSS 클래스로 이전한다.
- 반응형/모바일 최적화는 범위 밖 (기능 확인용 페이지라는 성격은 유지).

## 테스트 범위

이 확장도 자동화 테스트는 작성하지 않는다 (기존 스펙과 동일하게 수동 확인용).
