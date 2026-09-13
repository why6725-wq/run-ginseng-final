/**
 * AI 프롬프트 구성 시험.
 *
 * 계산은 맞는데 프롬프트에 빠뜨리면 AI 는 그 항목을 못 본 채 글을 쓴다.
 * 화면에는 멀쩡히 뜨는데 해석만 엉성해지므로 알아채기 어렵다.
 * 계산한 값이 실제로 프롬프트에 실려 나가는지 확인한다.
 */

import { describe, it, expect } from 'vitest'
import { SECTIONS, SYSTEM_PROMPT, buildUserPrompt, chartToText } from '../lib/prompt'
import { ALL_TERMS } from '../lib/terms'
import { chartOf, GOLDEN_INPUT } from './fixtures'

const chart = chartOf(GOLDEN_INPUT)
const prompt = buildUserPrompt(chart)

describe('해석 항목', () => {
  it('아홉 항목이 요청한 순서대로 들어 있다', () => {
    expect(SECTIONS.map((s) => s.title)).toEqual([
      '총평',
      '성격',
      '직업운',
      '재물운',
      '연애운',
      '결혼운',
      '건강',
      '대운 흐름',
      '올해 운세',
    ])
  })

  it('모든 항목이 프롬프트에 실린다', () => {
    for (const s of SECTIONS) {
      expect(prompt, s.title).toContain(`## ${s.title}`)
      expect(prompt, s.title).toContain(s.hint)
    }
  })

  it('총평부터 쓰라고 못박는다', () => {
    expect(prompt).toContain('첫 줄부터 바로 "## 총평"으로 시작하십시오')
  })
})

describe('계산 결과가 빠짐없이 실린다', () => {
  const text = chartToText(chart)

  it('팔자 여덟 글자', () => {
    for (const p of chart.pillars) {
      expect(text, p.labelFull).toContain(p.korean)
      expect(text, p.labelFull).toContain(p.hanja)
    }
  })

  it('지장간', () => {
    expect(text).toContain('무병갑')
    expect(text).toContain('임계')
  })

  it('신강신약 점수와 자리별 배점 근거', () => {
    expect(text).toContain('신강 (71점')
    expect(text).toContain('월지 신(申) 금 비견(비겁) / 배점 32 중 26점')
  })

  it('용신과 조후', () => {
    expect(text).toContain('이로운 오행: 수, 목, 화')
    expect(text).toContain('조후 참고')
  })

  it('합충', () => {
    expect(text).toContain('신자진삼합')
    expect(text).toContain('인신충')
  })

  it('12운성과 12신살', () => {
    expect(text).toContain('12운성 건록')
    expect(text).toContain('12신살 역마')
  })

  it('신살은 길성·흉살 구분과 근거를 달고 나간다', () => {
    expect(text).toContain('태극귀인 (길성, 일간 경 기준)')
    expect(text).toContain('괴강살 (흉살, 시주가 경진)')
  })

  it('공망 두 기준', () => {
    expect(text).toContain('일주 기준: 진, 사')
    expect(text).toContain('연주 기준: 신, 유')
  })

  it('대운·세운·월운', () => {
    expect(text).toContain('24세부터')
    expect(text).toContain('2026년: 병오')
    expect(text).toContain('9월: 정유')
    expect(text).toContain('<== 이번 달')
  })

  it('조사가 어긋난 문장이 없다', () => {
    // '토이', '수을', '화이' 같은 잘못된 조합이 나오면 안 된다
    for (const bad of ['토이 ', '수을 ', '화이 ', '화을 ', '수이 ', '목가 ', '금가 ']) {
      expect(text, bad.trim()).not.toContain(bad)
    }
  })
})

describe('AI 에게 계산을 시키지 않는다', () => {
  it('주어진 값을 고치지 말라고 못박는다', () => {
    expect(SYSTEM_PROMPT).toContain('스스로 계산하거나 고쳐 쓰지 마십시오')
    expect(SYSTEM_PROMPT).toContain('표에 없는 글자를 지어내지 마십시오')
  })

  it('신강신약과 용신을 뼈대로 삼으라고 지시한다', () => {
    expect(SYSTEM_PROMPT).toContain('해석의 뼈대는 신강신약과 용신')
    expect(SYSTEM_PROMPT).toContain('주어진 점수와 판정을')
  })

  it('신살로 겁주지 말라고 지시한다', () => {
    expect(SYSTEM_PROMPT).toContain('겁주는 말투')
    expect(SYSTEM_PROMPT).toContain('참고 항목')
  })

  it('단정적인 예언과 의료 판단을 금지한다', () => {
    expect(SYSTEM_PROMPT).toContain('단정적인 예언을 하지 마십시오')
    expect(SYSTEM_PROMPT).toContain('진단이나 치료를 말하지 마십시오')
  })
})

describe('용어 사전', () => {
  it('사전 전체가 프롬프트에 실린다', () => {
    for (const name of ['비견', '정관', '용신', '신강', '삼합', '지장간']) {
      expect(SYSTEM_PROMPT, name).toContain(name)
    }
  })

  it('모든 용어에 한자와 두 가지 설명이 있다', () => {
    for (const [name, entry] of Object.entries(ALL_TERMS)) {
      expect(entry.hanja, name).toBeTruthy()
      expect(entry.short, name).toBeTruthy()
      expect(entry.long.length, name).toBeGreaterThan(20)
    }
  })

  it('화면에서 쓰는 십신 이름이 모두 사전에 있다', () => {
    for (const p of chart.pillars) {
      if (p.stemTenGod !== '일간') expect(ALL_TERMS, p.stemTenGod).toHaveProperty(p.stemTenGod)
      expect(ALL_TERMS, p.branchTenGod).toHaveProperty(p.branchTenGod)
    }
  })
})

describe('시각을 모르는 사주', () => {
  it('시주 없이 해석하라는 안내가 붙는다', () => {
    const p = buildUserPrompt(chartOf({ ...GOLDEN_INPUT, hour: null }))
    expect(p).toContain('태어난 시각을 모르는 사주입니다')
    expect(p).toContain('시주 없음')
  })
})
