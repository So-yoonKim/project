import { translateTexts } from '../server/translate.js';

// POST /api/translate  { lang: 'en'|'zh'|'ja'|'ru', texts: ['협재해수욕장', ...] } → { translations: [...] }
// 같은 순서로 번역해서 돌려준다. 한 번에 40개·글자 수 제한으로 AI 사용량이 갑자기 늘지 않게 막는다.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { lang, texts } = req.body ?? {};
  if (!Array.isArray(texts) || texts.length === 0 || texts.length > 40) {
    return res.status(400).json({ error: 'texts 는 1~40개의 문자열 배열이어야 해요' });
  }
  if (texts.some((t) => typeof t !== 'string' || t.length > 200)) {
    return res.status(400).json({ error: '각 문장은 200자 이하의 문자열이어야 해요' });
  }
  try {
    res.status(200).json({ translations: await translateTexts(lang, texts) });
  } catch (e) {
    const status = Number.isInteger(e.status) ? e.status : 500;
    res.status(status).json({ error: status === 429 ? '사용량이 많아요. 잠시 뒤 다시 시도하세요.' : e.message });
  }
}
