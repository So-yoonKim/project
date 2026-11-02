// 제주 안쪽의 올바른 좌표인지 검사 (지도에 핀을 꽂을 수 있는 장소만 통과)
export const hasCoords = (c) => {
  const lat = Number(c.lat), lng = Number(c.lng)
  return lat > 33 && lat < 34 && lng > 126 && lng < 127.2
}
