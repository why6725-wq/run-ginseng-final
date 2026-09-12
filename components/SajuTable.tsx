'use client'

import type { SajuChart } from '@/lib/saju'
import { hiddenStemsLabel } from '@/lib/analysis'
import { Term } from './Term'

/** 오행별 색. globals.css 의 전통 배색과 짝을 이룬다. */
const ELEMENT_STYLE: Record<string, { text: string; bg: string }> = {
  목: { text: 'text-wood', bg: 'bg-wood/10' },
  화: { text: 'text-fire', bg: 'bg-fire/10' },
  토: { text: 'text-earth', bg: 'bg-earth/10' },
  금: { text: 'text-metal', bg: 'bg-metal/10' },
  수: { text: 'text-water', bg: 'bg-water/10' },
}

/**
 * 만세력 표.
 *
 * 전통 만세력은 오른쪽에서 왼쪽으로 시·일·월·연 순서로 읽는다.
 * 그 순서를 그대로 따르되, 각 칸이 무엇인지 한글로 적어 처음 보는 사람도 읽을 수 있게 했다.
 */
export function SajuTable({ chart }: { chart: SajuChart }) {
  // 전통 순서(시 → 일 → 월 → 연)로 뒤집는다
  const columns = [...chart.pillars].reverse()

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[22rem] border-collapse text-center">
        <caption className="sr-only">사주팔자 만세력 표</caption>
        <thead>
          <tr>
            <th scope="col" className="w-16 p-2 text-xs font-medium text-muted sm:w-20">
              구분
            </th>
            {columns.map((p) => (
              <th key={p.label} scope="col" className="p-2">
                <div className="text-sm font-semibold">
                  <Term name={p.labelFull}>{p.labelFull}</Term>
                </div>
                <div className="mt-0.5 text-[11px] font-normal text-muted">
                  {p.label === '시'
                    ? '자식·노년'
                    : p.label === '일'
                      ? '나·배우자'
                      : p.label === '월'
                        ? '부모·사회'
                        : '조상·초년'}
                </div>
              </th>
            ))}
            {chart.hourUnknown && (
              <th scope="col" className="p-2 align-top">
                <div className="text-sm font-semibold text-muted">
                  <Term name="시주">시주</Term>
                </div>
                <div className="mt-0.5 text-[11px] font-normal text-muted">시각 모름</div>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {/* 천간 십신 */}
          <Row label="십신" sub="천간" muted>
            {columns.map((p) => (
              <td key={p.label} className="p-1.5 text-xs">
                <Term name={p.stemTenGod} className="text-muted">
                  {p.stemTenGod}
                </Term>
              </td>
            ))}
            {chart.hourUnknown && <td className="p-1.5 text-xs text-muted">—</td>}
          </Row>

          {/* 천간 */}
          <Row label="천간" sub="드러남" term="천간">
            {columns.map((p) => {
              const s = ELEMENT_STYLE[p.stemElement]
              return (
                <td key={p.label} className="p-1.5">
                  <div
                    className={`mx-auto flex h-16 w-14 flex-col items-center justify-center rounded-lg border border-border sm:h-20 sm:w-16 ${s.bg}`}
                  >
                    <span className={`hanja text-2xl font-semibold sm:text-3xl ${s.text}`}>
                      {p.stemHanja}
                    </span>
                    <span className="mt-0.5 text-[11px] text-muted">
                      {p.stem} · {p.stemYinYang}
                      {p.stemElement}
                    </span>
                  </div>
                </td>
              )
            })}
            {chart.hourUnknown && <td className="p-1.5">{emptyCell}</td>}
          </Row>

          {/* 지지 */}
          <Row label="지지" sub="바탕" term="지지">
            {columns.map((p) => {
              const s = ELEMENT_STYLE[p.branchElement]
              return (
                <td key={p.label} className="p-1.5">
                  <div
                    className={`relative mx-auto flex h-16 w-14 flex-col items-center justify-center rounded-lg border border-border sm:h-20 sm:w-16 ${s.bg}`}
                  >
                    <span className={`hanja text-2xl font-semibold sm:text-3xl ${s.text}`}>
                      {p.branchHanja}
                    </span>
                    <span className="mt-0.5 text-[11px] text-muted">
                      {p.branch} · {p.branchYinYang}
                      {p.branchElement}
                    </span>
                    {p.isVoid && (
                      <span className="absolute -right-1 -top-1 rounded bg-surface px-1 text-[9px] text-muted ring-1 ring-border">
                        공망
                      </span>
                    )}
                  </div>
                </td>
              )
            })}
            {chart.hourUnknown && <td className="p-1.5">{emptyCell}</td>}
          </Row>

          {/* 지지 십신 */}
          <Row label="십신" sub="지지" muted>
            {columns.map((p) => (
              <td key={p.label} className="p-1.5 text-xs">
                <Term name={p.branchTenGod} className="text-muted">
                  {p.branchTenGod}
                </Term>
              </td>
            ))}
            {chart.hourUnknown && <td className="p-1.5 text-xs text-muted">—</td>}
          </Row>

          {/* 지장간 — 지지 속에 숨은 천간 */}
          <Row label="지장간" sub="숨은 글자" term="지장간" muted>
            {columns.map((p) => (
              <td key={p.label} className="p-1.5 text-xs tracking-tight text-muted">
                {hiddenStemsLabel(p.branch)}
              </td>
            ))}
            {chart.hourUnknown && <td className="p-1.5 text-xs text-muted">—</td>}
          </Row>
        </tbody>
      </table>
    </div>
  )
}

const emptyCell = (
  <div className="mx-auto flex h-16 w-14 items-center justify-center rounded-lg border border-dashed border-border text-xl text-muted sm:h-20 sm:w-16">
    ?
  </div>
)

function Row({
  label,
  sub,
  term,
  muted,
  children,
}: {
  label: string
  sub: string
  term?: string
  muted?: boolean
  children: React.ReactNode
}) {
  return (
    <tr>
      <th
        scope="row"
        className={`p-2 text-right text-xs font-medium ${muted ? 'text-muted' : ''}`}
      >
        <div>{term ? <Term name={term}>{label}</Term> : <Term name={label}>{label}</Term>}</div>
        <div className="text-[10px] font-normal text-muted">{sub}</div>
      </th>
      {children}
    </tr>
  )
}
