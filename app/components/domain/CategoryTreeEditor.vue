<script setup lang="ts">
interface CatNode {
  id: number | null
  name: string
  sortOrder: number
  imageUrl?: string | null
  imageIndex?: number | null
  imageFile?: File | null
  imagePreview?: string | null
  children?: CatNode[]
  _expanded?: boolean
}

defineProps<{ nodes: CatNode[], depth: number }>()
const emit = defineEmits<{
  (e: 'remove', node: CatNode, parent: CatNode[]): void
  (e: 'addChild', parent: CatNode[]): void
}>()

const moveUp = (list: CatNode[], i: number) => {
  if (i <= 0) return
  const [n] = list.splice(i, 1)
  list.splice(i - 1, 0, n!)
  list.forEach((it, idx) => { it.sortOrder = idx })
}
const moveDown = (list: CatNode[], i: number) => {
  if (i >= list.length - 1) return
  const [n] = list.splice(i, 1)
  list.splice(i + 1, 0, n!)
  list.forEach((it, idx) => { it.sortOrder = idx })
}

const onImage = (node: CatNode, e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  node.imageFile = file
  const reader = new FileReader()
  reader.onload = () => { node.imagePreview = reader.result as string }
  reader.readAsDataURL(file)
}

const clearImage = (node: CatNode) => {
  node.imageFile = null
  node.imagePreview = null
  node.imageUrl = null
}
</script>

<template>
  <ul class="divide-y">
    <li v-for="(node, i) in nodes" :key="node.id ?? `new-${i}`">
      <div
        class="flex items-center gap-2 px-4 py-2 hover:bg-muted/30"
        :style="{ paddingLeft: `${depth * 20 + 16}px` }"
      >
        <button
          type="button"
          class="h-5 w-5 shrink-0 grid place-items-center text-muted-foreground"
          :class="node.children?.length ? 'cursor-pointer' : 'opacity-30'"
          @click="node.children?.length && (node._expanded = !(node._expanded ?? true))"
        >
          <Icon
            :name="(node._expanded ?? true) ? 'lucide:chevron-down' : 'lucide:chevron-right'"
            size="14"
          />
        </button>

        <!-- 이미지 셀 -->
        <div class="relative shrink-0">
          <img
            v-if="node.imagePreview || node.imageUrl"
            :src="node.imagePreview || node.imageUrl || ''"
            class="h-8 w-8 rounded object-cover border"
          />
          <div v-else class="h-8 w-8 rounded bg-muted" />
          <label class="absolute inset-0 cursor-pointer" :title="node.imageFile ? '이미지 교체' : '이미지 업로드'">
            <input
              type="file"
              accept="image/*"
              class="sr-only"
              @change="(e: Event) => onImage(node, e)"
            />
          </label>
          <button
            v-if="node.imagePreview || node.imageUrl"
            type="button"
            class="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground grid place-items-center text-[10px] leading-none"
            title="이미지 제거"
            @click="clearImage(node)"
          >×</button>
        </div>

        <Input
          v-model="node.name"
          class="h-8 text-sm max-w-sm"
          placeholder="카테고리명"
        />
        <span v-if="node.id == null" class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">NEW</span>
        <span v-else class="text-xs text-muted-foreground font-mono">#{{ node.id }}</span>
        <span v-if="node.imageFile" class="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700" title="이미지 업로드 대기">IMG</span>

        <div class="ml-auto flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" class="h-7 w-7 p-0" :disabled="i === 0" @click="moveUp(nodes, i)">
            <Icon name="lucide:chevron-up" size="14" />
          </Button>
          <Button type="button" variant="ghost" size="sm" class="h-7 w-7 p-0" :disabled="i === nodes.length - 1" @click="moveDown(nodes, i)">
            <Icon name="lucide:chevron-down" size="14" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="h-7 px-2 text-xs"
            @click="emit('addChild', node.children = node.children ?? [])"
          >
            <Icon name="lucide:corner-down-right" size="12" class="mr-0.5" /> 하위
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="h-7 w-7 p-0 text-destructive"
            @click="emit('remove', node, nodes)"
          >
            <Icon name="lucide:trash-2" size="14" />
          </Button>
        </div>
      </div>

      <CategoryTreeEditor
        v-if="node.children?.length && (node._expanded ?? true)"
        :nodes="node.children"
        :depth="depth + 1"
        @remove="(n, p) => emit('remove', n, p)"
        @add-child="(p) => emit('addChild', p)"
      />
    </li>
  </ul>
</template>
