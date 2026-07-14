# 로그인/회원가입 프론트엔드 연동 설계

## 배경

백엔드(Spring Boot)에 JWT 기반 로그인/회원가입 API가 Phase 1로 구현되어 있다. 현재 프론트엔드는 React 19 + Vite 구조로, 라우터·HTTP 클라이언트·인증 상태 관리가 전혀 없는 상태(MainPage 하나만 존재, `/api` 프록시로 백엔드 연결)다. 이 스펙은 로그인/회원가입 화면과 그에 필요한 인증 상태 관리 계층을 추가하는 것을 다룬다.

## 백엔드 API 레퍼런스 (Phase 1)

- Base URL: `http://localhost:8080/api` (dev 프록시 `/api` 경유)
- 인증 방식: JWT (세션/쿠키 아님). 로그인 성공 시 `accessToken`/`refreshToken`을 응답 body로 받음.
- 모든 응답 공통 포맷: `{ "success": true/false, "message": "...", "data": {...} }`

| # | 기능 | Method / Path | Request Body | 비고 |
|---|------|---------------|---------------|------|
| 1 | 아이디 중복확인 | `GET /auth/check-login-id?value={아이디}` | - | `data.available: boolean` |
| 2 | 이메일 인증코드 발송 | `POST /auth/email/send-code` | `{ email }` | 429 `EMAIL_CODE_COOLDOWN`(1분 쿨다운), 코드 5분 유효, 5회 실패 시 무효화 |
| 3 | 이메일 인증코드 확인 | `POST /auth/email/verify-code` | `{ email, code }` | 성공 시 인증완료 플래그 30분 유지. 400 `INVALID_VERIFICATION_CODE` |
| 4 | 회원가입 | `POST /auth/signup` | `{ loginId, email, password, name }` | 201 성공. 400 `EMAIL_VERIFICATION_REQUIRED`, 409 `DUPLICATE_LOGIN_ID`/`DUPLICATE_EMAIL` |
| 5 | 로그인 | `POST /auth/login` | `{ loginId, password, rememberMe }` | `data: { accessToken, refreshToken }`. 401 `INVALID_CREDENTIALS`. `rememberMe=true`면 refreshToken 14일, false면 세션성 |
| 6 | 토큰 재발급 | `POST /auth/token/refresh` | `{ refreshToken }` | `data: { accessToken, refreshToken }` (재사용 불가, 매번 교체 저장). 401 `INVALID_REFRESH_TOKEN` |
| 7 | 로그아웃 | `POST /auth/logout` | `{ refreshToken }` | 무효 토큰이어도 200 |

검증 규칙(가정): `loginId` 4~20자, `password` 8~50자, `email` 형식, 전부 필수. `@Valid` 실패 시 `data`에 `{필드명: 메시지}` 형태로 들어옴.

## 범위

- 로그인 페이지, 회원가입 페이지(이메일 인증 포함) 구현
- 토큰 저장 및 자동 갱신(axios 인터셉터)까지 포함
- 라우팅 도입(react-router-dom), 헤더의 로그인 상태 표시까지 포함
- 회원정보 수정, 비밀번호 찾기 등은 범위 밖(다음 Phase)

## 아키텍처

- **의존성 추가**: `react-router-dom`, `axios`
- **라우팅**: `App.jsx`에 `BrowserRouter` 도입. 경로: `/`(MainPage), `/login`(LoginPage), `/signup`(SignupPage)
- **인증 상태**: `src/context/AuthContext.jsx`
  - `accessToken`은 React state(메모리)에만 보관 — 새로고침 시 사라짐
  - `refreshToken`은 로그인 시 `rememberMe` 여부에 따라 `localStorage`(true) 또는 `sessionStorage`(false)에 저장
  - 앱 부팅 시 `AuthProvider`가 localStorage → sessionStorage 순으로 refreshToken 존재 여부 확인 → 있으면 `/auth/token/refresh` 호출해 로그인 상태 복원, 실패 시 비로그인 상태로 시작
  - `login(tokens, rememberMe)`, `logout()`, `user` 등 필요한 값/함수를 Context로 제공
