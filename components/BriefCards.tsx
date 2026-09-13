'use client'

import { useMemo } from 'react'
import { BRIEF_SECTIONS, parseBriefCards } from '@/lib/brief'

/** 카드마다 다른 이모지를 붙여 훑어보기 쉽게 한다 */
const ICON: Record<string, string> = {
  '나는 이런 사람': '🪞',
  '일과 적성': '🧭',
  돈: '🪙',
  사랑: '💘',
  '몸과 마음': '🌿',
  올해: '🗓️',
}

/**
 * 카드형 짧은 풀이.
 *
 * 긴 글은 끝까지 읽는 사람이 드물다.
 * 한 카드에 키워드 세 개와 두세 문장만 담아, 훑기만 해도 남는 게 있게 했다.
 */
export function BriefCards({ text, streaming }: { text: string; streaming: boolean }) {
  const cards = useMemo(() => parseBriefCards(text), [text])
  const doneTitles = new Set(cards.map((c) => c.title))
  const pending = BRIEF_SECTIONS.filter((s) => !doneTitles.has(s.title))

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {cards.map((c, i) => (
        <div key={`${c.title}-${i}`} className="card rise p-4">
          <div className="mb-2 flex items-center gap-2">
            <span aria-hidden className="text-base">
              {ICON[c.title] ?? '✨'}
            </span>
            <h3 className="text-sm font-bold">{c.title}</h3>
          </div>

          {c.keywords.length > 0 && (
            <div className="mb-2.5 flex flex-wrap gap-1">
              {c.keywords.map((k) => (
                <span
                  key={k}
                  className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent"
                >
                  #{k}
                </span>
              ))}
            </div>
          )}

          <p className="text-sm leading-relaxed text-foreground/85">
            {c.body}
            {streaming && i === cards.length - 1 && (
              <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-accent align-middle" />
            )}
          </p>
        </div>
      ))}

      {streaming &&
        pending.map((s) => (
          <div
            key={s.id}
            className="rounded-[1.25rem] border border-dashed border-border p-4 opacity-60"
          >
            <div className="mb-2 flex items-center gap-2">
              <span aria-hidden className="text-base grayscale">
                {ICON[s.title] ?? '✨'}
              </span>
              <h3 className="text-sm font-bold text-muted">{s.title}</h3>
            </div>
            <div className="space-y-1.5">
              <div className="h-2 w-3/4 animate-pulse rounded bg-surface-2" />
              <div className="h-2 w-full animate-pulse rounded bg-surface-2" />
              <div className="h-2 w-1/2 animate-pulse rounded bg-surface-2" />
            </div>
          </div>
        ))}
    </div>
  )
}
