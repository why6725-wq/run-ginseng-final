/**
 * 궁합 계산 API.
 *
 * AI 없이 두 사주를 계산하고 그 사이 관계만 본다. 즉시 응답한다.
 * 화면은 이 결과로 점수와 근거를 먼저 그리고, 해석은 따로 요청한다.
 */

import { buildChart, validateInput } from '@/lib/saju'
import { analyze } from '@/lib/analysis'
import { judgeCompatibility } from '@/lib/compat'
import { validateName, validateRelation } from '@/lib/compat-prompt'
import { detectAuth } from '@/lib/ai'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const inputA = validateInput(body.a)
    const inputB = validateInput(body.b)
    const chartA = buildChart(inputA)
    const chartB = buildChart(inputB)
    const analysisA = analyze(chartA)
    const analysisB = analyze(chartB)

    const compatibility = judgeCompatibility(chartA, chartB, analysisA, analysisB)

    return Response.json({
      ok: true,
      a: { name: validateName(body.aName), chart: chartA, analysis: analysisA },
      b: { name: validateName(body.bName), chart: chartB, analysis: analysisB },
      relation: validateRelation(body.relation),
      compatibility,
      auth: detectAuth(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '궁합 계산에 실패했습니다.'
    return Response.json({ ok: false, error: message }, { status: 400 })
  }
}
