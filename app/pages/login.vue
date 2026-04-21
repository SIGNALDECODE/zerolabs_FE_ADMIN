<script setup lang="ts">
definePageMeta({ layout: 'auth' })
useHead({ title: 'ZeroLabs Admin — 로그인' })

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const form = reactive({ email: '', password: '' })
const submitting = ref(false)
const errorMessage = ref('')

const redirectPath = computed(() => (route.query.redirect as string) || '/')

onMounted(() => {
  if (authStore.isLoggedIn) router.replace(redirectPath.value)
})

const handleSubmit = async () => {
  submitting.value = true
  errorMessage.value = ''
  try {
    await authStore.loginWith({ email: form.email, password: form.password })
    router.push(redirectPath.value)
  } catch (err) {
    errorMessage.value = (err as { message?: string })?.message || '로그인에 실패했습니다.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen grid place-items-center bg-muted/30 px-4">
    <Card class="w-full max-w-sm">
      <CardHeader class="text-center">
        <CardTitle class="text-xl">ZeroLabs Admin</CardTitle>
        <CardDescription>관리자 계정으로 로그인</CardDescription>
      </CardHeader>
      <CardContent>
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div class="space-y-1.5">
            <Label for="email">이메일</Label>
            <Input
              id="email"
              v-model="form.email"
              type="email"
              required
              autocomplete="username"
              placeholder="admin@example.com"
            />
          </div>

          <div class="space-y-1.5">
            <Label for="password">비밀번호</Label>
            <Input
              id="password"
              v-model="form.password"
              type="password"
              required
              autocomplete="current-password"
            />
          </div>

          <p v-if="errorMessage" class="text-sm text-destructive" role="alert">
            <Icon name="lucide:triangle-alert" size="12" class="inline mr-1" />
            {{ errorMessage }}
          </p>

          <Button type="submit" class="w-full" :disabled="submitting">
            {{ submitting ? '로그인 중…' : '로그인' }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
