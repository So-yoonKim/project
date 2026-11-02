import { useEffect, useState } from 'react'
import { ping } from '../api/client'
import { isSupabaseReady, supabase } from '../lib/supabase'

// 동작 체크: 단계마다 이 화면이 초록색인지 확인하고 다음으로 넘어갑니다.
export default function Check() {
  const [db, setDb] = useState(isSupabaseReady
    ? { state: 'wait', msg: '확인 중...' }
    : { state: 'fail', msg: '.env.local 에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 를 넣으세요' })
  const [api, setApi] = useState({ state: 'wait', msg: '확인 중...' })

  useEffect(() => {
    // trips 테이블(supabase/schema.sql)이 없다면 에러 메시지가 그대로 보입니다.
    if (isSupabaseReady) supabase.from('trips').select('id').limit(1).then(({ error }) =>
      setDb(error ? { state: 'fail', msg: error.message } : { state: 'ok', msg: '연결 OK' }))
    ping()
      .then((d) => setApi({ state: 'ok', msg: `OK · 공공데이터 키 ${d.hasDataKey ? '있음' : '없음'} · Claude 키 ${d.hasClaudeKey ? '있음' : '없음'}` }))
      .catch(() => setApi({ state: 'fail', msg: 'npm run dev 가 아니라 vercel dev 로 실행했는지 확인' }))
  }, [])

  return (
    <div className="list-panel">
      <h2 className="list-title"><i className="bi bi-clipboard-check me-2" />동작 체크</h2>
      <Row title="React · 라우터" state="ok" msg="이 화면이 보이면 OK" />
      <Row title="Supabase" {...db} />
      <Row title="서버 함수 /api" {...api} />
    </div>
  )
}

function Row({ title, state, msg }) {
  const icon = { ok: 'check-circle-fill text-success', fail: 'x-circle-fill text-danger', wait: 'hourglass-split' }[state]
  return (
    <div className="tag-item mb-2">
      <div className="tag-text">
        <div className="tag-title"><i className={`bi bi-${icon} me-2`} />{title}</div>
        <div className="tag-addr">{msg}</div>
      </div>
    </div>
  )
}
