# 기존 화면 에러 토스트 옵트아웃 적용 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `docs/superpowers/plans/2026-07-22-global-error-toast.md`에서 만든 전역 에러 토스트가, 이미 자체적으로 에러를 보여주고 있는 기존 화면들과 중복 표시되지 않도록 `skipErrorModal: true`를 적용한다.

**Architecture:** 전수 조사 결과 실제 컴포넌트(페이지)에서 이 플래그를 개별적으로 넘겨야 하는 경우는 `getMyProfile` 단 하나뿐이고(같은 함수가 "이미 처리하는 화면"과 "조용히 무시하는 화면" 양쪽에서 호출됨), 그 외 모든 API 함수는 호출부가 어디든 항상 같은 결정(전부 옵트아웃, 또는 전부 그대로 둠)이 적용된다. 그래서 대부분은 `src/api/*.js`의 함수 안에 `skipErrorModal: true`를 직접 박아 넣고, `getMyProfile`만 옵션 파라미터를 받아 호출부가 결정하게 한다.

**Tech Stack:** React 19, axios, vitest + @testing-library/react.

## Global Constraints

- 스펙 문서: `docs/superpowers/specs/2026-07-22-global-error-toast-design.md`, 선행 계획: `docs/superpowers/plans/2026-07-22-global-error-toast.md`(완료됨 — `axiosInstance.js`가 `error.config?.skipErrorModal === true`면 토스트를 스킵한다)
- **전수 조사 결과(이 계획의 근거 — 아래 표를 그대로 각 태스크에 적용한다):**

| API 모듈 | 함수 | 처리 |
|---|---|---|
| `authApi.js` | 전체 13개 함수 | **모두 SKIP** (함수 내부에 하드코딩) |
| `myPageApi.js` | `getMyProfile` | **호출부가 결정** — 옵션 파라미터로 전달받아 그대로 axios config에 전달 |
| `myPageApi.js` | `updateMyProfile`, `changeMyPassword`, `getMyBoards`, `getMyConsents`, `updateMarketingConsent`, `withdraw` | **모두 SKIP** (하드코딩) |
| `termsApi.js` | `getTerms` | **SKIP** (하드코딩) |
| `boardApi.js` | `getBoards`, `getBoard`, `createBoard`, `updateBoard`, `deleteBoard` | **모두 SKIP** (하드코딩) |
| `boardApi.js` | `getBoardAttachment` | **그대로 둠** — 현재 조용히 무시하는 호출(`.catch((error) => console.log(error))`)이라 토스트가 새로 뜨는 게 맞음. 변경 없음 |
| `commentApi.js` | `getComments`, `createComment`, `updateComment`, `deleteComment` | **모두 SKIP** (하드코딩) |
| `chatApi.js` | `sendChatMessage`, `sendChatExcel` | **모두 SKIP** (하드코딩) |
| `adminApi.js` | `getAdminUsers`, `changeUserRole` | **모두 SKIP** (하드코딩) |
| `dashboardApi.js` | `createSiteAnalysis`, `fetchMyAnalysisHistory`, `fetchDemoAnalyses` | **모두 SKIP** (하드코딩) |

- **범위 밖(변경 없음, 참고용):**
  - `src/pages/BoardWritePage.jsx`, `src/components/CommentForm.jsx`의 `getMyProfile()` 호출 — 현재 조용히 무시(`.catch(() => setWriterName(loginId || ""))`)하고 있어 토스트가 새로 뜨는 게 맞음. **옵션 없이 그대로 `getMyProfile()`로 호출** — 변경하지 않는다.
  - `src/pages/MainPage.jsx`, `src/api/mapApi.jsx`의 `fetchMapSearch` — `fetch()`를 직접 쓰고 axios를 거치지 않아서 이 플래그 자체가 적용 안 됨. 변경 없음.
  - `src/api/axios.js` — 어디서도 import 안 되는 미사용 파일. 이 계획과 무관, 건드리지 않는다.