- **API 계층**
  - `src/api/axiosInstance.js`: `baseURL: '/api'`인 axios 인스턴스
    - 요청 인터셉터: accessToken 있으면 `Authorization: Bearer {token}` 자동 첨부
    - 응답 인터셉터: 401 + 미재시도 요청이면 `/auth/token/refresh` 호출 → 성공 시 토큰 교체 후 원요청 재시도, 실패 시 로그아웃 처리(토큰 삭제 + `/login`으로 이동)
  - `src/api/authApi.js`: 위 axios 인스턴스를 사용하는 엔드포인트별 함수 (`checkLoginId`, `sendEmailCode`, `verifyEmailCode`, `signup`, `login`, `refreshToken`, `logout`)

## 회원가입 페이지 (SignupPage)

필드: 아이디(loginId), 이메일, 비밀번호, 비밀번호 확인, 이름

흐름:
1. 이메일 입력 → "인증코드 발송" 버튼(`sendEmailCode`) — 429 쿨다운 시 안내 메시지 표시
2. 인증코드 입력 → "확인" 버튼(`verifyEmailCode`) → 성공 시 이메일 인증 완료 상태로 전환
3. 아이디 입력 시 "중복확인" 버튼(`checkLoginId`)
4. 비밀번호/비밀번호 확인은 프론트에서 일치 여부만 검증
5. 이메일 인증 완료 + 아이디 중복확인 통과해야 "가입하기" 버튼 활성화
6. 제출(`signup`) 성공 시 로그인 페이지로 이동(가입 완료 안내 메시지 포함)
7. 프론트 검증: loginId 4~20자, password 8~50자, email 형식. 백엔드 에러(`DUPLICATE_LOGIN_ID`, `DUPLICATE_EMAIL`, `EMAIL_VERIFICATION_REQUIRED` 등)는 그대로 화면에 표시

## 로그인 페이지 (LoginPage)

- 필드: 아이디, 비밀번호, "로그인 상태 유지"(rememberMe) 체크박스
- 제출(`login`) 성공 시 accessToken은 AuthContext에, refreshToken은 rememberMe 여부에 따라 localStorage/sessionStorage에 저장 후 `/`로 이동
- 실패(401 `INVALID_CREDENTIALS`) 시 "아이디 또는 비밀번호가 일치하지 않습니다." 공통 에러 메시지 표시(필드 구분 없음)

## 헤더 로그인 상태 표시 (MainPage)

- `AuthContext` 참조하여 로그인 상태면 "닉네임 / 로그아웃" 표시, 비로그인이면 "로그인 / 회원가입" 링크(현재 `<a href>`로 되어있는 것을 `react-router-dom`의 `<Link>`로 교체)
- "로그아웃" 클릭 시 `logout` API 호출 후 토큰 삭제 및 상태 초기화

## 에러 메시지 매핑

| 상황 | HTTP | 메시지 |
|------|------|--------|
| 아이디 중복 | 409 | 이미 사용 중인 아이디입니다. |
| 이메일 중복 | 409 | 이미 가입된 이메일입니다. |
| 이메일 인증 안 됨 | 400 | 이메일 인증이 필요합니다. |
| 인증번호 불일치/만료/시도초과 | 400 | 인증번호가 일치하지 않거나 만료되었습니다. |
| 인증코드 재발송 쿨다운 | 429 | 잠시 후 다시 시도해주세요. |
| 로그인 실패 | 401 | 아이디 또는 비밀번호가 일치하지 않습니다. |
| 리프레시 토큰 무효/만료 | 401 | 로그인이 만료되었습니다. 다시 로그인해주세요. |
| 입력값 검증 실패 | 400 | 필드별 메시지(`data`에 `{필드명: 메시지}`) |

## 테스트 관점

- AuthContext: 토큰 저장/복원(rememberMe true/false), 로그아웃 시 상태 초기화
- axios 인터셉터: 401 발생 시 refresh 후 재시도되는지, refresh 실패 시 로그아웃되는지
- SignupPage: 이메일 인증 전에는 가입 버튼 비활성, 각 백엔드 에러 코드별 메시지 노출
- LoginPage: rememberMe 체크 여부에 따라 토큰이 올바른 스토리지에 저장되는지
