import { useT } from '../i18n/useT'

// 레트로 포스터 느낌의 카테고리 카드 (누르면 열림/닫힘)
const TILTS = [-2.2, 1.6, -1.2, 2, -1.8, 1.2]

export default function CategoryCard({ cat, active, onClick, index }) {
  const t = useT()
  return (
    <button type="button" className={`poster poster-${cat.tone} ${active ? 'active' : ''}`}
      style={{ '--tilt': `${TILTS[index % TILTS.length]}deg` }} onClick={onClick} aria-expanded={active}>
      <span className="tape tape-l" />
      <span className="tape tape-r" />
      <span className="poster-badge"><i className={`bi bi-${cat.icon}`} /></span>
      <span className="poster-label">{t(`cat.${cat.id}.label`)}</span>
      <span className="poster-sub">{t(`cat.${cat.id}.sub`)}</span>
    </button>
  )
}