- 각 태스크 종료 시 `npm test`(전체) 통과를 재확인한다(회귀 방지)

---

### Task 1: authApi.js 전체 함수에 skipErrorModal 적용

**Files:**
- Modify: `src/api/authApi.js`
- Modify: `src/api/authApi.test.js`

**Interfaces:**
- Consumes: 없음
- Produces: 없음 (기존 함수 시그니처/이름은 그대로, axios 호출부 config만 변경)

- [ ] **Step 1: 기존 테스트 갱신 (실패 확인)**

`src/api/authApi.test.js`의 각 테스트에서 `toHaveBeenCalledWith(...)` 부분을 아래처럼 전부 교체한다(총 13곳 — `signup`의 두 번째 테스트는 `mock.calls[0][1]`만 확인하므로 변경 불필요):

```js
test('checkLoginId는 value 쿼리로 GET 요청한다', async () => {
  vi.spyOn(instance, 'get').mockResolvedValue(ok({ available: true }));
  const result = await checkLoginId('tester01');
  expect(instance.get).toHaveBeenCalledWith('/auth/check-login-id', {
    params: { value: 'tester01' }, skipErrorModal: true,
  });
  expect(result.data.available).toBe(true);
});

test('sendEmailCode는 이메일을 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok(null));
  await sendEmailCode('a@b.com');
  expect(instance.post).toHaveBeenCalledWith('/auth/email/send-code', { email: 'a@b.com' }, { skipErrorModal: true });
});

test('verifyEmailCode는 이메일과 코드를 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok(null));
  await verifyEmailCode('a@b.com', '123456');
  expect(instance.post).toHaveBeenCalledWith(
    '/auth/email/verify-code', { email: 'a@b.com', code: '123456' }, { skipErrorModal: true }
  );
});

test('signup은 가입 정보와 약관 동의 여부를 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok(null));
  const body = {
    loginId: 'tester01', email: 'a@b.com', password: 'password123', name: '홍길동',
    termsAgreed: true, privacyAgreed: true, marketingAgreed: false,
  };
  await signup(body);
  expect(instance.post).toHaveBeenCalledWith('/auth/signup', body, { skipErrorModal: true });
});

test('signup은 termsAgreed/privacyAgreed/marketingAgreed가 false여도 명시적으로 전달한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok(null));
  await signup({
    loginId: 'tester01', email: 'a@b.com', password: 'password123', name: '홍길동',
    termsAgreed: true, privacyAgreed: true, marketingAgreed: false,
  });

  const sentBody = instance.post.mock.calls[0][1];
  expect(sentBody.marketingAgreed).toBe(false);
  expect(sentBody.termsAgreed).toBe(true);
  expect(sentBody.privacyAgreed).toBe(true);
});

test('login은 토큰을 반환한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok({ accessToken: 'at', refreshToken: 'rt' }));
  const result = await login({ loginId: 'tester01', password: 'password123', rememberMe: true });
  expect(instance.post).toHaveBeenCalledWith(
    '/auth/login',
    { loginId: 'tester01', password: 'password123', rememberMe: true },
    { skipErrorModal: true }
  );
  expect(result.data.accessToken).toBe('at');
});

test('logout은 refreshToken을 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok(null));
  await logout('rt-1');
  expect(instance.post).toHaveBeenCalledWith('/auth/logout', { refreshToken: 'rt-1' }, { skipErrorModal: true });
});

test('sendFindIdCode는 이메일을 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok(null));
  await sendFindIdCode('a@b.com');
  expect(instance.post).toHaveBeenCalledWith('/auth/find-id/send-code', { email: 'a@b.com' }, { skipErrorModal: true });
});

test('verifyFindIdCode는 이메일과 코드를 POST하고 결과를 반환한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(
    ok({ loginId: 'tester01', maskedLoginId: 'te******', createdAt: '2026-01-01T12:00:00' })
  );
  const result = await verifyFindIdCode('a@b.com', '123456');
  expect(instance.post).toHaveBeenCalledWith(
    '/auth/find-id/verify-code', { email: 'a@b.com', code: '123456' }, { skipErrorModal: true }
  );
  expect(result.data.loginId).toBe('tester01');
  expect(result.data.maskedLoginId).toBe('te******');
});

test('sendFindPasswordCode는 아이디와 이메일을 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok(null));
  await sendFindPasswordCode('tester01', 'a@b.com');
  expect(instance.post).toHaveBeenCalledWith(
    '/auth/password/send-code', { loginId: 'tester01', email: 'a@b.com' }, { skipErrorModal: true }
  );
});

test('verifyFindPasswordCode는 아이디/이메일/코드를 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok(null));
  await verifyFindPasswordCode('tester01', 'a@b.com', '123456');
  expect(instance.post).toHaveBeenCalledWith(
    '/auth/password/verify-code',
    { loginId: 'tester01', email: 'a@b.com', code: '123456' },
    { skipErrorModal: true }
  );
});

test('getPasswordResetStatus는 loginId 쿼리로 GET 요청한다', async () => {
  vi.spyOn(instance, 'get').mockResolvedValue(ok({ verified: true }));
  const result = await getPasswordResetStatus('tester01');
  expect(instance.get).toHaveBeenCalledWith('/auth/password/verification-status', {
    params: { loginId: 'tester01' }, skipErrorModal: true,
  });
  expect(result.data.verified).toBe(true);
});

test('resetPassword는 아이디와 새 비밀번호를 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok(null));
  await resetPassword('tester01', 'NewPassword1!');
  expect(instance.post).toHaveBeenCalledWith(
    '/auth/password/reset', { loginId: 'tester01', newPassword: 'NewPassword1!' }, { skipErrorModal: true }
  );
});

test('googleLogin은 code와 redirectUri를 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok({ accessToken: 'at', refreshToken: 'rt' }));
  const result = await googleLogin({ code: 'auth-code-1', redirectUri: 'http://localhost:5173/oauth/google/callback' });
  expect(instance.post).toHaveBeenCalledWith(
    '/auth/google/login',
    { code: 'auth-code-1', redirectUri: 'http://localhost:5173/oauth/google/callback' },
    { skipErrorModal: true }
  );
  expect(result.data.accessToken).toBe('at');
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- src/api/authApi.test.js`
Expected: FAIL — 13개 테스트가 인자 불일치로 실패

