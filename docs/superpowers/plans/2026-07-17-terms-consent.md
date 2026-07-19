# 약관 동의(개인정보 수집·이용) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 회원가입 시 약관 동의를 수집하고, 약관 전문을 모달/페이지로 보여주고, 마이페이지에서 동의 현황을 조회·마케팅 동의를 변경할 수 있게 한다.

**Architecture:** 새 API 함수 3개(`termsApi.getTerms`, `myPageApi.getMyConsents`, `myPageApi.updateMarketingConsent`) + 기존 `authApi.signup` 확장을 기반으로, 약관 본문을 보여주는 공용 `TermsModal`(모달)과 `TermsPage`(`/terms/:type`, 전체 페이지)를 만들고, `SignupPage`/`LoginPage`/`Footer`/`MyPage` 4곳에서 이를 연결한다.

**Tech Stack:** React 19, react-router-dom v7, axios, vitest + @testing-library/react + @testing-library/user-event, `react-markdown`(신규 의존성).

## Global Constraints

- 스펙 문서: `docs/superpowers/specs/2026-07-17-terms-consent-design.md`
- API 응답 포맷은 기존과 동일 `{ success, message, data }`
- `GET /terms/{type}`은 인증 불필요, `type`은 `TERMS` | `PRIVACY`(대문자)
- 회원가입 `termsAgreed`/`privacyAgreed`는 필수(false면 제출 자체를 막음), `marketingAgreed`는 선택(기본 false)
- 마이페이지 동의 현황에서 `agreed`/`version`/`agreedAt`이 `null`이면 "동의 기록 없음"으로 표시(오래된 가입자)
- 필수 약관(TERMS/PRIVACY) 변경 API는 없음 — 조회 전용, 마케팅만 토글 가능
- 각 태스크 종료 시 `npm test`(전체) 통과를 재확인한다(회귀 방지)

---

### Task 1: API 계층 추가 (termsApi, myPageApi 확장, authApi.signup 확장)

**Files:**
- Create: `src/api/termsApi.js`
- Test: `src/api/termsApi.test.js`
- Modify: `src/api/myPageApi.js` (파일 끝에 함수 추가)
- Create: `src/api/myPageApi.test.js` (기존 테스트 파일 없음 — 새로 만들되 이번에 추가하는 2개 함수만 다룬다)
- Modify: `src/api/authApi.js:signup` 함수
- Modify: `src/api/authApi.test.js` (signup 테스트 갱신)

**Interfaces:**
- Consumes: 없음 (기존 `instance` axios 인스턴스만 사용)
- Produces:
  - `getTerms(type) => Promise<{ type, version, content }>` (from `termsApi.js`) — Task 2(TermsModal), Task 4(TermsPage)에서 사용
  - `getMyConsents() => Promise<Array<{ type, agreed, version, agreedAt }>>` (from `myPageApi.js`) — Task 6(MyPage)에서 사용
  - `updateMarketingConsent(agreed) => Promise<{ type, agreed, version, agreedAt }>` (from `myPageApi.js`) — Task 6에서 사용
  - `signup({ loginId, email, password, name, termsAgreed, privacyAgreed, marketingAgreed })` — Task 3(SignupPage)에서 사용

- [ ] **Step 1: termsApi 실패하는 테스트 작성**

`src/api/termsApi.test.js` 새 파일:

```js
import { vi } from 'vitest';
import instance from './axiosInstance';
import { getTerms } from './termsApi';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('getTerms는 type으로 GET 요청해서 data를 반환한다', async () => {
  vi.spyOn(instance, 'get').mockResolvedValue({
    data: { success: true, message: '', data: { type: 'TERMS', version: '1.0', content: '# 약관' } },
  });

  const result = await getTerms('TERMS');

  expect(instance.get).toHaveBeenCalledWith('/terms/TERMS');
  expect(result).toEqual({ type: 'TERMS', version: '1.0', content: '# 약관' });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- src/api/termsApi.test.js`
Expected: FAIL — `Cannot find module './termsApi'`

- [ ] **Step 3: termsApi 최소 구현**

`src/api/termsApi.js` 새 파일:

```js
import instance from './axiosInstance';

export const getTerms = async (type) => {
  const { data } = await instance.get(`/terms/${type}`);
  return data.data;
};
```

- [ ] **Step 4: termsApi 테스트 통과 확인**

Run: `npm test -- src/api/termsApi.test.js`
Expected: PASS

- [ ] **Step 5: myPageApi 실패하는 테스트 작성**

`src/api/myPageApi.test.js` 새 파일:

```js
import { vi } from 'vitest';
import instance from './axiosInstance';
import { getMyConsents, updateMarketingConsent } from './myPageApi';

beforeEach(() => {
  vi.restoreAllMocks();
});

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

  expect(instance.get).toHaveBeenCalledWith('/users/me/consents');
  expect(result).toEqual(consents);
});

test('updateMarketingConsent는 agreed를 PUT하고 변경된 항목을 반환한다', async () => {
  const updated = { type: 'MARKETING', agreed: true, version: '1.0', agreedAt: '2026-07-17T00:00:00' };
  vi.spyOn(instance, 'put').mockResolvedValue({
    data: { success: true, message: '', data: updated },
  });

  const result = await updateMarketingConsent(true);

  expect(instance.put).toHaveBeenCalledWith('/users/me/consents/marketing', { agreed: true });
  expect(result).toEqual(updated);
});
```

- [ ] **Step 6: 테스트 실패 확인**

Run: `npm test -- src/api/myPageApi.test.js`
Expected: FAIL — `getMyConsents is not a function`

- [ ] **Step 7: myPageApi에 함수 추가**

`src/api/myPageApi.js` 파일 끝에 추가:

```js
export const getMyConsents = async () => {
  const { data } = await instance.get('/users/me/consents');
  return data.data.consents;
};

export const updateMarketingConsent = async (agreed) => {
  const { data } = await instance.put('/users/me/consents/marketing', { agreed });
  return data.data;
};
```

- [ ] **Step 8: myPageApi 테스트 통과 확인**

Run: `npm test -- src/api/myPageApi.test.js`
Expected: PASS

- [ ] **Step 9: authApi.signup 테스트 갱신 (실패 확인)**

