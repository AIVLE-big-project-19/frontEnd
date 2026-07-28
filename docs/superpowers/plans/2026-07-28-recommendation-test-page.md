# 추천 업로드 테스트 페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 지자체 유휴재산 엑셀 업로드 → AI 추천 결과 조회 API를 수동으로 확인할 수 있는 테스트 전용 페이지 `/test/recommendations`를 추가한다.

**Architecture:** 기존 axios 인스턴스(`src/api/axiosInstance.js`)를 재사용하는 얇은 API 모듈 하나와, 업로드 → 폴링 → 결과 렌더링의 상태 머신을 담은 페이지 컴포넌트 하나로 구성한다. 라우터와 헤더에 각각 한 줄씩 추가해 접근 가능하게 만든다.

**Tech Stack:** React 19, react-router-dom 7, axios 1.x, Vite. 기존 `dashboardApi.js` / `TestPage.jsx` 패턴을 따른다.

## Global Constraints

- Base URL: `/api` (vite dev 서버가 `http://localhost:8080`로 프록시, 별도 설정 불필요).
- 인증 불필요 — 별도 헤더/토큰 처리 없음.
- 폴링 간격: 15초.
- 정렬 기준: `2_scores_and_evaluation.total_score` 내림차순, `null`(BUILDING형)은 항상 맨 뒤.
- 자동화 테스트는 작성하지 않는다 (스펙에서 명시적으로 범위 제외, 수동 확인용 페이지).
- 신규 파일만 추가하고 기존 페이지는 수정하지 않는다. 예외: `AppRouter.jsx`(라우트 1줄), `Header.jsx`(링크 1줄).

---

### Task 1: 추천 API 모듈

**Files:**
- Create: `src/api/recommendationApi.js`

**Interfaces:**
- Consumes: `src/api/axiosInstance.js`의 default export (`instance`) — `instance.post(url, body, config)`, `instance.get(url, config)`가 `Promise<{ data: { success, message, data } }>`를 반환.
- Produces:
  - `uploadRecommendation(file: File, limit: number): Promise<{ id: number, status: string }>`
  - `fetchRecommendation(id: number): Promise<{ id, status, stage, funnel, recommendations, errorMessage }>`
  - 두 함수 모두 실패 시 axios 에러를 그대로 throw (interceptor가 `skipErrorModal: true`이므로 전역 토스트는 띄우지 않음).

- [ ] **Step 1: 파일 작성**

`src/api/recommendationApi.js` 전체 내용:

```js
import instance from './axiosInstance';

export const uploadRecommendation = async (file, limit) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await instance.post('/recommendations', formData, {
    params: { limit },
    skipErrorModal: true,
  });
  return data.data;
};

export const fetchRecommendation = async (id) => {
  const { data } = await instance.get(`/recommendations/${id}`, {
    skipErrorModal: true,
  });
  return data.data;
};
```

- [ ] **Step 2: lint 확인**

Run: `npm run lint -- src/api/recommendationApi.js`
Expected: 에러 없음 (경고만 있다면 기존 코드 스타일과 비교해 판단).

- [ ] **Step 3: Commit**

```bash
git add src/api/recommendationApi.js
git commit -m "feat: 추천 업로드/조회 API 모듈 추가"
```

---

### Task 2: 추천 테스트 페이지 컴포넌트

**Files:**
- Create: `src/pages/RecommendationTestPage.jsx`

**Interfaces:**
- Consumes:
  - `src/components/Layout.jsx`의 default export (`Layout`, children을 감싸는 컴포넌트 — `TestPage.jsx`에서 쓰는 것과 동일한 방식).
  - Task 1에서 만든 `uploadRecommendation(file, limit)`, `fetchRecommendation(id)`.
- Produces: `RecommendationTestPage` (default export), Task 3에서 라우터가 import.

- [ ] **Step 1: 컴포넌트 파일 작성**

`src/pages/RecommendationTestPage.jsx` 전체 내용:

