import { useT } from '../i18n/useT'

// 설문대할망 소개 포스트잇 (가로로 긴 모양)
export default function HalmangNote() {
  const t = useT()
  return (
    <aside className="postit">
      <span className="postit-pin" />
      <h3 className="postit-title">{t('note.title')}</h3>
      <div className="postit-lines">
        <p>{t('note.l1')}</p>
        <p>{t('note.l2')}</p>
        <p>{t('note.l3')}</p>
      </div>
    </aside>
  )
}
