export const formatCurrency = (v: number | string | null | undefined): string => {
  if (v === null || v === undefined || v === '') return '-'
  const n = typeof v === 'string' ? Number(v) : v
  if (Number.isNaN(n)) return '-'
  return `${n.toLocaleString()}원`
}

export const formatNumber = (v: number | string | null | undefined): string => {
  if (v === null || v === undefined || v === '') return '-'
  const n = typeof v === 'string' ? Number(v) : v
  if (Number.isNaN(n)) return '-'
  return n.toLocaleString()
}

export const formatDate = (iso?: string | null): string => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const formatDateShort = (iso?: string | null): string => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * 숫자 → 한글 금액 (가독성용 보조 표기).
 * 예: 30,000 → "3만원", 33,000 → "3만 3천원", 33,500 → "3만 3,500원",
 *     1,500,000 → "150만원", 100,000,000 → "1억원"
 *
 * 사용처: CurrencyInput 옆 라벨에 입력 중인 금액의 직관적 크기 표시.
 * 빈 값(0/null/undefined) 은 빈 문자열 반환 — 라벨 옆에 표시할 때 자연스럽게 사라짐.
 */
export const toKoreanCurrency = (v: number | string | null | undefined): string => {
  if (v == null || v === '') return ''
  const num = typeof v === 'string' ? Number(String(v).replace(/[^\d-]/g, '')) : v
  if (!Number.isFinite(num) || num === 0) return ''

  const neg = num < 0
  let n = Math.abs(num)

  const eok = Math.floor(n / 100_000_000)
  n %= 100_000_000
  const man = Math.floor(n / 10_000)
  n %= 10_000
  const cheon = Math.floor(n / 1000)
  const rest = n % 1000

  const parts: string[] = []
  if (eok > 0) parts.push(`${eok.toLocaleString()}억`)
  if (man > 0) parts.push(`${man.toLocaleString()}만`)
  // 천 단위가 딱 떨어지면 "3천" 같이 한글로, 잔돈 있으면 숫자 그대로
  if (cheon > 0 && rest === 0) parts.push(`${cheon}천`)
  else if (n > 0) parts.push(n.toLocaleString())

  if (!parts.length) return ''
  return (neg ? '-' : '') + parts.join(' ') + '원'
}

export const formatPhone = (v?: string | null): string => {
  if (!v) return '-'
  const cleaned = v.replace(/\D/g, '')
  if (cleaned.length === 11) return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')
  if (cleaned.length === 10) return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')
  return v
}
