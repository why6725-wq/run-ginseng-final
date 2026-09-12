'use client'

import type { Analysis, RelationKind } from '@/lib/analysis'
import { Term } from './Term'

/** 합은 묶이는 것, 충형파해는 부딪치는 것. 색으로 갈라 한눈에 구분되게 했다. */
const KIND_STYLE: Record<RelationKind, string> = {
  천간합: 'border-wood/40 bg-wood/10 text-wood',
  삼합: 'border-wood/40 bg-wood/10 text-wood',
  반합: 'border-wood/40 bg-wood/10 text-wood',
  방합: 'border-wood/40 bg-wood/10 text-wood',
  방합반합: 'border-wood/40 bg-wood/10 text-wood',
  육합: 'border-wood/40 bg-wood/10 text-wood',
  천간충: 'border-fire/40 bg-fire/10 text-fire',
  충: 'border-fire/40 bg-fire/10 text-fire',
  형: 'border-fire/40 bg-fire/10 text-fire',
  자형: 'border-fire/40 bg-fire/10 text-fire',
  파: 'border-earth/40 bg-earth/10 text-earth',
  해: 'border-earth/40 bg-earth/10 text-earth',
}

/** 툴팁을 띄울 수 있는 용어로 이어준다 */
const TERM_OF: Record<RelationKind, string> = {
  천간합: '삼합',
  삼합: '삼합',
  반합: '반합',
  방합: '방합',
  방합반합: '반합',
  육합: '육합',
  천간충: '충',
  충: '충',
  형: '형',
  자형: '형',
  파: '파',
  해: '해',
}

/**
 * 글자 사이의 관계.
 *
 * 오행 개수만 세면 놓치는 것이 여기 있다. 삼합이 하나 있으면
 * 한 글자뿐인 오행이 사주를 통째로 이끌기도 한다.
 */
export function RelationList({ analysis }: { analysis: Analysis }) {
  const { relations } = analysis

  if (relations.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-muted">
        뚜렷한 <Term name="삼합">합</Term>이나 <Term name="충">충</Term>이 없습니다. 글자들이
        서로 간섭하지 않고 제자리에서 제 역할을 합니다.
      </p>
    )
  }

  return (
    <div className="space-y-2.5">
      {relations.map((r, i) => (
        <div
          key={`${r.name}-${i}`}
          className="flex flex-col gap-1.5 rounded-lg border border-border p-3 sm:flex-row sm:items-start sm:gap-3"
        >
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${KIND_STYLE[r.kind]}`}
            >
              <Term name={TERM_OF[r.kind]}>{r.name}</Term>
            </span>
            {r.produces && (
              <span className="text-xs text-muted">→ {r.produces} 기운</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted">{r.positions.join(' + ')}</div>
            <p className="mt-0.5 text-xs leading-relaxed">{r.note}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
