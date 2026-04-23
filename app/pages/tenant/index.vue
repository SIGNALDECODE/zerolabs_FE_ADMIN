<script setup lang="ts">
import { formatPhone } from '~/utils/format'
import type {
  TenantAllSettings,
  TenantFormState,
  HeaderMenuItem,
  HeaderMenuResponse
} from '~/types/tenant'

useHead({ title: '쇼핑몰 설정 | ZeroLabs Admin' })
definePageMeta({ layout: 'default' })

const tenantApi = useAdminTenant()
const toast = useToast()

const settings = ref<TenantAllSettings | null>(null)
const headerMenu = ref<HeaderMenuResponse | null>(null)
const loading = ref(true)
const saving = ref(false)
const editing = ref(false)

const menuEditing = ref(false)
const menuSaving = ref(false)
const menuDraft = ref<HeaderMenuItem[]>([])

const logoFile = ref<File | null>(null)
const faviconFile = ref<File | null>(null)
const logoPreview = ref('')
const faviconPreview = ref('')

const form = reactive<TenantFormState>({
  info: {},
  seo: {},
  settlement: {},
  maintenance: {},
  social: {},
  notification: {},
  security: {}
})

const resetForm = () => {
  if (!settings.value) return
  Object.assign(form.info, settings.value.info ?? {})
  Object.assign(form.seo, settings.value.seo ?? {})
  Object.assign(form.settlement, settings.value.settlement ?? {})
  Object.assign(form.maintenance, settings.value.maintenance ?? {})
  Object.assign(form.social, settings.value.social ?? {})
  Object.assign(form.notification, settings.value.notification ?? {})
  Object.assign(form.security, settings.value.security ?? {})
  logoFile.value = null
  faviconFile.value = null
  logoPreview.value = settings.value.info?.logoUrl ?? ''
  faviconPreview.value = settings.value.info?.faviconUrl ?? ''
}

const menuItems = (m: HeaderMenuResponse | null): HeaderMenuItem[] =>
  m == null ? [] : (Array.isArray(m) ? m : (m.menus ?? []))

const load = async () => {
  loading.value = true
  try {
    const [s, h] = await Promise.all([
      tenantApi.get(),
      tenantApi.headerMenu().catch(() => null)
    ])
    settings.value = s
    headerMenu.value = h
    resetForm()
  } finally { loading.value = false }
}

const onFileChange = (e: Event, which: 'logo' | 'favicon') => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (which === 'logo') logoFile.value = file
  else faviconFile.value = file
  const reader = new FileReader()
  reader.onload = () => {
    if (which === 'logo') logoPreview.value = reader.result as string
    else faviconPreview.value = reader.result as string
  }
  reader.readAsDataURL(file)
}

const startEdit = () => { editing.value = true }
const cancelEdit = () => { editing.value = false; resetForm() }

const submit = async () => {
  saving.value = true
  try {
    const data = {
      info: form.info,
      seo: form.seo,
      settlement: form.settlement,
      maintenance: form.maintenance,
      social: form.social,
      notification: form.notification,
      security: form.security
    }
    const fd = new FormData()
    fd.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }))
    if (logoFile.value) fd.append('logo', logoFile.value)
    if (faviconFile.value) fd.append('favicon', faviconFile.value)
    await tenantApi.update(fd)
    editing.value = false
    toast.success('쇼핑몰 설정을 저장했습니다.')
    await load()
  } catch (e) {
    toast.error(e, '저장 실패')
  } finally { saving.value = false }
}

const resetMenu = () => {
  menuDraft.value = menuItems(headerMenu.value)
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(it => ({ id: String(it.id ?? ''), label: it.label ?? '', order: it.order ?? 0 }))
}

const startMenuEdit = () => {
  resetMenu()
  menuEditing.value = true
}

const cancelMenuEdit = () => {
  menuEditing.value = false
  resetMenu()
}

const moveMenu = (i: number, dir: -1 | 1) => {
  const next = i + dir
  if (next < 0 || next >= menuDraft.value.length) return
  const [m] = menuDraft.value.splice(i, 1)
  menuDraft.value.splice(next, 0, m!)
  menuDraft.value.forEach((it, idx) => { it.order = idx })
}

const addMenuItem = () => {
  menuDraft.value.push({ id: `menu-${Date.now()}`, label: '', order: menuDraft.value.length })
}

const removeMenuItem = (i: number) => {
  menuDraft.value.splice(i, 1)
  menuDraft.value.forEach((it, idx) => { it.order = idx })
}

