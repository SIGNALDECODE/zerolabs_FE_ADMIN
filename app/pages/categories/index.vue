<script setup lang="ts">
import type { CategoryNode } from '~/types/content'
import type { CatNode, DragState, DropTarget, DropPosition } from '~/components/domain/CategoryTreeEditor.vue'

useHead({ title: '카테고리 관리 | ZeroLabs Admin' })
definePageMeta({ layout: 'default' })

const categoryApi = useAdminCategory()
const toast = useToast()
const confirm = useConfirm()

interface CategoryPayloadNode {
  id: number | null
  name: string
  sortOrder: number
  imageIndex: number | null
  children: CategoryPayloadNode[]
}

/** 신규 노드/기존 노드 모두 고유 식별 위해 부여. mutation 이후에도 안정. */
let uidCounter = 0
const nextUid = () => ++uidCounter

const tree = ref<CatNode[]>([])
const original = ref<CategoryNode[]>([])
const deletedIds = ref<number[]>([])
const loading = ref(false)
const saving = ref(false)
const editing = ref(false)

// ─── 드래그 상태 ─────────────────────────────────────────
const dragState = ref<DragState | null>(null)
const dropTarget = ref<DropTarget | null>(null)

// ─── 검색 ─────────────────────────────────────────────
const searchKeyword = ref('')
const searchActive = computed(() => searchKeyword.value.trim().length > 0)

const countDeep = (list: CatNode[]): number =>
  list.reduce((n, c) => n + 1 + (c.children?.length ? countDeep(c.children) : 0), 0)

const normalize = (list: CategoryNode[] | undefined): CatNode[] =>
  (list ?? []).map((c, i) => ({
    _uid: nextUid(),
    id: c.id ?? null,
    name: c.name ?? '',
    sortOrder: c.sortOrder ?? i,
    imageUrl: c.imageUrl ?? null,
    imageIndex: null,
    children: c.children?.length ? normalize(c.children) : [],
    _expanded: true
  }))

const load = async () => {
  loading.value = true
  try {
    original.value = await categoryApi.list()
    tree.value = normalize(original.value)
    deletedIds.value = []
  } finally { loading.value = false }
}

const total = computed(() => countDeep(tree.value))

const startEdit = () => { editing.value = true }
const cancelEdit = () => {
  editing.value = false
  tree.value = normalize(original.value)
  deletedIds.value = []
  searchKeyword.value = ''
}

// ─── 트리 mutation 헬퍼 ──────────────────────────────────
/** 트리 전체에서 uid 로 노드 + 부모 배열 + 자기 인덱스를 찾아 반환. */
const findNode = (
  list: CatNode[],
  uid: number
): { node: CatNode, parent: CatNode[], index: number } | null => {
  for (let i = 0; i < list.length; i++) {
    if (list[i]!._uid === uid) return { node: list[i]!, parent: list, index: i }
    const children = list[i]!.children
    if (children?.length) {
      const found = findNode(children, uid)
      if (found) return found
    }
  }
  return null
}

/** ancestor 후손 안에 target 이 있는지 검사 (자기 자신 포함). */
const isDescendantOrSelf = (ancestor: CatNode, targetUid: number): boolean => {
  if (ancestor._uid === targetUid) return true
  return !!ancestor.children?.some(c => isDescendantOrSelf(c, targetUid))
}

const reindexSortOrder = (list: CatNode[]) => {
  list.forEach((it, idx) => { it.sortOrder = idx })
}

// ─── 일반 액션 ───────────────────────────────────────────
const removeNode = async (node: CatNode, parent: CatNode[]) => {
  const ok = await confirm.ask('카테고리 삭제', {
    description: `"${node.name || '이름 없음'}"${node.children?.length ? ` 및 하위 ${countDeep(node.children)}개` : ''}를 삭제합니다. 저장 전까지는 실제 DB 에 반영되지 않습니다.`,
    confirmText: '삭제',
    tone: 'danger'
  })
  if (!ok) return
  if (node.id != null) {
    const collectIds = (n: CatNode) => {
      if (n.id != null) deletedIds.value.push(n.id)
      n.children?.forEach(collectIds)
    }
    collectIds(node)
  }
  const i = parent.indexOf(node)
  if (i >= 0) parent.splice(i, 1)
  reindexSortOrder(parent)
}

