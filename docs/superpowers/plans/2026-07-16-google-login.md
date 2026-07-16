# 구글 로그인 연동 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `LoginPage`에 "Google로 계속하기" 버튼을 추가하고, 구글 OAuth 인가코드 왕복 후 `/oauth/google/callback`에서 로그인을 완료하는 흐름을 구현한다.

**Architecture:** 프론트가 직접 구글 동의화면으로 하드 리다이렉트(`window.location.href`)하고, 구글이 돌려준 `code`를 백엔드 `POST /auth/google/login`에 전달해 `{ accessToken, refreshToken }`을 받는다. 이후 `GET /users/me`로 `loginId`를 조회해 기존 `AuthContext.login()` 패턴에 그대로 태운다.

**Tech Stack:** React 19, react-router-dom v6, axios, vitest + @testing-library/react + @testing-library/user-event.

## Global Constraints

- 스펙 문서: `docs/superpowers/specs/2026-07-16-google-login-design.md` — 모든 태스크는 이 문서의 요구사항을 벗어나지 않는다.
- 기존 함수/패턴과 이름 충돌 없이 `authApi.js`, `AuthPage.css`에 추가만 한다(기존 코드 삭제·리팩터링 없음).
- 각 태스크는 TDD로 진행: 실패하는 테스트 작성 → 실패 확인 → 최소 구현 → 통과 확인 → 커밋.
- 매 태스크 종료 시 `npm test`(전체) 통과를 재확인한다(회귀 방지).
- Google client_id: `1037939180659-dbatbibjsflh7vqh3erf1a8sv31rgdjh.apps.googleusercontent.com` (이미 발급됨, `.env.local`에 저장 — 커밋 금지, `.gitignore`의 `*.local` 패턴이 이미 커버함).

---

### Task 1: `authApi.googleLogin` 함수 추가

**Files:**
- Modify: `src/api/authApi.js` (파일 끝에 추가)
- Test: `src/api/authApi.test.js` (파일 끝에 추가)

**Interfaces:**
- Consumes: 없음 (기존 `instance` axios 인스턴스만 사용)
- Produces: `googleLogin({ code, redirectUri }) => Promise<{ success, message, data: { accessToken, refreshToken } }>` — Task 4(`GoogleCallbackPage`)에서 사용

- [ ] **Step 1: 실패하는 테스트 작성**

`src/api/authApi.test.js` 파일 상단 import에 `googleLogin` 추가:

```js
import instance from './axiosInstance';
import {
  checkLoginId, sendEmailCode, verifyEmailCode, signup, login, logout,
  sendFindIdCode, verifyFindIdCode, sendFindPasswordCode, verifyFindPasswordCode,
  getPasswordResetStatus, resetPassword, googleLogin,
} from './authApi';
```

파일 끝에 추가:

```js
test('googleLogin은 code와 redirectUri를 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok({ accessToken: 'at', refreshToken: 'rt' }));
  const result = await googleLogin({ code: 'auth-code-1', redirectUri: 'http://localhost:5173/oauth/google/callback' });
  expect(instance.post).toHaveBeenCalledWith('/auth/google/login', {
    code: 'auth-code-1',
    redirectUri: 'http://localhost:5173/oauth/google/callback',
  });
  expect(result.data.accessToken).toBe('at');
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- src/api/authApi.test.js`
Expected: FAIL — `googleLogin is not a function` (또는 import 에러)

- [ ] **Step 3: 최소 구현**

`src/api/authApi.js` 파일 끝에 추가:

```js
export const googleLogin = async ({ code, redirectUri }) => {
  const { data } = await instance.post('/auth/google/login', { code, redirectUri });
  return data;
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- src/api/authApi.test.js`
Expected: PASS (전체 테스트 파일, 기존 테스트 포함 모두 통과)

- [ ] **Step 5: 커밋**

```bash
git add src/api/authApi.js src/api/authApi.test.js
git commit -m "feat: 구글 로그인 API 함수(googleLogin) 추가"
```

---

### Task 2: `googleOAuth.js` — 구글 동의화면 URL 생성

**Files:**
- Create: `src/auth/googleOAuth.js`
- Test: `src/auth/googleOAuth.test.js`
- Create: `.env.local` (커밋되지 않음 — `.gitignore`의 `*.local`이 이미 커버)
- Create: `.env.example`

**Interfaces:**
- Consumes: `import.meta.env.VITE_GOOGLE_CLIENT_ID`
- Produces:
  - `buildGoogleRedirectUri() => string` — Task 3(`LoginPage`), Task 4(`GoogleCallbackPage`)에서 사용
  - `buildGoogleAuthUrl() => string` — Task 3(`LoginPage`)에서 사용

- [ ] **Step 1: `.env.local`, `.env.example` 생성**

