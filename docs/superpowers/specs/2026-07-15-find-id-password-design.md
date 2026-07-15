# 아이디 찾기 / 비밀번호 찾기 프론트엔드 연동 설계

## 배경

백엔드(Spring Boot)에 아이디 찾기·비밀번호 찾기/재설정 API가 Phase 2로 추가 구현되었다(기존 로그인/회원가입 Phase 1 스펙: `docs/superpowers/specs/2026-07-14-login-signup-design.md`). 현재 `LoginPage`에는 "아이디 찾기"/"비밀번호 찾기" 링크가 UI만 있고 기능이 없는 상태(placeholder)다. 이 스펙은 그 두 기능을 실제로 구현하는 것을 다룬다.

## 백엔드 API 레퍼런스 (Phase 2 추가분)

Base URL, 인증 방식, 공통 응답 포맷은 Phase 1 스펙과 동일.

| # | 기능 | Method / Path | Request Body | 비고 |
|---|------|---------------|---------------|------|
| 8 | 아이디 찾기 - 인증코드 발송 | `POST /auth/find-id/send-code` | `{ email }` | 실패: `USER_NOT_FOUND`(404) — 미가입 이메일 또는 구글 로그인 계정. 회원가입용 이메일 인증(Phase 1 #2)과 같은 Redis 키/쿨다운/시도제한 공유 |
| 9 | 아이디 찾기 - 인증코드 확인 | `POST /auth/find-id/verify-code` | `{ email, code }` | 성공: `{ data: { loginId, maskedLoginId, createdAt } }`. **실제 loginId도 함께 내려주도록 백엔드에 확인 완료** — 화면에는 `maskedLoginId`만 표시하고, 실제 `loginId`는 화면에 렌더링하지 않되 프론트 상태(state)에 보관해 "비밀번호 재설정" 이동 시 파라미터로 사용. 성공 시 "본인인증 완료" 상태가 되며 10번(비밀번호 재설정 경유) API에서도 인정됨. 실패: `INVALID_VERIFICATION_CODE`(400) |
| 10 | 비밀번호 찾기 - 인증코드 발송 | `POST /auth/password/send-code` | `{ loginId, email }` | 실패: `USER_NOT_FOUND`(404) — 아이디 없음 또는 아이디-이메일 불일치(구분 안 함, 보안 의도) |
| 11 | 비밀번호 찾기 - 인증코드 확인 | `POST /auth/password/verify-code` | `{ loginId, email, code }` | 성공 시 "본인인증 완료" 상태로 전환(10분 유지). 실패: `USER_NOT_FOUND`(404) 또는 `INVALID_VERIFICATION_CODE`(400) |
| 12 | 비밀번호 재설정 - 인증 상태 확인 | `GET /auth/password/verification-status?loginId={아이디}` | - | `{ data: { verified: boolean } }`. 아이디 찾기 경유 시 재설정 화면 진입 직후 이 API로 먼저 확인 |
| 13 | 비밀번호 재설정 | `POST /auth/password/reset` | `{ loginId, newPassword }` | 성공 시 해당 계정의 기존 refreshToken 전부 무효화(재로그인 필요). 실패: `IDENTITY_NOT_VERIFIED`(403) — 9번/11번 인증 안 하고 호출 시. **검증 규칙: 회원가입과 동일하게 8~16자, 영문/숫자/특수문자 포함** (문서상 "8~50자"로만 적혀 있었으나 회원가입 규칙과 통일하기로 확인함) |

에러 메시지(신규분):

| 상황 | HTTP | 메시지 |
|------|------|--------|
| 회원 정보 없음 (아이디/비번찾기) | 404 | 일치하는 회원 정보를 찾을 수 없습니다. |
| 본인인증 안 됨 (비밀번호 재설정) | 403 | 본인 인증이 필요합니다. |

기존 에러 메시지(인증코드 쿨다운 429, 인증번호 불일치 400 등)는 Phase 1과 동일하게 재사용.

## 범위

- 아이디 찾기(`/find-id` → `/show-id`), 비밀번호 찾기(`/find-password`, `/reset-password`) 4개 페이지 신규 구현
- `LoginPage`의 placeholder 링크를 실제 라우트로 연결, `location.state`로 넘어온 loginId 자동 채움 지원
- 관리자 기능, 구글 로그인은 범위 밖(백엔드에서도 미구현, "다음 Phase 예정")

## 아키텍처

### API 계층 (`src/api/authApi.js`에 함수 추가)

```
sendFindIdCode(email)                          → POST /auth/find-id/send-code
verifyFindIdCode(email, code)                  → POST /auth/find-id/verify-code
sendFindPasswordCode(loginId, email)           → POST /auth/password/send-code
verifyFindPasswordCode(loginId, email, code)   → POST /auth/password/verify-code
getPasswordResetStatus(loginId)                → GET  /auth/password/verification-status
resetPassword(loginId, newPassword)            → POST /auth/password/reset
```
기존 함수들과 동일한 패턴(axiosInstance 사용, `response.data` 반환).

### 라우팅

`/find-id`, `/show-id`, `/find-password`, `/reset-password` 4개 라우트 추가 (`App.jsx`).

### 공용 요소

- **비밀번호 검증**: 8~16자 + 영문/숫자/특수문자 포함. 회원가입(`SignupPage`)과 동일한 정규식 검증 로직 사용(중복이지만 페이지가 다르므로 각자 구현 — 공용 유틸로 뽑을지는 구현 단계 판단에 맡김).
- **실시간 비밀번호 일치 확인**: `SignupPage`와 동일하게 비밀번호 확인 입력 중 즉시 초록/빨강 메시지 표시.
- **완료 모달**: 비밀번호 변경 완료 시 "비밀번호 변경이 완료되었습니다." 메시지 + "로그인" 버튼을 모달(화면 중앙 오버레이)로 표시. 두 비밀번호 재설정 페이지(`/find-password`, `/reset-password`)가 공유.
- **로그인 폼 자동 채움**: `LoginPage`가 `location.state?.loginId`를 읽어 아이디 입력란 초기값으로 사용(아이디 찾기의 "로그인하기", 비밀번호 재설정 완료 모달의 "로그인" 버튼이 이 state를 실어서 이동).

## 페이지별 설계

### FindIdPage (`/find-id`)

디자인 참고: 사용자가 제공한 목업(이메일 입력 + 인증번호 받기/확인 + 하단 "아이디 찾기" 버튼).

필드/버튼:
1. 이메일 입력 (placeholder "이메일 주소를 입력해주세요")
2. "인증번호 받기" 버튼 → `sendFindIdCode(email)` (8번). 성공 시 인증번호 입력란 노출 + 5분(300초) 카운트다운 시작
3. 인증번호 입력 (placeholder "인증번호 입력"), 옆에 남은 시간(mm:ss) 표시. 0이 되면 만료 처리(재발송 필요 안내, 확인 버튼 비활성화)
4. "인증번호 확인" 버튼 → `verifyFindIdCode(email, code)` (9번). 성공 시 결과(`loginId`, `maskedLoginId`, `createdAt`)를 로컬 상태에 저장하고 하단 버튼 활성화. 이 단계에서는 아직 페이지 이동 없음
5. 하단 전체 폭 "아이디 찾기" 버튼: 인증 성공 전엔 비활성화. 클릭 시 추가 API 호출 없이 저장해둔 결과를 `location.state`로 실어 `/show-id`로 이동

### ShowIdPage (`/show-id`)

디자인 참고: 사용자가 제공한 목업(결과 박스 + 로그인하기/비밀번호 재설정 버튼). 목업은 라디오 버튼으로 여러 결과를 보여주지만, 이메일당 계정은 1개이므로 **라디오 없이 단일 결과만** 박스 안에 표시.

- `location.state`에 결과가 없으면(새로고침 등으로 직접 접근) `/find-id`로 리다이렉트
- 표시 내용: "고객님의 정보와 일치하는 SolarAivle ID 입니다" + 박스 안에 `maskedLoginId` + `createdAt`(가입일, `YYYY-MM-DD`로 포맷)
- "로그인하기" 버튼 → `/login`으로 이동, `state: { loginId: 실제loginId }` 전달(로그인 폼에 자동 채움)
- "비밀번호 재설정" 버튼 → `/reset-password`로 이동, `state: { loginId: 실제loginId, verified: true }` 전달

### FindPasswordPage (`/find-password`) — 로그인 화면에서 직접 진입

디자인 참고: 사용자가 제공한 목업("비밀번호 찾기 페이지(로그인페이지에서)").

필드 순서(목업 그대로):
1. 아이디 입력 (placeholder "아이디 입력")
2. 새 비밀번호 입력 (placeholder "새 비밀번호 입력")
3. 새 비밀번호 확인 입력 (placeholder "새 비밀번호 확인") — 실시간 일치 확인 표시
4. 이메일 입력 (placeholder "이메일") + 5. "인증번호 받기" 버튼 → `sendFindPasswordCode(loginId, email)` (10번)
6. 인증번호 입력 (placeholder "인증번호", 5분 카운트다운) + 7. "인증번호 확인" 버튼 → `verifyFindPasswordCode(loginId, email, code)` (11번)
8. "변경하기" 버튼: 이메일 인증 성공 + 비밀번호 조건 충족 전엔 비활성화. 클릭 시 `resetPassword(loginId, newPassword)` (13번)
9. 성공 시 완료 모달 표시

### ResetPasswordPage (`/reset-password`) — 아이디 찾기 경유

디자인 참고: 사용자가 제공한 목업("비밀번호 찾기 페이지(id 찾기 진행 후)").

- `location.state`에 `{ loginId, verified: true }`가 없으면 `/find-id`로 리다이렉트(직접 접근 방지)
- 마운트 시 `getPasswordResetStatus(loginId)` (12번) 호출로 인증 상태 재확인
  - `verified: true` → 폼 표시
  - `verified: false`(만료 등 엣지케이스) → "인증이 만료되었습니다. 아이디 찾기를 다시 진행해주세요." 메시지 + `/find-id` 링크만 표시, 폼은 숨김
- 폼 필드: 1. 아이디(자동 채움, readonly) 2. 새 비밀번호(placeholder "비밀번호 입력(8~16자리/영문,숫자,특수기호 포함)") 3. 새 비밀번호 확인 — 실시간 일치 확인
- "변경하기" 버튼 → `resetPassword(loginId, newPassword)` (13번), 성공 시 완료 모달 표시

### 완료 모달 (공용)

- "비밀번호 변경이 완료되었습니다." 텍스트 + "로그인" 버튼
- "로그인" 클릭 시 `/login`으로 이동, `state: { loginId }` 전달
- 재설정 성공 시 서버가 기존 refreshToken을 전부 무효화하므로, 모달을 띄우기 전에 `tokenStorage.clearSession()`을 호출해 로컬에 남아있을 수 있는 토큰도 정리

### LoginPage 변경

- "아이디 찾기" 링크 → `<Link to="/find-id">`
- "비밀번호 찾기" 링크 → `<Link to="/find-password">`
- 아이디 입력 초기값을 `location.state?.loginId`로 설정(없으면 빈 문자열)

## 테스트 관점

- authApi: 6개 신규 함수가 올바른 엔드포인트/파라미터로 호출되는지
- FindIdPage: 인증 전/후 하단 버튼 활성화 상태, 카운트다운 만료 처리, `/show-id`로 state 전달 여부
- ShowIdPage: state 없이 접근 시 리다이렉트, 마스킹된 값 표시, 두 버튼의 이동 경로/state
- FindPasswordPage: 이메일 인증 전/후 "변경하기" 버튼 활성화, 비밀번호 조건/일치 검증, 완료 모달
- ResetPasswordPage: state 없이 접근 시 리다이렉트, 12번 API 결과에 따른 폼 표시/숨김 분기, 완료 모달
- LoginPage: `location.state.loginId`로 아이디 자동 채움
