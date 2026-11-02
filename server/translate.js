// 장소 이름·주소 번역 (AI). 공공데이터에는 번역이 없어서 서버에서 AI 에게 번역시킨다.
// 한 번 번역한 문장은 메모리에 저장해 두고 다시 쓴다 (같은 서버가 켜져 있는 동안).
import Anthropic from '@anthropic-ai/sdk'

const LANG_NAME = { en: 'English', zh: 'Simplified Chinese (简体中文)', ja: 'Japanese (日本語)', ru: 'Russian (Русский)' }
const CLAUDE_MODEL = 'claude-sonnet-5-5' // 고유명사 표기가 더 정확하다. 한 번 번역한 결과는 저장해 두고 다시 쓴다
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

const cache = new Map() // "언어|원문" → 번역

const systemPrompt = (lang) => `You translate Korean place names and Korean road addresses from Jeju Island, South Korea, for foreign tourists into ${LANG_NAME[lang]}.
- Place names: use the official or widely used name in the target language if one exists. Otherwise transliterate the name and add a short descriptive word (for example "Oreum" for 오름, "Beach" for 해수욕장, "Museum" for 박물관). Keep the name recognizable.
- Addresses: translate the administrative units and road names into the target language, keep every number, and keep the order natural for the target language.
- If you are not sure what a proper noun means, transliterate it with the Revised Romanization (for example 협재 = Hyeopjae, 본태 = Bonte, 아부 = Abu) instead of guessing a meaning.
- Use the standard forms: English "Jeju-si", "Seogwipo-si", "-eup", "-myeon", "-ri", "-ro"; Russian standard Korean transcription (Чеджу, Согвипхо, Хёпчжэ); Chinese official names where they exist (济州市, 西归浦市, 涯月邑), otherwise the Korean name transliterated.
- Do not add explanations.
Input: a JSON array of Korean strings. Output: ONLY a JSON array of strings with the same length and the same order. No markdown, no code fence.`

// 모델이 코드 블록 등을 섞어 답해도 첫 JSON 배열만 꺼낸다
function firstArray(text) {
  const s = String(text).replace(/```(?:json)?/gi, '')
  for (let start = s.indexOf('['); start !== -1; start = s.indexOf('[', start + 1)) {
    let depth = 0, inStr = false
    for (let i = start; i < s.length; i++) { // 문자열 안의 괄호는 세지 않고, 짝이 맞는 첫 배열만 꺼낸다
      const c = s[i]
      if (inStr) { if (c === '\\') i++; else if (c === '"') inStr = false; continue }
      if (c === '"') inStr = true
      else if (c === '[') depth++
      else if (c === ']' && --depth === 0) {
        try { const arr = JSON.parse(s.slice(start, i + 1)); if (Array.isArray(arr)) return arr } catch { /* 다음 후보로 */ }
        break
      }
    }
  }
  return null
}
function parseArray(text, n) {
  const arr = firstArray(text)
  if (!arr) throw new Error('번역 결과를 읽지 못했어요')
  if (arr.length !== n) throw new Error('번역 결과 개수가 맞지 않아요')
  return arr.map(String)
}

async function viaGemini(lang, texts) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt(lang) }] },
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(texts) }] }],
      generationConfig: { maxOutputTokens: 4096, temperature: 0 },
    }),
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) { const e = new Error(data.error?.message ?? `Gemini ${r.status}`); e.status = r.status; throw e }
  const parts = data.candidates?.[0]?.content?.parts ?? []
  return parseArray(parts.filter((p) => p.text && !p.thought).map((p) => p.text).join(''), texts.length)
}

async function viaClaude(lang, texts) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const r = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: systemPrompt(lang),
    messages: [{ role: 'user', content: JSON.stringify(texts) }],
  })
  return parseArray(r.content.filter((b) => b.type === 'text').map((b) => b.text).join(''), texts.length)
}

export async function translateTexts(lang, texts) {
  if (!LANG_NAME[lang]) throw Object.assign(new Error('지원하지 않는 언어예요'), { status: 400 })
  const need = [...new Set(texts.filter((t) => !cache.has(`${lang}|${t}`)))]
  if (need.length) {
    if (!process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      throw Object.assign(new Error('AI 키가 없어 번역할 수 없어요'), { status: 503 })
    }
    const out = process.env.GEMINI_API_KEY ? await viaGemini(lang, need) : await viaClaude(lang, need)
    need.forEach((t, i) => cache.set(`${lang}|${t}`, out[i]))
  }
  return texts.map((t) => cache.get(`${lang}|${t}`) ?? t)
}
