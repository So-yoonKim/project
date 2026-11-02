import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { askAgent, translateTexts } from '../api/client'
import { supabase } from '../lib/supabase'
import { CATEGORIES } from '../data/categories'

const ICON = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.icon]))
const asked = new Set() // 이미 번역을 요청한 "언어|문장" (화면을 다시 그려도 중복 요청하지 않게)

// ── 앱 전체가 함께 쓰는 상태 ──────────────────────────────
export const useAppStore = create(
  persist(
    (set, get) => ({
      // ① 알림(토스트)
      toasts: [],
      toast: (message, variant = 'success') => {
        const id = Date.now() + Math.random()
        set({ toasts: [...get().toasts, { id, message, variant }] })
        setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 2500)
      },

      // ② 언어 — ko | en | zh | ja | ru (새로고침해도 유지)
      lang: 'ko',
      setLang: (lang) => set({ lang }),

      // ②-2 장소 이름·주소 번역 저장소 — { 'en|협재해수욕장': 'Hyeopjae Beach' }. 번역한 건 브라우저에 남겨 다시 부르지 않는다
      tr: {},
      seedTranslations: (entries) => set({ tr: { ...get().tr, ...entries } }), // 이미 아는 번역을 미리 넣는다 (3D 지도의 이름 등)
      requestTranslate: async (texts) => {
        const lang = get().lang
        if (lang === 'ko') return
        const need = [...new Set(texts)].filter((t) => t && !get().tr[`${lang}|${t}`] && !asked.has(`${lang}|${t}`))
        if (!need.length) return
        need.forEach((t) => asked.add(`${lang}|${t}`)) // 실패해도 같은 문장을 계속 다시 묻지 않는다
        for (let i = 0; i < need.length; i += 40) { // 서버는 한 번에 40개까지
          const chunk = need.slice(i, i + 40)
          try {
            const { translations } = await translateTexts(lang, chunk)
            set({ tr: { ...get().tr, ...Object.fromEntries(chunk.map((t, k) => [`${lang}|${t}`, translations[k]])) } })
          } catch { /* 번역이 안 되면 한국어 원문을 그대로 보여준다 */ }
        }
      },

      // ③ 닉네임 — 이 이름으로 Supabase trips 테이블에 장바구니를 저장합니다
      nickname: '',
      setNickname: async (nickname) => {
        set({ nickname: nickname.trim() })
        await get().loadCart()
      },

      // ④ 장바구니(나들이 리스트) — 닉네임이 있으면 Supabase 와 동기화, 없으면 이 브라우저에만 저장
      cart: [], // { key, title, addr, lat, lng, cat, icon }
      stage: 'intro', // 홈 화면 단계: intro(첫 화면) → shop(카드 진열대). 저장하지 않는다
      setStage: (stage) => set({ stage }),
      cartOpen: false,
      setCartOpen: (cartOpen) => set({ cartOpen }),
      cartSynced: false, // 마지막 저장·불러오기가 Supabase 에 성공했는지
      loadCart: async () => {
        const { nickname, toast } = get()
        if (!supabase || !nickname) return set({ cartSynced: false })
        const { data, error } = await supabase
          .from('trips').select('*').eq('nickname', nickname).order('created_at')
        if (error) { set({ cartSynced: false }); return toast(`불러오기 실패: ${error.message}`, 'danger') }
        set({
          cartSynced: true,
          cart: data.map((r) => ({ key: r.item_key, title: r.title, addr: r.addr, lat: r.lat, lng: r.lng, cat: r.cat, icon: ICON[r.cat] })),
        })
      },
      addToCart: async (item) => {
        if (get().cart.some((c) => c.key === item.key)) return
        set({ cart: [...get().cart, item] })
        const { nickname, toast } = get()
        if (!supabase || !nickname) return
        const { error } = await supabase.from('trips').insert({
          nickname, item_key: item.key, cat: item.cat, title: item.title, addr: item.addr, lat: item.lat, lng: item.lng,
        })
        if (error && error.code !== '23505') { // 23505 = 이미 담김
          set({ cart: get().cart.filter((c) => c.key !== item.key) })
          toast(`저장 실패: ${error.message}`, 'danger')
        }
      },
      removeFromCart: async (key) => {
        const before = get().cart
        set({ cart: before.filter((c) => c.key !== key) })
        const { nickname, toast } = get()
        if (!supabase || !nickname) return
        const { error } = await supabase.from('trips').delete().eq('nickname', nickname).eq('item_key', key)
        if (error) { set({ cart: before }); toast(`삭제 실패: ${error.message}`, 'danger') }
      },
      clearCart: async () => {
        const before = get().cart
        set({ cart: [] })
        const { nickname, toast } = get()
        if (!supabase || !nickname) return
        const { error } = await supabase.from('trips').delete().eq('nickname', nickname)
        if (error) { set({ cart: before }); toast(`삭제 실패: ${error.message}`, 'danger') }
      },

      // ⑤ 에이전트 대화
      messages: [], // { role: 'user' | 'assistant', text, steps }
      chatLoading: false,
      sendMessage: async (text) => {
        const history = get().messages.map((m) => ({ role: m.role, content: m.text }))
        set({ messages: [...get().messages, { role: 'user', text }], chatLoading: true })
        try {
          const { answer, steps, practice } = await askAgent(text, history, get().lang)
          set({ messages: [...get().messages, { role: 'assistant', text: answer, steps, practice }] })
        } catch (e) {
          get().toast(e.message, 'danger')
        } finally {
          set({ chatLoading: false })
        }
      },
    }),
    {
      name: 'seolmundae-store',
      partialize: (s) => ({ nickname: s.nickname, cart: s.cart, lang: s.lang, tr: s.tr }),
    },
  ),
)