- [ ] **Step 3: authApi.js 수정**

`src/api/authApi.js` 전체를 다음으로 교체:

```js
import instance from './axiosInstance';

export const checkLoginId = async (loginId) => {
  const { data } = await instance.get('/auth/check-login-id', {
    params: { value: loginId }, skipErrorModal: true,
  });
  return data;
};

export const sendEmailCode = async (email) => {
  const { data } = await instance.post('/auth/email/send-code', { email }, { skipErrorModal: true });
  return data;
};

export const verifyEmailCode = async (email, code) => {
  const { data } = await instance.post(
    '/auth/email/verify-code', { email, code }, { skipErrorModal: true }
  );
  return data;
};

export const signup = async ({
  loginId, email, password, name, termsAgreed, privacyAgreed, marketingAgreed,
}) => {
  const { data } = await instance.post('/auth/signup', {
    loginId, email, password, name, termsAgreed, privacyAgreed, marketingAgreed,
  }, { skipErrorModal: true });
  return data;
};

export const login = async ({ loginId, password, rememberMe }) => {
  const { data } = await instance.post(
    '/auth/login', { loginId, password, rememberMe }, { skipErrorModal: true }
  );
  return data;
};

export const logout = async (refreshToken) => {
  const { data } = await instance.post('/auth/logout', { refreshToken }, { skipErrorModal: true });
  return data;
};

export const sendFindIdCode = async (email) => {
  const { data } = await instance.post('/auth/find-id/send-code', { email }, { skipErrorModal: true });
  return data;
};

export const verifyFindIdCode = async (email, code) => {
  const { data } = await instance.post(
    '/auth/find-id/verify-code', { email, code }, { skipErrorModal: true }
  );
  return data;
};

export const sendFindPasswordCode = async (loginId, email) => {
  const { data } = await instance.post(
    '/auth/password/send-code', { loginId, email }, { skipErrorModal: true }
  );
  return data;
};

export const verifyFindPasswordCode = async (loginId, email, code) => {
  const { data } = await instance.post(
    '/auth/password/verify-code', { loginId, email, code }, { skipErrorModal: true }
  );
  return data;
};

export const getPasswordResetStatus = async (loginId) => {
  const { data } = await instance.get('/auth/password/verification-status', {
    params: { loginId }, skipErrorModal: true,
  });
  return data;
};

export const resetPassword = async (loginId, newPassword) => {
  const { data } = await instance.post(
    '/auth/password/reset', { loginId, newPassword }, { skipErrorModal: true }
  );
  return data;
};

export const googleLogin = async ({ code, redirectUri }) => {
  const { data } = await instance.post(
    '/auth/google/login', { code, redirectUri }, { skipErrorModal: true }
  );
  return data;
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- src/api/authApi.test.js`
Expected: PASS (14개 테스트 모두)

