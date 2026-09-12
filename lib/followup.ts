/**
 * 해석을 읽고 난 뒤의 후속 질문.
 *
 * 아홉 항목을 읽다 보면 자연히 묻고 싶은 게 생긴다.
 * "이직은 언제가 좋을까", "올해 조심할 게 있나" 같은 것들이다.
 *
 * 핵심은 이미 계산된 사주와 방금 읽은 해석을 그대로 문맥에 얹는 것이다.
 * 그래야 앞서 읽은 내용과 어긋나지 않는다. 앞에서는 신강이라고 해놓고
 * 후속 답변에서 신약처럼 말하면 신뢰가 통째로 무너진다.
 */

import type { SajuChart } from './saju'
import { chartToText } from './prompt'
import { termsForPrompt } from './terms'
import { analyze } from './analysis'

/** 질문 한 개의 길이 제한 */
export const MAX_QUESTION_LENGTH = 500

/** 문맥으로 실어 보낼 지난 문답의 최대 개수 */
export const MAX_HISTORY = 8

export interface QnaTurn {
  question: string
  answer: string
}

export const FOLLOWUP_SYSTEM_PROMPT = `당신은 한국 전통 명리학(사주팔자)에 정통한 상담가입니다.
방금 사주 풀이를 마쳤고, 지금은 그 풀이를 읽은 분의 추가 질문에 답하고 있습니다.

# 절대 규칙
1. 사주팔자는 이미 계산되어 주어집니다. 간지, 날짜, 나이, 대운 수치를 절대 스스로
   계산하거나 고쳐 쓰지 마십시오. 주어진 표에 없는 글자를 지어내지 마십시오.
2. 앞서 드린 풀이와 어긋나는 말을 하지 마십시오. 신강신약 판정과 용신은 이미 정해졌으니
   그것을 뒤집지 말고, 그 위에서 질문에 답하십시오.
3. 명리 용어는 쓰되 처음 나올 때 쉬운 말로 풀어 주십시오. 앞선 풀이에서 이미 설명한
   용어는 다시 설명하지 않아도 됩니다.
4. 단정적인 예언을 하지 마십시오. "~합니다" 대신 "~한 경향이 있습니다",
   "~하기 쉽습니다"처럼 기질과 흐름을 말하는 어조를 쓰십시오.
5. 건강은 생활 습관 조언까지만 합니다. 진단이나 치료를 말하지 마십시오.
   수명, 죽음, 질병의 확정적 예측, 임신 가능 여부는 다루지 마십시오.
6. 신살로 겁주지 마십시오. 흉살은 조심할 성질로, 길성은 살릴 강점으로 풀어 주십시오.
7. 성 역할에 대한 낡은 고정관념을 쓰지 마십시오.

# 사주로 답할 수 없는 질문
로또 번호, 시험 정답, 특정인의 속마음, 주가처럼 사주로 알 수 없는 것을 물으면
그 점을 솔직히 말하고, 대신 사주로 볼 수 있는 가까운 것을 제안하십시오.
예: "번호를 짚어드릴 수는 없습니다. 다만 재물이 들어오는 방식이라면 말씀드릴 수 있습니다."

사주와 전혀 무관한 질문(날씨, 코딩, 번역 등)에는 이 자리에서 다룰 내용이 아니라고
짧게 answer 하고, 사주에 대해 궁금한 점을 물어달라고 안내하십시오.

# 답변 형식
- 존댓말로, 상담하듯 따뜻하고 차분하게 씁니다.
- 2~4개 문단으로 짧게 답합니다. 제목("##")이나 목록을 쓰지 마십시오.
- 근거를 밝힙니다. "일지가 상관이라" 처럼 표의 어느 글자를 보고 말하는지 드러냅니다.
- 질문에 곧바로 답합니다. 인사말이나 "좋은 질문입니다" 같은 서두를 붙이지 마십시오.

# 명리 용어 사전
${termsForPrompt()}`

/**
 * 후속 질문용 메시지를 만든다.
 *
 * 계산된 사주 + 방금 읽은 해석 + 지난 문답 + 이번 질문 순서로 쌓는다.
 */
