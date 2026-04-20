<script setup lang="ts">
import { formatCurrency, formatDate, formatNumber, formatPhone } from '~/utils/format'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const api = useApi()
const pointApi = useAdminPoint()
const toast = useToast()
const confirm = useConfirm()

const id = Number(route.params.id)
const user = ref<any>(null)
const orders = ref<any[]>([])
const pointHistory = ref<any[]>([])
const loading = ref(true)
const memo = ref('')
const savingMemo = ref(false)

const pointOpen = ref(false)
const adjustingPoint = ref(false)
const pointForm = reactive({
  amount: '' as string | number,
  reason: ''
})

const load = async () => {
  loading.value = true
  try {
    const [u, orderRes, pointRes] = await Promise.all([
      api.get(`/admin/users/${id}`),
      api.get(`/admin/users/${id}/orders`, { page: 1, size: 10 }).catch(() => null),
      pointApi.getUserPoints(id).catch(() => null)
    ])
    user.value = u as any
    orders.value = (orderRes as any)?.content ?? (orderRes as any) ?? []
    pointHistory.value = (pointRes as any)?.content ?? (pointRes as any) ?? []
  } finally {
    loading.value = false
  }
}

const addMemo = async () => {
  if (!memo.value.trim()) return
  savingMemo.value = true
  try {
    await api.post(`/admin/users/${id}/cs-memos`, { content: memo.value })
    memo.value = ''
    toast.success('메모를 등록했습니다.')
    await load()
  } catch (e) { toast.error(e, '메모 등록 실패') }
  finally { savingMemo.value = false }
}

const removeMemo = async (memoId: number) => {
  const ok = await confirm.ask('메모 삭제', {
    description: '이 CS 메모를 삭제합니다.',
    confirmText: '삭제',
    tone: 'danger'
  })
  if (!ok) return
  try {
    await api.del(`/admin/users/${id}/cs-memos/${memoId}`)
    toast.success('메모를 삭제했습니다.')
    await load()
  } catch (e) { toast.error(e, '삭제 실패') }
}

const changeStatus = async (status: string) => {
  const ok = await confirm.ask('회원 상태 변경', {
    description: `상태를 ${status}로 변경합니다.`,
    confirmText: '변경',
    tone: status === 'WITHDRAWN' ? 'danger' : 'default'
  })
  if (!ok) return
  try {
    await api.patch(`/admin/users/${id}/status`, { status })
    toast.success('회원 상태를 변경했습니다.')
    await load()
  } catch (e) { toast.error(e, '변경 실패') }
}

const openPointAdjust = () => {
  pointForm.amount = ''
  pointForm.reason = ''
  pointOpen.value = true
}

const submitPointAdjust = async () => {
  const amt = Number(pointForm.amount)
  if (!amt || Number.isNaN(amt)) return toast.error('금액을 입력하세요. 음수면 차감됩니다.')
  if (!pointForm.reason.trim()) return toast.error('조정 사유는 필수입니다.')
  adjustingPoint.value = true
  try {
    await pointApi.adjust(id, { amount: amt, reason: pointForm.reason })
    toast.success(`포인트 ${amt > 0 ? '+' : ''}${amt.toLocaleString()}P 조정 완료`)
    pointOpen.value = false
    await load()
  } catch (e) {
    toast.error(e, '포인트 조정 실패')
  } finally { adjustingPoint.value = false }
}

onMounted(load)
useHead({ title: () => `${user.value?.name ?? '회원'} | ZeroLabs Admin` })
</script>

