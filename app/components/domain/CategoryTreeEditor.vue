<script setup lang="ts">
/**
 * 카테고리 트리 편집기 (드래그앤드롭).
 *
 * 사용법:
 *  - 부모(page) 가 드래그 상태(`dragState`, `dropTarget`) 와 mutation 함수를 소유
 *  - 자식 컴포넌트(이 컴포넌트) 는 props 로 받고 이벤트 emit
 *  - `_uid` 로 노드를 식별 (path 는 mutation 후 invalidate 됨)
 *
 * 드롭 위치 판정 (행 높이 기준):
 *  - 상단 33% → 'before' (현재 노드 앞에 같은 부모로 삽입)
 *  - 하단 33% → 'after' (현재 노드 뒤에 같은 부모로 삽입)
 *  - 중앙 34% → 'inside' (현재 노드의 자식으로 추가)
 *
 * 안전: 자기 자신/자기 후손으로의 드롭은 부모(page) 가 차단.
 */
export interface CatNode {
  _uid: number
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

export interface DragState { fromUid: number }
export type DropPosition = 'before' | 'after' | 'inside'
export interface DropTarget { toUid: number, position: DropPosition }

const props = defineProps<{
  nodes: CatNode[]
  depth: number
  dragState: DragState | null
  dropTarget: DropTarget | null
  /** 검색어 매칭 (true: 직접 매칭, false: 부모/자식 매칭으로 표시 유지, null: 검색어 없음) */
  isMatch?: (node: CatNode) => boolean | null
}>()

const emit = defineEmits<{
  (e: 'remove', node: CatNode, parent: CatNode[]): void
  (e: 'addChild', parent: CatNode[]): void
  (e: 'dragStart', node: CatNode): void
  (e: 'dragOver', node: CatNode, position: DropPosition): void
  (e: 'drop'): void
  (e: 'dragEnd'): void
}>()

const isDragging = (uid: number) => props.dragState?.fromUid === uid
const isDropTarget = (uid: number, pos: DropPosition) =>
  props.dropTarget?.toUid === uid && props.dropTarget?.position === pos

const getDropPosition = (e: DragEvent): DropPosition => {
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const y = e.clientY - rect.top
  const h = rect.height
  if (y < h * 0.33) return 'before'
  if (y > h * 0.67) return 'after'
  return 'inside'
}

const onDragStart = (node: CatNode, e: DragEvent) => {
  e.dataTransfer!.effectAllowed = 'move'
  // dataTransfer 에 무언가 setData 해야 일부 브라우저에서 dragstart 가 정상 발화
  e.dataTransfer!.setData('text/plain', String(node._uid))
  emit('dragStart', node)
}

const onDragOver = (node: CatNode, e: DragEvent) => {
  // 자기 자신 위에는 드롭 인디케이터 안 보이게
  if (props.dragState?.fromUid === node._uid) {
    e.dataTransfer!.dropEffect = 'none'
    return
  }
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'move'
  emit('dragOver', node, getDropPosition(e))
}

const onDrop = (node: CatNode, e: DragEvent) => {
  if (props.dragState?.fromUid === node._uid) return
  e.preventDefault()
  e.stopPropagation()
  emit('drop')
}

const onDragEnd = () => emit('dragEnd')

/**
 * 같은 부모 내 위/아래 이동 — 드래그 보조용 (모바일·접근성).
 * props.nodes 는 reactive 배열이라 in-place splice 로 부모(page) 까지 자동 반영.
 */
const moveUp = (i: number) => {
  if (i <= 0) return
  const [n] = props.nodes.splice(i, 1)
  props.nodes.splice(i - 1, 0, n!)
  props.nodes.forEach((it, idx) => { it.sortOrder = idx })
}
const moveDown = (i: number) => {
  if (i >= props.nodes.length - 1) return
  const [n] = props.nodes.splice(i, 1)
  props.nodes.splice(i + 1, 0, n!)
  props.nodes.forEach((it, idx) => { it.sortOrder = idx })
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

/** 검색 디밍: 매칭 결과가 false 인 노드는 흐리게 (부모/검색어 없을 땐 평소대로) */
const matchClass = (node: CatNode): string => {
  if (!props.isMatch) return ''
  const m = props.isMatch(node)
  if (m === false) return 'opacity-40'
  if (m === true) return 'bg-amber-50/60'
  return ''
}
</script>

<template>
  <ul class="divide-y">
    <li v-for="(node, i) in nodes" :key="node._uid">
      <!-- 행: 드롭 영역 + 드래그 핸들 -->
      <div
        class="relative group"
        @dragover="(e) => onDragOver(node, e)"
        @drop="(e) => onDrop(node, e)"
        @dragend="onDragEnd"
      >
        <!-- 드롭 인디케이터: 위 / 아래 가로 라인 -->
        <span
          v-if="isDropTarget(node._uid, 'before')"
          class="absolute -top-px left-0 right-0 h-0.5 bg-primary z-10 pointer-events-none"
          aria-hidden="true"
        />
        <span
          v-if="isDropTarget(node._uid, 'after')"
          class="absolute -bottom-px left-0 right-0 h-0.5 bg-primary z-10 pointer-events-none"
          aria-hidden="true"
        />

        <div
          class="flex items-center gap-2.5 px-3 sm:px-5 py-3 transition-colors"
          :class="[
            isDropTarget(node._uid, 'inside') ? 'bg-primary/10 ring-1 ring-primary/40' : 'hover:bg-muted/30',
            isDragging(node._uid) ? 'opacity-40' : '',
            matchClass(node)
          ]"
          :style="{ paddingLeft: `${depth * 24 + 12}px` }"
        >
          <!-- 드래그 핸들 (이 영역만 draggable) -->
          <div
            :draggable="true"
            class="shrink-0 grid place-items-center h-9 w-6 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-foreground hover:bg-muted/40 rounded"
            title="드래그하여 순서/계층 변경"
            @dragstart="(e) => onDragStart(node, e)"
          >
            <Icon name="lucide:grip-vertical" size="16" />
          </div>

