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

      // ③ 닉네임 + 숫자 비밀번호 — 닉네임은 하나뿐이고 비밀번호를 아는 사람만 그 장바구니를 쓴다.
      //    비밀번호는 서버(DB 함수 nick_enter)가 확인하고, 이 브라우저에는 로그인 성공 때 받은 임시 열쇠(token)만 남긴다.
      //    (supabase/nickname-pin.sql 을 실행해야 동작합니다)
      nickname: '',
      token: '',
      authBusy: false,
      authNotice: '', // 'expired' = 열쇠가 만료돼 나가진 경우 (화면이 안내문을 보여준다)
      signIn: async (nickname, pin) => {
        const nick = nickname.trim()
        if (!supabase) return { status: 'local' }
        if (!nick || nick.length > 20 || !/^\d{4,6}$/.test(pin)) return { status: 'invalid' }
        set({ authBusy: true })
        try {
          const { data, error } = await supabase.rpc('nick_enter', { p_nick: nick, p_pin: pin })
          if (error) return { status: 'error', message: error.message }
          if (data.status === 'created' || data.status === 'ok') {
            const local = get().cart // 들어오기 전에 담아 둔 항목은 이 닉네임으로 옮긴다
            set({ nickname: data.nickname, token: data.token, authNotice: '' })
            for (const item of local) {
              await supabase.rpc('trips_add', {
                p_token: data.token, p_key: item.key, p_cat: item.cat, p_title: item.title,
                p_addr: item.addr ?? '', p_lat: String(item.lat ?? ''), p_lng: String(item.lng ?? ''),
              })
            }
            await get().loadCart()
          }
          return data
        } finally {
          set({ authBusy: false })
        }
      },
      signOut: async () => {
        const { token } = get()
        set({ nickname: '', token: '', cart: [], cartSynced: false, authNotice: '' }) // 같은 기기를 쓰는 다음 사람에게 보이지 않게 비운다
        if (supabase && token) supabase.rpc('nick_leave', { p_token: token }).then(() => {}, () => {})
      },
      // 열쇠가 만료됐거나 없어진 경우: 조용히 나가고 안내문만 남긴다
      expireSession: () => set({ nickname: '', token: '', cart: [], cartSynced: false, authNotice: 'expired' }),

      // ④ 장바구니(나들이 리스트) — 들어와 있으면 Supabase 와 동기화, 아니면 이 브라우저에만 저장
      cart: [], // { key, title, addr, lat, lng, cat, icon }
      stage: 'intro', // 홈 화면 단계: intro(첫 화면) → shop(카드 진열대). 저장하지 않는다
      setStage: (stage) => set({ stage }),
      cartOpen: false,
      setCartOpen: (cartOpen) => set({ cartOpen }),
      cartSynced: false, // 마지막 저장·불러오기가 Supabase 에 성공했는지
      loadCart: async () => {
        const { token, toast } = get()
        if (!supabase || !token) return set({ cartSynced: false })
        const { data, error } = await supabase.rpc('trips_list', { p_token: token })
        if (error) {
          set({ cartSynced: false })
          if (error.message.includes('bad_token')) return get().expireSession()
          return toast(`불러오기 실패: ${error.message}`, 'danger')
        }
        set({
          cartSynced: true,
          cart: data.map((r) => ({ key: r.item_key, title: r.title, addr: r.addr, lat: r.lat, lng: r.lng, cat: r.cat, icon: ICON[r.cat] })),
        })
      },
      addToCart: async (item) => {
        if (get().cart.some((c) => c.key === item.key)) return
        set({ cart: [...get().cart, item] })
        const { token, toast } = get()
        if (!supabase || !token) return
        const { error } = await supabase.rpc('trips_add', {
          p_token: token, p_key: item.key, p_cat: item.cat, p_title: item.title,
          p_addr: item.addr ?? '', p_lat: String(item.lat ?? ''), p_lng: String(item.lng ?? ''),
        })
        if (error) {
          set({ cart: get().cart.filter((c) => c.key !== item.key) })
          if (error.message.includes('bad_token')) return get().expireSession()
          toast(`저장 실패: ${error.message}`, 'danger')
        }
      },
      removeFromCart: async (key) => {
        const before = get().cart
        set({ cart: before.filter((c) => c.key !== key) })
        const { token, toast } = get()
        if (!supabase || !token) return
        const { error } = await supabase.rpc('trips_remove', { p_token: token, p_key: key })
        if (error) {
          set({ cart: before })
          if (error.message.includes('bad_token')) return get().expireSession()
          toast(`삭제 실패: ${error.message}`, 'danger')
        }
      },
      clearCart: async () => {
        const before = get().cart
        set({ cart: [] })
        const { token, toast } = get()
        if (!supabase || !token) return
        const { error } = await supabase.rpc('trips_clear', { p_token: token })
        if (error) {
          set({ cart: before })
          if (error.message.includes('bad_token')) return get().expireSession()
          toast(`삭제 실패: ${error.message}`, 'danger')
        }
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
      partialize: (s) => ({ nickname: s.nickname, token: s.token, cart: s.cart, lang: s.lang, tr: s.tr }),
    },
  ),
)
