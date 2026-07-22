# 전역 에러 토스트 인프라 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** axios 인터셉터 레벨에서 처리되지 않은 API 에러를 화면 우측 상단 토스트로 자동 표시하는 인프라를 만든다.

**Architecture:** 모듈 레벨 pub-sub 스토어(`errorToastStore`)와 이를 구독하는 단일 `ErrorToast` 컴포넌트(`App.jsx`에 상시 마운트)를 만들고, `axiosInstance.js`의 응답 인터셉터가 최종 실패 응답에서 `skipErrorModal` 플래그가 없으면 스토어를 통해 토스트를 띄우도록 확장한다.

**Tech Stack:** React 19, axios, vitest + @testing-library/react + @testing-library/user-event.

## Global Constraints

- 스펙 문서: `docs/superpowers/specs/2026-07-22-global-error-toast-design.md`
- **이번 계획의 범위는 인프라(토스트 컴포넌트 + 스토어 + 인터셉터 확장)까지다.** 기존 17개 화면(SignupPage, LoginPage, BoardListPage 등)의 API 호출에 `skipErrorModal` 옵트아웃을 붙이는 작업은 **별도 계획**으로 진행한다 — 이번 계획에서는 건드리지 않는다.
- 토스트: 화면 우측 상단 고정, 최신 메시지 1개만(스택 없음), 4초 후 자동 사라짐 + X 버튼으로 즉시 닫기(수동 닫기 후 자동 타이머가 늦게 발동해 재표시되면 안 됨)
- 옵트아웃 플래그 이름: `skipErrorModal` (axios request config의 커스텀 필드)
- `error.response?.data?.success === false` → `error.response.data.message`를 토스트로 표시
- `error.response`가 없음(네트워크 문제) → `"네트워크 연결을 확인해주세요."`를 토스트로 표시
- `/auth/token/refresh`를 직접 호출하는 두 곳(`axiosInstance.js`의 `refreshAccessToken`, `AuthContext.jsx`의 부팅 시 세션 복원)은 반드시 `skipErrorModal: true`를 붙인다 — 안 붙이면 세션 만료 하드 리다이렉트 전에 엉뚱한 토스트가 먼저 뜬다
- 세션 만료로 `/login`에 하드 리다이렉트되는 경로(`window.location.href = '/login'`)에서는 토스트를 스킵한다(이미 자체 안내가 됨)
- 각 태스크 종료 시 `npm test`(전체) 통과를 재확인한다(회귀 방지)

---

### Task 1: errorToastStore (pub-sub 모듈)

**Files:**
- Create: `src/notifications/errorToastStore.js`
- Test: `src/notifications/errorToastStore.test.js`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `showErrorToast(message: string) => void` — Task 2(ErrorToast), Task 3(axiosInstance)에서 사용
  - `subscribeToErrorToast(callback: (message: string) => void) => (unsubscribe: () => void)` — Task 2(ErrorToast)에서 사용

- [ ] **Step 1: 실패하는 테스트 작성**

`src/notifications/errorToastStore.test.js` 새 파일:

```js
import { vi } from 'vitest';
import { showErrorToast, subscribeToErrorToast } from './errorToastStore';

test('subscribeToErrorToast로 등록한 콜백이 showErrorToast 호출 시 메시지를 받는다', () => {
  const callback = vi.fn();
  const unsubscribe = subscribeToErrorToast(callback);

  showErrorToast('에러 발생');

  expect(callback).toHaveBeenCalledWith('에러 발생');
  unsubscribe();
});

test('구독 해제 후에는 콜백이 호출되지 않는다', () => {
  const callback = vi.fn();
  const unsubscribe = subscribeToErrorToast(callback);
  unsubscribe();

  showErrorToast('에러 발생');

  expect(callback).not.toHaveBeenCalled();
});

test('구독자가 없을 때 showErrorToast를 호출해도 에러가 나지 않는다', () => {
  expect(() => showErrorToast('메시지')).not.toThrow();
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- src/notifications/errorToastStore.test.js`
Expected: FAIL — `Cannot find module './errorToastStore'`

