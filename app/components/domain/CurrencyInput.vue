<script setup lang="ts">
/**
 * 숫자 입력 시 자동으로 `1,234,567` 형태로 콤마 표시.
 *
 * 특징:
 *  - 시각적으로는 콤마 포함, 실제 v-model 은 순수 숫자(number) 또는 undefined
 *  - `type="text"` + `inputmode="numeric"` → 모바일에서도 숫자 키패드 노출
 *  - 0 이상 정수만 (금액·수량 위주). 소수/음수가 필요하면 별도 컴포넌트 권장
 *  - shadcn Input 을 그대로 래핑하므로 스타일·포커스 상태 동일
 *
 * 사용:
 * ```
 * <CurrencyInput v-model="form.regularPrice" placeholder="예: 29000" />
 * ```
 */
const props = defineProps<{
  modelValue?: number | string | null
  placeholder?: string
  disabled?: boolean
  class?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number | undefined]
}>()

const format = (v: number | string | null | undefined): string => {
  if (v == null || v === '') return ''
  const digits = String(v).replace(/[^\d]/g, '')
  if (digits === '') return ''
  return Number(digits).toLocaleString('en-US')
}

const displayValue = ref(format(props.modelValue))

// 외부 modelValue 변경 시 display 동기화 (reset / load 등)
watch(() => props.modelValue, (v) => {
  const formatted = format(v)
  if (formatted !== displayValue.value) displayValue.value = formatted
})

const onUpdate = (v: string | number) => {
  const digits = String(v).replace(/[^\d]/g, '')
  const num = digits === '' ? undefined : Number(digits)
  displayValue.value = format(num)
  emit('update:modelValue', num)
}
</script>

<template>
  <Input
    :model-value="displayValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :class="props.class"
    type="text"
    inputmode="numeric"
    @update:model-value="onUpdate"
  />
</template>
