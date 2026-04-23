<script setup lang="ts">
import { formatCurrency, formatDate } from '~/utils/format'
import type { OrderClaim, ClaimItemSelectedOption } from '~/types/claim'

/** selectedOptions(JSON 스냅샷)을 "맛: 치킨, 중량: 200g" 형태로 join */
const formatSelectedOptions = (opts: ClaimItemSelectedOption[] | null | undefined): string => {
  if (!opts?.length) return '-'
  return opts
    .map(o => `${o.optionName ?? '옵션'}: ${o.valueName ?? ''}`.trim())
    .filter(Boolean)
    .join(', ')
}

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const claimApi = useAdminClaim()
const toast = useToast()
const prompt = usePrompt()
const confirm = useConfirm()

const claimId = Number(route.params.id)
const orderId = Number(route.query.orderId)

const claim = ref<OrderClaim | null>(null)
const loading = ref(true)
const processing = ref(false)

const shippingOpen = ref(false)
const shippingForm = reactive({
  mode: 'return' as 'return' | 'reship' | 'exchange',
  shippingCarrier: '',
  trackingNumber: '',
  adminNote: ''
})

const load = async () => {
  if (!orderId) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const claims = await claimApi.listByOrder(orderId)
    claim.value = claims.find(c => c.claimId === claimId) ?? null
  } finally {
    loading.value = false
  }
}

const reasonLabels: Record<string, string> = {
  CHANGE_OF_MIND: '단순 변심',
  DEFECTIVE: '상품 불량',
  WRONG_DELIVERY: '오배송',
  DELAYED_DELIVERY: '배송 지연',
  OUT_OF_STOCK: '품절',
  OTHER: '기타'
}

const typeLabels: Record<string, string> = { CANCEL: '취소', RETURN: '반품', EXCHANGE: '교환' }
const statusLabels: Record<string, string> = {
  REQUESTED: '접수', APPROVED: '승인', IN_PROGRESS: '처리중',
  COMPLETED: '완료', REJECTED: '거절'
}

const reject = async () => {
  const reason = await prompt.ask('클레임 거절', {
    description: '고객에게 전달될 거절 사유를 입력하세요.',
    placeholder: '반품 가능 기간 초과, 제품 훼손 등',
    multiline: true
  })
  if (!reason) return
  processing.value = true
  try {
    await claimApi.reject(claimId, { fromStatus: claim.value?.status, rejectReason: reason })
    toast.success('클레임을 거절했습니다.')
    await load()
  } catch (e) { toast.error(e, '거절 실패') }
  finally { processing.value = false }
}

const approve = async () => {
  const ok = await confirm.ask('클레임 승인', {
    description: '이 클레임을 승인 처리합니다.',
    confirmText: '승인'
  })
  if (!ok) return
  processing.value = true
  try {
    await claimApi.approve(claimId, { fromStatus: claim.value?.status })
    toast.success('클레임을 승인했습니다.')
    await load()
  } catch (e) { toast.error(e, '승인 실패') }
  finally { processing.value = false }
}

const openShipping = (mode: 'return' | 'reship' | 'exchange') => {
  shippingForm.mode = mode
  shippingForm.shippingCarrier = ''
  shippingForm.trackingNumber = ''
  shippingForm.adminNote = ''
  shippingOpen.value = true
}

const submitShipping = async () => {
  if (!shippingForm.shippingCarrier.trim()) return toast.error('배송 업체를 입력하세요.')
  if (!shippingForm.trackingNumber.trim()) return toast.error('송장번호를 입력하세요.')
  processing.value = true
  try {
    const base = {
      fromStatus: claim.value?.status,
      shippingCarrier: shippingForm.shippingCarrier,
      trackingNumber: shippingForm.trackingNumber
    }
    if (shippingForm.mode === 'return') {
      await claimApi.updateReturnShipping(claimId, base)
      toast.success('반송장을 등록했습니다.')
    } else if (shippingForm.mode === 'reship') {
      await claimApi.reship(claimId, base)
      toast.success('재배송 송장을 등록했습니다.')
    } else {
      await claimApi.completeExchange(claimId, {
        ...base,
        adminNote: shippingForm.adminNote || undefined
      })
      toast.success('교환을 완료 처리했습니다.')
    }
    shippingOpen.value = false
    await load()
  } catch (e) {
    toast.error(e, '처리 실패')
  } finally { processing.value = false }
}

