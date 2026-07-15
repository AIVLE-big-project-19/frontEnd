# 아이디 찾기 / 비밀번호 찾기 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 백엔드에 이미 구현된 아이디 찾기(8, 9번 API), 비밀번호 찾기/재설정(10~13번 API)을 사용하는 프론트엔드 화면 4개(`/find-id`, `/show-id`, `/find-password`, `/reset-password`)를 구현하고, 로그인 페이지의 placeholder 링크를 실제 라우트로 연결한다.

**Architecture:** 공용 axios 인스턴스(`axiosInstance`)를 통해 `authApi`에 6개 함수를 추가하고, 인증코드 카운트다운은 재사용 가능한 `useCountdown` 훅으로, 비밀번호 복잡도 검증은 `passwordRules` 유틸로, 완료 모달은 공용 컴포넌트로 뽑아 두 비밀번호 재설정 화면(`FindPasswordPage`, `ResetPasswordPage`)이 공유한다.

**Tech Stack:** React 19, react-router-dom, axios, vitest + @testing-library/react (기존 스택 그대로 재사용)

**Spec:** `docs/superpowers/specs/2026-07-15-find-id-password-design.md`

## Global Constraints

- 백엔드 응답 공통 포맷: `{ "success": boolean, "message": string, "data": object|null }`
- 비밀번호 규칙(회원가입과 동일): 8~16자, 영문/숫자/특수문자 각 1개 이상 포함. 에러 메시지: `비밀번호는 영문, 숫자, 특수문자를 포함한 8~16자여야 합니다.`
- 인증코드 유효시간: 5분(300초) 카운트다운. 재발송 시 타이머 재시작. 0초가 되면 만료 처리(확인 버튼은 그대로 두되, 만료 후 확인 시도하면 에러 메시지 표시)
- 인증에 사용된 입력값(이메일 또는 아이디+이메일)을 변경하면 발송/인증 상태와 타이머를 모두 리셋한다
- 9번 API(`POST /auth/find-id/verify-code`) 응답은 `{ data: { loginId, maskedLoginId, createdAt } }` — 화면에는 `maskedLoginId`만 렌더링하고 `loginId`는 상태로만 보관
- 13번 API(`POST /auth/password/reset`) 성공 시 서버가 기존 refreshToken을 전부 무효화 — 완료 모달에서 로컬 토큰도 함께 정리
- 에러 메시지는 서버가 준 `err.response.data.message`를 그대로 표시(고정 문구는 서버가 안 줄 때의 fallback으로만 사용)
- 기존 파일 스타일: 함수형 컴포넌트 + hooks, `.jsx` 확장자, `src/styles/AuthPage.css` 공용 스타일 재사용

---

### Task 1: authApi에 아이디/비밀번호 찾기 함수 추가

**Files:**
- Modify: `src/api/authApi.js` (전체 교체)
- Modify: `src/api/authApi.test.js` (전체 교체)

**Interfaces:**
- Consumes: `src/api/axiosInstance.js`의 default export(`instance`) — 이미 존재
- Produces:
  - `sendFindIdCode(email)` → `POST /auth/find-id/send-code`
  - `verifyFindIdCode(email, code)` → `POST /auth/find-id/verify-code`, resolve: `{ data: { loginId, maskedLoginId, createdAt } }`
  - `sendFindPasswordCode(loginId, email)` → `POST /auth/password/send-code`
  - `verifyFindPasswordCode(loginId, email, code)` → `POST /auth/password/verify-code`
  - `getPasswordResetStatus(loginId)` → `GET /auth/password/verification-status`, resolve: `{ data: { verified } }`
  - `resetPassword(loginId, newPassword)` → `POST /auth/password/reset`
  - 모두 `response.data`(`{success, message, data}`)를 반환하는 기존 패턴 유지

- [ ] **Step 1: 실패하는 테스트 작성**

`src/api/authApi.test.js` (전체 교체):

```js
import { vi } from 'vitest';
import instance from './axiosInstance';
import {
  checkLoginId, sendEmailCode, verifyEmailCode, signup, login, logout,
  sendFindIdCode, verifyFindIdCode, sendFindPasswordCode, verifyFindPasswordCode,
  getPasswordResetStatus, resetPassword,
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

test('sendFindIdCode는 이메일을 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok(null));
  await sendFindIdCode('a@b.com');
  expect(instance.post).toHaveBeenCalledWith('/auth/find-id/send-code', { email: 'a@b.com' });
});

test('verifyFindIdCode는 이메일과 코드를 POST하고 결과를 반환한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(
    ok({ loginId: 'tester01', maskedLoginId: 'te******', createdAt: '2026-01-01T12:00:00' })
  );
  const result = await verifyFindIdCode('a@b.com', '123456');
  expect(instance.post).toHaveBeenCalledWith('/auth/find-id/verify-code', { email: 'a@b.com', code: '123456' });
  expect(result.data.loginId).toBe('tester01');
  expect(result.data.maskedLoginId).toBe('te******');
});

test('sendFindPasswordCode는 아이디와 이메일을 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok(null));
  await sendFindPasswordCode('tester01', 'a@b.com');
  expect(instance.post).toHaveBeenCalledWith('/auth/password/send-code', { loginId: 'tester01', email: 'a@b.com' });
});

test('verifyFindPasswordCode는 아이디/이메일/코드를 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok(null));
  await verifyFindPasswordCode('tester01', 'a@b.com', '123456');
  expect(instance.post).toHaveBeenCalledWith('/auth/password/verify-code', {
    loginId: 'tester01', email: 'a@b.com', code: '123456',
  });
});

test('getPasswordResetStatus는 loginId 쿼리로 GET 요청한다', async () => {
  vi.spyOn(instance, 'get').mockResolvedValue(ok({ verified: true }));
  const result = await getPasswordResetStatus('tester01');
  expect(instance.get).toHaveBeenCalledWith('/auth/password/verification-status', { params: { loginId: 'tester01' } });
  expect(result.data.verified).toBe(true);
});

test('resetPassword는 아이디와 새 비밀번호를 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok(null));
  await resetPassword('tester01', 'NewPassword1!');
  expect(instance.post).toHaveBeenCalledWith('/auth/password/reset', {
    loginId: 'tester01', newPassword: 'NewPassword1!',
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- src/api/authApi.test.js`
Expected: FAIL — `sendFindIdCode is not a function` 등 (아직 export 안 됨)

- [ ] **Step 3: 구현**

`src/api/authApi.js` (전체 교체):

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

export const sendFindIdCode = async (email) => {
  const { data } = await instance.post('/auth/find-id/send-code', { email });
  return data;
};

export const verifyFindIdCode = async (email, code) => {
  const { data } = await instance.post('/auth/find-id/verify-code', { email, code });
  return data;
};

export const sendFindPasswordCode = async (loginId, email) => {
  const { data } = await instance.post('/auth/password/send-code', { loginId, email });
  return data;
};

export const verifyFindPasswordCode = async (loginId, email, code) => {
  const { data } = await instance.post('/auth/password/verify-code', { loginId, email, code });
  return data;
};

