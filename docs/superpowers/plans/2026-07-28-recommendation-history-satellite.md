# 추천 이력 조회 + 위성사진 상세보기 + 디자인 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 `/test/recommendations` 페이지를 확장해 (1) 로그인 사용자의 추천 이력 목록 조회/재조회, (2) 추천 후보지별 "상세보기" 위성사진, (3) 전반적인 디자인 개선을 추가한다.

**Architecture:** 기존 페이지의 업로드+폴링 로직을 `trackJob(id)` 공통 함수로 통합해 새 업로드와 이력 클릭이 같은 경로를 타게 한다. 위성사진은 기존 `MapView`(OpenLayers) + `fetchMapSearch`(지오코딩) + `/api/vworld-key`를 재사용하는 작은 래퍼 컴포넌트로 구현한다. 디자인은 기존 `index.css`의 CSS 변수를 재사용하는 전용 CSS 파일로 처리한다.

**Tech Stack:** React 19, react-router-dom 7, axios, OpenLayers(`ol`), Vite. 기존 `RecommendationTestPage.jsx`(이번 계획으로 확장), `DashboardPage.jsx`의 지도/지오코딩 패턴을 재사용.

## Global Constraints

- 새 페이지를 만들지 않는다 — `src/pages/RecommendationTestPage.jsx`를 확장한다.
- `GET /recommendations/me` 호출은 `useAuth().isLoggedIn`이 `true`일 때만 수행한다 (비로그인 시 API 호출 자체를 하지 않음). 호출이 실패(200+success:false 또는 4xx)해도 조용히 빈 목록으로 처리하고 별도 토스트를 띄우지 않는다 (`skipErrorModal: true`).
- 위성사진은 카드의 "상세보기" 버튼을 눌렀을 때만 온디맨드로 불러온다 (자동 로드 금지). 이미 로드된 카드는 재클릭 시 재요청 없이 펼치기/접기만 토글한다.
- 추천 카드의 원본 JSON(`<pre>{JSON.stringify(item, null, 2)}</pre>`)은 기존과 동일하게 항상 노출 — 상세보기는 위성사진만 추가로 보여주는 것이지 JSON을 감추지 않는다.
- 자동화 테스트는 이번 확장에서도 작성하지 않는다 (수동 확인용 페이지, 기존 스펙과 동일한 방침).
- CSS 클래스 이름은 아래 표를 그대로 사용한다 (Task 3이 JSX에 부여하고, Task 4가 그 이름으로 스타일을 정의한다 — 이름이 어긋나면 스타일이 적용되지 않는다):

| 용도 | 클래스명 |
|---|---|
| 페이지 루트 | `rec-page` |
| 제목(h1) | `rec-title` |
| 업로드 폼 카드 | `rec-upload-card` |
| 업로드 폼 내 필드 줄 | `rec-upload-row` |
| 파일 input | `rec-file-input` |
| limit label | `rec-limit-label` |
| limit input | `rec-limit-input` |
| 제출 버튼 | `rec-submit-button` |
| 상태 텍스트(job id/업로드중/진행중) | `rec-status-line` |
| 에러 텍스트 | `rec-error-text` |
| 이력 섹션 wrapper | `rec-history-section` |
| 이력 섹션 제목(h2) | `rec-history-heading` |
| 이력 없음/비로그인 안내 | `rec-history-empty` |
| 이력 목록(ul) | `rec-history-list` |
| 이력 항목(button) | `rec-history-item` |
| 이력 항목 상단 줄(파일명+배지) | `rec-history-item-main` |
| 이력 파일명 | `rec-history-filename` |
| 이력 생성일시 | `rec-history-date` |
| 이력 실패 사유 | `rec-history-error` |
| 상태 배지 공통 | `rec-status-badge` |
| 상태 배지 완료 | `rec-status-badge--done` |
| 상태 배지 실패 | `rec-status-badge--failed` |
| 상태 배지 진행중 | `rec-status-badge--running` |
| 상태 배지 대기중 | `rec-status-badge--queued` |
| 상태 배지 알 수 없음 | `rec-status-badge--unknown` |
| 결과 섹션 wrapper | `rec-results-section` |
| funnel 블록 | `rec-funnel-block` |
| 추천 카드 목록 | `rec-recommendation-list` |
| 추천 카드 | `rec-recommendation-card` |
| 카드 내 주소 | `rec-recommendation-address` |
| 카드 내 등급/점수/상태 | `rec-recommendation-meta` |
| 상세보기 버튼 | `rec-detail-button` |
| 위성사진 패널 | `rec-satellite-panel` |
| 위성사진 에러 | `rec-satellite-error` |
| JSON 블록 | `rec-json-block` |