const completeReceive = async () => {
  const ok = await confirm.ask('입고 검수 완료', {
    description: '반송된 상품의 입고 검수를 완료 처리합니다. 재고가 복구됩니다.',
    confirmText: '완료 처리'
  })
  if (!ok) return
  processing.value = true
  try {
    await claimApi.receiveInspect(claimId, { fromStatus: claim.value?.status, result: 'ACCEPT' })
    toast.success('입고 검수를 완료했습니다.')
    await load()
  } catch (e) { toast.error(e, '처리 실패') }
  finally { processing.value = false }
}

onMounted(load)
useHead({ title: () => `클레임 #${claimId} | ZeroLabs Admin` })

const shippingTitle = computed(() => ({
  return: '반송장 등록',
  reship: '재배송 송장 등록 (거절 후 반품)',
  exchange: '교환 완료 (새 상품 송장)'
} as Record<string, string>)[shippingForm.mode])
</script>

<template>
  <div class="p-4 sm:p-8 max-w-4xl">
    <DetailHeader
      icon="lucide:refresh-cw"
      :title="claim ? `${typeLabels[claim.claimType] ?? claim.claimType} 클레임` : (loading ? '…' : '클레임')"
      :subtitle="claim ? `클레임 ID · ${claim.claimId}` : null"
      back-to="/claims"
      back-label="클레임 목록으로"
    >
      <template #actions>
        <StatusBadge v-if="claim" :label="statusLabels[claim.status] ?? claim.status" :status="claim.status" />
      </template>
    </DetailHeader>

    <div v-if="loading" class="text-center text-muted-foreground py-20">불러오는 중…</div>

    <div v-else-if="!orderId" class="text-center text-muted-foreground py-20">
      orderId 쿼리 파라미터가 필요합니다. 목록에서 진입해주세요.
    </div>

    <div v-else-if="claim" class="space-y-6">
      <DetailSection title="클레임 정보">
        <DetailField label="유형" :value="typeLabels[claim.claimType] ?? claim.claimType" />
        <DetailField label="상태" :value="statusLabels[claim.status] ?? claim.status" />
        <DetailField label="사유 유형" :value="reasonLabels[claim.reasonType] ?? claim.reasonType" />
        <DetailField label="접수일시" :value="formatDate(claim.requestedAt)" />
        <DetailField label="처리일시" :value="formatDate(claim.processedAt)" />
        <DetailField label="환불 예정액" :value="formatCurrency(claim.refundAmount)" />
        <DetailField label="실제 환불액" :value="formatCurrency(claim.actualRefundAmount)" />
        <DetailField label="상세 사유" full>
          <div class="whitespace-pre-wrap">{{ claim.reason || '-' }}</div>
        </DetailField>
        <DetailField v-if="claim.adminNote" label="관리자 메모" full>
          <div class="whitespace-pre-wrap">{{ claim.adminNote }}</div>
        </DetailField>
        <DetailField v-if="claim.rejectReason" label="거절 사유" full>
          <div class="whitespace-pre-wrap text-destructive">{{ claim.rejectReason }}</div>
        </DetailField>

        <template #footer>
          <Button variant="outline" size="sm" @click="router.push(`/orders/${orderId}`)">
            <Icon name="lucide:external-link" size="14" class="mr-1" /> 주문 상세로
          </Button>

          <template v-if="claim.status === 'REQUESTED'">
            <Button variant="outline" size="sm" :disabled="processing" @click="reject">
              <Icon name="lucide:x" size="14" class="mr-1" /> 거절
            </Button>
            <Button size="sm" :disabled="processing" @click="approve">
              <Icon name="lucide:check" size="14" class="mr-1" /> 승인
            </Button>
          </template>

          <!-- 반품/교환: 승인 후 - 반송장 등록 -->
          <template v-if="['APPROVED', 'IN_PROGRESS'].includes(claim.status) && claim.claimType !== 'CANCEL'">
            <Button variant="outline" size="sm" :disabled="processing" @click="openShipping('return')">
              <Icon name="lucide:truck" size="14" class="mr-1" /> 반송장 등록
            </Button>
            <Button size="sm" :disabled="processing" @click="completeReceive">
              <Icon name="lucide:package-check" size="14" class="mr-1" /> 입고 검수 완료
            </Button>
          </template>

          <!-- 교환 전용: 처리중일 때 교환 완료 (새 상품 송장) -->
          <template v-if="claim.status === 'IN_PROGRESS' && claim.claimType === 'EXCHANGE'">
            <Button size="sm" :disabled="processing" @click="openShipping('exchange')">
              <Icon name="lucide:replace" size="14" class="mr-1" /> 교환 완료 (새 상품 송장)
            </Button>
          </template>

          <!-- 거절 후 재배송: 반품/교환이 거절된 경우 고객에게 상품 돌려보내기 -->
          <template v-if="claim.status === 'REJECTED' && claim.claimType !== 'CANCEL'">
            <Button variant="outline" size="sm" :disabled="processing" @click="openShipping('reship')">
              <Icon name="lucide:undo-2" size="14" class="mr-1" /> 재배송 송장 등록
            </Button>
          </template>
        </template>
      </DetailSection>

      <DetailSection v-if="claim.returnTrackingNumber || claim.exchangeTrackingNumber" title="배송 정보">
        <template v-if="claim.returnTrackingNumber">
          <DetailField label="반송 택배사" :value="claim.returnShippingCarrier" />
          <DetailField label="반송 송장번호" :value="claim.returnTrackingNumber" mono />
        </template>
        <template v-if="claim.exchangeTrackingNumber">
          <DetailField label="교환 택배사" :value="claim.exchangeShippingCarrier" />
          <DetailField label="교환 송장번호" :value="claim.exchangeTrackingNumber" mono />
        </template>
      </DetailSection>

      <DetailSection v-if="claim.items?.length" title="클레임 대상 상품" :description="`${claim.items.length}개`">
        <div class="col-span-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>상품</TableHead>
                <TableHead>옵션</TableHead>
                <TableHead class="text-right">수량</TableHead>
                <TableHead>주문상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="item in claim.items" :key="item.orderItemId">
                <TableCell class="font-medium">{{ item.productName }}</TableCell>
                <TableCell>{{ formatSelectedOptions(item.selectedOptions) }}</TableCell>
                <TableCell class="text-right">{{ item.quantity }}</TableCell>
                <TableCell><StatusBadge :status="item.orderItemStatus" /></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </DetailSection>
    </div>

    <div v-else class="text-center text-muted-foreground py-20">
      클레임을 찾을 수 없습니다.
      <div class="mt-3">
        <Button variant="outline" size="sm" @click="router.push('/claims')">목록으로</Button>
      </div>
    </div>

    <!-- 송장 등록 Dialog (반송/재배송/교환 공용) -->
    <Dialog v-model:open="shippingOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ shippingTitle }}</DialogTitle>
          <DialogDescription v-if="shippingForm.mode === 'exchange'">
            교환 상품을 발송하셨다면 이 단계에서 클레임이 완료 처리됩니다.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-2">
          <div>
            <Label class="mb-1.5 block text-xs">배송 업체 <span class="text-destructive">*</span></Label>
            <Input v-model="shippingForm.shippingCarrier" placeholder="예: CJ대한통운" />
          </div>
          <div>
            <Label class="mb-1.5 block text-xs">송장번호 <span class="text-destructive">*</span></Label>
            <Input v-model="shippingForm.trackingNumber" class="font-mono" placeholder="송장번호 입력" />
          </div>
          <div v-if="shippingForm.mode === 'exchange'">
            <Label class="mb-1.5 block text-xs">관리자 메모 (선택)</Label>
            <Textarea v-model="shippingForm.adminNote" rows="2" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" :disabled="processing" @click="shippingOpen = false">취소</Button>
          <Button :disabled="processing" @click="submitShipping">
            <Icon name="lucide:check" size="14" class="mr-1" /> 등록
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