`src/api/authApi.test.js`에서 기존 `signup` 테스트를 찾아 다음으로 교체:

```js
test('signup은 가입 정보와 약관 동의 여부를 POST한다', async () => {
  vi.spyOn(instance, 'post').mockResolvedValue(ok(null));
  const body = {
    loginId: 'tester01', email: 'a@b.com', password: 'password123', name: '홍길동',
    termsAgreed: true, privacyAgreed: true, marketingAgreed: false,
  };
  await signup(body);
  expect(instance.post).toHaveBeenCalledWith('/auth/signup', body);
});
```

Run: `npm test -- src/api/authApi.test.js`
Expected: PASS (기존 `signup` 구현이 `{ loginId, email, password, name }`만 destructure해서 보내므로, `termsAgreed` 등은 `undefined`로 빠진 채 전송됨 — `toHaveBeenCalledWith`의 `toEqual` 비교에서 `undefined` 값 키는 무시되어 이 시점엔 우연히 PASS할 수 있음. 다음 스텝에서 실제로 값이 전달되는지 별도 검증한다.)

- [ ] **Step 10: authApi.signup 값 전달 검증용 테스트 추가 (실패 확인)**

같은 파일에 이어서 추가:

```js
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
```

Run: `npm test -- src/api/authApi.test.js`
Expected: FAIL — `sentBody.marketingAgreed`가 `undefined`

- [ ] **Step 11: authApi.signup 수정**

`src/api/authApi.js`에서 기존 `signup` 함수를 찾아 교체:

```js
export const signup = async ({
  loginId, email, password, name, termsAgreed, privacyAgreed, marketingAgreed,
}) => {
  const { data } = await instance.post('/auth/signup', {
    loginId, email, password, name, termsAgreed, privacyAgreed, marketingAgreed,
  });
  return data;
};
```

- [ ] **Step 12: 테스트 통과 확인**

Run: `npm test -- src/api/authApi.test.js src/api/termsApi.test.js src/api/myPageApi.test.js`
Expected: PASS (전체)

- [ ] **Step 13: 커밋**

```bash
git add src/api/termsApi.js src/api/termsApi.test.js src/api/myPageApi.js src/api/myPageApi.test.js src/api/authApi.js src/api/authApi.test.js
git commit -m "feat: 약관 조회/동의 현황/회원가입 동의 필드 API 함수 추가"
```

---

### Task 2: TermsModal 컴포넌트 (react-markdown 의존성 포함)

**Files:**
- Modify: `package.json` (의존성 추가)
- Create: `src/components/TermsModal.jsx`
- Test: `src/components/TermsModal.test.jsx`
- Modify: `src/styles/AuthPage.css` (모달 확장 스타일 추가)

**Interfaces:**
- Consumes: `getTerms(type)` (Task 1, `src/api/termsApi.js`)
- Produces: `<TermsModal type="TERMS"|"PRIVACY" onClose={fn} />` — Task 3(SignupPage), Task 5(LoginPage)에서 사용

- [ ] **Step 1: react-markdown 설치**

```bash
npm install react-markdown
```

Run 후 `package.json`의 `dependencies`에 `react-markdown`이 추가됐는지 확인.

- [ ] **Step 2: 실패하는 테스트 작성**

`src/components/TermsModal.test.jsx` 새 파일:

```jsx
import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TermsModal from './TermsModal';
import * as termsApi from '../api/termsApi';

vi.mock('../api/termsApi');

beforeEach(() => {
  vi.clearAllMocks();
});

test('로딩 중에는 안내 문구를 보여준다', () => {
  termsApi.getTerms.mockReturnValue(new Promise(() => {}));
  render(<TermsModal type="TERMS" onClose={() => {}} />);
  expect(screen.getByText('약관을 불러오는 중...')).toBeInTheDocument();
});

test('조회에 성공하면 제목/버전/본문을 보여준다', async () => {
  termsApi.getTerms.mockResolvedValue({ type: 'TERMS', version: '1.0', content: '# 이용약관 내용' });
  render(<TermsModal type="TERMS" onClose={() => {}} />);

  await waitFor(() => expect(screen.getByText('버전 1.0')).toBeInTheDocument());
  expect(screen.getByRole('heading', { name: '이용약관' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '이용약관 내용', level: 1 })).toBeInTheDocument();
  expect(termsApi.getTerms).toHaveBeenCalledWith('TERMS');
});

test('조회에 실패하면 에러 메시지를 보여준다', async () => {
  termsApi.getTerms.mockRejectedValue({ response: { status: 404 } });
  render(<TermsModal type="PRIVACY" onClose={() => {}} />);

  await waitFor(() => expect(screen.getByText('약관을 불러오지 못했습니다.')).toBeInTheDocument());
  expect(screen.getByRole('heading', { name: '개인정보처리방침' })).toBeInTheDocument();
});

test('닫기 버튼 클릭 시 onClose가 호출된다', async () => {
  termsApi.getTerms.mockResolvedValue({ type: 'TERMS', version: '1.0', content: '내용' });
  const onClose = vi.fn();
  render(<TermsModal type="TERMS" onClose={onClose} />);
  await waitFor(() => screen.getByText('버전 1.0'));

  await userEvent.click(screen.getByRole('button', { name: '닫기' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('오버레이 클릭 시 onClose가 호출된다', async () => {
  termsApi.getTerms.mockResolvedValue({ type: 'TERMS', version: '1.0', content: '내용' });
  const onClose = vi.fn();
  const { container } = render(<TermsModal type="TERMS" onClose={onClose} />);
  await waitFor(() => screen.getByText('버전 1.0'));

  await userEvent.click(container.querySelector('.modal-overlay'));
  expect(onClose).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -- src/components/TermsModal.test.jsx`
Expected: FAIL — `Cannot find module './TermsModal'`

- [ ] **Step 4: 최소 구현**

`src/components/TermsModal.jsx` 새 파일:

