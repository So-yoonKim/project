import { Dropdown } from 'react-bootstrap'
import { LANGS } from '../i18n/messages'
import { useAppStore } from '../store/useAppStore'

// 상단 언어 선택 (한국어 · English · 中文 · 日本語 · Русский)
export default function LangSwitcher() {
  const lang = useAppStore((s) => s.lang)
  const setLang = useAppStore((s) => s.setLang)
  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0]

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
