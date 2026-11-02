// 제주관광공사 VISIT JEJU 콘텐츠 (제목·주소·좌표·분류) + 음식점콘텐츠(영업시간 등)
import { odcloud, PATHS } from './odcloud.js';

// 콘텐츠분류: 음식점 · 관광지 · 쇼핑 · 숙박 · 축제/행사 · 테마여행
export async function searchContents({ keyword = '', category = '', rows = 12 } = {}) {
  const cond = { '공개여부::EQ': 'y' };
  if (keyword) cond['제목::LIKE'] = keyword;
  if (category) cond['콘텐츠분류::EQ'] = category;
  const list = await odcloud(PATHS.contents, { perPage: rows, cond });
  return list.map((c) => ({
    id: c['콘텐츠아이디'],
    title: c['제목'],
    addr: c['도로명주소'] || c['지번주소'] || '',
    lat: c['위도'],
    lng: c['경도'],
    type: c['콘텐츠분류'],
  }));
}

const hours = (a, b) => (a && b ? `${a}~${b}` : '');

// 음식점 목록에 영업시간·예약 정보를 덧붙인다 (콘텐츠명이 같은 것끼리 연결)
export async function addRestaurantInfo(items) {
  return Promise.all(items.map(async (p) => {
    try {
      const [r] = await odcloud(PATHS.restaurant, { perPage: 1, cond: { '콘텐츠명::EQ': p.title } });
      if (!r) return p;
      // 언어에 상관없는 값만 돌려주고, 문장은 화면(src/i18n)에서 만든다
      return {
        ...p,
        meta: {
          weekday: hours(r['평일오픈시간'], r['평일클로즈시간']),
          weekend: hours(r['주말오픈시간'], r['주말클로즈시간']),
          rest: hours(r['휴식시작시간'], r['휴식종료시간']),
          reservable: r['예약가능여부'] === 'y',
        },
      };
    } catch {
      return p; // 부가 정보가 없어도 목록은 보여준다
    }
  }));
}