```jsx
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { getTerms } from '../api/termsApi';
import '../styles/AuthPage.css';

const TITLES = { TERMS: '이용약관', PRIVACY: '개인정보처리방침' };

const TermsModal = ({ type, onClose }) => {
  const [state, setState] = useState({ status: 'loading', data: null });

  useEffect(() => {
    let ignore = false;
    setState({ status: 'loading', data: null });
    getTerms(type)
      .then((terms) => {
        if (!ignore) setState({ status: 'success', data: terms });
      })
      .catch(() => {
        if (!ignore) setState({ status: 'error', data: null });
      });
    return () => {
      ignore = true;
    };
  }, [type]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box-wide" onClick={(e) => e.stopPropagation()}>
        <h2>{TITLES[type]}</h2>
        {state.status === 'loading' && <p>약관을 불러오는 중...</p>}
        {state.status === 'error' && <p>약관을 불러오지 못했습니다.</p>}
        {state.status === 'success' && (
          <>
            <p className="terms-version">버전 {state.data.version}</p>
            <div className="terms-content">
              <ReactMarkdown>{state.data.content}</ReactMarkdown>
            </div>
          </>
        )}
        <button type="button" className="auth-submit auth-submit-secondary" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
};

export default TermsModal;
```

- [ ] **Step 5: 모달 확장 스타일 추가**

`src/styles/AuthPage.css` 파일 끝에 추가:

```css
.modal-box-wide {
  max-width: 560px;
  max-height: 80vh;
  overflow-y: auto;
  text-align: left;
}

.modal-box-wide h2 {
  margin: 0 0 8px;
  font-size: 20px;
}

.terms-version {
  color: #98a2b3;
  font-size: 12px;
  margin: 0 0 16px;
}

.terms-content {
  font-size: 14px;
  line-height: 1.6;
  color: #344054;
}

.modal-box-wide .auth-submit-secondary {
  margin-top: 20px;
  width: auto;
  padding: 10px 32px;
}

.link-button {
  background: none;
  border: none;
  color: #14b8a6;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  padding: 0;
}

.link-button:hover {
  text-decoration: underline;
}
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `npm test -- src/components/TermsModal.test.jsx`
Expected: PASS (5개 테스트 모두)

- [ ] **Step 7: 커밋**

```bash
git add package.json package-lock.json src/components/TermsModal.jsx src/components/TermsModal.test.jsx src/styles/AuthPage.css
git commit -m "feat: 약관 전문 모달(TermsModal) 추가"
```

---

### Task 3: SignupPage 동의 UI

**Files:**
- Modify: `src/pages/SignupPage.jsx`
- Modify: `src/pages/SignupPage.test.jsx`
- Modify: `src/styles/AuthPage.css` (동의 박스 스타일 추가)

**Interfaces:**
- Consumes: `<TermsModal type onClose />` (Task 2), `authApi.signup(...)` (Task 1, 이제 `termsAgreed`/`privacyAgreed`/`marketingAgreed` 포함)
- Produces: 없음

- [ ] **Step 1: 동의 박스 스타일 추가**

`src/styles/AuthPage.css` 파일 끝에 추가:

```css
.signup-consent-box {
  border: 1.5px solid #d0d5dd;
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 18px;
}

.signup-consent-all {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 14px;
}

.signup-consent-divider {
  border: none;
  border-top: 1px solid #e4e7ec;
  margin: 12px 0;
}

.signup-consent-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  color: #344054;
}

.signup-consent-item:last-child {
  margin-bottom: 0;
}

