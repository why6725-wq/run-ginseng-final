/**
 * 12운성, 12신살, 신살, 공망 시험.
 *
 * 기준 사주로 확인한 값은 tests/golden.test.ts 에 있다.
 * 여기서는 표가 구조적으로 성립하는지를 본다. 표는 전부 손으로 적은 값이라
 * 한 칸만 잘못 적어도 조용히 틀린 답이 나온다. 그걸 잡는 것이 목적이다.
 */

import { describe, it, expect } from 'vitest'
import { EARTHLY_BRANCHES, HEAVENLY_STEMS, getVoidBranches } from 'manseryeok'
import {
  STAGE_ORDER,
  SPIRIT_ORDER,
  STAGE_NOTE,
  SPIRIT_NOTE,
  twelveStage,
  twelveSpirit,
  voidBranchesOf,
  findSpirits,
} from '../lib/spirits'
import { chartOf } from './fixtures'

describe('12운성', () => {
  it('천간마다 열두 지지에서 열두 단계가 정확히 한 번씩 나온다', () => {
    for (const stem of HEAVENLY_STEMS) {
      const stages = EARTHLY_BRANCHES.map((b) => twelveStage(stem, b))
      expect(new Set(stages).size, `${stem}의 단계 수`).toBe(12)
      expect([...stages].sort(), `${stem}`).toEqual([...STAGE_ORDER].sort())
    }
  })

  it('건록 자리는 그 천간의 정록 자리와 같다', () => {
    // 건록(제 밥벌이를 하는 자리)과 정록은 같은 것을 가리키는 두 이름이다
    const 정록: Record<string, string> = {
      갑: '인',
      을: '묘',
      병: '사',
      무: '사',
      정: '오',
      기: '오',
      경: '신',
      신: '유',
      임: '해',
      계: '자',
    }
    for (const stem of HEAVENLY_STEMS) {
      const geonrok = EARTHLY_BRANCHES.find((b) => twelveStage(stem, b) === '건록')
      expect(geonrok, `${stem}의 건록`).toBe(정록[stem])
    }
  })

  it('양간은 순행, 음간은 역행한다', () => {
    // 갑(양간)은 해에서 장생해 자로 나아가고, 을(음간)은 오에서 장생해 사로 물러난다
    expect(twelveStage('갑', '해')).toBe('장생')
    expect(twelveStage('갑', '자')).toBe('목욕')
    expect(twelveStage('을', '오')).toBe('장생')
    expect(twelveStage('을', '사')).toBe('목욕')
  })

  it('모든 단계에 설명이 있다', () => {
    for (const s of STAGE_ORDER) expect(STAGE_NOTE[s], s).toBeTruthy()
  })
})

describe('12신살', () => {
  it('기준 지지마다 열두 자리가 정확히 한 번씩 나온다', () => {
    for (const base of EARTHLY_BRANCHES) {
      const spirits = EARTHLY_BRANCHES.map((b) => twelveSpirit(base, b))
      expect(new Set(spirits).size, `${base} 기준`).toBe(12)
      expect([...spirits].sort(), `${base} 기준`).toEqual([...SPIRIT_ORDER].sort())
    }
  })

  it('같은 삼합 무리에 속한 기준 지지는 같은 결과를 낸다', () => {
    // 연지가 인이든 오든 술이든, 화국이므로 12신살 배치가 같다
    for (const group of [
      ['인', '오', '술'],
      ['신', '자', '진'],
      ['사', '유', '축'],
      ['해', '묘', '미'],
    ] as const) {
      const [a, b, c] = group
      for (const target of EARTHLY_BRANCHES) {
        expect(twelveSpirit(b, target), `${a}/${b}`).toBe(twelveSpirit(a, target))
        expect(twelveSpirit(c, target), `${a}/${c}`).toBe(twelveSpirit(a, target))
      }
    }
  })

  it('기준 지지 자신은 지살 자리에 온다', () => {
    // 삼합의 생지(장생하는 자리)가 지살이다
    expect(twelveSpirit('인', '인')).toBe('지살')
    expect(twelveSpirit('신', '신')).toBe('지살')
    expect(twelveSpirit('사', '사')).toBe('지살')
    expect(twelveSpirit('해', '해')).toBe('지살')
  })

  it('삼합 가운데 글자(왕지)는 장성 자리에 온다', () => {
    expect(twelveSpirit('인', '오')).toBe('장성')
    expect(twelveSpirit('신', '자')).toBe('장성')
    expect(twelveSpirit('사', '유')).toBe('장성')
    expect(twelveSpirit('해', '묘')).toBe('장성')
  })

  it('모든 자리에 설명이 있다', () => {
    for (const s of SPIRIT_ORDER) expect(SPIRIT_NOTE[s], s).toBeTruthy()
  })
})

