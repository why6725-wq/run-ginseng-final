/**
 * 유형 별명·오늘의 운세·카드 파싱 시험.
 *
 * 첫 화면에 뜨는 것들이라 여기가 깨지면 바로 눈에 띄지만,
 * "왜 이 별명이 나왔는지"가 흔들리면 알아채기 어렵다.
 * 같은 사주면 언제나 같은 결과가 나오는지를 중점적으로 본다.
 */

import { describe, it, expect } from 'vitest'
import { HEAVENLY_STEMS } from 'manseryeok'
import { buildPersona, elementGradient } from '../lib/persona'
import { buildTodayFortune, kstDateString } from '../lib/today'
import { parseBriefCards, BRIEF_SECTIONS, BRIEF_SYSTEM_PROMPT, TODAY_SYSTEM_PROMPT } from '../lib/brief'
import { analyze } from '../lib/analysis'
import { chartOf, GOLDEN_INPUT, NOW } from './fixtures'

const chart = chartOf(GOLDEN_INPUT)
const analysis = analyze(chart)

describe('유형 별명', () => {
  const persona = buildPersona(chart, analysis)

  it('기준 사주는 신강한 경금이라 벼려진 무쇠가 된다', () => {
    expect(chart.dayMaster.stem).toBe('경')
    expect(analysis.strength.verdict).toBe('신강')
    expect(persona.title).toBe('벼려진 무쇠')
    expect(persona.subtitle).toBe('기준을 세우는 사람')
  })

  it('같은 사주면 언제나 같은 별명이 나온다', () => {
    const again = buildPersona(chartOf(GOLDEN_INPUT), analyze(chartOf(GOLDEN_INPUT)))
    expect(again.title).toBe(persona.title)
    expect(again.keywords).toEqual(persona.keywords)
  })

  it('키워드가 하나 이상 여섯 이하로 나온다', () => {
    expect(persona.keywords.length).toBeGreaterThan(0)
    expect(persona.keywords.length).toBeLessThanOrEqual(6)
  })

  it('키워드에 중복이 없다', () => {
    expect(new Set(persona.keywords).size).toBe(persona.keywords.length)
  })

  it('일간 오행에 맞는 색을 쓴다', () => {
    expect(persona.element).toBe('금')
    expect(persona.gradient).toEqual(elementGradient('금'))
    expect(persona.gradient).toHaveLength(2)
  })

  it('천간 열 개 모두에 별명이 있다', () => {
    const missing: string[] = []
    for (let y = 1950; y <= 2020; y += 1) {
      const c = chartOf({ year: y, month: (y % 12) + 1, day: 10, hour: (y % 24), minute: 0 })
      const p = buildPersona(c, analyze(c))
      if (!p.title || !p.subtitle || !p.line) missing.push(`${y}`)
    }
    expect(missing).toEqual([])
  })

  it('열 천간이 모두 별명을 갖는지 직접 확인한다', () => {
    const seen = new Set<string>()
    for (let y = 1950; y <= 2020; y += 1) {
      for (const d of [3, 14, 25]) {
        const c = chartOf({ year: y, month: 6, day: d, hour: 12, minute: 0 })
        seen.add(c.dayMaster.stem)
      }
    }
    // 위 범위면 열 천간이 모두 나온다
    expect([...seen].sort()).toEqual([...HEAVENLY_STEMS].sort())
  })

  it('시각을 모르는 사주에서도 나온다', () => {
    const c = chartOf({ ...GOLDEN_INPUT, hour: null })
    const p = buildPersona(c, analyze(c))
    expect(p.title).toBeTruthy()
    expect(p.keywords.length).toBeGreaterThan(0)
  })
})