<template>
  <div class="p-8 max-w-5xl">
    <DetailHeader
      :title="user?.name ?? (loading ? '…' : '회원')"
      :subtitle="user ? `회원 ID · ${user.id}` : null"
      back-to="/users"
    >
      <template #actions>
        <StatusBadge v-if="user" :status="user.status" />
        <Button variant="outline" size="sm" @click="load">
          <Icon name="lucide:refresh-cw" size="14" class="mr-1" /> 새로고침
        </Button>
      </template>
    </DetailHeader>

    <div v-if="loading" class="text-center text-muted-foreground py-20">불러오는 중…</div>

    <div v-else-if="user" class="space-y-6">
      <div class="grid gap-6 md:grid-cols-2">
        <DetailSection title="기본 정보">
          <DetailField label="이름" :value="user.name" />
          <DetailField label="상태" :value="user.status" />
          <DetailField label="이메일" :value="user.email" />
          <DetailField label="연락처" :value="formatPhone(user.phone)" />
          <DetailField label="성별" :value="user.gender" />
          <DetailField label="생년월일" :value="user.birthDate" />
          <DetailField label="가입일" :value="formatDate(user.createdAt)" />
          <DetailField label="최근 로그인" :value="formatDate(user.lastLoginAt)" />

          <template #footer>
            <Button variant="outline" size="sm" @click="changeStatus('ACTIVE')">활성화</Button>
            <Button variant="outline" size="sm" @click="changeStatus('SUSPENDED')">정지</Button>
            <Button variant="outline" size="sm" class="text-destructive" @click="changeStatus('WITHDRAWN')">탈퇴 처리</Button>
          </template>
        </DetailSection>

        <DetailSection title="등급 / 포인트">
          <DetailField label="등급" :value="user.grade?.name" />
          <DetailField label="보유 포인트" :value="formatNumber(user.point?.currentPoint)" />
          <DetailField label="누적 구매" :value="formatCurrency(user.orderStatistics?.totalPaid)" />
          <DetailField label="주문 건수" :value="formatNumber(user.orderStatistics?.orderCount)" />
          <DetailField label="반품/취소" :value="formatNumber(user.orderStatistics?.cancelCount)" />

          <template #footer>
            <Button variant="outline" size="sm" @click="openPointAdjust">
              <Icon name="lucide:coins" size="14" class="mr-1" /> 포인트 조정
            </Button>
          </template>
        </DetailSection>
      </div>

      <DetailSection v-if="user.addresses?.length" title="배송지" :description="`${user.addresses.length}개`">
        <div class="col-span-2 space-y-2">
          <div
            v-for="addr in user.addresses"
            :key="addr.id"
            class="p-3 border rounded-md text-sm flex items-start justify-between gap-2"
          >
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="font-medium">{{ addr.recipientName }}</span>
                <Badge v-if="addr.isDefault" variant="secondary">기본</Badge>
                <span class="text-muted-foreground">{{ formatPhone(addr.recipientPhone) }}</span>
              </div>
              <p class="text-muted-foreground">
                {{ [addr.postalCode, addr.address, addr.addressDetail].filter(Boolean).join(' ') }}
              </p>
            </div>
          </div>
        </div>
      </DetailSection>

      <DetailSection title="최근 주문" :description="`최근 ${orders.length}건`">
        <div class="col-span-2">
          <Table v-if="orders.length">
            <TableHeader>
              <TableRow>
                <TableHead>주문번호</TableHead>
                <TableHead>상태</TableHead>
                <TableHead class="text-right">금액</TableHead>
                <TableHead>주문일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="o in orders"
                :key="o.orderId ?? o.id"
                class="cursor-pointer"
                @click="router.push(`/orders/${o.orderId ?? o.id}`)"
              >
                <TableCell class="font-mono text-xs">{{ o.orderNumber }}</TableCell>
                <TableCell><StatusBadge :status="o.status" /></TableCell>
                <TableCell class="text-right">{{ formatCurrency(o.grandTotal ?? o.totalAmount) }}</TableCell>
                <TableCell class="text-muted-foreground">{{ formatDate(o.orderedAt ?? o.createdAt) }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p v-else class="text-center text-muted-foreground py-6 text-sm">주문 내역이 없습니다.</p>
        </div>
      </DetailSection>

      <DetailSection v-if="pointHistory.length" title="포인트 이력" :description="`최근 ${pointHistory.length}건`">
        <div class="col-span-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>일시</TableHead>
                <TableHead>구분</TableHead>
                <TableHead class="text-right">금액</TableHead>
                <TableHead class="text-right">잔액</TableHead>
                <TableHead>사유</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="(h, i) in pointHistory" :key="h.id ?? i">
                <TableCell class="text-muted-foreground text-xs">{{ formatDate(h.createdAt) }}</TableCell>
                <TableCell>
                  <Badge variant="outline" class="text-[10px]">{{ h.type ?? h.transactionType ?? '-' }}</Badge>
                </TableCell>
                <TableCell
                  class="text-right font-medium"
                  :class="Number(h.amount) > 0 ? 'text-emerald-600' : 'text-destructive'"
                >
                  {{ Number(h.amount) > 0 ? '+' : '' }}{{ formatNumber(h.amount) }} P
                </TableCell>
                <TableCell class="text-right text-muted-foreground">{{ formatNumber(h.balance) }} P</TableCell>
                <TableCell class="text-muted-foreground text-sm max-w-xs truncate">{{ h.reason ?? h.description }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </DetailSection>

      <DetailSection title="CS 메모">
        <div class="col-span-2 space-y-3">
          <div class="flex gap-2">
            <Textarea v-model="memo" placeholder="메모 내용을 입력하세요." rows="2" />
            <Button :disabled="!memo.trim() || savingMemo" @click="addMemo">등록</Button>
          </div>
          <ul v-if="user.csMemos?.length" class="space-y-2">
            <li v-for="m in user.csMemos" :key="m.id" class="flex items-start justify-between gap-3 p-3 border rounded-md">
              <div class="flex-1 min-w-0">
                <p class="text-sm whitespace-pre-wrap">{{ m.content }}</p>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ m.adminName ?? '관리자' }} · {{ formatDate(m.createdAt) }}
                </p>
              </div>
              <Button variant="ghost" size="sm" @click="removeMemo(m.id)">
                <Icon name="lucide:x" size="14" />
              </Button>
            </li>
          </ul>
          <p v-else class="text-center text-muted-foreground py-4 text-sm">등록된 메모가 없습니다.</p>
        </div>
      </DetailSection>
    </div>

    <div v-else class="text-center text-muted-foreground py-20">회원을 찾을 수 없습니다.</div>

    <!-- 포인트 조정 Dialog -->
    <Dialog v-model:open="pointOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>포인트 조정</DialogTitle>
          <DialogDescription>
            현재 보유 포인트: <strong>{{ formatNumber(user?.point?.currentPoint ?? 0) }} P</strong> ·
            양수는 지급 / 음수는 차감
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-2">
          <div>
            <Label class="mb-1.5 block text-xs">조정 금액 (P) <span class="text-destructive">*</span></Label>
            <Input v-model="pointForm.amount" type="number" step="100" placeholder="예: 1000 또는 -500" />
            <p class="mt-1 text-xs text-muted-foreground">
              보상 +1000 / 회수 -500 식으로 입력하세요.
            </p>
          </div>
          <div>
            <Label class="mb-1.5 block text-xs">조정 사유 <span class="text-destructive">*</span></Label>
            <Textarea v-model="pointForm.reason" rows="3" placeholder="CS 이슈 보상 / 잘못된 적립 회수 …" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" :disabled="adjustingPoint" @click="pointOpen = false">취소</Button>
          <Button :disabled="adjustingPoint" @click="submitPointAdjust">
            <Icon name="lucide:coins" size="14" class="mr-1" /> 조정
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
