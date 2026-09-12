'use client'

import { useState } from 'react'
import type { Analysis } from '@/lib/analysis'
import type { SajuChart } from '@/lib/saju'
import { josa } from '@/lib/korean'
import { Term } from './Term'

const ELEMENT_TEXT: Record<string, string> = {
  목: 'text-wood',
  화: 'text-fire',
  토: 'text-earth',
  금: 'text-metal',
  수: 'text-water',
}

const ELEMENT_BG: Record<string, string> = {
  목: 'bg-wood/10 border-wood/30',
  화: 'bg-fire/10 border-fire/30',
  토: 'bg-earth/10 border-earth/30',
  금: 'bg-metal/10 border-metal/30',
  수: 'bg-water/10 border-water/30',
}

/**
 * 신강신약과 용신.
 *
 * 명리 상담은 여기서 시작한다. 일간이 강한지 약한지를 먼저 정하고,
 * 그에 따라 어떤 기운이 나를 돕는지(용신)를 정한 다음 모든 해석을 거기에 맞춘다.
 *
 * 판정 기준이 유파마다 다르므로 점수만 툭 던지지 않는다.
 * 어느 글자에 몇 점을 줬는지 표로 펼쳐 볼 수 있게 했다.
 */
export function StrengthPanel({
  chart,
  analysis,
}: {
  chart: SajuChart
  analysis: Analysis
}) {
  const [open, setOpen] = useState(false)
  const { strength, yongsin } = analysis

  // 0~100 점수를 막대 위치로 쓴다
  const pct = Math.min(Math.max(strength.score, 0), 100)

  return (
    <div className="space-y-5">
      {/* 점수 막대 */}
      <div>
        <div className="mb-2 flex items-baseline gap-2">
          <span className="text-2xl font-semibold">{strength.score}점</span>
          <span className="text-base font-medium">
            <Term name={strength.verdict}>{strength.verdict}</Term>
          </span>
          <span className="text-xs text-muted">한 사주입니다</span>
        </div>

        <div className="relative h-6 overflow-hidden rounded-full bg-surface-muted">
          <div className="absolute inset-y-0 left-0 w-[40%] border-r border-background/40 bg-water/25" />
          <div className="absolute inset-y-0 left-[40%] w-[21%] border-r border-background/40 bg-earth/25" />
          <div className="absolute inset-y-0 left-[61%] right-0 bg-fire/25" />
          <div
            className="absolute top-0 h-6 w-[3px] rounded bg-foreground transition-[left] duration-700"
            style={{ left: `calc(${pct}% - 1.5px)` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-muted">
          <span>신약 0~39</span>
          <span>중화 40~60</span>
          <span>신강 61~100</span>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-foreground/90">{strength.summary}</p>

        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span
            className={`rounded-full border px-2.5 py-1 ${
              strength.hasSeason ? 'border-accent bg-accent-soft' : 'border-border text-muted'
            }`}
          >
            <Term name="득령">득령</Term> {strength.hasSeason ? '함' : '못함'}
          </span>
          <span
            className={`rounded-full border px-2.5 py-1 ${
              strength.hasGround ? 'border-accent bg-accent-soft' : 'border-border text-muted'
            }`}
          >
            <Term name="득지">득지</Term> {strength.hasGround ? '함' : '못함'}
          </span>
        </div>
      </div>

      {/* 근거 펼쳐보기 */}
      <div className="rounded-lg border border-border">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2.5 text-xs font-medium text-muted"
        >
          <span>어느 글자에 몇 점을 줬는지 보기</span>
          <span className="text-base leading-none">{open ? '−' : '+'}</span>
        </button>
        {open && (
          <div className="border-t border-border p-3">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[26rem] text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted">
                    <th className="py-1.5 pr-2 font-medium">자리</th>
                    <th className="py-1.5 pr-2 font-medium">글자</th>
                    <th className="py-1.5 pr-2 text-right font-medium">점수</th>
                    <th className="py-1.5 pl-2 font-medium">작용</th>
                  </tr>
                </thead>
                <tbody>
                  {strength.rows.map((r) => (
                    <tr key={r.position} className="border-b border-border/50 last:border-0">
                      <td className="py-1.5 pr-2 whitespace-nowrap text-muted">{r.position}</td>
                      <td className="py-1.5 pr-2 whitespace-nowrap">
                        <span className={`hanja text-sm ${ELEMENT_TEXT[r.element]}`}>
                          {r.hanja}
                        </span>{' '}
                        <span className="text-muted">
                          {r.char}·{r.element}
                        </span>
                      </td>
                      <td
                        className={`py-1.5 pr-2 text-right tabular-nums ${
                          r.helps ? 'font-medium text-accent' : 'text-muted'
                        }`}
                      >
                        {r.helps ? `+${r.weight}` : `(${r.weight})`}
                      </td>
                      <td className="py-1.5 pl-2 text-muted">{r.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              월지에 가장 큰 점수를 줍니다. 태어난 달이 일간의 힘을 가장 크게 좌우하기
              때문입니다. 괄호 친 점수는 일간의 힘을 덜어내는 자리라 합계에서 뺀 것입니다.
              이 배점은 <Term name="억부">억부</Term> 기준의 한 방식이고, 유파마다 다릅니다.
            </p>
          </div>
        )}
      </div>

      {/* 용신 */}
      <div>
        <h3 className="mb-2 text-sm font-semibold">
          <Term name="용신">용신</Term>과 <Term name="기신">기신</Term>
        </h3>

        <div className="flex flex-wrap gap-4">
          <div>
            <div className="mb-1.5 text-xs text-muted">이로운 기운</div>
            <div className="flex gap-1.5">
              {yongsin.favorable.map((el) => (
                <span
                  key={el}
                  className={`flex h-11 w-11 flex-col items-center justify-center rounded-lg border text-sm font-semibold ${ELEMENT_BG[el]} ${ELEMENT_TEXT[el]}`}
                >
                  {el}
                  {(chart.elementCounts[el] ?? 0) === 0 && (
                    <span className="text-[9px] font-normal text-muted">없음</span>
                  )}
                </span>
              ))}
            </div>
          </div>

          {yongsin.unfavorable.length > 0 && (
            <div>
              <div className="mb-1.5 text-xs text-muted">부담이 되는 기운</div>
              <div className="flex gap-1.5">
                {yongsin.unfavorable.map((el) => (
                  <span
                    key={el}
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted"
                  >
                    {el}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="mt-3 text-xs leading-relaxed text-muted">{yongsin.reason}</p>

        {yongsin.missingFavorable.length > 0 && (
          <p className="mt-2 rounded-lg bg-accent-soft p-2.5 text-xs leading-relaxed">
            이로운 기운 가운데{' '}
            <strong className="font-semibold">
              {josa(yongsin.missingFavorable.join(', '), '이/가')}
            </strong>{' '}
            사주에 하나도 없습니다. 이 기운이 대운이나 세운으로 들어오는 시기가 중요한
            전환점이 됩니다.
          </p>
        )}

        {yongsin.seasonNote && (
          <p className="mt-2 text-xs leading-relaxed text-muted">
            <Term name="조후">조후</Term> 참고: {yongsin.seasonNote}
          </p>
        )}
      </div>
    </div>
  )
}
