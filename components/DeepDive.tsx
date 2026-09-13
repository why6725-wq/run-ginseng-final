'use client'

import { useCallback, useRef, useState } from 'react'
import { SajuTable } from './SajuTable'
import { ElementBar } from './ElementBar'
import { StrengthPanel } from './StrengthPanel'
import { RelationList } from './RelationList'
import { SpiritList } from './SpiritList'
import { LuckTable } from './LuckTable'
import { Interpretation } from './Interpretation'
import { FollowUp } from './FollowUp'
import { readSse } from '@/lib/sse'
import type { SajuChart, SajuInput } from '@/lib/saju'
import type { Analysis } from '@/lib/analysis'

/**
 * 자세히 보기.
 *
 * 카드 몇 장으로 끝내는 사람이 대부분이지만, 더 파고들고 싶은 사람도 있다.
 * 만세력 표, 신강신약 배점, 합충, 신살, 대운을 여기에 모아두고 접어 둔다.
 *
 * 이번 개편에서 이것들을 지우지 않은 이유가 있다.
 * 어느 글자에 몇 점을 줬는지까지 펼쳐 보여주는 사이트는 드물고,
 * 그게 이 사이트가 다른 곳과 다른 점이기 때문이다. 첫 화면에서 내렸을 뿐이다.
 */
export function DeepDive({
  chart,
  analysis,
  input,
}: {
  chart: SajuChart
  analysis: Analysis
  input: SajuInput
}) {
  const [open, setOpen] = useState(false)
  const [longText, setLongText] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [fromCache, setFromCache] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const abortRef = useRef<AbortController | null>(null)

  /** 긴 풀이는 눌렀을 때만 받는다. 안 볼 사람에게 사용량을 쓸 이유가 없다. */
  const loadLong = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLongText('')
    setFromCache(false)
    setStreaming(true)
    setError(null)

    // 후속 질문 보기도 같이 받아둔다
    fetch('/api/saju', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setSuggestions(d.suggestions ?? [])
      })
      .catch(() => {})

    try {
      const res = await fetch('/api/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: controller.signal,
      })
      await readSse(res, {
        onDelta: (t) => setLongText((prev) => prev + t),
        onCached: () => setFromCache(true),
        onError: (m) => setError(m),
      })
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError(e instanceof Error ? e.message : '풀이 중 오류가 발생했습니다.')
      }
    } finally {
      setStreaming(false)
    }
  }, [input])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-border px-4 py-3 text-sm text-muted transition hover:border-accent hover:text-accent"
      >
        만세력 · 신강신약 · 대운 자세히 보기
      </button>
    )
  }

  return (
    <div className="space-y-4">
      <Panel title="만세력" defaultOpen>
        <SajuTable chart={chart} />
        <div className="mt-4 rounded-xl bg-surface-2/60 p-3 text-sm">
          <span className="text-muted">나를 뜻하는 글자는 </span>
          <strong>
            <span className="hanja">{chart.dayMaster.hanja}</span> {chart.dayMaster.stem}
          </strong>
          <span className="text-muted">
            , {chart.dayMaster.yinYang}
            {chart.dayMaster.element}입니다.
          </span>
        </div>
        {chart.notes.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-muted">
            {chart.notes.map((n, i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0">·</span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="오행 분포">
        <ElementBar chart={chart} />
      </Panel>

      <Panel title="신강신약과 용신">
        <StrengthPanel chart={chart} analysis={analysis} />
      </Panel>

      <Panel title="글자 사이의 관계">
        <RelationList analysis={analysis} />
      </Panel>

      <Panel title="12운성과 신살">
        <SpiritList chart={chart} analysis={analysis} />
      </Panel>

      <Panel title="대운과 세운">
        <LuckTable chart={chart} />
      </Panel>

      {/* 긴 풀이 */}
      <div className="card p-4 sm:p-5">
        <h3 className="mb-1 text-sm font-bold">긴 풀이</h3>
        <p className="mb-3 text-xs text-muted">
          앞의 카드보다 훨씬 길고 자세합니다. 아홉 항목으로 나눠 씁니다.
        </p>

        {!longText && !streaming ? (
          <button type="button" onClick={loadLong} className="btn-primary w-full py-3 text-sm">
            긴 풀이 받기
          </button>
        ) : (
          <Interpretation text={longText} streaming={streaming} fromCache={fromCache} />
        )}

        {error && <p className="mt-3 text-sm text-fire">{error}</p>}
      </div>

      {/* 후속 질문 */}
      {longText && !streaming && (
        <div className="card p-4 sm:p-5">
          <h3 className="mb-1 text-sm font-bold">더 물어보기</h3>
          <p className="mb-3 text-xs text-muted">
            위 풀이를 읽고 궁금한 점을 이어서 물어보실 수 있습니다.
          </p>
          <FollowUp input={input} interpretation={longText} suggestions={suggestions} />
        </div>
      )}
    </div>
  )
}

function Panel({
  title,
  children,
  defaultOpen,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen))
  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-bold sm:px-5"
      >
        <span>{title}</span>
        <span className="text-lg leading-none text-muted">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="border-t border-border p-4 sm:p-5">{children}</div>}
    </div>
  )
}
