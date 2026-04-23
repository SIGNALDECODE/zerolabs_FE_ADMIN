<script setup lang="ts">
import type { DisplaySection } from '~/composables/useAdminDisplay'

// Input v-model 바인딩용 non-null 문자열 필드
interface DisplaySectionForm extends Omit<DisplaySection, 'title' | 'subtitle' | 'description' | 'linkUrl'> {
  title: string
  subtitle: string
  description: string
  linkUrl: string
}

useHead({ title: '전시 섹션 | ZeroLabs Admin' })
definePageMeta({ layout: 'default' })

const displayApi = useAdminDisplay()
const toast = useToast()

const sections = ref<DisplaySectionForm[]>([])
const loading = ref(false)
const saving = ref(false)
const editing = ref(false)

const bannerFile = ref<File | null>(null)
const bannerPreview = ref<string>('')

const load = async () => {
  loading.value = true
  try {
    const data = await displayApi.list()
    // Input v-model 이 null 을 받지 못하므로 빈 문자열로 정규화
    sections.value = data
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map(s => ({
        ...s,
        title: s.title ?? '',
        subtitle: s.subtitle ?? '',
        description: s.description ?? '',
        linkUrl: s.linkUrl ?? ''
      }))
    bannerFile.value = null
    bannerPreview.value = ''
  } finally { loading.value = false }
}

const startEdit = () => { editing.value = true }
const cancelEdit = () => { editing.value = false; load() }

const moveUp = (i: number) => {
  if (i <= 0) return
  const [n] = sections.value.splice(i, 1)
  sections.value.splice(i - 1, 0, n!)
  sections.value.forEach((s, idx) => { s.sortOrder = idx })
}
const moveDown = (i: number) => {
  if (i >= sections.value.length - 1) return
  const [n] = sections.value.splice(i, 1)
  sections.value.splice(i + 1, 0, n!)
  sections.value.forEach((s, idx) => { s.sortOrder = idx })
}

const onBannerChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  bannerFile.value = file
  const reader = new FileReader()
  reader.onload = () => { bannerPreview.value = reader.result as string }
  reader.readAsDataURL(file)
}

const save = async () => {
  saving.value = true
  try {
    // 백엔드는 List<DisplaySectionUpdateRequest> 를 직접 받음 (배열, 래핑 X)
    const data = sections.value.map((s, i) => ({
      id: s.id,
      sortOrder: i,
      isActive: s.isActive ?? true,
      title: s.title ?? null,
      description: s.description ?? null,
      subtitle: s.subtitle ?? null,
      linkUrl: s.linkUrl ?? null
    }))
    const fd = new FormData()
    fd.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }))
    if (bannerFile.value) fd.append('bannerImage', bannerFile.value)
    await displayApi.update(fd)
    toast.success(`전시 섹션을 저장했습니다.${bannerFile.value ? ' (배너 이미지 업로드됨)' : ''}`)
    editing.value = false
    await load()
  } catch (e) {
    toast.error(e, '저장 실패')
  } finally { saving.value = false }
}

onMounted(load)

const recommendedSection = computed(() =>
  sections.value.find(s => s.keywordCode === 'RECOMMENDED' || s.keywordCode === 'FEATURED' || /recommend/i.test(String(s.keywordCode ?? '')))
)
</script>