`.env.local` (프로젝트 루트, 커밋 안 됨):

```
VITE_GOOGLE_CLIENT_ID=1037939180659-dbatbibjsflh7vqh3erf1a8sv31rgdjh.apps.googleusercontent.com
```

`.env.example` (프로젝트 루트, 커밋됨):

```
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
```

- [ ] **Step 2: 실패하는 테스트 작성**

`src/auth/googleOAuth.test.js` 새 파일:

```js
import { buildGoogleRedirectUri, buildGoogleAuthUrl } from './googleOAuth';

beforeEach(() => {
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

test('buildGoogleRedirectUri는 현재 origin 기준 콜백 경로를 반환한다', () => {
  expect(buildGoogleRedirectUri()).toBe('http://localhost:3000/oauth/google/callback');
});

test('buildGoogleAuthUrl은 client_id, redirect_uri, response_type, scope를 포함한 구글 인증 URL을 반환한다', () => {
  const url = new URL(buildGoogleAuthUrl());
  expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
  expect(url.searchParams.get('client_id')).toBe('test-client-id');
  expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000/oauth/google/callback');
  expect(url.searchParams.get('response_type')).toBe('code');
  expect(url.searchParams.get('scope')).toBe('openid email profile');
});
```

참고: vitest(jsdom)의 기본 `window.location.origin`은 `http://localhost:3000`이다(별도 설정 없을 때).

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -- src/auth/googleOAuth.test.js`
Expected: FAIL — 모듈을 찾을 수 없음 (`Cannot find module './googleOAuth'`)

- [ ] **Step 4: 최소 구현**

`src/auth/googleOAuth.js` 새 파일:

```js
const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

export const buildGoogleRedirectUri = () => `${window.location.origin}/oauth/google/callback`;

export const buildGoogleAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    redirect_uri: buildGoogleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
  });
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
};
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- src/auth/googleOAuth.test.js`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add src/auth/googleOAuth.js src/auth/googleOAuth.test.js .env.example
git commit -m "feat: 구글 OAuth 인증 URL 생성 유틸(googleOAuth) 추가"
```

`.env.local`은 gitignore 대상이라 커밋 대상에 포함되지 않는다(그대로 두면 됨).

---

### Task 3: `LoginPage`에 "Google로 계속하기" 버튼 추가

**Files:**
- Modify: `src/pages/LoginPage.jsx`
- Modify: `src/styles/AuthPage.css` (구분선 스타일 추가)
- Modify: `src/pages/LoginPage.test.jsx` (테스트 추가)

**Interfaces:**
- Consumes: `buildGoogleAuthUrl()` (Task 2에서 정의)
- Produces: 없음 (터미널 UI 동작)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/pages/LoginPage.test.jsx` 상단에 import 추가:

```js
import * as googleOAuth from '../auth/googleOAuth';

