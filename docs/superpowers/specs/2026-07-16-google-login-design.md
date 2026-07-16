# 구글 로그인 연동 설계

## 배경

백엔드에 구글 OAuth 로그인 API가 추가되었다(Phase 1 로그인/회원가입: `docs/superpowers/specs/2026-07-14-login-signup-design.md`, Phase 2 아이디/비밀번호 찾기: `docs/superpowers/specs/2026-07-15-find-id-password-design.md`에서는 "범위 밖"으로 명시했던 기능). 이 스펙은 `LoginPage`에 "Google로 계속하기" 버튼을 추가하고, 구글 동의화면 왕복 후 로그인을 완료하는 흐름을 다룬다.

## 백엔드 API 레퍼런스

| # | 기능 | Method / Path | Request Body | 비고 |
|---|------|---------------|---------------|------|
| 14 | 구글 로그인 | `POST /auth/google/login` | `{ code, redirectUri }` | 응답: `{ data: { accessToken, refreshToken } }` — 일반 로그인과 동일 포맷. 신규 이메일이면 내부적으로 자동 회원가입(구글 계정은 loginId/password 없음 — 아이디/비밀번호 찾기 대상 아님). 항상 "로그인상태유지"로 처리되어 refreshToken은 14일짜리. 실패: `EMAIL_ALREADY_REGISTERED_AS_LOCAL`(409) — 같은 이메일로 이미 일반 가입된 계정 존재(자동 연동 안 함). `GOOGLE_AUTH_FAILED`(502) — code 만료/재사용 또는 구글 API 통신 실패 |

연동 절차:
1. "Google로 계속하기" 클릭 → 프론트가 직접 `https://accounts.google.com/o/oauth2/v2/auth`로 리다이렉트 (`client_id`, `redirect_uri`, `response_type=code`, `scope=openid email profile`)
2. 구글 인증 후 위 `redirect_uri`로 `code` 파라미터를 붙여 리다이렉트 → 콜백 페이지에서 `code` 읽음
3. `code`와 1번에서 쓴 것과 **정확히 동일한** `redirectUri`를 `POST /auth/google/login`으로 전달

## 범위

- `LoginPage`에 구글 로그인 버튼 추가 (SignupPage는 대상 아님 — 구글 로그인이 신규/기존 계정을 모두 처리하므로 별도 가입 버튼 불필요)
- 신규 라우트 `/oauth/google/callback` 페이지 구현
- Google Cloud Console 클라이언트 ID 발급/등록은 범위 밖(사용자가 이미 클라이언트 ID를 발급받음: 로컬값은 `.env.local`에 저장, 배포 도메인 리디렉션 URI 등록은 별도 진행 필요)
- 백엔드 `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` 실 설정 여부는 범위 밖(더미값이면 실제 로그인은 안 되지만 프론트 코드는 완성)

## 아키텍처

### 환경변수

- `VITE_GOOGLE_CLIENT_ID`: `.env.local`(gitignore 대상, 이미 `*.local` 패턴 있음)에 실제 값 저장, `.env.example`에 변수명만 문서화.

### `src/auth/googleOAuth.js` (신규)

```
buildGoogleRedirectUri() → string
buildGoogleAuthUrl() → string
```
- `buildGoogleRedirectUri()`: `${window.location.origin}/oauth/google/callback`을 반환(로컬/배포 어디서든 자동으로 맞는 값이 나옴 — 별도 저장/전달 불필요). `LoginPage`와 `GoogleCallbackPage` 양쪽에서 이 함수로 동일한 값을 재계산해서 씀
- `buildGoogleAuthUrl()`: `buildGoogleRedirectUri()`를 사용해 `client_id=VITE_GOOGLE_CLIENT_ID`, `redirect_uri`, `response_type=code`, `scope=openid email profile`를 쿼리스트링으로 붙인 `https://accounts.google.com/o/oauth2/v2/auth` URL 반환

### `src/api/authApi.js`

```
googleLogin({ code, redirectUri }) → POST /auth/google/login
```
기존 함수들과 동일한 패턴(axiosInstance 사용, `response.data` 반환).

### 라우팅

`/oauth/google/callback` 라우트 추가 (`App.jsx`), `GoogleCallbackPage` 컴포넌트 연결.

### `LoginPage` 변경

- 기존 폼 아래 구분선 + "Google로 계속하기" 버튼(`type="button"`) 추가
- 클릭 시 `window.location.href = buildGoogleAuthUrl()` (SPA 라우팅이 아닌 하드 리다이렉트)

### `GoogleCallbackPage` (`/oauth/google/callback`, 신규)

- 마운트 시 URL 쿼리스트링에서 `code` 파싱
  - `code`가 없으면 즉시 실패 처리(아래 에러 처리와 동일하게 `/login`으로 리다이렉트)
- `code`가 있으면 `googleLogin({ code, redirectUri: buildGoogleRedirectUri() })` 호출
  - 성공: 응답의 `{ accessToken, refreshToken }`을 임시로 `setAccessToken`에 반영한 뒤 `myPageApi.getMyProfile()`을 호출해 `loginId`를 조회하고, `auth.login(tokens, loginId, true)`로 세션 저장(항상 `rememberMe=true`) → `/`로 이동
  - 실패(409 `EMAIL_ALREADY_REGISTERED_AS_LOCAL`): `/login`으로 리다이렉트, `state: { message: '이미 일반 회원가입된 이메일입니다. 일반 로그인을 이용해주세요.' }`
  - 실패(502 `GOOGLE_AUTH_FAILED`) 또는 그 외 에러: `/login`으로 리다이렉트, `state: { message: '구글 로그인에 실패했습니다. 다시 시도해주세요.' }`
- 처리 중에는 "로그인 처리 중..." 텍스트만 표시(폼 없음, 사용자 조작 불필요)

## 테스트 관점

- `googleOAuth.js`: 생성된 URL에 `client_id`, `redirect_uri`(현재 origin 기준), `response_type=code`, `scope=openid email profile`이 올바르게 포함되는지
- `authApi`: `googleLogin`이 올바른 엔드포인트/파라미터로 호출되는지
- `GoogleCallbackPage`:
  - 성공 시 `getMyProfile` 호출 → `auth.login` 호출 → `/`로 이동
  - `code` 파라미터 없을 때 `/login`으로 리다이렉트
  - 409 응답 시 해당 메시지와 함께 `/login`으로 리다이렉트
  - 502(또는 기타) 응답 시 일반 실패 메시지와 함께 `/login`으로 리다이렉트
- `LoginPage`: 구글 버튼 클릭 시 `window.location.href`가 `buildGoogleAuthUrl()` 결과로 설정되는지
