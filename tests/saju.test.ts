/**
 * 사주팔자 계산 시험.
 *
 * 여기서 검사하는 값은 두 갈래로 확인한 것이다.
 *  1. 중국 만세력 라이브러리(lunar-javascript)와 대조해 네 기둥이 모두 일치
 *  2. 일주는 율리우스일 공식으로 따로 계산해 일치
 *
 * 계산 방법이 완전히 다른 두 갈래가 같은 답을 내면,
 * 어느 한쪽이 조용히 틀어졌을 가능성이 매우 낮다.
 */

import { describe, it, expect } from 'vitest'
import { chartOf, input, dayPillarByJulian, NOW } from './fixtures'
import { buildChart, validateInput } from '../lib/saju'

/** '연 월 일 시' 순서로 한글 간지를 뽑는다 */
function pillars(over: Parameters<typeof chartOf>[0]): string[] {
  return chartOf(over).pillars.map((p) => p.korean)
}

describe('팔자 계산 (다른 라이브러리와 대조한 값)', () => {
  const cases: [string, Parameters<typeof chartOf>[0], string[]][] = [
    ['1990-05-15 14:30', { year: 1990, month: 5, day: 15, hour: 14, minute: 30 }, ['경오', '신사', '경진', '계미']],
    ['1985-11-03 09:00', { year: 1985, month: 11, day: 3, hour: 9, minute: 0 }, ['을축', '병술', '병오', '계사']],
    ['2000-01-01 12:00', { year: 2000, month: 1, day: 1, hour: 12, minute: 0 }, ['기묘', '병자', '무오', '무오']],
    ['1976-07-22 06:45', { year: 1976, month: 7, day: 22, hour: 6, minute: 45 }, ['병진', '을미', '을해', '기묘']],
    ['2003-09-30 20:10', { year: 2003, month: 9, day: 30, hour: 20, minute: 10 }, ['계미', '신유', '병오', '무술']],
    ['1962-03-11 03:20', { year: 1962, month: 3, day: 11, hour: 3, minute: 20 }, ['임인', '계묘', '무신', '갑인']],
    ['2024-12-25 17:05', { year: 2024, month: 12, day: 25, hour: 17, minute: 5 }, ['갑진', '병자', '계해', '신유']],
  ]

  for (const [label, over, expected] of cases) {
    it(`${label} → ${expected.join(' ')}`, () => {
      expect(pillars(over)).toEqual(expected)
    })
  }
})

describe('일주는 율리우스일 공식과 항상 같다', () => {
  it('1900년부터 2050년까지 매년 여러 날을 확인한다', () => {
    const mismatches: string[] = []
    for (let y = 1900; y <= 2050; y += 1) {
      for (const [m, d] of [
        [1, 7],
        [3, 19],
        [6, 30],
        [9, 11],
        [12, 24],
      ]) {
        const got = chartOf({ year: y, month: m, day: d, hour: 12, minute: 0 }).pillars.find(
          (p) => p.label === '일',
        )!.korean
        const want = dayPillarByJulian(y, m, d)
        if (got !== want) mismatches.push(`${y}-${m}-${d}: ${got} ≠ ${want}`)
      }
    }
    expect(mismatches).toEqual([])
  })
})

describe('절기 경계 — 사주의 해는 입춘에 바뀐다', () => {
  // 1988년 입춘 절입은 2월 4일 23시 43분 (한국시)
  it('입춘 전에 태어나면 전년도 기운이다', () => {
    expect(pillars({ year: 1988, month: 2, day: 4, hour: 10, minute: 0 })[0]).toBe('정묘')
  })

  it('절입 시각 직전도 아직 전년도다', () => {
    expect(pillars({ year: 1988, month: 2, day: 4, hour: 23, minute: 0 })[0]).toBe('정묘')
  })

  it('입춘이 지나면 그해 기운으로 바뀐다', () => {
    expect(pillars({ year: 1988, month: 2, day: 5, hour: 3, minute: 0 })[0]).toBe('무진')
  })

  it('입춘 전 출생이면 화면에 안내 문구가 붙는다', () => {
    const chart = chartOf({ year: 1988, month: 2, day: 4, hour: 10, minute: 0 })
    expect(chart.notes.some((n) => n.includes('입춘'))).toBe(true)
  })
})

describe('진태양시 보정', () => {
  it('보정하면 시주가 한 칸 바뀌는 경우가 있다', () => {
    const base = { year: 1990, month: 5, day: 15, hour: 13, minute: 10 }
    const off = chartOf({ ...base, applyTrueSolarTime: false })
    const on = chartOf({ ...base, applyTrueSolarTime: true, longitude: 126.978 })
    expect(off.pillars.find((p) => p.label === '시')!.korean).toBe('계미')
    expect(on.pillars.find((p) => p.label === '시')!.korean).toBe('임오')
  })

  it('보정을 켜면 안내 문구가 붙는다', () => {
    const chart = chartOf({ applyTrueSolarTime: true })
    expect(chart.notes.some((n) => n.includes('진태양시'))).toBe(true)
  })
})

