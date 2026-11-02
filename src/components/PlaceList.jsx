import { Button } from 'react-bootstrap'
import { useAppStore } from '../store/useAppStore'
import { formatMeta, useT } from '../i18n/useT'
import { useTranslate } from '../i18n/useTranslate'

// 주소가 있는 장소 목록 — 오른쪽 + 버튼으로 장바구니에 담기
// (공공데이터에 사진이 없어서 카테고리 아이콘을 대신 보여줍니다. 장소 이름·주소는 한국어 원문 그대로)
export default function PlaceList({ items, catId, icon }) {
  const t = useT()
  const cart = useAppStore((s) => s.cart)
  const addToCart = useAppStore((s) => s.addToCart)
  const toast = useAppStore((s) => s.toast)
  const tt = useTranslate(items.flatMap((p) => [p.title, p.addr])) // 이름·주소를 선택한 언어로 (원문은 아래에 작게)

  function add(p, key) {
    addToCart({ key, title: p.title, addr: p.addr, lat: p.lat, lng: p.lng, icon, cat: catId }) // 저장은 한국어 원문
    toast(t('place.added', { title: tt(p.title) }))
  }

  return (
    <ul className="tag-list">
      {items.map((p, i) => {
        const key = `${catId}:${p.id}`
        const inCart = cart.some((c) => c.key === key)
        const info = formatMeta(p.meta, t)
        return (
          <li key={key} className="tag-item" style={{ '--i': i }}>
            <span className="tag-img tag-img-empty"><i className={`bi bi-${icon}`} /></span>
            <div className="tag-text">
              <div className="tag-title">{tt(p.title)}</div>
              {tt(p.title) !== p.title && <div className="tag-orig">{p.title}</div>}
              <div className="tag-addr"><i className="bi bi-geo-alt-fill me-1" />{tt(p.addr) || t('place.noAddr')}</div>
              {info && <div className="tag-info">{info}</div>}
              {p.desc && <div className="tag-desc">{p.desc}</div>}
            </div>
            <Button className="plus-btn" disabled={inCart} aria-label={t('place.addAria', { title: tt(p.title) })} onClick={() => add(p, key)}>
              <i className={`bi bi-${inCart ? 'check-lg' : 'plus-lg'}`} />
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
