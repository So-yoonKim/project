import shop from '../assets/halmang-shop.webp'
import { useT } from '../i18n/useT'

// 레트로 슈퍼마켓 카운터 옆에서 웃고 있는 설문대할망 (그림 파일)
export default function Halmang() {
  const t = useT()
  return <img src={shop} alt={t('hero.alt')} className="halmang-scene" width="1174" height="896" />
}
