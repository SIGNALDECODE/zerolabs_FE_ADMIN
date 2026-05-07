<script setup lang="ts">
import { formatDate } from '~/utils/format'
import type { CouponListItem } from '~/types/marketing'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  'update:open': [v: boolean]
  'pick': [coupon: CouponListItem]
}>()

const couponApi = useAdminCoupon()

const keyword = ref('')
const items = ref<CouponListItem[]>([])
const loading = ref(false)
const total = ref(0)

const load = async () => {
  loading.value = true
  try {
    const data = await couponApi.list({
      keyword: keyword.value || undefined,
      page: 1,
      size: 30
    })
    items.value = data?.content ?? []
    total.value = data?.total_elements ?? 0
  } finally { loading.value = false }
}

watch(() => props.open, (open) => {
  if (open) {
    keyword.value = ''
    load()
  }
})

watchDebounced(keyword, load, { debounce: 300 })

const choose = (c: CouponListItem) => {
  emit('pick', c)
  emit('update:open', false)
}

const close = () => emit('update:open', false)
</script>

<template>
  <Dialog :open="open" @update:open="(v: boolean) => !v && close()">
    <DialogContent class="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>쿠폰 검색</DialogTitle>
        <DialogDescription>
          이벤트에 연결할 쿠폰을 선택하세요. 비공개(목록 비노출) 쿠폰도 연결 가능합니다.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-3">
        <Input v-model="keyword" placeholder="쿠폰명 검색" autofocus />

        <div class="max-h-[420px] overflow-auto rounded border">
          <div v-if="loading" class="text-center text-sm text-muted-foreground py-10">불러오는 중…</div>
          <div v-else-if="!items.length" class="text-center text-sm text-muted-foreground py-10">
            검색 결과가 없습니다.
          </div>
          <ul v-else class="divide-y">
            <li
              v-for="c in items"
              :key="c.id"
              class="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/50 cursor-pointer transition-colors"
              @click="choose(c)"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-medium truncate">{{ c.name }}</span>
                  <span class="text-[11px] text-muted-foreground">#{{ c.id }}</span>
                  <StatusBadge :status="c.status" />
                  <span
                    v-if="c.isVisible === false"
                    class="text-[11px] rounded border border-amber-200 bg-amber-50 text-amber-700 px-1.5 py-0.5"
                  >목록 숨김</span>
                </div>
                <div class="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                  <span>{{ c.couponType === 'FREE_SHIPPING' ? '무료배송' : '상품할인' }}</span>
                  <span v-if="c.discountType === 'RATE'">{{ c.discountValue }}%</span>
                  <span v-else-if="c.discountType === 'AMOUNT'">{{ c.discountValue.toLocaleString() }}원</span>
                  <span>· 등록 {{ formatDate(c.createdAt) }}</span>
                </div>
              </div>
              <Button size="sm" variant="outline" type="button">선택</Button>
            </li>
          </ul>
        </div>

        <p v-if="total > items.length" class="text-xs text-muted-foreground text-center">
          상위 {{ items.length }}건만 표시. 검색어로 좁혀주세요. (총 {{ total.toLocaleString() }}건)
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="close">취소</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