describe('공망', () => {
  it('육십갑자 예순 개 전부 만세력 라이브러리와 값이 같다', () => {
    const mismatches: string[] = []
    for (let i = 0; i < 60; i++) {
      const stem = HEAVENLY_STEMS[i % 10]
      const branch = EARTHLY_BRANCHES[i % 12]
      const mine = voidBranchesOf(stem, branch).sort().join(',')
      const theirs = [...getVoidBranches(stem, branch)].sort().join(',')
      if (mine !== theirs) mismatches.push(`${stem}${branch}: ${mine} ≠ ${theirs}`)
    }
    expect(mismatches).toEqual([])
  })

  it('언제나 지지 두 개가 나온다', () => {
    for (let i = 0; i < 60; i++) {
      const v = voidBranchesOf(HEAVENLY_STEMS[i % 10], EARTHLY_BRANCHES[i % 12])
      expect(v, `${i}`).toHaveLength(2)
      expect(v[0]).not.toBe(v[1])
    }
  })

  it('한 순(旬)에 속한 열 간지는 같은 공망을 갖는다', () => {
    // 갑자순: 갑자부터 계유까지 열 개. 공망은 술·해
    for (let k = 0; k < 10; k++) {
      const v = voidBranchesOf(HEAVENLY_STEMS[k], EARTHLY_BRANCHES[k])
      expect(v.sort(), `갑자순의 ${k}번째`).toEqual(['술', '해'])
    }
  })
})

describe('신살 찾기', () => {
  it('기둥마다 12운성과 12신살이 반드시 붙는다', () => {
    for (let y = 1950; y <= 2020; y += 9) {
      const spirits = findSpirits(chartOf({ year: y, month: 3, day: 14, hour: 11, minute: 0 }))
      for (const s of spirits) {
        expect(STAGE_ORDER, `${y} ${s.labelFull}`).toContain(s.stage)
        expect(SPIRIT_ORDER, `${y} ${s.labelFull}`).toContain(s.spirit)
      }
    }
  })

  it('같은 신살을 한 기둥에서 두 번 세지 않는다', () => {
    for (let y = 1950; y <= 2020; y += 3) {
      const spirits = findSpirits(chartOf({ year: y, month: 9, day: 9, hour: 21, minute: 0 }))
      for (const s of spirits) {
        const names = s.hits.map((h) => h.name)
        expect(new Set(names).size, `${y} ${s.labelFull}`).toBe(names.length)
      }
    }
  })

  it('모든 신살이 길성 아니면 흉살로 갈린다', () => {
    for (let y = 1960; y <= 2020; y += 7) {
      const spirits = findSpirits(chartOf({ year: y, month: 11, day: 3, hour: 5, minute: 0 }))
      for (const s of spirits) {
        for (const h of s.hits) {
          expect(['lucky', 'unlucky'], `${h.name}`).toContain(h.kind)
        }
      }
    }
  })

  it('괴강살은 경진·경술·임진·임술·무술 기둥에만 붙는다', () => {
    const 괴강 = ['경진', '경술', '임진', '임술', '무술']
    for (let y = 1950; y <= 2020; y += 2) {
      const chart = chartOf({ year: y, month: 6, day: 18, hour: 13, minute: 0 })
      const spirits = findSpirits(chart)
      for (const [i, s] of spirits.entries()) {
        const has = s.hits.some((h) => h.name === '괴강살')
        expect(has, `${y} ${s.labelFull} ${chart.pillars[i].korean}`).toBe(
          괴강.includes(chart.pillars[i].korean),
        )
      }
    }
  })

  it('시각을 모르면 세 기둥만 돌려준다', () => {
    expect(findSpirits(chartOf({ hour: null }))).toHaveLength(3)
  })
})
