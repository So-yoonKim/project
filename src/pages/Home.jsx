import { lazy, Suspense, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import Halmang from '../components/Halmang'
import HalmangNote from '../components/HalmangNote'
import CategoryCard from '../components/CategoryCard'
import PlaceList from '../components/PlaceList'
import WeatherList from '../components/WeatherList'
import { Empty, ErrorAlert, Loading } from '../components/Status'
import { CATEGORIES } from '../data/categories'
import { fetchPlaces, fetchWeather } from '../api/client'
import { useT } from '../i18n/useT'
import { hasCoords } from '../lib/geo'

// 지도(Leaflet)는 용량이 커서 화면에 나올 때 불러온다
const CourseMap = lazy(() => import('../components/CourseMap'))

// 카테고리 하나의 데이터를 불러온다
async function loadCategory(cat) {
  if (cat.kind === 'weather') {
    const [jeju, seogwipo] = await Promise.all([fetchWeather('제주시'), fetchWeather('서귀포시')])
    return { 제주시: jeju, 서귀포시: seogwipo }
  }
  return fetchPlaces(cat.id)
}

export default function Home() {
  const t = useT()
  const cart = useAppStore((s) => s.cart)
  const noCoords = cart.filter((c) => !hasCoords(c)).length
  const [openId, setOpenId] = useState(null)  // 지금 펼쳐진 카테고리 (없으면 null)
  const [data, setData] = useState({})         // 카테고리id → 불러온 데이터 (한 번 받으면 재사용)
  const [loadingId, setLoadingId] = useState(null)
  const [error, setError] = useState('')

  async function toggle(cat) {
    if (openId === cat.id) return setOpenId(null) // 한 번 더 누르면 닫기
    setOpenId(cat.id)
    setError('')
    if (data[cat.id]) return
    setLoadingId(cat.id)
    try {
      const result = await loadCategory(cat)
      setData((d) => ({ ...d, [cat.id]: result }))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoadingId(null)
    }
  }

  const cat = CATEGORIES.find((c) => c.id === openId)
  const items = cat && data[cat.id]

  return (
    <>
      <section className="hero">
        <Halmang />
        <h1 className="hero-sign">{t('hero.sign')}</h1>
        <p className="hero-intent">{t('hero.intent')}</p>
        <HalmangNote />
      </section>

      <section className="poster-grid" aria-label={t('hero.sign')}>
        {CATEGORIES.map((c, i) => (
          <CategoryCard key={c.id} cat={c} index={i} active={openId === c.id} onClick={() => toggle(c)} />
        ))}
      </section>

      {cat && (
        <section className="list-panel" key={cat.id}>
          <h2 className="list-title"><i className={`bi bi-${cat.icon} me-2`} />{t(`cat.${cat.id}.label`)} · {t(`cat.${cat.id}.sub`)}</h2>
          <ErrorAlert error={error} />
          {loadingId === cat.id && <Loading text={t('list.loading')} />}
          {items && cat.kind === 'weather' && <WeatherList data={items} />}
          {items && cat.kind === 'places' && (items.length === 0 ? <Empty text={t('list.empty')} /> : <PlaceList items={items} catId={cat.id} icon={cat.icon} />)}
        </section>
      )}

      <section className="list-panel" id="course-map">
        <h2 className="list-title"><i className="bi bi-map me-2" />{t('map.title')}</h2>
        <p className="map-note">{cart.length === 0 ? t('map.empty') : t('map.order')}</p>
        <Suspense fallback={<Loading text={t('list.loading')} />}>
          <CourseMap />
        </Suspense>
        {noCoords > 0 && <p className="map-note mt-2 mb-0">{t('map.noCoords', { n: noCoords })}</p>}
      </section>
    </>
  )
}
