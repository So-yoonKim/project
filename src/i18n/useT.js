import { useAppStore } from '../store/useAppStore'
import { MESSAGES } from './messages'

// 번역 함수 만들기: t('cart.title')  ·  t('place.added', { title: '아부오름' })
// 선택한 언어에 문구가 없으면 한국어로 대신 보여줍니다.
export function makeT(lang) {
  return (key, vars = {}) => {
    const text = MESSAGES[lang]?.[key] ?? MESSAGES.ko[key] ?? key
    return text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
  }
}

export function useT() {
  const lang = useAppStore((s) => s.lang)
  return makeT(lang)
}

// 서버가 준 meta(영업시간·표고 등)를 선택한 언어의 한 줄 문장으로 만든다
export function formatMeta(meta, t) {
  if (!meta) return ''
  const parts = []
  if (meta.weekday) parts.push(meta.weekday === meta.weekend ? t('meta.open', { v: meta.weekday }) : t('meta.weekday', { v: meta.weekday }))
  if (meta.weekend && meta.weekday !== meta.weekend) parts.push(t('meta.weekend', { v: meta.weekend }))
  if (meta.rest) parts.push(t('meta.rest', { v: meta.rest }))
  if (meta.reservable) parts.push(t('meta.reservable'))
  if (meta.elev) parts.push(t('meta.elev', { v: meta.elev }))
  if (meta.rel) parts.push(t('meta.rel', { v: meta.rel }))
  return parts.join(' · ')
}
