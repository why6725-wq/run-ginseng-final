/**
 * 후속 질문 시험.
 *
 * 가장 중요한 건 앞서 읽은 풀이가 문맥에 실려 나가는지다.
 * 이게 빠지면 앞에서는 신강이라 해놓고 뒤에서는 신약처럼 말하는 일이 생긴다.
 * 화면은 멀쩡히 뜨는데 말이 어긋나서, 눈으로만 보면 알아채기 어렵다.
 */

import { describe, it, expect } from 'vitest'
import {
  FOLLOWUP_SYSTEM_PROMPT,
  MAX_HISTORY,
  MAX_QUESTION_LENGTH,
  buildFollowupPrompt,
  suggestQuestions,
  validateHistory,
  validateQuestion,
} from '../lib/followup'
import { chartOf, GOLDEN_INPUT } from './fixtures'

const chart = chartOf(GOLDEN_INPUT)

describe('후속 질문 프롬프트', () => {
  const prompt = buildFollowupPrompt({
    chart,
    interpretation: '## 총평\n\n이 사주는 신강한 편입니다.',
    history: [{ question: '직업은요?', answer: '조직 생활이 맞습니다.' }],
    question: '이직 시기는 언제가 좋을까요?',
  })

  it('계산된 사주가 실린다', () => {
    expect(prompt).toContain('경자')
    expect(prompt).toContain('신강 (73점')
    expect(prompt).toContain('이로운 오행: 수, 목, 화')
  })

  it('앞서 읽은 풀이가 실린다', () => {
    expect(prompt).toContain('앞서 이분께 드린 풀이')
    expect(prompt).toContain('이 사주는 신강한 편입니다')
    expect(prompt).toContain('어긋나지 않게')
  })

  it('지난 문답이 실린다', () => {
    expect(prompt).toContain('질문: 직업은요?')
    expect(prompt).toContain('답변: 조직 생활이 맞습니다.')
  })

  it('이번 질문이 맨 끝에 온다', () => {
    expect(prompt).toContain('# 이번 질문')
    expect(prompt.indexOf('이직 시기는')).toBeGreaterThan(prompt.indexOf('# 이번 질문'))
  })

  it('제목 없이 짧게 쓰라고 지시한다', () => {
    expect(prompt).toContain('제목 없이 2~4개 문단')
  })

  it('풀이가 없어도 사주만으로 동작한다', () => {
    const p = buildFollowupPrompt({
      chart,
      interpretation: '',
      history: [],
      question: '제 성격이 어떤가요?',
    })
    expect(p).toContain('경자')
    expect(p).not.toContain('앞서 이분께 드린 풀이')
    expect(p).toContain('제 성격이 어떤가요?')
  })

  it('지난 문답이 너무 많으면 최근 것만 싣는다', () => {
    const history = Array.from({ length: 20 }, (_, i) => ({
      question: `질문${i}`,
      answer: `답변${i}`,
    }))
    const p = buildFollowupPrompt({ chart, interpretation: '', history, question: '끝' })
    expect(p).not.toContain('질문0:')
    expect(p).toContain('질문19')
    const count = (p.match(/^질문: /gm) ?? []).length
    expect(count).toBe(MAX_HISTORY)
  })
})

describe('후속 질문 지시문', () => {
  it('앞선 풀이를 뒤집지 말라고 못박는다', () => {
    expect(FOLLOWUP_SYSTEM_PROMPT).toContain('어긋나는 말을 하지 마십시오')
    expect(FOLLOWUP_SYSTEM_PROMPT).toContain('신강신약 판정과 용신은 이미 정해졌으니')
  })

  it('스스로 계산하지 말라고 못박는다', () => {
    // 줄바꿈에 걸리지 않는 조각으로 확인한다
    expect(FOLLOWUP_SYSTEM_PROMPT).toContain('고쳐 쓰지 마십시오')
    expect(FOLLOWUP_SYSTEM_PROMPT).toContain('표에 없는 글자를 지어내지 마십시오')
  })

  it('사주로 알 수 없는 질문의 처리를 정해둔다', () => {
    expect(FOLLOWUP_SYSTEM_PROMPT).toContain('로또 번호')
    expect(FOLLOWUP_SYSTEM_PROMPT).toContain('솔직히 말하고')
  })

  it('안전 규칙을 그대로 이어받는다', () => {
    expect(FOLLOWUP_SYSTEM_PROMPT).toContain('단정적인 예언을 하지 마십시오')
    expect(FOLLOWUP_SYSTEM_PROMPT).toContain('진단이나 치료를 말하지 마십시오')
    expect(FOLLOWUP_SYSTEM_PROMPT).toContain('신살로 겁주지 마십시오')
  })

  it('용어 사전을 함께 넘긴다', () => {
    for (const t of ['비견', '용신', '신강']) {
      expect(FOLLOWUP_SYSTEM_PROMPT, t).toContain(t)
    }
  })
})