---

### Task 1: 이력 조회 API + MapView 높이 커스터마이즈

**Files:**
- Modify: `src/api/recommendationApi.js` (파일 끝에 함수 추가)
- Modify: `src/components/MapView.jsx:8`, `src/components/MapView.jsx:42`

**Interfaces:**
- Produces:
  - `fetchMyRecommendations(): Promise<Array<{ id, originalFilename, status, stage, errorMessage, createdAt }>>`
  - `MapView`의 새 prop `height` (문자열, 기본값 `'50vh'` — 생략 시 기존 호출부와 동일하게 동작)

- [ ] **Step 1: `recommendationApi.js`에 함수 추가**

파일 끝에 다음을 추가한다 (기존 `uploadRecommendation`, `fetchRecommendation`은 그대로 유지):

```js
export const fetchMyRecommendations = async () => {
  const { data } = await instance.get('/recommendations/me', {
    skipErrorModal: true,
  });
  return data.data;
};
```

- [ ] **Step 2: `MapView.jsx`에 `height` prop 추가**

`src/components/MapView.jsx`의 8번째 줄:

```jsx
const MapView = ({ apiKey, mapRef, setMap }) => {
```

를 다음으로 교체:

```jsx
const MapView = ({ apiKey, mapRef, setMap, height = '50vh' }) => {
```

같은 파일의 42번째 줄:

```jsx
  return <div ref={mapElement} style={{ width: '100%', height: '50vh' }} />;
```

를 다음으로 교체:

```jsx
  return <div ref={mapElement} style={{ width: '100%', height }} />;
```

- [ ] **Step 3: 확인**

Run: `npx eslint src/api/recommendationApi.js src/components/MapView.jsx`
Expected: 에러 없음.

`src/pages/DashboardPage.jsx`에서 `<MapView apiKey={apiKey} setMap={setMap} />`처럼 `height`를 넘기지 않는 기존 호출부가 있는지 확인하고(있다면 그대로 둔다), 여전히 `height='50vh'` 기본값으로 동작함을 코드로 확인한다(런타임 확인은 Task 5에서 수행).

- [ ] **Step 4: Commit**

```bash
git add src/api/recommendationApi.js src/components/MapView.jsx
git commit -m "feat: 추천 이력 조회 API 및 MapView 높이 커스터마이즈 추가"
```

---

### Task 2: 위성사진 썸네일 컴포넌트

**Files:**
- Create: `src/components/SatelliteThumbnail.jsx`

**Interfaces:**
- Consumes: Task 1의 `MapView`(`height` prop 지원), `ol/proj`의 `fromLonLat` (기존 프로젝트 의존성, `MapView.jsx`에서 이미 사용 중).
- Produces: `SatelliteThumbnail({ apiKey: string, point: { lon: number, lat: number }, height?: string })` — 기본 default export. `point`가 바뀌면 지도 중심을 재설정한다.

- [ ] **Step 1: 컴포넌트 작성**

`src/components/SatelliteThumbnail.jsx` 전체 내용:

