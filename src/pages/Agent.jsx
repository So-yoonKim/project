import { useState } from 'react'
import { Button, Form, InputGroup, Spinner } from 'react-bootstrap'
import { useAppStore } from '../store/useAppStore'
import { useT } from '../i18n/useT'

export default function Agent() {
  const t = useT()
  const messages = useAppStore((s) => s.messages)
  const loading = useAppStore((s) => s.chatLoading)
  const sendMessage = useAppStore((s) => s.sendMessage)
  const [input, setInput] = useState('')

  function onSubmit(e) {
    e.preventDefault()
    if (!input.trim() || loading) return
    sendMessage(input)
    setInput('')
  }

  return (
    <div className="list-panel">
      <h2 className="list-title"><i className="bi bi-chat-heart me-2" />{t('agent.title')}</h2>
      <p className="mb-3">{t('agent.desc')}</p>
      <div className="chat-box mb-3">
        {messages.length === 0 && <div className="chat-hint">{t('agent.hint')}</div>}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.practice && <div className="small mb-1 opacity-75"><i className="bi bi-mortarboard me-1" />{t('agent.practice')}</div>}
            {m.steps?.length > 0 && (
              <div className="small mb-1 opacity-75">
                <i className="bi bi-tools me-1" />
                {m.steps.map((s) => `${s.tool}(${JSON.stringify(s.args)}) → ${t('agent.count', { n: s.count })}`).join(' · ')}
              </div>
            )}
            {m.text}
          </div>
        ))}
        {loading && <div className="small"><Spinner size="sm" className="me-2" />{t('agent.thinking')}</div>}
      </div>
      <Form onSubmit={onSubmit}>
        <InputGroup>
          <Form.Control value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('agent.placeholder')} />
          <Button type="submit" className="plus-btn rounded-0" disabled={loading}><i className="bi bi-send" /></Button>
        </InputGroup>
      </Form>
    </div>
  )
}