describe('질문 보기', () => {
  const suggestions = suggestQuestions(chart)

  it('여섯 개 이하로 준다', () => {
    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions.length).toBeLessThanOrEqual(6)
  })

  it('원국에 없는 용신을 짚는 질문이 들어간다', () => {
    // 기준 사주는 화가 용신인데 원국에 없다
    expect(suggestions.some((s) => s.includes('화 기운'))).toBe(true)
  })

  it('지금 대운을 짚는 질문이 들어간다', () => {
    expect(suggestions.some((s) => s.includes('정사'))).toBe(true)
  })

  it('충이 있으면 그걸 묻는 질문이 들어간다', () => {
    expect(suggestions.some((s) => s.includes('인신충'))).toBe(true)
  })

  it('중복이 없다', () => {
    expect(new Set(suggestions).size).toBe(suggestions.length)
  })

  it('어떤 사주에서도 질문이 나온다', () => {
    for (let y = 1950; y <= 2020; y += 6) {
      const s = suggestQuestions(chartOf({ year: y, month: 5, day: 5, hour: 5, minute: 0 }))
      expect(s.length, `${y}년생`).toBeGreaterThan(0)
      for (const q of s) expect(q.trim(), `${y}년생`).toBeTruthy()
    }
  })

  it('시각을 모르는 사주에서도 터지지 않는다', () => {
    expect(suggestQuestions(chartOf({ hour: null })).length).toBeGreaterThan(0)
  })
})

describe('입력 검증', () => {
  it('빈 질문은 막는다', () => {
    expect(() => validateQuestion('')).toThrow(/질문/)
    expect(() => validateQuestion('   ')).toThrow(/질문/)
    expect(() => validateQuestion(null)).toThrow(/질문/)
    expect(() => validateQuestion(123)).toThrow(/질문/)
  })

  it('너무 긴 질문은 막는다', () => {
    expect(() => validateQuestion('가'.repeat(MAX_QUESTION_LENGTH + 1))).toThrow(/자 안으로/)
  })

  it('앞뒤 공백을 다듬는다', () => {
    expect(validateQuestion('  제 직업운은요?  ')).toBe('제 직업운은요?')
  })

  it('형식이 어긋난 지난 문답은 걸러낸다', () => {
    expect(validateHistory(null)).toEqual([])
    expect(validateHistory('아무거나')).toEqual([])
    expect(
      validateHistory([
        { question: '좋은 질문', answer: '좋은 답' },
        { question: '', answer: '답만 있음' },
        { question: '질문만 있음', answer: '' },
        { nope: true },
        null,
      ]),
    ).toEqual([{ question: '좋은 질문', answer: '좋은 답' }])
  })

  it('지난 문답이 많으면 최근 것만 남긴다', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ question: `q${i}`, answer: `a${i}` }))
    const kept = validateHistory(many)
    expect(kept).toHaveLength(MAX_HISTORY)
    expect(kept[kept.length - 1].question).toBe('q29')
  })

  it('지나치게 긴 내용은 잘라낸다', () => {
    const kept = validateHistory([
      { question: '가'.repeat(1000), answer: '나'.repeat(20000) },
    ])
    expect(kept[0].question.length).toBe(MAX_QUESTION_LENGTH)
    expect(kept[0].answer.length).toBe(8000)
  })
})