const saveMenu = async () => {
  if (menuDraft.value.some(m => !m.label.trim() || !m.id.trim())) {
    toast.error('메뉴 라벨과 ID는 모두 필수입니다.')
    return
  }
  menuSaving.value = true
  try {
    await tenantApi.updateHeaderMenu({
      menus: menuDraft.value.map((m, i) => ({ id: m.id, label: m.label, order: i }))
    })
    toast.success('헤더 메뉴를 저장했습니다.')
    menuEditing.value = false
    await load()
  } catch (e) {
    toast.error(e, '저장 실패')
  } finally { menuSaving.value = false }
}

onMounted(load)

const info = computed(() => settings.value?.info ?? {})
const seo = computed(() => settings.value?.seo ?? {})
const settlement = computed(() => settings.value?.settlement ?? {})
const maintenance = computed(() => settings.value?.maintenance ?? {})
const social = computed(() => settings.value?.social ?? {})
const notification = computed(() => settings.value?.notification ?? {})
const security = computed(() => settings.value?.security ?? {})
</script>

<template>
  <div class="p-4 sm:p-8 max-w-5xl">
    <PageHeader icon="lucide:store" title="쇼핑몰 설정" description="기본 정보 · SEO · 정산 · 점검 · SNS · 알림 · 보안">
      <template #actions>
        <template v-if="!editing">
          <Button variant="outline" size="sm" @click="load">
            <Icon name="lucide:refresh-cw" size="14" class="mr-1" /> 새로고침
          </Button>
          <Button size="sm" @click="startEdit">
            <Icon name="lucide:pencil" size="14" class="mr-1" /> 수정
          </Button>
        </template>
      </template>
    </PageHeader>

    <div v-if="loading" class="text-center text-muted-foreground py-20">불러오는 중…</div>

    <!-- 편집 모드 -->
    <div v-else-if="editing" class="space-y-6">
      <div class="grid gap-6 md:grid-cols-[240px_1fr]">
        <Card>
          <CardContent class="pt-6 space-y-4">
            <div>
              <Label class="mb-2 block">로고</Label>
              <img v-if="logoPreview" :src="logoPreview" class="w-full h-16 object-contain border rounded bg-white mb-2" />
              <div v-else class="w-full h-16 border rounded bg-muted grid place-items-center text-xs text-muted-foreground mb-2">없음</div>
              <input type="file" accept="image/*" class="text-xs w-full" @change="(e: Event) => onFileChange(e, 'logo')" />
            </div>
            <div>
              <Label class="mb-2 block">파비콘</Label>
              <img v-if="faviconPreview" :src="faviconPreview" class="h-8 w-8 object-contain border rounded bg-white mb-2" />
              <div v-else class="h-8 w-8 border rounded bg-muted mb-2" />
              <input type="file" accept="image/x-icon,image/png,image/svg+xml" class="text-xs w-full" @change="(e: Event) => onFileChange(e, 'favicon')" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3"><CardTitle class="text-base">기본 정보</CardTitle></CardHeader>
          <CardContent class="grid gap-4 grid-cols-2">
            <div><Label class="mb-1.5 block text-xs">쇼핑몰명</Label><Input v-model="form.info.name" /></div>
            <div><Label class="mb-1.5 block text-xs">영문명</Label><Input v-model="form.info.nameEn" /></div>
            <div><Label class="mb-1.5 block text-xs">상호(법인명)</Label><Input v-model="form.info.businessName" /></div>
            <div><Label class="mb-1.5 block text-xs">대표자</Label><Input v-model="form.info.ceoName" /></div>
            <div><Label class="mb-1.5 block text-xs">사업자번호</Label><Input v-model="form.info.businessNumber" /></div>
            <div><Label class="mb-1.5 block text-xs">통신판매업</Label><Input v-model="form.info.ecommerceLicense" /></div>
            <div><Label class="mb-1.5 block text-xs">대표 전화</Label><Input v-model="form.info.phone" /></div>
            <div><Label class="mb-1.5 block text-xs">대표 이메일</Label><Input v-model="form.info.email" type="email" /></div>
            <div><Label class="mb-1.5 block text-xs">고객센터 전화</Label><Input v-model="form.info.csPhone" /></div>
            <div><Label class="mb-1.5 block text-xs">고객센터 이메일</Label><Input v-model="form.info.csEmail" type="email" /></div>
            <div><Label class="mb-1.5 block text-xs">상담 시간</Label><Input v-model="form.info.csHours" placeholder="평일 09~18시" /></div>
            <div><Label class="mb-1.5 block text-xs">우편번호</Label><Input v-model="form.info.zipCode" /></div>
            <div class="col-span-2"><Label class="mb-1.5 block text-xs">기본 주소</Label><Input v-model="form.info.address" /></div>
            <div class="col-span-2"><Label class="mb-1.5 block text-xs">상세 주소</Label><Input v-model="form.info.addressDetail" /></div>
            <div><Label class="mb-1.5 block text-xs">개인정보 책임자</Label><Input v-model="form.info.privacyOfficer" /></div>
            <div><Label class="mb-1.5 block text-xs">개인정보 이메일</Label><Input v-model="form.info.privacyEmail" type="email" /></div>
            <div class="col-span-2"><Label class="mb-1.5 block text-xs">카피라이트</Label><Input v-model="form.info.copyrightText" /></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader class="pb-3"><CardTitle class="text-base">SEO</CardTitle></CardHeader>
        <CardContent class="space-y-4">
          <div><Label class="mb-1.5 block text-xs">메타 타이틀</Label><Input v-model="form.seo.metaTitle" maxlength="200" /></div>
          <div><Label class="mb-1.5 block text-xs">메타 설명</Label><Textarea v-model="form.seo.metaDescription" rows="2" /></div>
          <div><Label class="mb-1.5 block text-xs">메타 키워드</Label><Input v-model="form.seo.metaKeywords" /></div>
          <div><Label class="mb-1.5 block text-xs">OG 이미지 URL</Label><Input v-model="form.seo.ogImage" /></div>
          <div><Label class="mb-1.5 block text-xs">robots.txt</Label><Textarea v-model="form.seo.robotsTxt" rows="4" class="font-mono text-xs" /></div>
        </CardContent>
      </Card>

      <div class="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader class="pb-3"><CardTitle class="text-base">정산</CardTitle></CardHeader>
          <CardContent class="space-y-4">
            <div><Label class="mb-1.5 block text-xs">은행명</Label><Input v-model="form.settlement.bankName" /></div>
            <div><Label class="mb-1.5 block text-xs">예금주</Label><Input v-model="form.settlement.bankHolder" /></div>
            <div><Label class="mb-1.5 block text-xs">계좌번호</Label><Input v-model="form.settlement.bankAccount" class="font-mono" /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3"><CardTitle class="text-base">점검 모드</CardTitle></CardHeader>
          <CardContent class="space-y-4">
            <label class="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input v-model="form.maintenance.enabled" type="checkbox" class="h-4 w-4" />
              점검 모드 활성화
            </label>
            <div class="grid grid-cols-2 gap-3">
              <div><Label class="mb-1.5 block text-xs">시작</Label><Input v-model="form.maintenance.startAt" type="datetime-local" /></div>
              <div><Label class="mb-1.5 block text-xs">종료</Label><Input v-model="form.maintenance.endAt" type="datetime-local" /></div>
            </div>
            <div><Label class="mb-1.5 block text-xs">안내 메시지</Label><Textarea v-model="form.maintenance.message" rows="3" /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3"><CardTitle class="text-base">소셜 미디어</CardTitle></CardHeader>
          <CardContent class="space-y-4">
            <div><Label class="mb-1.5 block text-xs">Instagram</Label><Input v-model="form.social.instagram" /></div>
            <div><Label class="mb-1.5 block text-xs">Facebook</Label><Input v-model="form.social.facebook" /></div>
            <div><Label class="mb-1.5 block text-xs">YouTube</Label><Input v-model="form.social.youtube" /></div>
            <div><Label class="mb-1.5 block text-xs">Blog</Label><Input v-model="form.social.blog" /></div>
            <div><Label class="mb-1.5 block text-xs">KakaoTalk 채널</Label><Input v-model="form.social.kakao" /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3"><CardTitle class="text-base">알림 메일</CardTitle></CardHeader>
          <CardContent class="space-y-4">
            <div class="flex items-center justify-between">
              <Label class="text-xs">주문 알림</Label>
              <label class="inline-flex items-center gap-2 text-xs">
                <input v-model="form.notification.orderEnabled" type="checkbox" class="h-4 w-4" /> 활성
              </label>
            </div>
            <Input v-model="form.notification.orderEmail" type="email" placeholder="order@example.com" :disabled="!form.notification.orderEnabled" />

            <div class="flex items-center justify-between">
              <Label class="text-xs">클레임 알림</Label>
              <label class="inline-flex items-center gap-2 text-xs">
                <input v-model="form.notification.claimEnabled" type="checkbox" class="h-4 w-4" /> 활성
              </label>
            </div>
            <Input v-model="form.notification.claimEmail" type="email" placeholder="claim@example.com" :disabled="!form.notification.claimEnabled" />

            <div class="flex items-center justify-between">
              <Label class="text-xs">문의 알림</Label>
              <label class="inline-flex items-center gap-2 text-xs">
                <input v-model="form.notification.inquiryEnabled" type="checkbox" class="h-4 w-4" /> 활성
              </label>
            </div>
            <Input v-model="form.notification.inquiryEmail" type="email" placeholder="inquiry@example.com" :disabled="!form.notification.inquiryEnabled" />
          </CardContent>
        </Card>

        <Card class="md:col-span-2">
          <CardHeader class="pb-3"><CardTitle class="text-base">보안</CardTitle></CardHeader>
          <CardContent class="grid gap-4 grid-cols-2">
            <div>
              <Label class="mb-1.5 block text-xs">세션 타임아웃 (분, 15~480)</Label>
              <Input v-model="form.security.sessionTimeout" type="number" step="1" min="15" max="480" />
            </div>
            <div>
              <Label class="mb-1.5 block text-xs">최대 로그인 시도 (1~10)</Label>
              <Input v-model="form.security.maxLoginAttempts" type="number" step="1" min="1" max="10" />
            </div>
            <div>
              <Label class="mb-1.5 block text-xs">계정 잠금 시간 (분, 1~1440)</Label>
              <Input v-model="form.security.accountLockDuration" type="number" step="1" min="1" max="1440" />
            </div>
            <div>
              <Label class="mb-1.5 block text-xs">비밀번호 변경 주기 (일, 30~365)</Label>
              <Input v-model="form.security.passwordChangeCycle" type="number" step="1" min="30" max="365" />
            </div>
            <div class="col-span-2">
              <label class="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input v-model="form.security.passwordChangeRequired" type="checkbox" class="h-4 w-4" />
                비밀번호 변경 강제
              </label>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="flex justify-end gap-2">
        <Button variant="outline" :disabled="saving" @click="cancelEdit">취소</Button>
        <Button :disabled="saving" @click="submit">
          <Icon name="lucide:save" size="14" class="mr-1" /> 저장
        </Button>
      </div>
    </div>

    <!-- 조회 -->
    <div v-else-if="settings" class="space-y-6">
      <div class="grid gap-6 md:grid-cols-[240px_1fr]">
        <Card>
          <CardContent class="pt-6 space-y-4">
            <div>
              <p class="text-xs text-muted-foreground mb-2">로고</p>
              <img v-if="info.logoUrl" :src="info.logoUrl" class="w-full h-16 object-contain border rounded bg-white" />
              <div v-else class="w-full h-16 border rounded bg-muted grid place-items-center text-xs text-muted-foreground">없음</div>
            </div>
            <div>
              <p class="text-xs text-muted-foreground mb-2">파비콘</p>
              <img v-if="info.faviconUrl" :src="info.faviconUrl" class="h-8 w-8 object-contain border rounded bg-white" />
              <div v-else class="h-8 w-8 border rounded bg-muted" />
            </div>
          </CardContent>
        </Card>

        <DetailSection title="기본 정보">
          <DetailField label="쇼핑몰명" :value="info.name" />
          <DetailField label="상호" :value="info.businessName" />
          <DetailField label="대표자" :value="info.ceoName" />
          <DetailField label="사업자등록번호" :value="info.businessNumber" />
          <DetailField label="통신판매업" :value="info.ecommerceLicense" />
          <DetailField label="고객센터" :value="formatPhone(info.csPhone)" />
          <DetailField label="이메일" :value="info.csEmail" />
          <DetailField label="주소" :value="[info.address, info.addressDetail].filter(Boolean).join(' ')" full />
        </DetailSection>
      </div>

      <div class="grid gap-6 md:grid-cols-2">
        <DetailSection title="SEO">
          <DetailField label="타이틀" :value="seo.metaTitle" full />
          <DetailField label="설명" :value="seo.metaDescription" full />
          <DetailField label="키워드" :value="seo.metaKeywords" full />
          <DetailField label="OG 이미지" :value="seo.ogImage" full mono />
        </DetailSection>

        <DetailSection title="점검 모드">
          <DetailField label="활성" :value="maintenance.enabled === undefined ? '-' : (maintenance.enabled ? '예' : '아니오')" />
          <DetailField label="시작" :value="maintenance.startAt" />
          <DetailField label="종료" :value="maintenance.endAt" />
          <DetailField label="메시지" :value="maintenance.message" full />
        </DetailSection>

        <DetailSection title="정산">
          <DetailField label="은행" :value="settlement.bankName" />
          <DetailField label="예금주" :value="settlement.bankHolder" />
          <DetailField label="계좌번호" :value="settlement.bankAccount" mono full />
        </DetailSection>

        <DetailSection title="소셜">
          <DetailField label="Instagram" :value="social.instagram" />
          <DetailField label="Facebook" :value="social.facebook" />
          <DetailField label="YouTube" :value="social.youtube" />
          <DetailField label="Blog" :value="social.blog" />
          <DetailField label="KakaoTalk" :value="social.kakao" />
        </DetailSection>

        <DetailSection title="알림">
          <DetailField label="주문" :value="notification.orderEnabled === undefined ? '-' : (notification.orderEnabled ? `ON · ${notification.orderEmail ?? '-'}` : 'OFF')" full />
          <DetailField label="클레임" :value="notification.claimEnabled === undefined ? '-' : (notification.claimEnabled ? `ON · ${notification.claimEmail ?? '-'}` : 'OFF')" full />
          <DetailField label="문의" :value="notification.inquiryEnabled === undefined ? '-' : (notification.inquiryEnabled ? `ON · ${notification.inquiryEmail ?? '-'}` : 'OFF')" full />
        </DetailSection>

        <DetailSection title="보안">
          <DetailField label="세션 타임아웃" :value="security.sessionTimeout ? `${security.sessionTimeout}분` : '-'" />
          <DetailField label="최대 로그인 시도" :value="security.maxLoginAttempts" />
          <DetailField label="계정 잠금" :value="security.accountLockDuration ? `${security.accountLockDuration}분` : '-'" />
          <DetailField label="비밀번호 주기" :value="security.passwordChangeCycle ? `${security.passwordChangeCycle}일` : '-'" />
        </DetailSection>
      </div>

      <Card>
        <CardHeader class="pb-3 flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle class="text-base">헤더 메뉴</CardTitle>
            <CardDescription>
              {{ menuItems(headerMenu).length }}개 항목 · 쇼핑몰 상단 네비게이션
            </CardDescription>
          </div>
          <Button v-if="!menuEditing" variant="outline" size="sm" @click="startMenuEdit">
            <Icon name="lucide:pencil" size="14" class="mr-1" /> 편집
          </Button>
        </CardHeader>
        <CardContent>
          <!-- 조회 -->
          <ul v-if="!menuEditing" class="divide-y">
            <li
              v-for="m in menuItems(headerMenu).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))"
              :key="m.id"
              class="flex items-center gap-3 py-2 text-sm"
            >
              <span class="w-8 text-xs font-mono text-muted-foreground">{{ m.order }}</span>
              <span class="font-medium">{{ m.label }}</span>
              <span class="ml-auto text-xs font-mono text-muted-foreground">{{ m.id }}</span>
            </li>
            <li v-if="!menuItems(headerMenu).length" class="text-center text-muted-foreground text-sm py-6">
              등록된 헤더 메뉴가 없습니다.
            </li>
          </ul>

          <!-- 편집 -->
          <div v-else class="space-y-2">
            <ul class="divide-y border rounded-md">
              <li v-for="(m, i) in menuDraft" :key="i" class="flex items-center gap-2 p-2">
                <span class="w-8 text-center text-xs font-mono text-muted-foreground">{{ i + 1 }}</span>
                <Input v-model="m.id" class="h-8 w-32 text-xs font-mono" placeholder="id" />
                <Input v-model="m.label" class="h-8 flex-1 text-sm" placeholder="라벨" />
                <Button type="button" variant="ghost" size="sm" class="h-7 w-7 p-0" :disabled="i === 0" @click="moveMenu(i, -1)">
                  <Icon name="lucide:chevron-up" size="14" />
                </Button>
                <Button type="button" variant="ghost" size="sm" class="h-7 w-7 p-0" :disabled="i === menuDraft.length - 1" @click="moveMenu(i, 1)">
                  <Icon name="lucide:chevron-down" size="14" />
                </Button>
                <Button type="button" variant="ghost" size="sm" class="h-7 w-7 p-0 text-destructive" @click="removeMenuItem(i)">
                  <Icon name="lucide:trash-2" size="14" />
                </Button>
              </li>
            </ul>
            <div class="flex items-center justify-between pt-2">
              <Button type="button" variant="outline" size="sm" @click="addMenuItem">
                <Icon name="lucide:plus" size="14" class="mr-1" /> 메뉴 추가
              </Button>
              <div class="flex gap-2">
                <Button variant="outline" size="sm" :disabled="menuSaving" @click="cancelMenuEdit">취소</Button>
                <Button size="sm" :disabled="menuSaving" @click="saveMenu">
                  <Icon name="lucide:save" size="14" class="mr-1" /> 저장
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
