/**
 * 궁합 해석 스트리밍 API.
 *
 * 한 사람 해석과 같은 방식이다. 캐시도 같이 쓰되 키에 두 사람의 입력을 모두 넣는다.
 */

import { buildChart, validateInput } from '@/lib/saju'
import { analyze } from '@/lib/analysis'
import { judgeCompatibility } from '@/lib/compat'
import {
  COMPAT_SYSTEM_PROMPT,
  buildCompatPrompt,
  validateName,
  validateRelation,
} from '@/lib/compat-prompt'
import { streamInterpretation } from '@/lib/ai'
import { compatCacheKey, readCache, writeCache } from '@/lib/cache'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: Request) {
  let prompt: string
  let key: string
  try {
    const body = await request.json()
    const inputA = validateInput(body.a)
    const inputB = validateInput(body.b)
    const chartA = buildChart(inputA)
    const chartB = buildChart(inputB)
    const analysisA = analyze(chartA)
    const analysisB = analyze(chartB)
    const relation = validateRelation(body.relation)

    prompt = buildCompatPrompt({
      a: { name: validateName(body.aName), chart: chartA, analysis: analysisA },
      b: { name: validateName(body.bName), chart: chartB, analysis: analysisB },
      compatibility: judgeCompatibility(chartA, chartB, analysisA, analysisB),
      relation,
    })
    key = compatCacheKey(inputA, inputB, relation, chartA.yearlyLuck.year)
  } catch (error) {
    const message = error instanceof Error ? error.message : '입력이 올바르지 않습니다.'
    return Response.json({ ok: false, error: message }, { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        )
      }

      try {
        const cached = await readCache(key)
        if (cached) {
          send('cached', { cached: true })
          for (let i = 0; i < cached.length; i += 120) {
            send('delta', { text: cached.slice(i, i + 120) })
          }
          send('done', { cached: true })
          controller.close()
          return
        }

        let full = ''
        for await (const piece of streamInterpretation({
          system: COMPAT_SYSTEM_PROMPT,
          prompt,
          signal: request.signal,
        })) {
          full += piece
          send('delta', { text: piece })
        }

        if (full.trim().length > 0) await writeCache(key, full)
        send('done', { cached: false })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '해석 중 알 수 없는 오류가 발생했습니다.'
        send('error', { message })
      } finally {
        try {
          controller.close()
        } catch {
          // 이미 닫혔으면 무시한다.
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
