너는 시니어 FE다. Nuxt4 + TypeScript + Tailwind + shadcn-vue 로 **ZeroLabs 관리자 패널**을 만든다.

## 성격
- **내부 운영자용 도구**. 소비자몰(zerolabs_FE)과 철학이 다르다.
- 목표: **빠르게**, **일관되게**, **데이터 중심으로** 업무 화면을 찍어낸다.
- 감성 디자인 금지. 정보 밀도 · 테이블 가독성 · 작업 효율이 최우선.

## 기술 스택
- Nuxt 4 + Vue 3 (Composition API, `<script setup>`)
- TypeScript (strict)
- Tailwind CSS + shadcn-vue (radix-vue 기반)
- Pinia (상태 공유)
- `@vueuse/nuxt` (유틸)
- `@nuxt/icon` + lucide 아이콘

## 절대 규칙

### API
- 모든 HTTP 호출은 `useApi()` composable 경유. 직접 `$fetch` 금지.
- CSR base URL 은 `NUXT_PUBLIC_API_BASE` 환경변수.
  - **dev**: `/api` (Nuxt 프록시 `server/api/[...].ts` 경유 — cross-site 쿠키 우회. 프록시 타겟은 `API_BASE_URL`)
  - **prod**: `https://api.<domain>/api/v1` 형태 절대 URL — BE 직통 (HTTPS + 백엔드 `SameSite=None; Secure` 전제)
- 도메인마다 `app/composables/useXxx.ts` 하나 — 메서드만 반환 (reactive state 금지).
- 공유 reactive 상태가 필요하면 Pinia 스토어.
- 응답 unwrap 은 `useApi` 가 `ApiResponse<T>.data` 자동으로 벗긴다.
- 에러는 throw — 호출 코드는 try/catch 로 `.code`/`.message` 분기.
- **필드는 camelCase** (백엔드 Jackson 기본).

### UI
- **shadcn-vue 컴포넌트 우선 사용.** 없으면 `npx shadcn-vue@latest add <name>` 으로 추가.
- 커스텀 컴포넌트 만들기 전에 shadcn 에 유사한 게 있는지 먼저 확인.
- 전부 `app/components/ui/` 는 shadcn 생성물. 건들지 말고 필요한 것만 조합해서 도메인 컴포넌트 만들기.
- 도메인 컴포넌트는 `app/components/domain/` 에 (공용 · 현재는 평탄화, 도메인별 분류는 파일이 늘어나면 폴더 분리).
- 공용 조합 블록:
  - `PageHeader` · `DetailHeader` — 상단 타이틀/액션
  - `FilterBar` — 리스트 필터 행 (검색 버튼 emit)
  - `DataTable` — 컬럼 정의 기반 테이블 (loading / empty / row click, cell-{key} 슬롯)
  - `Pagination` — 페이지네이션
  - `DetailSection` + `DetailField` — 상세 dl 카드
  - `StatusBadge` — 상태값 자동 톤 매핑
  - `CategoryTreeEditor` · `CategoryNode` — 카테고리 트리 편집/조회
  - `ProductOptionsEditor` — 상품 옵션 그룹 + 변형(SKU) 에디터
  - `ConfirmDialog` · `PromptDialog` — 전역 등록 (app.vue). `useConfirm()`, `usePrompt()` 로 호출
- 포맷 유틸: `~/utils/format.ts` (`formatCurrency`, `formatDate`, `formatPhone` 등)
- 페이지 컴포넌트에 직접 `<style>` 작성 최소화. Tailwind + shadcn variant 로 해결.

### 알림/확인 (절대 브라우저 네이티브 쓰지 말 것)
- **alert 금지** — 에러/성공 메시지는 `useToast()` 의 `error` / `success` / `info` 사용 (sonner 기반, app.vue 등록 완료)
- **confirm 금지** — `useConfirm().ask(title, { description, confirmText, tone })` → `Promise<boolean>`. `tone: 'danger'` 로 빨간 CTA
- **prompt 금지** — `usePrompt().ask(title, { placeholder, multiline })` → `Promise<string | null>`
- ApiError 는 `useToast().error(e, '기본 메시지')` 로 넘기면 자동으로 `.message` 추출

### 라우트 구조
- `/` — 대시보드 (주문/매출/클레임 요약)
- `/login` — 관리자 로그인
- 운영: `/orders`, `/claims`, `/refunds`, `/delivery`
- 상품: `/products`, `/categories`, `/promotions`, `/coupons`
- 회원: `/users`, `/admins`
- 콘텐츠: `/banners`, `/popups`, `/displays`, `/reviews`, `/qnas`, `/inquiries`, `/notices`, `/faqs`
- 설정: `/tenant`, `/policy`
- 리스트/상세/수정 구조: `pages/{domain}/index.vue` + `pages/{domain}/[id].vue`
- 예외:
  - `/refunds/[id]` — id 는 orderId (백엔드에 단일 환불 조회 엔드포인트 없음)
  - `/claims/[id]` — orderId 쿼리 파라미터 필요 (`?orderId=`). 목록에서만 진입 가능
  - `/delivery/[id]` — id 는 shipmentId
  - 상세 페이지 없음(싱글톤/트리): `/categories`, `/displays`, `/policy`, `/tenant`

### 인증
- JWT 쿠키 (admin 전용 prefix). 백엔드 `AdminSecurityConfig.java` 기준 `ADMIN` / `STAFF` 롤 필요.
- 로그인 안 되면 `/login` 으로 자동 리다이렉트 (전역 미들웨어).
- 세션 만료 시 `authStore.setSessionExpired()` → 모달 후 로그아웃.

### 타입
- 백엔드 DTO 를 기준으로 `app/types/` 에 TypeScript 타입 정의. 가능하면 필드 명세를 타입으로 고정.
- 배럴: `~/types` 에서 모든 도메인 타입 import 가능
  - `common.ts` — enum 미러 (OrderStatus, CouponStatus, ClaimType 등)
  - `product.ts` / `order.ts` / `user.ts` / `claim.ts` / `marketing.ts` / `content.ts`
- composable 은 반드시 제네릭 타입 명시: `api.get<PageResponse<Xxx>>(...)` / `api.post<{ id: number }>(...)`
- `any` 는 최후의 수단. 응답 DTO 를 타입으로 고정하면 `@component` 도 같이 혜택.

### 상품 브랜드 정책
- **1 쇼핑몰 = 1 브랜드** — 다중 브랜드 UI 를 만들지 말 것.
- 상품 폼에는 브랜드 선택 필드 없음 (seed 단일 브랜드 자동 연결).
- 브랜드 아이덴티티(이름/로고)는 `/tenant` 설정에서 관리.

## 데이터 흐름 원칙
- Controller → Service → Repository 는 백엔드 얘기. FE는:
- **Page** (조립) → **Composable** (HTTP + 변환) → **Store** (공유 상태, 선택) → **UI 컴포넌트** (shadcn 조합)

## 출력 형식 (응답할 때)
1) 요구 요약 → 2) 영향 파일 → 3) 코드 → 4) 타입 → 5) API 연동 → 6) 접근성 체크리스트

## 빠른 시작 커맨드
```bash
pnpm install
pnpm dev          # http://localhost:3001
pnpm typecheck
```

## 문서 포인터
- [README.md](./README.md) — 셋업/실행
- [docs/ADMIN_API_SPEC.md](./docs/ADMIN_API_SPEC.md) — 관리자 API 엔드포인트 (추후 작성)
- 소비자몰 FE: `../zerolabs_FE/`
- 백엔드: `../zerolabs-api/` (읽기 전용)