.signup-consent-item label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.signup-consent-item .link-button {
  margin-left: auto;
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`src/pages/SignupPage.test.jsx` 상단 import에 추가:

```js
import * as termsApi from '../api/termsApi';

vi.mock('../api/termsApi');
```

기존 `completeVerifications` 헬퍼 아래에 새 헬퍼 추가:

```js
const agreeToRequiredTerms = async () => {
  await userEvent.click(screen.getByLabelText('[필수] 이용약관 동의'));
  await userEvent.click(screen.getByLabelText('[필수] 개인정보 수집·이용 동의'));
};
```

`'이메일 인증과 아이디 중복확인 후 가입이 성공하면 로그인 페이지로 이동한다'` 테스트를 다음으로 교체:

```js
test('이메일 인증과 아이디 중복확인, 필수 약관 동의 후 가입이 성공하면 로그인 페이지로 이동한다', async () => {
  authApi.signup.mockResolvedValue({ success: true });
  renderSignup();

  await completeVerifications();
  await agreeToRequiredTerms();
  await userEvent.type(screen.getByLabelText('비밀번호'), 'Password1!');
  await userEvent.type(screen.getByLabelText('비밀번호 확인'), 'Password1!');
  await userEvent.type(screen.getByLabelText('이름'), '홍길동');

  const submit = screen.getByRole('button', { name: '가입하기' });
  expect(submit).toBeEnabled();
  await userEvent.click(submit);

  await waitFor(() => expect(screen.getByText('로그인페이지')).toBeInTheDocument());
  expect(authApi.signup).toHaveBeenCalledWith({
    loginId: 'tester01', email: 'user@example.com', password: 'Password1!', name: '홍길동',
    termsAgreed: true, privacyAgreed: true, marketingAgreed: false,
  });
});
```

`'비밀번호가 조건을 만족하지 않으면...'`과 `'비밀번호 확인이 일치하지 않으면...'` 두 테스트 각각에서 `await completeVerifications();` 바로 다음 줄에 `await agreeToRequiredTerms();`를 추가.

파일 끝에 다음 테스트들을 추가:

```js
test('필수 약관에 동의하지 않으면 가입하기 버튼이 비활성화된다', async () => {
  renderSignup();

  await completeVerifications();
  await userEvent.type(screen.getByLabelText('비밀번호'), 'Password1!');
  await userEvent.type(screen.getByLabelText('비밀번호 확인'), 'Password1!');
  await userEvent.type(screen.getByLabelText('이름'), '홍길동');

  expect(screen.getByRole('button', { name: '가입하기' })).toBeDisabled();
});

test('전체 동의 체크박스를 누르면 필수+선택 항목이 모두 체크된다', async () => {
  renderSignup();

  await userEvent.click(screen.getByLabelText('전체 동의합니다'));

  expect(screen.getByLabelText('[필수] 이용약관 동의')).toBeChecked();
  expect(screen.getByLabelText('[필수] 개인정보 수집·이용 동의')).toBeChecked();
  expect(screen.getByLabelText('[선택] 마케팅 정보 수신 동의')).toBeChecked();
});

test('개별 항목을 모두 체크하면 전체 동의도 자동으로 체크된다', async () => {
  renderSignup();

  await userEvent.click(screen.getByLabelText('[필수] 이용약관 동의'));
  await userEvent.click(screen.getByLabelText('[필수] 개인정보 수집·이용 동의'));
  expect(screen.getByLabelText('전체 동의합니다')).not.toBeChecked();

  await userEvent.click(screen.getByLabelText('[선택] 마케팅 정보 수신 동의'));
  expect(screen.getByLabelText('전체 동의합니다')).toBeChecked();
});

test('전문 보기 클릭 시 약관 모달이 뜬다', async () => {
  termsApi.getTerms.mockResolvedValue({ type: 'TERMS', version: '1.0', content: '본문' });
  renderSignup();

  await userEvent.click(screen.getAllByRole('button', { name: '전문 보기' })[0]);

  await waitFor(() => expect(screen.getByText('본문')).toBeInTheDocument());
  expect(termsApi.getTerms).toHaveBeenCalledWith('TERMS');
});

test('가입 요청이 400으로 실패하면 응답의 필드별 약관 동의 메시지를 보여준다(방어적 처리)', async () => {
  authApi.signup.mockRejectedValue({
    response: {
      status: 400,
      data: { success: false, message: '요청이 올바르지 않습니다.', data: { termsAgreed: '필수 약관에 동의해야 합니다.' } },
    },
  });
  renderSignup();

  await completeVerifications();
  await agreeToRequiredTerms();
  await userEvent.type(screen.getByLabelText('비밀번호'), 'Password1!');
  await userEvent.type(screen.getByLabelText('비밀번호 확인'), 'Password1!');
  await userEvent.type(screen.getByLabelText('이름'), '홍길동');
  await userEvent.click(screen.getByRole('button', { name: '가입하기' }));

  await waitFor(() =>
    expect(screen.getByText('필수 약관에 동의해야 합니다.')).toBeInTheDocument()
  );
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -- src/pages/SignupPage.test.jsx`
Expected: FAIL — `[필수] 이용약관 동의` 라벨을 가진 엘리먼트를 찾지 못함

- [ ] **Step 4: SignupPage에 동의 UI 추가**

`src/pages/SignupPage.jsx` import에 추가:

```js
import TermsModal from '../components/TermsModal';
```

상태 선언부(`const [name, setName] = useState('');` 다음)에 추가:

```js
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [marketingAgreed, setMarketingAgreed] = useState(false);
  const [openTermsType, setOpenTermsType] = useState(null);
```

`handleSubmit` 함수 앞에 추가:

```js
  const allAgreed = termsAgreed && privacyAgreed && marketingAgreed;

  const handleAllAgreedChange = (e) => {
    const checked = e.target.checked;
    setTermsAgreed(checked);
    setPrivacyAgreed(checked);
    setMarketingAgreed(checked);
  };
```

`handleSubmit` 함수 전체를 다음으로 교체(마지막 `catch` 블록의 메시지 추출 로직이 바뀐다 — 백엔드가 필수 약관 미동의 400 응답의 `data.data`에 `{ termsAgreed: "..." }`/`{ privacyAgreed: "..." }` 형태로 필드별 메시지를 담아 보내므로, 있으면 그걸 우선 표시한다. 버튼이 비활성화돼 있어 정상 흐름에선 도달하지 않는 방어적 처리):

```js
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidPassword(password)) {
      setFormError(PASSWORD_RULE_MESSAGE);
      return;
    }
    if (!name) {
      setFormError('이름을 입력해주세요.');
      return;
    }
    setFormError('');
    setIsSubmitting(true);
    try {
      await authApi.signup({
        loginId, email, password, name, termsAgreed, privacyAgreed, marketingAgreed,
      });
      navigate('/login', { state: { message: '회원가입이 완료되었습니다. 로그인해주세요.' } });
    } catch (err) {
      const fieldData = err.response?.data?.data;
      const fieldMessage = fieldData && typeof fieldData === 'object' ? Object.values(fieldData)[0] : null;
      setFormError(fieldMessage || serverMessage(err, '회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.'));
    } finally {
      setIsSubmitting(false);
    }
  };
```

`canSubmit` 선언을 다음으로 교체:

```js
  const canSubmit = emailVerified && loginIdChecked && termsAgreed && privacyAgreed
    && !passwordMismatch && !isSubmitting;
```

"이름" 필드(`<div className="auth-field">`로 감싼 이름 입력)와 `{formError && ...}` 사이에 다음 블록 추가:

```jsx
        <div className="signup-consent-box">
          <label className="signup-consent-all">
            <input type="checkbox" checked={allAgreed} onChange={handleAllAgreedChange} />
            전체 동의합니다
          </label>
          <hr className="signup-consent-divider" />
          <div className="signup-consent-item">
            <label>
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
              />
              [필수] 이용약관 동의
            </label>
            <button type="button" className="link-button" onClick={() => setOpenTermsType('TERMS')}>
              전문 보기
            </button>
          </div>
          <div className="signup-consent-item">
            <label>
              <input
                type="checkbox"
                checked={privacyAgreed}
                onChange={(e) => setPrivacyAgreed(e.target.checked)}
              />
              [필수] 개인정보 수집·이용 동의
            </label>
            <button type="button" className="link-button" onClick={() => setOpenTermsType('PRIVACY')}>
              전문 보기
            </button>
          </div>
          <div className="signup-consent-item">
            <label>
              <input
                type="checkbox"
                checked={marketingAgreed}
                onChange={(e) => setMarketingAgreed(e.target.checked)}
              />
              [선택] 마케팅 정보 수신 동의
            </label>
          </div>
        </div>

        {openTermsType && (
          <TermsModal type={openTermsType} onClose={() => setOpenTermsType(null)} />
        )}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- src/pages/SignupPage.test.jsx`
Expected: PASS (전체 파일, 기존 테스트 포함)

- [ ] **Step 6: 커밋**

```bash
git add src/pages/SignupPage.jsx src/pages/SignupPage.test.jsx src/styles/AuthPage.css
git commit -m "feat: 회원가입 화면에 약관 동의 UI 추가"
```

---

### Task 4: TermsPage(`/terms/:type`) + 라우팅 + Footer

**Files:**
- Create: `src/pages/TermsPage.jsx`
- Test: `src/pages/TermsPage.test.jsx`
- Modify: `src/App.jsx`
- Modify: `src/App.test.jsx`
- Modify: `src/components/Footer.jsx`
- Test: `src/components/Footer.test.jsx`
- Modify: `src/styles/MainPage.css` (footer 링크 스타일 추가 — 기존 전역 `footer` 규칙이 이 파일에 있음)
- Modify: `src/styles/AuthPage.css` (`.terms-page`/`.terms-card` 스크롤 스타일 추가)

**Interfaces:**
- Consumes: `getTerms(type)` (Task 1)
- Produces: 라우트 `/terms/:type` — 이후 태스크는 이 라우트를 직접 소비하지 않음(Footer/LoginPage는 링크만 검) — 없음

- [ ] **Step 1: TermsPage 실패하는 테스트 작성**

`src/pages/TermsPage.test.jsx` 새 파일:

```jsx
import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import TermsPage from './TermsPage';
import * as termsApi from '../api/termsApi';

vi.mock('../api/termsApi');
vi.mock('../components/Layout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/terms/:type" element={<TermsPage />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
});

test('terms 타입이면 TERMS로 조회해서 본문을 보여준다', async () => {
  termsApi.getTerms.mockResolvedValue({ type: 'TERMS', version: '1.0', content: '이용약관 본문' });
  renderAt('/terms/terms');

  await waitFor(() => expect(screen.getByText('이용약관 본문')).toBeInTheDocument());
  expect(termsApi.getTerms).toHaveBeenCalledWith('TERMS');
  expect(screen.getByRole('heading', { name: '이용약관' })).toBeInTheDocument();
});

test('privacy 타입이면 PRIVACY로 조회한다', async () => {
  termsApi.getTerms.mockResolvedValue({ type: 'PRIVACY', version: '1.0', content: '개인정보 본문' });
  renderAt('/terms/privacy');

  await waitFor(() => expect(screen.getByText('개인정보 본문')).toBeInTheDocument());
  expect(termsApi.getTerms).toHaveBeenCalledWith('PRIVACY');
});

test('알 수 없는 type이면 API를 호출하지 않고 안내를 보여준다', async () => {
  renderAt('/terms/unknown');

  await waitFor(() => expect(screen.getByText('약관을 찾을 수 없습니다.')).toBeInTheDocument());
  expect(termsApi.getTerms).not.toHaveBeenCalled();
});

test('조회 실패 시 안내를 보여준다', async () => {
  termsApi.getTerms.mockRejectedValue({ response: { status: 404 } });
  renderAt('/terms/terms');

  await waitFor(() => expect(screen.getByText('약관을 찾을 수 없습니다.')).toBeInTheDocument());
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- src/pages/TermsPage.test.jsx`
Expected: FAIL — `Cannot find module './TermsPage'`

- [ ] **Step 3: TermsPage 구현**

`src/pages/TermsPage.jsx` 새 파일:

```jsx
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import Layout from '../components/Layout';
import { getTerms } from '../api/termsApi';
import '../styles/AuthPage.css';

const TITLES = { terms: '이용약관', privacy: '개인정보처리방침' };
const TYPE_MAP = { terms: 'TERMS', privacy: 'PRIVACY' };

const TermsPage = () => {
  const { type } = useParams();
  const apiType = TYPE_MAP[type];
  const [state, setState] = useState({ status: 'loading', data: null });

  useEffect(() => {
    if (!apiType) {
      setState({ status: 'invalid', data: null });
      return;
    }
    let ignore = false;
    setState({ status: 'loading', data: null });
    getTerms(apiType)
      .then((terms) => {
        if (!ignore) setState({ status: 'success', data: terms });
      })
      .catch(() => {
        if (!ignore) setState({ status: 'error', data: null });
      });
    return () => {
      ignore = true;
    };
  }, [apiType]);

  return (
    <Layout>
      <div className="auth-page terms-page">
        <div className="auth-card terms-card">
          <h1>{TITLES[type] || '약관'}</h1>
          {state.status === 'loading' && <p className="auth-subtitle">약관을 불러오는 중...</p>}
          {(state.status === 'error' || state.status === 'invalid') && (
            <>
              <p className="auth-error">약관을 찾을 수 없습니다.</p>
              <div className="auth-links">
                <Link to="/">홈으로 돌아가기</Link>
              </div>
            </>
          )}
          {state.status === 'success' && (
            <>
              <p className="terms-version">버전 {state.data.version}</p>
              <div className="terms-content">
                <ReactMarkdown>{state.data.content}</ReactMarkdown>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default TermsPage;
```

- [ ] **Step 4: TermsPage 스크롤 스타일 추가**

`Layout`의 `.main-content`는 `overflow: hidden` + 고정 높이(`calc(100vh - 114px)`, `src/styles/MainPage.css`)라서, Layout 안에 놓이는 페이지는 자체적으로 스크롤 컨테이너를 만들어야 한다(게시판 페이지들이 `board.css`에서 `height: 100%; overflow-y: auto`로 처리하는 것과 같은 패턴). 이게 없으면 긴 약관 본문이 잘리고 스크롤이 안 된다.

`src/styles/AuthPage.css` 파일 끝에 추가:

```css
.terms-page {
  min-height: auto;
  height: 100%;
  width: 100%;
  overflow-y: auto;
  align-items: flex-start;
}

.terms-card {
  padding: 40px 48px 64px;
}
```

(`.terms-page`는 `.auth-page`와 함께 쓰여 `min-height: 100vh`/수직 중앙정렬을 무효화하고 자체 스크롤을 만든다.)

- [ ] **Step 5: TermsPage 테스트 통과 확인**

Run: `npm test -- src/pages/TermsPage.test.jsx`
Expected: PASS

- [ ] **Step 6: 라우트 실패하는 테스트 작성**

`src/App.test.jsx` 상단에 추가:

```js
import * as termsApi from './api/termsApi';

vi.mock('./api/termsApi');
```

파일 끝에 추가:

```js
test('/terms/privacy 경로에서 약관 페이지를 보여준다', async () => {
  termsApi.getTerms.mockResolvedValue({ type: 'PRIVACY', version: '1.0', content: '본문' });
  renderAt('/terms/privacy');
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: '개인정보처리방침' })).toBeInTheDocument()
  );
});
```

- [ ] **Step 7: 테스트 실패 확인**

Run: `npm test -- src/App.test.jsx`
Expected: FAIL — 해당 heading을 찾지 못함(라우트 없음)

- [ ] **Step 8: 라우트 추가**

`src/App.jsx` import에 추가:

```js
import TermsPage from './pages/TermsPage';
```

`<Route path="/oauth/google/callback" element={<GoogleCallbackPage />} />` 다음 줄에 추가:

```jsx
    <Route path="/terms/:type" element={<TermsPage />} />
```

- [ ] **Step 9: 라우트 테스트 통과 확인**

Run: `npm test -- src/App.test.jsx`
Expected: PASS

- [ ] **Step 10: Footer 실패하는 테스트 작성**

`src/components/Footer.test.jsx` 새 파일:

```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from './Footer';

test('개인정보처리방침 링크가 /terms/privacy로 연결된다', () => {
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>
  );
  expect(screen.getByRole('link', { name: '개인정보처리방침' })).toHaveAttribute('href', '/terms/privacy');
});

test('이용약관 링크가 /terms/terms로 연결된다', () => {
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>
  );
  expect(screen.getByRole('link', { name: '이용약관' })).toHaveAttribute('href', '/terms/terms');
});
```

- [ ] **Step 11: 테스트 실패 확인**

Run: `npm test -- src/components/Footer.test.jsx`
Expected: FAIL — 링크를 찾지 못함(현재 Footer는 "푸터 테스트" 텍스트만 있음)

- [ ] **Step 12: Footer 구현 교체**

`src/components/Footer.jsx` 전체를 다음으로 교체:

```jsx
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer>
    <span>© SolarAivle</span>
    <nav className="footer-links">
      <Link to="/terms/terms">이용약관</Link>
      <Link to="/terms/privacy" className="footer-link-primary">개인정보처리방침</Link>
    </nav>
  </footer>
);

export default Footer;
```

- [ ] **Step 13: footer 스타일 추가**

`src/styles/MainPage.css`의 기존 `footer { ... }` 규칙 바로 다음에 추가:

```css
footer {
  gap: 24px;
}

.footer-links {
  display: flex;
  gap: 16px;
}

.footer-links a {
  color: #9fb1c4;
  text-decoration: none;
  font-size: 12px;
}

.footer-links a:hover {
  text-decoration: underline;
}

.footer-link-primary {
  font-weight: 700;
  color: #dff6f2 !important;
}
```

- [ ] **Step 14: Footer 테스트 통과 확인**

Run: `npm test -- src/components/Footer.test.jsx`
Expected: PASS

- [ ] **Step 15: 전체 테스트 + 빌드 확인**

Run: `npm test`
Expected: 전체 PASS

Run: `npm run build`
Expected: 에러 없이 빌드 성공

- [ ] **Step 16: 커밋**

```bash
git add src/pages/TermsPage.jsx src/pages/TermsPage.test.jsx src/App.jsx src/App.test.jsx src/components/Footer.jsx src/components/Footer.test.jsx src/styles/MainPage.css src/styles/AuthPage.css
git commit -m "feat: 약관 전문 페이지(/terms/:type)와 푸터 개인정보처리방침 링크 추가"
```

---

### Task 5: LoginPage 구글 로그인 안내 문구

**Files:**
- Modify: `src/pages/LoginPage.jsx`
- Modify: `src/pages/LoginPage.test.jsx`
- Modify: `src/styles/AuthPage.css` (안내 문구 스타일 추가)

**Interfaces:**
- Consumes: `<TermsModal type onClose />` (Task 2)
- Produces: 없음

- [ ] **Step 1: 안내 문구 스타일 추가**

`src/styles/AuthPage.css` 파일 끝에 추가:

```css
.google-consent-notice {
  margin-top: 10px;
  font-size: 12px;
  color: #98a2b3;
  text-align: center;
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`src/pages/LoginPage.test.jsx` 상단 import에 추가:

```js
import * as termsApi from '../api/termsApi';

vi.mock('../api/termsApi');
```

파일 끝에 추가:

```js
test('구글 로그인 안내 문구와 약관 링크를 보여준다', () => {
  renderLogin();
  expect(screen.getByText(/구글 로그인 시/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '이용약관' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '개인정보처리방침' })).toBeInTheDocument();
});

