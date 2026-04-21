# ADMIN API SPEC (FE 반영 현황)

백엔드 `zerolabs-api` 의 어드민 엔드포인트와 본 FE 에 반영된 상태를 기록한다.
변경이 있을 때마다 이 문서의 "변경 이력" 섹션에 날짜와 함께 추가한다.

- Base URL: `/api/v1` (FE `useApi()` 자동 prefix)
- 인증: JWT 쿠키 (`ADMIN` / `STAFF` 롤)
- 응답 unwrap: `useApi()` 가 `ApiResponse<T>.data` 자동 반환. `errorCode` 면 `ApiError` throw
- 필드 네이밍: BE 가 `@JsonProperty` 로 필드별로 snake_case/camelCase 를 고정한다. 동일 엔드포인트 내 필드마다 다를 수 있음. **무작정 camel 로 가정하면 undefined** — FE 타입은 BE DTO 그대로 맞춘다 (하단 "스키마 정합성 메모" 참조)

---

## 변경 이력

### 2026-04-21 — 전역 타입 안전성 확보
- `app/` 전체 `any` 제거 (105+ → 0). `pnpm typecheck` 통과
- BE DTO 기반 request body 타입을 composable 마다 `*Body` 로 선언 (`BannerCreateBody`, `CouponCreateBody`, `ClaimApproveBody` 등)
- 스키마 snake_case 정합성 확보:
  - `types/user.ts` 전면 재작성 — `UserListItem`/`UserDetail`/`UserAddress`/`UserCsMemo`/`UserOrderStatistics`/`UserOrderEntry`/`PointHistoryEntry` 를 BE snake_case 키로 선언
  - `AdminAccount` 를 `AdminMe` (camel) / `AdminListItem` (snake created_at) / `AdminDetail` (snake 다수) 로 **분리** — 3 엔드포인트 응답 shape 이 서로 달라서
  - `pages/users/index.vue`, `pages/users/[id].vue`, `pages/admins/*.vue` 템플릿을 snake 접근으로 교체
- shadcn `Select` 마이그레이션 완료 — 24 파일, native `<select>` → 0. 필터형은 `ALL` 센티넬, 숫자 id 는 computed wrapper
- 신규 타입 파일: `types/tenant.ts`, `types/policy.ts`
- 폼 상태 타입 신설: `ProductFormState`, `TenantFormState`, `PolicyFormState`, `CouponFormState`, `PopupFormState`, `PromotionFormState`, `BannerFormState`

### 2026-04-21 — 백엔드 sync

| BE 커밋 | 영향 | FE 반영 |
| --- | --- | --- |
| `0310062` 배너 모바일 이미지 URL 필드 추가 | `BannerResponse` / `BannerCreate/UpdateRequest` 에 `mobileImageUrl` | `types/marketing.ts` · `pages/banners/[id].vue` (form + 상세 뷰) 반영 |
| `3af4f80` 관리자 계정 생성·역할 변경 API | `POST /admin/admins`, `PATCH /admin/admins/{id}/role` | `composables/useAdmins.ts` · `pages/admins/[id].vue` 이미 바인딩됨 |
| `19998cc` 관리자 회원 상태 변경·강제 탈퇴 API | `PATCH /admin/users/{id}/status` 는 ACTIVE/INACTIVE 만 허용, `DELETE /admin/users/{id}` 로 강제 탈퇴 | `pages/users/[id].vue` 의 "탈퇴 처리" 버튼을 `DELETE` 호출로 교체, 상태 버튼에서 SUSPENDED/WITHDRAWN 제거 |

참고 (고객용 API · admin FE 영향 없음):
- `499505a` `GET /users/me/grade` (내 등급 조회) — 소비자몰 FE 대상
- `d6a2feb` `POST /auth/find-email` (아이디 찾기) — 소비자몰 FE 대상

---

## 어드민 엔드포인트 요약 (도메인별)

