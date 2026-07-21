# 회원탈퇴 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 마이페이지에 회원탈퇴 기능을 추가한다 — LOCAL/GOOGLE 계정에 따라 다른 확인 모달을 보여주고, 탈퇴 성공 시 서버 로그아웃 API를 거치지 않고 로컬 세션만 정리한 뒤 로그인 페이지로 이동한다.

**Architecture:** `myPageApi.withdraw(password)` API 함수와 `AuthContext.clearLocalSession()`(신규, 서버 호출 없이 로컬 세션만 리셋)을 기반으로, 공용 `WithdrawalModal` 컴포넌트가 LOCAL(비밀번호 입력)/GOOGLE(확인만) 두 흐름을 처리하고, `MyPage`가 이를 새 카드로 연결한다.

**Tech Stack:** React 19, react-router-dom v7, axios, vitest + @testing-library/react + @testing-library/user-event.

## Global Constraints

- 스펙 문서: `docs/superpowers/specs/2026-07-21-withdrawal-design.md`
- `POST /users/me/withdrawal`: LOCAL 계정은 `{ password }`, GOOGLE 계정은 `{}` 전송
- **탈퇴 성공 후 서버 로그아웃 API(`authApi.logout`)를 호출하면 안 됨** — 계정이 이미 삭제된 상태라 `/auth/logout`의 401이 `axiosInstance`의 자동 refresh-재시도를 거쳐 하드 리다이렉트(`window.location.href = '/login'`)를 유발할 수 있고, 이게 우리가 보여주려는 "회원탈퇴가 완료되었습니다" 메시지보다 먼저 실행되며 경합한다. 반드시 `AuthContext.clearLocalSession()`(신규, 로컬 세션만 정리)을 사용한다.
- 실패(401 등) 시 서버 `message`를 그대로 에러로 표시, 모달은 닫지 않음
- 각 태스크 종료 시 `npm test`(전체) 통과를 재확인한다(회귀 방지)

---

### Task 1: API 함수 + AuthContext.clearLocalSession 추가

**Files:**
- Modify: `src/api/myPageApi.js` (파일 끝에 함수 추가)
- Modify: `src/api/myPageApi.test.js` (테스트 추가)
- Modify: `src/context/AuthContext.jsx`
- Modify: `src/context/AuthContext.test.jsx` (테스트 추가)

**Interfaces:**
- Consumes: 없음 (기존 `instance` axios 인스턴스, 기존 `tokenStorage` 함수만 사용)
- Produces:
  - `withdraw(password) => Promise<{ success, message, data }>` (from `myPageApi.js`, `password`가 `undefined`면 빈 body 전송) — Task 2(WithdrawalModal)에서 사용
  - `useAuth().clearLocalSession()` — 서버 API 호출 없이 `tokenStorage.clearSession()` + `loginId`/`role` 리액트 상태만 리셋 — Task 2(WithdrawalModal)에서 사용

- [ ] **Step 1: myPageApi.withdraw 실패하는 테스트 작성**

`src/api/myPageApi.test.js` 파일 상단 import를 다음으로 교체:

```js
import { vi } from 'vitest';
import instance from './axiosInstance';
import { getMyConsents, updateMarketingConsent, withdraw } from './myPageApi';
```

파일 끝에 추가:

```js
test('withdraw는 password를 전달하면 body에 담아 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue({ data: { success: true, message: '', data: null } });

  await withdraw('currentPassword1!');

  expect(instance.post).toHaveBeenCalledWith('/users/me/withdrawal', { password: 'currentPassword1!' });
});

test('withdraw는 인자 없이 호출하면(구글 계정) 빈 body로 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue({ data: { success: true, message: '', data: null } });

  await withdraw();

  expect(instance.post).toHaveBeenCalledWith('/users/me/withdrawal', {});
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- src/api/myPageApi.test.js`
Expected: FAIL — `withdraw is not a function`

- [ ] **Step 3: myPageApi.withdraw 구현**

`src/api/myPageApi.js` 파일 끝에 추가:

