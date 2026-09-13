'use client'

import { useState } from 'react'
import type { TodayFortune } from '@/lib/today'

const ELEMENT_BG: Record<string, string> = {
  목: 'bg-wood/15 text-wood',
  화: 'bg-fire/15 text-fire',
  토: 'bg-earth/15 text-earth',
  금: 'bg-metal/15 text-metal',
  수: 'bg-water/15 text-water',
}

/**
 * 오늘의 운세.
 *
 * 매일 들어올 이유를 만드는 자리라 맨 위에 둔다.
 * 점수는 무작위가 아니라 오늘 일진과 내 사주를 맞대어 계산한 값이고,
 * 어떻게 나왔는지 펼쳐볼 수 있게 했다. 근거 없는 점수는 금방 들킨다.
 */
export function TodayCard({
  fortune,
  message,
  loading,
}: {
  fortune: TodayFortune | null
  message: string
  loading: boolean
}) {
  const [open, setOpen] = useState(false)

  if (loading && !fortune) {
    return (
      <div className="card p-5">
        <div className="mb-3 h-3 w-24 animate-pulse rounded bg-surface-2" />
        <div className="h-8 w-40 animate-pulse rounded bg-surface-2" />
      </div>
    )
  }
  if (!fortune) return null

  const [, mm, dd] = fortune.date.split('-')

  return (
    <div className="card rise overflow-hidden">
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted">
            오늘 {Number(mm)}월 {Number(dd)}일
          </span>
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted">
            일진 <span className="hanja">{fortune.dayPillar.hanja}</span>{' '}
            {fortune.dayPillar.korean}
          </span>
        </div>

        <div className="mb-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold">{fortune.score}</span>
          <span className="text-base font-semibold text-accent">{fortune.headline}</span>
        </div>

        <div className="mb-4 h-2 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full transition-[width] duration-700"
            style={{
              width: `${fortune.score}%`,
              background: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
            }}
          />
        </div>

        {message ? (
          <p className="text-sm leading-relaxed text-foreground/90">{message}</p>
        ) : loading ? (
          <div className="space-y-1.5">
            <div className="h-2.5 w-full animate-pulse rounded bg-surface-2" />
            <div className="h-2.5 w-2/3 animate-pulse rounded bg-surface-2" />
          </div>
        ) : (
          <p className="text-sm text-muted">
            오늘 기운은 위 점수와 아래 근거로 확인해 주세요.
          </p>
        )}

        <div className="mt-4 flex items-center gap-2 text-xs">
          <span className="text-muted">오늘 살릴 기운</span>
          <span
            className={`rounded-full px-2 py-0.5 font-semibold ${ELEMENT_BG[fortune.luckyElement]}`}
          >
            {fortune.luckyElement}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between border-t border-border px-5 py-3 text-xs text-muted transition hover:text-accent"
      >
        <span>이 점수가 어떻게 나왔는지 보기</span>
        <span className="text-base leading-none">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="space-y-2 border-t border-border px-5 py-4">
          {fortune.reasons.map((r, i) => (
            <div key={i} className="flex gap-2">
              <span
                className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${
                  r.tone === 'good'
                    ? 'bg-wood/15 text-wood'
                    : r.tone === 'caution'
                      ? 'bg-fire/15 text-fire'
                      : 'bg-surface-2 text-muted'
                }`}
              >
                {r.score >= 0 ? `+${r.score}` : r.score}
              </span>
              <div className="min-w-0">
                <div className="text-xs font-medium">{r.label}</div>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">{r.note}</p>
              </div>
            </div>
          ))}
          <p className="pt-1 text-[11px] leading-relaxed text-muted">
            50점에서 출발해 오늘 기운이 나에게 이로우면 더하고 부담이면 뺍니다. 무작위로
            뽑은 숫자가 아니라, 같은 사람 같은 날이면 언제 봐도 같은 값이 나옵니다.
          </p>
        </div>
      )}
    </div>
  )
}
