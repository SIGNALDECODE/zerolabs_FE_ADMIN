<script setup lang="ts">
/**
 * 목록/대시보드 등 최상위 페이지의 헤더.
 *
 * 시각 위계:
 *  - icon(선택)으로 페이지 종류를 한눈에
 *  - 큰 제목 + 보조 설명 + 우측 액션 영역
 *  - 하단 굵은 구분선으로 본문과 분리
 *
 * 반응형:
 *  - 모바일(<sm): 제목/액션이 세로로 쌓이고 액션은 wrap. 아이콘·제목 작게.
 *  - sm 이상: 한 줄로 정렬.
 */
defineProps<{
  title: string
  description?: string
  /** lucide 아이콘. 지정하면 제목 좌측에 색 박스로 표시 */
  icon?: string
}>()
</script>

<template>
  <header class="mb-5 sm:mb-6 pb-4 sm:pb-5 border-b-2">
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
      <div class="flex items-start gap-2.5 sm:gap-3 min-w-0">
        <span
          v-if="icon"
          class="grid place-items-center h-9 w-9 sm:h-11 sm:w-11 rounded-lg bg-primary/10 text-primary shrink-0 border border-primary/20"
        >
          <Icon :name="icon" :size="20" class="sm:[&]:hidden" />
          <Icon :name="icon" size="22" class="hidden sm:block" />
        </span>
        <div class="min-w-0">
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight truncate leading-tight">{{ title }}</h1>
          <p v-if="description" class="mt-1 text-xs sm:text-sm text-muted-foreground">{{ description }}</p>
        </div>
      </div>
      <div
        v-if="$slots.actions"
        class="flex items-center gap-2 flex-wrap shrink-0"
      >
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
