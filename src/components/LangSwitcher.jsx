import { Dropdown } from 'react-bootstrap'
import { LANGS } from '../i18n/messages'
import { useAppStore } from '../store/useAppStore'

// 언어 선택 (한국어 · English · 中文 · 日本語 · Русский)
// 기본은 드롭다운, inline 이면 옆으로 나열한 버튼들 (폰의 옆 메뉴 안에서 쓴다)
export default function LangSwitcher({ inline = false }) {
  const lang = useAppStore((s) => s.lang)
  const setLang = useAppStore((s) => s.setLang)
  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0]

  if (inline) {
    return (
      <div className="lang-inline" role="group" aria-label="Language">
        {LANGS.map((l) => (
          <button key={l.code} type="button" className={l.code === lang ? 'act' : ''} onClick={() => setLang(l.code)}>{l.label}</button>
        ))}
      </div>
    )
  }

  return (
    <Dropdown align="end">
      <Dropdown.Toggle className="cart-btn lang-btn top-fixed" aria-label="Language">
        <i className="bi bi-translate me-1" />{current.label}
      </Dropdown.Toggle>
      <Dropdown.Menu className="lang-menu">
        {LANGS.map((l) => (
          <Dropdown.Item key={l.code} active={l.code === lang} onClick={() => setLang(l.code)}>{l.label}</Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  )
}
