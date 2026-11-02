// 6개 카테고리. kind: 'weather' 는 기상청 예보, 'places' 는 /api/places?cat=<id> 목록
// 어떤 공공데이터를 쓰는지는 server/places.js 에 있습니다.
export const CATEGORIES = [
  { id: 'village', icon: 'house-heart', tone: 'yellow', kind: 'weather' },
  { id: 'sea', icon: 'water', tone: 'teal', kind: 'places' },
  { id: 'oreum', icon: 'tree', tone: 'green', kind: 'places' },
  { id: 'indoor', icon: 'bank', tone: 'cream', kind: 'places' },
  { id: 'coffee', icon: 'cup-hot', tone: 'wood', kind: 'places' },
  { id: 'meal', icon: 'egg-fried', tone: 'red', kind: 'places' },
]
