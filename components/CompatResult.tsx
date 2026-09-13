'use client'

import type { SajuChart } from '@/lib/saju'
import type { Compatibility } from '@/lib/compat'
import { josa } from '@/lib/korean'
import { Term } from './Term'

const ELEMENT_TEXT: Record<string, string> = {
  목: 'text-wood',
  화: 'text-fire',
  토: 'text-earth',
  금: 'text-metal',
  수: 'text-water',
}

/**
 * 궁합 점수와 그 근거.
 *
 * 점수만 크게 띄우면 "몇 점이네" 하고 끝나버린다.
 * 실제로 쓸모 있는 건 어느 대목에서 점수가 붙고 빠졌는지라,
 * 항목별 근거를 접지 않고 처음부터 펼쳐서 보여준다.
 */
export function CompatResult({
  a,
  b,
  compatibility,
}: {
  a: { name: string | null; chart: SajuChart }
  b: { name: string | null; chart: SajuChart }
  compatibility: Compatibility
}) {
  const nameA = a.name ?? '첫째 분'
  const nameB = b.name ?? '둘째 분'

  return (
    <div className="space-y-6">
      {/* 점수 */}
      <div>
        <div className="mb-2 flex flex-wrap items-baseline gap-2">
          <span className="text-3xl font-semibold">{compatibility.score}점</span>
          <span className="text-base font-medium text-accent">{compatibility.verdict}</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-700"
            style={{ width: `${compatibility.score}%` }}
          />
        </div>
        <p className="mt-3 text-sm leading-relaxed text-foreground/85">
          {compatibility.summary}
        </p>
      </div>

      {/* 두 사람의 사주 요약 */}
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: nameA, chart: a.chart },
          { label: nameB, chart: b.chart },
        ].map(({ label, chart }) => (
          <div key={label} className="rounded-lg border border-border p-3">
            <div className="mb-2 text-sm font-semibold">{label}</div>
            <div className="mb-2 flex gap-1">
              {chart.pillars.map((p) => (
                <div
                  key={p.label}
                  className="flex-1 rounded border border-border bg-surface-2/50 py-1.5 text-center"
                >
                  <div className={`hanja text-sm ${ELEMENT_TEXT[p.stemElement]}`}>
                    {p.stemHanja}
                  </div>
                  <div className={`hanja text-sm ${ELEMENT_TEXT[p.branchElement]}`}>
                    {p.branchHanja}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted">
              일간 {chart.dayMaster.stem}({chart.dayMaster.hanja}), {chart.dayMaster.yinYang}
              {chart.dayMaster.element}
              {chart.missingElements.length > 0 && (
                <> · 없는 오행 {chart.missingElements.join(', ')}</>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* 서로 채워주는 기운 */}
      {(compatibility.fills.aNeedsFromB.length > 0 ||
        compatibility.fills.bNeedsFromA.length > 0) && (
        <div className="rounded-lg bg-accent/15 p-3 text-sm leading-relaxed">
          <div className="mb-1 font-semibold">서로 채워주는 기운</div>
          {compatibility.fills.aNeedsFromB.length > 0 && (
            <p className="text-xs">
              {nameA}에게 이로운{' '}
              <strong>{compatibility.fills.aNeedsFromB.join(', ')}</strong> 기운을{' '}
              {josa(nameB, '이/가')} 갖고 있습니다.
            </p>
          )}
          {compatibility.fills.bNeedsFromA.length > 0 && (
            <p className="mt-0.5 text-xs">
              {nameB}에게 이로운{' '}
              <strong>{compatibility.fills.bNeedsFromA.join(', ')}</strong> 기운을{' '}
              {josa(nameA, '이/가')} 갖고 있습니다.
            </p>
          )}
        </div>
      )}

      {/* 대목별 점수와 근거 */}
      <div className="space-y-3">
        {compatibility.sections.map((sec) => (
          <div key={sec.key} className="rounded-lg border border-border p-3">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold">{sec.title}</h3>
              <span className="shrink-0 text-xs tabular-nums text-muted">
                {sec.score} / {sec.max}점
              </span>
            </div>

            <div className="mb-2.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-accent/60"
                style={{ width: `${(sec.score / sec.max) * 100}%` }}
              />
            </div>

            <div className="space-y-2">
              {sec.items.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <span
                    className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${
                      item.tone === 'good'
                        ? 'bg-wood/15 text-wood'
                        : item.tone === 'caution'
                          ? 'bg-fire/15 text-fire'
                          : 'bg-surface-2 text-muted'
                    }`}
                  >
                    {item.score >= 0 ? `+${item.score}` : item.score}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-medium">{item.title}</div>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">{item.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-muted">
        배점은 <Term name="용신">용신</Term>을 채워주는지에 40점으로 가장 큰 비중을 뒀습니다.
        궁합에서 실제로 체감되는 것이 함께 있을 때 편한지 소모되는지이고, 그것이 부족한
        기운이 채워지느냐와 가장 가깝기 때문입니다. 점수 기준은 유파마다 다르니 총점보다
        위의 항목별 근거를 보시는 편이 쓸모 있습니다.
      </p>
    </div>
  )
}