- [ ] **Step 5: 커밋**

```bash
git add src/api/authApi.js src/api/authApi.test.js
git commit -m "feat: authApi 전체 호출에 skipErrorModal 적용 (기존 화면 에러 표시와 중복 방지)"
```

---

### Task 2: myPageApi.js — getMyProfile은 옵션 전달, 나머지는 적용 + 호출부 2곳 수정

**Files:**
- Modify: `src/api/myPageApi.js`
- Modify: `src/api/myPageApi.test.js`
- Modify: `src/pages/GoogleCallbackPage.jsx`
- Modify: `src/pages/MyPage.jsx`

**Interfaces:**
- Consumes: 없음
- Produces: `getMyProfile(options = {}) => Promise<profile>` — 기존과 인자 개수만 늘어남(하위 호환), `src/pages/BoardWritePage.jsx`/`src/components/CommentForm.jsx`가 옵션 없이 계속 호출 중이므로 반드시 기본값 `{}`을 유지해야 한다

- [ ] **Step 1: 실패하는 테스트 작성**

`src/api/myPageApi.test.js` 상단 import를 다음으로 교체:

```js
import { vi } from 'vitest';
import instance from './axiosInstance';
import { getMyConsents, getMyProfile, updateMarketingConsent, withdraw } from './myPageApi';
```

기존 4개 테스트의 `toHaveBeenCalledWith(...)`를 각각 다음으로 교체:

```js
test('getMyConsents는 GET /users/me/consents로 consents 배열을 반환한다', async () => {
  const consents = [
    { type: 'TERMS', agreed: true, version: '1.0', agreedAt: '2026-07-16T12:00:00' },
    { type: 'PRIVACY', agreed: true, version: '1.0', agreedAt: '2026-07-16T12:00:00' },
    { type: 'MARKETING', agreed: false, version: '1.0', agreedAt: '2026-07-16T12:00:00' },
  ];
  vi.spyOn(instance, 'get').mockResolvedValue({
    data: { success: true, message: '', data: { consents } },
  });

  const result = await getMyConsents();

  expect(instance.get).toHaveBeenCalledWith('/users/me/consents', { skipErrorModal: true });
  expect(result).toEqual(consents);
});

test('updateMarketingConsent는 agreed를 PUT하고 변경된 항목을 반환한다', async () => {
  const updated = { type: 'MARKETING', agreed: true, version: '1.0', agreedAt: '2026-07-17T00:00:00' };
  vi.spyOn(instance, 'put').mockResolvedValue({
    data: { success: true, message: '', data: updated },
  });

  const result = await updateMarketingConsent(true);

  expect(instance.put).toHaveBeenCalledWith(
    '/users/me/consents/marketing', { agreed: true }, { skipErrorModal: true }
  );
  expect(result).toEqual(updated);
});

test('withdraw는 password를 전달하면 body에 담아 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue({ data: { success: true, message: '', data: null } });

  await withdraw('currentPassword1!');

  expect(instance.post).toHaveBeenCalledWith(
    '/users/me/withdrawal', { password: 'currentPassword1!' }, { skipErrorModal: true }
  );
});

test('withdraw는 인자 없이 호출하면(구글 계정) 빈 body로 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue({ data: { success: true, message: '', data: null } });

  await withdraw();

  expect(instance.post).toHaveBeenCalledWith('/users/me/withdrawal', {}, { skipErrorModal: true });
});
```

