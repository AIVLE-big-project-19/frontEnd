# 로그인/회원가입 프론트엔드 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Spring Boot JWT 인증 API(Phase 1)에 연동되는 로그인/회원가입 화면과 토큰 관리 계층을 React 프론트엔드에 구축한다.

**Architecture:** `tokenStorage` 유틸(accessToken 메모리 + refreshToken/loginId 스토리지) 위에 axios 인스턴스(Bearer 첨부 + 401 자동 재발급 인터셉터)와 `authApi`를 올리고, `AuthContext`가 부팅 시 세션 복원과 로그인/로그아웃 상태를 제공한다. react-router-dom으로 `/`, `/login`, `/signup` 라우팅.

**Tech Stack:** React 19, Vite 8, react-router-dom, axios, vitest + @testing-library/react + jsdom (신규 도입)

**Spec:** `docs/superpowers/specs/2026-07-14-login-signup-design.md`

## Global Constraints

- 백엔드 응답 공통 포맷: `{ "success": boolean, "message": string, "data": object|null }`
- accessToken은 메모리에만 보관. refreshToken과 loginId는 rememberMe=true면 `localStorage`, false면 `sessionStorage`에 저장
- 스토리지 키 이름: `refreshToken`, `loginId` (두 스토리지 공통)
- refreshToken은 재사용 불가 — 재발급 응답의 새 refreshToken으로 매번 교체 저장
- `/auth/login`, `/auth/token/refresh` 요청 자체의 401은 재발급을 트리거하지 않는다
- 프론트 검증 규칙: loginId 4~20자, password 8~50자, email 형식, 전부 필수
- 기존 파일들은 `.jsx` 확장자 사용, 함수형 컴포넌트 + hooks 스타일을 따른다

---

### Task 1: 의존성 추가 + 테스트 환경 구축

**Files:**
- Modify: `package.json` (scripts에 `"test": "vitest run"`, `"test:watch": "vitest"` 추가)
- Modify: `vite.config.js` (vitest `test` 섹션 추가)
- Create: `src/test/setup.js`
- Create: `src/test/smoke.test.jsx`

**Interfaces:**
- Produces: `npm test`로 vitest 실행 가능한 환경. 이후 모든 태스크가 이 테스트 러너를 사용.

- [ ] **Step 1: 의존성 설치**

```bash
npm install axios react-router-dom
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 2: package.json scripts 추가**

`scripts`에 추가:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: vite.config.js에 test 섹션 추가**

기존 `defineConfig` 객체에 `test` 키만 추가 (proxy 설정은 그대로 유지):

```js
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
  server: {
    /* 기존 proxy 설정 그대로 */
  },
})
```

- [ ] **Step 4: 테스트 셋업 파일 작성**

`src/test/setup.js`:

```js
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: 스모크 테스트 작성 및 실행**

`src/test/smoke.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';

test('테스트 환경이 동작한다', () => {
  render(<div>hello</div>);
  expect(screen.getByText('hello')).toBeInTheDocument();
});
```

Run: `npm test`
Expected: 1 passed

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.js src/test/
git commit -m "chore: axios, react-router-dom 추가 및 vitest 테스트 환경 구축"
```

---

### Task 2: tokenStorage 유틸

**Files:**
- Create: `src/auth/tokenStorage.js`
- Test: `src/auth/tokenStorage.test.js`

**Interfaces:**
- Produces:
  - `getAccessToken(): string|null` / `setAccessToken(token: string|null): void` — 메모리 보관
  - `saveSession({ refreshToken, loginId, rememberMe }): void` — rememberMe에 따라 localStorage/sessionStorage에 저장 (반대쪽 스토리지는 비움)
  - `loadSession(): { refreshToken, loginId, rememberMe } | null` — localStorage 우선 확인
  - `updateRefreshToken(newToken: string): void` — 현재 세션이 있는 스토리지의 refreshToken만 교체
  - `clearSession(): void` — 양쪽 스토리지 + accessToken 모두 삭제

- [ ] **Step 1: 실패하는 테스트 작성**

`src/auth/tokenStorage.test.js`:

```js
import {
  getAccessToken, setAccessToken,
  saveSession, loadSession, updateRefreshToken, clearSession,
} from './tokenStorage';

beforeEach(() => {
  clearSession();
});

test('accessToken은 메모리에 저장하고 읽는다', () => {
  expect(getAccessToken()).toBeNull();
  setAccessToken('at-1');
  expect(getAccessToken()).toBe('at-1');
});

test('rememberMe=true면 localStorage에 저장한다', () => {
  saveSession({ refreshToken: 'rt-1', loginId: 'tester01', rememberMe: true });
  expect(localStorage.getItem('refreshToken')).toBe('rt-1');
  expect(localStorage.getItem('loginId')).toBe('tester01');
  expect(sessionStorage.getItem('refreshToken')).toBeNull();
});

test('rememberMe=false면 sessionStorage에 저장한다', () => {
  saveSession({ refreshToken: 'rt-2', loginId: 'tester02', rememberMe: false });
  expect(sessionStorage.getItem('refreshToken')).toBe('rt-2');
  expect(localStorage.getItem('refreshToken')).toBeNull();
});

test('loadSession은 저장된 세션을 복원한다 (localStorage 우선)', () => {
  saveSession({ refreshToken: 'rt-1', loginId: 'tester01', rememberMe: true });
  expect(loadSession()).toEqual({ refreshToken: 'rt-1', loginId: 'tester01', rememberMe: true });

  saveSession({ refreshToken: 'rt-2', loginId: 'tester02', rememberMe: false });
  expect(loadSession()).toEqual({ refreshToken: 'rt-2', loginId: 'tester02', rememberMe: false });
});

test('세션이 없으면 loadSession은 null을 반환한다', () => {
  expect(loadSession()).toBeNull();
});

test('updateRefreshToken은 현재 세션 스토리지의 토큰만 교체한다', () => {
  saveSession({ refreshToken: 'rt-old', loginId: 'tester01', rememberMe: false });
  updateRefreshToken('rt-new');
  expect(sessionStorage.getItem('refreshToken')).toBe('rt-new');
  expect(sessionStorage.getItem('loginId')).toBe('tester01');
});

