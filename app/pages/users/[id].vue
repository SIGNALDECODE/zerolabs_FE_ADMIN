<script setup lang="ts">
import { formatCurrency, formatDate, formatNumber, formatPhone } from '~/utils/format'
import type { PageResponse } from '~/types/api'
import type { UserDetail, UserOrderEntry, PointHistoryEntry } from '~/types/user'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const api = useApi()
const pointApi = useAdminPoint()
const toast = useToast()
const confirm = useConfirm()

const id = Number(route.params.id)
const user = ref<UserDetail | null>(null)
const orders = ref<UserOrderEntry[]>([])
const pointHistory = ref<PointHistoryEntry[]>([])
const loading = ref(true)
const memo = ref('')
const savingMemo = ref(false)

const pointOpen = ref(false)
const adjustingPoint = ref(false)
const pointForm = reactive<{ amount: string | number, reason: string }>({
  amount: '',
  reason: ''
})

const unwrapList = <T>(res: PageResponse<T> | T[] | null | undefined): T[] => {
  if (res == null) return []
  if (Array.isArray(res)) return res
  return res.content ?? []
}

const load = async () => {
  loading.value = true
  try {
    const [u, orderRes, pointRes] = await Promise.all([
      api.get<UserDetail>(`/admin/users/${id}`),
      api.get<PageResponse<UserOrderEntry> | UserOrderEntry[]>(`/admin/users/${id}/orders`, { page: 1, size: 10 }).catch(() => null),
      pointApi.getUserPoints(id).catch(() => null)
    ])
    user.value = u
    orders.value = unwrapList(orderRes)
    pointHistory.value = unwrapList(pointRes)
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

const changeStatus = async (status: 'ACTIVE' | 'INACTIVE') => {
  const ok = await confirm.ask('회원 상태 변경', {
    description: `상태를 ${status}로 변경합니다.`,
    confirmText: '변경'
  })
  if (!ok) return
  try {
    await api.patch(`/admin/users/${id}/status`, { status })
    toast.success('회원 상태를 변경했습니다.')
    await load()
  } catch (e) { toast.error(e, '변경 실패') }
}

const forceWithdraw = async () => {
  const ok = await confirm.ask('강제 탈퇴', {
    description: `${user.value?.name ?? '해당 회원'}을(를) 강제 탈퇴 처리합니다. 이 동작은 되돌릴 수 없습니다.`,
    confirmText: '탈퇴 처리',
    tone: 'danger'
  })
  if (!ok) return
  try {
    await api.del(`/admin/users/${id}`)
    toast.success('회원을 탈퇴 처리했습니다.')
    await load()
  } catch (e) { toast.error(e, '탈퇴 처리 실패') }
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
  <div class="p-4 sm:p-8 max-w-5xl">
    <DetailHeader
      icon="lucide:users"
      :title="user?.name ?? (loading ? '…' : '회원')"
      :subtitle="user ? `회원 ID · ${user.user_id}` : null"
      back-to="/users"
      back-label="회원 목록으로"
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
          <DetailField label="가입일" :value="formatDate(user.created_at)" />
          <DetailField label="최근 로그인" :value="formatDate(user.last_login_at)" />

          <template #footer>
            <Button variant="outline" size="sm" @click="changeStatus('ACTIVE')">활성화</Button>
            <Button variant="outline" size="sm" @click="changeStatus('INACTIVE')">비활성화</Button>
            <Button variant="outline" size="sm" class="text-destructive" @click="forceWithdraw">강제 탈퇴</Button>
          </template>
        </DetailSection>

        <DetailSection title="등급 / 포인트">
          <DetailField label="등급" :value="user.grade?.name" />
          <DetailField label="보유 포인트" :value="formatNumber(user.current_point)" />
          <DetailField label="누적 구매" :value="formatCurrency(user.order_statistics?.total_order_amount)" />
          <DetailField label="주문 건수" :value="formatNumber(user.order_statistics?.total_order_count)" />
          <DetailField label="평균 주문액" :value="formatCurrency(user.order_statistics?.average_order_amount)" />
          <DetailField label="취소/반품" :value="`${user.order_statistics?.cancelled_count ?? 0} / ${user.order_statistics?.refunded_count ?? 0}`" />

          <template #footer>
            <Button variant="outline" size="sm" @click="openPointAdjust">
              <Icon name="lucide:coins" size="14" class="mr-1" /> 포인트 조정
            </Button>
          </template>
        </DetailSection>
      </div>

      <DetailSection v-if="user.default_address" title="기본 배송지">
        <div class="col-span-2">
          <div class="p-3 border rounded-md text-sm">
            <div class="flex items-center gap-2 mb-1">
              <span class="font-medium">{{ user.default_address.recipient_name }}</span>
              <Badge v-if="user.default_address.is_default" variant="secondary">기본</Badge>
              <span class="text-muted-foreground">{{ formatPhone(user.default_address.recipient_phone) }}</span>
            </div>
            <p class="text-muted-foreground">
              {{ [user.default_address.postal_code, user.default_address.address1, user.default_address.address2].filter(Boolean).join(' ') }}
            </p>
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
                <TableHead>상품</TableHead>
                <TableHead class="text-right">금액</TableHead>
                <TableHead>주문일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <tr
                v-for="(o, i) in orders"
                :key="o.order_id"
                :class="[
                  'border-b transition-colors cursor-pointer hover:bg-accent/50',
                  i % 2 === 1 ? 'bg-muted/20' : ''
                ]"
                @click="router.push(`/orders/${o.order_id}`)"
              >
                <TableCell class="font-mono text-xs">{{ o.order_number }}</TableCell>
                <TableCell><StatusBadge :status="o.status" /></TableCell>
                <TableCell class="text-muted-foreground max-w-xs truncate">{{ o.product_summary }}</TableCell>
                <TableCell class="text-right">{{ formatCurrency(o.grand_total) }}</TableCell>
                <TableCell class="text-muted-foreground">{{ formatDate(o.ordered_at) }}</TableCell>
              </tr>
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
                <TableCell class="text-muted-foreground text-xs">{{ formatDate(h.created_at) }}</TableCell>
                <TableCell>
                  <Badge variant="outline" class="text-[10px]">{{ h.transaction_type ?? '-' }}</Badge>
                </TableCell>
                <TableCell
                  class="text-right font-medium"
                  :class="Number(h.amount) > 0 ? 'text-emerald-600' : 'text-destructive'"
                >
                  {{ Number(h.amount) > 0 ? '+' : '' }}{{ formatNumber(h.amount) }} P
                </TableCell>
                <TableCell class="text-right text-muted-foreground">{{ formatNumber(h.balance_after) }} P</TableCell>
                <TableCell class="text-muted-foreground text-sm max-w-xs truncate">{{ h.reason }}</TableCell>
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
          <ul v-if="user.cs_memos?.length" class="space-y-2">
            <li v-for="m in user.cs_memos" :key="m.id" class="flex items-start justify-between gap-3 p-3 border rounded-md">
              <div class="flex-1 min-w-0">
                <p class="text-sm whitespace-pre-wrap">{{ m.content }}</p>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ m.created_by_name ?? '관리자' }} · {{ formatDate(m.created_at) }}
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
            현재 보유 포인트: <strong>{{ formatNumber(user?.current_point ?? 0) }} P</strong> ·
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
