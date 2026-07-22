# 전역 에러 토스트 설계

## 배경

백엔드가 모든 API 응답(성공/실패 공통)을 `{ success, message, data }` 포맷으로 통일했다. 실패 시 `success: false`, `message`에 사용자에게 그대로 보여줄 수 있는 문구가 항상 들어있다. 지금까지 에러 처리가 안 돼 있던 화면에서는 API 실패가 나도 사용자에게 아무 안내가 없었는데(콘솔에만 에러가 찍힘), 이를 axios interceptor 레벨의 전역 토스트로 커버한다.

## 범위

- axios interceptor에서 처리되지 않은(=컴포넌트가 직접 처리하지 않는) API 에러를 전역 토스트로 표시
- 기존에 이미 인라인으로 에러를 표시하는 화면(로그인/회원가입/계정잠금/폼 검증 등)은 그대로 유지 — 전역 토스트와 중복 표시되지 않도록 옵트아웃 처리
- 대상 외: 백엔드 에러 코드/메시지 자체의 정확성(백엔드 책임), 여러 에러 동시 발생 시 스택으로 쌓아 보여주는 기능(빈도 낮다고 판단해 범위 밖 — 최신 1개만 표시)

## 핵심 설계 이슈: 기존 17개 파일과의 중복 표시 방지

현재 `SignupPage`, `LoginPage`, `FindIdPage`, `FindPasswordPage`, `ResetPasswordPage`, `GoogleCallbackPage`, `MyPage`, `WithdrawalModal`, `BoardListPage`, `BoardDetailPage`, `BoardWritePage`, `BoardEditPage`, `CommentForm`, `CommentList`, `ChatBot`, `MainPage`, `DashboardPage` 17개 파일이 이미 자체 `catch` 블록으로 에러를 처리하고 있다(폼 검증 인라인 표시, 서버 메시지 표시, 429 쿨다운 안내 등). 백엔드 제안대로 "특정 상태코드만 제외하고 나머지는 전부 전역 처리"하면, 이미 상태코드가 400/401/423이 아닌 것(403/404/409/429/500/502 등)을 자체 처리 중인 화면에서 **인라인 메시지 + 전역 토스트가 동시에 뜨는 중복 표시**가 생긴다.

**해결**: 상태코드 기반 화이트리스트 대신, **API 호출 단위의 옵트아웃 플래그**(`skipErrorModal: true`, axios request config)를 쓴다. 이미 인라인으로 에러를 표시하는 호출에는 이 플래그를 붙여 전역 토스트를 건너뛰게 하고, 나머지(현재 사용자에게 아무 안내도 없는 호출)는 기본값(전역 토스트 표시)을 그대로 둔다.

**적용 규칙(구현 계획에서 파일별로 구체화)**:
- 이미 사용자에게 인라인 메시지를 보여주는 API 호출 → `skipErrorModal: true` 추가
- 현재 에러를 조용히 무시하는 호출(예: `AuthContext`의 best-effort 서버 로그아웃 `try { await authApi.logout(...) } catch {}`) → 플래그 추가하지 않음(의도된 무반응 유지, 전역 토스트도 안 뜨는 게 맞음 — 이미 `catch {}`로 명시적으로 무시하기로 한 결정을 존중)
- 지금 에러 처리가 아예 없는 호출 → 플래그 추가하지 않음(전역 토스트가 새로 뜨게 됨 — 이번 작업의 핵심 목적)

플래그 이름은 `skipErrorModal`로 한다(토스트로 UI를 구현하지만, "전역 알림을 스킵한다"는 의미는 UI 형태와 무관해서 이름을 그대로 둔다 — 나중에 토스트를 모달로 바꾸더라도 이 이름을 바꿀 필요가 없다).

## 아키텍처

### 토스트 UI

- **`src/notifications/errorToastStore.js`** (신규): 모듈 레벨 pub-sub. `tokenStorage.js`가 이미 쓰는 "모듈 상태 + 구독 콜백" 패턴과 동일한 스타일.
  ```js
  export const showErrorToast = (message) => { ... };
  export const subscribeToErrorToast = (callback) => { ... }; // unsubscribe 함수 반환
  ```
- **`src/components/ErrorToast.jsx`** (신규): `App.jsx`에 한 번 마운트. `subscribeToErrorToast`를 `useEffect`로 구독해 로컬 state에 메시지를 저장, 렌더링.
  - 위치: 화면 우측 상단 고정(`position: fixed`)
  - 표시: 최신 메시지 1개만(새 에러가 오면 이전 걸 덮어씀, 스택 없음)
  - 닫힘: 4초 후 자동 사라짐(타이머) + X 버튼으로 즉시 닫기(수동 닫기 시 타이머 취소)
  - 스타일: 다크 배경(`#1f2937` 계열) + 흰 텍스트, 기존 프로젝트 색상 톤과 맞춤

### axios interceptor 확장

`src/api/axiosInstance.js`의 `handleResponseError`에는 현재 `Promise.reject`로 끝나는 지점이 2곳 있다:

- **(a) `if (!shouldRefresh) { return Promise.reject(error); }`** — 401이 아니거나, `NO_REFRESH_URLS`에 있거나, 세션이 없는 등 재발급 대상이 아닌 **대부분의 일반 API 실패**가 여기로 빠진다. 토스트를 붙여야 할 핵심 경로.
- **(b) `catch (refreshError) { ...; window.location.href = '/login'; return Promise.reject(refreshError); }`** — 재발급까지 실패해서 세션이 완전히 끊긴 경우. 이미 하드 리다이렉트로 안내가 되므로 여기는 토스트를 **스킵**한다.

