# 개인정보 수집·이용 동의(약관) 프론트엔드 연동 설계

## 배경

컴플라이언스 요건(개인정보 보호법 등)에 따라 백엔드에 약관 동의 수집 기능이 추가되었다(백엔드 `feat/login` 브랜치, 스펙: backEnd `docs/API_REFERENCE.md`의 4·14·15~17번). 회원가입 시 필수/선택 약관 동의를 받고, 약관 전문을 보여주고, 마이페이지에서 동의 현황을 조회·변경할 수 있어야 한다. 푸터의 개인정보처리방침 링크는 법적 필수 항목이다.

## 백엔드 API 레퍼런스

공통 응답 포맷 `{ success, message, data }`, Base URL 등은 기존과 동일.

| # | 기능 | Method / Path | Request Body | 비고 |
|---|------|---------------|---------------|------|
| 4(수정) | 회원가입 | `POST /auth/signup` | 기존 4필드 + `termsAgreed`, `privacyAgreed`, `marketingAgreed` | `termsAgreed`/`privacyAgreed`는 필수(true). 미동의 시 400, 응답 `data`에 `{ termsAgreed/privacyAgreed: "필수 약관에 동의해야 합니다." }`. `marketingAgreed`는 선택(미전송 시 서버가 false 처리) |
| 15 | 약관 본문 조회 | `GET /terms/{type}` | - (인증 불필요) | `type`: `TERMS` \| `PRIVACY`. 응답 `{ data: { type, version, content } }` — `content`는 마크다운. 실패: `TERMS_NOT_FOUND`(404, "약관을 찾을 수 없습니다.") |
| 16 | 내 동의 현황 조회 | `GET /users/me/consents` | - (인증 필요) | 응답 `{ data: { consents: [ { type, agreed, version, agreedAt } ×3 ] } }`. 오래된 가입자는 `agreed`/`version`/`agreedAt`이 null — "동의 기록 없음"으로 표시 |
| 17 | 마케팅 동의 변경 | `PUT /users/me/consents/marketing` | `{ agreed: boolean }` (인증 필요) | 응답으로 변경된 MARKETING 항목 1개만 옴 |

구글 로그인(14번)은 별도 동의 화면 없이 자동 가입되므로, 버튼 근처에 간주 동의 안내 문구를 표시한다(백엔드 요청사항).

## 범위

- 회원가입 동의 UI + 약관 전문 모달, `/terms/:type` 약관 페이지, 푸터 개인정보처리방침 링크, 구글 로그인 안내 문구, 마이페이지 동의 현황 카드
- 필수 약관(TERMS/PRIVACY) 철회는 범위 밖(변경 API 없음 — 회원탈퇴 영역)
- 신규 의존성: `react-markdown` (약관 본문 마크다운 렌더링, 백엔드 권장)

## 아키텍처

### API 계층

- **`src/api/termsApi.js`** (신규): `getTerms(type)` → `GET /terms/{type}`. 기존 패턴(axiosInstance, `response.data` 반환) 동일.
- **`src/api/myPageApi.js`** (함수 추가): `getMyConsents()` → `GET /users/me/consents` (`data.data.consents` 배열 반환), `updateMarketingConsent(agreed)` → `PUT /users/me/consents/marketing` (`data.data` 반환).
- **`src/api/authApi.js`** (수정): `signup({ loginId, email, password, name, termsAgreed, privacyAgreed, marketingAgreed })` — 3개 필드 추가 전달.

### 공용 컴포넌트: `TermsModal` (신규, `src/components/TermsModal.jsx`)

- Props: `type` ('TERMS' | 'PRIVACY'), `onClose`
- 열릴 때(마운트 시) `getTerms(type)` 호출. 로딩 중 "약관을 불러오는 중..." 표시.
- 성공: 제목(이용약관/개인정보처리방침) + 버전 + `content`를 `react-markdown`으로 렌더링. 본문 영역은 스크롤 가능.
- 실패(404 포함): "약관을 불러오지 못했습니다." + 닫기 버튼.
- 기존 모달 스타일(`.modal-overlay`/`.modal-box`) 재사용, 본문이 길므로 max-height + 내부 스크롤 변형 클래스 추가.

## 화면별 설계

### SignupPage — 동의 섹션 (박스형, 사용자 A안 확정)

이름 입력란 아래, 가입하기 버튼 위에 테두리 박스:

1. **전체 동의합니다** (굵게, 박스 상단) — 클릭 시 아래 3개 항목 모두 체크/해제. 개별 3개가 모두 체크되면 자동 체크, 하나라도 해제되면 자동 해제(파생 상태로 계산, 별도 state 아님).
2. 구분선
3. **[필수] 이용약관 동의** + 오른쪽 "전문 보기" → `TermsModal(type='TERMS')`
4. **[필수] 개인정보 수집·이용 동의** + 오른쪽 "전문 보기" → `TermsModal(type='PRIVACY')`
5. **[선택] 마케팅 정보 수신 동의** (전문 보기 없음)