```js
export const withdraw = async (password) => {
  const body = password !== undefined ? { password } : {};
  const { data } = await instance.post('/users/me/withdrawal', body);
  return data;
};
```

- [ ] **Step 4: myPageApi 테스트 통과 확인**

Run: `npm test -- src/api/myPageApi.test.js`
Expected: PASS (4개 테스트 모두)

- [ ] **Step 5: AuthContext.clearLocalSession 실패하는 테스트 작성**

`src/context/AuthContext.test.jsx` 상단 import에 `authApi`를 추가로 import 하도록 교체(현재는 `vi.mock`의 팩토리 안에서만 정의돼 있어 테스트 본문에서 참조할 수 없음):

```js
import { vi } from 'vitest';
import { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';
import instance from '../api/axiosInstance';
import * as authApi from '../api/authApi';
import { saveSession, loadSession, clearSession, getAccessToken } from '../auth/tokenStorage';

vi.mock('../api/authApi', () => ({
  logout: vi.fn().mockResolvedValue({ success: true }),
}));
```

`Probe` 컴포넌트를 다음으로 교체(`clearLocalSession` 버튼 추가):

```js
const Probe = () => {
  const { isLoggedIn, loginId, isInitializing, login, logout, clearLocalSession } = useAuth();
  if (isInitializing) return <div>초기화중</div>;
  return (
    <div>
      <div data-testid="status">{isLoggedIn ? `로그인:${loginId}` : '비로그인'}</div>
      <button onClick={() => login({ accessToken: 'at', refreshToken: 'rt' }, 'tester01', true)}>
        로그인실행
      </button>
      <button onClick={logout}>로그아웃실행</button>
      <button onClick={clearLocalSession}>로컬정리실행</button>
    </div>
  );
};
```

파일 끝에 추가:

```js
test('clearLocalSession 호출 시 서버 로그아웃 API 없이 로컬 세션만 정리된다', async () => {
  renderWithProvider();
  await waitFor(() => screen.getByTestId('status'));
  await userEvent.click(screen.getByText('로그인실행'));
  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('로그인:tester01'));

  await userEvent.click(screen.getByText('로컬정리실행'));

  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('비로그인'));
  expect(loadSession()).toBeNull();
  expect(getAccessToken()).toBeNull();
  expect(authApi.logout).not.toHaveBeenCalled();
});
```

- [ ] **Step 6: 테스트 실패 확인**

Run: `npm test -- src/context/AuthContext.test.jsx`
Expected: FAIL — `clearLocalSession is not a function`

- [ ] **Step 7: AuthContext.clearLocalSession 구현**

`src/context/AuthContext.jsx`에서 `logout` 함수 다음에 추가:

```js
  const clearLocalSession = useCallback(() => {
    clearSession();
    setLoginId(null);
    setRole(null);
  }, []);
```

`value`의 `useMemo`를 다음으로 교체:

```js
  const value = useMemo(
    () => ({
      isLoggedIn: loginId !== null, loginId, role, isAdmin: role === 'ADMIN', isInitializing,
      login, logout, clearLocalSession,
    }),
    [loginId, role, isInitializing, login, logout, clearLocalSession],
  );
```

- [ ] **Step 8: 테스트 통과 확인**

Run: `npm test -- src/context/AuthContext.test.jsx src/api/myPageApi.test.js`
Expected: PASS (전체)

- [ ] **Step 9: 커밋**

```bash
git add src/api/myPageApi.js src/api/myPageApi.test.js src/context/AuthContext.jsx src/context/AuthContext.test.jsx
git commit -m "feat: 회원탈퇴 API 함수 및 로컬 세션 전용 정리 메서드(clearLocalSession) 추가"
```

---

### Task 2: WithdrawalModal 컴포넌트

**Files:**
- Create: `src/components/WithdrawalModal.jsx`
- Test: `src/components/WithdrawalModal.test.jsx`
- Modify: `src/styles/AuthPage.css` (모달 버튼 2개 배치 + 비밀번호 입력창 스타일 추가)

