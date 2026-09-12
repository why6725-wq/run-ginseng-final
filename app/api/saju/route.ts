/**
 * 사주 계산 API.
 *
 * AI 를 부르지 않고 만세력 라이브러리로만 계산한다. 즉시 응답한다.
 * 화면은 이 결과로 먼저 표를 그리고, 해석은 따로 요청한다.
 */

import { buildChart, validateInput } from '@/lib/saju'
import { analyze } from '@/lib/analysis'
import { detectAuth } from '@/lib/ai'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const input = validateInput(body)
    const chart = buildChart(input)
    const analysis = analyze(chart)
    return Response.json({ ok: true, chart, analysis, auth: detectAuth() })
  } catch (error) {
    const message = error instanceof Error ? error.message : '사주 계산에 실패했습니다.'
    return Response.json({ ok: false, error: message }, { status: 400 })
  }
}
