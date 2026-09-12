'use client'

import type { Analysis } from '@/lib/analysis'
import type { SajuChart } from '@/lib/saju'
import { Term } from './Term'

/**
 * 신살과 길성.
 *
 * 이름이 무섭게 들리는 것이 많아, 좋고 나쁨보다 "어떤 성질인지"로 읽히도록 썼다.
 * 각 항목이 무엇을 기준으로 나왔는지(일간·월지·기둥·글자)를 함께 보여준다.
 * 근거를 밝혀야 동의하거나 무시할 수 있다.
 */
export function SpiritList({
  chart,
  analysis,
}: {
  chart: SajuChart
  analysis: Analysis
}) {
  // 전통 순서(시 → 일 → 월 → 연)로 뒤집는다
  const rows = [...analysis.spirits].reverse()
  const total = rows.reduce((n, r) => n + r.hits.length, 0)

  const yearVoidPillars = chart.pillars.filter((p) =>
    analysis.yearVoidBranches.includes(p.branch),
  )

  return (
    <div className="space-y-5">
      {/* 기둥별 12운성 · 12신살 */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[24rem] text-center text-xs">
          <thead>
            <tr className="text-muted">
              <th className="w-16 py-1.5 font-medium sm:w-20">구분</th>
              {rows.map((r) => (
                <th key={r.label} className="py-1.5 font-medium">
                  {r.labelFull}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" className="py-2 pr-2 text-right text-xs font-medium text-muted">
                <Term name="12운성">12운성</Term>
              </th>
              {rows.map((r) => (
                <td key={r.label} className="py-2">
                  <span title={r.stageNote} className="term">
                    {r.stage}
                  </span>
                </td>
              ))}
            </tr>
            <tr className="border-t border-border/50">
              <th scope="row" className="py-2 pr-2 text-right text-xs font-medium text-muted">
                <Term name="12신살">12신살</Term>
              </th>
              {rows.map((r) => (
                <td key={r.label} className="py-2">
                  <span title={r.spiritNote} className="term">
                    {r.spirit}
                  </span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-xs leading-relaxed text-muted">
        <Term name="12운성">12운성</Term>은 일간 {chart.dayMaster.stem}이 각 자리에서 갖는
        기운의 세기이고, <Term name="12신살">12신살</Term>은 연지를 기준으로 각 자리가 띠는
        성질입니다. 각 단어에 마우스를 올리면 뜻이 나옵니다.
      </p>

      {/* 신살 목록 */}
      <div>
        <h3 className="mb-2 text-sm font-semibold">
          <Term name="신살">신살</Term>과 길성
        </h3>

        {total === 0 ? (
          <p className="text-xs text-muted">해당하는 신살이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {rows
              .filter((r) => r.hits.length > 0)
              .map((r) => (
                <div key={r.label} className="rounded-lg border border-border p-3">
                  <div className="mb-2 text-xs font-medium text-muted">{r.labelFull}</div>
                  <div className="space-y-2">
                    {r.hits.map((h, i) => (
                      <div key={`${h.name}-${i}`} className="flex flex-wrap gap-x-2 gap-y-1">
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${
                            h.kind === 'lucky'
                              ? 'border-wood/40 bg-wood/10 text-wood'
                              : 'border-earth/40 bg-earth/10 text-earth'
                          }`}
                        >
                          {h.name}
                        </span>
                        <span className="shrink-0 self-center text-[11px] text-muted">
                          {h.basis}
                        </span>
                        <p className="w-full text-xs leading-relaxed">{h.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          신살은 책과 유파마다 목록도 기준도 다릅니다. 기준이 분명한 것만 골랐고, 각 항목이
          무엇을 기준으로 나왔는지 함께 적었습니다. 이름이 무섭게 들리는 것이 많지만 좋고
          나쁨을 가르는 판정이 아니라 성질을 가리키는 이름으로 읽어 주세요.
        </p>
      </div>

      {/* 공망 */}
      <div className="rounded-lg bg-surface-muted/60 p-3">
        <h3 className="mb-1.5 text-xs font-semibold">
          <Term name="공망">공망</Term>
        </h3>
        <p className="text-xs leading-relaxed text-muted">
          일주 기준{' '}
          <strong className="text-foreground">{chart.voidBranches.join(', ')}</strong>
          {chart.pillars.some((p) => p.isVoid) ? (
            <>
              {' '}
              — {chart.pillars.filter((p) => p.isVoid).map((p) => p.labelFull).join(', ')}가
              여기 해당합니다.
            </>
          ) : (
            <> — 사주 안에 해당하는 자리는 없습니다.</>
          )}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          연주 기준{' '}
          <strong className="text-foreground">{analysis.yearVoidBranches.join(', ')}</strong>
          {yearVoidPillars.length > 0 ? (
            <> — {yearVoidPillars.map((p) => p.labelFull).join(', ')}가 여기 해당합니다.</>
          ) : (
            <> — 사주 안에 해당하는 자리는 없습니다.</>
          )}
        </p>
      </div>
    </div>
  )
}
