// 어떤 Claude 모델을 쓸지 여기 한 곳에서 정한다. (AI 가이드와 이름·주소 번역이 같이 쓴다)
//  · 평소(오늘)는 haiku — 빠르고 사용량이 적다
//  · 시연 영상을 찍을 때와 발표 때는 sonnet — Vercel 환경변수 CLAUDE_MODEL=claude-sonnet-5-5 로 바꾸고 Redeploy
// 환경변수를 비워 두면 아래 기본값(haiku)을 쓴다.
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-5-5'
