<script setup lang="ts">
/**
 * 도메인 상태 뱃지.
 * - `status` (enum 문자열) → 자동으로 한글 라벨 + 톤/색상 매핑
 * - 필요시 `label` 로 문자열 override, `tone` 으로 톤 override
 * - `dot` 으로 선두 색 점 노출 (기본 true) — 한눈에 카테고리 구분
 */
interface Props {
  status?: string | null
  label?: string | null
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'scheduled' | 'muted'
  size?: 'sm' | 'md'
  dot?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  tone: undefined,
  size: 'md',
  dot: true
})

/** 상태 enum → 톤 매핑. 동일 enum 이라도 도메인 맥락에 맞추어 직관적인 톤으로. */
const TONE_MAP: Record<string, Props['tone']> = {
  // 긍정 · 활성
  ACTIVE: 'success',
  ON_SALE: 'success',
  IN_STOCK: 'success',
  PAID: 'success',
  DELIVERED: 'success',
  COMPLETED: 'success',
  APPROVED: 'success',
  ANSWERED: 'success',

  // 대기 · 진행
  PENDING: 'warning',
  WAITING: 'warning',
  REQUESTED: 'warning',
  REGISTERED: 'warning',
  PREPARING: 'warning',
  IN_PROGRESS: 'warning',
  STOPPED: 'warning',

  // 정보 · 중간 단계
  SHIPPING: 'info',
  CONFIRMED: 'info',
  BACKORDER: 'info',
  DRAFT: 'info',

  // 예약
  SCHEDULED: 'scheduled',

  // 종료 · 비활성 (중립)
  CANCELLED: 'muted',
  REFUNDED: 'muted',
  ENDED: 'muted',
  RECALLED: 'muted',
  DISCONTINUED: 'muted',
  INACTIVE: 'muted',
  WITHDRAWN: 'muted',
  CLOSED: 'muted',

  // 위험 · 주의
  SOLD_OUT: 'danger',
  OUT_OF_STOCK: 'danger',
  REJECTED: 'danger',
  FAILED: 'danger',
  BLOCKED: 'danger',
  SUSPENDED: 'danger'
}

/** 상태 enum → 한글 라벨. 없으면 원본 문자열 그대로. */
const LABEL_MAP: Record<string, string> = {
  // Product
  ON_SALE: '판매중',
  SOLD_OUT: '품절',
  DISCONTINUED: '단종',

  // StockStatus
  IN_STOCK: '재고있음',
  OUT_OF_STOCK: '품절',
  BACKORDER: '입고예정',

  // Order
  PENDING: '대기',
  PAID: '결제완료',
  PREPARING: '상품준비',
  SHIPPING: '배송중',
  DELIVERED: '배송완료',
  COMPLETED: '완료',
  CONFIRMED: '구매확정',
  CANCELLED: '취소',
  REFUNDED: '환불',

  // Claim
  REQUESTED: '요청',
  APPROVED: '승인',
  IN_PROGRESS: '진행중',
  REJECTED: '반려',

  // ClaimType
  CANCEL: '취소',
  RETURN: '반품',
  EXCHANGE: '교환',

  // Coupon
  REGISTERED: '등록',
  ACTIVE: '활성',
  STOPPED: '중단',
  ENDED: '종료',
  RECALLED: '회수',

  // User
  INACTIVE: '비활성',
  SUSPENDED: '정지',
  WITHDRAWN: '탈퇴',

  // Banner / Popup / Notice
  SCHEDULED: '예약',

  // Inquiry / Qna
  WAITING: '대기',
  ANSWERED: '답변완료',
  CLOSED: '종료',

  // Refund
  FAILED: '실패',
  BLOCKED: '차단',

  // Misc
  DRAFT: '임시저장'
}

const resolvedTone = computed<NonNullable<Props['tone']>>(() => {
  if (props.tone) return props.tone
  if (props.status && TONE_MAP[props.status]) return TONE_MAP[props.status]!
  return 'default'
})

const resolvedLabel = computed(() => {
  if (props.label) return props.label
  if (props.status && LABEL_MAP[props.status]) return LABEL_MAP[props.status]
  return props.status ?? '-'
})

/**
 * 톤별 배경/글자/테두리 색상.
 * 다크모드: 진한 톤(900/30 alpha) + 밝은 글자(300) + 어두운 테두리(800) 조합.
 */
const CLASS_MAP: Record<NonNullable<Props['tone']>, string> = {
  default: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-200 dark:border-slate-700',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  warning: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  info: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  scheduled: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900',
  muted: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-800',
  danger: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
}

const DOT_CLASS_MAP: Record<NonNullable<Props['tone']>, string> = {
  default: 'bg-slate-400 dark:bg-slate-500',
  success: 'bg-emerald-500 dark:bg-emerald-400',
  warning: 'bg-amber-500 dark:bg-amber-400',
  info: 'bg-blue-500 dark:bg-blue-400',
  scheduled: 'bg-violet-500 dark:bg-violet-400',
  muted: 'bg-slate-300 dark:bg-slate-600',
  danger: 'bg-rose-500 dark:bg-rose-400'
}

const SIZE_CLASS_MAP: Record<NonNullable<Props['size']>, string> = {
  sm: 'px-1.5 py-0.5 text-[11px] gap-1',
  md: 'px-2 py-0.5 text-xs gap-1.5'
}
</script>

<template>
  <span
    class="inline-flex items-center rounded-md border font-medium whitespace-nowrap"
    :class="[CLASS_MAP[resolvedTone], SIZE_CLASS_MAP[size]]"
  >
    <span v-if="dot" class="h-1.5 w-1.5 rounded-full shrink-0" :class="DOT_CLASS_MAP[resolvedTone]" />
    {{ resolvedLabel }}
  </span>
</template>