파일 끝에 `getMyProfile` 테스트 2개 추가:

```js
test('getMyProfile은 전달받은 options를 그대로 axios config로 전달한다', async () => {
  vi.spyOn(instance, 'get').mockResolvedValue({
    data: { success: true, message: '', data: { loginId: 'tester01' } },
  });

  const result = await getMyProfile({ skipErrorModal: true });

  expect(instance.get).toHaveBeenCalledWith('/users/me', { skipErrorModal: true });
  expect(result).toEqual({ loginId: 'tester01' });
});

test('getMyProfile을 옵션 없이 호출하면 빈 config로 GET한다', async () => {
  vi.spyOn(instance, 'get').mockResolvedValue({
    data: { success: true, message: '', data: { loginId: 'tester01' } },
  });

  await getMyProfile();

  expect(instance.get).toHaveBeenCalledWith('/users/me', {});
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- src/api/myPageApi.test.js`
Expected: FAIL — 기존 4개는 인자 불일치, 새 2개는 `getMyProfile` import 실패 없이 동작은 하지만 옵션 미반영으로 실패

- [ ] **Step 3: myPageApi.js 수정**

`src/api/myPageApi.js` 전체를 다음으로 교체:

```js
import instance from './axiosInstance';

export const getMyProfile = async (options = {}) => {
  const { data } = await instance.get('/users/me', options);
  return data.data;
};

export const updateMyProfile = async (name) => {
  const { data } = await instance.patch('/users/me', { name }, { skipErrorModal: true });
  return data.data;
};

export const changeMyPassword = async (currentPassword, newPassword) => {
  const { data } = await instance.put(
    '/users/me/password', { currentPassword, newPassword }, { skipErrorModal: true }
  );
  return data;
};

export const getMyBoards = async () => {
  const { data } = await instance.get('/users/me/boards', { skipErrorModal: true });
  return data.data;
};

export const getMyConsents = async () => {
  const { data } = await instance.get('/users/me/consents', { skipErrorModal: true });
  return data.data.consents;
};

export const updateMarketingConsent = async (agreed) => {
  const { data } = await instance.put(
    '/users/me/consents/marketing', { agreed }, { skipErrorModal: true }
  );
  return data.data;
};

export const withdraw = async (password) => {
  const body = password !== undefined ? { password } : {};
  const { data } = await instance.post('/users/me/withdrawal', body, { skipErrorModal: true });
  return data;
};
```

- [ ] **Step 4: myPageApi 테스트 통과 확인**

Run: `npm test -- src/api/myPageApi.test.js`
Expected: PASS (6개 테스트 모두)

- [ ] **Step 5: 호출부 2곳 수정**

`src/pages/GoogleCallbackPage.jsx`에서 다음 줄을 찾아:

```js
        const profile = await getMyProfile();
```

다음으로 교체:

```js
        const profile = await getMyProfile({ skipErrorModal: true });
```

`src/pages/MyPage.jsx`에서 다음 줄을 찾아:

```js
        const [profileData, boardData] = await Promise.all([getMyProfile(), getMyBoards()]);
```

다음으로 교체:

```js
        const [profileData, boardData] = await Promise.all([
          getMyProfile({ skipErrorModal: true }), getMyBoards(),
        ]);
```

- [ ] **Step 6: 관련 페이지 테스트 통과 확인**

