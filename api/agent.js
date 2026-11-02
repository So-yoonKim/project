import Anthropic from '@anthropic-ai/sdk';
import { searchPlaces } from '../server/places.js';
import { getWeather } from '../server/weather.js';
import { searchHeritage } from '../server/heritage.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-5-5';

// ① 도구 설명서: Claude는 이 설명만 보고 "어떤 도구를 언제 쓸지" 결정한다
const tools = [
  {
    name: 'search_jeju_places',
    description: '제주 나들이 장소를 검색한다. 제주관광공사 VISIT JEJU 콘텐츠·음식점 정보와 제주도 오름 데이터를 쓴다. 주소와 (카페·식당은) 영업시간이 나온다.',
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['sea', 'oreum', 'indoor', 'coffee', 'meal'],
          description: 'sea 해수욕장 / oreum 오름 / indoor 박물관·체험관 / coffee 카페 / meal 맛집·시장',
        },
        keyword: { type: 'string', description: '이름에 들어갈 검색어 (선택, 예: 협재, 다랑쉬, 흑돼지)' },
      },
      required: ['category'],
    },
  },
  {
    name: 'get_weather',
    description: '기상청 단기예보로 제주시/서귀포시의 앞으로 몇 시간 기온·하늘·강수를 조회한다',
    input_schema: {
      type: 'object',
      properties: { place: { type: 'string', enum: ['제주시', '서귀포시'] } },
      required: ['place'],
    },
  },
  {
    name: 'search_heritage',
    description: '국가유산청 API로 제주의 국가유산(문화재)을 이름으로 검색한다',
    input_schema: { type: 'object', properties: { keyword: { type: 'string' } } },
  },
];

// ② 도구 이름 → 실제 실행할 함수
const runTool = {
  search_jeju_places: (input) => searchPlaces({ ...input, rows: 8 }),
  get_weather: getWeather,
  search_heritage: searchHeritage,
};

const SYSTEM = `너는 제주의 거인 '설문대할망'이다. 레트로 슈퍼마켓 주인처럼 정겹고 따뜻한 말투로 제주 나들이를 골라주는 가이드 에이전트다.
- 장소·날씨·유산 정보는 반드시 도구로 확인한 뒤 답한다.
- 도구 결과에 없는 장소는 지어내지 않는다.
- 비가 오거나 강수확률이 높으면 실내 대안을 함께 제안한다.
- 답은 5문장 이내로 짧게.`;

// 화면에서 고른 언어로 답하게 한다 (장소 이름·주소는 도구 결과의 한국어 원문을 함께 적어도 좋다)
const LANG_NAME = { ko: '한국어', en: 'English', zh: '简体中文', ja: '日本語', ru: 'Русский' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { message, history = [], lang = 'ko' } = req.body ?? {};
  const system = `${SYSTEM}\n- 반드시 ${LANG_NAME[lang] ?? LANG_NAME.ko}로 답한다.`;
  const messages = [...history.slice(-10), { role: 'user', content: message }]; // 최근 10개만 보내 비용 절약
  const steps = []; // 화면에 "에이전트가 무엇을 했는지" 보여주기용

  try {
    // ③ 에이전트 루프: 생각 → 도구 호출 → 결과 확인 → (반복) → 최종 답
    for (let turn = 0; turn < 5; turn++) {
      const r = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system,
        tools,
        messages,
      });

      if (r.stop_reason !== 'tool_use') {
        const answer = r.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
        return res.status(200).json({ answer, steps });
      }

      messages.push({ role: 'assistant', content: r.content }); // Claude의 도구 호출 요청을 대화에 기록
      const results = [];
      for (const block of r.content) {
        if (block.type !== 'tool_use') continue;
        let result;
        try { result = await runTool[block.name](block.input ?? {}); }
        catch (e) { result = { error: e.message }; }
        steps.push({ tool: block.name, args: block.input, count: Array.isArray(result) ? result.length : 0 });
        results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
      }
      messages.push({ role: 'user', content: results }); // 도구 결과를 Claude에게 돌려줌
    }
    res.status(200).json({ answer: '도구 호출이 너무 많아 중단했어요. 질문을 좁혀 주세요.', steps });
  } catch (e) {
    // 429 = 호출 한도 초과, 401 = 키 오류
    res.status(e.status ?? 500).json({ error: e.status === 429 ? '사용량이 많아요. 1분 뒤 다시 시도하세요.' : e.message });
  }
}