export const getPasswordResetStatus = async (loginId) => {
  const { data } = await instance.get('/auth/password/verification-status', { params: { loginId } });
  return data;
};

export const resetPassword = async (loginId, newPassword) => {
  const { data } = await instance.post('/auth/password/reset', { loginId, newPassword });
  return data;
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- src/api/authApi.test.js`
Expected: 12 passed

- [ ] **Step 5: Commit**

```bash
git add src/api/authApi.js src/api/authApi.test.js
git commit -m "feat: 아이디/비밀번호 찾기 API 함수 추가"
```

---

### Task 2: 비밀번호 복잡도 검증 공용 유틸 + SignupPage 리팩터

**Files:**
- Create: `src/utils/passwordRules.js`
- Test: `src/utils/passwordRules.test.js`
- Modify: `src/pages/SignupPage.jsx` (검증 로직만 교체)

**Interfaces:**
- Produces:
  - `isValidPassword(password): boolean` — 8~16자 + 영문/숫자/특수문자 각 1개 이상
  - `PASSWORD_RULE_MESSAGE: string` — `'비밀번호는 영문, 숫자, 특수문자를 포함한 8~16자여야 합니다.'`
  - 이후 태스크(FindPasswordPage, ResetPasswordPage)와 이번 태스크의 SignupPage가 모두 이 두 값을 import해서 사용

- [ ] **Step 1: 실패하는 테스트 작성**

`src/utils/passwordRules.test.js`:

```js
import { isValidPassword, PASSWORD_RULE_MESSAGE } from './passwordRules';

test('8~16자, 영문/숫자/특수문자를 모두 포함하면 유효하다', () => {
  expect(isValidPassword('Password1!')).toBe(true);
});

test('길이가 8자 미만이면 무효하다', () => {
  expect(isValidPassword('Pass1!')).toBe(false);
});

test('길이가 16자 초과면 무효하다', () => {
  expect(isValidPassword('Password123456789!')).toBe(false);
});

test('특수문자가 없으면 무효하다', () => {
  expect(isValidPassword('Password123')).toBe(false);
});

test('숫자가 없으면 무효하다', () => {
  expect(isValidPassword('Password!!!')).toBe(false);
});

test('영문이 없으면 무효하다', () => {
  expect(isValidPassword('12345678!')).toBe(false);
});

test('메시지 상수가 올바르다', () => {
  expect(PASSWORD_RULE_MESSAGE).toBe('비밀번호는 영문, 숫자, 특수문자를 포함한 8~16자여야 합니다.');
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- src/utils/passwordRules.test.js`
Expected: FAIL — "Failed to resolve import ./passwordRules"

- [ ] **Step 3: 구현**

`src/utils/passwordRules.js`:

```js
export const PASSWORD_RULE_MESSAGE = '비밀번호는 영문, 숫자, 특수문자를 포함한 8~16자여야 합니다.';

export const isValidPassword = (password) => {
  const validLength = password.length >= 8 && password.length <= 16;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return validLength && hasLetter && hasDigit && hasSpecial;
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- src/utils/passwordRules.test.js`
Expected: 7 passed

- [ ] **Step 5: SignupPage가 공용 유틸을 사용하도록 교체**

`src/pages/SignupPage.jsx`에서 다음을 찾아:

```js
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as authApi from '../api/authApi';
import '../styles/AuthPage.css';
```

다음으로 교체(import 한 줄 추가):

```js
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as authApi from '../api/authApi';
import { isValidPassword, PASSWORD_RULE_MESSAGE } from '../utils/passwordRules';
import '../styles/AuthPage.css';
```

그리고 `handleSubmit` 안의 다음 블록을 찾아:

```js
    const validLength = password.length >= 8 && password.length <= 16;
    const hasLetter = /[A-Za-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    if (!validLength || !hasLetter || !hasDigit || !hasSpecial) {
      setFormError('비밀번호는 영문, 숫자, 특수문자를 포함한 8~16자여야 합니다.');
      return;
    }
```

다음으로 교체:

```js
    if (!isValidPassword(password)) {
      setFormError(PASSWORD_RULE_MESSAGE);
      return;
    }
```

- [ ] **Step 6: 기존 SignupPage 테스트가 그대로 통과하는지 확인**

Run: `npm test -- src/pages/SignupPage.test.jsx`
Expected: 8 passed (메시지 문자열이 동일하므로 기존 테스트 수정 불필요)

- [ ] **Step 7: Commit**

```bash
git add src/utils/passwordRules.js src/utils/passwordRules.test.js src/pages/SignupPage.jsx
git commit -m "feat: 비밀번호 복잡도 검증 공용 유틸 추출 및 SignupPage 적용"
```

---

### Task 3: 인증코드 카운트다운 훅

**Files:**
- Create: `src/hooks/useCountdown.js`
- Test: `src/hooks/useCountdown.test.js`

**Interfaces:**
- Produces:
  - `formatCountdown(totalSeconds): string` — `"m:ss"` 형식(예: 300 → `"5:00"`, 59 → `"0:59"`)
  - `useCountdown(durationSeconds)` → `{ secondsLeft, isRunning, isExpired, start(), stop(), label }` — `label`은 `formatCountdown(secondsLeft)`. `start()`를 다시 호출하면 처음부터 재시작. 0초가 되면 `isRunning=false`, `isExpired=true`
  - 이후 태스크(FindIdPage, FindPasswordPage)가 이 훅을 사용

- [ ] **Step 1: 실패하는 테스트 작성**

`src/hooks/useCountdown.test.js`:

```js
import { renderHook, act } from '@testing-library/react';
import { useCountdown, formatCountdown } from './useCountdown';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test('formatCountdown은 mm:ss 형식으로 변환한다', () => {
  expect(formatCountdown(300)).toBe('5:00');
  expect(formatCountdown(59)).toBe('0:59');
  expect(formatCountdown(0)).toBe('0:00');
});

test('start 호출 시 지정한 시간부터 카운트다운을 시작한다', () => {
  const { result } = renderHook(() => useCountdown(300));
  act(() => {
    result.current.start();
  });
  expect(result.current.secondsLeft).toBe(300);
  expect(result.current.isRunning).toBe(true);

  act(() => {
    vi.advanceTimersByTime(1000);
  });
  expect(result.current.secondsLeft).toBe(299);
});

test('시간이 0이 되면 만료 상태가 된다', () => {
  const { result } = renderHook(() => useCountdown(2));
  act(() => {
    result.current.start();
  });
  act(() => {
    vi.advanceTimersByTime(2000);
  });
  expect(result.current.secondsLeft).toBe(0);
  expect(result.current.isRunning).toBe(false);
  expect(result.current.isExpired).toBe(true);
});

test('start를 다시 호출하면 타이머가 재시작된다', () => {
  const { result } = renderHook(() => useCountdown(300));
  act(() => {
    result.current.start();
  });
  act(() => {
    vi.advanceTimersByTime(5000);
  });
  expect(result.current.secondsLeft).toBe(295);

  act(() => {
    result.current.start();
  });
  expect(result.current.secondsLeft).toBe(300);
});

test('stop을 호출하면 타이머가 멈춘다', () => {
  const { result } = renderHook(() => useCountdown(300));
  act(() => {
    result.current.start();
  });
  act(() => {
    result.current.stop();
  });
  expect(result.current.isRunning).toBe(false);

  const secondsAfterStop = result.current.secondsLeft;
  act(() => {
    vi.advanceTimersByTime(3000);
  });
  expect(result.current.secondsLeft).toBe(secondsAfterStop);
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- src/hooks/useCountdown.test.js`
Expected: FAIL — "Failed to resolve import ./useCountdown"

- [ ] **Step 3: 구현**

`src/hooks/useCountdown.js`:

```js
import { useCallback, useEffect, useRef, useState } from 'react';

export const formatCountdown = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export const useCountdown = (durationSeconds) => {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const start = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setSecondsLeft(durationSeconds);
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [durationSeconds]);

  useEffect(() => stop, [stop]);

  return {
    secondsLeft,
    isRunning,
    isExpired: !isRunning && secondsLeft === 0,
    start,
    stop,
    label: formatCountdown(secondsLeft),
  };
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- src/hooks/useCountdown.test.js`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCountdown.js src/hooks/useCountdown.test.js
git commit -m "feat: 인증코드 카운트다운 useCountdown 훅 구현"
```

---

### Task 4: 비밀번호 변경 완료 모달

**Files:**
- Create: `src/components/PasswordResetSuccessModal.jsx`
- Test: `src/components/PasswordResetSuccessModal.test.jsx`
- Modify: `src/styles/AuthPage.css` (모달 스타일 추가)

**Interfaces:**
- Consumes: `src/auth/tokenStorage.js`의 `clearSession()` (이미 존재)
- Produces: `<PasswordResetSuccessModal loginId={string} />` — "로그인" 버튼 클릭 시 `clearSession()` 호출 후 `/login`으로 `state: { loginId }`를 실어 이동. 이후 태스크(FindPasswordPage, ResetPasswordPage)가 사용

- [ ] **Step 1: 실패하는 테스트 작성**

`src/components/PasswordResetSuccessModal.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import PasswordResetSuccessModal from './PasswordResetSuccessModal';
import { saveSession, setAccessToken, loadSession, getAccessToken, clearSession } from '../auth/tokenStorage';

const LoginProbe = () => {
  const location = useLocation();
  return <div>로그인페이지:{location.state?.loginId}</div>;
};

beforeEach(() => {
  clearSession();
});

const renderModal = (loginId = 'tester01') =>
  render(
    <MemoryRouter initialEntries={['/reset-password']}>
      <Routes>
        <Route path="/reset-password" element={<PasswordResetSuccessModal loginId={loginId} />} />
        <Route path="/login" element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>
  );

test('완료 메시지를 보여준다', () => {
  renderModal();
  expect(screen.getByText('비밀번호 변경이 완료되었습니다.')).toBeInTheDocument();
});

test('로그인 버튼 클릭 시 세션을 정리하고 loginId와 함께 로그인 페이지로 이동한다', async () => {
  setAccessToken('at');
  saveSession({ refreshToken: 'rt', loginId: 'old', rememberMe: true });

  renderModal('tester01');
  await userEvent.click(screen.getByRole('button', { name: '로그인' }));

  expect(screen.getByText('로그인페이지:tester01')).toBeInTheDocument();
  expect(getAccessToken()).toBeNull();
  expect(loadSession()).toBeNull();
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- src/components/PasswordResetSuccessModal.test.jsx`
Expected: FAIL — "Failed to resolve import ./PasswordResetSuccessModal"

- [ ] **Step 3: 구현**

`src/components/PasswordResetSuccessModal.jsx`:

```jsx
import { useNavigate } from 'react-router-dom';
import { clearSession } from '../auth/tokenStorage';

const PasswordResetSuccessModal = ({ loginId }) => {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    clearSession();
    navigate('/login', { state: { loginId } });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <p>비밀번호 변경이 완료되었습니다.</p>
        <button type="button" className="auth-submit" onClick={handleLoginClick}>
          로그인
        </button>
      </div>
    </div>
  );
};

export default PasswordResetSuccessModal;
```

`src/styles/AuthPage.css` 맨 끝에 추가:

```css

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-box {
  background: #fff;
  border-radius: 12px;
  padding: 32px;
  max-width: 360px;
  width: 100%;
  text-align: center;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
}

.modal-box p {
  margin: 0 0 20px;
  font-size: 15px;
  color: #101828;
}

.modal-box .auth-submit {
  width: auto;
  padding: 10px 32px;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- src/components/PasswordResetSuccessModal.test.jsx`
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add src/components/PasswordResetSuccessModal.jsx src/components/PasswordResetSuccessModal.test.jsx src/styles/AuthPage.css
git commit -m "feat: 비밀번호 변경 완료 모달 컴포넌트 구현"
```

---

### Task 5: FindIdPage (`/find-id`)

**Files:**
- Create: `src/pages/FindIdPage.jsx`
- Test: `src/pages/FindIdPage.test.jsx`
- Modify: `src/styles/AuthPage.css` (카운트다운 스타일 추가)

**Interfaces:**
- Consumes: `authApi.sendFindIdCode`, `authApi.verifyFindIdCode`, `useCountdown` (Task 3), react-router `useNavigate`, `Link`
- Produces: 완성된 아이디 찾기 입력 화면. 인증 성공 시 "아이디 찾기" 버튼 활성화, 클릭하면 추가 API 호출 없이 `navigate('/show-id', { state: { loginId, maskedLoginId, createdAt } })`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/pages/FindIdPage.test.jsx`:

```jsx
import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import FindIdPage from './FindIdPage';
import * as authApi from '../api/authApi';

vi.mock('../api/authApi');

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/find-id']}>
      <Routes>
        <Route path="/find-id" element={<FindIdPage />} />
        <Route path="/show-id" element={<div>결과페이지</div>} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
});

test('처음에는 아이디 찾기 버튼이 비활성화되어 있다', () => {
  renderPage();
  expect(screen.getByRole('button', { name: '아이디 찾기' })).toBeDisabled();
});

test('이메일 인증 후 아이디 찾기 버튼이 활성화되고 클릭 시 결과 페이지로 이동한다', async () => {
  authApi.sendFindIdCode.mockResolvedValue({ success: true });
  authApi.verifyFindIdCode.mockResolvedValue({
    success: true,
    data: { loginId: 'tester01', maskedLoginId: 'te******', createdAt: '2026-01-01T12:00:00' },
  });
  renderPage();

  await userEvent.type(screen.getByLabelText('이메일'), 'user@example.com');
  await userEvent.click(screen.getByRole('button', { name: '인증번호 받기' }));
  await userEvent.type(screen.getByLabelText('인증번호'), '123456');
  await userEvent.click(screen.getByRole('button', { name: '인증번호 확인' }));

  await waitFor(() => expect(screen.getByRole('button', { name: '아이디 찾기' })).toBeEnabled());
  await userEvent.click(screen.getByRole('button', { name: '아이디 찾기' }));

  await waitFor(() => expect(screen.getByText('결과페이지')).toBeInTheDocument());
});

test('인증코드가 틀리면 에러 메시지를 보여준다', async () => {
  authApi.sendFindIdCode.mockResolvedValue({ success: true });
  authApi.verifyFindIdCode.mockRejectedValue({
    response: { status: 400, data: { success: false, message: '인증번호가 일치하지 않거나 만료되었습니다.' } },
  });
  renderPage();

  await userEvent.type(screen.getByLabelText('이메일'), 'user@example.com');
  await userEvent.click(screen.getByRole('button', { name: '인증번호 받기' }));
  await userEvent.type(screen.getByLabelText('인증번호'), '000000');
  await userEvent.click(screen.getByRole('button', { name: '인증번호 확인' }));

  await waitFor(() =>
    expect(screen.getByText('인증번호가 일치하지 않거나 만료되었습니다.')).toBeInTheDocument()
  );
});

test('인증코드 발송 후 이메일을 바꾸면 인증코드 입력란이 사라진다', async () => {
  authApi.sendFindIdCode.mockResolvedValue({ success: true });
  renderPage();

  await userEvent.type(screen.getByLabelText('이메일'), 'user@example.com');
  await userEvent.click(screen.getByRole('button', { name: '인증번호 받기' }));
  await waitFor(() => expect(screen.getByLabelText('인증번호')).toBeInTheDocument());

  await userEvent.clear(screen.getByLabelText('이메일'));
  await userEvent.type(screen.getByLabelText('이메일'), 'other@example.com');

  expect(screen.queryByLabelText('인증번호')).not.toBeInTheDocument();
});

test('회원 정보가 없는 이메일이면 서버 메시지를 보여준다', async () => {
  authApi.sendFindIdCode.mockRejectedValue({
    response: { status: 404, data: { success: false, message: '일치하는 회원 정보를 찾을 수 없습니다.' } },
  });
  renderPage();

  await userEvent.type(screen.getByLabelText('이메일'), 'nouser@example.com');
  await userEvent.click(screen.getByRole('button', { name: '인증번호 받기' }));

  await waitFor(() =>
    expect(screen.getByText('일치하는 회원 정보를 찾을 수 없습니다.')).toBeInTheDocument()
  );
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- src/pages/FindIdPage.test.jsx`
Expected: FAIL — "Failed to resolve import ./FindIdPage"

- [ ] **Step 3: 구현**

`src/pages/FindIdPage.jsx`:

```jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as authApi from '../api/authApi';
import { useCountdown } from '../hooks/useCountdown';
import '../styles/AuthPage.css';

const CODE_DURATION_SECONDS = 300;

const FindIdPage = () => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const countdown = useCountdown(CODE_DURATION_SECONDS);
  const navigate = useNavigate();

  const serverMessage = (err, fallback) => err.response?.data?.message || fallback;

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setCodeSent(false);
    setVerified(false);
    setResult(null);
    setMessage({ type: '', text: '' });
    countdown.stop();
  };

  const handleSendCode = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage({ type: 'error', text: '올바른 이메일 형식이 아닙니다.' });
      return;
    }
    try {
      await authApi.sendFindIdCode(email);
      setCodeSent(true);
      setVerified(false);
      setResult(null);
      countdown.start();
      setMessage({ type: 'info', text: '인증코드를 발송했습니다. 메일함을 확인해주세요.' });
    } catch (err) {
      setMessage({ type: 'error', text: serverMessage(err, '인증코드 발송에 실패했습니다.') });
    }
  };

  const handleVerifyCode = async () => {
    if (countdown.isExpired) {
      setMessage({ type: 'error', text: '인증 시간이 만료되었습니다. 인증코드를 다시 받아주세요.' });
      return;
    }
    try {
      const response = await authApi.verifyFindIdCode(email, code);
      setVerified(true);
      setResult(response.data);
      countdown.stop();
      setMessage({ type: 'info', text: '인증이 완료되었습니다.' });
    } catch (err) {
      setMessage({ type: 'error', text: serverMessage(err, '인증 확인에 실패했습니다.') });
    }
  };

  const handleFindId = () => {
    navigate('/show-id', { state: result });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>SolarAivle ID 찾기</h1>

        <div className="auth-field">
          <label htmlFor="find-id-email">이메일</label>
          <div className="auth-field-row">
            <input
              id="find-id-email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              disabled={verified}
              placeholder="이메일 주소를 입력해주세요"
            />
            <button
              type="button"
              className="auth-sub-button"
              onClick={handleSendCode}
              disabled={verified}
            >
              인증번호 받기
            </button>
          </div>
        </div>

        {codeSent && !verified && (
          <div className="auth-field">
            <label htmlFor="find-id-code">인증번호</label>
            <div className="auth-field-row">
              <input
                id="find-id-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                placeholder="인증번호 입력"
              />
              <span className="auth-countdown">{countdown.label}</span>
              <button type="button" className="auth-sub-button" onClick={handleVerifyCode}>
                인증번호 확인
              </button>
            </div>
          </div>
        )}

        {message.text && (
          <p className={message.type === 'error' ? 'auth-error' : 'auth-info'}>{message.text}</p>
        )}

        <button type="button" className="auth-submit" disabled={!verified} onClick={handleFindId}>
          아이디 찾기
        </button>

        <div className="auth-links">
          <Link to="/login">로그인으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
};

export default FindIdPage;
```

`src/styles/AuthPage.css` 맨 끝에 추가:

```css

.auth-countdown {
  font-size: 13px;
  color: #dc2626;
  white-space: nowrap;
  align-self: center;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- src/pages/FindIdPage.test.jsx`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add src/pages/FindIdPage.jsx src/pages/FindIdPage.test.jsx src/styles/AuthPage.css
git commit -m "feat: 아이디 찾기 입력 페이지(FindIdPage) 구현"
```

---

### Task 6: ShowIdPage (`/show-id`)

**Files:**
- Create: `src/pages/ShowIdPage.jsx`
- Test: `src/pages/ShowIdPage.test.jsx`
- Modify: `src/styles/AuthPage.css` (결과 박스 스타일 추가)

**Interfaces:**
- Consumes: react-router `useLocation`, `useNavigate`, `Navigate`, `Link`. `location.state`는 Task 5의 `handleFindId`가 실어 보낸 `{ loginId, maskedLoginId, createdAt }`
- Produces: `location.state`가 없으면 `/find-id`로 리다이렉트. 있으면 마스킹된 아이디+가입일 표시, "로그인하기"(`/login`으로 `state:{loginId}`), "비밀번호 재설정"(`/reset-password`로 `state:{loginId, verified:true}`)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/pages/ShowIdPage.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import ShowIdPage from './ShowIdPage';

const LoginProbe = () => {
  const location = useLocation();
  return <div>로그인페이지:{location.state?.loginId}</div>;
};

const ResetProbe = () => {
  const location = useLocation();
  return (
    <div>
      재설정페이지:{location.state?.loginId}:{String(location.state?.verified)}
    </div>
  );
};

const renderPage = (state) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/show-id', state }]}>
      <Routes>
        <Route path="/show-id" element={<ShowIdPage />} />
        <Route path="/find-id" element={<div>아이디찾기페이지</div>} />
        <Route path="/login" element={<LoginProbe />} />
        <Route path="/reset-password" element={<ResetProbe />} />
      </Routes>
    </MemoryRouter>
  );

test('state가 없으면 아이디 찾기 페이지로 리다이렉트한다', () => {
  renderPage(undefined);
  expect(screen.getByText('아이디찾기페이지')).toBeInTheDocument();
});

test('마스킹된 아이디와 가입일을 보여준다', () => {
  renderPage({ loginId: 'tester01', maskedLoginId: 'te******', createdAt: '2026-01-01T12:00:00' });
  expect(screen.getByText(/te\*\*\*\*\*\*/)).toBeInTheDocument();
  expect(screen.getByText(/2026-01-01/)).toBeInTheDocument();
});

test('로그인하기 클릭 시 실제 loginId를 담아 로그인 페이지로 이동한다', async () => {
  renderPage({ loginId: 'tester01', maskedLoginId: 'te******', createdAt: '2026-01-01T12:00:00' });
  await userEvent.click(screen.getByRole('button', { name: '로그인하기' }));
  expect(screen.getByText('로그인페이지:tester01')).toBeInTheDocument();
});

test('비밀번호 재설정 클릭 시 실제 loginId와 verified 플래그를 담아 이동한다', async () => {
  renderPage({ loginId: 'tester01', maskedLoginId: 'te******', createdAt: '2026-01-01T12:00:00' });
  await userEvent.click(screen.getByRole('button', { name: '비밀번호 재설정' }));
  expect(screen.getByText('재설정페이지:tester01:true')).toBeInTheDocument();
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- src/pages/ShowIdPage.test.jsx`
Expected: FAIL — "Failed to resolve import ./ShowIdPage"

- [ ] **Step 3: 구현**

`src/pages/ShowIdPage.jsx`:

```jsx
import { Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import '../styles/AuthPage.css';

const formatDate = (isoString) => {
  if (!isoString) return '';
  return isoString.slice(0, 10);
};

const ShowIdPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state;

  if (!result) {
    return <Navigate to="/find-id" replace />;
  }

  const { loginId, maskedLoginId, createdAt } = result;

  const handleLogin = () => {
    navigate('/login', { state: { loginId } });
  };

  const handleResetPassword = () => {
    navigate('/reset-password', { state: { loginId, verified: true } });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>SolarAivle ID 찾기</h1>
        <p className="auth-subtitle">고객님의 정보와 일치하는 SolarAivle ID 입니다</p>

        <div className="found-id-box">
          <div>SolarAivle ID: {maskedLoginId}</div>
          <div>가입일: {formatDate(createdAt)}</div>
        </div>

        <button type="button" className="auth-submit" onClick={handleLogin}>
          로그인하기
        </button>
        <button
          type="button"
          className="auth-submit auth-submit-secondary"
          onClick={handleResetPassword}
        >
          비밀번호 재설정
        </button>

        <div className="auth-links">
          <Link to="/login">로그인으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
};

export default ShowIdPage;
```

`src/styles/AuthPage.css` 맨 끝에 추가:

```css

.auth-subtitle {
  text-align: center;
  color: #475467;
  margin: -16px 0 24px;
  font-size: 14px;
}

.found-id-box {
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
  font-size: 14px;
  color: #101828;
}

.found-id-box div {
  margin-bottom: 8px;
}

.found-id-box div:last-child {
  margin-bottom: 0;
}

.auth-submit-secondary {
  margin-top: 12px;
  background: #fff;
  color: #14b8a6;
  border: 1px solid #14b8a6;
}

.auth-submit-secondary:hover:not(:disabled) {
  background: #f0fdfa;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- src/pages/ShowIdPage.test.jsx`
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add src/pages/ShowIdPage.jsx src/pages/ShowIdPage.test.jsx src/styles/AuthPage.css
git commit -m "feat: 아이디 찾기 결과 페이지(ShowIdPage) 구현"
```

---

### Task 7: FindPasswordPage (`/find-password`) — 로그인 화면에서 직접 진입

**Files:**
- Create: `src/pages/FindPasswordPage.jsx`
- Test: `src/pages/FindPasswordPage.test.jsx`

**Interfaces:**
- Consumes: `authApi.sendFindPasswordCode`, `authApi.verifyFindPasswordCode`, `authApi.resetPassword`, `isValidPassword`/`PASSWORD_RULE_MESSAGE`(Task 2), `useCountdown`(Task 3), `PasswordResetSuccessModal`(Task 4)
- Produces: 완성된 비밀번호 찾기(자기인증) 페이지. 이메일 인증 성공 전엔 "변경하기" 비활성화. 성공 시 `resetPassword(loginId, password)` 호출 후 `PasswordResetSuccessModal` 렌더링

- [ ] **Step 1: 실패하는 테스트 작성**

`src/pages/FindPasswordPage.test.jsx`:

```jsx
import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import FindPasswordPage from './FindPasswordPage';
import * as authApi from '../api/authApi';

vi.mock('../api/authApi');

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/find-password']}>
      <Routes>
        <Route path="/find-password" element={<FindPasswordPage />} />
        <Route path="/login" element={<div>로그인페이지</div>} />
      </Routes>
    </MemoryRouter>
  );

const completeVerification = async () => {
  authApi.sendFindPasswordCode.mockResolvedValue({ success: true });
  authApi.verifyFindPasswordCode.mockResolvedValue({ success: true });

  await userEvent.type(screen.getByLabelText('아이디'), 'tester01');
  await userEvent.type(screen.getByLabelText('이메일'), 'user@example.com');
  await userEvent.click(screen.getByRole('button', { name: '인증번호 받기' }));
  await userEvent.type(screen.getByLabelText('인증번호'), '123456');
  await userEvent.click(screen.getByRole('button', { name: '인증번호 확인' }));
  await waitFor(() => expect(screen.getByText('인증이 완료되었습니다.')).toBeInTheDocument());
};

beforeEach(() => {
  vi.clearAllMocks();
});

test('처음에는 변경하기 버튼이 비활성화되어 있다', () => {
  renderPage();
  expect(screen.getByRole('button', { name: '변경하기' })).toBeDisabled();
});

test('이메일 인증 후 비밀번호를 변경하면 완료 모달을 보여준다', async () => {
  authApi.resetPassword.mockResolvedValue({ success: true });
  renderPage();

  await completeVerification();
  await userEvent.type(screen.getByLabelText('비밀번호'), 'Password1!');
  await userEvent.type(screen.getByLabelText('비밀번호 확인'), 'Password1!');

  const submit = screen.getByRole('button', { name: '변경하기' });
  expect(submit).toBeEnabled();
  await userEvent.click(submit);

  await waitFor(() => expect(screen.getByText('비밀번호 변경이 완료되었습니다.')).toBeInTheDocument());
  expect(authApi.resetPassword).toHaveBeenCalledWith('tester01', 'Password1!');
});

test('아이디를 바꾸면 인증 상태가 리셋된다', async () => {
  authApi.sendFindPasswordCode.mockResolvedValue({ success: true });
  renderPage();

  await userEvent.type(screen.getByLabelText('아이디'), 'tester01');
  await userEvent.type(screen.getByLabelText('이메일'), 'user@example.com');
  await userEvent.click(screen.getByRole('button', { name: '인증번호 받기' }));
  await waitFor(() => expect(screen.getByLabelText('인증번호')).toBeInTheDocument());

  await userEvent.type(screen.getByLabelText('아이디'), 'x');

  expect(screen.queryByLabelText('인증번호')).not.toBeInTheDocument();
});

test('회원 정보가 없으면 서버 메시지를 보여준다', async () => {
  authApi.sendFindPasswordCode.mockRejectedValue({
    response: { status: 404, data: { success: false, message: '일치하는 회원 정보를 찾을 수 없습니다.' } },
  });
  renderPage();

  await userEvent.type(screen.getByLabelText('아이디'), 'tester01');
  await userEvent.type(screen.getByLabelText('이메일'), 'user@example.com');
  await userEvent.click(screen.getByRole('button', { name: '인증번호 받기' }));

  await waitFor(() =>
    expect(screen.getByText('일치하는 회원 정보를 찾을 수 없습니다.')).toBeInTheDocument()
  );
});

test('비밀번호 조건을 만족하지 않으면 에러를 보여주고 API를 호출하지 않는다', async () => {
  authApi.resetPassword.mockResolvedValue({ success: true });
  renderPage();

  await completeVerification();
  await userEvent.type(screen.getByLabelText('비밀번호'), 'short');
  await userEvent.type(screen.getByLabelText('비밀번호 확인'), 'short');
  await userEvent.click(screen.getByRole('button', { name: '변경하기' }));

  await waitFor(() =>
    expect(screen.getByText('비밀번호는 영문, 숫자, 특수문자를 포함한 8~16자여야 합니다.')).toBeInTheDocument()
  );
  expect(authApi.resetPassword).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- src/pages/FindPasswordPage.test.jsx`
Expected: FAIL — "Failed to resolve import ./FindPasswordPage"

- [ ] **Step 3: 구현**

`src/pages/FindPasswordPage.jsx`:

```jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as authApi from '../api/authApi';
import { isValidPassword, PASSWORD_RULE_MESSAGE } from '../utils/passwordRules';
import { useCountdown } from '../hooks/useCountdown';
import PasswordResetSuccessModal from '../components/PasswordResetSuccessModal';
import '../styles/AuthPage.css';

const CODE_DURATION_SECONDS = 300;

const FindPasswordPage = () => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const countdown = useCountdown(CODE_DURATION_SECONDS);

  const serverMessage = (err, fallback) => err.response?.data?.message || fallback;

  const resetVerification = () => {
    setCodeSent(false);
    setVerified(false);
    setMessage({ type: '', text: '' });
    countdown.stop();
  };

  const handleLoginIdChange = (e) => {
    setLoginId(e.target.value);
    resetVerification();
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    resetVerification();
  };

  const handleSendCode = async () => {
    if (!loginId) {
      setMessage({ type: 'error', text: '아이디를 입력해주세요.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage({ type: 'error', text: '올바른 이메일 형식이 아닙니다.' });
      return;
    }
    try {
      await authApi.sendFindPasswordCode(loginId, email);
      setCodeSent(true);
      setVerified(false);
      countdown.start();
      setMessage({ type: 'info', text: '인증코드를 발송했습니다. 메일함을 확인해주세요.' });
    } catch (err) {
      setMessage({ type: 'error', text: serverMessage(err, '인증코드 발송에 실패했습니다.') });
    }
  };

  const handleVerifyCode = async () => {
    if (countdown.isExpired) {
      setMessage({ type: 'error', text: '인증 시간이 만료되었습니다. 인증코드를 다시 받아주세요.' });
      return;
    }
    try {
      await authApi.verifyFindPasswordCode(loginId, email, code);
      setVerified(true);
      countdown.stop();
      setMessage({ type: 'info', text: '인증이 완료되었습니다.' });
    } catch (err) {
      setMessage({ type: 'error', text: serverMessage(err, '인증 확인에 실패했습니다.') });
    }
  };

  const passwordMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;
  const passwordMatches = passwordConfirm.length > 0 && password === passwordConfirm;
  const canSubmit = verified && !passwordMismatch && !isSubmitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidPassword(password)) {
      setFormError(PASSWORD_RULE_MESSAGE);
      return;
    }
    setFormError('');
    setIsSubmitting(true);
    try {
      await authApi.resetPassword(loginId, password);
      setResetDone(true);
    } catch (err) {
      setFormError(serverMessage(err, '비밀번호 변경에 실패했습니다. 잠시 후 다시 시도해주세요.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (resetDone) {
    return <PasswordResetSuccessModal loginId={loginId} />;
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>비밀번호 찾기</h1>
        <p className="auth-subtitle">비밀번호 찾기를 위한 SolarAivle ID를 입력해 주세요</p>

        <div className="auth-field">
          <label htmlFor="find-password-loginId">아이디</label>
          <input
            id="find-password-loginId"
            value={loginId}
            onChange={handleLoginIdChange}
            placeholder="아이디 입력"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="find-password-password">비밀번호</label>
          <input
            id="find-password-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="새 비밀번호 입력"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="find-password-passwordConfirm">비밀번호 확인</label>
          <input
            id="find-password-passwordConfirm"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            autoComplete="new-password"
            placeholder="새 비밀번호 확인"
          />
          {passwordMismatch && <p className="auth-error">비밀번호가 일치하지 않습니다.</p>}
          {passwordMatches && <p className="auth-info">비밀번호가 일치합니다.</p>}
        </div>

        <div className="auth-field">
          <label htmlFor="find-password-email">이메일</label>
          <div className="auth-field-row">
            <input
              id="find-password-email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              disabled={verified}
              placeholder="이메일"
            />
            <button
              type="button"
              className="auth-sub-button"
              onClick={handleSendCode}
              disabled={verified}
            >
              인증번호 받기
            </button>
          </div>
        </div>

        {codeSent && !verified && (
          <div className="auth-field">
            <label htmlFor="find-password-code">인증번호</label>
            <div className="auth-field-row">
              <input
                id="find-password-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                placeholder="인증번호"
              />
              <span className="auth-countdown">{countdown.label}</span>
              <button type="button" className="auth-sub-button" onClick={handleVerifyCode}>
                인증번호 확인
              </button>
            </div>
          </div>
        )}

        {message.text && (
          <p className={message.type === 'error' ? 'auth-error' : 'auth-info'}>{message.text}</p>
        )}
        {formError && <p className="auth-error">{formError}</p>}

        <button className="auth-submit" type="submit" disabled={!canSubmit}>
          변경하기
        </button>

        <div className="auth-links">
          <Link to="/login">로그인으로 돌아가기</Link>
        </div>
      </form>
    </div>
  );
};

export default FindPasswordPage;
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- src/pages/FindPasswordPage.test.jsx`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add src/pages/FindPasswordPage.jsx src/pages/FindPasswordPage.test.jsx
git commit -m "feat: 비밀번호 찾기(자기인증) 페이지(FindPasswordPage) 구현"
```

---

### Task 8: ResetPasswordPage (`/reset-password`) — 아이디 찾기 경유

**Files:**
- Create: `src/pages/ResetPasswordPage.jsx`
- Test: `src/pages/ResetPasswordPage.test.jsx`

**Interfaces:**
- Consumes: `authApi.getPasswordResetStatus`, `authApi.resetPassword`, `isValidPassword`/`PASSWORD_RULE_MESSAGE`(Task 2), `PasswordResetSuccessModal`(Task 4), react-router `useLocation`, `Navigate`, `Link`
- Produces: `location.state`에 `{loginId, verified:true}`가 없으면 `/find-id`로 리다이렉트. 있으면 마운트 시 `getPasswordResetStatus(loginId)`로 재확인 후 폼 표시/만료 안내 분기. 성공 시 `PasswordResetSuccessModal` 렌더링

- [ ] **Step 1: 실패하는 테스트 작성**

`src/pages/ResetPasswordPage.test.jsx`:

```jsx
import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ResetPasswordPage from './ResetPasswordPage';
import * as authApi from '../api/authApi';

vi.mock('../api/authApi');

const renderPage = (state) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/reset-password', state }]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/find-id" element={<div>아이디찾기페이지</div>} />
        <Route path="/login" element={<div>로그인페이지</div>} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
});

test('state가 없으면 아이디 찾기 페이지로 리다이렉트한다', () => {
  renderPage(undefined);
  expect(screen.getByText('아이디찾기페이지')).toBeInTheDocument();
});

test('인증 상태가 유효하면 아이디가 readonly로 채워진 폼을 보여준다', async () => {
  authApi.getPasswordResetStatus.mockResolvedValue({ success: true, data: { verified: true } });
  renderPage({ loginId: 'tester01', verified: true });

  await waitFor(() => expect(screen.getByLabelText('아이디')).toHaveValue('tester01'));
  expect(screen.getByLabelText('아이디')).toHaveAttribute('readonly');
  expect(authApi.getPasswordResetStatus).toHaveBeenCalledWith('tester01');
});

test('인증 상태가 만료되었으면 폼 대신 안내 메시지를 보여준다', async () => {
  authApi.getPasswordResetStatus.mockResolvedValue({ success: true, data: { verified: false } });
  renderPage({ loginId: 'tester01', verified: true });

  await waitFor(() =>
    expect(screen.getByText('인증이 만료되었습니다. 아이디 찾기를 다시 진행해주세요.')).toBeInTheDocument()
  );
  expect(screen.queryByLabelText('새 비밀번호')).not.toBeInTheDocument();
});

test('비밀번호 변경 성공 시 완료 모달을 보여준다', async () => {
  authApi.getPasswordResetStatus.mockResolvedValue({ success: true, data: { verified: true } });
  authApi.resetPassword.mockResolvedValue({ success: true });
  renderPage({ loginId: 'tester01', verified: true });

  await waitFor(() => expect(screen.getByLabelText('새 비밀번호')).toBeInTheDocument());
  await userEvent.type(screen.getByLabelText('새 비밀번호'), 'Password1!');
  await userEvent.type(screen.getByLabelText('새 비밀번호 확인'), 'Password1!');
  await userEvent.click(screen.getByRole('button', { name: '변경하기' }));

  await waitFor(() => expect(screen.getByText('비밀번호 변경이 완료되었습니다.')).toBeInTheDocument());
  expect(authApi.resetPassword).toHaveBeenCalledWith('tester01', 'Password1!');
});

test('비밀번호가 일치하지 않으면 변경하기 버튼이 비활성화된다', async () => {
  authApi.getPasswordResetStatus.mockResolvedValue({ success: true, data: { verified: true } });
  renderPage({ loginId: 'tester01', verified: true });

  await waitFor(() => expect(screen.getByLabelText('새 비밀번호')).toBeInTheDocument());
  await userEvent.type(screen.getByLabelText('새 비밀번호'), 'Password1!');
  await userEvent.type(screen.getByLabelText('새 비밀번호 확인'), 'Password2!');

  expect(screen.getByRole('button', { name: '변경하기' })).toBeDisabled();
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- src/pages/ResetPasswordPage.test.jsx`
Expected: FAIL — "Failed to resolve import ./ResetPasswordPage"

- [ ] **Step 3: 구현**

`src/pages/ResetPasswordPage.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import * as authApi from '../api/authApi';
import { isValidPassword, PASSWORD_RULE_MESSAGE } from '../utils/passwordRules';
import PasswordResetSuccessModal from '../components/PasswordResetSuccessModal';
import '../styles/AuthPage.css';

const ResetPasswordPage = () => {
  const location = useLocation();
  const state = location.state;
  const loginId = state?.loginId;

  const [statusChecked, setStatusChecked] = useState(false);
  const [statusVerified, setStatusVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    if (!loginId) {
      return undefined;
    }
    let cancelled = false;
    authApi
      .getPasswordResetStatus(loginId)
      .then((response) => {
        if (!cancelled) {
          setStatusVerified(Boolean(response.data.verified));
          setStatusChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatusVerified(false);
          setStatusChecked(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loginId]);

  if (!state?.loginId || !state?.verified) {
    return <Navigate to="/find-id" replace />;
  }

  const serverMessage = (err, fallback) => err.response?.data?.message || fallback;

  const passwordMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;
  const passwordMatches = passwordConfirm.length > 0 && password === passwordConfirm;
  const canSubmit = statusVerified && !passwordMismatch && !isSubmitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidPassword(password)) {
      setFormError(PASSWORD_RULE_MESSAGE);
      return;
    }
    setFormError('');
    setIsSubmitting(true);
    try {
      await authApi.resetPassword(loginId, password);
      setResetDone(true);
    } catch (err) {
      setFormError(serverMessage(err, '비밀번호 변경에 실패했습니다. 잠시 후 다시 시도해주세요.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (resetDone) {
    return <PasswordResetSuccessModal loginId={loginId} />;
  }

  if (!statusChecked) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>비밀번호 찾기</h1>
          <p>인증 상태를 확인하는 중...</p>
        </div>
      </div>
    );
  }

  if (!statusVerified) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>비밀번호 찾기</h1>
          <p className="auth-error">인증이 만료되었습니다. 아이디 찾기를 다시 진행해주세요.</p>
          <div className="auth-links">
            <Link to="/find-id">아이디 찾기로 이동</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>비밀번호 찾기</h1>
        <p className="auth-subtitle">새로운 비밀번호로 재설정 해주세요</p>

        <div className="auth-field">
          <label htmlFor="reset-password-loginId">아이디</label>
          <input id="reset-password-loginId" value={loginId} readOnly />
        </div>

        <div className="auth-field">
          <label htmlFor="reset-password-password">새 비밀번호</label>
          <input
            id="reset-password-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="비밀번호 입력(8~16자리/영문,숫자,특수기호 포함)"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="reset-password-passwordConfirm">새 비밀번호 확인</label>
          <input
            id="reset-password-passwordConfirm"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            autoComplete="new-password"
            placeholder="새 비밀번호"
          />
          {passwordMismatch && <p className="auth-error">비밀번호가 일치하지 않습니다.</p>}
          {passwordMatches && <p className="auth-info">비밀번호가 일치합니다.</p>}
        </div>

        {formError && <p className="auth-error">{formError}</p>}
        <button className="auth-submit" type="submit" disabled={!canSubmit}>
          변경하기
        </button>
      </form>
    </div>
  );
};

export default ResetPasswordPage;
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- src/pages/ResetPasswordPage.test.jsx`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add src/pages/ResetPasswordPage.jsx src/pages/ResetPasswordPage.test.jsx
git commit -m "feat: 비밀번호 재설정(아이디 찾기 경유) 페이지(ResetPasswordPage) 구현"
```

---

### Task 9: LoginPage 링크 연결 + 라우팅 등록

**Files:**
- Modify: `src/pages/LoginPage.jsx` (전체 교체)
- Modify: `src/pages/LoginPage.test.jsx` (테스트 1개 추가)
- Modify: `src/App.jsx` (전체 교체)
- Modify: `src/styles/AuthPage.css` (링크 색상 스타일 추가)

**Interfaces:**
- Consumes: `FindIdPage`(Task 5), `ShowIdPage`(Task 6), `FindPasswordPage`(Task 7), `ResetPasswordPage`(Task 8)
- Produces: `/find-id`, `/show-id`, `/find-password`, `/reset-password` 라우트 등록. `LoginPage`의 "아이디 찾기"/"비밀번호 찾기"가 실제 링크로 동작하고, `location.state.loginId`가 있으면 아이디 입력란에 자동 채움

- [ ] **Step 1: 실패하는 테스트 작성**

`src/pages/LoginPage.test.jsx`의 마지막 `test(...)` 블록 뒤에 다음 테스트를 추가:

```jsx
test('location.state.loginId가 있으면 아이디 입력란에 자동으로 채워진다', () => {
  renderLogin([{ pathname: '/login', state: { loginId: 'tester01' } }]);
  expect(screen.getByLabelText('아이디')).toHaveValue('tester01');
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npm test -- src/pages/LoginPage.test.jsx`
Expected: FAIL — 아이디 입력란 값이 빈 문자열이라 `toHaveValue('tester01')` 불일치

- [ ] **Step 3: LoginPage 구현**

`src/pages/LoginPage.jsx` (전체 교체):

```jsx
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import * as authApi from '../api/authApi';
import { useAuth } from '../context/AuthContext';
import { consumeAuthExpiredMessage } from '../auth/tokenStorage';
import '../styles/AuthPage.css';

const LoginPage = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loginId, setLoginId] = useState(location.state?.loginId || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // sessionStorage에 남아있을 수 있는 "세션 만료" 1회성 메시지를 마운트 시 한 번만 읽고 지운다.
  const [expiredMessage] = useState(() => consumeAuthExpiredMessage());

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
        <h1>SolarAivle</h1>
        {infoMessage && <p className="auth-info">{infoMessage}</p>}
        {!infoMessage && expiredMessage && <p className="auth-error">{expiredMessage}</p>}
        <div className="auth-field">
          <label htmlFor="loginId">아이디</label>
          <input
            id="loginId"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            autoComplete="username"
            placeholder="아이디"
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
            placeholder="비밀번호"
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
        <div className="auth-links-row">
          <Link to="/find-id">아이디 찾기</Link>
          <span>|</span>
          <Link to="/find-password">비밀번호 찾기</Link>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;
```

`src/styles/AuthPage.css` 맨 끝에 추가:

```css

.auth-links-row a {
  color: #14b8a6;
  font-weight: 600;
  text-decoration: none;
}

.auth-links-row a:hover {
  text-decoration: underline;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- src/pages/LoginPage.test.jsx`
Expected: 6 passed

- [ ] **Step 5: App.jsx에 라우트 등록**

`src/App.jsx` (전체 교체):

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import MainPage from './pages/MainPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import FindIdPage from './pages/FindIdPage';
import ShowIdPage from './pages/ShowIdPage';
import FindPasswordPage from './pages/FindPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import BoardListPage from './pages/BoardListPage';
import BoardDetailPage from './pages/BoardDetailPage';
import BoardWritePage from './pages/BoardWritePage';
import TestPage from './pages/TestPage';

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<MainPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignupPage />} />
    <Route path="/find-id" element={<FindIdPage />} />
    <Route path="/show-id" element={<ShowIdPage />} />
    <Route path="/find-password" element={<FindPasswordPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/boards" element={<BoardListPage />} />
    <Route path="/boards/write" element={<BoardWritePage />} />
    <Route path="/boards/:boardId" element={<BoardDetailPage />} />
    <Route path="/test" element={<TestPage />} />
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

- [ ] **Step 6: 기존 App 테스트가 그대로 통과하는지 확인**

Run: `npm test -- src/App.test.jsx`
Expected: 3 passed (기존 라우트 3개만 검증하므로 신규 라우트 추가로 인한 영향 없음)

- [ ] **Step 7: 전체 테스트 스위트 + 빌드 확인**

Run: `npm test`
Expected: 전체 통과 (Task 1~9 누적)

Run: `npm run build`
Expected: 빌드 성공, 에러 없음

- [ ] **Step 8: 개발 서버로 육안 확인** (가능한 경우)

Run: `npm run dev` (백엔드 8080 기동 상태에서)
확인 사항:
1. `/login`에서 "아이디 찾기"/"비밀번호 찾기" 클릭 시 각각 `/find-id`, `/find-password`로 이동
2. `/find-id`에서 실제 이메일로 인증코드 발송→확인→"아이디 찾기" 클릭 시 `/show-id`로 이동하며 마스킹된 아이디 표시
3. `/show-id`에서 "로그인하기" 클릭 시 `/login`으로 이동하며 아이디 자동 채움 확인
4. `/show-id`에서 "비밀번호 재설정" 클릭 시 `/reset-password`로 이동, 이메일 인증 단계 없이 바로 새 비밀번호 폼이 보이는지 확인
5. `/find-password`에서 아이디+이메일 인증 후 비밀번호 변경 시 완료 모달이 뜨고 "로그인" 클릭 시 `/login`으로 이동하며 아이디 자동 채움 확인

- [ ] **Step 9: Commit**

```bash
git add src/pages/LoginPage.jsx src/pages/LoginPage.test.jsx src/App.jsx src/styles/AuthPage.css
git commit -m "feat: 아이디/비밀번호 찾기 라우팅 등록 및 로그인 페이지 링크 연결"
```
