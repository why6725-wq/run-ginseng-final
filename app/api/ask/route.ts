/**
 * 후속 질문 API.
 *
 * 해석 API 와 같은 방식으로 글자를 조금씩 흘려보낸다(SSE).
 * 다만 결과를 캐시에 저장하지 않는다. 질문이 매번 다르고 지난 문답까지
 * 문맥에 들어가서, 같은 질문이 그대로 반복되는 일이 거의 없기 때문이다.
 */

import { buildChart, validateInput } from '@/lib/saju'
import {
  FOLLOWUP_SYSTEM_PROMPT,
  buildFollowupPrompt,
  validateHistory,
  validateQuestion,
} from '@/lib/followup'
import { streamInterpretation } from '@/lib/ai'

export const runtime = 'nodejs'
export const maxDuration = 300

/** 해석 전문이 지나치게 길어지면 잘라 넣는다 */
const MAX_INTERPRETATION = 20000

export async function POST(request: Request) {
  let prompt: string
  try {
    const body = await request.json()
    const chart = buildChart(validateInput(body.input))
    const question = validateQuestion(body.question)
    const history = validateHistory(body.history)
    const interpretation =
      typeof body.interpretation === 'string'
        ? body.interpretation.slice(0, MAX_INTERPRETATION)
        : ''

    prompt = buildFollowupPrompt({ chart, interpretation, history, question })
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
        for await (const piece of streamInterpretation({
          system: FOLLOWUP_SYSTEM_PROMPT,
          prompt,
          signal: request.signal,
        })) {
          send('delta', { text: piece })
        }
        send('done', {})
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '답변 중 알 수 없는 오류가 발생했습니다.'
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
