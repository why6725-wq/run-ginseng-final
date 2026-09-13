/**
 * 카드형 풀이 스트리밍 API.
 *
 * 긴 풀이(/api/interpret)와 달리 카드 여섯 장으로 짧게 끝난다.
 * 첫 화면에서 보여줄 것이라 빨리 나오는 게 중요하다.
 */

import { buildChart, validateInput } from '@/lib/saju'
import { analyze } from '@/lib/analysis'
import { buildPersona } from '@/lib/persona'
import { BRIEF_SYSTEM_PROMPT, buildBriefPrompt } from '@/lib/brief'
import { streamInterpretation } from '@/lib/ai'
import { briefCacheKey, readCache, writeCache } from '@/lib/cache'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: Request) {
  let prompt: string
  let key: string
  try {
    const body = await request.json()
    const input = validateInput(body)
    const chart = buildChart(input)
    const analysis = analyze(chart)
    prompt = buildBriefPrompt(chart, buildPersona(chart, analysis))
    key = briefCacheKey(input, chart.yearlyLuck.year)
  } catch (error) {
    const message = error instanceof Error ? error.message : '입력이 올바르지 않습니다.'
    return Response.json({ ok: false, error: message }, { status: 400 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))

      try {
        const cached = await readCache(key)
        if (cached) {
          send('cached', { cached: true })
          for (let i = 0; i < cached.length; i += 80) {
            send('delta', { text: cached.slice(i, i + 80) })
          }
          send('done', { cached: true })
          controller.close()
          return
        }

        let full = ''
        for await (const piece of streamInterpretation({
          system: BRIEF_SYSTEM_PROMPT,
          prompt,
          signal: request.signal,
        })) {
          full += piece
          send('delta', { text: piece })
        }
        if (full.trim()) await writeCache(key, full)
        send('done', { cached: false })
      } catch (error) {
        send('error', {
          message: error instanceof Error ? error.message : '풀이 중 오류가 발생했습니다.',
        })
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
