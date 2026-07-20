# 회원탈퇴 프론트엔드 연동 설계

## 배경

컴플라이언스 요건에 따라 회원탈퇴(계정 삭제) API가 백엔드에 구현되었다(`feat/login` 브랜치, `docs/API_REFERENCE.md` 18번). 프론트에 마이페이지 회원탈퇴 UI를 추가한다.

## 백엔드 API 레퍼런스

| # | 기능 | Method / Path | Request Body | 비고 |
|---|------|---------------|---------------|------|
| 18 | 회원탈퇴 | `POST /users/me/withdrawal` (인증 필요) | LOCAL: `{ password }` / GOOGLE: `{}` | 성공 200, 모든 개인정보 즉시 완전 삭제(복구 불가). 실패: `401`(LOCAL 비밀번호 불일치), `404`(유저 없음) |

참고사항(구현에 직접 영향 없음, 문맥용):
- 탈퇴해도 작성 글/댓글은 남고 작성자 표시만 "탈퇴한 사용자"로 바뀜(백엔드가 내려주는 값이 그대로 바뀌는 것이라 프론트 별도 처리 불필요)
- 탈퇴 직후 같은 이메일로 재가입 가능(신규 계정, 이전 활동과 무관) — 프론트 영향 없음

## 범위

- 마이페이지에 "회원탈퇴" 카드/버튼 추가
- LOCAL/GOOGLE 계정에 따라 다른 확인 모달(`WithdrawalModal`, 신규 공용 컴포넌트)
- 탈퇴 성공 시 로컬 세션 정리 + `/login`으로 이동 + 안내 메시지
- 실패 시 에러 메시지 표시(모달 유지)

## 핵심 설계 이슈: 탈퇴 후 서버 로그아웃 API를 호출하면 안 됨

기존 `AuthContext.logout()`은 `authApi.logout(refreshToken)`(`POST /auth/logout`)을 먼저 호출한 뒤 로컬 세션을 정리한다. 탈퇴 성공 직후 이 함수를 재사용하면 문제가 생긴다:

- 계정이 이미 삭제된 상태라 `/auth/logout` 호출이 401을 반환한다.
- `src/api/axiosInstance.js`의 `NO_REFRESH_URLS`에는 `/auth/login`, `/auth/token/refresh`만 있고 `/auth/logout`은 빠져 있어서, 이 401에 대해 인터셉터가 자동으로 `/auth/token/refresh`를 재시도한다.
- refresh도 실패하면(토큰이 이미 무효화된 상태) 인터셉터가 `setAuthExpiredMessage()` + `window.location.href = '/login'`로 **하드 리다이렉트**를 걸어버린다.
- 이게 `WithdrawalModal`이 하려던 `navigate('/login', { state: { message: '회원탈퇴가 완료되었습니다.' } })`보다 먼저 실행되거나 경합해서, "회원탈퇴가 완료되었습니다" 대신 "로그인이 만료되었습니다" 메시지가 잘못 노출될 수 있다.

**해결**: 탈퇴 성공 후에는 서버 로그아웃 API를 호출하지 않는다. `AuthContext`에 로컬 세션만 정리하는 가벼운 메서드를 새로 추가해서 사용한다.

```js
// AuthContext.jsx에 추가
const clearLocalSession = useCallback(() => {
  clearSession();
  setLoginId(null);
  setRole(null);
}, []);
```

`clearSession()`만 단독으로 호출하면 `tokenStorage`(localStorage/sessionStorage)는 정리되지만 `AuthContext`의 리액트 상태(`loginId`, `role`)는 그대로 남아, `/login`으로 이동한 뒤에도 헤더가 "로그인됨" 상태로 잘못 표시될 수 있다 — 그래서 반드시 컨텍스트 상태까지 함께 리셋하는 전용 함수가 필요하다.

## 아키텍처

### API (`src/api/myPageApi.js`에 함수 추가)

```js
export const withdraw = async (password) => {
  const body = password !== undefined ? { password } : {};
  const { data } = await instance.post('/users/me/withdrawal', body);
  return data;
};
```