- `canSubmit`에 `termsAgreed && privacyAgreed` 조건 추가(필수 미체크 시 가입 버튼 비활성화).
- `signup()` 호출에 3개 필드 포함.
- 400 응답 처리: 응답 `data.data`가 객체이고 `termsAgreed`/`privacyAgreed` 키가 있으면 그 메시지("필수 약관에 동의해야 합니다.")를 폼 에러로 표시(방어적 처리 — 정상 흐름에선 버튼 비활성화로 도달 불가).

### TermsPage (`/terms/:type`, 신규)

- URL 파라미터 `type`(`terms` | `privacy`, 소문자)을 대문자로 변환해 `getTerms()` 호출.
- `terms`/`privacy` 외의 값이면 API 호출 없이 "약관을 찾을 수 없습니다." 안내만 표시.
- 성공: 제목 + 버전 + 마크다운 본문 전체를 페이지로 표시(`Layout` 사용 — 헤더/푸터 포함).
- 로딩/실패 상태 표시. 실패 시 홈으로 가는 링크 제공.
- 라우트는 `App.jsx`에 `/terms/:type`으로 추가.

### Footer — 실제 푸터로 교체

- 현재 "푸터 테스트" placeholder를 교체: 서비스명(SolarAivle) + **"개인정보처리방침"** 링크(`<Link to="/terms/privacy">`) 포함. 개인정보처리방침 링크는 법적 필수라 굵게 강조.
- "이용약관" 링크(`/terms/terms`)도 함께 배치(관례상 쌍으로 두는 것이 자연스러움).

### LoginPage — 구글 로그인 안내 문구

- 구글 버튼 바로 아래에 작은 안내 문구: "구글 로그인 시 **이용약관** 및 **개인정보처리방침**에 동의한 것으로 간주됩니다."
- "이용약관"/"개인정보처리방침"은 클릭 시 각각 `TermsModal(type='TERMS')`/`TermsModal(type='PRIVACY')`을 여는 링크 스타일 버튼.

### MyPage — 약관 동의 현황 카드 (리스트+토글, 사용자 A안 확정)

기존 `mypage-grid`에 "약관 동의 현황" 카드(`mypage-card`) 추가:

- 마운트 시 `getMyConsents()` 호출(기존 `loadMyPage`의 Promise.all에 합류시키되, 동의 조회 실패가 프로필/게시글 표시를 막지 않도록 개별 실패 처리).
- 3개 행: 항목명(이용약관/개인정보 수집·이용/마케팅 정보 수신) + 부가정보(버전·동의일) + 상태.
  - `agreed: true` → "동의함" 배지(초록) + `v{version} · {동의일}`
  - `agreed: false` → "미동의" 배지(회색)
  - `agreed: null` → "동의 기록 없음" 텍스트(부가정보 생략)
- 마케팅 행만 토글 스위치: 클릭 시 `updateMarketingConsent(!현재값)` 호출 → 성공 시 응답으로 해당 행 갱신, 실패 시 기존 `message` 영역에 에러 표시하고 토글 상태 원복. 요청 중 토글 비활성화(중복 클릭 방지).
- 필수 항목엔 변경 UI 없음(조회 전용).

## 에러 처리 요약

| 상황 | 처리 |
|------|------|
| 약관 조회 실패(404 등) — 모달 | "약관을 불러오지 못했습니다." + 닫기 |
| 약관 조회 실패 — TermsPage | 안내 문구 + 홈 링크 |
| 회원가입 400 필수 미동의 | `data`의 필드별 메시지를 폼 에러로 표시 |
| 동의 현황 조회 실패 — MyPage | 카드 영역에 "동의 현황을 불러오지 못했습니다." (다른 카드는 정상 표시) |
| 마케팅 토글 실패 | 에러 메시지 + 토글 원복 |

## 테스트 관점

- `termsApi.getTerms` / `myPageApi.getMyConsents` / `updateMarketingConsent`: 올바른 엔드포인트·파라미터 호출
- `authApi.signup`: 3개 동의 필드가 바디에 포함되는지
- `TermsModal`: 로딩 → 성공(마크다운 렌더) / 실패(404) 분기, 닫기 동작
- `SignupPage`: 전체동의 ↔ 개별 체크 양방향 연동, 필수 미체크 시 버튼 비활성화, 제출 시 3필드 포함, "전문 보기" 클릭 시 모달 표시
- `TermsPage`: terms/privacy 파라미터별 API 호출, 잘못된 type 시 API 미호출 + 안내, 실패 상태
- `Footer`: 개인정보처리방침 링크가 `/terms/privacy`로 연결
- `LoginPage`: 안내 문구 표시, 링크 클릭 시 모달
- `MyPage`: 3개 행 표시(null 기록 "동의 기록 없음" 포함), 마케팅 토글 성공/실패(원복) 흐름
- `App.test.jsx`: `/terms/:type` 라우트 스모크 테스트
