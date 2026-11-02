// 제주특별자치도 제주오름요약설명 (오름 90곳: 이름·위치·표고·설명·좌표)
import { odcloud, PATHS } from './odcloud.js';

export async function searchOreum({ keyword = '', rows = 12 } = {}) {
  const cond = keyword ? { '오름명::LIKE': keyword } : {};
  const list = await odcloud(PATHS.oreum, { perPage: rows, cond });
  return list.map((o) => ({
    id: o['오름영문명'],
    title: o['오름명'],
    addr: `제주특별자치도 ${o['위치']}`,
    meta: { elev: o['표고(m)'], rel: o['비고(m)'] }, // 화면에서 선택한 언어로 문장을 만든다
    desc: o['설명'],
    lat: o['위도'],
    lng: o['경도'],
  }));
}