새 토스트 판단 로직은 (a) 지점에 적용한다(공용 헬퍼 함수로 뽑아서 (a)에서만 호출). (b)는 그대로 두고 토스트를 호출하지 않는다. 판단 순서:

1. `error.config?.skipErrorModal === true` → 아무것도 안 하고 reject(호출부가 직접 처리)
2. 그 외(= (a) 지점에 도달했고 스킵 플래그도 없는 경우):
   - `error.response?.data?.success === false` → `error.response.data.message`를 토스트로 표시
   - `error.response`가 아예 없음(네트워크 자체 문제) → "네트워크 연결을 확인해주세요." 토스트 표시
   - 위 두 경우 모두 표시 후 그대로 `Promise.reject(error)`(토스트를 보여줘도 호출부의 `.catch`는 정상적으로 계속 동작해야 함 — 로딩 스피너 끄기 등 자체 후처리가 있을 수 있으므로)

### 놓쳤던 부분: `/auth/token/refresh` 자기 자신의 실패도 (a) 경로를 탄다

`refreshAccessToken`(같은 파일 내부)과 `AuthContext.jsx`의 부팅 시 세션 복원 코드, 둘 다 `instance.post('/auth/token/refresh', ...)`를 **직접** 호출한다. 이 요청 자체가 실패하면(예: refreshToken이 이미 무효화됨) 그 에러도 같은 `instance`의 인터셉터를 타는데, `NO_REFRESH_URLS`는 "이 URL이 401을 받아도 재발급을 또 시도하지 않는다"는 뜻일 뿐이지 "토스트도 스킵한다"는 뜻이 아니다. 즉 이 요청의 실패는 곧바로 (a) 경로(`if (!shouldRefresh) { return Promise.reject(error); }`)로 빠지고, 아무 조치가 없으면 여기서도 토스트가 뜬다.

문제는 이게 뜨는 타이밍이다: `refreshAccessToken`의 실패는 원래 요청의 `catch (refreshError)` 블록(=하드 리다이렉트 경로 (b))으로 전파되기 *전에* 먼저 (a) 경로를 거치면서 토스트를 띄워버린다. 그러면 "세션이 만료됐습니다" 안내가 뜨기도 전에(또는 동시에) 알 수 없는 토스트(refresh 엔드포인트의 실패 메시지)가 먼저 번쩍이는 이상한 UX가 된다.

**해결**: `refreshAccessToken`(`axiosInstance.js`)과 `AuthContext.jsx`의 부팅 시 복원 코드, 이 두 곳의 `instance.post('/auth/token/refresh', ...)` 호출 모두 세 번째 인자로 `{ skipErrorModal: true }`를 명시적으로 넘긴다.

### 확인이 필요한 가정: 실패는 항상 non-2xx 상태코드로 온다

이 설계는 axios interceptor의 에러 핸들러(`handleResponseError`)가 실행되는 것을 전제로 하는데, axios는 기본적으로 **2xx 응답에서는 에러 인터셉터를 아예 타지 않는다**. 백엔드 요청 메시지에 "HTTP 상태코드는 상황별로 다릅니다(400/401/403/404/409/423/429/500/502 등)"라고 돼 있어 실패가 항상 non-2xx로 온다고 가정했다. 만약 백엔드가 어떤 실패 케이스를 `200 + { success: false }`로 내려주는 경우가 있다면, 그 경우는 이 인터셉터 기반 설계로 전혀 잡히지 않는다(토스트도 안 뜨고, 각 화면도 성공으로 착각하고 처리할 수 있음). 구현 전 백엔드에 "실패는 항상 non-2xx인지" 한 번 확인 필요 — 이 문서에서는 확인됐다고 가정하고 진행한다.

### 옵트아웃 플래그 적용 대상 (구현 계획에서 파일별로 정리)

`src/api/*.js`(authApi, myPageApi, boardApi, chatApi, termsApi)의 함수들 중 호출부가 이미 에러를 인라인으로 처리하는 함수는 세 번째 인자로 `{ skipErrorModal: true }`를 axios 호출에 전달할 수 있게 시그니처를 확장한다(또는 호출부에서 직접 넘기는 방식 — 구현 계획에서 확정).

## 테스트 관점

- `errorToastStore`: `showErrorToast` 호출 시 구독자가 메시지를 받는지, 여러 번 호출 시 최신 메시지로 덮어써지는지
- `ErrorToast`: 메시지 수신 시 렌더링, 4초 후 자동으로 사라짐(vitest 타이머 mock 사용), X 버튼 클릭 시 즉시 닫힘, 자동 닫힘 타이머와 수동 닫기가 서로 간섭하지 않는지(수동 닫기 후 타이머가 늦게 발동해 재표시되지 않는지)
- `axiosInstance.handleResponseError`: `skipErrorModal: true`면 토스트 안 뜨고 reject만 되는지, 세션 만료 리다이렉트 경로에서 토스트가 안 뜨는지, 일반 실패 응답에서 `message`가 토스트로 전달되는지, 네트워크 에러(응답 없음)에서 기본 문구가 뜨는지
- `/auth/token/refresh` 자체가 실패할 때(예: refreshToken 무효) 토스트가 안 뜨고 곧바로 하드 리다이렉트 경로만 타는지(회귀 테스트 — 위 "놓쳤던 부분" 항목)
- 옵트아웃 플래그가 붙은 기존 화면들의 기존 테스트가 회귀 없이 통과하는지(각 페이지 테스트는 대부분 `../api/*` 자체를 mock하므로 axios interceptor 동작과 무관하게 영향받지 않을 가능성이 높지만, 구현 단계에서 실제로 깨지는 게 없는지 확인)