export function buildFollowupPrompt(opts: {
  chart: SajuChart
  /** 앞서 보여준 아홉 항목 해석 전문 */
  interpretation: string
  /** 지난 문답. 오래된 것부터 */
  history: QnaTurn[]
  question: string
}): string {
  const { chart, interpretation, history, question } = opts

  const parts: string[] = [chartToText(chart)]

  if (interpretation.trim()) {
    parts.push(
      '',
      '---',
      '',
      '# 앞서 이분께 드린 풀이',
      '아래 내용을 이미 읽으셨습니다. 여기서 한 말과 어긋나지 않게 답해 주십시오.',
      '',
      interpretation.trim(),
    )
  }

  const recent = history.slice(-MAX_HISTORY)
  if (recent.length > 0) {
    parts.push('', '---', '', '# 지금까지의 문답')
    for (const t of recent) {
      parts.push('', `질문: ${t.question}`, `답변: ${t.answer}`)
    }
  }

  parts.push(
    '',
    '---',
    '',
    '# 이번 질문',
    question.trim(),
    '',
    '위 사주와 풀이를 바탕으로 답해 주십시오. 제목 없이 2~4개 문단으로 씁니다.',
  )

  return parts.join('\n')
}

/**
 * 무엇을 물어야 할지 모르는 분을 위해 질문 보기를 만든다.
 *
 * 사주마다 눈에 띄는 대목이 달라, 일부는 계산 결과를 보고 맞춤으로 만든다.
 */
export function suggestQuestions(chart: SajuChart): string[] {
  const out: string[] = []
  const analysis = analyze(chart)

  // 원국에 없는 용신이 있으면 그걸 어떻게 채우는지가 가장 실용적인 질문이다
  if (analysis.yongsin.missingFavorable.length > 0) {
    const el = analysis.yongsin.missingFavorable[0]
    out.push(`제게 필요한 ${el} 기운은 어떻게 채우면 좋을까요?`)
  }

  // 지금 대운이 있으면 그 시기의 의미를 묻는 것이 자연스럽다
  if (chart.currentLuck) {
    out.push(`지금 지나는 ${chart.currentLuck.korean} 대운은 어떤 시기인가요?`)
  }

  // 충이 있으면 그 자리가 뜻하는 변동을 묻게 된다
  const clash = analysis.relations.find((r) => r.kind === '충' || r.kind === '천간충')
  if (clash) {
    out.push(`${clash.name}이 있다는데 실제로 어떤 영향이 있나요?`)
  }

  // 어떤 사주에든 통하는 질문들
  out.push(
    '저한테 맞는 일은 어떤 쪽인가요?',
    '올해 특별히 조심할 점이 있을까요?',
    '사람들과 지낼 때 제가 놓치기 쉬운 부분은 뭘까요?',
    '돈 관리에서 신경 쓸 점을 알려주세요.',
  )

  return out.slice(0, 6)
}

/** 질문이 쓸 만한지 검사한다 */
export function validateQuestion(raw: unknown): string {
  if (typeof raw !== 'string') throw new Error('질문을 입력해 주세요.')
  const q = raw.trim()
  if (q.length === 0) throw new Error('질문을 입력해 주세요.')
  if (q.length > MAX_QUESTION_LENGTH) {
    throw new Error(`질문은 ${MAX_QUESTION_LENGTH}자 안으로 써 주세요.`)
  }
  return q
}

/** 지난 문답이 형식에 맞는지 검사한다 */
export function validateHistory(raw: unknown): QnaTurn[] {
  if (!Array.isArray(raw)) return []
  const out: QnaTurn[] = []
  for (const t of raw.slice(-MAX_HISTORY)) {
    if (
      t &&
      typeof t.question === 'string' &&
      typeof t.answer === 'string' &&
      t.question.trim() &&
      t.answer.trim()
    ) {
      out.push({
        question: t.question.slice(0, MAX_QUESTION_LENGTH),
        answer: t.answer.slice(0, 8000),
      })
    }
  }
  return out
}
