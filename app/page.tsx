'use client'

import { useCallback, useRef, useState } from 'react'
import { BirthForm, INITIAL_FORM, toInput, type FormState } from '@/components/BirthForm'
import { SajuTable } from '@/components/SajuTable'
import { ElementBar } from '@/components/ElementBar'
import { LuckTable } from '@/components/LuckTable'
import { Interpretation } from '@/components/Interpretation'
import { StrengthPanel } from '@/components/StrengthPanel'
import { RelationList } from '@/components/RelationList'
import { SpiritList } from '@/components/SpiritList'
import { Term } from '@/components/Term'
import type { SajuChart } from '@/lib/saju'
import type { Analysis } from '@/lib/analysis'

interface AuthStatus {
  mode: string
  label: string
  usesSubscription: boolean
}

export default function Home() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [chart, setChart] = useState<SajuChart | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [auth, setAuth] = useState<AuthStatus | null>(null)
  const [text, setText] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [fromCache, setFromCache] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  /** 해석만 다시 받는다. 표는 이미 있으므로 건드리지 않는다. */
  const runInterpretation = useCallback(async (input: ReturnType<typeof toInput>) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setText('')
    setFromCache(false)
    setStreaming(true)
    setError(null)

    try {
      const res = await fetch('/api/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        const detail = await res.json().catch(() => null)
        throw new Error(detail?.error ?? '해석 요청에 실패했습니다.')
      }

      // 서버가 밀어주는 조각을 읽어 화면에 이어 붙인다
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // SSE 는 빈 줄로 메시지를 구분한다
        const chunks = buffer.split('\n\n')
        buffer = chunks.pop() ?? ''

        for (const chunk of chunks) {
          let event = 'message'
          let data = ''
          for (const line of chunk.split('\n')) {
            if (line.startsWith('event: ')) event = line.slice(7).trim()
            else if (line.startsWith('data: ')) data += line.slice(6)
          }
          if (!data) continue

          const payload = JSON.parse(data)
          if (event === 'delta') setText((t) => t + payload.text)
          else if (event === 'cached') setFromCache(true)
          else if (event === 'error') setError(payload.message)
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.')
      }
    } finally {
      setStreaming(false)
    }
  }, [])

  const handleSubmit = useCallback(async () => {
    const input = toInput(form)
    setError(null)
    setChart(null)
    setAnalysis(null)
    setText('')

    // 1단계: 사주 계산. AI 없이 즉시 끝난다.
    try {
      const res = await fetch('/api/saju', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)
      setChart(data.chart)
      setAnalysis(data.analysis)
      setAuth(data.auth)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch (e) {
      setError(e instanceof Error ? e.message : '사주 계산에 실패했습니다.')
      return
    }

    // 2단계: 표를 먼저 보여준 뒤 AI 해석을 받는다.
    await runInterpretation(input)
  }, [form, runInterpretation])

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">사주 풀이</h1>
        <p className="mt-2 text-sm text-muted">
          생년월일로 <Term name="일주">사주팔자</Term>를 계산하고, 그 결과를 AI가 풀어서
          설명해 드립니다.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
        <BirthForm value={form} onChange={setForm} onSubmit={handleSubmit} busy={streaming} />
      </section>

      {error && (
        <div className="mt-6 rounded-xl border border-fire/40 bg-fire/5 p-4 text-sm text-fire">
          <strong className="font-semibold">문제가 생겼습니다.</strong>
          <p className="mt-1 leading-relaxed">{error}</p>
          {error.includes('로그인') && (
            <p className="mt-2 text-xs leading-relaxed text-muted">
              터미널에서 <code className="rounded bg-surface-muted px-1">claude setup-token</code>
              을 실행해 토큰을 만들고, <code className="rounded bg-surface-muted px-1">.env.local</code>{' '}
              파일의 <code className="rounded bg-surface-muted px-1">CLAUDE_CODE_OAUTH_TOKEN</code>에
              넣어 주세요. 자세한 방법은 README에 적어 두었습니다.
            </p>
          )}
        </div>
      )}

      {chart && (
        <div ref={resultRef} className="mt-8 space-y-6">
          {/* 만세력 표 */}
          <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">만세력</h2>
              <p className="text-xs text-muted">
                양력 {chart.solar.year}. {chart.solar.month}. {chart.solar.day}.
                {' · '}음력 {chart.lunar.month}. {chart.lunar.day}.
                {chart.lunar.isLeapMonth && ' (윤달)'}
                {' · '}만 {chart.age}세
              </p>
            </div>

            <SajuTable chart={chart} />

            <div className="mt-5 rounded-lg bg-surface-muted/60 p-3 text-sm">
              <span className="text-muted">나를 뜻하는 글자는 </span>
              <strong className="text-base">
                <span className="hanja">{chart.dayMaster.hanja}</span> {chart.dayMaster.stem}
              </strong>
              <span className="text-muted">
                , {chart.dayMaster.yinYang}
                {chart.dayMaster.element}입니다. 나머지 일곱 글자는 모두 이 글자와의 관계로
                풀이합니다.
              </span>
            </div>

            {chart.notes.length > 0 && (
              <ul className="mt-4 space-y-1.5 text-xs leading-relaxed text-muted">
                {chart.notes.map((n, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="shrink-0">·</span>
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 오행 분포 */}
          <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
            <h2 className="mb-4 text-lg font-semibold">오행 분포</h2>
            <ElementBar chart={chart} />
          </section>

          {/* 신강신약과 용신 */}
          {analysis && (
            <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
              <h2 className="mb-1 text-lg font-semibold">
                <Term name="신강">신강</Term>·<Term name="신약">신약</Term>과{' '}
                <Term name="용신">용신</Term>
              </h2>
              <p className="mb-4 text-xs text-muted">
                일간이 강한지 약한지를 정하고, 그에 따라 나에게 이로운 기운을 찾습니다. 아래
                해석 전체가 여기서 출발합니다.
              </p>
              <StrengthPanel chart={chart} analysis={analysis} />
            </section>
          )}

          {/* 글자 사이의 관계 */}
          {analysis && (
            <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
              <h2 className="mb-1 text-lg font-semibold">글자 사이의 관계</h2>
              <p className="mb-4 text-xs text-muted">
                글자끼리 끌어당기거나 부딪치는 관계입니다. 개수만 세어서는 안 보이는 힘이
                여기서 드러납니다.
              </p>
              <RelationList analysis={analysis} />
            </section>
          )}

          {/* 12운성·12신살·신살 */}
          {analysis && (
            <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
              <h2 className="mb-1 text-lg font-semibold">
                <Term name="12운성">12운성</Term>과 <Term name="신살">신살</Term>
              </h2>
              <p className="mb-4 text-xs text-muted">
                앞의 신강신약과 용신이 뼈대라면 여기는 살입니다. 참고로 보는 항목이라 앞의
                결론을 뒤집지는 않습니다.
              </p>
              <SpiritList chart={chart} analysis={analysis} />
            </section>
          )}

          {/* 대운·세운 */}
          <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
            <h2 className="mb-4 text-lg font-semibold">
              <Term name="대운">대운</Term>과 <Term name="세운">세운</Term>
            </h2>
            <LuckTable chart={chart} />
          </section>

          {/* AI 해석 */}
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">
                풀이
                {streaming && (
                  <span className="ml-2 text-xs font-normal text-muted">쓰는 중…</span>
                )}
              </h2>
              {!streaming && text && (
                <button
                  type="button"
                  onClick={() => runInterpretation(toInput(form))}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:border-accent hover:text-accent"
                >
                  다시 풀이
                </button>
              )}
            </div>

            {text ? (
              <Interpretation text={text} streaming={streaming} fromCache={fromCache} />
            ) : (
              streaming && (
                <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
                  사주를 읽고 있습니다. 잠시만 기다려 주세요.
                </div>
              )
            )}
          </section>

          <footer className="border-t border-border pt-5 text-center text-xs leading-relaxed text-muted">
            <p>
              이 풀이는 오락과 참고용입니다. 중요한 결정은 스스로의 판단과 전문가의 조언에
              따라 주세요.
            </p>
            {auth && (
              <p className="mt-2">
                AI 인증 방식: {auth.label}
                {auth.usesSubscription && ' · 구독 사용량이 차감됩니다'}
              </p>
            )}
          </footer>
        </div>
      )}
    </main>
  )
}
