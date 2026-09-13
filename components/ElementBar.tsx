'use client'

import type { SajuChart } from '@/lib/saju'
import { ELEMENT_TERMS } from '@/lib/terms'
import { Term } from './Term'

const ORDER = ['목', '화', '토', '금', '수'] as const

const BAR: Record<string, string> = {
  목: 'bg-wood',
  화: 'bg-fire',
  토: 'bg-earth',
  금: 'bg-metal',
  수: 'bg-water',
}

/**
 * 오행 분포.
 *
 * 여덟 글자가 다섯 기운 중 어디에 몰려 있는지 한눈에 보여준다.
 * 치우침과 빠진 기운이 해석의 출발점이라 표 바로 아래에 둔다.
 */
export function ElementBar({ chart }: { chart: SajuChart }) {
  const total = chart.pillars.length * 2

  return (
    <div>
      <div className="space-y-2">
        {ORDER.map((el) => {
          const n = chart.elementCounts[el] ?? 0
          const pct = total > 0 ? (n / total) * 100 : 0
          return (
            <div key={el} className="flex items-center gap-3">
              <div className="w-24 shrink-0 text-right text-xs sm:w-32">
                <Term name={el}>
                  <span className="font-medium">{el}</span>
                  <span className="hanja ml-1 text-muted">{ELEMENT_TERMS[el].hanja}</span>
                </Term>
              </div>
              <div className="h-5 flex-1 overflow-hidden rounded bg-surface-2">
                <div
                  className={`h-full rounded ${BAR[el]} transition-[width] duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="w-14 shrink-0 text-left text-xs tabular-nums text-muted">
                {n}개
                {n === 0 && <span className="ml-1 text-fire">없음</span>}
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted">
        전체 {total}글자 가운데 <strong className="text-foreground">{chart.dominantElement}</strong>
        의 기운이 가장 강합니다.{' '}
        {chart.missingElements.length > 0 ? (
          <>
            <strong className="text-foreground">{chart.missingElements.join(', ')}</strong>
            의 기운은 사주에 없습니다. 없는 기운은 부족한 부분이기도 하고, 평생 채우려 애쓰게
            되는 부분이기도 합니다.
          </>
        ) : (
          '다섯 기운을 모두 갖추었습니다. 한쪽으로 치우치지 않아 균형 잡힌 편입니다.'
        )}
      </p>
    </div>
  )
}
