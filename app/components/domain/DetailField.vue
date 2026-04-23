<script setup lang="ts">
/**
 * DetailSection 안의 한 줄 — `라벨 / 값` 페어.
 *
 * 시각 위계:
 *  - 라벨: 작고 흐림 (uppercase 분위기 X — 한글 가독성 위해 일반)
 *  - 값: 한 단계 진하고 살짝 크게. 빈 값은 옅은 회색 `—` 로 표현
 *  - row 사이 점선 separator 로 가벼운 구분 (정보 밀도 유지)
 */
defineProps<{
  label: string
  value?: string | number | null
  mono?: boolean
  full?: boolean
}>()
</script>

<template>
  <div
    :class="[
      'py-2.5 grid grid-cols-[110px_1fr] gap-3 items-start text-sm border-b border-dashed border-border/50 last:border-0',
      full ? 'col-span-2' : ''
    ]"
  >
    <dt class="text-xs text-muted-foreground/90 pt-0.5 font-normal">{{ label }}</dt>
    <dd
      :class="[
        'break-all',
        mono ? 'font-mono text-xs text-foreground/90' : 'text-foreground font-medium'
      ]"
    >
      <slot>
        <template v-if="value == null || value === ''">
          <span class="text-muted-foreground/60">—</span>
        </template>
        <template v-else>{{ value }}</template>
      </slot>
    </dd>
  </div>
</template>
