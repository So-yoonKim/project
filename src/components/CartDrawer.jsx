import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Form, InputGroup, Offcanvas } from 'react-bootstrap'
import { isSupabaseReady } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'
import { useT } from '../i18n/useT'

// 장바구니: 담은 나들이 전체 목록, - 버튼으로 삭제 / 닉네임을 입력하면 Supabase 에 저장
export default function CartDrawer() {
  const t = useT()
  const open = useAppStore((s) => s.cartOpen)
  const setOpen = useAppStore((s) => s.setCartOpen)
  const cart = useAppStore((s) => s.cart)
  const remove = useAppStore((s) => s.removeFromCart)
  const clear = useAppStore((s) => s.clearCart)
  const nickname = useAppStore((s) => s.nickname)
  const setNickname = useAppStore((s) => s.setNickname)
  const synced = useAppStore((s) => s.cartSynced)
  const [draft, setDraft] = useState(nickname)
  const navigate = useNavigate()

  // 서랍을 닫고 홈의 "내 코스 지도"로 이동 (서랍이 완전히 닫힌 뒤에 스크롤해야 바로 움직인다)
  const goMap = useRef(false)
  function showMap() {
    goMap.current = true
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
        <Form className="mb-3" onSubmit={(e) => { e.preventDefault(); setNickname(draft) }}>
          <InputGroup size="sm">
            <Form.Control value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('cart.nick.placeholder')} maxLength={20} />
            <Button type="submit" className="cart-btn rounded-0">{t('cart.nick.save')}</Button>
          </InputGroup>
          <Form.Text className="nick-hint">
            {!isSupabaseReady
              ? t('cart.hint.local')
              : synced
                ? t('cart.hint.synced', { nick: nickname })
                : t('cart.hint.need')}
          </Form.Text>
        </Form>

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
                    <div className="tag-title"><span className="cat-chip">{t(`cat.${c.cat}.label`)}</span>{c.title}</div>
                    <div className="tag-addr"><i className="bi bi-geo-alt-fill me-1" />{c.addr || t('place.noAddr')}</div>
                  </div>
                  <Button className="minus-btn" aria-label={t('cart.remove', { title: c.title })} onClick={() => remove(c.key)}>
                    <i className="bi bi-dash-lg" />
                  </Button>
                </li>
              ))}
            </ul>
            <div className="d-flex gap-2 mt-3">
              <Button className="cart-btn" size="sm" onClick={showMap}><i className="bi bi-map me-1" />{t('cart.viewMap')}</Button>
              <Button variant="outline-dark" size="sm" onClick={clear}>{t('cart.clear')}</Button>
            </div>
          </>
        )}
      </Offcanvas.Body>
    </Offcanvas>
  )
}
