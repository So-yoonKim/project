import { Link } from 'react-router-dom'
import { useT } from '../i18n/useT'

export default function NotFound() {
  const t = useT()
  return (
    <div className="text-center py-5">
      <h1 className="hero-sign d-inline-block">{t('notfound.title')}</h1>
      <p className="mt-3"><Link to="/" className="btn cart-btn">{t('notfound.back')}</Link></p>
    </div>
  )
}
