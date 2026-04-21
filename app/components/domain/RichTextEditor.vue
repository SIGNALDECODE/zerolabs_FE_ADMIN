<script setup lang="ts">
/**
 * HTML 기반 WYSIWYG 에디터 (Tiptap).
 * - v-model: HTML 문자열 (빈 문자열 허용)
 * - 이미지 업로드: 툴바 버튼 / 드래그앤드롭 / 클립보드 붙여넣기 모두 `useAdminImage().upload()` 로 위임
 * - shadcn Button/Icon + Tailwind 로 툴바. 컨텐츠 스타일은 파일 하단 scoped style.
 */
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'

interface Props {
  modelValue: string
  placeholder?: string
  editable?: boolean
  minHeight?: string
  maxSizeMb?: number
  acceptImage?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '내용을 입력하세요…',
  editable: true,
  minHeight: '320px',
  maxSizeMb: 10,
  acceptImage: 'image/jpeg,image/png,image/gif,image/webp'
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const imageApi = useAdminImage()
const toast = useToast()
const prompt = usePrompt()
const confirm = useConfirm()

const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const acceptList = computed(() => props.acceptImage.split(',').map(s => s.trim()).filter(Boolean))

const validateFile = (file: File): string | null => {
  if (acceptList.value.length && !acceptList.value.includes(file.type)) {
    return `지원하지 않는 이미지 형식입니다. (${acceptList.value.join(', ')})`
  }
  if (file.size > props.maxSizeMb * 1024 * 1024) {
    return `${props.maxSizeMb}MB 이하 이미지만 업로드할 수 있습니다.`
  }
  return null
}

const editor = useEditor({
  content: props.modelValue || '',
  editable: props.editable,
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: false
    }),
    Image.configure({
      inline: false,
      HTMLAttributes: { class: 'rte-image' }
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: {
        class: 'rte-link',
        rel: 'noopener noreferrer nofollow',
        target: '_blank'
      }
    }),
    Placeholder.configure({ placeholder: () => props.placeholder })
  ],
  editorProps: {
    attributes: {
      class: 'rte-content focus:outline-none',
      spellcheck: 'false'
    },
    handlePaste: (_view, event) => {
      const file = event.clipboardData?.files?.[0]
      if (!file || !file.type.startsWith('image/')) return false
      event.preventDefault()
      uploadAndInsert(file)
      return true
    },
    handleDrop: (_view, event) => {
      const file = event.dataTransfer?.files?.[0]
      if (!file || !file.type.startsWith('image/')) return false
      event.preventDefault()
      uploadAndInsert(file)
      return true
    }
  },
  onUpdate: ({ editor }) => {
    const html = editor.isEmpty ? '' : editor.getHTML()
    emit('update:modelValue', html)
  }
})

watch(() => props.modelValue, (v) => {
  const inst = editor.value
  if (!inst) return
  const current = inst.isEmpty ? '' : inst.getHTML()
  if ((v || '') === current) return
  inst.commands.setContent(v || '', { emitUpdate: false })
})

watch(() => props.editable, (v) => { editor.value?.setEditable(v) })

onBeforeUnmount(() => { editor.value?.destroy() })

const uploadAndInsert = async (file: File) => {
  const inst = editor.value
  if (!inst) return
  const err = validateFile(file)
  if (err) return toast.error(err)
  uploading.value = true
  try {
    const res = await imageApi.upload(file)
    inst.chain().focus().setImage({ src: res.url, alt: file.name }).run()
  } catch (e) {
    toast.error(e, '이미지 업로드 실패')
  } finally {
    uploading.value = false
  }
}

const pickImage = () => {
  if (!props.editable || uploading.value) return
  fileInput.value?.click()
}

const onImagePicked = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) await uploadAndInsert(file)
  input.value = ''
}

