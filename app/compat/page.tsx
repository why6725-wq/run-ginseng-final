'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { BirthForm, INITIAL_FORM, toInput, type FormState } from '@/components/BirthForm'
import { CompatResult } from '@/components/CompatResult'
import { Interpretation } from '@/components/Interpretation'
import { readSse } from '@/lib/sse'
import { COMPAT_SECTIONS } from '@/lib/compat-prompt'
import type { SajuChart } from '@/lib/saju'
import type { Compatibility } from '@/lib/compat'

interface Person {
  name: string | null
  chart: SajuChart
}

const field =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent'

/** 두 분의 관계 보기. 해석의 결이 달라진다. */
const RELATIONS = ['연인', '부부', '썸 타는 사이', '친구', '동업', '가족'] as const

export default function CompatPage() {
  const [formA, setFormA] = useState<FormState>(INITIAL_FORM)
  const [formB, setFormB] = useState<FormState>({ ...INITIAL_FORM, gender: 'female' })
  const [nameA, setNameA] = useState('')
  const [nameB, setNameB] = useState('')
  const [relation, setRelation] = useState<string>('')

  const [result, setResult] = useState<{
    a: Person
    b: Person
    compatibility: Compatibility
  } | null>(null)
  const [text, setText] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [fromCache, setFromCache] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  const ready = (f: FormState) =>
    f.year !== '' && f.month !== '' && f.day !== '' && (f.hourUnknown || f.hour !== '')

  const bothReady = ready(formA) && ready(formB)

  const runInterpretation = useCallback(
    async (payload: Record<string, unknown>) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setText('')
      setFromCache(false)
      setStreaming(true)
      setError(null)

      try {
        const res = await fetch('/api/compat-interpret', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })
        await readSse(res, {
          onDelta: (t) => setText((prev) => prev + t),
          onCached: () => setFromCache(true),
          onError: (m) => setError(m),
        })
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.')
        }
      } finally {
        setStreaming(false)
      }
    },
    [],
  )

  const handleSubmit = useCallback(async () => {
    if (!bothReady) return
    const payload = {
      a: toInput(formA),
      b: toInput(formB),
      aName: nameA.trim() || null,
      bName: nameB.trim() || null,
      relation: relation || null,
    }

    setError(null)
    setResult(null)
    setText('')

    try {
      const res = await fetch('/api/compat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)
      setResult({ a: data.a, b: data.b, compatibility: data.compatibility })
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch (e) {
      setError(e instanceof Error ? e.message : '궁합 계산에 실패했습니다.')
      return
    }

    await runInterpretation(payload)
  }, [bothReady, formA, formB, nameA, nameB, relation, runInterpretation])

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">궁합</h1>
        <p className="mt-2 text-sm text-muted">
          두 분의 사주를 나란히 놓고 어떤 구조로 만나는지 봅니다.
        </p>
        <Link
          href="/"
          className="mt-3 inline-block text-xs text-muted underline underline-offset-4 transition hover:text-accent"
        >
          한 사람 사주 풀이로 가기
        </Link>
      </header>

      {/* 관계 */}
      <section className="mb-4 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
        <span className="mb-1.5 block text-xs font-medium text-muted">
          두 분은 어떤 사이인가요? (선택)
        </span>
        <div className="flex flex-wrap gap-1.5">
          {RELATIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRelation(relation === r ? '' : r)}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                relation === r
                  ? 'border-accent bg-accent-soft font-medium'
                  : 'border-border text-muted hover:border-accent/50'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          고르면 그 관계에 맞춰 풀이합니다. 비워두면 두루 통하는 말로 씁니다.
        </p>
      </section>

      {/* 두 사람 입력 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {[
          { label: '첫째 분', form: formA, setForm: setFormA, name: nameA, setName: setNameA },
          { label: '둘째 분', form: formB, setForm: setFormB, name: nameB, setName: setNameB },
        ].map((p) => (
          <section
            key={p.label}
            className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6"
          >
            <h2 className="mb-3 text-base font-semibold">{p.label}</h2>
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-muted">
                이름 (선택)
              </label>
              <input
                className={field}
                value={p.name}
                maxLength={20}
                placeholder="비워두면 첫째 분, 둘째 분으로 부릅니다"
                onChange={(e) => p.setName(e.target.value)}
              />
            </div>
            <BirthForm
              value={p.form}
              onChange={p.setForm}
              onSubmit={handleSubmit}
              busy={streaming}
              hideSubmit
            />
          </section>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!bothReady || streaming}
        className="mt-4 w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {streaming ? '풀이하는 중…' : '궁합 보기'}
      </button>

      {error && (
        <div className="mt-6 rounded-xl border border-fire/40 bg-fire/5 p-4 text-sm text-fire">
          <strong className="font-semibold">문제가 생겼습니다.</strong>
          <p className="mt-1 leading-relaxed">{error}</p>
        </div>
      )}

      {result && (
        <div ref={resultRef} className="mt-8 space-y-6">
          <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
            <h2 className="mb-4 text-lg font-semibold">궁합 점수</h2>
            <CompatResult a={result.a} b={result.b} compatibility={result.compatibility} />
          </section>

          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">
                풀이
                {streaming && (
                  <span className="ml-2 text-xs font-normal text-muted">쓰는 중…</span>
                )}
              </h2>
            </div>

            {text ? (
              <Interpretation
                text={text}
                streaming={streaming}
                fromCache={fromCache}
                sections={COMPAT_SECTIONS}
              />
            ) : (
              streaming && (
                <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
                  두 사주를 맞대어 보고 있습니다. 잠시만 기다려 주세요.
                </div>
              )
            )}
          </section>

          <footer className="border-t border-border pt-5 text-center text-xs leading-relaxed text-muted">
            <p>
              이 풀이는 오락과 참고용입니다. 사주는 두 사람이 어떤 구조로 만나는지를 보여줄
              뿐, 관계의 성패를 정하지 않습니다.
            </p>
          </footer>
        </div>
      )}
    </main>
  )
}
