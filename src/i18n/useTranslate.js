import { useCallback, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

// 장소 이름·주소 번역: const tt = useTranslate(['협재해수욕장', ...]);  tt('협재해수욕장') → 'Hyeopjae Beach'
// 선택한 언어가 한국어면 원문 그대로, 아니면 서버(AI)에 번역을 요청해 두고 오기 전까지는 원문을 보여준다.
export function useTranslate(texts) {
  const lang = useAppStore((s) => s.lang)
  const tr = useAppStore((s) => s.tr)
  const request = useAppStore((s) => s.requestTranslate)
  const key = texts.filter(Boolean).join('\n') // 같은 목록이면 다시 요청하지 않게 문자열로 비교

  useEffect(() => { if (key) request(key.split('\n')) }, [lang, key, request])

  return useCallback((text) => (!text || lang === 'ko' ? text : tr[`${lang}|${text}`] ?? text), [lang, tr])
}
