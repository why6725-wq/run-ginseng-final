'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import {
  BirthForm,
  INITIAL_FORM,
  fromInput,
  isReady,
  toInput,
  type FormState,
} from '@/components/BirthForm'
import { PersonaCard } from '@/components/PersonaCard'
import { BriefCards } from '@/components/BriefCards'
import { TodayCard } from '@/components/TodayCard'
import { ShareCard } from '@/components/ShareCard'
import { ProfilePicker, SaveProfileButton } from '@/components/ProfilePicker'
import { DeepDive } from '@/components/DeepDive'
import { readSse } from '@/lib/sse'
import type { SajuChart, SajuInput } from '@/lib/saju'
import type { Analysis } from '@/lib/analysis'
import type { Persona } from '@/lib/persona'
import type { TodayFortune } from '@/lib/today'

interface Result {
  chart: SajuChart
  analysis: Analysis
  persona: Persona
  input: SajuInput
  name: string | null
}

export default function Home() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [pickedName, setPickedName] = useState<string | null>(null)

  const [result, setResult] = useState<Result | null>(null)
  const [brief, setBrief] = useState('')
  const [streaming, setStreaming] = useState(false)

  const [today, setToday] = useState<{ fortune: TodayFortune; message: string } | null>(null)
  const [todayLoading, setTodayLoading] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  /** 저장해 둔 사람을 눌렀을 때 */
  const pickProfile = useCallback((input: SajuInput, name: string) => {
    setForm(fromInput(input))
    setPickedName(name)
    setResult(null)
    setBrief('')
    setToday(null)
    setError(null)
  }, [])

  const run = useCallback(
    async (input: SajuInput, name: string | null) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setError(null)
      setResult(null)
      setBrief('')
      setToday(null)
      setStreaming(true)
      setTodayLoading(true)

      // 1단계: 계산. AI 없이 즉시 끝나므로 유형 카드가 바로 뜬다.
      try {
        const res = await fetch('/api/saju', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })
        const data = await res.json()
        if (!data.ok) throw new Error(data.error)
        setResult({
          chart: data.chart,
          analysis: data.analysis,
          persona: data.persona,
          input,
          name,
        })
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
      } catch (e) {
        setError(e instanceof Error ? e.message : '사주 계산에 실패했습니다.')
        setStreaming(false)
        setTodayLoading(false)
        return
      }

      // 2단계: 오늘의 운세와 카드 풀이를 나란히 받는다.
      const todayPromise = fetch('/api/today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.ok) setToday({ fortune: d.fortune, message: d.message })
        })
        .catch(() => {
          // 오늘의 운세가 실패해도 본 풀이는 계속 간다
        })
        .finally(() => setTodayLoading(false))

      try {
        const res = await fetch('/api/brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
          signal: controller.signal,
        })
        await readSse(res, {
          onDelta: (t) => setBrief((prev) => prev + t),
          onError: (m) => setError(m),
        })
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setError(e instanceof Error ? e.message : '풀이 중 오류가 발생했습니다.')
        }
      } finally {
        setStreaming(false)
      }

      await todayPromise
    },
    [],
  )

  const handleSubmit = useCallback(() => {
    if (!isReady(form)) return
    run(toInput(form), pickedName)
  }, [form, pickedName, run])

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-6 text-center">
        <p className="text-xs font-medium tracking-widest text-accent">SAJU</p>
        <h1 className="mt-1.5 text-3xl font-bold tracking-tight sm:text-4xl">
          나는 어떤 사람일까
        </h1>
        <p className="mt-2 text-sm text-muted">
          생년월일만 넣으면 사주를 계산하고 AI가 풀어드립니다.
        </p>
      </header>

      {/* 입력 */}
      <section className="card p-4 sm:p-6">
        <ProfilePicker onPick={pickProfile} />
        <BirthForm
          value={form}
          onChange={(f) => {
            setForm(f)
            setPickedName(null)
          }}
          onSubmit={handleSubmit}
          busy={streaming}
        />
      </section>

      <p className="mt-3 text-center text-xs text-muted">
        <Link href="/compat" className="underline underline-offset-4 transition hover:text-accent">
          두 사람 궁합 보기
        </Link>
      </p>

      {error && (
        <div className="mt-6 rounded-2xl border border-fire/40 bg-fire/10 p-4 text-sm text-fire">
          <strong className="font-semibold">문제가 생겼습니다.</strong>
          <p className="mt-1 leading-relaxed">{error}</p>
          {error.includes('로그인') && (
            <p className="mt-2 text-xs leading-relaxed text-muted">
              터미널에서 <code>claude setup-token</code> 을 실행해 토큰을 만들고,{' '}
              <code>.env.local</code> 의 <code>CLAUDE_CODE_OAUTH_TOKEN</code> 에 넣어 주세요.
            </p>
          )}
        </div>
      )}

      {result && (
        <div ref={resultRef} className="mt-8 space-y-4">
          <PersonaCard persona={result.persona} chart={result.chart} name={result.name} />

          <TodayCard
            fortune={today?.fortune ?? null}
            message={today?.message ?? ''}
            loading={todayLoading}
          />

          <BriefCards text={brief} streaming={streaming} />

          {!streaming && brief && (
            <>
              <div className="card p-4">
                <ShareCard
                  persona={result.persona}
                  chart={result.chart}
                  name={result.name}
                />
              </div>

              <SaveProfileButton
                key={result.name ?? 'unnamed'}
                input={result.input}
                defaultName={result.name}
              />

              <DeepDive
                chart={result.chart}
                analysis={result.analysis}
                input={result.input}
              />
            </>
          )}

          <footer className="pt-4 text-center text-xs leading-relaxed text-muted">
            오락과 참고용입니다. 중요한 결정은 스스로의 판단과 전문가의 조언에 따라 주세요.
          </footer>
        </div>
      )}
    </main>
  )
}
