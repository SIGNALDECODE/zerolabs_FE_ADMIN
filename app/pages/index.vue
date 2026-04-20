<script setup lang="ts">
useHead({ title: '대시보드 | ZeroLabs Admin' })

const orderApi = useAdminOrder()
const claimApi = useAdminClaim()

const orderStats = ref({ pending: 0, preparing: 0, shipping: 0, delivered: 0 })
const recentOrders = ref<any[]>([])
const pendingClaims = ref(0)
const loading = ref(false)

const loadDashboard = async () => {
  loading.value = true
  try {
    const [orders, claims] = await Promise.all([
      orderApi.list({ page: 1, size: 5 }).catch(() => null),
      claimApi.list({ status: 'REQUESTED', page: 1, size: 1 }).catch(() => null)
    ])

    recentOrders.value = orders?.content || []
    orderStats.value = (orders as any)?.statusSummary || orderStats.value
    pendingClaims.value = claims?.totalElements || 0
  } finally {
    loading.value = false
  }
}

onMounted(loadDashboard)
</script>

<template>
  <div class="p-8">
    <PageHeader title="대시보드" description="쇼핑몰 운영 현황 한눈에 보기" />

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardDescription>입금대기</CardDescription>
          <Icon name="lucide:clock" size="16" class="text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ orderStats.pending }}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardDescription>배송준비</CardDescription>
          <Icon name="lucide:package" size="16" class="text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ orderStats.preparing }}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardDescription>배송중</CardDescription>
          <Icon name="lucide:truck" size="16" class="text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ orderStats.shipping }}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardDescription>클레임 대기</CardDescription>
          <Icon name="lucide:alert-circle" size="16" class="text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ pendingClaims }}</div>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>최근 주문</CardTitle>
        <CardDescription>최근 5건</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>주문번호</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>금액</TableHead>
              <TableHead>주문일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="loading">
              <TableCell colspan="4" class="text-center text-muted-foreground py-8">불러오는 중…</TableCell>
            </TableRow>
            <TableRow v-else-if="!recentOrders.length">
              <TableCell colspan="4" class="text-center text-muted-foreground py-8">최근 주문이 없습니다.</TableCell>
            </TableRow>
            <TableRow v-for="order in recentOrders" :key="order.id">
              <TableCell class="font-mono text-xs">{{ order.orderNumber }}</TableCell>
              <TableCell><Badge variant="secondary">{{ order.status }}</Badge></TableCell>
              <TableCell>{{ order.grandTotal?.toLocaleString?.() ?? '-' }}원</TableCell>
              <TableCell class="text-muted-foreground">{{ order.createdAt }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
</template>
