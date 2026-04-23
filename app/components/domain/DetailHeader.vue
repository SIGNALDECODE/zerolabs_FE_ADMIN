<script setup lang="ts">
/**
 * 상세/편집 화면의 헤더.
 *
 * 시각 위계:
 *  - 상단 "← 목록으로" 링크 (뒤로가기 명확)
 *  - 큰 제목 + 부제(ID/메타) 우측에 액션 그룹
 *  - 액션 영역 (수정/삭제 등) 은 visual group 으로 묶음
 *
 * 반응형:
 *  - 모바일(<sm): 제목/액션이 세로로. 액션은 wrap.
 *    좌측 dashed 구분선은 데스크톱에만 (모바일에선 의미 없음)
 *  - sm 이상: 한 줄로 정렬.
 */
interface Props {
  title: string
  subtitle?: string | null
  /** 뒤로 갈 경로. 미지정 시 router.back() */
  backTo?: string
  /** 뒤로가기 라벨 — "주문 목록으로" 처럼 명시하면 더 직관적 */
  backLabel?: string
  /** lucide 아이콘. 자원 종류를 헤더에 작게 표시 */
  icon?: string
}

const props = defineProps<Props>()
const router = useRouter()

const goBack = () => {
  if (props.backTo) router.push(props.backTo)
  else router.back()
}
</script>

<template>
  <header class="mb-5 sm:mb-6 pb-4 sm:pb-5 border-b-2">
    <button
      type="button"
      class="inline-flex items-center gap-1 mb-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
      @click="goBack"
    >
      <Icon name="lucide:chevron-left" size="14" />
      {{ backLabel ?? '목록으로' }}
    </button>
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
      <div class="flex items-start gap-2.5 sm:gap-3 min-w-0">
        <span
          v-if="icon"
          class="grid place-items-center h-9 w-9 sm:h-11 sm:w-11 rounded-lg bg-primary/10 text-primary shrink-0 border border-primary/20"
        >
          <Icon :name="icon" size="20" class="sm:[&]:hidden" />
          <Icon :name="icon" size="22" class="hidden sm:block" />
        </span>
        <div class="min-w-0">
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight truncate leading-tight">{{ title }}</h1>
          <p v-if="subtitle" class="mt-1 text-xs text-muted-foreground font-mono break-all">{{ subtitle }}</p>
        </div>
      </div>
      <div
        v-if="$slots.actions"
        class="flex items-center gap-2 flex-wrap shrink-0 sm:pl-4 sm:border-l sm:border-dashed sm:border-border/60"
      >
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