Run: `npm test -- src/pages/GoogleCallbackPage.test.jsx src/pages/MyPage.test.jsx`
Expected: PASS (두 파일 모두 기존 테스트 그대로 통과 — 두 테스트 파일 모두 `getMyProfile`의 정확한 호출 인자를 검증하지 않고 `mockResolvedValue`/`mockRejectedValue`만 사용하므로 영향 없음)

- [ ] **Step 7: 커밋**

```bash
git add src/api/myPageApi.js src/api/myPageApi.test.js src/pages/GoogleCallbackPage.jsx src/pages/MyPage.jsx
git commit -m "feat: myPageApi에 skipErrorModal 적용 (getMyProfile은 호출부가 선택)"
```

---

### Task 3: termsApi.js에 skipErrorModal 적용

**Files:**
- Modify: `src/api/termsApi.js`
- Modify: `src/api/termsApi.test.js`

**Interfaces:**
- Consumes: 없음
- Produces: 없음

- [ ] **Step 1: 실패하는 테스트 작성**

`src/api/termsApi.test.js`의 테스트를 다음으로 교체:

```js
test('getTerms는 type으로 GET 요청해서 data를 반환한다', async () => {
  vi.spyOn(instance, 'get').mockResolvedValue({
    data: { success: true, message: '', data: { type: 'TERMS', version: '1.0', content: '# 약관' } },
  });

  const result = await getTerms('TERMS');

  expect(instance.get).toHaveBeenCalledWith('/terms/TERMS', { skipErrorModal: true });
  expect(result).toEqual({ type: 'TERMS', version: '1.0', content: '# 약관' });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- src/api/termsApi.test.js`
Expected: FAIL — 인자 불일치

- [ ] **Step 3: termsApi.js 수정**

`src/api/termsApi.js` 전체를 다음으로 교체:

```js
import instance from './axiosInstance';

export const getTerms = async (type) => {
  const { data } = await instance.get(`/terms/${type}`, { skipErrorModal: true });
  return data.data;
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- src/api/termsApi.test.js`
Expected: PASS

- [ ] **Step 5: 관련 컴포넌트 테스트 통과 확인**

Run: `npm test -- src/components/TermsModal.test.jsx src/pages/TermsPage.test.jsx`
Expected: PASS (두 파일 모두 `getTerms`의 정확한 호출 인자를 검증하지 않으므로 영향 없음)

- [ ] **Step 6: 커밋**

```bash
git add src/api/termsApi.js src/api/termsApi.test.js
git commit -m "feat: termsApi.getTerms에 skipErrorModal 적용"
```

---

### Task 4: boardApi/commentApi/chatApi/adminApi/dashboardApi에 skipErrorModal 적용 (+ 최종 전체 검증)

이 5개 파일은 테스트 파일이 원래 없다(사전 존재하는 갭 — 이번 계획에서 새로 테스트를 만들지 않는다, 기존 프로젝트 관례와 동일). 기계적으로 axios 호출 config에 `skipErrorModal: true`만 추가하고 전체 테스트+빌드로 회귀만 확인한다.

**Files:**
- Modify: `src/api/boardApi.js`
- Modify: `src/api/commentApi.js`
- Modify: `src/api/chatApi.js`
- Modify: `src/api/adminApi.js`
- Modify: `src/api/dashboardApi.js`

**Interfaces:**
- Consumes: 없음
- Produces: 없음 (플랜의 마지막 태스크)

- [ ] **Step 1: boardApi.js 수정**

`src/api/boardApi.js`에서 `getBoards`/`getBoard`/`createBoard`/`updateBoard`/`deleteBoard` 5개 함수를 다음으로 교체(`getBoardAttachment`와 `toBoardFormData`는 그대로 둔다):

