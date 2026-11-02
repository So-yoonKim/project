// 카테고리 → 어떤 API 를 어떻게 부를지 (화면과 에이전트가 함께 사용)
import { searchContents, addRestaurantInfo } from './visitjeju.js';
import { searchOreum } from './oreum.js';

export const PLACE_CATEGORIES = ['sea', 'oreum', 'indoor', 'coffee', 'meal'];

// 여러 검색 결과를 합치고 중복 제거
const merge = (lists) => {
  const seen = new Set();
  return lists.flat().filter((p) => !seen.has(p.id) && seen.add(p.id));
};

export async function searchPlaces({ category, keyword = '', rows = 12 } = {}) {
  const half = Math.ceil(rows / 2);
  switch (category) {
    case 'sea': // 바다: 해수욕장
      return searchContents({ keyword: keyword || '해수욕장', category: '관광지', rows });
    case 'oreum': // 오름
      return searchOreum({ keyword, rows });
    case 'indoor': // 실내: 박물관 + 체험관
      return merge(await Promise.all(
        (keyword ? [keyword] : ['박물관', '체험']).map((k) => searchContents({ keyword: k, category: '관광지', rows: half })),
      ));
    case 'coffee': // 커피: 카페 (+ 영업시간)
      return addRestaurantInfo(await searchContents({ keyword: keyword || '카페', category: '음식점', rows }));
    case 'meal': { // 식사: 시장 + 맛집 (+ 영업시간)
      const markets = keyword ? [] : await searchContents({ keyword: '시장', category: '쇼핑', rows: Math.floor(rows / 3) });
      const foods = await searchContents({ keyword, category: '음식점', rows });
      return addRestaurantInfo(merge([markets, foods]).slice(0, rows));
    }
    default:
      throw new Error(`알 수 없는 카테고리: ${category}`);
  }
}
