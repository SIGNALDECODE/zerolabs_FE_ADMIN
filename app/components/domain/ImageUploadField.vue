<script setup lang="ts">
/**
 * 이미지 URL 입력 + 업로드 공용 필드.
 * - v-model: 이미지 URL 문자열 (빈 문자열 허용)
 * - 기본 모드: 파일 업로드. 토글로 URL 직접 입력도 가능 (운영 fallback)
 * - 업로드 성공 시 `emit('update:modelValue', res.url)` 호출
 * - 클라이언트 선검증: MIME 타입 / 파일 크기
 */
interface Props {
  modelValue: string
  placeholder?: string
  accept?: string
  maxSizeMb?: number
  previewClass?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'https://cdn.example.com/image.jpg',
  accept: 'image/jpeg,image/png,image/gif,image/webp',
  maxSizeMb: 10,
  previewClass: 'max-h-40',
  disabled: false
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const imageApi = useAdminImage()
const toast = useToast()

const mode = ref<'upload' | 'url'>('upload')
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

/**
 * URL 모드 검증 상태:
 * - null: 검증 전 (입력 중)
 * - true: 이미지 로드 성공 (또는 빈 값)
 * - false: 형식 오류 또는 이미지 로드 실패
 */
const urlValid = ref<boolean | null>(null)
const URL_PATTERN = /^https?:\/\/.+/i

const validateUrlFormat = (url: string): boolean => !url || URL_PATTERN.test(url.trim())

watch(() => props.modelValue, (v) => {
  // 값이 비거나 형식 오류면 즉시 결정. 형식 OK 면 img load/error 결과를 기다림.
  if (!v) urlValid.value = true
  else if (!validateUrlFormat(v)) urlValid.value = false
  else urlValid.value = null
}, { immediate: true })

const acceptList = computed(() => props.accept.split(',').map(s => s.trim()).filter(Boolean))

const validate = (file: File): string | null => {
  if (acceptList.value.length && !acceptList.value.includes(file.type)) {
    return `지원하지 않는 형식입니다. (${acceptList.value.join(', ')})`
  }
  if (file.size > props.maxSizeMb * 1024 * 1024) {
    return `${props.maxSizeMb}MB 이하 파일만 업로드할 수 있습니다.`
  }
  return null
}

const onFileChange = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const err = validate(file)
  if (err) {
    toast.error(err)
    if (fileInput.value) fileInput.value.value = ''
    return
  }

  uploading.value = true
  try {
    const res = await imageApi.upload(file)
    emit('update:modelValue', res.url)
  } catch (e) {
    toast.error(e, '업로드 실패')
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

const pick = () => {
  if (props.disabled || uploading.value) return
  fileInput.value?.click()
}

const clear = () => emit('update:modelValue', '')

const onUrlInput = (v: string) => emit('update:modelValue', v)

const toggleMode = () => {
  mode.value = mode.value === 'upload' ? 'url' : 'upload'
}
</script>

<template>
  <div class="space-y-2">
    <!-- 업로드 모드 -->
    <div v-if="mode === 'upload'" class="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        :disabled="disabled || uploading"
        @click="pick"
      >
        <Icon v-if="uploading" name="lucide:loader-2" size="14" class="mr-1 animate-spin" />
        <Icon v-else name="lucide:upload" size="14" class="mr-1" />
        {{ uploading ? '업로드 중…' : (modelValue ? '다른 이미지 선택' : '이미지 업로드') }}
      </Button>
      <Button
        v-if="modelValue"
        type="button"
        variant="ghost"
        size="sm"
        class="text-destructive"
        :disabled="disabled || uploading"
        @click="clear"
      >
        <Icon name="lucide:x" size="14" class="mr-1" />
        제거
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        class="ml-auto text-xs text-muted-foreground"
        :disabled="disabled"
        @click="toggleMode"
      >
        <Icon name="lucide:link" size="12" class="mr-1" />
        URL 직접 입력
      </Button>
      <input
        ref="fileInput"
        type="file"
        :accept="accept"
        class="hidden"
        @change="onFileChange"
      />
    </div>

    <!-- URL 직접 입력 모드 -->
    <div v-else class="flex items-center gap-2">
      <Input
        :model-value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        maxlength="500"
        class="flex-1"
        @update:model-value="onUrlInput($event as string)"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        class="text-xs text-muted-foreground"
        :disabled="disabled"
        @click="toggleMode"
      >
        <Icon name="lucide:upload" size="12" class="mr-1" />
        파일 업로드
      </Button>
    </div>

    <!-- 미리보기 -->
    <div v-if="modelValue && urlValid !== false" class="rounded-md border bg-muted/30 p-2">
      <img
        :src="modelValue"
        :class="['rounded object-contain', previewClass]"
        @load="urlValid = true"
        @error="urlValid = false"
      />
      <p class="mt-1 truncate font-mono text-[10px] text-muted-foreground">{{ modelValue }}</p>
    </div>
    <div
      v-else-if="modelValue && urlValid === false"
      class="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive"
    >
      <Icon name="lucide:alert-triangle" size="14" class="shrink-0 mt-0.5" />
      <div class="min-w-0">
        <p class="font-medium">이미지를 불러올 수 없습니다.</p>
        <p class="mt-0.5 truncate font-mono text-[10px] opacity-80">{{ modelValue }}</p>
        <p class="mt-0.5 opacity-80">URL 형식 (http/https) 과 접근 가능 여부를 확인하세요.</p>
      </div>
    </div>
    <div v-else class="flex items-center justify-center rounded-md border border-dashed py-6 text-xs text-muted-foreground">
      <Icon name="lucide:image" size="14" class="mr-1" />
      이미지 없음
    </div>
  </div>
</template>
