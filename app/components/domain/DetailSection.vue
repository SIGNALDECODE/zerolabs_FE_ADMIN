<script setup lang="ts">
/**
 * 상세 화면의 섹션 카드.
 *
 * 시각 위계:
 *  - 헤더에 옅은 muted 배경 띠 → "여기서부터 한 묶음" 즉시 인지
 *  - 좌측 primary 색 바 → 카드/섹션의 시작점 강조
 *  - 아이콘(선택) → 섹션 종류 직관 표현
 *  - 본문 padding 충분히 → 정보 뭉침 방지
 */
defineProps<{
  title: string
  description?: string
  /** lucide 아이콘 이름. 지정하면 헤더에 작은 박스로 표시 */
  icon?: string
}>()
</script>

<template>
  <Card class="overflow-hidden">
    <CardHeader class="bg-muted/30 border-b py-3 px-4">
      <div class="flex items-center gap-2.5">
        <span class="h-5 w-1 bg-primary rounded-full shrink-0" aria-hidden="true" />
        <span
          v-if="icon"
          class="grid place-items-center h-6 w-6 rounded-md bg-background border text-muted-foreground shrink-0"
        >
          <Icon :name="icon" size="13" />
        </span>
        <CardTitle class="text-sm font-semibold tracking-tight">{{ title }}</CardTitle>
        <span v-if="description" class="text-xs text-muted-foreground ml-1">· {{ description }}</span>
      </div>
    </CardHeader>
    <CardContent class="p-5">
      <dl class="grid gap-x-8 grid-cols-1 md:grid-cols-2">
        <slot />
      </dl>
      <div
        v-if="$slots.footer"
        class="mt-5 pt-4 border-t flex flex-wrap gap-2 justify-end"
      >
        <slot name="footer" />
      </div>
    </CardContent>
  </Card>
</template>
