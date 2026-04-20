<script setup lang="ts">
interface Props {
  status?: string | null
  label?: string | null
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted'
}

const props = withDefaults(defineProps<Props>(), { tone: undefined })

const TONE_MAP: Record<string, Props['tone']> = {
  ACTIVE: 'success',
  PAID: 'success',
  COMPLETED: 'success',
  DELIVERED: 'success',
  APPROVED: 'success',
  ANSWERED: 'success',

  PENDING: 'warning',
  PREPARING: 'warning',
  REQUESTED: 'warning',
  IN_PROGRESS: 'warning',
  STOPPED: 'warning',
  REGISTERED: 'warning',
  WAITING: 'warning',

  SHIPPING: 'info',
  DRAFT: 'info',

  CANCELLED: 'muted',
  ENDED: 'muted',
  RECALLED: 'muted',
  DISCONTINUED: 'muted',
  INACTIVE: 'muted',
  WITHDRAWN: 'muted',

  REJECTED: 'danger',
  FAILED: 'danger',
  BLOCKED: 'danger'
}

const resolvedTone = computed<Props['tone']>(() => props.tone ?? (props.status ? TONE_MAP[props.status] : undefined) ?? 'default')

const CLASS_MAP: Record<string, string> = {
  default: 'bg-slate-100 text-slate-700 border-slate-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  info: 'bg-sky-50 text-sky-700 border-sky-200',
  muted: 'bg-slate-50 text-slate-500 border-slate-200'
}
</script>

<template>
  <span
    class="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap"
    :class="CLASS_MAP[resolvedTone!]"
  >
    {{ label ?? status ?? '-' }}
  </span>
</template>