```jsx
import { useEffect, useState } from 'react';
import { fromLonLat } from 'ol/proj';
import MapView from './MapView';

const SatelliteThumbnail = ({ apiKey, point, height = '320px' }) => {
  const [map, setMap] = useState(null);

  useEffect(() => {
    if (!map || !point) return;
    map.getView().setCenter(fromLonLat([point.lon, point.lat]));
    map.getView().setZoom(19);
  }, [map, point]);

  return <MapView apiKey={apiKey} setMap={setMap} height={height} />;
};

export default SatelliteThumbnail;
```

- [ ] **Step 2: 확인**

Run: `npx eslint src/components/SatelliteThumbnail.jsx`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add src/components/SatelliteThumbnail.jsx
git commit -m "feat: 좌표 기반 위성사진 썸네일 컴포넌트(SatelliteThumbnail) 추가"
```

---

### Task 3: `RecommendationTestPage.jsx` 확장 (이력 목록 + 위성사진 연동)

**Files:**
- Modify: `src/pages/RecommendationTestPage.jsx` (전체 재작성)

**Interfaces:**
- Consumes:
  - Task 1의 `fetchMyRecommendations()`, 기존 `uploadRecommendation(file, limit)`, `fetchRecommendation(id)` (모두 `src/api/recommendationApi.js`).
  - Task 2의 `SatelliteThumbnail({ apiKey, point, height })` (`src/components/SatelliteThumbnail.jsx`).
  - `src/api/mapApi.jsx`의 `fetchMapSearch(keyword): Promise<{ response: { status: string, result: { items: Array<{ point: { x, y }, address: {...}, title: string }> } } }>` (기존 함수, `DashboardPage.jsx`가 동일하게 사용 중).
  - `src/context/AuthContext.jsx`의 `useAuth()` — `{ isLoggedIn: boolean, ... }`를 반환하는 기존 훅.
  - `/api/vworld-key` (fetch 직접 호출, `DashboardPage.jsx:26`과 동일한 패턴) — 응답 `{ apiKey: string }`.
- Produces: `RecommendationTestPage` default export. Task 4가 이 파일이 사용하는 클래스명(Global Constraints 표)에 맞춰 CSS를 작성한다. 이 파일은 `../styles/RecommendationTest.css`를 import하지만, Task 4 완료 전까지는 해당 CSS 파일이 아직 존재하지 않아 빌드가 깨진다 — Task 3 완료 시점에는 정상 동작하지 않는 것이 예상된 상태이며, Task 4에서 CSS 파일이 생기면 해결된다. **Task 3의 lint/build 확인은 이 CSS import 때문에 실패할 수 있으므로, Task 3에서는 lint만 확인하고 build 확인은 Task 4로 미룬다.**

- [ ] **Step 1: 파일 전체 교체**

`src/pages/RecommendationTestPage.jsx` 전체 내용을 다음으로 교체한다:

```jsx
import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import SatelliteThumbnail from '../components/SatelliteThumbnail';
import { uploadRecommendation, fetchRecommendation, fetchMyRecommendations } from '../api/recommendationApi';
import { fetchMapSearch } from '../api/mapApi';
import { useAuth } from '../context/AuthContext';
import '../styles/RecommendationTest.css';

const POLL_INTERVAL_MS = 15000;

const STATUS_LABEL = { DONE: '완료', FAILED: '실패', RUNNING: '진행 중', QUEUED: '대기 중' };
const STATUS_BADGE_MODIFIER = { DONE: 'done', FAILED: 'failed', RUNNING: 'running', QUEUED: 'queued' };

const sortRecommendations = (list) => {
  return [...list].sort((a, b) => {
    const scoreA = a['2_scores_and_evaluation']?.total_score;
    const scoreB = b['2_scores_and_evaluation']?.total_score;
    if (scoreA == null && scoreB == null) return 0;
    if (scoreA == null) return 1;
    if (scoreB == null) return -1;
    return scoreB - scoreA;
  });
};

