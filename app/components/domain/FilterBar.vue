<script setup lang="ts">
/**
 * 목록 페이지 필터 행.
 *
 * 시각 위계:
 *  - 좌측 작은 "필터" 라벨 + 아이콘 → "여기서 검색·필터" 즉시 인지
 *  - 살짝 다른 배경 (muted/30) 으로 본문 테이블과 구분
 *
 * 인터랙션:
 *  - 자식 슬롯의 input 에서 Enter 누르면 자동으로 `search` emit
 *    textarea / button 의 Enter 는 native 동작 보존
 *
 * 반응형:
 *  - 모바일: "필터" 라벨 숨김. 자식 input/select 가 가로 wrap. 검색 버튼은 우측 정렬.
 *  - md 이상: 필터 라벨 + 자식 가로 정렬.
 */
const emit = defineEmits<{ search: [] }>()

const onKeydown = (e: KeyboardEvent) => {
  if (e.key !== 'Enter') return
  const target = e.target as HTMLElement | null
  if (!target) return
  if (target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') return
  if (e.isComposing) return
  e.preventDefault()
  emit('search')
}
</script>

<template>
  <Card class="mb-4 bg-muted/30 border-dashed">
    <CardContent class="py-3 px-3 sm:py-4 sm:px-4">
      <div class="flex items-start sm:items-center gap-2 sm:gap-3">
        <span class="hidden md:inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground shrink-0 pr-3 border-r border-border/60">
          <Icon name="lucide:filter" size="13" />
          필터
        </span>
        <div
          class="flex flex-wrap items-center gap-2 flex-1 min-w-0"
          @keydown="onKeydown"
        >
          <slot />
          <div class="ml-auto flex items-center gap-2">
            <slot name="actions">
              <Button type="button" size="sm" @click="$emit('search')">
                <Icon name="lucide:search" size="14" class="mr-1" /> 검색
              </Button>
            </slot>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