- [ ] **Step 3: 최소 구현**

`src/notifications/errorToastStore.js` 새 파일:

```js
let listener = null;

export const showErrorToast = (message) => {
  if (listener) {
    listener(message);
  }
};

export const subscribeToErrorToast = (callback) => {
  listener = callback;
  return () => {
    if (listener === callback) {
      listener = null;
    }
  };
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- src/notifications/errorToastStore.test.js`
Expected: PASS (3개 테스트 모두)

- [ ] **Step 5: 커밋**

```bash
git add src/notifications/errorToastStore.js src/notifications/errorToastStore.test.js
git commit -m "feat: 전역 에러 토스트 pub-sub 스토어(errorToastStore) 추가"
```

---

### Task 2: ErrorToast 컴포넌트

**Files:**
- Create: `src/components/ErrorToast.jsx`
- Test: `src/components/ErrorToast.test.jsx`
- Create: `src/styles/ErrorToast.css`

**Interfaces:**
- Consumes: `subscribeToErrorToast(callback)` (Task 1)
- Produces: `<ErrorToast />` — Task 3(App.jsx)에서 마운트

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/ErrorToast.test.jsx` 새 파일:

```jsx
import { vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorToast from './ErrorToast';
import { showErrorToast } from '../notifications/errorToastStore';

afterEach(() => {
  vi.useRealTimers();
});

test('showErrorToast 호출 시 메시지를 표시한다', () => {
  render(<ErrorToast />);

  act(() => {
    showErrorToast('문제가 발생했습니다.');
  });

  expect(screen.getByText('문제가 발생했습니다.')).toBeInTheDocument();
});

test('4초 후 자동으로 사라진다', () => {
  vi.useFakeTimers();
  render(<ErrorToast />);

  act(() => {
    showErrorToast('문제가 발생했습니다.');
  });
  expect(screen.getByText('문제가 발생했습니다.')).toBeInTheDocument();

  act(() => {
    vi.advanceTimersByTime(4000);
  });
  expect(screen.queryByText('문제가 발생했습니다.')).not.toBeInTheDocument();
});

test('X 버튼 클릭 시 즉시 닫힌다', async () => {
  render(<ErrorToast />);
  act(() => {
    showErrorToast('문제가 발생했습니다.');
  });

  await userEvent.click(screen.getByRole('button', { name: '닫기' }));

  expect(screen.queryByText('문제가 발생했습니다.')).not.toBeInTheDocument();
});

test('수동으로 닫은 후 자동 닫힘 타이머가 늦게 실행돼도 재표시되지 않는다', () => {
  vi.useFakeTimers();
  render(<ErrorToast />);
  act(() => {
    showErrorToast('문제가 발생했습니다.');
  });
  expect(screen.getByText('문제가 발생했습니다.')).toBeInTheDocument();

  act(() => {
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
  });
  expect(screen.queryByText('문제가 발생했습니다.')).not.toBeInTheDocument();

  act(() => {
    vi.advanceTimersByTime(4000);
  });
  expect(screen.queryByText('문제가 발생했습니다.')).not.toBeInTheDocument();
});

test('새 에러가 오면 이전 메시지를 새 메시지로 덮어쓴다', () => {
  render(<ErrorToast />);
  act(() => {
    showErrorToast('첫 번째 에러');
  });
  expect(screen.getByText('첫 번째 에러')).toBeInTheDocument();

  act(() => {
    showErrorToast('두 번째 에러');
  });

  expect(screen.queryByText('첫 번째 에러')).not.toBeInTheDocument();
  expect(screen.getByText('두 번째 에러')).toBeInTheDocument();
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- src/components/ErrorToast.test.jsx`
Expected: FAIL — `Cannot find module './ErrorToast'`

- [ ] **Step 3: CSS 작성**

`src/styles/ErrorToast.css` 새 파일:

```css
.error-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 2000;
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 360px;
  padding: 14px 16px;
  background: #1f2937;
  color: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  font-size: 14px;
}

.error-toast-close {
  background: none;
  border: none;
  color: #fff;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  opacity: 0.7;
}

.error-toast-close:hover {
  opacity: 1;
}
```

- [ ] **Step 4: 최소 구현**

`src/components/ErrorToast.jsx` 새 파일:

```jsx
import { useEffect, useRef, useState } from 'react';
import { subscribeToErrorToast } from '../notifications/errorToastStore';
import '../styles/ErrorToast.css';

const AUTO_DISMISS_MS = 4000;

const ErrorToast = () => {
  const [message, setMessage] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const unsubscribe = subscribeToErrorToast((text) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setMessage(text);
      timerRef.current = setTimeout(() => {
        setMessage(null);
        timerRef.current = null;
      }, AUTO_DISMISS_MS);
    });
    return () => {
      unsubscribe();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleClose = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setMessage(null);
  };

  if (!message) {
    return null;
  }

  return (
    <div className="error-toast" role="alert">
      <span>{message}</span>
      <button type="button" className="error-toast-close" onClick={handleClose} aria-label="닫기">
        ×
      </button>
    </div>
  );
};

export default ErrorToast;
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- src/components/ErrorToast.test.jsx`
Expected: PASS (5개 테스트 모두)

- [ ] **Step 6: 커밋**

```bash
git add src/components/ErrorToast.jsx src/components/ErrorToast.test.jsx src/styles/ErrorToast.css
git commit -m "feat: 전역 에러 토스트 컴포넌트(ErrorToast) 추가"
```

---

### Task 3: axios interceptor 확장 + App 마운트 (+ 최종 전체 검증)

**Files:**
- Modify: `src/api/axiosInstance.js`
- Modify: `src/api/axiosInstance.test.js`
- Modify: `src/context/AuthContext.jsx`
- Modify: `src/App.jsx`
- Modify: `src/App.test.jsx`

**Interfaces:**
- Consumes: `showErrorToast(message)` (Task 1), `<ErrorToast />` (Task 2)
- Produces: 없음 (플랜의 마지막 태스크)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/api/axiosInstance.test.js` 상단 import에 추가:

```js
import * as errorToastStore from '../notifications/errorToastStore';

vi.mock('../notifications/errorToastStore');
```

`beforeEach`를 다음으로 교체:

```js
beforeEach(() => {
  clearSession();
  sessionStorage.removeItem('authExpiredMessage');
  vi.restoreAllMocks();
  vi.clearAllMocks();
});
```

`describe('handleResponseError', ...)` 블록의 마지막 테스트(`'세션이 없으면 refresh를 시도하지 않고 그대로 reject한다'`) 바로 다음, `describe('handleResponseError', ...)`를 닫는 `});` 이전에 추가:

```js
  test('일반 실패 응답이면 message를 토스트로 표시한다', async () => {
    const error = {
      config: { url: '/boards' },
      response: { status: 500, data: { success: false, message: '서버 오류가 발생했습니다.', data: null } },
    };

    await expect(handleResponseError(error)).rejects.toBe(error);

    expect(errorToastStore.showErrorToast).toHaveBeenCalledWith('서버 오류가 발생했습니다.');
  });

  test('응답 자체가 없으면(네트워크 오류) 기본 문구를 토스트로 표시한다', async () => {
    const error = { config: { url: '/boards' } };

    await expect(handleResponseError(error)).rejects.toBe(error);

    expect(errorToastStore.showErrorToast).toHaveBeenCalledWith('네트워크 연결을 확인해주세요.');
  });

  test('config.skipErrorModal이 true면 토스트를 표시하지 않는다', async () => {
    const error = {
      config: { url: '/auth/login', skipErrorModal: true },
      response: {
        status: 401,
        data: { success: false, message: '아이디 또는 비밀번호가 일치하지 않습니다.', data: null },
      },
    };

    await expect(handleResponseError(error)).rejects.toBe(error);

    expect(errorToastStore.showErrorToast).not.toHaveBeenCalled();
  });

  test('세션 만료로 하드 리다이렉트되는 경로에서는 토스트를 표시하지 않는다', async () => {
    saveSession({ refreshToken: 'rt-old', loginId: 'tester01', rememberMe: true });
    vi.spyOn(instance, 'post').mockRejectedValue({ response: { status: 401 } });

    await expect(handleResponseError(make401('/some/protected'))).rejects.toBeTruthy();

    expect(errorToastStore.showErrorToast).not.toHaveBeenCalled();
  });

  test('refresh 요청 자체에는 skipErrorModal이 붙어서 나간다', async () => {
    saveSession({ refreshToken: 'rt-old', loginId: 'tester01', rememberMe: true });
    vi.spyOn(instance, 'post').mockResolvedValue({
      data: { success: true, data: { accessToken: 'at-new', refreshToken: 'rt-new' } },
    });
    vi.spyOn(instance, 'request').mockResolvedValue({ data: 'ok' });

    await handleResponseError(make401('/some/protected'));

    expect(instance.post).toHaveBeenCalledWith(
      '/auth/token/refresh', { refreshToken: 'rt-old' }, { skipErrorModal: true }
    );
  });
```

기존 `'401이면 refresh 후 원요청을 재시도한다'` 테스트의 다음 줄을 찾아:

```js
    expect(instance.post).toHaveBeenCalledWith('/auth/token/refresh', { refreshToken: 'rt-old' });
```

다음으로 교체(같은 문자열이 `'동시에 여러 401이 발생해도 refresh는 한 번만 호출된다'` 테스트에도 있으므로 **두 곳 모두** 교체):

```js
    expect(instance.post).toHaveBeenCalledWith(
      '/auth/token/refresh', { refreshToken: 'rt-old' }, { skipErrorModal: true }
    );
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- src/api/axiosInstance.test.js`
Expected: FAIL — 새로 추가한 5개 테스트가 실패(`errorToastStore.showErrorToast`가 호출되지 않음), 기존 두 테스트도 실패(호출 인자 불일치)

- [ ] **Step 3: axiosInstance.js 수정**

`src/api/axiosInstance.js` import에 추가:

```js
import { showErrorToast } from '../notifications/errorToastStore';
```

`refreshAccessToken` 함수를 다음으로 교체:

```js
const refreshAccessToken = (session) => {
  if (!refreshPromise) {
    refreshPromise = instance
      .post('/auth/token/refresh', { refreshToken: session.refreshToken }, { skipErrorModal: true })
      .then(({ data }) => {
        setAccessToken(data.data.accessToken);
        updateRefreshToken(data.data.refreshToken);
        return data.data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};
```

`export const handleResponseError = ...` 함수 바로 앞에 추가:

```js
const NETWORK_ERROR_MESSAGE = '네트워크 연결을 확인해주세요.';

const rejectWithToast = (error) => {
  if (!error.config?.skipErrorModal) {
    if (error.response?.data?.success === false) {
      showErrorToast(error.response.data.message);
    } else if (!error.response) {
      showErrorToast(NETWORK_ERROR_MESSAGE);
    }
  }
  return Promise.reject(error);
};
```

`handleResponseError` 안의 `if (!shouldRefresh) { return Promise.reject(error); }`를 다음으로 교체:

```js
  if (!shouldRefresh) {
    return rejectWithToast(error);
  }
```

(`catch (refreshError) { ...; return Promise.reject(refreshError); }` 블록은 그대로 둔다 — 여기는 토스트를 스킵해야 하는 경로이므로 `rejectWithToast`를 쓰지 않는다.)

- [ ] **Step 4: AuthContext.jsx 수정**

`src/context/AuthContext.jsx`에서 부팅 시 세션 복원 코드 중 다음 부분을 찾아:

```js
        const { data } = await instance.post('/auth/token/refresh', {
          refreshToken: session.refreshToken,
        });
```

다음으로 교체:

```js
        const { data } = await instance.post('/auth/token/refresh', {
          refreshToken: session.refreshToken,
        }, { skipErrorModal: true });
```

- [ ] **Step 5: axiosInstance 테스트 통과 확인**

Run: `npm test -- src/api/axiosInstance.test.js`
Expected: PASS (기존 8개 + 신규 5개 = 13개 모두)

- [ ] **Step 6: App.jsx 마운트 실패하는 테스트 작성**

`src/App.test.jsx` 파일 끝에 추가(이미 파일 상단에 `vi.mock('./pages/MainPage', () => ({ default: () => <div>메인페이지</div> }));`가 있으므로 그대로 재사용). 단순히 "토스트가 안 보인다"만 확인하면 `ErrorToast`가 아예 마운트 안 돼 있어도 통과해버리는 의미 없는 테스트가 되므로, 실제로 `showErrorToast`를 호출해서 `App` 안에서 토스트가 뜨는지까지 확인한다:

```js
test('App에 ErrorToast가 마운트되어 에러 토스트를 표시할 수 있다', () => {
  render(<App />);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();

  act(() => {
    showErrorToast('테스트 에러 메시지');
  });

  expect(screen.getByText('테스트 에러 메시지')).toBeInTheDocument();
});
```

`src/App.test.jsx`의 현재 상단 import는 다음과 같다:

```js
import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppRoutes } from './App';
import * as authApi from './api/authApi';
import * as termsApi from './api/termsApi';
```

다음으로 교체(`App` 기본 export, `act`, `showErrorToast` 세 가지 추가):

```js
import { vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import App, { AppRoutes } from './App';
import * as authApi from './api/authApi';
import * as termsApi from './api/termsApi';
import { showErrorToast } from './notifications/errorToastStore';
```

- [ ] **Step 7: 테스트 실패 확인**

Run: `npm test -- src/App.test.jsx`
Expected: FAIL — `showErrorToast('테스트 에러 메시지')`를 호출해도 `ErrorToast`가 `App`에 마운트돼 있지 않아 화면에 아무것도 안 뜸(`getByText('테스트 에러 메시지')`를 찾지 못해 실패)

- [ ] **Step 8: App.jsx에 ErrorToast 마운트**

`src/App.jsx` import에 추가:

```js
import ErrorToast from './components/ErrorToast';
```

`function App() { ... }`을 다음으로 교체:

```jsx
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          <AppRoutes />
        </div>
        <ErrorToast />
      </BrowserRouter>
    </AuthProvider>
  );
}
```

- [ ] **Step 9: App 테스트 통과 확인**

Run: `npm test -- src/App.test.jsx`
Expected: PASS (전체 파일, 기존 테스트 포함)

- [ ] **Step 10: 전체 테스트 + 빌드 확인**

Run: `npm test`
Expected: 전체 PASS (기존 테스트 + 이번 플랜에서 추가된 모든 테스트)

Run: `npm run build`
Expected: 에러 없이 빌드 성공

- [ ] **Step 11: 커밋**

```bash
git add src/api/axiosInstance.js src/api/axiosInstance.test.js src/context/AuthContext.jsx src/App.jsx src/App.test.jsx
git commit -m "feat: axios 인터셉터에 전역 에러 토스트 연결 및 App에 마운트"
```

---

## 이번 계획에 포함되지 않은 것 (별도 계획 예정)

- 기존 17개 화면(SignupPage, LoginPage, FindIdPage, FindPasswordPage, ResetPasswordPage, GoogleCallbackPage, MyPage, WithdrawalModal, BoardListPage, BoardDetailPage, BoardWritePage, BoardEditPage, CommentForm, CommentList, ChatBot, MainPage, DashboardPage, AdminUsersPage — 실사 결과 사실상 전 화면)의 API 호출에 `skipErrorModal: true` 옵트아웃을 붙이는 작업. 이걸 하기 전까지는 이 화면들에서 API가 실패하면 **기존 alert/인라인 메시지와 새 전역 토스트가 동시에 뜨는 중복 표시**가 발생한다는 점을 알아둘 것 — 이번 계획 완료 직후 병합하기 전에 반드시 다음 계획으로 이어가야 한다.
