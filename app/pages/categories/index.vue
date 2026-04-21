<script setup lang="ts">
import type { CategoryNode } from '~/types/content'

useHead({ title: '카테고리 관리 | ZeroLabs Admin' })
definePageMeta({ layout: 'default' })

const categoryApi = useAdminCategory()
const toast = useToast()
const confirm = useConfirm()

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

interface CategoryPayloadNode {
  id: number | null
  name: string
  sortOrder: number
  imageIndex: number | null
  children: CategoryPayloadNode[]
}

const tree = ref<CatNode[]>([])
const original = ref<CategoryNode[]>([])
const deletedIds = ref<number[]>([])
const loading = ref(false)
const saving = ref(false)
const editing = ref(false)

const countDeep = (list: CatNode[]): number =>
  list.reduce((n, c) => n + 1 + (c.children?.length ? countDeep(c.children) : 0), 0)

const normalize = (list: CategoryNode[] | undefined): CatNode[] =>
  (list ?? []).map((c, i) => ({
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
}

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
  parent.forEach((it, idx) => { it.sortOrder = idx })
}

const addChild = (parent: CatNode[]) => {
  parent.push({
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

/**
 * 트리 순회하며 FormData 조립.
 * - imageFile 이 있는 노드: categoryImages 배열에 push + imageIndex = 해당 position
 * - imageUrl 도 없고 file 도 없는 노드: imageIndex = null (이미지 삭제로 해석)
 * - imageUrl 만 있는 기존 노드: imageIndex = null (백엔드가 기존 URL 유지)
 *
 * NOTE: 백엔드는 imageIndex=null 을 "이미지 없음" 과 "유지" 중 어느 쪽으로 해석하는지 확인 필요.
 * 현재는 기존 imageUrl 은 유지되는 것을 기대 (sync API 동작).
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

/** 백엔드 CategoryException 에러 코드 → 한글 라벨. 미매핑 코드는 원본 노출. */
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
      // 생성/수정은 모두 성공했지만 일부 삭제가 실패한 케이스.
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
  <div class="p-8 max-w-4xl">
    <PageHeader title="카테고리 관리" :description="`총 ${total}개 · 트리 구조`">
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
          편집 버튼을 누르면 카테고리 이름 · 순서 · 삭제 · 신규 생성이 가능합니다. 저장 시 전체 트리가 동기화됩니다.
        </p>
      </CardContent>
    </Card>

    <Card v-if="editing" class="mb-4 border-amber-200 bg-amber-50/50">
      <CardContent class="pt-6 flex items-center justify-between flex-wrap gap-2">
        <div class="text-sm text-amber-800">
          <Icon name="lucide:edit-3" size="14" class="inline mr-1" />
          편집 모드 · 삭제 대기 {{ deletedIds.length }}개
        </div>
        <div class="flex gap-2">
          <Button variant="outline" size="sm" @click="addRoot">
            <Icon name="lucide:plus" size="14" class="mr-1" /> 루트 카테고리 추가
          </Button>
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
          <!-- 편집 모드 -->
          <CategoryTreeEditor
            v-if="editing"
            :nodes="tree"
            :depth="0"
            @remove="removeNode"
            @add-child="addChild"
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
