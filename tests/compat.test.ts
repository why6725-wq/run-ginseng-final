/**
 * 궁합 시험.
 *
 * 궁합은 특히 조심스럽다. "이 사람과는 안 된다" 같은 말이 실제 관계를 흔들 수 있어서,
 * 계산이 맞는지뿐 아니라 배점이 한쪽으로 무너지지 않는지, 지시문이 관계를 부정하지
 * 못하게 막고 있는지까지 확인한다.
 */

import { describe, it, expect } from 'vitest'
import { judgeCompatibility } from '../lib/compat'
import {
  COMPAT_SECTIONS,
  COMPAT_SYSTEM_PROMPT,
  buildCompatPrompt,
  compatToText,
  validateName,
  validateRelation,
} from '../lib/compat-prompt'
import { analyze } from '../lib/analysis'
import { chartOf, GOLDEN_INPUT } from './fixtures'

const a = chartOf(GOLDEN_INPUT)
const b = chartOf({ year: 1995, month: 3, day: 14, hour: 15, minute: 0, gender: 'male' })
const anA = analyze(a)
const anB = analyze(b)

describe('궁합 점수', () => {
  const c = judgeCompatibility(a, b, anA, anB)

  it('0에서 100 사이로 나온다', () => {
    expect(c.score).toBeGreaterThanOrEqual(0)
    expect(c.score).toBeLessThanOrEqual(100)
  })

  it('다섯 대목의 배점 합이 100이다', () => {
    const total = c.sections.reduce((s, sec) => s + sec.max, 0)
    expect(total).toBe(100)
  })

  it('대목마다 점수가 배점 안에 들어온다', () => {
    for (const sec of c.sections) {
      expect(sec.score, sec.title).toBeGreaterThanOrEqual(0)
      expect(sec.score, sec.title).toBeLessThanOrEqual(sec.max)
    }
  })

  it('총점이 대목 점수의 합과 맞는다', () => {
    const sum = c.sections.reduce((s, sec) => s + sec.score, 0)
    expect(c.score).toBe(Math.round(sum))
  })

  it('모든 항목이 제목과 설명을 달고 나온다', () => {
    for (const sec of c.sections) {
      expect(sec.items.length, sec.title).toBeGreaterThan(0)
      for (const item of sec.items) {
        expect(item.title, sec.title).toBeTruthy()
        expect(item.note, sec.title).toBeTruthy()
        expect(['good', 'caution', 'neutral']).toContain(item.tone)
      }
    }
  })

  it('용신 대목에 가장 큰 배점을 준다', () => {
    const yongsin = c.sections.find((s) => s.key === 'yongsin')!
    for (const other of c.sections.filter((s) => s.key !== 'yongsin')) {
      expect(yongsin.max, other.title).toBeGreaterThan(other.max)
    }
  })

  it('순서를 바꿔도 총점이 같다', () => {
    const flipped = judgeCompatibility(b, a, anB, anA)
    expect(flipped.score).toBe(c.score)
  })

  it('판정이 점수와 맞물린다', () => {
    for (let y = 1960; y <= 2005; y += 5) {
      const other = chartOf({ year: y, month: 7, day: 7, hour: 7, minute: 0 })
      const r = judgeCompatibility(a, other)
      const want =
        r.score >= 80
          ? '서로를 채워주는 사이'
          : r.score >= 65
            ? '잘 맞는 편'
            : r.score >= 50
              ? '무난한 편'
              : r.score >= 35
                ? '노력이 필요한 사이'
                : '부딪치기 쉬운 사이'
      expect(r.verdict, `${y}`).toBe(want)
    }
  })
})

describe('궁합 계산이 무너지지 않는다', () => {
  it('어떤 조합에서도 터지지 않고 점수 범위를 지킨다', () => {
    const errors: string[] = []
    for (let ya = 1950; ya <= 2010; ya += 11) {
      for (let yb = 1950; yb <= 2010; yb += 13) {
        try {
          const x = chartOf({ year: ya, month: 4, day: 4, hour: 4, minute: 0 })
          const y = chartOf({ year: yb, month: 10, day: 20, hour: 20, minute: 0 })
          const r = judgeCompatibility(x, y)
          if (r.score < 0 || r.score > 100) errors.push(`${ya}/${yb}: ${r.score}`)
        } catch (e) {
          errors.push(`${ya}/${yb}: ${(e as Error).message}`)
        }
      }
    }
    expect(errors).toEqual([])
  })

  it('자기 자신과의 궁합도 계산된다', () => {
    const r = judgeCompatibility(a, a, anA, anA)
    expect(r.score).toBeGreaterThanOrEqual(0)
    // 같은 사주끼리는 배우자 자리가 같은 글자다
    expect(
      r.sections.find((s) => s.key === 'dayBranch')!.items.some((i) => i.title.includes('같은 글자')),
    ).toBe(true)
  })

  it('시각을 모르는 사주도 섞어 계산할 수 있다', () => {
    const noHour = chartOf({ ...GOLDEN_INPUT, hour: null })
    const r = judgeCompatibility(noHour, b)
    expect(r.score).toBeGreaterThanOrEqual(0)
    expect(r.sections).toHaveLength(5)
  })

  it('채워주는 기운은 실제로 상대가 갖고 있는 것만 잡는다', () => {
    const r = judgeCompatibility(a, b, anA, anB)
    for (const el of r.fills.aNeedsFromB) {
      expect(anA.yongsin.favorable, el).toContain(el)
      expect(b.elementCounts[el], el).toBeGreaterThanOrEqual(2)
    }
    for (const el of r.fills.bNeedsFromA) {
      expect(anB.yongsin.favorable, el).toContain(el)
      expect(a.elementCounts[el], el).toBeGreaterThanOrEqual(2)
    }
  })

  it('조사가 어긋난 문장이 없다', () => {
    for (let y = 1960; y <= 2010; y += 3) {
      const other = chartOf({ year: y, month: 9, day: 9, hour: 9, minute: 0 })
      const r = judgeCompatibility(a, other)
      const all = r.sections.flatMap((s) => s.items.map((i) => i.note)).join(' ')
      for (const bad of ['토이 ', '수을 ', '화이 ', '화을 ', '분를 ', '분가 ', '수이 ']) {
        expect(all.includes(bad), `${y}년생과의 궁합에 "${bad.trim()}"`).toBe(false)
      }
    }
  })
})