### Admin (`/admin`, `/admin/admins`)
컴포저블: [`useAdmins`](../app/composables/useAdmins.ts)

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/admin/me` | 로그인 관리자 정보 (`AdminMe`, camelCase) |
| GET | `/admin/admins` | 관리자 리스트 (keyword, userType, status, page, size) → `AdminListItem[]` |
| GET | `/admin/admins/{id}` | 관리자 상세 → `AdminDetail` (snake_case 다수) |
| POST | `/admin/admins` | 관리자 계정 생성 (role: ADMIN/STAFF — CUSTOMER 불가) |
| PATCH | `/admin/admins/{id}/role` | 역할 변경 (ADMIN ↔ STAFF) |
| PATCH | `/admin/admins/{id}/status` | 상태 변경 (ACTIVE/INACTIVE/SUSPENDED) |

### Member (`/admin/users`)
컴포저블 없음 — `pages/users/*.vue` 에서 `useApi()` 직접 호출. CS 메모/포인트는 별도 컴포저블.

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/admin/users` | 회원 리스트 (searchType, keyword, status, grade) → `UserListItem[]` |
| GET | `/admin/users/{id}` | 회원 상세 → `UserDetail` |
| PATCH | `/admin/users/{id}/status` | **ACTIVE / INACTIVE 만 허용**. SUSPENDED 는 로그인 실패로 자동 설정, WITHDRAWN 은 DELETE 사용 |
| DELETE | `/admin/users/{id}` | 강제 탈퇴 (soft delete, WITHDRAWN + deletedAt 기록) |
| GET | `/admin/users/{id}/orders` | 회원 주문 이력 → `UserOrderEntry[]` |
| POST | `/admin/users/{id}/cs-memos` | CS 메모 등록 |
| PUT | `/admin/users/{id}/cs-memos/{memoId}` | CS 메모 수정 |
| DELETE | `/admin/users/{id}/cs-memos/{memoId}` | CS 메모 삭제 |
| GET | `/admin/users/grades` | 등급 목록 (pending_snapshot 포함) |
| PATCH | `/admin/users/grades` | 등급 일괄 변경 (userIds[]) |
| GET | `/admin/users/grades/{gradeId}/coupons` | 등급별 쿠폰 |
| PATCH | `/admin/users/grades/{gradeId}` | 등급 정책 수정 (익월 1일 반영) |
| GET | `/admin/users/grades/policy-histories` | 등급 정책 변경 이력 |

### Banner (`/admin/banners`)
컴포저블: [`useAdminBanner`](../app/composables/useAdminBanner.ts) · Request 타입 `BannerCreateBody`/`BannerUpdateBody`

Create/Update 필드: `title`, `position` (HERO/SLIDE/HALF/FULL), `imageUrl`, **`mobileImageUrl`**, `linkUrl`, `sortOrder`, `status` (ACTIVE/SCHEDULED/INACTIVE), `startedAt`, `endedAt`, `noEndDate`. `mobileImageUrl` 미입력 시 PC 이미지가 모바일에서도 노출된다.

### Image Upload (`/admin/images`)
컴포저블: 예정 (아래 "이미지 업로드 UX 마이그레이션" 참조)

| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/admin/images` | multipart `file` 파트 업로드 → `{ url, fileName, originalFileName, fileSize, contentType }` 반환. S3 + CloudFront CDN |

지원: JPEG/PNG/GIF/WebP · 최대 10MB. 에디터 및 JSON 기반 리소스(배너·팝업)의 이미지 URL 채우기 용도.

### 기타 어드민 도메인

| 도메인 | 컴포저블 | Request 타입 |
| --- | --- | --- |
| Product | [`useAdminProduct`](../app/composables/useAdminProduct.ts) | FormData (multipart) |
| Category | [`useAdminCategory`](../app/composables/useAdminCategory.ts) | FormData (sync) |
| Tag | [`useAdminTag`](../app/composables/useAdminTag.ts) | `{ name }` |
| Order | [`useAdminOrder`](../app/composables/useAdminOrder.ts) | `OrderStatusChangeBody` |
| Delivery | [`useAdminDelivery`](../app/composables/useAdminDelivery.ts) | `ShipmentCreateBody` |
| Claim | [`useAdminClaim`](../app/composables/useAdminClaim.ts) | `ClaimCreateBody` / `ClaimApproveBody` / `ClaimRejectBody` / `ClaimShippingBody` / `ClaimReceiveInspectBody` / `ClaimExchangeCompleteBody` |
| Refund | [`useAdminRefund`](../app/composables/useAdminRefund.ts) | `RefundProcessBody` |
| Coupon | [`useAdminCoupon`](../app/composables/useAdminCoupon.ts) | `CouponCreateBody` / `CouponUpdateBody` |
| Promotion | [`useAdminPromotion`](../app/composables/useAdminPromotion.ts) | `PromotionCreateBody` / `PromotionUpdateBody` |
| Popup | [`useAdminPopup`](../app/composables/useAdminPopup.ts) | `PopupCreateBody` / `PopupUpdateBody` |
| Display (섹션) | [`useAdminDisplay`](../app/composables/useAdminDisplay.ts) | FormData (sync) |
| Review | [`useAdminReview`](../app/composables/useAdminReview.ts) | — |
| Qna | [`useAdminQna`](../app/composables/useAdminQna.ts) | `{ answer }` |
| Inquiry | [`useAdminInquiry`](../app/composables/useAdminInquiry.ts) | `{ answerContent }` |
| Notice | [`useAdminNotice`](../app/composables/useAdminNotice.ts) | `NoticeCreateBody` / `NoticeUpdateBody` |
| Faq | [`useAdminFaq`](../app/composables/useAdminFaq.ts) | `{ name, isActive? }` 등 |
| Point | [`useAdminPoint`](../app/composables/useAdminPoint.ts) | `{ amount, reason }` |
| Policy | [`useAdminPolicy`](../app/composables/useAdminPolicy.ts) | `PolicyAllSettings` |
| Tenant | [`useAdminTenant`](../app/composables/useAdminTenant.ts) | FormData (multipart) |

---

## 운영 규칙

- **새 엔드포인트 추가**: 1) BE 확인 → 2) FE `composables/useAdminXxx.ts` 에 메서드 + `*Body` 인터페이스 추가 → 3) 페이지 조립 → 4) 본 문서 "변경 이력" 추가
- **네이밍**: BE 가 `@JsonProperty("snake_case")` 로 필드명을 고정했다면 FE 타입도 해당 필드만 snake_case 로 선언. 전체 응답이 camelCase 라는 가정으로 덮어쓰지 말 것
- **request body 타입**: `body: any` 금지. BE Request DTO 를 참고해 `*Body` 인터페이스로 명시. 페이지의 `buildBody()` 는 이 타입을 반환
- **useApi 제네릭**: `api.get<T>()` / `api.post<T>()` 의 T 를 항상 명시 (default 가 `unknown` 이라 안 주면 unwrap 결과가 unknown)
- **에러 처리**: `useToast().error(e, 'fallback')`. `useApi` 가 throw 하는 `ApiError` 의 `.code` / `.message` 를 자동 추출
- **알림**: `alert` / `confirm` / `prompt` 네이티브 금지. `useToast` / `useConfirm` / `usePrompt` 사용

---

## 스키마 정합성 메모

### BE 응답 네이밍 요약

| 엔드포인트 / DTO | 네이밍 | FE 타입 |
| --- | --- | --- |
| `GET /admin/users` → `UsersResponse` | snake (user_id, order_count, total_order_amount, created_at) | [`UserListItem`](../app/types/user.ts) |
| `GET /admin/users/{id}` → `UsersDetailResponse` | snake (user_id, current_point, created_at, last_login_at, default_address, order_statistics, recent_orders, cs_memos) | [`UserDetail`](../app/types/user.ts) |
| `GET /admin/users/{id}/orders` → `UserOrderResponse` | snake (order_id, order_number, ordered_at, grand_total, product_summary) | [`UserOrderEntry`](../app/types/user.ts) |
| `AddressResponse` (default_address) | snake (recipient_name/phone, postal_code, country_code, is_default). 필드명 자체가 `address1/address2` | [`UserAddress`](../app/types/user.ts) |
| `CsMemoResponse` | snake (created_by, created_by_name, created_at) | [`UserCsMemo`](../app/types/user.ts) |
| `OrderStatisticsResponse` | snake (total_order_count, total_order_amount, average_order_amount, cancelled_count, refunded_count) | [`UserOrderStatistics`](../app/types/user.ts) |
| `PointHistoryResponse` | snake (transaction_type, balance_after, created_at) | [`PointHistoryEntry`](../app/types/user.ts) |
| `GET /admin/admins` → `AdminsResponse` | `created_at` 만 snake, 나머지 camel | [`AdminListItem`](../app/types/user.ts) |
| `GET /admin/admins/{id}` → `AdminDetailResponse` | snake (user_status, password_changed_at, last_login_at, last_login_ip, locked_until, created_at, updated_at) | [`AdminDetail`](../app/types/user.ts) |
| `GET /auth/admin/me`, `GET /admin/me` → `MyInfoResponse` | **camel**. 단 `status` 는 소문자 문자열 (`"active"`, `"inactive"` …) | [`AdminMe`](../app/types/user.ts) |

---

## 이미지 업로드 UX

이미지 입력 방식이 두 가지로 나뉜다:

| 유형 | 도메인 | 구현 |
| --- | --- | --- |
| (A) 도메인 API 가 multipart 수용 | products, tenant, displays, categories | FE 가 파일 + JSON 을 한 번에 send |
| (B) JSON API + URL 문자열 | banners, popups | `ImageUploadField` 가 `/admin/images` 로 업로드 → 받은 URL 을 form 에 세팅 |

### 공용 업로드 컴포넌트
- [`composables/useAdminImage.ts`](../app/composables/useAdminImage.ts) — `upload(file) → ImageUploadResponse`
- [`components/domain/ImageUploadField.vue`](../app/components/domain/ImageUploadField.vue) — `v-model` 로 URL string 양방향. 파일 선택 / 업로드 중 스피너 / 미리보기 / 제거 / "URL 직접 입력" 토글(운영 fallback)
- 클라이언트 선검증: MIME 타입 (기본 JPEG/PNG/GIF/WebP) + 파일 크기 (기본 10MB)

### 사용 예
```vue
<ImageUploadField v-model="form.imageUrl" preview-class="max-h-48 w-full" />
```

Props:
- `modelValue: string` — 현재 URL
- `accept: string` — 기본 `image/jpeg,image/png,image/gif,image/webp`
- `maxSizeMb: number` — 기본 10
- `previewClass: string` — 미리보기 이미지 클래스 (기본 `max-h-40`)
- `placeholder: string` — URL 모드의 Input placeholder

### 적용 위치
- [banners/[id].vue](../app/pages/banners/[id].vue) — `imageUrl`, `mobileImageUrl`
- [popups/[id].vue](../app/pages/popups/[id].vue) — `image`

(A) 는 BE 엔드포인트가 multipart 전용이라 FE 만으로 바꿀 수 없어 **유지**한다.

---

## 미구현 / 권장 요청사항

**주문 상태별 집계 엔드포인트 없음**
대시보드 ([pages/index.vue](../app/pages/index.vue)) 는 입금대기/배송준비/배송중 카드를 노출한다. 전용 집계 엔드포인트가 없어 현재는 **상태별로 3번의 list 조회 (size=1, totalElements 만 사용)** 로 우회.

권장: BE 에 `GET /admin/orders/status-summary` (또는 `GET /admin/dashboard/summary`) 추가해 `{ pending, preparing, shipping, delivered, ... }` 단일 호출. 대시보드 카드가 늘어나면 FE 호출 수가 N 배로 증가.
