import { useEffect, useRef, useState } from 'react'
import { Button } from 'react-bootstrap'
import { useAppStore } from '../store/useAppStore'
import { useT } from '../i18n/useT'
import { PLACES, TEXT, TYPES } from '../data/places3d'
import { createJejuScene } from '../three/jejuScene'

// 3D 제주 지도: 돌하르방 30곳. 핀을 누르면 카메라가 날아가 설명 카드가 열리고, + 로 장바구니에 담는다.
export default function Map3D() {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const cart = useAppStore((s) => s.cart)
  const addToCart = useAppStore((s) => s.addToCart)
  const toast = useAppStore((s) => s.toast)
  const text = TEXT[lang] ?? TEXT.ko

  const stageRef = useRef(null)
  const labelsRef = useRef(null)
  const listRef = useRef(null)
  const sceneRef = useRef(null)
  const namesRef = useRef(text.names)
  const [selected, setSelected] = useState(null) // 선택한 핀 번호
  const [typeOn, setTypeOn] = useState({ mt: true, sea: true, forest: true, culture: true })
  const [failed, setFailed] = useState(false)

  // 장면은 이 화면에 있는 동안만 만들고, 떠날 때 정리한다
  useEffect(() => {
    let scene
    try {
      scene = createJejuScene({
        container: stageRef.current, labelsEl: labelsRef.current, places: PLACES, types: TYPES,
        names: namesRef.current, onSelect: setSelected,
      })
    } catch {
      setFailed(true) // WebGL 을 쓸 수 없는 기기
      return
    }
    sceneRef.current = scene
    return () => { scene.dispose(); sceneRef.current = null }
  }, [])

  useEffect(() => { namesRef.current = text.names; sceneRef.current?.setNames(text.names) }, [text])

  // 선택한 핀의 버튼이 아래 목록 가운데에 오게 한다
  useEffect(() => {
    const list = listRef.current, btn = list?.querySelector('.sel')
    if (btn) list.scrollTo({ left: btn.offsetLeft - list.clientWidth / 2 + btn.clientWidth / 2, behavior: 'smooth' })
  }, [selected])

  function pick(i) {
    if (i === selected) return closeCard() // 선택된 것을 다시 누르면 해제
    sceneRef.current?.select(i); setSelected(i)
  }
  function closeCard() { sceneRef.current?.clearSelection(); setSelected(null) }
  function home() { sceneRef.current?.home(); setSelected(null) }
  function toggleType(k) {
    const on = !typeOn[k]
    setTypeOn({ ...typeOn, [k]: on })
    sceneRef.current?.setTypeOn(k, on)
    if (selected !== null && PLACES[selected].type === k && !on) setSelected(null)
  }

  const sel = selected === null ? null : PLACES[selected]
  const key = `m3d:${selected}`
  const inCart = sel && cart.some((c) => c.key === key)
  function add() {
    const info = TYPES[sel.type]
    addToCart({ key, title: text.names[selected], addr: '', lat: sel.lat, lng: sel.lng, icon: info.icon, cat: info.cat })
    toast(t('place.added', { title: text.names[selected] }))
  }

  return (
    <div className="m3d">
      <div ref={stageRef} className="m3d-stage" />
      <div ref={labelsRef} className="m3d-labels" />
      {failed && <div className="m3d-fail">{t('m3d.noWebgl')}</div>}

      <div className="m3d-title"><b>🗿 {t('m3d.title')}</b><span>{t('m3d.sub', { n: PLACES.length })}</span></div>
      <div className="m3d-filters">
        {Object.keys(TYPES).map((k) => (
          <button key={k} type="button" className={`m3d-chip ${typeOn[k] ? 'act' : ''}`} onClick={() => toggleType(k)}>
            <i className="m3d-dot" style={{ background: TYPES[k].css }} />{t(`m3d.type.${k}`)}
          </button>
        ))}
      </div>

      {sel && (
        <div className="m3d-card">
          <div className="m3d-card-head">
            <b>{text.names[selected]}</b>
            <button type="button" className="m3d-x" aria-label={t('m3d.close')} onClick={closeCard}>✕</button>
          </div>
          <div className="m3d-card-type">{TYPES[sel.type].emoji} {t(`m3d.type.${sel.type}`)}</div>
          <p>{text.intros[selected]}</p>
          <Button className="plus-btn m3d-add" size="sm" disabled={inCart} onClick={add}>
            <i className={`bi bi-${inCart ? 'check-lg' : 'plus-lg'} me-1`} />{inCart ? t('m3d.inCart') : t('m3d.add')}
          </Button>
        </div>
      )}

      <div className="m3d-dock">
        <button type="button" className="m3d-home" onClick={home}>{t('m3d.home')}</button>
        <div ref={listRef} className="m3d-list">
          {PLACES.map((p, i) => typeOn[p.type] && (
            <button key={i} type="button" className={selected === i ? 'sel' : ''} onClick={() => pick(i)}>
              <i className="m3d-dot" style={{ background: TYPES[p.type].css }} />{text.names[i]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