```jsx
import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import { uploadRecommendation, fetchRecommendation } from '../api/recommendationApi';

const POLL_INTERVAL_MS = 15000;

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

const RecommendationTestPage = () => {
  const [file, setFile] = useState(null);
  const [limit, setLimit] = useState(3);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | uploading | polling | done | failed
  const [stage, setStage] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const intervalRef = useRef(null);

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => () => stopPolling(), []);

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
      }
    } catch (error) {
      stopPolling();
      setStatus('failed');
      setErrorMessage(`요청 실패: ${error.message}`);
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!file) return;
    stopPolling();
    setStatus('uploading');
    setErrorMessage(null);
    setFunnel(null);
    setRecommendations(null);
    setStage(null);

    try {
      const data = await uploadRecommendation(file, limit);
      setJobId(data.id);
      setStatus('polling');
      poll(data.id);
      intervalRef.current = setInterval(() => poll(data.id), POLL_INTERVAL_MS);
    } catch (error) {
      setStatus('idle');
      setErrorMessage(error.response?.data?.message || `요청 실패: ${error.message}`);
    }
  };

  const isBusy = status === 'uploading' || status === 'polling';

  return (
    <Layout>
      <div style={{ padding: '30px', maxWidth: '900px', margin: '0 auto' }}>
        <h1>추천 업로드 테스트</h1>

        <form onSubmit={handleUpload}>
          <div>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) => setFile(event.target.files[0] || null)}
            />
          </div>
          <div style={{ marginTop: '10px' }}>
            <label>
              limit:
              <input
                type="number"
                min="1"
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
                style={{ marginLeft: '8px', width: '60px' }}
              />
            </label>
          </div>
          <button type="submit" disabled={!file || isBusy} style={{ marginTop: '10px' }}>
            분석하기
          </button>
        </form>

        {jobId != null && <p>job id: {jobId}</p>}
        {status === 'uploading' && <p>업로드 중...</p>}
        {status === 'polling' && <p>진행 중... {stage ? `(stage: ${stage})` : ''}</p>}
        {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}

        {status === 'done' && (
          <div>
            <h2>Funnel</h2>
            <pre>{JSON.stringify(funnel, null, 2)}</pre>

            <h2>추천 후보지 ({recommendations.length})</h2>
            {recommendations.map((item, index) => {
              const site = item['1_site_info'] || {};
              const scores = item['2_scores_and_evaluation'] || {};
              return (
                <div
                  key={site.site_id || index}
                  style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}
                >
                  <p>
                    <strong>{site.address}</strong> ({item.target_type})
                  </p>
                  <p>
                    등급: {scores.grade ?? '분석 대기'} / 점수: {scores.total_score ?? '분석 대기'} / 상태:{' '}
                    {scores.status}
                  </p>
                  <pre>{JSON.stringify(item, null, 2)}</pre>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default RecommendationTestPage;
```

- [ ] **Step 2: lint 확인**

Run: `npm run lint -- src/pages/RecommendationTestPage.jsx`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add src/pages/RecommendationTestPage.jsx
git commit -m "feat: 추천 업로드 테스트 페이지 컴포넌트 추가"
```

---

### Task 3: 라우팅 연결

**Files:**
- Modify: `src/router/AppRouter.jsx`
- Modify: `src/components/Header.jsx`

**Interfaces:**
- Consumes: Task 2의 `RecommendationTestPage` default export.

- [ ] **Step 1: AppRouter.jsx에 라우트 추가**

`src/router/AppRouter.jsx`를 다음과 같이 수정 (import 추가 + Route 추가):

```jsx
import { Routes, Route } from "react-router-dom";

import MainMapPage from "../pages/MainPage";
import BoardListPage from "../pages/BoardListPage";
import BoardDetailPage from "../pages/BoardDetailPage";
import BoardWritePage from "../pages/BoardWritePage";
import BoardEditPage from "../pages/BoardEditPage";
import AdminUsersPage from "../pages/AdminUsersPage";
import RecommendationTestPage from "../pages/RecommendationTestPage";