const StatusBadge = ({ status }) => {
  const modifier = STATUS_BADGE_MODIFIER[status] || 'unknown';
  return <span className={`rec-status-badge rec-status-badge--${modifier}`}>{STATUS_LABEL[status] || status}</span>;
};

const RecommendationTestPage = () => {
  const { isLoggedIn } = useAuth();

  const [file, setFile] = useState(null);
  const [limit, setLimit] = useState(3);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | uploading | polling | done | failed
  const [stage, setStage] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [history, setHistory] = useState([]);
  const [vworldApiKey, setVworldApiKey] = useState(null);
  const [satelliteByIndex, setSatelliteByIndex] = useState({});
  const intervalRef = useRef(null);

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => () => stopPolling(), []);

  useEffect(() => {
    if (!isLoggedIn) {
      setHistory([]);
      return;
    }
    fetchMyRecommendations()
      .then((items) => setHistory(items || []))
      .catch(() => setHistory([]));
  }, [isLoggedIn]);

  const refreshHistory = async () => {
    if (!isLoggedIn) return;
    try {
      const items = await fetchMyRecommendations();
      setHistory(items || []);
    } catch {
      // 이력 갱신 실패는 조용히 무시하고 기존 목록을 유지한다
    }
  };

  const poll = async (id) => {
    try {
      const data = await fetchRecommendation(id);
      if (data.status === 'RUNNING' || data.status === 'QUEUED') {
        setStatus('polling');
        setStage(data.stage);
        return;
      }
      stopPolling();
      if (data.status === 'DONE') {
        setStatus('done');
        setFunnel(data.funnel);
        setRecommendations(sortRecommendations(data.recommendations || []));
      } else if (data.status === 'FAILED') {
        setStatus('failed');
        setErrorMessage(data.errorMessage);
      } else {
        setStatus('failed');
        setErrorMessage(`예상치 못한 상태: ${data.status}`);
      }
      refreshHistory();
    } catch (error) {
      stopPolling();
      setStatus('failed');
      setErrorMessage(`요청 실패: ${error.message}`);
    }
  };

  const trackJob = (id) => {
    stopPolling();
    setJobId(id);
    setStatus('polling');
    setErrorMessage(null);
    setFunnel(null);
    setRecommendations(null);
    setStage(null);
    setSatelliteByIndex({});
    poll(id);
    intervalRef.current = setInterval(() => poll(id), POLL_INTERVAL_MS);
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!file) return;
    stopPolling();
    setStatus('uploading');
    setErrorMessage(null);
    setJobId(null);

    try {
      const data = await uploadRecommendation(file, limit);
      trackJob(data.id);
      refreshHistory();
    } catch (error) {
      setStatus('idle');
      setErrorMessage(error.response?.data?.message || `요청 실패: ${error.message}`);
    }
  };

  const handleHistoryItemClick = (item) => {
    trackJob(item.id);
  };

  const ensureVworldApiKey = async () => {
    if (vworldApiKey) return vworldApiKey;
    const response = await fetch('/api/vworld-key');
    const data = await response.json();
    setVworldApiKey(data.apiKey);
    return data.apiKey;
  };

  const handleToggleDetail = async (index, address) => {
    const existing = satelliteByIndex[index];
    if (existing?.status === 'loaded') {
      setSatelliteByIndex((prev) => ({
        ...prev,
        [index]: { ...prev[index], expanded: !prev[index].expanded },
      }));
      return;
    }

    setSatelliteByIndex((prev) => ({ ...prev, [index]: { status: 'loading', expanded: true } }));

    try {
      const apiKey = await ensureVworldApiKey();
      const searchData = await fetchMapSearch(address);
      const items = searchData?.response?.status === 'OK' ? searchData.response.result.items : [];
      const firstItem = items[0];
      if (!firstItem?.point?.x || !firstItem?.point?.y) {
        setSatelliteByIndex((prev) => ({ ...prev, [index]: { status: 'error', expanded: true } }));
        return;
      }
      setSatelliteByIndex((prev) => ({
        ...prev,
        [index]: {
          status: 'loaded',
          expanded: true,
          apiKey,
          point: { lon: Number(firstItem.point.x), lat: Number(firstItem.point.y) },
        },
      }));
    } catch {
      setSatelliteByIndex((prev) => ({ ...prev, [index]: { status: 'error', expanded: true } }));
    }
  };

  const isBusy = status === 'uploading' || status === 'polling';

  return (
    <Layout>
      <div className="rec-page">
        <h1 className="rec-title">추천 업로드 테스트</h1>

        <form className="rec-upload-card" onSubmit={handleUpload}>
          <div className="rec-upload-row">
            <input
              className="rec-file-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) => setFile(event.target.files[0] || null)}
            />
          </div>
          <div className="rec-upload-row">
            <label className="rec-limit-label">
              limit:
              <input
                className="rec-limit-input"
                type="number"
                min="1"
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
              />
            </label>
          </div>
          <button className="rec-submit-button" type="submit" disabled={!file || isBusy}>
            분석하기
          </button>
        </form>

        {jobId != null && <p className="rec-status-line">job id: {jobId}</p>}
        {status === 'uploading' && <p className="rec-status-line">업로드 중...</p>}
        {status === 'polling' && (
          <p className="rec-status-line">진행 중... {stage ? `(stage: ${stage})` : ''}</p>
        )}
        {errorMessage && <p className="rec-error-text">{errorMessage}</p>}

        <section className="rec-history-section">
          <h2 className="rec-history-heading">내 추천 이력</h2>
          {!isLoggedIn && <p className="rec-history-empty">로그인 후 확인할 수 있습니다.</p>}
          {isLoggedIn && history.length === 0 && (
            <p className="rec-history-empty">저장된 추천 이력이 없습니다.</p>
          )}
          {isLoggedIn && history.length > 0 && (
            <ul className="rec-history-list">
              {history.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="rec-history-item"
                    onClick={() => handleHistoryItemClick(item)}
                  >
                    <span className="rec-history-item-main">
                      <span className="rec-history-filename">{item.originalFilename}</span>
                      <StatusBadge status={item.status} />
                    </span>
                    <span className="rec-history-date">
                      {new Date(item.createdAt).toLocaleString('ko-KR')}
                    </span>
                    {item.status === 'FAILED' && item.errorMessage && (
                      <span className="rec-history-error">{item.errorMessage}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {status === 'done' && (
          <section className="rec-results-section">
            <h2>Funnel</h2>
            <pre className="rec-funnel-block">{JSON.stringify(funnel, null, 2)}</pre>

            <h2>추천 후보지 ({recommendations.length})</h2>
            <div className="rec-recommendation-list">
              {recommendations.map((item, index) => {
                const site = item['1_site_info'] || {};
                const scores = item['2_scores_and_evaluation'] || {};
                const satellite = satelliteByIndex[index];
                return (
                  <div className="rec-recommendation-card" key={site.site_id || index}>
                    <p className="rec-recommendation-address">
                      <strong>{site.address}</strong> ({item.target_type})
                    </p>
                    <p className="rec-recommendation-meta">
                      등급: {scores.grade ?? '분석 대기'} / 점수: {scores.total_score ?? '분석 대기'} / 상태:{' '}
                      {scores.status}
                    </p>
                    <button
                      type="button"
                      className="rec-detail-button"
                      onClick={() => handleToggleDetail(index, site.address)}
                    >
                      상세보기
                    </button>
                    {satellite?.expanded && (
                      <div className="rec-satellite-panel">
                        {satellite.status === 'loading' && <p>위성사진을 불러오는 중...</p>}
                        {satellite.status === 'error' && (
                          <p className="rec-satellite-error">위성사진을 불러올 수 없습니다.</p>
                        )}
                        {satellite.status === 'loaded' && (
                          <SatelliteThumbnail apiKey={satellite.apiKey} point={satellite.point} />
                        )}
                      </div>
                    )}
                    <pre className="rec-json-block">{JSON.stringify(item, null, 2)}</pre>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
};

export default RecommendationTestPage;
```

- [ ] **Step 2: lint 확인**

Run: `npx eslint src/pages/RecommendationTestPage.jsx`
Expected: `../styles/RecommendationTest.css` 파일이 아직 없어도 ESLint는 이 문제를 잡지 않는다(빌드 타임 이슈이지 lint 이슈가 아님) — JS/JSX 문법과 `react-hooks` 규칙만 통과하면 된다. 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add src/pages/RecommendationTestPage.jsx
git commit -m "feat: 추천 이력 목록 및 카드별 위성사진 상세보기 연동"
```

---

### Task 4: 디자인 CSS

**Files:**
- Create: `src/styles/RecommendationTest.css`

**Interfaces:**
- Consumes: Task 3의 JSX가 부여한 클래스명 (Global Constraints 표 전체).
- Produces: 없음 (스타일시트, import만 됨).

- [ ] **Step 1: CSS 파일 작성**

`src/styles/RecommendationTest.css` 전체 내용:

```css
.rec-page {
  padding: 40px 24px;
  max-width: 960px;
  margin: 0 auto;
}

.rec-title {
  color: var(--navy-900);
  margin-bottom: 24px;
}

.rec-upload-card {
  background: var(--surface);
  border-radius: 12px;
  box-shadow: var(--shadow-soft);
  padding: 24px;
  margin-bottom: 24px;
}

.rec-upload-row {
  margin-bottom: 12px;
}

.rec-limit-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--slate-700);
}

.rec-limit-input {
  width: 70px;
  padding: 6px 8px;
  border: 1px solid var(--slate-300);
  border-radius: 6px;
}

.rec-submit-button {
  background: var(--teal-600);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-weight: 600;
  cursor: pointer;
}

.rec-submit-button:disabled {
  background: var(--slate-300);
  cursor: not-allowed;
}

.rec-status-line {
  color: var(--slate-500);
  margin: 8px 0;
}

.rec-error-text {
  color: #dc2626;
  margin: 8px 0;
}

.rec-history-section {
  background: var(--surface);
  border-radius: 12px;
  box-shadow: var(--shadow-soft);
  padding: 24px;
  margin-bottom: 24px;
}

.rec-history-heading {
  color: var(--navy-900);
  margin-bottom: 12px;
}

.rec-history-empty {
  color: var(--slate-500);
}

.rec-history-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rec-history-item {
  width: 100%;
  text-align: left;
  background: var(--surface-soft);
  border: 1px solid var(--slate-200);
  border-radius: 8px;
  padding: 12px 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rec-history-item:hover {
  border-color: var(--teal-600);
}

.rec-history-item-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rec-history-filename {
  font-weight: 600;
  color: var(--navy-900);
}

.rec-history-date {
  font-size: 13px;
  color: var(--slate-500);
}

.rec-history-error {
  font-size: 13px;
  color: #dc2626;
}

.rec-status-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.rec-status-badge--done {
  background: var(--teal-100);
  color: var(--teal-700);
}

.rec-status-badge--failed {
  background: #fee2e2;
  color: #dc2626;
}

.rec-status-badge--running,
.rec-status-badge--queued {
  background: var(--solar-100);
  color: #92600a;
}

.rec-status-badge--unknown {
  background: var(--slate-100);
  color: var(--slate-500);
}

.rec-results-section {
  background: var(--surface);
  border-radius: 12px;
  box-shadow: var(--shadow-soft);
  padding: 24px;
}

.rec-funnel-block {
  background: var(--surface-soft);
  border-radius: 8px;
  padding: 12px;
  overflow-x: auto;
}

.rec-recommendation-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rec-recommendation-card {
  border: 1px solid var(--slate-200);
  border-radius: 10px;
  padding: 16px;
}

.rec-recommendation-address {
  color: var(--navy-900);
  margin: 0 0 4px;
}

.rec-recommendation-meta {
  color: var(--slate-700);
  margin: 0 0 8px;
}

.rec-detail-button {
  background: var(--navy-800);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  margin-bottom: 8px;
}

.rec-satellite-panel {
  margin-bottom: 12px;
  border-radius: 8px;
  overflow: hidden;
}

.rec-satellite-error {
  color: #dc2626;
  font-size: 13px;
}

.rec-json-block {
  background: var(--surface-soft);
  border-radius: 8px;
  padding: 12px;
  overflow-x: auto;
  font-size: 12px;
  max-height: 320px;
  overflow-y: auto;
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npm run build`
Expected: 에러 없이 빌드 성공 (Task 3에서 미뤄둔 CSS import 문제가 여기서 해결됨을 확인).

- [ ] **Step 3: Commit**

```bash
git add src/styles/RecommendationTest.css
git commit -m "style: 추천 테스트 페이지 디자인(RecommendationTest.css) 추가"
```

---

### Task 5: 수동 동작 확인

**Files:** 없음 (검증 전용 태스크)

- [ ] **Step 1: 빌드 & lint 확인**

Run: `npm run build`
Expected: 에러 없이 빌드 성공.

- [ ] **Step 2: 개발 서버 기동 및 페이지 접근**

Run: `npm run dev`
브라우저에서 `/test/recommendations` 접속.
Expected:
- 업로드 폼, "내 추천 이력" 섹션이 카드형 디자인으로 표시됨.
- 비로그인 상태: 이력 섹션에 "로그인 후 확인할 수 있습니다." 표시, `GET /recommendations/me` 요청이 발생하지 않음(네트워크 탭으로 확인).

- [ ] **Step 3: 로그인 상태에서 이력 확인 (계정 필요)**

로그인 후 페이지 재방문.
Expected: `GET /recommendations/me` 요청 발생, 이력이 있으면 목록에 파일명+상태 배지+생성일시로 표시. 이력이 없으면 "저장된 추천 이력이 없습니다." 표시.

- [ ] **Step 4: 이력 항목 클릭 → 상세 재조회**

이력 항목(있는 경우) 클릭.
Expected: 해당 `id`로 상세가 즉시 조회됨. 이미 DONE/FAILED인 항목은 폴링 없이 바로 결과/에러가 표시되고, RUNNING/QUEUED면 폴링이 재개됨.

- [ ] **Step 5: 업로드 → 이력 갱신 확인**

파일 업로드 후 완료(DONE 또는 FAILED)까지 대기 (백엔드 필요).
Expected: 업로드 직후 및 작업이 DONE/FAILED에 도달한 직후 이력 목록에 새 항목이 나타나거나 상태가 갱신됨.

- [ ] **Step 6: 위성사진 상세보기 확인**

DONE 상태의 추천 카드에서 "상세보기" 클릭.
Expected: "위성사진을 불러오는 중..." 표시 후 위성 지도가 카드 안에 렌더링되거나(주소 지오코딩 성공), 실패 시 "위성사진을 불러올 수 없습니다." 표시. 같은 카드를 다시 클릭하면 재요청 없이 접힘/펼침만 토글됨(네트워크 탭으로 재요청 없음을 확인).

- [ ] **Step 7: 최종 상태 보고**

`git log --oneline -6`과 `git status`로 커밋 이력과 작업 트리 상태를 확인하고 결과를 사용자에게 보고한다. 백엔드/로그인 계정 제약으로 실행하지 못한 단계가 있으면 명시한다.