const addChild = (parent: CatNode[]) => {
  parent.push({
    _uid: nextUid(),
    id: null,
    name: '',
    sortOrder: parent.length,
    imageUrl: null,
    imageIndex: null,
    children: [],
    _expanded: true
  })
}

const addRoot = () => addChild(tree.value)

// ─── 드래그앤드롭 핸들러 ─────────────────────────────────
const onDragStart = (node: CatNode) => {
  dragState.value = { fromUid: node._uid }
  dropTarget.value = null
}

const onDragOver = (node: CatNode, position: DropPosition) => {
  if (!dragState.value) return
  // 자기 자신 또는 자기 후손 위에는 드롭 불가
  const found = findNode(tree.value, dragState.value.fromUid)
  if (found && isDescendantOrSelf(found.node, node._uid)) {
    dropTarget.value = null
    return
  }
  dropTarget.value = { toUid: node._uid, position }
}

const onDrop = () => {
  const drag = dragState.value
  const target = dropTarget.value
  if (!drag || !target) {
    dragState.value = null
    dropTarget.value = null
    return
  }

  const from = findNode(tree.value, drag.fromUid)
  const to = findNode(tree.value, target.toUid)
  if (!from || !to) {
    dragState.value = null
    dropTarget.value = null
    return
  }

  // 자기 자신/후손에는 드롭 불가 (방어적 재검증)
  if (isDescendantOrSelf(from.node, target.toUid)) {
    dragState.value = null
    dropTarget.value = null
    return
  }

  // 1) 원래 위치에서 제거
  from.parent.splice(from.index, 1)

  // 2) 대상 위치에 삽입 (제거 후 인덱스 재계산 — 같은 부모면 시프트)
  if (target.position === 'inside') {
    if (!to.node.children) to.node.children = []
    to.node.children.push(from.node)
    to.node._expanded = true
  } else {
    // 같은 부모에서 제거된 후 to.index 가 변할 수 있어 재조회
    const toAfter = findNode(tree.value, target.toUid)
    if (!toAfter) {
      // 복원 시도
      from.parent.splice(from.index, 0, from.node)
    } else {
      const insertIndex = target.position === 'before' ? toAfter.index : toAfter.index + 1
      toAfter.parent.splice(insertIndex, 0, from.node)
    }
  }

  // 3) 영향받은 부모들의 sortOrder 재계산
  reindexSortOrder(tree.value)
  const allParents = new Set<CatNode[]>()
  const collectParents = (list: CatNode[]) => {
    allParents.add(list)
    list.forEach(n => { if (n.children?.length) collectParents(n.children) })
  }
  collectParents(tree.value)
  allParents.forEach(reindexSortOrder)

  dragState.value = null
  dropTarget.value = null
}

const onDragEnd = () => {
  dragState.value = null
  dropTarget.value = null
}

// ─── 펼치기 / 접기 일괄 ──────────────────────────────────
const setExpandedAll = (list: CatNode[], v: boolean) => {
  list.forEach(n => {
    n._expanded = v
    if (n.children?.length) setExpandedAll(n.children, v)
  })
}
const expandAll = () => setExpandedAll(tree.value, true)
const collapseAll = () => setExpandedAll(tree.value, false)

// ─── 검색 ─────────────────────────────────────────────
/**
 * 검색 매칭 결과:
 *  - true: 직접 매칭 (강조)
 *  - false: 비매칭 (디밍)
 *  - null: 검색어 없음
 *
 * 매칭 조건: 자기 이름이 키워드 포함 OR 매칭된 자식이 있음 (트리에서 보이도록).
 * 매칭된 자식이 있는 경우 부모는 'parent-of-match' 라 디밍 안 함 (false 가 아닌 자체 false 도 아님 → null 처리)
 */
