<script setup lang="ts">
import { formatDate, formatPhone } from '~/utils/format'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const adminsApi = useAdmins()
const toast = useToast()
const confirm = useConfirm()

const isNew = route.params.id === 'new'
const id = isNew ? 0 : Number(route.params.id)

const admin = ref<any>(null)
const loading = ref(!isNew)
const saving = ref(false)

import type { UserStatus, UserType } from '~/types/common'

const roleLabels: Record<string, string> = {
  ADMIN: '최고관리자', STAFF: '운영자', USER: '일반'
}

const form = reactive<{
  email: string
  password: string
  name: string
  phone: string
  role: UserType
}>({
  email: '',
  password: '',
  name: '',
  phone: '',
  role: 'STAFF'
})

const load = async () => {
  if (isNew) return
  loading.value = true
  try {
    admin.value = await adminsApi.detail(id)
  } finally { loading.value = false }
}

const submit = async () => {
  if (!form.email.trim()) return toast.error('이메일은 필수입니다.')
  if (!form.password || form.password.length < 8) return toast.error('비밀번호는 8자 이상입니다.')
  if (!form.name.trim()) return toast.error('이름은 필수입니다.')
  saving.value = true
  try {
    const res: any = await adminsApi.create({
      email: form.email,
      password: form.password,
      name: form.name,
      phone: form.phone || undefined,
      role: form.role
    })
    const newId = typeof res === 'object' ? (res.id ?? res) : res
    toast.success('관리자를 등록했습니다.')
    router.push(`/admins/${newId}`)
  } catch (e) {
    toast.error(e, '등록 실패')
  } finally { saving.value = false }
}

const changeRole = async (role: UserType) => {
  const ok = await confirm.ask('권한 변경', {
    description: `권한을 ${roleLabels[role]}로 변경합니다.`,
    confirmText: '변경'
  })
  if (!ok) return
  saving.value = true
  try {
    await adminsApi.updateRole(id, { role })
    await load()
  } finally { saving.value = false }
}

const changeStatus = async (status: UserStatus) => {
  const ok = await confirm.ask('상태 변경', {
    description: `상태를 ${status}로 변경합니다.`,
    confirmText: '변경',
    tone: status === 'WITHDRAWN' ? 'danger' : 'default'
  })
  if (!ok) return
  saving.value = true
  try {
    await adminsApi.updateStatus(id, { status })
    await load()
  } finally { saving.value = false }
}

onMounted(load)
useHead({ title: () => isNew ? '관리자 등록 | ZeroLabs Admin' : `${admin.value?.name ?? '관리자'} | ZeroLabs Admin` })
</script>

<template>
  <div class="p-8 max-w-3xl">
    <DetailHeader
      :title="isNew ? '관리자 등록' : (admin?.name ?? (loading ? '…' : '관리자'))"
      :subtitle="isNew ? '새 관리자 계정 생성' : admin?.email"
      back-to="/admins"
    >
      <template #actions>
        <template v-if="!isNew && admin">
          <Badge variant="outline">
            {{ roleLabels[admin.userType ?? admin.role] ?? admin.userType ?? admin.role }}
          </Badge>
          <StatusBadge :status="admin.status" />
        </template>
      </template>
    </DetailHeader>

    <div v-if="loading" class="text-center text-muted-foreground py-20">불러오는 중…</div>

    <!-- 신규 등록 폼 -->
    <Card v-else-if="isNew">
      <CardContent class="pt-6 space-y-5">
        <div>
          <Label class="mb-1.5 block">이메일 <span class="text-destructive">*</span></Label>
          <Input v-model="form.email" type="email" placeholder="admin@zerolabs.co.kr" autocomplete="off" />
        </div>

        <div>
          <Label class="mb-1.5 block">비밀번호 <span class="text-destructive">*</span></Label>
          <Input v-model="form.password" type="password" placeholder="8자 이상" autocomplete="new-password" />
          <p class="mt-1 text-xs text-muted-foreground">최초 1회 발급용. 담당자에게 전달 후 변경하도록 안내.</p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <Label class="mb-1.5 block">이름 <span class="text-destructive">*</span></Label>
            <Input v-model="form.name" placeholder="홍길동" />
          </div>
          <div>
            <Label class="mb-1.5 block">전화번호</Label>
            <Input v-model="form.phone" placeholder="010-1234-5678" />
          </div>
        </div>

        <div>
          <Label class="mb-1.5 block">역할 <span class="text-destructive">*</span></Label>
          <select
            v-model="form.role"
            class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="STAFF">운영자 (STAFF)</option>
            <option value="ADMIN">최고관리자 (ADMIN)</option>
          </select>
        </div>

        <div class="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" :disabled="saving" @click="router.push('/admins')">취소</Button>
          <Button :disabled="saving" @click="submit">
            <Icon name="lucide:plus" size="14" class="mr-1" /> 등록
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- 기존 관리자 상세 -->
    <div v-else-if="admin" class="space-y-6">
      <DetailSection title="계정 정보">
        <DetailField label="이름" :value="admin.name" />
        <DetailField label="이메일" :value="admin.email" />
        <DetailField label="연락처" :value="formatPhone(admin.phone)" />
        <DetailField label="상태" :value="admin.status" />
        <DetailField label="권한" :value="roleLabels[admin.userType ?? admin.role] ?? admin.userType ?? admin.role" />
        <DetailField label="가입일" :value="formatDate(admin.createdAt)" />
        <DetailField label="최근 로그인" :value="formatDate(admin.lastLoginAt)" />

        <template #footer>
          <div class="flex items-center gap-2">
            <span class="text-xs text-muted-foreground mr-2">권한</span>
            <Button variant="outline" size="sm" :disabled="saving" @click="changeRole('ADMIN')">최고관리자</Button>
            <Button variant="outline" size="sm" :disabled="saving" @click="changeRole('STAFF')">운영자</Button>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-muted-foreground mr-2">상태</span>
            <Button variant="outline" size="sm" :disabled="saving" @click="changeStatus('ACTIVE')">활성</Button>
            <Button variant="outline" size="sm" :disabled="saving" @click="changeStatus('SUSPENDED')">정지</Button>
            <Button variant="outline" size="sm" class="text-destructive" :disabled="saving" @click="changeStatus('WITHDRAWN')">탈퇴</Button>
          </div>
        </template>
      </DetailSection>
    </div>

    <div v-else class="text-center text-muted-foreground py-20">관리자를 찾을 수 없습니다.</div>
  </div>
</template>
