import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Form, InputGroup, Offcanvas } from 'react-bootstrap'
import { isSupabaseReady } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'
import { useT } from '../i18n/useT'
import { useTranslate } from '../i18n/useTranslate'

// 장바구니: 담은 나들이 전체 목록, - 버튼으로 삭제 / 닉네임을 입력하면 Supabase 에 저장
export default function CartDrawer() {
  const t = useT()
  const open = useAppStore((s) => s.cartOpen)
  const setOpen = useAppStore((s) => s.setCartOpen)
  const cart = useAppStore((s) => s.cart)
  const remove = useAppStore((s) => s.removeFromCart)
  const clear = useAppStore((s) => s.clearCart)
  const nickname = useAppStore((s) => s.nickname)
  const signedIn = useAppStore((s) => Boolean(s.token))
  const signIn = useAppStore((s) => s.signIn)
  const signOut = useAppStore((s) => s.signOut)
  const authBusy = useAppStore((s) => s.authBusy)
  const authNotice = useAppStore((s) => s.authNotice)
  const toast = useAppStore((s) => s.toast)
  const synced = useAppStore((s) => s.cartSynced)
  const tt = useTranslate(cart.flatMap((c) => [c.title, c.addr]))
  const [draft, setDraft] = useState(nickname)
  const [pin, setPin] = useState('')
  const [msg, setMsg] = useState('') // 들어가기 결과 안내 (비밀번호 틀림 등)

  async function onSubmit(e) {
    e.preventDefault()
    setMsg('')
    const r = await signIn(draft, pin)
    if (r.status === 'created') toast(t('cart.auth.created', { nick: r.nickname }))
    else if (r.status === 'ok') toast(t('cart.auth.welcome', { nick: r.nickname }))
    else if (r.status !== 'local') setMsg(t(`cart.auth.${r.status}`)) // wrong · locked · invalid · error
    if (r.status === 'created' || r.status === 'ok') setPin('')
  }
  const navigate = useNavigate()

  // 서랍을 닫고 홈의 "내 코스 지도"로 이동 (서랍이 완전히 닫힌 뒤에 스크롤해야 바로 움직인다)
  const goMap = useRef(false)
  function showMap() {
    goMap.current = true
    useAppStore.getState().setStage('shop') // 첫 화면에는 지도가 없으니 진열대 화면으로 넘긴다
    setOpen(false)
    navigate('/')
  }
  function onClosed() {
    if (!goMap.current) return
    goMap.current = false
    // 서랍이 걸어 둔 스크롤 잠금이 풀린 뒤에, 위쪽 고정 메뉴(sticky)에 가려지지 않도록 그 높이만큼 비워서 이동
    setTimeout(() => {
      const map = document.getElementById('course-map')
      const nav = document.querySelector('.shop-nav')?.offsetHeight ?? 0
      if (map) window.scrollTo({ top: map.getBoundingClientRect().top + window.scrollY - nav - 12, behavior: 'instant' })
    }, 150)
  }

  return (
    <Offcanvas show={open} onHide={() => setOpen(false)} onExited={onClosed} placement="end" className="cart-drawer">
      <Offcanvas.Header closeButton>
        <Offcanvas.Title className="svg-title"><i className="bi bi-basket3-fill me-2" />{t('cart.title')} ({cart.length})</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <div className="mb-3">
          {!isSupabaseReady && <Form.Text className="nick-hint">{t('cart.hint.local')}</Form.Text>}

          {isSupabaseReady && !signedIn && (
            <Form onSubmit={onSubmit}>
              <Form.Control size="sm" className="mb-2" value={draft} onChange={(e) => setDraft(e.target.value)}
                placeholder={t('cart.nick.placeholder')} maxLength={20} autoComplete="username" />
              <InputGroup size="sm">
                <Form.Control type="password" inputMode="numeric" autoComplete="current-password" maxLength={6}
                  value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder={t('cart.pin.placeholder')} />
                <Button type="submit" className="cart-btn rounded-0" disabled={authBusy}>{t('cart.nick.save')}</Button>
              </InputGroup>
              <Form.Text className="nick-hint">{t('cart.hint.need')}</Form.Text>
            </Form>
          )}

          {isSupabaseReady && signedIn && (
            <div className="d-flex align-items-center justify-content-between gap-2">
              <Form.Text className="nick-hint m-0">{synced ? t('cart.hint.synced', { nick: nickname }) : `☁ ${nickname}`}</Form.Text>
              <Button variant="outline-dark" size="sm" className="flex-shrink-0" onClick={signOut}>{t('cart.auth.out')}</Button>
            </div>
          )}

          {(msg || authNotice === 'expired') && <div className="nick-error">{msg || t('cart.auth.expired')}</div>}
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-5 cart-empty">
            <i className="bi bi-basket fs-1 d-block mb-2" />
            {t('cart.empty')}<br />{t('cart.emptyHint')}
          </div>
        ) : (
          <>
            <ul className="tag-list">
              {cart.map((c) => (
                <li key={c.key} className="tag-item">
                  <span className="tag-img tag-img-empty"><i className={`bi bi-${c.icon ?? 'geo-alt'}`} /></span>
                  <div className="tag-text">
                    <div className="tag-title"><span className="cat-chip">{t(`cat.${c.cat}.label`)}</span>{tt(c.title)}</div>
                    {tt(c.title) !== c.title && <div className="tag-orig">{c.title}</div>}
                    <div className="tag-addr"><i className="bi bi-geo-alt-fill me-1" />{tt(c.addr) || t('place.noAddr')}</div>
                  </div>
                  <Button className="minus-btn" aria-label={t('cart.remove', { title: tt(c.title) })} onClick={() => remove(c.key)}>
                    <i className="bi bi-dash-lg" />
                  </Button>
                </li>
              ))}
            </ul>
            <div className="d-flex gap-2 mt-3">
              <Button className="cart-btn" size="sm" onClick={showMap}><i className="bi bi-map me-1" />{t('cart.viewMap')}</Button>
              <Button variant="outline-dark" size="sm" onClick={clear}>{t('cart.clear')}</Button>
            </div>
            {/* 할망의 당부: 코스를 한 곳 이상 담았을 때만, 선택한 언어 한 가지로만 보인다 */}
            <aside className="postit cart-postit">
              <span className="postit-pin" />
              <h3 className="postit-title">{t('cart.note.title')}</h3>
              <p>{t('cart.note.l1')}</p>
              <p>{t('cart.note.l2')}</p>
              <p className="mb-0">{t('cart.note.l3')}</p>
            </aside>
          </>
        )}
      </Offcanvas.Body>
    </Offcanvas>
  )
}