```js
import api from "./axiosInstance";

export const getBoards = (page = 0, size = 10, category) => {
    return api.get("/boards", { params: { page, size, category }, skipErrorModal: true });
};

export const getBoard = (boardId) => {
    return api.get(`/boards/${boardId}`, { skipErrorModal: true });
};

export const createBoard = (data) => {
    return api.post("/boards", toBoardFormData(data), { skipErrorModal: true });
};

export const updateBoard = (boardId, data) => {
    return api.put(`/boards/${boardId}`, toBoardFormData(data), { skipErrorModal: true });
};

export const deleteBoard = (boardId) => {
    return api.delete(`/boards/${boardId}`, { skipErrorModal: true });
};

export const getBoardAttachment = (boardId, attachmentId) =>
    api.get(`/boards/${boardId}/attachments/${attachmentId}`, { responseType: "blob" });

const toBoardFormData = ({ files = [], deletedAttachmentIds = [], ...board }) => {
    const formData = new FormData();
    formData.append("board", new Blob([JSON.stringify(board)], { type: "application/json" }));
    files.forEach((file) => formData.append("files", file));
    deletedAttachmentIds.forEach((id) => formData.append("deletedAttachmentIds", id));
    return formData;
};
```

- [ ] **Step 2: commentApi.js 수정**

`src/api/commentApi.js` 전체를 다음으로 교체:

```js
import api from "./axiosInstance";

export const getComments = (boardId) => {
    return api.get(`/boards/${boardId}/comments`, { skipErrorModal: true });
};

export const createComment = (boardId, data) => {
    return api.post(`/boards/${boardId}/comments`, data, { skipErrorModal: true });
};

export const updateComment = (commentId, data) => {
    return api.put(`/comments/${commentId}`, data, { skipErrorModal: true });
};

export const deleteComment = (commentId) => {
    return api.delete(`/comments/${commentId}`, { skipErrorModal: true });
};
```

- [ ] **Step 3: chatApi.js 수정**

`src/api/chatApi.js` 전체를 다음으로 교체:

```js
import instance from './axiosInstance';

export const sendChatMessage = async (message) => {
  const { data } = await instance.post('/chat', { message }, { skipErrorModal: true });
  return data;
};

export const sendChatExcel = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await instance.post('/chat/excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    skipErrorModal: true,
  });
  return data;
};
```

- [ ] **Step 4: adminApi.js 수정**

`src/api/adminApi.js` 전체를 다음으로 교체:

```js
import instance from './axiosInstance';

export const getAdminUsers = async () => {
  const { data } = await instance.get('/admin/users', { skipErrorModal: true });
  return data.data;
};

export const changeUserRole = async (userId, role) => {
  const { data } = await instance.patch(`/admin/users/${userId}/role`, { role }, { skipErrorModal: true });
  return data.data;
};
```

- [ ] **Step 5: dashboardApi.js 수정**

`src/api/dashboardApi.js` 전체를 다음으로 교체:

```js
import instance from './axiosInstance';

export const createSiteAnalysis = async (payload) => {
  const { data } = await instance.post('/dashboard/analyses', payload, { skipErrorModal: true });
  return data.data;
};

export const fetchMyAnalysisHistory = async () => {
  const { data } = await instance.get('/dashboard/analyses/me', { skipErrorModal: true });
  return data.data;
};

export const fetchDemoAnalyses = async () => {
  const { data } = await instance.get('/dashboard/analyses/demo', { skipErrorModal: true });
  return data.data;
};
```

- [ ] **Step 6: 전체 테스트 + 빌드 확인**

Run: `npm test`
Expected: 전체 PASS (5개 파일 모두 테스트가 없으므로 새로 실패하는 테스트는 없어야 하고, 이번 계획의 Task 1~3에서 추가/수정한 테스트를 포함해 전부 통과)

Run: `npm run build`
Expected: 에러 없이 빌드 성공(문법 오류 등 이 단계에서만 잡히는 실수 확인)

- [ ] **Step 7: 커밋**

```bash
git add src/api/boardApi.js src/api/commentApi.js src/api/chatApi.js src/api/adminApi.js src/api/dashboardApi.js
git commit -m "feat: 게시판/댓글/챗봇/관리자/대시보드 API에 skipErrorModal 적용"
```