const matchUidSet = computed<Set<number> | null>(() => {
  if (!searchActive.value) return null
  const kw = searchKeyword.value.trim().toLowerCase()
  const set = new Set<number>()
  const visit = (list: CatNode[]): boolean => {
    let anyChild = false
    for (const n of list) {
      const selfMatch = n.name.toLowerCase().includes(kw)
      const childMatch = n.children?.length ? visit(n.children) : false
      if (selfMatch) set.add(n._uid)
      if (selfMatch || childMatch) {
        // 표시 유지를 위해 set 에는 자기 자신 포함 (parent-of-match 도)
        set.add(n._uid)
        anyChild = true
        // 매칭된 가지는 자동 펼침
        if (n.children?.length) n._expanded = true
      }
    }
    return anyChild
  }
  visit(tree.value)
  return set
})

const isMatch = (node: CatNode): boolean | null => {
  const set = matchUidSet.value
  if (!set) return null
  if (!set.has(node._uid)) return false
  // 직접 매칭 vs 부모-of-매칭 구분: 자기 이름이 키워드 포함이면 true, 아니면 null (디밍 안 함)
  return node.name.toLowerCase().includes(searchKeyword.value.trim().toLowerCase())
    ? true
    : null
}

// ─── 저장 payload 조립 ───────────────────────────────────
/**
 * 트리 순회하며 FormData 조립.
 * - imageFile 이 있는 노드: categoryImages 배열에 push + imageIndex = 해당 position
 * - imageUrl 도 없고 file 도 없는 노드: imageIndex = null (이미지 삭제로 해석)
 * - imageUrl 만 있는 기존 노드: imageIndex = null (백엔드가 기존 URL 유지)
 */
const buildPayload = (list: CatNode[], files: File[]): CategoryPayloadNode[] =>
  list.map((n, i) => {
    let imageIndex: number | null = null
    if (n.imageFile) {
      files.push(n.imageFile)
      imageIndex = files.length - 1
    }
    return {
      id: n.id,
      name: n.name,
      sortOrder: i,
      imageIndex,
      children: n.children?.length ? buildPayload(n.children, files) : []
    }
  })

const DELETE_FAIL_LABEL: Record<string, string> = {
  CATEGORY_HAS_PRODUCTS: '하위 상품 존재',
  CATEGORY_HAS_CHILDREN: '하위 카테고리 존재'
}

const summarizeFailures = (reasons: Record<string, string>, limit = 3): string => {
  const entries = Object.entries(reasons)
  const head = entries.slice(0, limit)
    .map(([id, code]) => `#${id} (${DELETE_FAIL_LABEL[code] ?? code})`)
    .join(', ')
  const rest = entries.length - head.length
  return rest > 0 ? `${head} 외 ${rest}건` : head
}

const save = async () => {
  const validateNames = (list: CatNode[]): boolean =>
    list.every(n => n.name.trim() && (!n.children?.length || validateNames(n.children)))
  if (!validateNames(tree.value)) {
    toast.error('비어있는 카테고리명이 있습니다.')
    return
  }
  saving.value = true
  try {
    const files: File[] = []
    const categoriesPayload = buildPayload(tree.value, files)
    const data = {
      categories: categoriesPayload,
      deletedIds: deletedIds.value
    }
    const fd = new FormData()
    fd.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }))
    for (const f of files) fd.append('categoryImages', f)
    const res = await categoryApi.sync(fd)
    editing.value = false

    const imageNote = files.length ? ` (이미지 ${files.length}개 업로드)` : ''
    if (res.failedIds.length > 0) {
      toast.warn(`동기화 완료 · 삭제 실패 ${res.failedIds.length}건: ${summarizeFailures(res.failedReasons)}${imageNote}`)
    } else {
      toast.success(`카테고리를 동기화했습니다.${imageNote}`)
    }
    await load()
  } catch (e) {
    toast.error(e, '저장 실패')
  } finally { saving.value = false }
}

onMounted(load)
</script>