<template>
  <div class="p-4 sm:p-8 max-w-4xl">
    <PageHeader icon="lucide:layers" title="전시 섹션" :description="`${sections.length}개 섹션`">
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

    <Card v-if="editing && recommendedSection" class="mb-4 border-sky-200 bg-sky-50/40">
      <CardContent class="pt-6">
        <Label class="mb-2 block text-xs">추천상품 섹션 배너 이미지</Label>
        <p class="mb-3 text-xs text-muted-foreground">
          <Icon name="lucide:info" size="12" class="inline mr-1" />
          추천상품 섹션({{ recommendedSection.title || recommendedSection.keyword }}) 에 사용됩니다. 교체 시에만 선택하세요.
        </p>
        <div class="flex items-start gap-3">
          <div class="shrink-0">
            <img
              v-if="bannerPreview"
              :src="bannerPreview"
              class="w-48 h-24 rounded object-cover border"
            />
            <img
              v-else-if="recommendedSection.bannerImageUrl"
              :src="recommendedSection.bannerImageUrl"
              class="w-48 h-24 rounded object-cover border"
            />
            <div v-else class="w-48 h-24 rounded border bg-muted grid place-items-center text-xs text-muted-foreground">없음</div>
          </div>
          <div class="flex-1">
            <input type="file" accept="image/*" class="text-xs" @change="onBannerChange" />
            <p v-if="bannerFile" class="mt-2 text-xs text-sky-700">
              <Icon name="lucide:paperclip" size="12" class="inline mr-1" />
              업로드 대기: {{ bannerFile.name }}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent class="p-0">
        <div v-if="loading" class="text-center text-muted-foreground py-10 text-sm">불러오는 중…</div>
        <div v-else-if="!sections.length" class="text-center text-muted-foreground py-10 text-sm">
          전시 섹션이 없습니다.
        </div>
        <ul v-else class="divide-y">
          <li
            v-for="(s, i) in sections"
            :key="s.id"
            class="p-4"
          >
            <div class="flex items-start gap-4">
              <div class="shrink-0 grid place-items-center w-10 h-10 rounded bg-muted text-sm font-mono text-muted-foreground">
                {{ i + 1 }}
              </div>
              <img
                v-if="s.bannerImageUrl"
                :src="s.bannerImageUrl"
                class="w-32 h-16 rounded object-cover border shrink-0"
              />

              <div class="flex-1 min-w-0 space-y-2">
                <div class="flex items-center gap-2">
                  <Badge variant="outline" class="font-mono text-[10px]">{{ s.keywordCode }}</Badge>
                  <span class="text-xs text-muted-foreground">{{ s.keyword }}</span>
                </div>

                <template v-if="editing">
                  <div class="grid grid-cols-2 gap-2">
                    <Input v-model="s.title" class="h-8 text-sm" placeholder="타이틀" />
                    <Input v-model="s.subtitle" class="h-8 text-sm" placeholder="부제목 (선택)" />
                  </div>
                  <Input v-model="s.description" class="h-8 text-sm" placeholder="설명 (선택)" />
                  <Input v-model="s.linkUrl" class="h-8 text-sm font-mono text-xs" placeholder="https://... (선택)" />
                  <label class="inline-flex items-center gap-2 text-sm cursor-pointer mt-1">
                    <input v-model="s.isActive" type="checkbox" class="h-4 w-4" />
                    활성 (메인 노출)
                  </label>
                </template>

                <template v-else>
                  <h3 class="font-medium">{{ s.title || '(제목 없음)' }}</h3>
                  <p v-if="s.subtitle" class="text-sm text-foreground/80">{{ s.subtitle }}</p>
                  <p v-if="s.description" class="text-xs text-muted-foreground">{{ s.description }}</p>
                  <a
                    v-if="s.linkUrl"
                    :href="s.linkUrl"
                    target="_blank"
                    rel="noopener"
                    class="text-xs text-blue-600 hover:underline font-mono inline-block"
                  >
                    {{ s.linkUrl }}
                  </a>
                </template>
              </div>

              <div class="shrink-0 flex flex-col items-end gap-1">
                <StatusBadge
                  :label="s.isActive ? '활성' : '비활성'"
                  :status="s.isActive ? 'ACTIVE' : 'INACTIVE'"
                />
                <div v-if="editing" class="flex items-center gap-1 mt-1">
                  <Button variant="ghost" size="sm" class="h-7 w-7 p-0" :disabled="i === 0" @click="moveUp(i)">
                    <Icon name="lucide:chevron-up" size="14" />
                  </Button>
                  <Button variant="ghost" size="sm" class="h-7 w-7 p-0" :disabled="i === sections.length - 1" @click="moveDown(i)">
                    <Icon name="lucide:chevron-down" size="14" />
                  </Button>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </CardContent>
    </Card>

    <div v-if="editing" class="flex justify-end gap-2 mt-4">
      <Button variant="outline" :disabled="saving" @click="cancelEdit">취소</Button>
      <Button :disabled="saving" @click="save">
        <Icon name="lucide:save" size="14" class="mr-1" /> 저장
      </Button>
    </div>
  </div>
</template>
