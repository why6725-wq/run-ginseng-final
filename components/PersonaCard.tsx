'use client'

import type { Persona } from '@/lib/persona'
import type { SajuChart } from '@/lib/saju'

/**
 * 첫 화면의 주인공.
 *
 * "경금 일간에 신강한 사주"는 정확하지만 아무 느낌이 없다.
 * 별명과 키워드를 먼저 보여주고, 여덟 글자는 그 아래 작게 둔다.
 * 순서를 뒤집은 것이 이번 개편의 핵심이다.
 */
export function PersonaCard({
  persona,
  chart,
  name,
}: {
  persona: Persona
  chart: SajuChart
  name?: string | null
}) {
  const [from, to] = persona.gradient

  return (
    <div
      className="rise relative overflow-hidden rounded-3xl p-6 sm:p-8"
      style={{ background: `linear-gradient(145deg, ${from}, ${to})` }}
    >
      {/* 위쪽 빛 번짐 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-30 blur-3xl"
        style={{ background: '#fff' }}
      />

      <div className="relative">
        {name && <p className="mb-1 text-sm font-medium text-white/80">{name} 님은</p>}

        <p className="text-sm font-medium text-white/80">{persona.subtitle}</p>
        <h2 className="mt-1 text-3xl font-bold leading-tight text-white sm:text-4xl">
          {persona.title}
        </h2>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {persona.keywords.map((k) => (
            <span
              key={k}
              className="rounded-full bg-black/20 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm"
            >
              #{k}
            </span>
          ))}
        </div>

        <p className="mt-4 text-sm leading-relaxed text-white/90">{persona.line}</p>

        {/* 여덟 글자는 작게, 아래에 */}
        <div className="mt-5 flex gap-1.5 border-t border-white/20 pt-4">
          {chart.pillars.map((p) => (
            <div key={p.label} className="flex-1 text-center">
              <div className="text-[10px] text-white/60">{p.labelFull}</div>
              <div className="hanja mt-0.5 text-lg font-semibold leading-tight text-white">
                {p.stemHanja}
                <br />
                {p.branchHanja}
              </div>
            </div>
          ))}
          {chart.hourUnknown && (
            <div className="flex-1 text-center">
              <div className="text-[10px] text-white/60">시주</div>
              <div className="mt-0.5 text-lg font-semibold leading-tight text-white/40">
                ?<br />?
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