describe('궁합 프롬프트', () => {
  const c = judgeCompatibility(a, b, anA, anB)
  const prompt = buildCompatPrompt({
    a: { name: '가나', chart: a, analysis: anA },
    b: { name: '다라', chart: b, analysis: anB },
    compatibility: c,
    relation: '연인',
  })

  it('두 사람의 사주가 모두 실린다', () => {
    expect(prompt).toContain('경자')
    expect(prompt).toContain(b.pillars.find((p) => p.label === '일')!.korean)
  })

  it('이름과 관계가 실린다', () => {
    expect(prompt).toContain('가나')
    expect(prompt).toContain('다라')
    expect(prompt).toContain('두 분의 관계: 연인')
  })

  it('두 사람의 신강신약과 용신이 실린다', () => {
    expect(prompt).toContain('신강신약: 신강 (73점)')
    expect(prompt).toContain('용신(이로운 오행): 수, 목, 화')
  })

  it('궁합 점수와 대목별 근거가 실린다', () => {
    expect(prompt).toContain(`총점: ${c.score}점`)
    for (const sec of c.sections) {
      expect(prompt, sec.title).toContain(sec.title)
    }
  })

  it('다섯 항목을 순서대로 요청한다', () => {
    expect(COMPAT_SECTIONS.map((s) => s.title)).toEqual([
      '총평',
      '서로에게 끌리는 점',
      '함께할 때의 강점',
      '부딪치기 쉬운 지점',
      '오래가려면',
    ])
    for (const s of COMPAT_SECTIONS) expect(prompt, s.title).toContain(`## ${s.title}`)
  })

  it('이름이 없으면 첫째 분, 둘째 분으로 부른다', () => {
    const p = buildCompatPrompt({
      a: { name: null, chart: a, analysis: anA },
      b: { name: null, chart: b, analysis: anB },
      compatibility: c,
      relation: null,
    })
    expect(p).toContain('## 첫째 분')
    expect(p).toContain('## 둘째 분')
    expect(p).not.toContain('두 분의 관계:')
  })

  it('시각을 모르면 안내가 붙는다', () => {
    const noHour = chartOf({ ...GOLDEN_INPUT, hour: null })
    const p = buildCompatPrompt({
      a: { name: null, chart: noHour, analysis: analyze(noHour) },
      b: { name: null, chart: b, analysis: anB },
      compatibility: judgeCompatibility(noHour, b),
      relation: null,
    })
    expect(p).toContain('태어난 시각을 모릅니다')
  })

  it('계산 결과에 없는 값을 지어내지 않는다', () => {
    const text = compatToText({
      a: { name: null, chart: a, analysis: anA },
      b: { name: null, chart: b, analysis: anB },
      compatibility: c,
      relation: null,
    })
    // 점수는 계산된 값 그대로여야 한다
    expect(text).toContain(`${c.score}점 / 100점`)
    expect(text).toContain(c.verdict)
  })
})

describe('궁합 지시문', () => {
  it('관계를 부정하지 말라고 못박는다', () => {
    expect(COMPAT_SYSTEM_PROMPT).toContain('관계를 부정하지 마십시오')
    expect(COMPAT_SYSTEM_PROMPT).toContain('헤어져야 한다')
    expect(COMPAT_SYSTEM_PROMPT).toContain('관계의 성패를 정하지 않습니다')
  })

  it('한쪽을 탓하지 말라고 못박는다', () => {
    expect(COMPAT_SYSTEM_PROMPT).toContain('한쪽을 탓하지 마십시오')
  })

  it('점수를 뒤집지 말라고 못박는다', () => {
    expect(COMPAT_SYSTEM_PROMPT).toContain('점수와 판정을 뒤집지 마십시오')
  })

  it('결혼과 출산 시기를 단정하지 말라고 한다', () => {
    expect(COMPAT_SYSTEM_PROMPT).toContain('단정하지 마십시오')
    expect(COMPAT_SYSTEM_PROMPT).toContain('고정관념')
  })

  it('관계가 안 주어지면 전제하지 말라고 한다', () => {
    expect(COMPAT_SYSTEM_PROMPT).toContain('특정 관계를 전제하지 말고')
  })
})

describe('이름과 관계 입력 검증', () => {
  it('빈 값은 null 로 돌려준다', () => {
    expect(validateName('')).toBeNull()
    expect(validateName('   ')).toBeNull()
    expect(validateName(null)).toBeNull()
    expect(validateName(42)).toBeNull()
    expect(validateRelation('')).toBeNull()
  })

  it('앞뒤 공백을 다듬고 길이를 자른다', () => {
    expect(validateName('  홍길동  ')).toBe('홍길동')
    expect(validateName('가'.repeat(50))?.length).toBe(20)
    expect(validateRelation('  연인 ')).toBe('연인')
  })
})