const setLink = async () => {
  const inst = editor.value
  if (!inst) return
  if (inst.isActive('link')) {
    const ok = await confirm.ask('링크 제거', {
      description: '현재 범위의 링크를 제거합니다.',
      confirmText: '제거'
    })
    if (ok) inst.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  const prev = (inst.getAttributes('link').href as string | undefined) ?? ''
  const url = await prompt.ask('링크 주소', {
    placeholder: 'https://example.com',
    defaultValue: prev
  })
  if (!url) return
  inst.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

const isActive = (name: string, attrs?: Record<string, unknown>) =>
  editor.value?.isActive(name, attrs) ?? false
</script>

<template>
  <div class="rte-wrapper rounded-md border bg-background" :class="{ 'opacity-60': !editable }">
    <div v-if="editable" class="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 p-1">
      <Button
        type="button" variant="ghost" size="sm" class="h-8 w-8 p-0"
        :class="isActive('heading', { level: 1 }) ? 'bg-accent text-accent-foreground' : ''"
        title="제목 1"
        @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
      >
        <Icon name="lucide:heading-1" size="14" />
      </Button>
      <Button
        type="button" variant="ghost" size="sm" class="h-8 w-8 p-0"
        :class="isActive('heading', { level: 2 }) ? 'bg-accent text-accent-foreground' : ''"
        title="제목 2"
        @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        <Icon name="lucide:heading-2" size="14" />
      </Button>
      <Button
        type="button" variant="ghost" size="sm" class="h-8 w-8 p-0"
        :class="isActive('heading', { level: 3 }) ? 'bg-accent text-accent-foreground' : ''"
        title="제목 3"
        @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()"
      >
        <Icon name="lucide:heading-3" size="14" />
      </Button>

      <Separator orientation="vertical" class="mx-1 h-5" />

      <Button
        type="button" variant="ghost" size="sm" class="h-8 w-8 p-0"
        :class="isActive('bold') ? 'bg-accent text-accent-foreground' : ''"
        title="굵게 (Ctrl+B)"
        @click="editor?.chain().focus().toggleBold().run()"
      >
        <Icon name="lucide:bold" size="14" />
      </Button>
      <Button
        type="button" variant="ghost" size="sm" class="h-8 w-8 p-0"
        :class="isActive('italic') ? 'bg-accent text-accent-foreground' : ''"
        title="기울임 (Ctrl+I)"
        @click="editor?.chain().focus().toggleItalic().run()"
      >
        <Icon name="lucide:italic" size="14" />
      </Button>
      <Button
        type="button" variant="ghost" size="sm" class="h-8 w-8 p-0"
        :class="isActive('strike') ? 'bg-accent text-accent-foreground' : ''"
        title="취소선"
        @click="editor?.chain().focus().toggleStrike().run()"
      >
        <Icon name="lucide:strikethrough" size="14" />
      </Button>
      <Button
        type="button" variant="ghost" size="sm" class="h-8 w-8 p-0"
        :class="isActive('code') ? 'bg-accent text-accent-foreground' : ''"
        title="인라인 코드"
        @click="editor?.chain().focus().toggleCode().run()"
      >
        <Icon name="lucide:code" size="14" />
      </Button>

      <Separator orientation="vertical" class="mx-1 h-5" />

      <Button
        type="button" variant="ghost" size="sm" class="h-8 w-8 p-0"
        :class="isActive('bulletList') ? 'bg-accent text-accent-foreground' : ''"
        title="글머리 기호"
        @click="editor?.chain().focus().toggleBulletList().run()"
      >
        <Icon name="lucide:list" size="14" />
      </Button>
      <Button
        type="button" variant="ghost" size="sm" class="h-8 w-8 p-0"
        :class="isActive('orderedList') ? 'bg-accent text-accent-foreground' : ''"
        title="번호 매기기"
        @click="editor?.chain().focus().toggleOrderedList().run()"
      >
        <Icon name="lucide:list-ordered" size="14" />
      </Button>
      <Button
        type="button" variant="ghost" size="sm" class="h-8 w-8 p-0"
        :class="isActive('blockquote') ? 'bg-accent text-accent-foreground' : ''"
        title="인용"
        @click="editor?.chain().focus().toggleBlockquote().run()"
      >
        <Icon name="lucide:quote" size="14" />
      </Button>
      <Button
        type="button" variant="ghost" size="sm" class="h-8 w-8 p-0"
        :class="isActive('codeBlock') ? 'bg-accent text-accent-foreground' : ''"
        title="코드 블록"
        @click="editor?.chain().focus().toggleCodeBlock().run()"
      >
        <Icon name="lucide:square-code" size="14" />
      </Button>
      <Button
        type="button" variant="ghost" size="sm" class="h-8 w-8 p-0"
        title="구분선"
        @click="editor?.chain().focus().setHorizontalRule().run()"
      >
        <Icon name="lucide:minus" size="14" />
      </Button>

      <Separator orientation="vertical" class="mx-1 h-5" />

      <Button
        type="button" variant="ghost" size="sm" class="h-8 w-8 p-0"
        :class="isActive('link') ? 'bg-accent text-accent-foreground' : ''"
        title="링크"
        @click="setLink"
      >
        <Icon name="lucide:link" size="14" />
      </Button>
      <Button
        type="button" variant="ghost" size="sm" class="h-8 w-8 p-0"
        :disabled="uploading"
        title="이미지 업로드"
        @click="pickImage"
      >
        <Icon v-if="uploading" name="lucide:loader-2" size="14" class="animate-spin" />
        <Icon v-else name="lucide:image" size="14" />
      </Button>

      <Separator orientation="vertical" class="mx-1 h-5" />

      <Button
        type="button" variant="ghost" size="sm" class="h-8 w-8 p-0"
        :disabled="!editor?.can().undo()"
        title="실행 취소 (Ctrl+Z)"
        @click="editor?.chain().focus().undo().run()"
      >
        <Icon name="lucide:undo-2" size="14" />
      </Button>
      <Button
        type="button" variant="ghost" size="sm" class="h-8 w-8 p-0"
        :disabled="!editor?.can().redo()"
        title="다시 실행 (Ctrl+Shift+Z)"
        @click="editor?.chain().focus().redo().run()"
      >
        <Icon name="lucide:redo-2" size="14" />
      </Button>

      <div class="ml-auto pr-1 text-[10px] text-muted-foreground">
        이미지는 드래그 · 붙여넣기도 됩니다
      </div>
    </div>

    <EditorContent
      :editor="editor"
      class="px-4 py-3"
      :style="{ minHeight }"
    />

    <input
      ref="fileInput"
      type="file"
      :accept="acceptImage"
      class="hidden"
      @change="onImagePicked"
    />
  </div>
</template>

<style>
.rte-content {
  min-height: inherit;
  font-size: 0.875rem;
  line-height: 1.6;
}
.rte-content p { margin: 0.5rem 0; }
.rte-content h1 { font-size: 1.5rem; font-weight: 700; margin: 1rem 0 0.5rem; }
.rte-content h2 { font-size: 1.25rem; font-weight: 700; margin: 0.875rem 0 0.5rem; }
.rte-content h3 { font-size: 1.125rem; font-weight: 600; margin: 0.75rem 0 0.5rem; }
.rte-content ul, .rte-content ol { padding-left: 1.5rem; margin: 0.5rem 0; }
.rte-content ul { list-style: disc; }
.rte-content ol { list-style: decimal; }
.rte-content li > p { margin: 0.125rem 0; }
.rte-content blockquote {
  border-left: 3px solid hsl(var(--border));
  padding-left: 0.75rem;
  color: hsl(var(--muted-foreground));
  margin: 0.5rem 0;
}
.rte-content code {
  background: hsl(var(--muted));
  padding: 0.1rem 0.3rem;
  border-radius: 0.25rem;
  font-size: 0.8125rem;
  font-family: ui-monospace, monospace;
}
.rte-content pre {
  background: hsl(var(--muted));
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  overflow-x: auto;
  margin: 0.5rem 0;
}
.rte-content pre code {
  background: transparent;
  padding: 0;
  font-size: 0.8125rem;
}
.rte-content hr {
  border: 0;
  border-top: 1px solid hsl(var(--border));
  margin: 1rem 0;
}
.rte-content .rte-link {
  color: hsl(var(--primary));
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
.rte-content .rte-image {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 0.375rem;
  border: 1px solid hsl(var(--border));
  margin: 0.5rem 0;
}
.rte-content .rte-image.ProseMirror-selectednode {
  outline: 2px solid hsl(var(--ring));
}
.rte-content p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  color: hsl(var(--muted-foreground));
  float: left;
  height: 0;
  pointer-events: none;
}
</style>