test('clearSession은 모든 토큰을 삭제한다', () => {
  setAccessToken('at-1');
  saveSession({ refreshToken: 'rt-1', loginId: 'tester01', rememberMe: true });
  clearSession();
  expect(getAccessToken()).toBeNull();
  expect(loadSession()).toBeNull();
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- src/auth/tokenStorage.test.js`
Expected: FAIL — "Failed to resolve import ./tokenStorage"

- [ ] **Step 3: 구현**

`src/auth/tokenStorage.js`:

```js
const REFRESH_KEY = 'refreshToken';
const LOGIN_ID_KEY = 'loginId';

let accessToken = null;

export const getAccessToken = () => accessToken;

export const setAccessToken = (token) => {
  accessToken = token;
};

export const saveSession = ({ refreshToken, loginId, rememberMe }) => {
  const target = rememberMe ? localStorage : sessionStorage;
  const other = rememberMe ? sessionStorage : localStorage;
  target.setItem(REFRESH_KEY, refreshToken);
  target.setItem(LOGIN_ID_KEY, loginId);
  other.removeItem(REFRESH_KEY);
  other.removeItem(LOGIN_ID_KEY);
};

export const loadSession = () => {
  if (localStorage.getItem(REFRESH_KEY)) {
    return {
      refreshToken: localStorage.getItem(REFRESH_KEY),
      loginId: localStorage.getItem(LOGIN_ID_KEY),
      rememberMe: true,
    };
  }
  if (sessionStorage.getItem(REFRESH_KEY)) {
    return {
      refreshToken: sessionStorage.getItem(REFRESH_KEY),
      loginId: sessionStorage.getItem(LOGIN_ID_KEY),
      rememberMe: false,
    };
  }
  return null;
};

export const updateRefreshToken = (newToken) => {
  if (localStorage.getItem(REFRESH_KEY)) {
    localStorage.setItem(REFRESH_KEY, newToken);
  } else if (sessionStorage.getItem(REFRESH_KEY)) {
    sessionStorage.setItem(REFRESH_KEY, newToken);
  }
};

export const clearSession = () => {
  accessToken = null;
  [localStorage, sessionStorage].forEach((storage) => {
    storage.removeItem(REFRESH_KEY);
    storage.removeItem(LOGIN_ID_KEY);
  });
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- src/auth/tokenStorage.test.js`
Expected: 7 passed

- [ ] **Step 5: Commit**

```bash
git add src/auth/
git commit -m "feat: 토큰 저장 유틸(tokenStorage) 구현"
```

---

### Task 3: axios 인스턴스 + 인터셉터

**Files:**
- Create: `src/api/axiosInstance.js`
- Test: `src/api/axiosInstance.test.js`

**Interfaces:**
- Consumes: `tokenStorage`의 `getAccessToken`, `setAccessToken`, `updateRefreshToken`, `clearSession`
- Produces:
  - default export: `baseURL: '/api'`인 axios 인스턴스 (authApi 등 모든 API 호출이 사용)
  - named export (테스트용): `attachAuthHeader(config)`, `handleResponseError(error)`
  - 동작: 요청 시 accessToken 있으면 `Authorization: Bearer` 첨부. 401 응답이면 `/auth/token/refresh` 호출 후 원요청 1회 재시도. `/auth/login`·`/auth/token/refresh`의 401 및 이미 재시도한 요청은 그대로 reject. refresh 실패 시 세션 삭제 후 `/login`으로 이동.

- [ ] **Step 1: 실패하는 테스트 작성**

인터셉터 핸들러 함수를 named export로 직접 테스트한다 (네트워크 모킹 불필요, refresh 호출만 모킹).

`src/api/axiosInstance.test.js`:

```js
import { vi } from 'vitest';
import instance, { attachAuthHeader, handleResponseError } from './axiosInstance';
import { setAccessToken, getAccessToken, saveSession, loadSession, clearSession } from '../auth/tokenStorage';

beforeEach(() => {
  clearSession();
  vi.restoreAllMocks();
});

describe('attachAuthHeader', () => {
  test('accessToken이 있으면 Authorization 헤더를 붙인다', () => {
    setAccessToken('at-1');
    const config = attachAuthHeader({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer at-1');
  });

  test('accessToken이 없으면 헤더를 붙이지 않는다', () => {
    const config = attachAuthHeader({ headers: {} });
    expect(config.headers.Authorization).toBeUndefined();
  });
});

describe('handleResponseError', () => {
  const make401 = (url, extra = {}) => ({
    config: { url, headers: {}, ...extra },
    response: { status: 401 },
  });

  test('401이면 refresh 후 원요청을 재시도한다', async () => {
    saveSession({ refreshToken: 'rt-old', loginId: 'tester01', rememberMe: true });
    vi.spyOn(instance, 'post').mockResolvedValue({
      data: { success: true, data: { accessToken: 'at-new', refreshToken: 'rt-new' } },
    });
    const retried = { data: 'ok' };
    vi.spyOn(instance, 'request').mockResolvedValue(retried);

    const result = await handleResponseError(make401('/some/protected'));

    expect(instance.post).toHaveBeenCalledWith('/auth/token/refresh', { refreshToken: 'rt-old' });
    expect(getAccessToken()).toBe('at-new');
    expect(loadSession().refreshToken).toBe('rt-new');
    expect(result).toBe(retried);
  });

  test('로그인 요청의 401은 refresh를 시도하지 않는다', async () => {
    const spy = vi.spyOn(instance, 'post');
    await expect(handleResponseError(make401('/auth/login'))).rejects.toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
  });

  test('이미 재시도한 요청의 401은 그대로 reject한다', async () => {
    const spy = vi.spyOn(instance, 'post');
    await expect(handleResponseError(make401('/some/protected', { _retry: true }))).rejects.toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
  });

  test('refresh 실패 시 세션을 삭제한다', async () => {
    saveSession({ refreshToken: 'rt-old', loginId: 'tester01', rememberMe: true });
    vi.spyOn(instance, 'post').mockRejectedValue({ response: { status: 401 } });

    await expect(handleResponseError(make401('/some/protected'))).rejects.toBeTruthy();
    expect(loadSession()).toBeNull();
  });

  test('401이 아닌 에러는 그대로 reject한다', async () => {
    const error = { config: { url: '/x' }, response: { status: 500 } };
    await expect(handleResponseError(error)).rejects.toBe(error);
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- src/api/axiosInstance.test.js`
Expected: FAIL — "Failed to resolve import ./axiosInstance"

- [ ] **Step 3: 구현**

`src/api/axiosInstance.js`:

```js
import axios from 'axios';
import {
  getAccessToken, setAccessToken, loadSession, updateRefreshToken, clearSession,
} from '../auth/tokenStorage';

const instance = axios.create({ baseURL: '/api' });

// 401이 와도 토큰 재발급을 시도하면 안 되는 엔드포인트
const NO_REFRESH_URLS = ['/auth/login', '/auth/token/refresh'];

export const attachAuthHeader = (config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

export const handleResponseError = async (error) => {
  const { config, response } = error;
  const status = response?.status;
  const session = loadSession();

  const shouldRefresh =
    status === 401 &&
    config &&
    !config._retry &&
    !NO_REFRESH_URLS.includes(config.url) &&
    session;

  if (!shouldRefresh) {
    return Promise.reject(error);
  }

  config._retry = true;
  try {
    const { data } = await instance.post('/auth/token/refresh', {
      refreshToken: session.refreshToken,
    });
    setAccessToken(data.data.accessToken);
    updateRefreshToken(data.data.refreshToken);
    config.headers.Authorization = `Bearer ${data.data.accessToken}`;
    return instance.request(config);
  } catch (refreshError) {
    clearSession();
    window.location.href = '/login';
    return Promise.reject(refreshError);
  }
};

instance.interceptors.request.use(attachAuthHeader);
instance.interceptors.response.use((response) => response, handleResponseError);

export default instance;
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- src/api/axiosInstance.test.js`
Expected: 7 passed

(참고: jsdom에서 `window.location.href` 할당은 no-op 경고가 날 수 있으나 테스트 실패 요인은 아님. 경고가 거슬리면 무시.)

- [ ] **Step 5: Commit**

```bash
git add src/api/axiosInstance.js src/api/axiosInstance.test.js
git commit -m "feat: axios 인스턴스 및 토큰 자동첨부/재발급 인터셉터 구현"
```

---

### Task 4: authApi 함수

**Files:**
- Create: `src/api/authApi.js`
- Test: `src/api/authApi.test.js`

**Interfaces:**
- Consumes: `axiosInstance` (default export)
- Produces (전부 `response.data` 즉 `{ success, message, data }`를 resolve):
  - `checkLoginId(loginId)` → GET `/auth/check-login-id?value=...`
  - `sendEmailCode(email)` → POST `/auth/email/send-code`
  - `verifyEmailCode(email, code)` → POST `/auth/email/verify-code`
  - `signup({ loginId, email, password, name })` → POST `/auth/signup`
  - `login({ loginId, password, rememberMe })` → POST `/auth/login`
  - `logout(refreshToken)` → POST `/auth/logout`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/api/authApi.test.js`:

```js
import { vi } from 'vitest';
import instance from './axiosInstance';
import {
  checkLoginId, sendEmailCode, verifyEmailCode, signup, login, logout,
} from './authApi';

const ok = (data) => ({ data: { success: true, message: '', data } });

beforeEach(() => {
  vi.restoreAllMocks();
});

test('checkLoginId는 value 쿼리로 GET 요청한다', async () => {
  vi.spyOn(instance, 'get').mockResolvedValue(ok({ available: true }));
  const result = await checkLoginId('tester01');
  expect(instance.get).toHaveBeenCalledWith('/auth/check-login-id', { params: { value: 'tester01' } });
  expect(result.data.available).toBe(true);
});

test('sendEmailCode는 이메일을 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok(null));
  await sendEmailCode('a@b.com');
  expect(instance.post).toHaveBeenCalledWith('/auth/email/send-code', { email: 'a@b.com' });
});

test('verifyEmailCode는 이메일과 코드를 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok(null));
  await verifyEmailCode('a@b.com', '123456');
  expect(instance.post).toHaveBeenCalledWith('/auth/email/verify-code', { email: 'a@b.com', code: '123456' });
});

test('signup은 가입 정보를 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok(null));
  const body = { loginId: 'tester01', email: 'a@b.com', password: 'password123', name: '홍길동' };
  await signup(body);
  expect(instance.post).toHaveBeenCalledWith('/auth/signup', body);
});

test('login은 토큰을 반환한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok({ accessToken: 'at', refreshToken: 'rt' }));
  const result = await login({ loginId: 'tester01', password: 'password123', rememberMe: true });
  expect(instance.post).toHaveBeenCalledWith('/auth/login', {
    loginId: 'tester01', password: 'password123', rememberMe: true,
  });
  expect(result.data.accessToken).toBe('at');
});

test('logout은 refreshToken을 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok(null));
  await logout('rt-1');
  expect(instance.post).toHaveBeenCalledWith('/auth/logout', { refreshToken: 'rt-1' });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- src/api/authApi.test.js`
Expected: FAIL — "Failed to resolve import ./authApi"

- [ ] **Step 3: 구현**

`src/api/authApi.js`:

```js
import instance from './axiosInstance';

export const checkLoginId = async (loginId) => {
  const { data } = await instance.get('/auth/check-login-id', { params: { value: loginId } });
  return data;
};

export const sendEmailCode = async (email) => {
  const { data } = await instance.post('/auth/email/send-code', { email });
  return data;
};

export const verifyEmailCode = async (email, code) => {
  const { data } = await instance.post('/auth/email/verify-code', { email, code });
  return data;
};

export const signup = async ({ loginId, email, password, name }) => {
  const { data } = await instance.post('/auth/signup', { loginId, email, password, name });
  return data;
};

export const login = async ({ loginId, password, rememberMe }) => {
  const { data } = await instance.post('/auth/login', { loginId, password, rememberMe });
  return data;
};

export const logout = async (refreshToken) => {
  const { data } = await instance.post('/auth/logout', { refreshToken });
  return data;
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- src/api/authApi.test.js`
Expected: 6 passed

- [ ] **Step 5: Commit**

```bash
git add src/api/authApi.js src/api/authApi.test.js
git commit -m "feat: 인증 API 함수(authApi) 구현"
```

---

### Task 5: AuthContext

**Files:**
- Create: `src/context/AuthContext.jsx`
- Test: `src/context/AuthContext.test.jsx`

**Interfaces:**
- Consumes: `tokenStorage` 전체, `authApi.logout`, `axiosInstance`(부팅 refresh 호출)
- Produces:
  - `<AuthProvider>{children}</AuthProvider>` — 앱 루트에서 감싼다. 부팅 시 저장된 refreshToken이 있으면 `/auth/token/refresh`로 세션 복원, 복원 중에는 `isInitializing: true`
  - `useAuth(): { isLoggedIn: boolean, loginId: string|null, isInitializing: boolean, login(tokens, loginId, rememberMe): void, logout(): Promise<void> }`
  - `login`은 `{ accessToken, refreshToken }`을 받아 tokenStorage에 반영하고 상태를 로그인으로 전환
  - `logout`은 서버 logout 호출(실패해도 무시) 후 세션 삭제 및 상태 초기화

- [ ] **Step 1: 실패하는 테스트 작성**

`src/context/AuthContext.test.jsx`:

```jsx
import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';
import instance from '../api/axiosInstance';
import { saveSession, loadSession, clearSession, getAccessToken } from '../auth/tokenStorage';

vi.mock('../api/authApi', () => ({
  logout: vi.fn().mockResolvedValue({ success: true }),
}));

const Probe = () => {
  const { isLoggedIn, loginId, isInitializing, login, logout } = useAuth();
  if (isInitializing) return <div>초기화중</div>;
  return (
    <div>
      <div data-testid="status">{isLoggedIn ? `로그인:${loginId}` : '비로그인'}</div>
      <button onClick={() => login({ accessToken: 'at', refreshToken: 'rt' }, 'tester01', true)}>
        로그인실행
      </button>
      <button onClick={logout}>로그아웃실행</button>
    </div>
  );
};

const renderWithProvider = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );

beforeEach(() => {
  clearSession();
  vi.restoreAllMocks();
});

test('저장된 세션이 없으면 비로그인 상태로 시작한다', async () => {
  renderWithProvider();
  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('비로그인'));
});

test('login 호출 시 로그인 상태가 되고 토큰이 저장된다', async () => {
  renderWithProvider();
  await waitFor(() => screen.getByTestId('status'));
  await userEvent.click(screen.getByText('로그인실행'));
  expect(screen.getByTestId('status')).toHaveTextContent('로그인:tester01');
  expect(getAccessToken()).toBe('at');
  expect(loadSession()).toEqual({ refreshToken: 'rt', loginId: 'tester01', rememberMe: true });
});

test('저장된 refreshToken이 있으면 부팅 시 세션을 복원한다', async () => {
  saveSession({ refreshToken: 'rt-saved', loginId: 'tester01', rememberMe: true });
  vi.spyOn(instance, 'post').mockResolvedValue({
    data: { success: true, data: { accessToken: 'at-new', refreshToken: 'rt-new' } },
  });

  renderWithProvider();

  await waitFor(() =>
    expect(screen.getByTestId('status')).toHaveTextContent('로그인:tester01')
  );
  expect(getAccessToken()).toBe('at-new');
  expect(loadSession().refreshToken).toBe('rt-new');
});

test('부팅 시 refresh 실패하면 비로그인 상태로 시작하고 세션이 삭제된다', async () => {
  saveSession({ refreshToken: 'rt-bad', loginId: 'tester01', rememberMe: true });
  vi.spyOn(instance, 'post').mockRejectedValue({ response: { status: 401 } });

  renderWithProvider();

  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('비로그인'));
  expect(loadSession()).toBeNull();
});

test('logout 호출 시 비로그인 상태가 되고 세션이 삭제된다', async () => {
  renderWithProvider();
  await waitFor(() => screen.getByTestId('status'));
  await userEvent.click(screen.getByText('로그인실행'));
  await userEvent.click(screen.getByText('로그아웃실행'));
  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('비로그인'));
  expect(loadSession()).toBeNull();
  expect(getAccessToken()).toBeNull();
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- src/context/AuthContext.test.jsx`
Expected: FAIL — "Failed to resolve import ./AuthContext"

- [ ] **Step 3: 구현**

주의: 부팅 refresh는 `authApi`가 아니라 `axiosInstance.post`를 직접 사용한다 (인터셉터의 refresh 경로와 동일하게 유지하고, 테스트에서 spy하기 쉽게).

`src/context/AuthContext.jsx`:

```jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import instance from '../api/axiosInstance';
import * as authApi from '../api/authApi';
import {
  setAccessToken, saveSession, loadSession, updateRefreshToken, clearSession,
} from '../auth/tokenStorage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [loginId, setLoginId] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const restore = async () => {
      const session = loadSession();
      if (!session) {
        setIsInitializing(false);
        return;
      }
      try {
        const { data } = await instance.post('/auth/token/refresh', {
          refreshToken: session.refreshToken,
        });
        setAccessToken(data.data.accessToken);
        updateRefreshToken(data.data.refreshToken);
        setLoginId(session.loginId);
      } catch {
        clearSession();
      } finally {
        setIsInitializing(false);
      }
    };
    restore();
  }, []);

  const login = useCallback((tokens, newLoginId, rememberMe) => {
    setAccessToken(tokens.accessToken);
    saveSession({ refreshToken: tokens.refreshToken, loginId: newLoginId, rememberMe });
    setLoginId(newLoginId);
  }, []);

  const logout = useCallback(async () => {
    const session = loadSession();
    if (session) {
      try {
        await authApi.logout(session.refreshToken);
      } catch {
        // 서버 로그아웃 실패해도 로컬 세션은 정리한다
      }
    }
    clearSession();
    setLoginId(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isLoggedIn: loginId !== null, loginId, isInitializing, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있습니다.');
  }
  return context;
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- src/context/AuthContext.test.jsx`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add src/context/
git commit -m "feat: 인증 상태 관리 AuthContext 구현 (부팅 시 세션 복원 포함)"
```

---

### Task 6: 라우팅 설정

**Files:**
- Modify: `src/App.jsx` (전체 교체)
- Modify: `src/main.jsx` (변경 없음 — App 안에서 Router 구성)
- Create: `src/pages/LoginPage.jsx` (임시 뼈대 — Task 7에서 완성)
- Create: `src/pages/SignupPage.jsx` (임시 뼈대 — Task 8에서 완성)
- Test: `src/App.test.jsx`

**Interfaces:**
- Consumes: `AuthProvider`, `MainPage`
- Produces: `/` → MainPage, `/login` → LoginPage, `/signup` → SignupPage 라우팅. 전체가 `AuthProvider`로 감싸짐. LoginPage/SignupPage는 `<h1>로그인</h1>`, `<h1>회원가입</h1>`을 포함하는 최소 컴포넌트로 시작.

- [ ] **Step 1: 실패하는 테스트 작성**

MainPage는 지도/fetch에 의존하므로 App 테스트에서는 mock한다.

`src/App.test.jsx`:

```jsx
import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppRoutes } from './App';

vi.mock('./pages/MainPage', () => ({
  default: () => <div>메인페이지</div>,
}));

const renderAt = (path) =>
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AuthProvider>
  );

test('/ 경로에서 메인 페이지를 보여준다', async () => {
  renderAt('/');
  await waitFor(() => expect(screen.getByText('메인페이지')).toBeInTheDocument());
});

test('/login 경로에서 로그인 페이지를 보여준다', async () => {
  renderAt('/login');
  await waitFor(() => expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument());
});

test('/signup 경로에서 회원가입 페이지를 보여준다', async () => {
  renderAt('/signup');
  await waitFor(() => expect(screen.getByRole('heading', { name: '회원가입' })).toBeInTheDocument());
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- src/App.test.jsx`
Expected: FAIL — "AppRoutes is not exported" 또는 페이지 파일 없음

- [ ] **Step 3: 구현**

`src/pages/LoginPage.jsx` (임시 뼈대):

```jsx
const LoginPage = () => {
  return (
    <div>
      <h1>로그인</h1>
    </div>
  );
};

export default LoginPage;
```

`src/pages/SignupPage.jsx` (임시 뼈대):

```jsx
const SignupPage = () => {
  return (
    <div>
      <h1>회원가입</h1>
    </div>
  );
};

export default SignupPage;
```

`src/App.jsx` (전체 교체):

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import MainPage from './pages/MainPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<MainPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignupPage />} />
  </Routes>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          <AppRoutes />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- src/App.test.jsx`
Expected: 3 passed

- [ ] **Step 5: 개발 서버로 육안 확인**

Run: `npm run dev` 후 브라우저에서 `/`, `/login`, `/signup` 접속
Expected: 각각 지도 화면, "로그인" 제목, "회원가입" 제목이 보임

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/App.test.jsx src/pages/LoginPage.jsx src/pages/SignupPage.jsx
git commit -m "feat: react-router 라우팅 도입 및 로그인/회원가입 페이지 뼈대 추가"
```

---

### Task 7: LoginPage 구현

**Files:**
- Modify: `src/pages/LoginPage.jsx` (전체 교체)
- Create: `src/styles/AuthPage.css` (로그인/회원가입 공용 스타일)
- Test: `src/pages/LoginPage.test.jsx`

**Interfaces:**
- Consumes: `authApi.login`, `useAuth().login`, react-router `useNavigate`, `useLocation`
- Produces: 완성된 로그인 페이지. 성공 시 `auth.login(tokens, loginId, rememberMe)` 호출 후 `/`로 이동. `location.state.message`가 있으면 안내 문구 표시(회원가입 완료 안내용 — Task 8이 사용).

- [ ] **Step 1: 실패하는 테스트 작성**

`src/pages/LoginPage.test.jsx`:

```jsx
import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './LoginPage';
import * as authApi from '../api/authApi';

vi.mock('../api/authApi');

const mockAuthLogin = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: mockAuthLogin }),
}));

const renderLogin = (initialEntries = ['/login']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>메인페이지</div>} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
});

test('로그인 성공 시 auth.login을 호출하고 메인으로 이동한다', async () => {
  authApi.login.mockResolvedValue({
    success: true,
    data: { accessToken: 'at', refreshToken: 'rt' },
  });
  renderLogin();

  await userEvent.type(screen.getByLabelText('아이디'), 'tester01');
  await userEvent.type(screen.getByLabelText('비밀번호'), 'password123');
  await userEvent.click(screen.getByLabelText('로그인 상태 유지'));
  await userEvent.click(screen.getByRole('button', { name: '로그인' }));

  await waitFor(() => expect(screen.getByText('메인페이지')).toBeInTheDocument());
  expect(authApi.login).toHaveBeenCalledWith({
    loginId: 'tester01', password: 'password123', rememberMe: true,
  });
  expect(mockAuthLogin).toHaveBeenCalledWith(
    { accessToken: 'at', refreshToken: 'rt' }, 'tester01', true
  );
});

test('로그인 실패(401) 시 에러 메시지를 보여준다', async () => {
  authApi.login.mockRejectedValue({
    response: { status: 401, data: { success: false, message: '아이디 또는 비밀번호가 일치하지 않습니다.' } },
  });
  renderLogin();

  await userEvent.type(screen.getByLabelText('아이디'), 'tester01');
  await userEvent.type(screen.getByLabelText('비밀번호'), 'wrongpass1');
  await userEvent.click(screen.getByRole('button', { name: '로그인' }));

  await waitFor(() =>
    expect(screen.getByText('아이디 또는 비밀번호가 일치하지 않습니다.')).toBeInTheDocument()
  );
});

test('빈 필드로 제출하면 API를 호출하지 않는다', async () => {
  renderLogin();
  await userEvent.click(screen.getByRole('button', { name: '로그인' }));
  expect(authApi.login).not.toHaveBeenCalled();
});

test('회원가입 완료 안내 메시지를 표시한다', () => {
  renderLogin([{ pathname: '/login', state: { message: '회원가입이 완료되었습니다. 로그인해주세요.' } }]);
  expect(screen.getByText('회원가입이 완료되었습니다. 로그인해주세요.')).toBeInTheDocument();
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- src/pages/LoginPage.test.jsx`
Expected: FAIL — 뼈대 컴포넌트에 폼이 없어서 `getByLabelText` 실패

- [ ] **Step 3: 공용 스타일 작성**

`src/styles/AuthPage.css`:

```css
.auth-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f5f6f8;
}

.auth-card {
  width: 100%;
  max-width: 400px;
  padding: 32px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.auth-card h1 {
  margin: 0 0 24px;
  font-size: 24px;
  text-align: center;
}

.auth-field {
  margin-bottom: 16px;
}

.auth-field label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 600;
}

.auth-field input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
}

.auth-field-row {
  display: flex;
  gap: 8px;
}

.auth-field-row input {
  flex: 1;
}

.auth-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 14px;
}

.auth-submit {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.auth-submit:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.auth-sub-button {
  padding: 10px 12px;
  border: 1px solid #2563eb;
  border-radius: 8px;
  background: #fff;
  color: #2563eb;
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;
}

.auth-sub-button:disabled {
  border-color: #9ca3af;
  color: #9ca3af;
  cursor: not-allowed;
}

.auth-error {
  margin: 8px 0;
  color: #dc2626;
  font-size: 13px;
}

.auth-info {
  margin: 8px 0;
  color: #16a34a;
  font-size: 13px;
}

.auth-links {
  margin-top: 16px;
  text-align: center;
  font-size: 14px;
}
```

- [ ] **Step 4: LoginPage 구현**

`src/pages/LoginPage.jsx` (전체 교체):

```jsx
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import * as authApi from '../api/authApi';
import { useAuth } from '../context/AuthContext';
import '../styles/AuthPage.css';

const LoginPage = () => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const infoMessage = location.state?.message;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!loginId || !password) {
      setError('아이디와 비밀번호를 입력해주세요.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const result = await authApi.login({ loginId, password, rememberMe });
      auth.login(result.data, loginId, rememberMe);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>로그인</h1>
        {infoMessage && <p className="auth-info">{infoMessage}</p>}
        <div className="auth-field">
          <label htmlFor="loginId">아이디</label>
          <input
            id="loginId"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            autoComplete="username"
          />
        </div>
        <div className="auth-field">
          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <label className="auth-checkbox">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          로그인 상태 유지
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button className="auth-submit" type="submit" disabled={isSubmitting}>
          로그인
        </button>
        <div className="auth-links">
          계정이 없으신가요? <Link to="/signup">회원가입</Link>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- src/pages/LoginPage.test.jsx`
Expected: 4 passed

주의: `screen.getByLabelText('로그인 상태 유지')`가 체크박스를 찾으려면 위 코드처럼 label이 input을 감싸야 한다.

- [ ] **Step 6: Commit**

```bash
git add src/pages/LoginPage.jsx src/pages/LoginPage.test.jsx src/styles/AuthPage.css
git commit -m "feat: 로그인 페이지 구현"
```

---

### Task 8: SignupPage 구현

**Files:**
- Modify: `src/pages/SignupPage.jsx` (전체 교체)
- Test: `src/pages/SignupPage.test.jsx`

**Interfaces:**
- Consumes: `authApi`의 `checkLoginId`, `sendEmailCode`, `verifyEmailCode`, `signup`; react-router `useNavigate`; `src/styles/AuthPage.css`
- Produces: 완성된 회원가입 페이지. 가입 성공 시 `navigate('/login', { state: { message: '회원가입이 완료되었습니다. 로그인해주세요.' } })`.
- 활성화 조건: "가입하기" 버튼은 이메일 인증 완료(`emailVerified`) && 아이디 중복확인 통과(`loginIdChecked`)일 때만 활성화. 아이디/이메일 입력값이 바뀌면 해당 확인 상태는 리셋된다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/pages/SignupPage.test.jsx`:

```jsx
import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SignupPage from './SignupPage';
import * as authApi from '../api/authApi';

vi.mock('../api/authApi');

const renderSignup = () =>
  render(
    <MemoryRouter initialEntries={['/signup']}>
      <Routes>
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<div>로그인페이지</div>} />
      </Routes>
    </MemoryRouter>
  );

// 이메일 인증 + 아이디 중복확인까지 완료하는 헬퍼
const completeVerifications = async () => {
  authApi.sendEmailCode.mockResolvedValue({ success: true });
  authApi.verifyEmailCode.mockResolvedValue({ success: true });
  authApi.checkLoginId.mockResolvedValue({ success: true, data: { available: true } });

  await userEvent.type(screen.getByLabelText('이메일'), 'user@example.com');
  await userEvent.click(screen.getByRole('button', { name: '인증코드 발송' }));
  await userEvent.type(screen.getByLabelText('인증코드'), '123456');
  await userEvent.click(screen.getByRole('button', { name: '인증 확인' }));
  await waitFor(() => expect(screen.getByText('이메일 인증이 완료되었습니다.')).toBeInTheDocument());

  await userEvent.type(screen.getByLabelText('아이디'), 'tester01');
  await userEvent.click(screen.getByRole('button', { name: '중복확인' }));
  await waitFor(() => expect(screen.getByText('사용 가능한 아이디입니다.')).toBeInTheDocument());
};

beforeEach(() => {
  vi.clearAllMocks();
});

test('처음에는 가입하기 버튼이 비활성화되어 있다', () => {
  renderSignup();
  expect(screen.getByRole('button', { name: '가입하기' })).toBeDisabled();
});

test('이메일 인증과 아이디 중복확인 후 가입이 성공하면 로그인 페이지로 이동한다', async () => {
  authApi.signup.mockResolvedValue({ success: true });
  renderSignup();

  await completeVerifications();
  await userEvent.type(screen.getByLabelText('비밀번호'), 'password123');
  await userEvent.type(screen.getByLabelText('비밀번호 확인'), 'password123');
  await userEvent.type(screen.getByLabelText('이름'), '홍길동');

  const submit = screen.getByRole('button', { name: '가입하기' });
  expect(submit).toBeEnabled();
  await userEvent.click(submit);

  await waitFor(() => expect(screen.getByText('로그인페이지')).toBeInTheDocument());
  expect(authApi.signup).toHaveBeenCalledWith({
    loginId: 'tester01', email: 'user@example.com', password: 'password123', name: '홍길동',
  });
});

test('아이디가 중복이면 사용 불가 메시지를 보여준다', async () => {
  authApi.checkLoginId.mockResolvedValue({ success: true, data: { available: false } });
  renderSignup();

  await userEvent.type(screen.getByLabelText('아이디'), 'tester01');
  await userEvent.click(screen.getByRole('button', { name: '중복확인' }));

  await waitFor(() => expect(screen.getByText('이미 사용 중인 아이디입니다.')).toBeInTheDocument());
  expect(screen.getByRole('button', { name: '가입하기' })).toBeDisabled();
});

test('인증코드 발송 쿨다운(429) 시 서버 메시지를 보여준다', async () => {
  authApi.sendEmailCode.mockRejectedValue({
    response: { status: 429, data: { success: false, message: '잠시 후 다시 시도해주세요.' } },
  });
  renderSignup();

  await userEvent.type(screen.getByLabelText('이메일'), 'user@example.com');
  await userEvent.click(screen.getByRole('button', { name: '인증코드 발송' }));

  await waitFor(() => expect(screen.getByText('잠시 후 다시 시도해주세요.')).toBeInTheDocument());
});

test('인증코드가 틀리면 에러 메시지를 보여준다', async () => {
  authApi.sendEmailCode.mockResolvedValue({ success: true });
  authApi.verifyEmailCode.mockRejectedValue({
    response: { status: 400, data: { success: false, message: '인증번호가 일치하지 않거나 만료되었습니다.' } },
  });
  renderSignup();

  await userEvent.type(screen.getByLabelText('이메일'), 'user@example.com');
  await userEvent.click(screen.getByRole('button', { name: '인증코드 발송' }));
  await userEvent.type(screen.getByLabelText('인증코드'), '000000');
  await userEvent.click(screen.getByRole('button', { name: '인증 확인' }));

  await waitFor(() =>
    expect(screen.getByText('인증번호가 일치하지 않거나 만료되었습니다.')).toBeInTheDocument()
  );
});

test('비밀번호가 8자 미만이면 검증 에러를 보여주고 API를 호출하지 않는다', async () => {
  authApi.signup.mockResolvedValue({ success: true });
  renderSignup();

  await completeVerifications();
  await userEvent.type(screen.getByLabelText('비밀번호'), 'short');
  await userEvent.type(screen.getByLabelText('비밀번호 확인'), 'short');
  await userEvent.type(screen.getByLabelText('이름'), '홍길동');
  await userEvent.click(screen.getByRole('button', { name: '가입하기' }));

  await waitFor(() =>
    expect(screen.getByText('비밀번호는 8~50자여야 합니다.')).toBeInTheDocument()
  );
  expect(authApi.signup).not.toHaveBeenCalled();
});

test('비밀번호 확인이 일치하지 않으면 에러를 보여준다', async () => {
  renderSignup();

  await completeVerifications();
  await userEvent.type(screen.getByLabelText('비밀번호'), 'password123');
  await userEvent.type(screen.getByLabelText('비밀번호 확인'), 'password124');
  await userEvent.type(screen.getByLabelText('이름'), '홍길동');
  await userEvent.click(screen.getByRole('button', { name: '가입하기' }));

  await waitFor(() =>
    expect(screen.getByText('비밀번호가 일치하지 않습니다.')).toBeInTheDocument()
  );
  expect(authApi.signup).not.toHaveBeenCalled();
});

test('아이디 값을 바꾸면 중복확인 상태가 리셋된다', async () => {
  authApi.checkLoginId.mockResolvedValue({ success: true, data: { available: true } });
  renderSignup();

  await userEvent.type(screen.getByLabelText('아이디'), 'tester01');
  await userEvent.click(screen.getByRole('button', { name: '중복확인' }));
  await waitFor(() => expect(screen.getByText('사용 가능한 아이디입니다.')).toBeInTheDocument());

  await userEvent.type(screen.getByLabelText('아이디'), 'x');
  expect(screen.queryByText('사용 가능한 아이디입니다.')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- src/pages/SignupPage.test.jsx`
Expected: FAIL — 뼈대 컴포넌트에 폼이 없음

- [ ] **Step 3: 구현**

`src/pages/SignupPage.jsx` (전체 교체):

```jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as authApi from '../api/authApi';
import '../styles/AuthPage.css';

const SignupPage = () => {
  const [loginId, setLoginId] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');

  const [loginIdChecked, setLoginIdChecked] = useState(false);
  const [loginIdMessage, setLoginIdMessage] = useState({ type: '', text: '' });
  const [codeSent, setCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailMessage, setEmailMessage] = useState({ type: '', text: '' });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const serverMessage = (err, fallback) => err.response?.data?.message || fallback;

  const handleLoginIdChange = (e) => {
    setLoginId(e.target.value);
    setLoginIdChecked(false);
    setLoginIdMessage({ type: '', text: '' });
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setCodeSent(false);
    setEmailVerified(false);
    setEmailMessage({ type: '', text: '' });
  };

  const handleCheckLoginId = async () => {
    if (loginId.length < 4 || loginId.length > 20) {
      setLoginIdMessage({ type: 'error', text: '아이디는 4~20자여야 합니다.' });
      return;
    }
    try {
      const result = await authApi.checkLoginId(loginId);
      if (result.data.available) {
        setLoginIdChecked(true);
        setLoginIdMessage({ type: 'info', text: '사용 가능한 아이디입니다.' });
      } else {
        setLoginIdMessage({ type: 'error', text: '이미 사용 중인 아이디입니다.' });
      }
    } catch (err) {
      setLoginIdMessage({ type: 'error', text: serverMessage(err, '중복확인에 실패했습니다.') });
    }
  };

  const handleSendCode = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailMessage({ type: 'error', text: '올바른 이메일 형식이 아닙니다.' });
      return;
    }
    try {
      await authApi.sendEmailCode(email);
      setCodeSent(true);
      setEmailMessage({ type: 'info', text: '인증코드를 발송했습니다. 메일함을 확인해주세요.' });
    } catch (err) {
      setEmailMessage({ type: 'error', text: serverMessage(err, '인증코드 발송에 실패했습니다.') });
    }
  };

  const handleVerifyCode = async () => {
    try {
      await authApi.verifyEmailCode(email, code);
      setEmailVerified(true);
      setEmailMessage({ type: 'info', text: '이메일 인증이 완료되었습니다.' });
    } catch (err) {
      setEmailMessage({ type: 'error', text: serverMessage(err, '인증 확인에 실패했습니다.') });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8 || password.length > 50) {
      setFormError('비밀번호는 8~50자여야 합니다.');
      return;
    }
    if (password !== passwordConfirm) {
      setFormError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!name) {
      setFormError('이름을 입력해주세요.');
      return;
    }
    setFormError('');
    setIsSubmitting(true);
    try {
      await authApi.signup({ loginId, email, password, name });
      navigate('/login', { state: { message: '회원가입이 완료되었습니다. 로그인해주세요.' } });
    } catch (err) {
      setFormError(serverMessage(err, '회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = emailVerified && loginIdChecked && !isSubmitting;

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>회원가입</h1>

        <div className="auth-field">
          <label htmlFor="signup-email">이메일</label>
          <div className="auth-field-row">
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              disabled={emailVerified}
              autoComplete="email"
            />
            <button
              type="button"
              className="auth-sub-button"
              onClick={handleSendCode}
              disabled={emailVerified}
            >
              인증코드 발송
            </button>
          </div>
        </div>

        {codeSent && !emailVerified && (
          <div className="auth-field">
            <label htmlFor="signup-code">인증코드</label>
            <div className="auth-field-row">
              <input
                id="signup-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
              />
              <button type="button" className="auth-sub-button" onClick={handleVerifyCode}>
                인증 확인
              </button>
            </div>
          </div>
        )}
        {emailMessage.text && (
          <p className={emailMessage.type === 'error' ? 'auth-error' : 'auth-info'}>
            {emailMessage.text}
          </p>
        )}

        <div className="auth-field">
          <label htmlFor="signup-loginId">아이디</label>
          <div className="auth-field-row">
            <input
              id="signup-loginId"
              value={loginId}
              onChange={handleLoginIdChange}
              autoComplete="username"
            />
            <button type="button" className="auth-sub-button" onClick={handleCheckLoginId}>
              중복확인
            </button>
          </div>
        </div>
        {loginIdMessage.text && (
          <p className={loginIdMessage.type === 'error' ? 'auth-error' : 'auth-info'}>
            {loginIdMessage.text}
          </p>
        )}

        <div className="auth-field">
          <label htmlFor="signup-password">비밀번호</label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="signup-passwordConfirm">비밀번호 확인</label>
          <input
            id="signup-passwordConfirm"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="signup-name">이름</label>
          <input
            id="signup-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>

        {formError && <p className="auth-error">{formError}</p>}
        <button className="auth-submit" type="submit" disabled={!canSubmit}>
          가입하기
        </button>
        <div className="auth-links">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </div>
      </form>
    </div>
  );
};

export default SignupPage;
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- src/pages/SignupPage.test.jsx`
Expected: 8 passed

- [ ] **Step 5: Commit**

```bash
git add src/pages/SignupPage.jsx src/pages/SignupPage.test.jsx
git commit -m "feat: 회원가입 페이지 구현 (이메일 인증, 아이디 중복확인 포함)"
```

---

### Task 9: MainPage 헤더 로그인 상태 표시

**Files:**
- Modify: `src/pages/MainPage.jsx` (헤더 nav 부분만: 79~87행 근처의 `<header>` 블록)
- Test: `src/pages/MainPageHeader.test.jsx`

**Interfaces:**
- Consumes: `useAuth()`의 `isLoggedIn`, `loginId`, `logout`; react-router `<Link>`
- Produces: 로그인 상태면 "{loginId}님"과 "로그아웃" 버튼, 비로그인이면 "로그인"/"회원가입" `<Link>` 표시

- [ ] **Step 1: 실패하는 테스트 작성**

MainPage 전체는 지도/fetch 의존이 커서, 헤더 로직을 별도 컴포넌트 `AuthNav`로 분리해 테스트한다.

`src/pages/MainPageHeader.test.jsx`:

```jsx
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AuthNav from '../components/AuthNav';

const mockLogout = vi.fn();
let mockAuthState = { isLoggedIn: false, loginId: null, logout: mockLogout };

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

const renderNav = () =>
  render(
    <MemoryRouter>
      <AuthNav />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
});

test('비로그인 상태면 로그인/회원가입 링크를 보여준다', () => {
  mockAuthState = { isLoggedIn: false, loginId: null, logout: mockLogout };
  renderNav();
  expect(screen.getByRole('link', { name: '로그인' })).toHaveAttribute('href', '/login');
  expect(screen.getByRole('link', { name: '회원가입' })).toHaveAttribute('href', '/signup');
});

test('로그인 상태면 loginId와 로그아웃 버튼을 보여준다', () => {
  mockAuthState = { isLoggedIn: true, loginId: 'tester01', logout: mockLogout };
  renderNav();
  expect(screen.getByText('tester01님')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: '로그인' })).not.toBeInTheDocument();
});

test('로그아웃 버튼 클릭 시 logout을 호출한다', async () => {
  mockAuthState = { isLoggedIn: true, loginId: 'tester01', logout: mockLogout };
  renderNav();
  await userEvent.click(screen.getByRole('button', { name: '로그아웃' }));
  expect(mockLogout).toHaveBeenCalled();
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- src/pages/MainPageHeader.test.jsx`
Expected: FAIL — "Failed to resolve import ../components/AuthNav"

- [ ] **Step 3: AuthNav 컴포넌트 구현**

`src/components/AuthNav.jsx`:

```jsx
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthNav = () => {
  const { isLoggedIn, loginId, logout } = useAuth();

  if (isLoggedIn) {
    return (
      <nav className="nav-menu">
        <span>{loginId}님</span>
        <button type="button" onClick={logout}>로그아웃</button>
      </nav>
    );
  }

  return (
    <nav className="nav-menu">
      <Link to="/login">로그인</Link>
      <Link to="/signup">회원가입</Link>
    </nav>
  );
};

export default AuthNav;
```

- [ ] **Step 4: MainPage 헤더 교체**

`src/pages/MainPage.jsx`에서 import 추가:

```jsx
import AuthNav from '../components/AuthNav';
```

기존 헤더의 nav 블록:

```jsx
<nav className="nav-menu">
  <a href="/login">로그인</a>
  <a href="/signup">회원가입</a>
</nav>
```

을 다음으로 교체:

```jsx
<AuthNav />
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- src/pages/MainPageHeader.test.jsx`
Expected: 3 passed

- [ ] **Step 6: 전체 테스트 + 육안 확인**

Run: `npm test`
Expected: 전체 통과

Run: `npm run dev` (백엔드 8080 기동 상태에서)
확인 사항:
1. `/signup`에서 실제 이메일 인증 → 가입 → `/login`으로 이동하며 완료 안내가 보임
2. 로그인 성공 시 메인으로 이동, 헤더에 "{loginId}님 / 로그아웃" 표시
3. "로그인 상태 유지" 체크 후 새로고침해도 로그인 유지 (localStorage)
4. 미체크 로그인 후 새로고침 시에도 유지, 브라우저(탭) 종료 후엔 로그아웃 (sessionStorage)
5. 로그아웃 클릭 시 헤더가 "로그인 / 회원가입"으로 돌아옴

- [ ] **Step 7: Commit**

```bash
git add src/components/AuthNav.jsx src/pages/MainPage.jsx src/pages/MainPageHeader.test.jsx
git commit -m "feat: 메인 헤더 로그인 상태 표시(AuthNav) 추가"
```
