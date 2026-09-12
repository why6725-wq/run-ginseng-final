/**
 * AI 해석 스트리밍 API.
 *
 * 해석문이 다 완성될 때까지 기다리면 30초 넘게 빈 화면을 보게 된다.
 * 그래서 Claude 가 글자를 만드는 즉시 조금씩 브라우저로 흘려보낸다.
 * 이 방식을 SSE(Server-Sent Events)라고 한다. 서버가 연결을 열어둔 채
 * 계속 조각을 밀어넣는 단방향 통신이다.
 *
 * 이 라우트는 반드시 서버에서만 돈다. Agent SDK 는 브라우저에서 못 돌고,
 * 로그인 토큰이 브라우저로 새어나가서도 안 되기 때문이다.
 */

import { buildChart, validateInput } from '@/lib/saju'
import { buildUserPrompt, SYSTEM_PROMPT } from '@/lib/prompt'
import { streamInterpretation } from '@/lib/ai'
import { cacheKey, readCache, writeCache } from '@/lib/cache'

/** Agent SDK 는 하위 프로세스를 띄우므로 Node.js 런타임이 필요하다. */
export const runtime = 'nodejs'
/** 해석은 1분 넘게 걸릴 수 있다. */
export const maxDuration = 300

export async function POST(request: Request) {
  let input
  let chart
  try {
    const body = await request.json()
    input = validateInput(body)
    chart = buildChart(input)
  } catch (error) {
    const message = error instanceof Error ? error.message : '입력이 올바르지 않습니다.'
    return Response.json({ ok: false, error: message }, { status: 400 })
  }

  const key = cacheKey(input, chart.yearlyLuck.year)
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        )
      }

      try {
        // 1. 같은 사주를 이미 해석한 적 있으면 그대로 돌려준다.
        const cached = await readCache(key)
        if (cached) {
          send('cached', { cached: true })
          // 캐시도 조금씩 흘려보내 화면 동작을 똑같이 맞춘다.
          for (let i = 0; i < cached.length; i += 120) {
            send('delta', { text: cached.slice(i, i + 120) })
          }
          send('done', { cached: true })
          controller.close()
          return
        }

        // 2. 없으면 Claude 에게 새로 물어본다.
        send('start', { cached: false })

        let full = ''
        for await (const piece of streamInterpretation({
          system: SYSTEM_PROMPT,
          prompt: buildUserPrompt(chart),
          signal: request.signal,
        })) {
          full += piece
          send('delta', { text: piece })
        }

        if (full.trim().length > 0) {
          await writeCache(key, full)
        }
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
