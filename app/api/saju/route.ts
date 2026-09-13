/**
 * 사주 계산 API.
 *
 * AI 를 부르지 않고 만세력 라이브러리로만 계산한다. 즉시 응답한다.
 * 화면은 이 결과로 먼저 표를 그리고, 해석은 따로 요청한다.
 */

import { buildChart, validateInput } from '@/lib/saju'
import { analyze } from '@/lib/analysis'
import { buildPersona } from '@/lib/persona'
import { suggestQuestions } from '@/lib/followup'
import { detectAuth } from '@/lib/ai'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const input = validateInput(body)
    const chart = buildChart(input)
    const analysis = analyze(chart)
    // 후속 질문 보기는 사주마다 달라 서버에서 함께 만들어 보낸다
    const suggestions = suggestQuestions(chart)
    // 첫 화면의 유형 카드에 쓴다
    const persona = buildPersona(chart, analysis)
    return Response.json({ ok: true, chart, analysis, persona, suggestions, auth: detectAuth() })
  } catch (error) {
    const message = error instanceof Error ? error.message : '사주 계산에 실패했습니다.'
    return Response.json({ ok: false, error: message }, { status: 400 })
  }
}