**Interfaces:**
- Consumes: `withdraw(password)` (Task 1), `useAuth().clearLocalSession()` (Task 1)
- Produces: `<WithdrawalModal provider="LOCAL"|"GOOGLE" onClose={fn} />` — Task 3(MyPage)에서 사용

- [ ] **Step 1: 모달 버튼/입력창 스타일 추가**

`src/styles/AuthPage.css` 파일 끝에 추가:

```css
.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 4px;
}

.modal-actions .auth-submit {
  width: auto;
  padding: 10px 32px;
}

.modal-box input[type="password"] {
  width: 100%;
  padding: 12px 14px;
  border: none;
  border-bottom: 2px solid #e4e7ec;
  border-radius: 4px 4px 0 0;
  background: #f9fafb;
  font-size: 14px;
  box-sizing: border-box;
  margin-bottom: 12px;
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`src/components/WithdrawalModal.test.jsx` 새 파일:

```jsx
import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import WithdrawalModal from './WithdrawalModal';
import * as myPageApi from '../api/myPageApi';
import * as authApi from '../api/authApi';

vi.mock('../api/myPageApi');
vi.mock('../api/authApi');

const mockClearLocalSession = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ clearLocalSession: mockClearLocalSession }),
}));

const LoginPageProbe = () => {
  const location = useLocation();
  return (
    <div>
      로그인페이지
      {location.state?.message && <p>{location.state.message}</p>}
    </div>
  );
};

const renderModal = (provider, onClose) =>
  render(
    <MemoryRouter initialEntries={['/mypage']}>
      <Routes>
        <Route path="/mypage" element={<WithdrawalModal provider={provider} onClose={onClose} />} />
        <Route path="/login" element={<LoginPageProbe />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
});

test('LOCAL 계정은 비밀번호 입력창을 보여주고, 비어있으면 탈퇴하기 버튼이 비활성화된다', () => {
  renderModal('LOCAL', vi.fn());
  expect(screen.getByPlaceholderText('현재 비밀번호')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '탈퇴하기' })).toBeDisabled();
});

