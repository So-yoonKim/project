// 화면 → 우리 서버 함수(/api/...) 호출 모음. 공공데이터 API는 브라우저에서 직접 부르지 않습니다.
async function readJson(r) {
  let data
  try { data = await r.json() }
  catch { throw new Error(`서버 응답이 JSON이 아님 (${r.status}) — vercel dev 로 실행했는지 확인`) }
  if (!r.ok) throw new Error(data.error || r.statusText)
  return data
}

export const get = async (path) => readJson(await fetch(path))
export const post = async (path, body) => readJson(await fetch(path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}))

export const ping = () => get('/api/hello')
export const fetchPlaces = (cat, rows = 12) => get(`/api/places?cat=${cat}&rows=${rows}`)
export const fetchWeather = (place = '제주시') => get(`/api/weather?place=${encodeURIComponent(place)}`)
export const fetchHeritage = (keyword = '') => get(`/api/heritage?keyword=${encodeURIComponent(keyword)}`)
export const translateTexts = (lang, texts) => post('/api/translate', { lang, texts })
export const askAgent =(message, history, lang = 'ko') => post('/api/agent', { message, history, lang })
