# ZeroLabs Admin

ZeroLabs 관리자 패널 (Nuxt 4 + TypeScript + Tailwind + shadcn-vue)

## 스택

- **Nuxt 4** (Vue 3 + Composition API, `<script setup>`)
- **TypeScript strict** · 도메인 타입 `app/types/` 에 분리
- **Tailwind CSS** + **shadcn-vue** (radix-vue 기반)
- **Pinia** 상태 관리
- **@vueuse/nuxt** — `watchDebounced` 등
- **vue-sonner** (shadcn/sonner) — 토스트 알림
- **@nuxt/icon** + lucide 아이콘

## 빠른 시작

```bash
pnpm install
pnpm dev          # http://localhost:3001
pnpm typecheck    # 타입체크
pnpm build        # 프로덕션 빌드
```

> **관련 백엔드:** `../zerolabs-api/` (admin-api 모듈)
> **소비자 FE:** `../zerolabs_FE/`

## 환경변수 (.env)

```
# 로컬 백엔드 (zerolabs-api/admin-api, dev 프로필)
API_BASE_URL=http://localhost:9092/api/v1

# 원격 스테이징 (필요 시 위 줄 주석 처리 후 사용)
# API_BASE_URL=http://13.124.163.110:9092/api/v1
```

## 디렉터리 구조

```
zerolabs-admin-FE/
├── CLAUDE.md              # 프로젝트 AI 지침
├── app/
│   ├── app.vue                           # Sonner / PromptDialog / ConfirmDialog 전역 등록
│   ├── assets/css/tailwind.css           # CSS 변수 + 다크모드
│   ├── components/
│   │   ├── ui/                           # shadcn-vue 프리미티브
│   │   │   └── alert-dialog, badge, button, card, dialog, input,
│   │   │       label, select, separator, sonner, table, textarea
│   │   └── domain/                       # 공용 도메인 컴포넌트
│   │       ├── PageHeader · DetailHeader
│   │       ├── FilterBar · DataTable · Pagination
│   │       ├── DetailSection · DetailField · StatusBadge
│   │       ├── CategoryTreeEditor · CategoryNode
│   │       ├── ProductOptionsEditor
│   │       └── ConfirmDialog · PromptDialog
│   ├── composables/
│   │   ├── useApi.ts                     # HTTP 공통 (쿠키 auth, refresh, unwrap)
│   │   ├── useToast.ts / useConfirm.ts / usePrompt.ts
│   │   ├── useAdminAuth.ts
│   │   └── useAdmin*.ts                  # 도메인별 API 래퍼
│   ├── layouts/
│   │   ├── default.vue                   # 사이드바 + 컨텐츠
│   │   └── auth.vue
│   ├── middleware/auth.global.ts         # 미로그인 → /login
│   ├── pages/                            # 22개 라우트 (list + [id])
│   ├── stores/auth.ts
│   ├── lib/utils.ts                      # cn(clsx + twMerge)
│   ├── types/                            # 도메인 타입 배럴
│   │   ├── api.ts · common.ts
│   │   ├── product.ts · order.ts · user.ts
│   │   ├── claim.ts · marketing.ts · content.ts
│   │   └── index.ts
│   └── utils/
│       ├── format.ts                     # formatCurrency, formatDate, formatPhone ...
│       └── api/{errorCodes,enums}.ts
├── server/api/[...].ts                   # 백엔드 프록시 (쿠키 transform 포함)
├── memory/                               # Claude 로컬 메모리 (gitignore)
├── nuxt.config.ts
├── tailwind.config.ts
├── components.json                       # shadcn-vue 설정
└── postcss.config.cjs
```

## 라우트

| 그룹 | 경로 |
|---|---|
| 대시보드 | `/`, `/login` |
| 운영 | `/orders`, `/claims`, `/refunds`, `/delivery` |
| 상품 | `/products`, `/categories`, `/promotions`, `/coupons` |
| 회원 | `/users`, `/admins` |
| 콘텐츠 | `/banners`, `/popups`, `/displays`, `/reviews`, `/qnas`, `/inquiries`, `/notices`, `/faqs` |
| 설정 | `/tenant`, `/policy` |

**예외:**
- `/refunds/[id]` — id 는 orderId
- `/claims/[id]` — orderId 쿼리 필수
- `/delivery/[id]` — id 는 shipmentId
- 상세 페이지 없음(싱글톤/트리): `/categories`, `/displays`, `/policy`, `/tenant`

## API 사용 패턴

```ts
const orderApi = useAdminOrder()
// 응답 자동 unwrap · 반환 타입은 composable 제네릭으로 고정
const { content, totalElements } = await orderApi.list({ page: 1, size: 30, status: 'PAID' })

try {
  await orderApi.changeStatuses({ orderIds, status: 'SHIPPING', carrierId, trackingNumber })
  useToast().success('송장이 등록되었습니다.')
} catch (e) {
  useToast().error(e, '상태 변경 실패')   // ApiError 자동 추출
}
```

### 파일 업로드 (multipart)

```ts
const fd = new FormData()
fd.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
fd.append('primaryImage', file)
await useAdminProduct().create(fd)
```

### 알림/확인 (브라우저 네이티브 금지)

```ts
// 토스트
useToast().success('저장됨')
useToast().error(e, '저장 실패')

// 확인 (AlertDialog)
const ok = await useConfirm().ask('삭제하시겠습니까?', {
  description: '이 작업은 되돌릴 수 없습니다.',
  confirmText: '삭제',
  tone: 'danger'
})

// 입력 (Dialog)
const name = await usePrompt().ask('새 태그 이름', { placeholder: '예: NEW' })
```

## 인증 흐름

1. `/login` 에서 `useAdminAuth().login(...)` → 백엔드가 HttpOnly 쿠키 2개 (accessToken, refreshToken) 세팅
2. 이후 모든 요청은 쿠키 자동 전송 (`credentials: 'include'`)
3. 401 + `AUTH_016` → `useApi` 가 `/auth/refresh` 자동 시도 후 원 요청 재시도
4. `AUTH_002` (refresh 도 만료) → `authStore.setSessionExpired()` 발화

## shadcn-vue 컴포넌트 추가

```bash
npx shadcn-vue@latest add <name>
```

→ `app/components/ui/` 에 자동 생성 (nuxt.config.ts 의 `shadcn.componentDir`).

## 포트 · CORS

- FE dev: `3001`
- 백엔드 admin-api 로컬: `9092`
- 백엔드 CORS 허용: `http://localhost:3001, http://localhost:5174`

## 참고 문서

- CLAUDE.md — 컨벤션/규칙 (필독)
- 백엔드 admin 컨트롤러: `../zerolabs-api/core/src/main/java/**/Admin*Controller.java`
- Security 설정: `../zerolabs-api/admin-api/src/main/java/**/AdminSecurityConfig.java`
- shadcn-vue: https://www.shadcn-vue.com/