describe('과거 서머타임', () => {
  const hourPillar = (year: number, month: number, day: number) =>
    chartOf({
      year,
      month,
      day,
      hour: 12,
      minute: 0,
      applyTrueSolarTime: true,
      longitude: 126.978,
    }).pillars.find((p) => p.label === '시')!.korean

  it('시행 기간에는 한 시간 당겨 계산한다', () => {
    // 보정을 끄면 오시, 켜면 사시로 한 칸 내려간다
    expect(hourPillar(1988, 7, 15)).toBe('계사')
    expect(hourPillar(1987, 6, 20)).toBe('신사')
    expect(hourPillar(1955, 7, 15)).toBe('을사')
    expect(hourPillar(1948, 7, 15)).toBe('계사')
  })

  it('시행하지 않은 해에는 손대지 않는다', () => {
    expect(hourPillar(1965, 7, 15)).toBe('임오')
    expect(hourPillar(1988, 12, 15)).toBe('경오')
  })
})

describe('야자시 — 밤 11시부터 자정까지', () => {
  const at2330 = (dayBoundary: 'midnight' | 'jasi' | 'splitJasi') => {
    const c = chartOf({ year: 2000, month: 1, day: 1, hour: 23, minute: 30, dayBoundary })
    return {
      day: c.pillars.find((p) => p.label === '일')!.korean,
      hour: c.pillars.find((p) => p.label === '시')!.korean,
    }
  }

  it('자정 기준이면 일주와 시주 모두 당일이다', () => {
    expect(at2330('midnight')).toEqual({ day: '무오', hour: '임자' })
  })

  it('자시 기준이면 둘 다 다음날로 넘어간다', () => {
    expect(at2330('jasi')).toEqual({ day: '기미', hour: '갑자' })
  })

  it('절충 기준이면 일주는 당일, 시주만 다음날이다', () => {
    expect(at2330('splitJasi')).toEqual({ day: '무오', hour: '갑자' })
  })
})

describe('음력 입력', () => {
  it('음력 1990-04-21은 양력 1990-05-15와 같은 사주가 된다', () => {
    const lunar = chartOf({
      year: 1990,
      month: 4,
      day: 21,
      hour: 14,
      minute: 30,
      calendar: 'lunar',
      isLeapMonth: false,
    })
    const solar = chartOf({ year: 1990, month: 5, day: 15, hour: 14, minute: 30 })
    expect(lunar.pillars.map((p) => p.korean)).toEqual(solar.pillars.map((p) => p.korean))
    expect(lunar.solar).toEqual({ year: 1990, month: 5, day: 15 })
  })

  it('음력으로 넣으면 양력 환산 안내가 붙는다', () => {
    const chart = chartOf({
      year: 1990,
      month: 4,
      day: 21,
      hour: 14,
      minute: 30,
      calendar: 'lunar',
    })
    expect(chart.notes.some((n) => n.includes('음력'))).toBe(true)
  })
})

describe('태어난 시각을 모를 때', () => {
  const chart = chartOf({ hour: null })

  it('시주를 빼고 세 기둥만 쓴다', () => {
    expect(chart.hourUnknown).toBe(true)
    expect(chart.pillars.map((p) => p.label)).toEqual(['연', '월', '일'])
  })

  it('오행도 여섯 글자로만 센다', () => {
    const total = Object.values(chart.elementCounts).reduce((a, b) => a + b, 0)
    expect(total).toBe(6)
  })

  it('안내 문구가 붙는다', () => {
    expect(chart.notes.some((n) => n.includes('시각'))).toBe(true)
  })
})

describe('잘못된 입력은 막는다', () => {
  it.each([
    ['존재하지 않는 날짜', { year: 2023, month: 2, day: 30 }],
    ['너무 이른 연도', { year: 1800, month: 1, day: 1 }],
    ['너무 늦은 연도', { year: 2200, month: 1, day: 1 }],
    ['없는 달', { month: 13 }],
    ['없는 날', { day: 32 }],
    ['없는 시각', { hour: 25 }],
    ['없는 분', { minute: 99 }],
    ['한반도 밖 경도', { longitude: 100 }],
  ])('%s 은 거부한다', (_label, over) => {
    expect(() => buildChart(validateInput({ ...input({}), ...over }), NOW)).toThrow()
  })

  it('오류 메시지가 한국어로 나온다', () => {
    expect(() => validateInput({ ...input({}), year: 1800 })).toThrow(/연도/)
  })
})
