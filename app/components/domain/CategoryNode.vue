<script setup lang="ts">
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
</script>

<template>
  <li>
    <div
      class="flex items-center gap-2 px-4 py-2.5 hover:bg-muted/40"
      :style="{ paddingLeft: `${depth * 20 + 16}px` }"
    >
      <button
        class="h-5 w-5 shrink-0 grid place-items-center text-muted-foreground"
        :class="hasChildren ? 'cursor-pointer' : 'opacity-30'"
        @click="hasChildren && (expanded = !expanded)"
      >
        <Icon
          :name="expanded ? 'lucide:chevron-down' : 'lucide:chevron-right'"
          size="14"
        />
      </button>
      <img
        v-if="category.imageUrl"
        :src="category.imageUrl"
        class="h-6 w-6 rounded object-cover border"
      />
      <div v-else class="h-6 w-6 rounded bg-muted" />
      <span class="flex-1 text-sm font-medium truncate">{{ category.name }}</span>
      <span class="text-xs text-muted-foreground font-mono">#{{ category.id }}</span>
      <Badge v-if="category.sortOrder !== undefined" variant="outline" class="text-[10px]">
        sort {{ category.sortOrder }}
      </Badge>
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