test('안내 문구의 개인정보처리방침 클릭 시 약관 모달이 뜬다', async () => {
  termsApi.getTerms.mockResolvedValue({ type: 'PRIVACY', version: '1.0', content: '본문' });
  renderLogin();

  await userEvent.click(screen.getByRole('button', { name: '개인정보처리방침' }));

  await waitFor(() => expect(screen.getByText('본문')).toBeInTheDocument());
  expect(termsApi.getTerms).toHaveBeenCalledWith('PRIVACY');
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -- src/pages/LoginPage.test.jsx`
Expected: FAIL — "구글 로그인 시" 텍스트를 찾지 못함

- [ ] **Step 4: LoginPage에 안내 문구 추가**

`src/pages/LoginPage.jsx` import에 추가:

```js
import TermsModal from '../components/TermsModal';
```

`useState` 선언부에 추가:

```js
  const [openTermsType, setOpenTermsType] = useState(null);
```

"Google로 계속하기" 버튼 바로 다음(`</button>` 다음, `</form>` 이전)에 추가:

```jsx
        <p className="google-consent-notice">
          구글 로그인 시{' '}
          <button type="button" className="link-button" onClick={() => setOpenTermsType('TERMS')}>
            이용약관
          </button>
          {' '}및{' '}
          <button type="button" className="link-button" onClick={() => setOpenTermsType('PRIVACY')}>
            개인정보처리방침
          </button>
          에 동의한 것으로 간주됩니다.
        </p>

        {openTermsType && (
          <TermsModal type={openTermsType} onClose={() => setOpenTermsType(null)} />
        )}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- src/pages/LoginPage.test.jsx`
Expected: PASS (전체 파일, 기존 테스트 포함)

- [ ] **Step 6: 커밋**

```bash
git add src/pages/LoginPage.jsx src/pages/LoginPage.test.jsx src/styles/AuthPage.css
git commit -m "feat: 로그인 페이지에 구글 로그인 약관 동의 간주 안내 문구 추가"
```

---

### Task 6: MyPage 동의 현황 카드 (+ 최종 전체 검증)

**Files:**
- Modify: `src/pages/MyPage.jsx`
- Create: `src/pages/MyPage.test.jsx` (기존 테스트 파일 없음 — 새로 만들되 이번에 추가하는 동의 현황 카드만 다룬다. 기존 프로필/비밀번호/게시글 기능에 대한 테스트 백필은 이 태스크의 범위 밖)
- Modify: `src/styles/MyPage.css`

**Interfaces:**
- Consumes: `getMyConsents()`, `updateMarketingConsent(agreed)` (Task 1)
- Produces: 없음 (플랜의 마지막 태스크)

- [ ] **Step 1: 동의 현황 스타일 추가**

`src/styles/MyPage.css` 파일 끝에 추가:

```css
.mypage-consent-list { display: flex; flex-direction: column; }
.mypage-consent-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f2f4f7; font-size: 13px; }
.mypage-consent-row:last-child { border-bottom: none; }
.mypage-consent-meta { display: block; color: #9ca3af; font-size: 11px; margin-top: 2px; }
.mypage-consent-badge { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.mypage-consent-badge.agreed { background: #ecfdf3; color: #16a34a; }
.mypage-consent-badge.not-agreed { background: #f3f4f6; color: #6b7280; }

.mypage-toggle { position: relative; display: inline-block; width: 36px; height: 20px; }
.mypage-toggle input { position: absolute; opacity: 0; width: 100%; height: 100%; margin: 0; cursor: pointer; }
.mypage-toggle-slider { position: absolute; inset: 0; background: #d1d5db; border-radius: 10px; transition: background .15s; }
.mypage-toggle-slider::before { content: ''; position: absolute; left: 2px; top: 2px; width: 16px; height: 16px; background: #fff; border-radius: 50%; transition: transform .15s; }
.mypage-toggle input:checked + .mypage-toggle-slider { background: #0f766e; }
.mypage-toggle input:checked + .mypage-toggle-slider::before { transform: translateX(16px); }
.mypage-toggle input:disabled + .mypage-toggle-slider { opacity: .5; cursor: not-allowed; }
```

- [ ] **Step 2: 실패하는 테스트 작성**

`src/pages/MyPage.test.jsx` 새 파일:

```jsx
import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import MyPage from './MyPage';
import { getMyProfile, getMyBoards, getMyConsents, updateMarketingConsent } from '../api/myPageApi';

vi.mock('../api/myPageApi');
vi.mock('../components/Layout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

const mockLogout = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ logout: mockLogout }),
}));

const renderMyPage = () =>
  render(
    <MemoryRouter>
      <MyPage />
    </MemoryRouter>
  );

const baseProfile = {
  loginId: 'tester01', email: 'user@example.com', name: '홍길동',
  provider: 'LOCAL', createdAt: '2026-01-01T00:00:00',
};

const baseConsents = [
  { type: 'TERMS', agreed: true, version: '1.0', agreedAt: '2026-07-16T12:00:00' },
  { type: 'PRIVACY', agreed: true, version: '1.0', agreedAt: '2026-07-16T12:00:00' },
  { type: 'MARKETING', agreed: false, version: '1.0', agreedAt: '2026-07-16T12:00:00' },
];

beforeEach(() => {
  vi.clearAllMocks();
  getMyBoards.mockResolvedValue([]);
});

test('약관 동의 현황 3개 항목을 표시한다', async () => {
  getMyProfile.mockResolvedValue(baseProfile);
  getMyConsents.mockResolvedValue(baseConsents);
  renderMyPage();

  await waitFor(() => expect(screen.getByText('약관 동의 현황')).toBeInTheDocument());
  expect(screen.getByText('이용약관')).toBeInTheDocument();
  expect(screen.getByText('개인정보 수집·이용')).toBeInTheDocument();
  expect(screen.getByText('마케팅 정보 수신')).toBeInTheDocument();
  expect(screen.getAllByText('동의함')).toHaveLength(2);
});

test('동의 기록이 null이면 동의 기록 없음을 표시한다', async () => {
  getMyProfile.mockResolvedValue(baseProfile);
  getMyConsents.mockResolvedValue([
    { type: 'TERMS', agreed: null, version: null, agreedAt: null },
    { type: 'PRIVACY', agreed: null, version: null, agreedAt: null },
    { type: 'MARKETING', agreed: null, version: null, agreedAt: null },
  ]);
  renderMyPage();

  await waitFor(() => expect(screen.getAllByText('동의 기록 없음')).toHaveLength(3));
});

test('동의 현황 조회가 실패해도 프로필은 정상 표시된다', async () => {
  getMyProfile.mockResolvedValue(baseProfile);
  getMyConsents.mockRejectedValue({ response: { status: 500 } });
  renderMyPage();

  await waitFor(() => expect(screen.getByText('동의 현황을 불러오지 못했습니다.')).toBeInTheDocument());
  expect(screen.getByDisplayValue('tester01')).toBeInTheDocument();
});

test('마케팅 수신 동의 토글을 켜면 API를 호출하고 상태가 갱신된다', async () => {
  getMyProfile.mockResolvedValue(baseProfile);
  getMyConsents.mockResolvedValue(baseConsents);
  updateMarketingConsent.mockResolvedValue({
    type: 'MARKETING', agreed: true, version: '1.0', agreedAt: '2026-07-17T00:00:00',
  });
  renderMyPage();

  await waitFor(() => expect(screen.getByText('마케팅 정보 수신')).toBeInTheDocument());
  const toggle = screen.getByRole('checkbox', { name: '마케팅 정보 수신 동의 토글' });
  await userEvent.click(toggle);

  await waitFor(() => expect(updateMarketingConsent).toHaveBeenCalledWith(true));
  await waitFor(() => expect(toggle).toBeChecked());
});

test('마케팅 수신 동의 토글 실패 시 원래 상태로 되돌린다', async () => {
  getMyProfile.mockResolvedValue(baseProfile);
  getMyConsents.mockResolvedValue(baseConsents);
  updateMarketingConsent.mockRejectedValue({ response: { status: 500 } });
  renderMyPage();

  await waitFor(() => expect(screen.getByText('마케팅 정보 수신')).toBeInTheDocument());
  const toggle = screen.getByRole('checkbox', { name: '마케팅 정보 수신 동의 토글' });
  await userEvent.click(toggle);

  await waitFor(() =>
    expect(screen.getByText('마케팅 수신 동의 변경에 실패했습니다.')).toBeInTheDocument()
  );
  expect(toggle).not.toBeChecked();
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -- src/pages/MyPage.test.jsx`
Expected: FAIL — "약관 동의 현황" 텍스트를 찾지 못함

- [ ] **Step 4: MyPage에 동의 현황 카드 추가**

`src/pages/MyPage.jsx` import에 추가:

```js
import {
  changeMyPassword, getMyBoards, getMyConsents, getMyProfile, updateMarketingConsent, updateMyProfile,
} from '../api/myPageApi';
```

(기존 `import { changeMyPassword, getMyBoards, getMyProfile, updateMyProfile } from '../api/myPageApi';` 줄을 통째로 교체)

`formatDate` 함수 다음에 상수 추가:

```js
const CONSENT_LABELS = { TERMS: '이용약관', PRIVACY: '개인정보 수집·이용', MARKETING: '마케팅 정보 수신' };
```

`const [message, setMessage] = useState({ type: '', text: '' });` 다음에 상태 추가:

```js
  const [consents, setConsents] = useState(null);
  const [consentsError, setConsentsError] = useState('');
  const [marketingSaving, setMarketingSaving] = useState(false);
```

`useEffect`의 `loadMyPage` 함수를 다음으로 교체:

```js
    const loadMyPage = async () => {
      try {
        const [profileData, boardData] = await Promise.all([getMyProfile(), getMyBoards()]);
        setProfile(profileData);
        setName(profileData.name);
        setBoards(boardData);
      } catch (error) {
        setMessage({ type: 'error', text: getErrorMessage(error, '마이페이지를 불러오지 못했습니다.') });
      } finally {
        setLoading(false);
      }

      try {
        const consentData = await getMyConsents();
        setConsents(consentData);
      } catch {
        setConsentsError('동의 현황을 불러오지 못했습니다.');
      }
    };
```

`savePassword` 함수 다음에 핸들러 추가:

```js
  const handleToggleMarketing = async (currentAgreed) => {
    const next = !currentAgreed;
    setMarketingSaving(true);
    setConsents((prev) => prev.map((c) => (c.type === 'MARKETING' ? { ...c, agreed: next } : c)));
    try {
      const updated = await updateMarketingConsent(next);
      setConsents((prev) => prev.map((c) => (c.type === 'MARKETING' ? updated : c)));
    } catch (error) {
      setConsents((prev) => prev.map((c) => (c.type === 'MARKETING' ? { ...c, agreed: currentAgreed } : c)));
      setMessage({ type: 'error', text: getErrorMessage(error, '마케팅 수신 동의 변경에 실패했습니다.') });
    } finally {
      setMarketingSaving(false);
    }
  };
```

`<section className="mypage-card">`로 시작하는 "비밀번호 변경" 섹션의 닫는 `</section>` 다음, "내가 쓴 글" 섹션(`<section className="mypage-card mypage-activity">`) 이전에 추가:

```jsx
            <section className="mypage-card">
              <div className="mypage-card-title"><h2>약관 동의 현황</h2></div>
              {consentsError && <div className="mypage-state">{consentsError}</div>}
              {consents && (
                <div className="mypage-consent-list">
                  {consents.map((item) => (
                    <div key={item.type} className="mypage-consent-row">
                      <div>
                        <span>{CONSENT_LABELS[item.type]}</span>
                        {item.agreed === null ? (
                          <span className="mypage-consent-meta">동의 기록 없음</span>
                        ) : (
                          <span className="mypage-consent-meta">v{item.version} · {formatDate(item.agreedAt)}</span>
                        )}
                      </div>
                      {item.type === 'MARKETING' ? (
                        <label className="mypage-toggle">
                          <input
                            type="checkbox"
                            aria-label="마케팅 정보 수신 동의 토글"
                            checked={!!item.agreed}
                            disabled={marketingSaving}
                            onChange={() => handleToggleMarketing(item.agreed)}
                          />
                          <span className="mypage-toggle-slider" />
                        </label>
                      ) : (
                        <span className={`mypage-consent-badge ${item.agreed ? 'agreed' : 'not-agreed'}`}>
                          {item.agreed ? '동의함' : '미동의'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- src/pages/MyPage.test.jsx`
Expected: PASS (5개 테스트 모두)

- [ ] **Step 6: 전체 테스트 + 빌드 확인**

Run: `npm test`
Expected: 전체 PASS (기존 테스트 + 이번 플랜에서 추가된 모든 테스트)

Run: `npm run build`
Expected: 에러 없이 빌드 성공

- [ ] **Step 7: 커밋**

```bash
git add src/pages/MyPage.jsx src/pages/MyPage.test.jsx src/styles/MyPage.css
git commit -m "feat: 마이페이지에 약관 동의 현황 카드와 마케팅 동의 토글 추가"
```

---

## 구현 후 참고 (별도 태스크 아님)

- 실제 약관 본문(마크다운)이 백엔드에 등록돼 있어야 `TermsModal`/`TermsPage`가 의미 있는 내용을 보여준다. 로컬에서 확인할 땐 `docs/API_REFERENCE.md` 기준으로 백엔드 `feat/login` 브랜치가 떠 있어야 함.
- 마케팅 동의 토글의 실제 API 응답 형태(특히 `agreed`가 boolean으로 정확히 오는지)는 백엔드 연동 후 한 번 실기 확인 권장.
- `/terms/privacy`를 브라우저에서 열어 긴 본문이 실제로 스크롤되는지 확인할 것 — `TermsPage` 테스트는 `Layout`을 mock하므로 `.main-content`(`overflow: hidden`)와의 상호작용은 테스트로 검증되지 않는다.
