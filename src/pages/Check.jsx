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
    // 열쇠 없이 trips_list 를 불러 보면 'bad_token' 오류가 정상입니다 (함수가 있고 연결됐다는 뜻).
    // 함수가 없다면 supabase/nickname-pin.sql 을 아직 실행하지 않은 것입니다.
    if (isSupabaseReady) supabase.rpc('trips_list', { p_token: '00000000-0000-0000-0000-000000000000' }).then(({ error }) =>
      setDb(error && error.message.includes('bad_token')
        ? { state: 'ok', msg: '연결 OK · 닉네임 비밀번호 보호 적용됨' }
        : { state: 'fail', msg: error ? `${error.message} — supabase/nickname-pin.sql 을 실행했는지 확인` : '예상과 다른 응답' }))
    ping()
      .then((d) => setApi({ state: 'ok', msg: `OK · 공공데이터 키 ${d.hasDataKey ? '있음' : '없음'} · Claude 키 ${d.hasClaudeKey ? '있음' : '없음'} · 모델 ${d.claudeModel ?? '?'}` }))
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
