import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useAppStore } from '../store/useAppStore'
import { makeT } from '../i18n/useT'
import { hasCoords } from '../lib/geo'

// 장바구니에 담은 장소를 지도 위에 번호 핀으로 꽂고, 담은 순서대로 선으로 잇는다.
// 지도: OpenStreetMap (키·결제 불필요). 이 파일은 Home 에서 lazy 로 불러온다.
const JEJU = [33.38, 126.55]

export default function CourseMap() {
  const lang = useAppStore((s) => s.lang)
  const cart = useAppStore((s) => s.cart)
  const boxRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)

  // 지도 만들기 (한 번)
  useEffect(() => {
    const map = L.map(boxRef.current, { scrollWheelZoom: false }).setView(JEJU, 9)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    setTimeout(() => map.invalidateSize(), 0)
    return () => { map.remove(); mapRef.current = null }
  }, [])

  // 장바구니·언어가 바뀔 때마다 핀 다시 그리기
  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    const t = makeT(lang)
    layer.clearLayers()

    const pins = cart.filter(hasCoords)
    const points = pins.map((c) => [Number(c.lat), Number(c.lng)])

    pins.forEach((c, i) => {
      const icon = L.divIcon({ className: 'map-pin', html: `<span>${i + 1}</span>`, iconSize: [32, 32], iconAnchor: [16, 16] })
      const box = document.createElement('div') // 텍스트로 넣어서 이름에 특수문자가 있어도 안전
      const title = document.createElement('strong')
      title.textContent = c.title
      const addr = document.createElement('div')
      addr.textContent = c.addr || t('place.noAddr')
      const link = document.createElement('a')
      link.href = `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`
      link.target = '_blank'
      link.rel = 'noopener'
      link.textContent = t('map.directions')
      box.append(title, addr, link)
      L.marker(points[i], { icon }).bindPopup(box).addTo(layer)
    })

    if (points.length > 1) L.polyline(points, { color: '#c8302a', weight: 4, dashArray: '8 8' }).addTo(layer)
    if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 13 })
    else if (points.length === 1) map.setView(points[0], 12)
    else map.setView(JEJU, 9)
  }, [cart, lang])

  return <div ref={boxRef} className="course-map" />
}
