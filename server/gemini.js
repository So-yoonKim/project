// Gemini(구글 AI) 에이전트 루프 — SDK 없이 REST 로 호출한다.
// Claude 용으로 쓴 도구 설명서(tools)를 그대로 받아 Gemini 형식으로 바꿔 쓴다.
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// JSON 스키마의 type 은 Gemini 에서 대문자(OBJECT, STRING)로 적는다
function toGeminiSchema(s) {
  if (Array.isArray(s)) return s.map(toGeminiSchema);
  if (!s || typeof s !== 'object') return s;
  return Object.fromEntries(Object.entries(s).map(([k, v]) => [k, k === 'type' ? String(v).toUpperCase() : toGeminiSchema(v)]));
}

async function generate(body) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(data.error?.message ?? `Gemini ${r.status}`);
    err.status = r.status;
    throw err;
  }
  return data;
}

// 생각 → 도구 호출 → 결과 확인 → (반복) → 최종 답
export async function runGemini({ system, tools, history, message, runTool }) {
  const functionDeclarations = tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: toGeminiSchema(t.input_schema),
  }));
  const contents = [
    ...history.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.content) }] })),
    { role: 'user', parts: [{ text: message }] },
  ];
  const steps = [];

  for (let turn = 0; turn < 5; turn++) {
    const data = await generate({
      systemInstruction: { parts: [{ text: system }] },
      tools: [{ functionDeclarations }],
      contents,
      generationConfig: { maxOutputTokens: 2048 },
    });
    const content = data.candidates?.[0]?.content;
    const parts = content?.parts ?? [];
    const calls = parts.filter((p) => p.functionCall);

    if (calls.length === 0) {
      const answer = parts.filter((p) => p.text && !p.thought).map((p) => p.text).join('\n');
      return { answer: answer || '답을 만들지 못했어요. 다시 물어봐 주세요.', steps };
    }

    contents.push(content); // 도구 호출 요청을 그대로 기록 (모델이 준 부가 정보 유지)
    const responses = [];
    for (const { functionCall } of calls) {
      let result;
      try { result = await runTool[functionCall.name](functionCall.args ?? {}); }
      catch (e) { result = { error: e.message }; }
      steps.push({ tool: functionCall.name, args: functionCall.args, count: Array.isArray(result) ? result.length : 0 });
      responses.push({ functionResponse: { name: functionCall.name, response: { result } } });
    }
    contents.push({ role: 'user', parts: responses });
  }
  return { answer: '도구 호출이 너무 많아 중단했어요. 질문을 좁혀 주세요.', steps };
}