function AppRouter() {
    return (
        <Routes>
            <Route path="/" element={<MainMapPage />} />
            <Route path="/boards" element={<BoardListPage />} />
            <Route path="/boards/write" element={<BoardWritePage />} />
            <Route path="/boards/:boardId/edit" element={<BoardEditPage />} />
            <Route path="/boards/:boardId" element={<BoardDetailPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/test/recommendations" element={<RecommendationTestPage />} />
        </Routes>
    );
}

export default AppRouter;
```

- [ ] **Step 2: Header.jsx에 임시 링크 추가**

`src/components/Header.jsx`의 `nav-menu` 블록을 다음과 같이 수정 (`Vision AI 분석` 링크 뒤에 한 줄 추가):

```jsx
    <nav className="nav-menu">
      <Link to="/" onClick={refreshIfCurrent('/')}>홈</Link>
      <Link to="/boards?category=공지사항" onClick={refreshIfCurrent('/boards?category=공지사항')}>게시판</Link>
      <Link to="/dashboard" onClick={refreshIfCurrent('/dashboard')}>통합 대시보드</Link>
      <a href="#vision-ai" onClick={refreshHashIfCurrent('#vision-ai')}>Vision AI 분석</a>
      <Link to="/test/recommendations" onClick={refreshIfCurrent('/test/recommendations')}>추천 테스트</Link>
    </nav>
```

- [ ] **Step 3: lint 확인**

Run: `npm run lint`
Expected: 에러 없음 (프로젝트 전체 대상, 이번 변경으로 새 에러가 생기지 않았는지 확인).

- [ ] **Step 4: Commit**

```bash
git add src/router/AppRouter.jsx src/components/Header.jsx
git commit -m "feat: 추천 테스트 페이지 라우트 및 헤더 링크 연결"
```

---

### Task 4: 수동 동작 확인

**Files:** 없음 (검증 전용 태스크)

- [ ] **Step 1: 빌드 확인**

Run: `npm run build`
Expected: 에러 없이 빌드 성공 (타입/구문 오류 없음을 확인).

- [ ] **Step 2: 개발 서버 기동**

Run: `npm run dev`
Expected: 콘솔에 로컬 URL(예: `http://localhost:5173`) 출력.

- [ ] **Step 3: 페이지 접근 확인 (백엔드 없이)**

브라우저에서 `http://localhost:5173/test/recommendations` 접속, 또는 헤더의 "추천 테스트" 링크 클릭.
Expected: "추천 업로드 테스트" 제목, 파일 입력, limit 입력(기본값 3), "분석하기" 버튼이 보임. 파일을 선택하지 않으면 버튼이 비활성 상태.

- [ ] **Step 4: 백엔드 연동 확인 (백엔드가 `localhost:8080`에서 떠 있는 경우)**

지자체 유휴재산 엑셀 파일(.xlsx)을 선택하고 "분석하기" 클릭.
Expected:
- 업로드 성공 시 `job id: {id}`와 "진행 중... (stage: ...)" 표시.
- 15초 간격으로 상태가 갱신됨 (네트워크 탭에서 `GET /api/recommendations/{id}` 호출 확인).
- `status`가 `DONE`이 되면 폴링이 멈추고 Funnel JSON과 추천 후보지 카드 목록이 `total_score` 내림차순으로 표시됨.
- `status`가 `FAILED`가 되면 폴링이 멈추고 `errorMessage`가 빨간 글씨로 표시됨.
- 잘못된 파일(.txt 등) 업로드 시 백엔드가 내려주는 `message`가 빨간 글씨로 표시됨.

백엔드가 떠 있지 않다면 이 단계는 생략하고, Step 3까지의 확인 결과만 보고한다.

- [ ] **Step 5: 최종 상태 보고**

`git log --oneline -5`와 `git status`로 커밋 이력과 작업 트리 상태를 확인하고 결과를 사용자에게 보고한다.
