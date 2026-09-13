/**
 * 심화 분석 시험: 지장간, 합충, 신강신약, 용신.
 *
 * 기준 사주로 확인한 값은 tests/golden.test.ts 에 있다.
 * 여기서는 표 자체가 성립하는지, 그리고 다른 사주에서도 규칙이 지켜지는지를 본다.
 */

import { describe, it, expect } from 'vitest'
import { EARTHLY_BRANCHES, HEAVENLY_STEMS } from 'manseryeok'
import type { FiveElement } from 'manseryeok'
import {
  HIDDEN_STEMS,
  hiddenStemsLabel,
  GENERATES,
  CONTROLS,
  GENERATED_BY,
  analyze,
  elementRole,
  findRelations,
  judgeStrength,
} from '../lib/analysis'
import { chartOf } from './fixtures'

describe('오행 상생·상극 표', () => {
  it('상생이 목화토금수 고리를 이룬다', () => {
    let el: FiveElement = '목'
    const seen: FiveElement[] = []
    for (let i = 0; i < 5; i++) {
      seen.push(el)
      el = GENERATES[el]
    }
    expect(seen).toEqual(['목', '화', '토', '금', '수'])
    expect(el).toBe('목') // 다섯 번 돌면 제자리
  })

  it('GENERATED_BY 는 GENERATES 의 정확한 역방향이다', () => {
    for (const [from, to] of Object.entries(GENERATES)) {
      expect(GENERATED_BY[to as FiveElement]).toBe(from)
    }
  })

  it('상극도 다섯 번 돌면 제자리로 온다', () => {
    let el: FiveElement = '목'
    for (let i = 0; i < 5; i++) el = CONTROLS[el]
    expect(el).toBe('목')
  })

  it('자기 자신을 생하거나 극하지 않는다', () => {
    for (const el of Object.keys(GENERATES) as FiveElement[]) {
      expect(GENERATES[el]).not.toBe(el)
      expect(CONTROLS[el]).not.toBe(el)
    }
  })
})

describe('지장간 표', () => {
  it('열두 지지가 모두 들어 있다', () => {
    expect(Object.keys(HIDDEN_STEMS).sort()).toEqual([...EARTHLY_BRANCHES].sort())
  })

  it('지지마다 날수 합이 30일이다', () => {
    for (const b of EARTHLY_BRANCHES) {
      const sum = HIDDEN_STEMS[b].reduce((s, h) => s + h.days, 0)
      expect(sum, `${b}의 날수 합`).toBe(30)
    }
  })

  it('지지마다 정기가 정확히 하나씩 있다', () => {
    for (const b of EARTHLY_BRANCHES) {
      const main = HIDDEN_STEMS[b].filter((h) => h.role === '정기')
      expect(main, `${b}의 정기`).toHaveLength(1)
    }
  })

  it('여기가 맨 앞, 정기가 맨 뒤에 온다', () => {
    for (const b of EARTHLY_BRANCHES) {
      const roles = HIDDEN_STEMS[b].map((h) => h.role)
      expect(roles[0], `${b}`).toBe('여기')
      expect(roles[roles.length - 1], `${b}`).toBe('정기')
    }
  })

  it('숨은 천간이 모두 실재하는 글자다', () => {
    for (const b of EARTHLY_BRANCHES) {
      for (const h of HIDDEN_STEMS[b]) {
        expect(HEAVENLY_STEMS, `${b}의 ${h.stem}`).toContain(h.stem)
      }
    }
  })

  it('표기가 글자를 순서대로 이어 붙인 것이다', () => {
    expect(hiddenStemsLabel('인')).toBe('무병갑')
    expect(hiddenStemsLabel('자')).toBe('임계')
    expect(hiddenStemsLabel('진')).toBe('을계무')
  })
})

