import { useT } from '../i18n/useT'

const SKY_ICON = { 맑음: 'sun-fill', 구름많음: 'cloud-sun-fill', 흐림: 'clouds-fill' }

// 마을 카테고리: 제주시·서귀포시 예보 (앞으로 6개 시간대)
// API 가 주는 한국어 날씨 단어(맑음·비 등)는 사전의 키로 써서 선택한 언어로 바꿉니다.
export default function WeatherList({ data }) {
  const t = useT()
  return (
    <div className="weather-grid">
      {Object.entries(data).map(([place, slots]) => (
        <section key={place} className="weather-card">
          <h4 className="weather-place"><i className="bi bi-geo-alt-fill me-1" />{t(`weather.${place}`)}</h4>
          <ul className="list-unstyled mb-0">
            {slots.map((s, i) => {
              const raining = s.rain !== '없음'
              const icon = raining ? 'cloud-rain-fill' : SKY_ICON[s.sky] ?? 'cloud-fill'
              return (
                <li key={s.time} className="weather-row" style={{ '--i': i }}>
                  <span className="weather-time">{t('weather.hour', { h: s.time.slice(9, 11) })}</span>
                  <i className={`bi bi-${icon} weather-ico`} />
                  <span className="weather-temp">{s.temp}℃</span>
                  <span className="weather-desc">{raining ? t(`rain.${s.rain}`) : t(`sky.${s.sky}`)}</span>
                  <span className="weather-pop">{t('weather.pop', { n: s.pop })}</span>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