vi.mock('../auth/googleOAuth');
```

파일 끝에 추가:

```js
test('Google로 계속하기 클릭 시 구글 인증 URL로 이동한다', async () => {
  googleOAuth.buildGoogleAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?mock=1');

  const originalLocation = window.location;
  delete window.location;
  window.location = { ...originalLocation, href: '' };

  renderLogin();
  await userEvent.click(screen.getByRole('button', { name: 'Google로 계속하기' }));

  expect(window.location.href).toBe('https://accounts.google.com/o/oauth2/v2/auth?mock=1');

  window.location = originalLocation;
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- src/pages/LoginPage.test.jsx`
Expected: FAIL — `Unable to find role "button" with name "Google로 계속하기"`

- [ ] **Step 3: `AuthPage.css`에 구분선 스타일 추가**

`src/styles/AuthPage.css` 파일 끝에 추가:

```css
.auth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 24px 0;
  color: #98a2b3;
  font-size: 13px;
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e4e7ec;
}
```

- [ ] **Step 4: `LoginPage.jsx`에 버튼 추가**

`src/pages/LoginPage.jsx` import에 추가:

```js
import { buildGoogleAuthUrl } from '../auth/googleOAuth';
```

`handleSubmit` 함수 다음에 핸들러 추가:

```js
const handleGoogleLogin = () => {
  window.location.href = buildGoogleAuthUrl();
};
```

`</form>` 태그 바로 앞, `<div className="auth-links-row">` 다음에 추가:

```jsx
        <div className="auth-divider">또는</div>
        <button type="button" className="auth-submit auth-submit-secondary" onClick={handleGoogleLogin}>
          Google로 계속하기
        </button>
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- src/pages/LoginPage.test.jsx`
Expected: PASS (전체 파일, 기존 테스트 포함)

- [ ] **Step 6: 커밋**

```bash
git add src/pages/LoginPage.jsx src/pages/LoginPage.test.jsx src/styles/AuthPage.css
git commit -m "feat: 로그인 페이지에 Google로 계속하기 버튼 추가"
```

---

### Task 4: `GoogleCallbackPage` 구현

**Files:**
- Create: `src/pages/GoogleCallbackPage.jsx`
- Create: `src/pages/GoogleCallbackPage.test.jsx`

**Interfaces:**
- Consumes:
  - `authApi.googleLogin({ code, redirectUri })` (Task 1)
  - `buildGoogleRedirectUri()` (Task 2)
  - `getMyProfile()` from `src/api/myPageApi.js` (기존, `{ loginId, ... }` 반환)
  - `setAccessToken(token)` from `src/auth/tokenStorage.js` (기존)
  - `useAuth().login(tokens, loginId, rememberMe)` from `src/context/AuthContext.jsx` (기존)
- Produces: 없음 (라우트 컴포넌트, Task 5에서 라우팅에 연결)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/pages/GoogleCallbackPage.test.jsx` 새 파일:

```js
import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import GoogleCallbackPage from './GoogleCallbackPage';
import * as authApi from '../api/authApi';
import * as myPageApi from '../api/myPageApi';

vi.mock('../api/authApi');
vi.mock('../api/myPageApi');

const mockAuthLogin = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: mockAuthLogin }),
}));

const renderCallback = (search) =>
  render(
    <MemoryRouter initialEntries={[`/oauth/google/callback${search}`]}>
      <Routes>
        <Route path="/oauth/google/callback" element={<GoogleCallbackPage />} />
        <Route path="/login" element={<div>로그인페이지</div>} />
        <Route path="/" element={<div>메인페이지</div>} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
});

test('code가 있으면 googleLogin 후 프로필을 조회하고 로그인 처리한 뒤 메인으로 이동한다', async () => {
  authApi.googleLogin.mockResolvedValue({
    success: true,
    data: { accessToken: 'at', refreshToken: 'rt' },
  });
  myPageApi.getMyProfile.mockResolvedValue({ loginId: 'tester01', name: '홍길동' });

  renderCallback('?code=auth-code-1');

  await waitFor(() => expect(screen.getByText('메인페이지')).toBeInTheDocument());
  expect(authApi.googleLogin).toHaveBeenCalledWith({
    code: 'auth-code-1',
    redirectUri: expect.stringContaining('/oauth/google/callback'),
  });
  expect(mockAuthLogin).toHaveBeenCalledWith(
    { accessToken: 'at', refreshToken: 'rt' }, 'tester01', true
  );
});

test('code 파라미터가 없으면 로그인 페이지로 리다이렉트한다', async () => {
  renderCallback('');

  await waitFor(() => expect(screen.getByText('로그인페이지')).toBeInTheDocument());
  expect(authApi.googleLogin).not.toHaveBeenCalled();
});

test('409 에러면 일반 로그인 안내 메시지와 함께 로그인 페이지로 이동한다', async () => {
  authApi.googleLogin.mockRejectedValue({
    response: { status: 409, data: { success: false, message: '이미 가입된 이메일' } },
  });

  renderCallback('?code=auth-code-1');

  await waitFor(() => expect(screen.getByText('로그인페이지')).toBeInTheDocument());
  expect(mockAuthLogin).not.toHaveBeenCalled();
});

test('502 에러면 일반 실패로 처리하고 로그인 페이지로 이동한다', async () => {
  authApi.googleLogin.mockRejectedValue({
    response: { status: 502, data: { success: false, message: 'GOOGLE_AUTH_FAILED' } },
  });

  renderCallback('?code=auth-code-1');

  await waitFor(() => expect(screen.getByText('로그인페이지')).toBeInTheDocument());
  expect(mockAuthLogin).not.toHaveBeenCalled();
});

test('프로필 조회에 실패하면 로그인 처리를 하지 않고 로그인 페이지로 이동한다', async () => {
  authApi.googleLogin.mockResolvedValue({
    success: true,
    data: { accessToken: 'at', refreshToken: 'rt' },
  });
  myPageApi.getMyProfile.mockRejectedValue({ response: { status: 401 } });

  renderCallback('?code=auth-code-1');

  await waitFor(() => expect(screen.getByText('로그인페이지')).toBeInTheDocument());
  expect(mockAuthLogin).not.toHaveBeenCalled();
});

test('처리 중에는 안내 문구를 보여준다', () => {
  authApi.googleLogin.mockReturnValue(new Promise(() => {}));
  renderCallback('?code=auth-code-1');
  expect(screen.getByText('로그인 처리 중...')).toBeInTheDocument();
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- src/pages/GoogleCallbackPage.test.jsx`
Expected: FAIL — `Cannot find module './GoogleCallbackPage'`

- [ ] **Step 3: 최소 구현**

`src/pages/GoogleCallbackPage.jsx` 새 파일:

```jsx
import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { googleLogin } from '../api/authApi';
import { getMyProfile } from '../api/myPageApi';
import { useAuth } from '../context/AuthContext';
import { setAccessToken } from '../auth/tokenStorage';
import { buildGoogleRedirectUri } from '../auth/googleOAuth';
import '../styles/AuthPage.css';

const GENERIC_ERROR_MESSAGE = '구글 로그인에 실패했습니다. 다시 시도해주세요.';
const ALREADY_LOCAL_MESSAGE = '이미 일반 회원가입된 이메일입니다. 일반 로그인을 이용해주세요.';

const GoogleCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const hasRun = useRef(false);

  useEffect(() => {
    // StrictMode는 개발 모드에서 mount effect를 두 번 실행한다. 구글 인가 code는 1회용이라
    // 두 번째 호출이 이미 소모된 code로 실패해 첫 호출의 성공을 덮어쓸 수 있으므로 1회만 실행되게 막는다.
    if (hasRun.current) {
      return;
    }
    hasRun.current = true;

    const fail = (message) => {
      navigate('/login', { replace: true, state: { message } });
    };

    const code = searchParams.get('code');
    if (!code) {
      fail(GENERIC_ERROR_MESSAGE);
      return;
    }

    const run = async () => {
      let tokens;
      try {
        const result = await googleLogin({ code, redirectUri: buildGoogleRedirectUri() });
        tokens = result.data;
      } catch (err) {
        if (err.response?.status === 409) {
          fail(ALREADY_LOCAL_MESSAGE);
        } else {
          fail(GENERIC_ERROR_MESSAGE);
        }
        return;
      }

      try {
        setAccessToken(tokens.accessToken);
        const profile = await getMyProfile();
        auth.login(tokens, profile.loginId, true);
        navigate('/', { replace: true });
      } catch {
        setAccessToken(null);
        fail(GENERIC_ERROR_MESSAGE);
      }
    };

    run();
  }, [searchParams, navigate, auth]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-subtitle">로그인 처리 중...</p>
      </div>
    </div>
  );
};

export default GoogleCallbackPage;
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- src/pages/GoogleCallbackPage.test.jsx`
Expected: PASS (6개 테스트 모두 통과)

- [ ] **Step 5: 커밋**

```bash
git add src/pages/GoogleCallbackPage.jsx src/pages/GoogleCallbackPage.test.jsx
git commit -m "feat: 구글 로그인 콜백 페이지(GoogleCallbackPage) 추가"
```

---

### Task 5: 라우팅 연결

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/App.test.jsx`

**Interfaces:**
- Consumes: `GoogleCallbackPage` (Task 4)
- Produces: 없음

- [ ] **Step 1: 실패하는 테스트 작성**

`src/App.test.jsx` 파일 끝(마지막 test 다음)에 추가:

```js
test('/oauth/google/callback 경로에서 콜백 페이지를 보여준다', async () => {
  authApi.googleLogin.mockReturnValue(new Promise(() => {}));
  renderAt('/oauth/google/callback?code=test-code');
  await waitFor(() => expect(screen.getByText('로그인 처리 중...')).toBeInTheDocument());
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- src/App.test.jsx`
Expected: FAIL — "로그인 처리 중..." 텍스트를 찾지 못함(라우트 없음, 404 등)

- [ ] **Step 3: 최소 구현**

`src/App.jsx`에 import 추가:

```js
import GoogleCallbackPage from './pages/GoogleCallbackPage';
```

`<Route path="/reset-password" element={<ResetPasswordPage />} />` 다음 줄에 추가:

```jsx
    <Route path="/oauth/google/callback" element={<GoogleCallbackPage />} />
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- src/App.test.jsx`
Expected: PASS

- [ ] **Step 5: 전체 테스트 + 빌드 확인**

Run: `npm test`
Expected: 모든 테스트 파일 PASS (기존 100여 개 + 이번에 추가된 테스트 전부)

Run: `npm run build`
Expected: 에러 없이 빌드 성공

- [ ] **Step 6: 커밋**

```bash
git add src/App.jsx src/App.test.jsx
git commit -m "feat: /oauth/google/callback 라우트 연결"
```

---

## 구현 후 수동 확인 (참고용, 별도 태스크 아님)

백엔드가 아직 더미 `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`이라 실제 구글 인증 왕복은 테스트 불가. 백엔드 실제 값 설정 후:
1. Google Cloud Console "승인된 리디렉션 URI"에 `http://localhost:5173/oauth/google/callback` 등록 확인
2. `npm run dev` 후 로그인 페이지에서 "Google로 계속하기" 클릭 → 구글 동의화면 → 콜백 → 메인 페이지 진입 확인
3. 이미 일반 가입된 이메일로 구글 로그인 시도 → 409 메시지 확인