          <!-- 펼침/접힘 -->
          <button
            type="button"
            class="h-6 w-6 shrink-0 grid place-items-center rounded text-muted-foreground hover:bg-muted/40"
            :class="node.children?.length ? 'cursor-pointer' : 'opacity-30 cursor-default'"
            @click="node.children?.length && (node._expanded = !(node._expanded ?? true))"
          >
            <Icon
              :name="(node._expanded ?? true) ? 'lucide:chevron-down' : 'lucide:chevron-right'"
              size="16"
            />
          </button>

          <!-- 이미지 셀 -->
          <div class="relative shrink-0">
            <img
              v-if="node.imagePreview || node.imageUrl"
              :src="node.imagePreview || node.imageUrl || ''"
              class="h-10 w-10 rounded object-cover border"
            />
            <div v-else class="h-10 w-10 rounded bg-muted border" />
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
            class="h-9 text-sm max-w-sm"
            placeholder="카테고리명"
          />
          <!-- 신규: 저장 전이라는 시각 cue -->
          <span
            v-if="node.id == null"
            class="shrink-0 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            <Icon name="lucide:sparkles" size="11" />
            새 항목
          </span>
          <!-- 이미지 업로드 대기: 저장 시 함께 업로드된다는 안내 -->
          <span
            v-if="node.imageFile"
            class="shrink-0 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
            title="저장 시 이미지가 업로드됩니다"
          >
            <Icon name="lucide:upload" size="11" />
            이미지 대기
          </span>
          <!-- 하위 개수 (있을 때만, 접혀 있어도 한눈에 파악) -->
          <span
            v-if="node.children?.length"
            class="shrink-0 inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5"
            :title="`하위 카테고리 ${node.children.length}개`"
          >
            <Icon name="lucide:layers" size="11" />
            {{ node.children.length }}
          </span>

          <div class="ml-auto flex items-center gap-1">
            <!-- 위/아래 화살표: 모바일·접근성 보조 (드래그 어려운 환경) -->
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="h-8 w-8 p-0"
              title="위로 이동"
              :disabled="i === 0"
              @click="moveUp(i)"
            >
              <Icon name="lucide:chevron-up" size="14" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="h-8 w-8 p-0"
              title="아래로 이동"
              :disabled="i === nodes.length - 1"
              @click="moveDown(i)"
            >
              <Icon name="lucide:chevron-down" size="14" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="h-8 px-2 text-xs"
              title="하위 카테고리 추가"
              @click="emit('addChild', node.children = node.children ?? [])"
            >
              <Icon name="lucide:corner-down-right" size="13" class="sm:mr-0.5" />
              <span class="hidden sm:inline">하위</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="h-8 w-8 p-0 text-destructive"
              title="카테고리 삭제"
              @click="emit('remove', node, nodes)"
            >
              <Icon name="lucide:trash-2" size="15" />
            </Button>
          </div>
        </div>
      </div>

      <CategoryTreeEditor
        v-if="node.children?.length && (node._expanded ?? true)"
        :nodes="node.children"
        :depth="depth + 1"
        :drag-state="dragState"
        :drop-target="dropTarget"
        :is-match="isMatch"
        @remove="(n, p) => emit('remove', n, p)"
        @add-child="(p) => emit('addChild', p)"
        @drag-start="(n) => emit('dragStart', n)"
        @drag-over="(n, pos) => emit('dragOver', n, pos)"
        @drop="emit('drop')"
        @drag-end="emit('dragEnd')"
      />
    </li>
  </ul>
</template>