describe('오늘의 운세', () => {
  const fortune = buildTodayFortune(chart, analysis, NOW)

  it('한국 날짜로 잡힌다', () => {
    expect(fortune.date).toBe(kstDateString(NOW))
    expect(fortune.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('점수가 5에서 95 사이다', () => {
    expect(fortune.score).toBeGreaterThanOrEqual(5)
    expect(fortune.score).toBeLessThanOrEqual(95)
  })

  it('같은 사람 같은 날이면 언제 봐도 같은 값이다', () => {
    const again = buildTodayFortune(chart, analysis, NOW)
    expect(again.score).toBe(fortune.score)
    expect(again.dayPillar.korean).toBe(fortune.dayPillar.korean)
    expect(again.reasons.map((r) => r.label)).toEqual(fortune.reasons.map((r) => r.label))
  })

  it('날이 바뀌면 일진이 바뀐다', () => {
    const tomorrow = new Date(NOW.getTime() + 24 * 60 * 60 * 1000)
    const t = buildTodayFortune(chart, analysis, tomorrow)
    expect(t.date).not.toBe(fortune.date)
    expect(t.dayPillar.korean).not.toBe(fortune.dayPillar.korean)
  })

  it('점수가 어떻게 나왔는지 근거를 함께 준다', () => {
    expect(fortune.reasons.length).toBeGreaterThan(0)
    for (const r of fortune.reasons) {
      expect(r.label).toBeTruthy()
      expect(r.note).toBeTruthy()
      expect(['good', 'caution', 'neutral']).toContain(r.tone)
    }
  })

  it('한 해 동안 매일 계산해도 터지지 않는다', () => {
    const errors: string[] = []
    for (let i = 0; i < 365; i += 1) {
      const d = new Date(NOW.getTime() + i * 24 * 60 * 60 * 1000)
      try {
        const f = buildTodayFortune(chart, analysis, d)
        if (f.score < 5 || f.score > 95) errors.push(`${f.date}: ${f.score}`)
      } catch (e) {
        errors.push(`${i}일 뒤: ${(e as Error).message}`)
      }
    }
    expect(errors).toEqual([])
  })

  it('한 해 동안 점수가 한 값에 고정되지 않는다', () => {
    const scores = new Set<number>()
    for (let i = 0; i < 60; i += 1) {
      const d = new Date(NOW.getTime() + i * 24 * 60 * 60 * 1000)
      scores.add(buildTodayFortune(chart, analysis, d).score)
    }
    expect(scores.size).toBeGreaterThan(3)
  })

  it('조사가 어긋난 문장이 없다', () => {
    // 받침이 없는데 '이', 받침이 있는데 '가' 를 붙인 자리를 찾는다.
    // 제목 줄에도 천간·지지 글자가 그대로 들어가므로 함께 본다.
    const bad = [
      '토이 ', '수을 ', '화이 ', '화을 ', '수이 ', '목가 ', '금가 ',
      // 천간 — 받침 없는 글자에 '이/과', 받침 있는 글자에 '가/와'
      '계이 ', '계과 ', '기이 ', '기과 ', '무이 ', '무과 ', '병이 ', '병과 ',
      '정이 ', '정와 ', '신이 ', '신와 ', '경이 ', '경와 ', '임이 ', '임와 ',
      // 지지 — 받침 없는 글자
      '사이 ', '오이 ', '자이 ', '미이 ', '유이 ', '해이 ', '묘이 ', '축가 ', '진가 ', '술가 ',
    ]
    for (let i = 0; i < 400; i += 1) {
      const d = new Date(NOW.getTime() + i * 24 * 60 * 60 * 1000)
      const f = buildTodayFortune(chart, analysis, d)
      const all = f.reasons.map((r) => `${r.label} ${r.note}`).join(' ')
      for (const b of bad) {
        expect(all.includes(b), `${f.date} 에 "${b.trim()}"`).toBe(false)
      }
    }
  })
})

describe('카드 파싱', () => {
  const sample = `## 나는 이런 사람
키워드: 원칙, 독립, 직설
단단하고 기준이 분명합니다. 한번 정하면 잘 굽히지 않습니다.

## 일과 적성
키워드: 전문성, 경쟁, 결단
경쟁이 치열한 자리에서 힘이 납니다.`

  it('카드로 나눈다', () => {
    const cards = parseBriefCards(sample)
    expect(cards).toHaveLength(2)
    expect(cards[0].title).toBe('나는 이런 사람')
    expect(cards[1].title).toBe('일과 적성')
  })

  it('키워드 줄을 본문과 갈라낸다', () => {
    const cards = parseBriefCards(sample)
    expect(cards[0].keywords).toEqual(['원칙', '독립', '직설'])
    expect(cards[0].body).not.toContain('키워드')
    expect(cards[0].body).toContain('단단하고')
  })

  it('아직 덜 온 글도 최대한 살려 쓴다', () => {
    const partial = '## 나는 이런 사람\n키워드: 원칙, 독립\n단단하'
    const cards = parseBriefCards(partial)
    expect(cards).toHaveLength(1)
    expect(cards[0].keywords).toEqual(['원칙', '독립'])
    expect(cards[0].body).toBe('단단하')
  })

  it('제목만 있고 내용이 없어도 터지지 않는다', () => {
    expect(parseBriefCards('## 돈')).toEqual([{ title: '돈', keywords: [], body: '' }])
    expect(parseBriefCards('')).toEqual([])
  })

  it('해시 기호가 붙은 키워드도 벗겨낸다', () => {
    const cards = parseBriefCards('## 돈\n키워드: #저축, #투자\n본문')
    expect(cards[0].keywords).toEqual(['저축', '투자'])
  })
})

describe('카드 지시문', () => {
  it('여섯 카드를 정해두었다', () => {
    expect(BRIEF_SECTIONS.map((s) => s.title)).toEqual([
      '나는 이런 사람',
      '일과 적성',
      '돈',
      '사랑',
      '몸과 마음',
      '올해',
    ])
  })

  it('표를 해설하지 말라고 못박는다', () => {
    // 처음 지시문은 이 말이 없어서, 카드마다 "일지 상관이라…" 하고
    // 명리 용어로 시작하는 표 해설이 나왔다. 남 얘기처럼 읽히는 가장 큰 원인이었다.
    expect(BRIEF_SYSTEM_PROMPT).toContain('표를 해설하지 마십시오')
    expect(BRIEF_SYSTEM_PROMPT).toContain('명리 근거는 맨 뒤에')
  })

  it('나쁜 예와 좋은 예를 함께 보여준다', () => {
    // 말로만 "쉽게 쓰라"고 하면 안 먹힌다. 견본을 붙여야 바뀐다.
    expect(BRIEF_SYSTEM_PROMPT).toContain('나쁜 예')
    expect(BRIEF_SYSTEM_PROMPT).toContain('좋은 예')
  })

  it('성격 딱지 대신 구체적인 장면을 요구한다', () => {
    expect(BRIEF_SYSTEM_PROMPT).toContain('적중감')
    expect(BRIEF_SYSTEM_PROMPT).toContain('행동으로 쓰십시오')
  })

  it('명리 용어를 한 카드에 한 번으로 제한한다', () => {
    expect(BRIEF_SYSTEM_PROMPT).toContain('한 카드에 한 번까지만')
  })

  it('지어내는 것은 여전히 막는다', () => {
    // 적중감을 노리다 없는 말을 지어내면 그게 더 나쁘다
    expect(BRIEF_SYSTEM_PROMPT).toContain('아무 말이나 지어내지 마십시오')
    expect(BRIEF_SYSTEM_PROMPT).toContain('뒤집지 마십시오')
  })

  it('키워드 줄 형식을 정해둔다', () => {
    expect(BRIEF_SYSTEM_PROMPT).toContain('키워드: ')
  })

  it('오늘의 운세는 겁주지 말라고 못박는다', () => {
    expect(TODAY_SYSTEM_PROMPT).toContain('겁주지 마십시오')
    expect(TODAY_SYSTEM_PROMPT).toContain('오늘 하루를 망칠 말을 쓰면 안 됩니다')
    expect(TODAY_SYSTEM_PROMPT).toContain('예고하지 마십시오')
  })

  it('오늘의 운세는 주어진 점수와 결을 맞추라고 한다', () => {
    expect(TODAY_SYSTEM_PROMPT).toContain('어긋나는 말을 하지 마십시오')
  })
})
