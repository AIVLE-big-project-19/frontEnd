# 태양광 후보지 AI 추천 업로드 - 테스트 페이지

## 배경

백엔드에 "지자체 유휴재산 엑셀 업로드 → AI 추천 결과 조회" 기능(`POST /recommendations`, `GET /recommendations/{id}`)이 구현되었다. 이 기능을 프론트엔드에서 수동으로 호출해 확인할 수 있는 테스트 전용 페이지가 필요하다. 디자인 완성도는 목표가 아니며, 실제 API 호출과 상태 전이에 따른 화면 변화가 동작하는 것이 목표다.

## 범위

- 신규 페이지 1개 (`/test/recommendations`)만 추가한다. 기존 페이지는 수정하지 않는다.
- 예외: `Header.jsx`에 테스트 페이지로 가는 임시 내비게이션 링크 1줄 추가.

## API 연동

### `src/api/recommendationApi.js` (신규)

- `uploadRecommendation(file, limit)`
  - `POST /recommendations` (multipart/form-data, `file` 필드) + query param `limit`
  - `instance.post(..., { skipErrorModal: true })` — 실패 시 전역 에러 토스트 대신 페이지 내부에서 `message`를 직접 보여준다.
  - 반환: `data.data` (`{ id, status }`)
- `fetchRecommendation(id)`
  - `GET /recommendations/{id}`
  - `skipErrorModal: true`
  - 반환: `data.data` (`{ id, status, stage, funnel, recommendations, errorMessage }`)

기존 `dashboardApi.js`와 동일한 axios 인스턴스(`src/api/axiosInstance.js`)를 사용한다. baseURL은 `/api`이며 vite dev 서버 프록시가 `http://localhost:8080`으로 전달하므로 별도 환경변수 설정 없이 동작한다.

## 페이지: `src/pages/RecommendationTestPage.jsx` (신규)

`Layout` 컴포넌트로 감싼다 (다른 페이지들과 동일 패턴).

### 상태 머신

`idle → uploading → polling(QUEUED/RUNNING) → done | failed`, 업로드 자체가 실패하면 `uploadError`로 전이 후 `idle`로 복귀 가능해야 한다(재시도 가능하게).

### UI 흐름

1. **입력 폼**: 파일 input(`accept=".xlsx,.xls"`) + limit 숫자 입력(기본값 3) + "분석하기" 버튼.
2. **업로드**: 버튼 클릭 시 `uploadRecommendation` 호출.
   - 성공: 응답의 `id`를 저장하고 폴링 시작.
   - 실패(400/422/502 등): 응답 `message`를 화면에 표시. 폼은 다시 조작 가능한 상태로 남는다.
3. **폴링**: `id`가 있는 동안 15초 간격으로 `fetchRecommendation(id)` 호출.
   - `QUEUED` / `RUNNING`: "진행 중... (stage: {stage})" 표시. `stage`가 없으면 stage 없이 상태만 표시. 계속 폴링.
   - `DONE`: 폴링 중단. `funnel` 객체를 `<pre>`로 표시. `recommendations`를 정렬 후 카드 리스트로 렌더링.
   - `FAILED`: 폴링 중단. `errorMessage`를 화면에 표시.
4. **정리**: 컴포넌트 언마운트 또는 새 업로드 시작 시 기존 인터벌을 `clearInterval`로 정리한다.

### 추천 목록 정렬 및 표시

- 정렬 기준: `2_scores_and_evaluation.total_score` 내림차순. `total_score`가 `null`인 항목(BUILDING형, ML 모델 미지원)은 항상 목록 맨 뒤에 배치.
- 카드 표시 항목: 주소(`1_site_info.address`), 등급(`2_scores_and_evaluation.grade`), 총점(`2_scores_and_evaluation.total_score`), 상태(`2_scores_and_evaluation.status`).
  - BUILDING형처럼 `grade`/`total_score`가 `null`인 경우 "분석 대기"로 표시.
- 각 카드 하단에 해당 항목 전체 JSON을 `<pre>`로 펼쳐 볼 수 있게 한다 (접기/펼치기 불필요, 항상 노출로 단순하게 처리).

### 에러 처리

- 업로드/폴링 요청이 네트워크 레벨에서 실패하는 경우(응답 자체가 없는 경우), "요청 실패: {error.message}" 형태로 화면에 표시한다. 재시도 로직은 없다 (사용자가 버튼을 다시 눌러야 함).

## 라우팅

- `src/router/AppRouter.jsx`에 `<Route path="/test/recommendations" element={<RecommendationTestPage />} />` 추가.
- `src/components/Header.jsx`의 `nav-menu`에 `<Link to="/test/recommendations">추천 테스트</Link>` 추가.

## 테스트 범위

이 페이지는 수동 기능 확인용이므로 자동화 테스트는 작성하지 않는다.