test('GOOGLE 계정은 비밀번호 입력창 없이 확인 문구만 보여준다', () => {
  renderModal('GOOGLE', vi.fn());
  expect(screen.queryByPlaceholderText('현재 비밀번호')).not.toBeInTheDocument();
  expect(screen.getByText('정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '탈퇴하기' })).toBeEnabled();
});

test('LOCAL 계정 탈퇴 성공 시 서버 로그아웃 없이 로컬 세션만 정리하고 로그인 페이지로 이동한다', async () => {
  myPageApi.withdraw.mockResolvedValue({ success: true });
  renderModal('LOCAL', vi.fn());

  await userEvent.type(screen.getByPlaceholderText('현재 비밀번호'), 'currentPassword1!');
  await userEvent.click(screen.getByRole('button', { name: '탈퇴하기' }));

  await waitFor(() => expect(screen.getByText('로그인페이지')).toBeInTheDocument());
  expect(myPageApi.withdraw).toHaveBeenCalledWith('currentPassword1!');
  expect(mockClearLocalSession).toHaveBeenCalled();
  expect(authApi.logout).not.toHaveBeenCalled();
  expect(screen.getByText('회원탈퇴가 완료되었습니다.')).toBeInTheDocument();
});

test('GOOGLE 계정 탈퇴 성공 시 withdraw가 인자 없이 호출된다', async () => {
  myPageApi.withdraw.mockResolvedValue({ success: true });
  renderModal('GOOGLE', vi.fn());

  await userEvent.click(screen.getByRole('button', { name: '탈퇴하기' }));

  await waitFor(() => expect(screen.getByText('로그인페이지')).toBeInTheDocument());
  expect(myPageApi.withdraw).toHaveBeenCalledWith(undefined);
  expect(mockClearLocalSession).toHaveBeenCalled();
});

test('탈퇴 실패(401) 시 에러 메시지를 보여주고 모달은 유지된다', async () => {
  myPageApi.withdraw.mockRejectedValue({
    response: { status: 401, data: { success: false, message: '비밀번호가 일치하지 않습니다.' } },
  });
  renderModal('LOCAL', vi.fn());

  await userEvent.type(screen.getByPlaceholderText('현재 비밀번호'), 'wrongpassword1!');
  await userEvent.click(screen.getByRole('button', { name: '탈퇴하기' }));

  await waitFor(() => expect(screen.getByText('비밀번호가 일치하지 않습니다.')).toBeInTheDocument());
  expect(screen.getByPlaceholderText('현재 비밀번호')).toBeInTheDocument();
  expect(mockClearLocalSession).not.toHaveBeenCalled();
});

test('취소 버튼 클릭 시 onClose가 호출된다', async () => {
  const onClose = vi.fn();
  renderModal('GOOGLE', onClose);

  await userEvent.click(screen.getByRole('button', { name: '취소' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('오버레이 클릭 시 onClose가 호출된다', async () => {
  const onClose = vi.fn();
  const { container } = renderModal('GOOGLE', onClose);

  await userEvent.click(container.querySelector('.modal-overlay'));
  expect(onClose).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -- src/components/WithdrawalModal.test.jsx`
Expected: FAIL — `Cannot find module './WithdrawalModal'`

- [ ] **Step 4: WithdrawalModal 구현**

`src/components/WithdrawalModal.jsx` 새 파일:

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { withdraw } from '../api/myPageApi';
import '../styles/AuthPage.css';

const WithdrawalModal = ({ provider, onClose }) => {
  const auth = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleWithdraw = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      await withdraw(provider === 'LOCAL' ? password : undefined);
      auth.clearLocalSession();
      navigate('/login', { state: { message: '회원탈퇴가 완료되었습니다.' } });
    } catch (err) {
      setError(err.response?.data?.message || '회원탈퇴에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        {provider === 'LOCAL' ? (
          <>
            <p>탈퇴하려면 비밀번호를 입력하세요.</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="현재 비밀번호"
              autoComplete="current-password"
            />
          </>
        ) : (
          <p>정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
        )}
        {error && <p className="auth-error">{error}</p>}
        <div className="modal-actions">
          <button
            type="button"
            className="auth-submit auth-submit-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            취소
          </button>
          <button
            type="button"
            className="auth-submit"
            onClick={handleWithdraw}
            disabled={isSubmitting || (provider === 'LOCAL' && !password)}
          >
            탈퇴하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default WithdrawalModal;
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- src/components/WithdrawalModal.test.jsx`
Expected: PASS (7개 테스트 모두)

- [ ] **Step 6: 커밋**

```bash
git add src/components/WithdrawalModal.jsx src/components/WithdrawalModal.test.jsx src/styles/AuthPage.css
git commit -m "feat: 회원탈퇴 확인 모달(WithdrawalModal) 추가"
```

---

### Task 3: MyPage 회원탈퇴 카드 연결 (+ 최종 전체 검증)

**Files:**
- Modify: `src/pages/MyPage.jsx`
- Modify: `src/pages/MyPage.test.jsx`
- Modify: `src/styles/MyPage.css`

**Interfaces:**
- Consumes: `<WithdrawalModal provider onClose />` (Task 2)
- Produces: 없음 (플랜의 마지막 태스크)

- [ ] **Step 1: 위험 버튼 스타일 추가**

`src/styles/MyPage.css` 파일 끝에 추가:

```css
.mypage-danger-button {
  min-width: 120px;
  padding: 11px 18px;
  border: 0;
  border-radius: 9px;
  color: #fff;
  background: #dc2626;
  font-weight: 700;
  cursor: pointer;
}

.mypage-danger-button:hover:not(:disabled) {
  background: #b91c1c;
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`src/pages/MyPage.test.jsx`의 `vi.mock('../context/AuthContext', ...)` 블록을 다음으로 교체(`clearLocalSession`도 함께 제공해야 `WithdrawalModal`이 마이페이지 안에서 렌더될 때 에러가 나지 않는다):

```js
const mockLogout = vi.fn();
const mockClearLocalSession = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ logout: mockLogout, clearLocalSession: mockClearLocalSession }),
}));
```

파일 끝에 추가:

```js
test('회원탈퇴 버튼 클릭 시 확인 모달이 뜬다', async () => {
  getMyProfile.mockResolvedValue(baseProfile);
  getMyConsents.mockResolvedValue(baseConsents);
  renderMyPage();

  await waitFor(() => expect(screen.getByRole('button', { name: '회원탈퇴' })).toBeInTheDocument());
  await userEvent.click(screen.getByRole('button', { name: '회원탈퇴' }));

  expect(screen.getByPlaceholderText('현재 비밀번호')).toBeInTheDocument();
});

test('구글 계정이면 회원탈퇴 모달에 비밀번호 입력창이 없다', async () => {
  getMyProfile.mockResolvedValue({ ...baseProfile, provider: 'GOOGLE', loginId: null });
  getMyConsents.mockResolvedValue(baseConsents);
  renderMyPage();

  await waitFor(() => expect(screen.getByRole('button', { name: '회원탈퇴' })).toBeInTheDocument());
  await userEvent.click(screen.getByRole('button', { name: '회원탈퇴' }));

  expect(screen.queryByPlaceholderText('현재 비밀번호')).not.toBeInTheDocument();
  expect(screen.getByText('정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.')).toBeInTheDocument();
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -- src/pages/MyPage.test.jsx`
Expected: FAIL — "회원탈퇴" 버튼을 찾지 못함

- [ ] **Step 4: MyPage에 회원탈퇴 카드 추가**

`src/pages/MyPage.jsx` import에 추가:

```js
import WithdrawalModal from '../components/WithdrawalModal';
```

`const [marketingSaving, setMarketingSaving] = useState(false);` 다음에 상태 추가:

```js
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
```

"내가 쓴 글" 섹션(`<section className="mypage-card mypage-activity">`)의 닫는 `</section>` 다음, `</div>`(`.mypage-grid` 닫는 태그) 이전에 추가:

```jsx
            <section className="mypage-card">
              <div className="mypage-card-title"><h2>회원탈퇴</h2></div>
              <p className="mypage-hint">탈퇴 시 모든 개인정보가 즉시 삭제되며 되돌릴 수 없습니다.</p>
              <button
                type="button"
                className="mypage-danger-button"
                onClick={() => setShowWithdrawalModal(true)}
              >
                회원탈퇴
              </button>
            </section>
```

현재 `profile && ( <div className="mypage-grid"> ... </div> )`는 JSX 표현식이 하나뿐이라 형제 엘리먼트를 바로 추가할 수 없다. `profile && (` 바로 다음과 `.mypage-grid`를 감싸는 `</div>` 바로 다음(즉 `profile && (...)`의 닫는 `)` 직전)을 Fragment로 감싸도록 다음과 같이 교체한다:

```jsx
        ) : profile && (
          <>
            <div className="mypage-grid">
```

(기존에는 `) : profile && (\n          <div className="mypage-grid">`였던 부분— `<>`를 추가로 연다)

그리고 `.mypage-grid`를 닫는 `</div>` 바로 다음, `profile && (...)`가 닫히는 지점 바로 이전을 다음으로 교체:

```jsx
            </div>

            {showWithdrawalModal && (
              <WithdrawalModal provider={profile.provider} onClose={() => setShowWithdrawalModal(false)} />
            )}
          </>
        )}
```

(기존에는 `.mypage-grid`의 `</div>` 다음 바로 `)}`로 `profile &&`가 닫혔던 부분 — `</>`로 Fragment를 닫고 그 다음에 `)}`)

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- src/pages/MyPage.test.jsx`
Expected: PASS (전체 파일, 기존 테스트 포함)

- [ ] **Step 6: 전체 테스트 + 빌드 확인**

Run: `npm test`
Expected: 전체 PASS (기존 테스트 + 이번 플랜에서 추가된 모든 테스트)

Run: `npm run build`
Expected: 에러 없이 빌드 성공

- [ ] **Step 7: 커밋**

```bash
git add src/pages/MyPage.jsx src/pages/MyPage.test.jsx src/styles/MyPage.css
git commit -m "feat: 마이페이지에 회원탈퇴 카드 연결"
```
