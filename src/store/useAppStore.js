import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { askAgent } from '../api/client'
import { supabase } from '../lib/supabase'
import { CATEGORIES } from '../data/categories'

const ICON = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.icon]))

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
          const { answer, steps } = await askAgent(text, history, get().lang)
          set({ messages: [...get().messages, { role: 'assistant', text: answer, steps }] })
        } catch (e) {
          get().toast(e.message, 'danger')
        } finally {
          set({ chatLoading: false })
        }
      },
    }),
    {
      name: 'seolmundae-store',
      partialize: (s) => ({ nickname: s.nickname, cart: s.cart, lang: s.lang }),
    },
  ),
)