- LOCAL 계정: `withdraw(password)` — `{ password }` 전송
- GOOGLE 계정: `withdraw()` (인자 없음) — `{}` 전송

### `AuthContext.jsx` 변경

- `clearLocalSession()` 추가(위 참고), context value에 포함

### `WithdrawalModal` 컴포넌트 (신규, `src/components/WithdrawalModal.jsx`)

기존 `.modal-overlay`/`.modal-box` 패턴 재사용(`PasswordResetSuccessModal`, `TermsModal`과 동일 CSS 클래스).

Props: `provider`('LOCAL'|'GOOGLE'), `onClose`

- **LOCAL**: "탈퇴하려면 비밀번호를 입력하세요" + 비밀번호 입력창(`type="password"`). 비어있으면 "탈퇴하기" 버튼 비활성화.
- **GOOGLE**: "정말 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다" 확인 문구만, 입력창 없음.
- 공통: "취소"(`onClose` 호출) + "탈퇴하기" 버튼. 오버레이 클릭 시에도 닫힘(`TermsModal`과 동일 패턴).
- "탈퇴하기" 클릭 시:
  1. `withdraw(provider === 'LOCAL' ? password : undefined)` 호출
  2. 성공 → `auth.clearLocalSession()` 호출(서버 로그아웃 API는 호출하지 않음) → `navigate('/login', { state: { message: '회원탈퇴가 완료되었습니다.' } })`
  3. 실패 → `err.response?.data?.message`를 모달 안에 에러로 표시, 모달은 닫지 않음(재시도 가능)
- 요청 중(`isSubmitting`)에는 "탈퇴하기"/"취소" 버튼 모두 비활성화(중복 제출 방지)

### `MyPage.jsx` 변경

- 카드 그리드 맨 아래에 "회원탈퇴" 전용 카드 추가: 경고 문구("탈퇴 시 모든 개인정보가 즉시 삭제되며 되돌릴 수 없습니다.") + 버튼.
- 버튼 클릭 시 `showWithdrawalModal` 상태를 켜고 `<WithdrawalModal provider={profile.provider} onClose={...} />` 렌더.

### 스타일 (구체 클래스명)

`src/styles/MyPage.css`에 추가:
- `.mypage-danger-button` — 배경 `#dc2626`(기존 `.auth-error` 텍스트 색과 동일 계열의 위험색), 흰 글씨. `.mypage-primary`와 레이아웃(padding/radius/font-weight)은 동일하게 맞추되 배경색만 다르게(실수로 다른 카드 버튼과 헷갈리지 않도록).

`src/styles/AuthPage.css`에 추가(모달 내부 버튼 2개 나란히 배치용, `TermsModal`에는 없던 레이아웃):
- `.modal-actions` — `display:flex; gap:12px; justify-content:center; margin-top:4px;`
- `.modal-actions .auth-submit` — `width:auto; padding:10px 32px;`(기존 `.modal-box .auth-submit`과 동일 규칙, `.modal-actions` 안에서도 적용되도록)

## 테스트 관점

- `myPageApi.withdraw`: LOCAL(`{password}` 전송)/GOOGLE(`{}` 전송) 각각 올바른 엔드포인트·바디로 호출되는지
- `AuthContext.clearLocalSession`: 호출 시 `loginId`/`role`이 리셋되고 `tokenStorage`가 정리되는지, **`authApi.logout`은 호출되지 않는지**(핵심 회귀 방지 포인트)
- `WithdrawalModal`:
  - LOCAL: 비밀번호 미입력 시 버튼 비활성화, 성공 시 `clearLocalSession` 호출 후 `/login`으로 정확한 메시지와 함께 이동, 실패(401) 시 에러 메시지 표시하고 모달 유지, 이 과정에서 `authApi.logout`이 호출되지 않는지
  - GOOGLE: 비밀번호 입력창이 없는지, 성공 시 `withdraw()`가 인자 없이 호출되는지
  - 취소 버튼/오버레이 클릭 시 `onClose` 호출
- `MyPage`: 회원탈퇴 버튼 클릭 시 모달이 뜨고 `profile.provider`가 올바르게 전달되는지
