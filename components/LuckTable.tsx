'use client'

import type { SajuChart } from '@/lib/saju'
import { Term } from './Term'

/**
 * 대운과 세운.
 *
 * 대운은 10년마다 바뀌는 인생의 배경이고, 세운은 그 위에 얹히는 한 해의 날씨다.
 * 지금 지나고 있는 대운을 눈에 띄게 표시해 "내가 어디쯤 있는지"를 먼저 보이게 했다.
 */
export function LuckTable({ chart }: { chart: SajuChart }) {
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-muted">
          <span>
            진행 방향{' '}
            <strong className="text-foreground">{chart.luckForward ? '순행' : '역행'}</strong>
          </span>
          <span>
            첫 대운 <strong className="text-foreground">{chart.luckStartAge}세</strong>부터
          </span>
          <span>
            현재 만 <strong className="text-foreground">{chart.age}세</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <div className="flex min-w-max gap-1.5 pb-1">
            {chart.luckPillars.map((p) => (
              <div
                key={p.age}
                className={`w-[4.5rem] shrink-0 rounded-lg border p-2 text-center ${
                  p.isCurrent
                    ? 'border-accent bg-accent-soft'
                    : 'border-border bg-surface-muted/50'
                }`}
              >
                <div className="text-[11px] text-muted">{p.age}세</div>
                <div className="hanja my-1 text-lg font-semibold">{p.hanja}</div>
                <div className="text-[11px] text-muted">{p.korean}</div>
                <div className="mt-1.5 border-t border-border pt-1.5 text-[10px] leading-tight">
                  <Term name={p.stemTenGod} className="text-muted">
                    {p.stemTenGod}
                  </Term>
                  <br />
                  <Term name={p.branchTenGod} className="text-muted">
                    {p.branchTenGod}
                  </Term>
                </div>
                {p.isCurrent && (
                  <div className="mt-1 text-[10px] font-medium text-accent">지금</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="mt-2 text-xs text-muted">
          각 칸은 10년입니다. 색이 칠해진 칸이 지금 지나고 있는{' '}
          <Term name="대운">대운</Term>입니다.
          {!chart.currentLuck && ' 아직 첫 대운이 시작되기 전입니다.'}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface-muted/50 p-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-xs text-muted">
            <Term name="세운">{chart.yearlyLuck.year}년 세운</Term>
          </span>
          <span className="hanja text-xl font-semibold">{chart.yearlyLuck.hanja}</span>
          <span className="text-sm">{chart.yearlyLuck.korean}</span>
          <span className="text-xs text-muted">
            <Term name={chart.yearlyLuck.stemTenGod}>{chart.yearlyLuck.stemTenGod}</Term>
            {' / '}
            <Term name={chart.yearlyLuck.branchTenGod}>{chart.yearlyLuck.branchTenGod}</Term>
          </span>
        </div>
      </div>
    </div>
  )
}
