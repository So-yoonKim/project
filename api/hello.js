// 동작 확인용 서버 함수 → http://localhost:3000/api/hello
// 키 값은 절대 내보내지 않고 "있는지 없는지"만 알려줍니다.
import { CLAUDE_MODEL } from '../server/model.js';

export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    time: new Date().toISOString(),
    hasDataKey: Boolean(process.env.DATA_GO_KR_KEY),
    hasClaudeKey: Boolean(process.env.ANTHROPIC_API_KEY),
    claudeModel: CLAUDE_MODEL, // 지금 쓰는 모델 이름 (비밀이 아님)
  });
}