describe('합충 찾기', () => {
  /** 특정 지지 넉 장을 가진 가짜 사주를 만들어 관계만 검사한다 */
  const relationsOf = (over: Parameters<typeof chartOf>[0]) =>
    findRelations(chartOf(over)).map((r) => r.name)

  it('삼합 세 글자가 다 모이면 삼합으로 잡는다', () => {
    // 1998-08-21 08:10 은 월·일·시지가 신·자·진
    const names = relationsOf({
      year: 1998,
      month: 8,
      day: 21,
      hour: 8,
      minute: 10,
      applyTrueSolarTime: true,
    })
    expect(names).toContain('신자진삼합')
  })

  it('충은 정반대 글자끼리만 잡는다', () => {
    const names = relationsOf({
      year: 1998,
      month: 8,
      day: 21,
      hour: 8,
      minute: 10,
      applyTrueSolarTime: true,
    })
    expect(names).toContain('인신충')
    // 같은 사주에서 성립하지 않는 충은 나오면 안 된다
    expect(names).not.toContain('자오충')
    expect(names).not.toContain('진술충')
  })

  it('합이 만드는 오행을 함께 알려준다', () => {
    const rels = findRelations(
      chartOf({ year: 1998, month: 8, day: 21, hour: 8, minute: 10, applyTrueSolarTime: true }),
    )
    const samhap = rels.find((r) => r.name === '신자진삼합')!
    expect(samhap.produces).toBe('수')
  })

  it('모든 관계가 참여한 자리와 설명을 달고 나온다', () => {
    const rels = findRelations(
      chartOf({ year: 1998, month: 8, day: 21, hour: 8, minute: 10, applyTrueSolarTime: true }),
    )
    for (const r of rels) {
      expect(r.positions.length, r.name).toBeGreaterThanOrEqual(2)
      expect(r.chars.length, r.name).toBe(r.positions.length)
      expect(r.note, r.name).toBeTruthy()
    }
  })

  it('같은 관계를 두 번 세지 않는다', () => {
    const rels = findRelations(
      chartOf({ year: 1998, month: 8, day: 21, hour: 8, minute: 10, applyTrueSolarTime: true }),
    )
    const keys = rels.map((r) => `${r.kind}:${[...r.positions].sort().join(',')}`)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('신강신약 판정', () => {
  /**
   * 역할마다 배점의 몇 할을 가져가는지. lib/analysis.ts 와 일부러 따로 적어둔다.
   * 여기 값과 어긋나게 고치면 시험이 잡아낸다.
   */
  const CREDIT: Record<string, number> = {
    비겁: 1,
    인성: 0.9,
    식상: 0.3,
    재성: 0.2,
    관성: 0.1,
  }

  it('다섯 역할의 평균이 정확히 0.5라 50점이 한가운데다', () => {
    const values = Object.values(CREDIT)
    expect(values.reduce((a, b) => a + b, 0) / values.length).toBeCloseTo(0.5, 10)
  })

  it('역할을 오행 관계대로 가른다', () => {
    // 경금 일간에서 보면
    expect(elementRole('금', '금')).toBe('비겁')
    expect(elementRole('금', '토')).toBe('인성') // 토생금
    expect(elementRole('금', '수')).toBe('식상') // 금생수
    expect(elementRole('금', '목')).toBe('재성') // 금극목
    expect(elementRole('금', '화')).toBe('관성') // 화극금
  })

  it('어느 일간에서 보든 다섯 역할이 하나씩 나온다', () => {
    for (const day of ['목', '화', '토', '금', '수'] as FiveElement[]) {
      const roles = (['목', '화', '토', '금', '수'] as FiveElement[]).map((e) =>
        elementRole(day, e),
      )
      expect(new Set(roles).size, day).toBe(5)
    }
  })

  it('배점 합이 항상 100이다 (네 기둥)', () => {
    for (const y of [1960, 1975, 1990, 2005, 2020]) {
      const s = judgeStrength(chartOf({ year: y, month: 6, day: 10, hour: 9, minute: 0 }))
      const total = s.rows.reduce((a, r) => a + r.weight, 0)
      expect(total, `${y}년생`).toBeCloseTo(100, 5)
    }
  })

  it('배점 합이 항상 100이다 (시각을 모르는 세 기둥)', () => {
    const s = judgeStrength(chartOf({ hour: null }))
    const total = s.rows.reduce((a, r) => a + r.weight, 0)
    expect(total).toBeCloseTo(100, 5)
    expect(s.rows).toHaveLength(5) // 일간을 뺀 다섯 자리
  })

  it('일간 자신은 점수에서 빠진다', () => {
    const s = judgeStrength(chartOf({}))
    expect(s.rows.map((r) => r.position)).not.toContain('일간')
  })

  it('점수와 판정이 늘 맞물린다', () => {
    for (let y = 1950; y <= 2020; y += 7) {
      for (const m of [2, 5, 8, 11]) {
        const s = judgeStrength(chartOf({ year: y, month: m, day: 12, hour: 14, minute: 0 }))
        const want = s.score >= 56 ? '신강' : s.score <= 44 ? '신약' : '중화'
        expect(s.verdict, `${y}-${m}`).toBe(want)
        expect(s.score).toBeGreaterThanOrEqual(0)
        expect(s.score).toBeLessThanOrEqual(100)
      }
    }
  })

  it('가져간 점수가 배점을 넘지 않는다', () => {
    for (let y = 1950; y <= 2020; y += 7) {
      const s = judgeStrength(chartOf({ year: y, month: 3, day: 12, hour: 14, minute: 0 }))
      for (const r of s.rows) {
        expect(r.credit, `${y} ${r.position}`).toBeGreaterThanOrEqual(0)
        expect(r.credit, `${y} ${r.position}`).toBeLessThanOrEqual(1)
        expect(r.points, `${y} ${r.position}`).toBeLessThanOrEqual(r.weight + 0.05)
      }
      // 합계가 배점 총합(100)을 넘지 않는다
      expect(s.rows.reduce((a, r) => a + r.points, 0)).toBeLessThanOrEqual(100.5)
    }
  })

  it('비겁은 배점을 전부 가져가고 관성은 거의 못 가져간다', () => {
    // 천간은 지장간이 없어 역할이 그대로 드러난다
    for (let y = 1950; y <= 2020; y += 3) {
      const s = judgeStrength(chartOf({ year: y, month: 9, day: 4, hour: 11, minute: 0 }))
      for (const r of s.rows.filter((x) => x.position.endsWith('간'))) {
        if (r.role === '비겁') expect(r.credit, `${y} ${r.position}`).toBe(1)
        if (r.role === '관성') expect(r.credit, `${y} ${r.position}`).toBeLessThan(0.2)
        // 비겁·인성이면 돕는 자리, 나머지는 아니다
        expect(r.helps, `${y} ${r.position} ${r.role}`).toBe(
          r.role === '비겁' || r.role === '인성',
        )
      }
    }
  })

  it('지지는 속에 품은 지장간까지 날수만큼 나눠 센다', () => {
    const s = judgeStrength(chartOf({}))
    for (const r of s.rows.filter((x) => x.position.endsWith('지'))) {
      expect(r.hidden.length, r.position).toBeGreaterThanOrEqual(2)
      expect(r.hidden.reduce((a, h) => a + h.days, 0), r.position).toBe(30)
      // 지장간을 날수로 가중평균한 값이 곧 credit 이다
      const want = r.hidden.reduce((a, h) => a + CREDIT[h.role] * h.days, 0) / 30
      expect(r.credit, r.position).toBeCloseTo(want, 2)
    }
  })

  it('돕는 자리로 본 오행은 비겁이나 인성 쪽이다', () => {
    // 지지는 지장간이 섞여 겉 글자와 어긋날 수 있으니 천간만 본다
    const s = judgeStrength(chartOf({}))
    for (const r of s.rows.filter((x) => x.position.endsWith('간'))) {
      expect(s.allyElements.includes(r.element), `${r.position} ${r.element}`).toBe(r.helps)
    }
  })

  it('자리마다 왜 그렇게 봤는지 설명이 붙는다', () => {
    const s = judgeStrength(chartOf({}))
    for (const r of s.rows) expect(r.reason, r.position).toBeTruthy()
  })
})

describe('용신 고르기', () => {
  it('이로운 오행과 부담되는 오행이 겹치지 않는다', () => {
    for (let y = 1950; y <= 2020; y += 5) {
      const a = analyze(chartOf({ year: y, month: 4, day: 8, hour: 10, minute: 0 }))
      const overlap = a.yongsin.favorable.filter((e) => a.yongsin.unfavorable.includes(e))
      expect(overlap, `${y}년생`).toEqual([])
    }
  })

  it('신강이면 덜어내는 쪽, 신약이면 보태는 쪽을 고른다', () => {
    for (let y = 1950; y <= 2020; y += 3) {
      const chart = chartOf({ year: y, month: 7, day: 20, hour: 16, minute: 0 })
      const a = analyze(chart)
      const day = chart.dayMaster.element
      if (a.strength.verdict === '신강') {
        // 비겁(일간과 같은 오행)과 인성(일간을 생하는 오행)은 용신이 아니다
        expect(a.yongsin.favorable, `${y}`).not.toContain(day)
        expect(a.yongsin.favorable, `${y}`).not.toContain(GENERATED_BY[day])
      } else if (a.strength.verdict === '신약') {
        expect(a.yongsin.favorable, `${y}`).toContain(day)
        expect(a.yongsin.favorable, `${y}`).toContain(GENERATED_BY[day])
      }
    }
  })

  it('원국에 없는 용신을 따로 짚어준다', () => {
    const chart = chartOf({
      year: 1998,
      month: 8,
      day: 21,
      hour: 8,
      minute: 10,
      gender: 'female',
      applyTrueSolarTime: true,
    })
    const a = analyze(chart)
    for (const el of a.yongsin.missingFavorable) {
      expect(chart.elementCounts[el], `${el}`).toBe(0)
      expect(a.yongsin.favorable).toContain(el)
    }
  })

  it('겨울에 화가 없으면 조후 조언이 붙는다', () => {
    // 자월(12월 중순) 출생에 화가 없는 사주를 찾아 확인한다
    let found = false
    for (let y = 1950; y <= 2020 && !found; y += 1) {
      const chart = chartOf({ year: y, month: 12, day: 20, hour: 3, minute: 0 })
      if ((chart.elementCounts['화'] ?? 0) === 0) {
        const a = analyze(chart)
        expect(a.yongsin.seasonNote, `${y}년생`).toContain('겨울')
        found = true
      }
    }
    expect(found, '겨울에 화가 없는 사례를 찾지 못함').toBe(true)
  })
})

describe('analyze 가 모든 조각을 함께 돌려준다', () => {
  it('네 기둥 사주', () => {
    const a = analyze(chartOf({}))
    expect(a.hiddenStems).toHaveLength(4)
    expect(a.spirits).toHaveLength(4)
    expect(a.yearVoidBranches).toHaveLength(2)
    expect(a.strength.verdict).toBeTruthy()
    expect(a.yongsin.favorable.length).toBeGreaterThan(0)
  })

  it('시각을 모르는 세 기둥 사주도 문제없이 돈다', () => {
    const a = analyze(chartOf({ hour: null }))
    expect(a.hiddenStems).toHaveLength(3)
    expect(a.spirits).toHaveLength(3)
    expect(a.strength.verdict).toBeTruthy()
  })

  it('1900년부터 2050년까지 어떤 날짜에도 터지지 않는다', () => {
    const errors: string[] = []
    for (let y = 1900; y <= 2050; y += 1) {
      try {
        analyze(chartOf({ year: y, month: ((y % 12) + 1), day: 15, hour: y % 24, minute: 0 }))
      } catch (e) {
        errors.push(`${y}: ${(e as Error).message}`)
      }
    }
    expect(errors).toEqual([])
  })
})