<template>
  <div class="p-4 sm:p-8 max-w-4xl">
    <PageHeader icon="lucide:folder-tree" title="카테고리 관리" :description="`총 ${total}개 · 트리 구조`">
      <template #actions>
        <template v-if="!editing">
          <Button variant="outline" size="sm" @click="load">
            <Icon name="lucide:refresh-cw" size="14" class="mr-1" /> 새로고침
          </Button>
          <Button size="sm" @click="startEdit">
            <Icon name="lucide:pencil" size="14" class="mr-1" /> 편집
          </Button>
        </template>
      </template>
    </PageHeader>

    <Card v-if="!editing" class="mb-4">
      <CardContent class="pt-6">
        <p class="text-sm text-muted-foreground">
          <Icon name="lucide:info" size="14" class="inline mr-1" />
          편집 버튼을 누르면 카테고리 이름·이미지·순서·계층을 드래그로 변경할 수 있고, 삭제·신규 생성도 가능합니다.
        </p>
      </CardContent>
    </Card>

    <!-- 편집 모드 툴바: 펼치기/접기, 검색, 신규 추가 -->
    <Card v-if="editing" class="mb-4 border-amber-200 bg-amber-50/40">
      <CardContent class="pt-6 space-y-3">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="text-sm text-amber-800 inline-flex items-center gap-1.5">
            <Icon name="lucide:edit-3" size="14" />
            편집 모드 · 삭제 대기 <strong class="font-semibold">{{ deletedIds.length }}</strong>개
          </div>
          <div class="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" @click="expandAll">
              <Icon name="lucide:chevrons-down" size="14" class="mr-1" /> 모두 펼치기
            </Button>
            <Button variant="outline" size="sm" @click="collapseAll">
              <Icon name="lucide:chevrons-up" size="14" class="mr-1" /> 모두 접기
            </Button>
            <Button variant="outline" size="sm" @click="addRoot">
              <Icon name="lucide:plus" size="14" class="mr-1" /> 루트 추가
            </Button>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div class="relative flex-1 max-w-md">
            <Icon name="lucide:search" size="14" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              v-model="searchKeyword"
              class="h-8 pl-8 text-sm"
              placeholder="카테고리명으로 검색 (매칭된 가지는 자동 펼침)"
            />
            <button
              v-if="searchActive"
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center h-5 w-5 rounded-full hover:bg-muted text-muted-foreground"
              title="검색 초기화"
              @click="searchKeyword = ''"
            >
              <Icon name="lucide:x" size="12" />
            </button>
          </div>
          <p class="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Icon name="lucide:grip-vertical" size="12" />
            왼쪽 손잡이로 드래그 — 위/아래는 같은 레벨, 가운데는 하위로
          </p>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent class="p-0">
        <div v-if="loading" class="text-center text-muted-foreground py-10 text-sm">불러오는 중…</div>
        <div v-else-if="!tree.length && !editing" class="text-center text-muted-foreground py-10 text-sm">
          카테고리가 없습니다.
        </div>
        <div v-else-if="!tree.length && editing" class="p-8 text-center">
          <Button variant="outline" @click="addRoot">
            <Icon name="lucide:plus" size="14" class="mr-1" /> 첫 카테고리 추가
          </Button>
        </div>
        <template v-else>
          <!-- 편집 모드: 드래그 가능 트리 -->
          <CategoryTreeEditor
            v-if="editing"
            :nodes="tree"
            :depth="0"
            :drag-state="dragState"
            :drop-target="dropTarget"
            :is-match="isMatch"
            @remove="removeNode"
            @add-child="addChild"
            @drag-start="onDragStart"
            @drag-over="onDragOver"
            @drop="onDrop"
            @drag-end="onDragEnd"
          />
          <!-- 조회 모드 -->
          <ul v-else class="divide-y">
            <CategoryNode
              v-for="cat in tree"
              :key="cat.id ?? undefined"
              :category="cat"
              :depth="0"
            />
          </ul>
        </template>
      </CardContent>
    </Card>

    <div v-if="editing" class="flex justify-end gap-2 mt-4">
      <Button variant="outline" :disabled="saving" @click="cancelEdit">취소</Button>
      <Button :disabled="saving" @click="save">
        <Icon name="lucide:save" size="14" class="mr-1" /> 저장 ({{ total }}개 · 삭제 {{ deletedIds.length }})
      </Button>
    </div>
  </div>
</template>
