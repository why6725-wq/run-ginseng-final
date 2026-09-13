/**
 * 오늘의 운세 API.
 *
 * 점수와 근거는 코드가 계산하고, 두세 문장의 글만 AI 가 쓴다.
 * 날짜별로 캐시하므로 같은 날 여러 번 들어와도 한 번만 부른다.
 */

import { buildChart, validateInput } from '@/lib/saju'
import { analyze } from '@/lib/analysis'
import { buildPersona } from '@/lib/persona'
import { buildTodayFortune } from '@/lib/today'
import { TODAY_SYSTEM_PROMPT, buildTodayPrompt } from '@/lib/brief'
import { streamInterpretation } from '@/lib/ai'
import { todayCacheKey, readCache, writeCache } from '@/lib/cache'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const input = validateInput(body)
    const chart = buildChart(input)
    const analysis = analyze(chart)
    const persona = buildPersona(chart, analysis)
    const fortune = buildTodayFortune(chart, analysis)

    // 계산된 부분은 AI 없이도 즉시 돌려줄 수 있다
    const key = todayCacheKey(input, fortune.date)
    const cached = await readCache(key)
    if (cached) {
      return Response.json({ ok: true, fortune, message: cached, cached: true })
    }

    let message = ''
    try {
      for await (const piece of streamInterpretation({
        system: TODAY_SYSTEM_PROMPT,
        prompt: buildTodayPrompt(chart, analysis, fortune, persona),
        signal: request.signal,
      })) {
        message += piece
      }
      if (message.trim()) await writeCache(key, message.trim())
    } catch {
      // 글을 못 받아도 점수와 근거는 보여준다. 오늘의 운세가 통째로 막히면 안 된다.
      message = ''
    }

    return Response.json({ ok: true, fortune, message: message.trim(), cached: false })
  } catch (error) {
    const msg = error instanceof Error ? error.message : '오늘의 운세를 불러오지 못했습니다.'
    return Response.json({ ok: false, error: msg }, { status: 400 })
  }
}
