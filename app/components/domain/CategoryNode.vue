<script setup lang="ts">
/**
 * 카테고리 트리 조회 노드 (재귀).
 *
 * 운영자 시선에서 의미 없는 내부 정보(`#id`, `sort N`)는 노출하지 않음.
 * 대신 한눈에 가치 있는 정보만:
 *  - 카테고리명 (메인)
 *  - 썸네일 (있을 때)
 *  - 하위 개수 (있을 때, "하위 N개")
 *  - 계층 (들여쓰기)
 */
interface Category {
  id: number | null
  name: string
  sortOrder?: number
  imageUrl?: string | null
  children?: Category[]
}

const props = defineProps<{ category: Category, depth: number }>()

const expanded = ref(true)
const hasChildren = computed(() => (props.category.children?.length ?? 0) > 0)
const childCount = computed(() => props.category.children?.length ?? 0)
</script>

<template>
  <li>
    <div
      class="flex items-center gap-3 px-3 sm:px-5 py-3 hover:bg-muted/40 transition-colors"
      :style="{ paddingLeft: `${depth * 24 + 12}px` }"
    >
      <button
        class="h-6 w-6 shrink-0 grid place-items-center rounded text-muted-foreground hover:bg-muted/40"
        :class="hasChildren ? 'cursor-pointer' : 'opacity-30 cursor-default'"
        @click="hasChildren && (expanded = !expanded)"
      >
        <Icon
          :name="expanded ? 'lucide:chevron-down' : 'lucide:chevron-right'"
          size="16"
        />
      </button>
      <img
        v-if="category.imageUrl"
        :src="category.imageUrl"
        class="h-9 w-9 rounded object-cover border shrink-0"
      />
      <div v-else class="h-9 w-9 rounded bg-muted border shrink-0 grid place-items-center text-muted-foreground">
        <Icon :name="hasChildren ? 'lucide:folder' : 'lucide:folder-open'" size="16" />
      </div>
      <span class="flex-1 text-sm font-medium truncate">{{ category.name }}</span>
      <span
        v-if="hasChildren"
        class="shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5"
      >
        <Icon name="lucide:layers" size="11" />
        하위 {{ childCount }}개
      </span>
    </div>
    <ul v-if="hasChildren && expanded">
      <CategoryNode
        v-for="(child, i) in category.children"
        :key="child.id ?? `idx-${i}`"
        :category="child"
        :depth="depth + 1"
      />
    </ul>
  </li>
</template>
