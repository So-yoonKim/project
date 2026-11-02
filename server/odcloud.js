// 공공데이터포털 odcloud 방식 API 공통 호출 함수
// (오름·VISIT JEJU 콘텐츠·음식점콘텐츠가 모두 같은 방식: api.odcloud.kr)
const BASE = 'https://api.odcloud.kr/api/';

// 각 데이터의 "최신 버전" 주소 (활용신청 페이지의 Swagger 에서 확인)
export const PATHS = {
  contents: '15049999/v1/uddi:8a1b53d3-49e2-45c7-b0ef-9a475ae45c74', // VISIT JEJU 콘텐츠 2026-03
  restaurant: '15041984/v1/uddi:27a98f4a-5fc8-4ba5-922c-9e0838ed5c98', // VISIT JEJU 음식점콘텐츠 2026-03
  oreum: '15096996/v1/uddi:6738a90c-ec96-4245-a187-9528cea62904', // 제주오름요약설명
};

// cond: { '제목::LIKE': '카페' } → cond[제목::LIKE]=카페  (LIKE 포함, EQ 같음)
export async function odcloud(path, { perPage = 12, cond = {} } = {}) {
  const params = new URLSearchParams({
    serviceKey: process.env.DATA_GO_KR_KEY, // ★ Decoding 키
    page: '1',
    perPage: String(perPage),
  });
  for (const [k, v] of Object.entries(cond)) params.set(`cond[${k}]`, v);

  const r = await fetch(`${BASE}${path}?${params}`);
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); }
  catch { throw new Error(`공공데이터 응답 오류 (${r.status}): ${text.slice(0, 120)}`); }
  if (!r.ok) throw new Error(json.msg || `공공데이터 응답 오류 (${r.status})`);
  return json.data ?? [];
}
