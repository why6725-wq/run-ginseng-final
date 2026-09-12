/**
 * 궁합 해석 프롬프트.
 *
 * 한 사람 풀이와 같은 원칙을 따른다. 계산은 코드가 끝내고, AI 는 읽고 풀기만 한다.
 *
 * 궁합에는 한 사람 풀이에 없는 위험이 하나 더 있다.
 * "이 사람과는 안 된다" 같은 말이 실제 관계를 흔들 수 있다는 점이다.
 * 그래서 점수가 낮아도 관계를 부정하지 말고, 무엇을 조심하면 되는지로 풀게 한다.
 */

import type { SajuChart } from './saju'
import type { Analysis } from './analysis'
import type { Compatibility } from './compat'
import { tenGodHanja } from './saju'
import { termsForPrompt } from './terms'

/** 궁합 해석 항목. 화면의 카드 순서와 같다. */
export const COMPAT_SECTIONS = [
  { id: 'overall', title: '총평', hint: '두 분의 관계를 한마디로 요약하고 점수의 뜻을 풀이' },
  { id: 'attraction', title: '서로에게 끌리는 점', hint: '무엇이 두 사람을 끌어당기는지, 첫인상과 초반의 모습' },
  { id: 'strength', title: '함께할 때의 강점', hint: '둘이 만나 더 잘되는 부분, 서로 채워주는 대목' },
  { id: 'friction', title: '부딪치기 쉬운 지점', hint: '갈등이 생기는 자리와 그 이유. 겁주지 말고 구조로 설명' },
  { id: 'advice', title: '오래가려면', hint: '구체적이고 실천할 수 있는 조언. 각자에게 한 가지씩' },
] as const

export const COMPAT_SYSTEM_PROMPT = `당신은 한국 전통 명리학(사주팔자)에 정통한 상담가입니다.
지금은 두 분의 궁합을 봐 드리고 있습니다.

# 절대 규칙
1. 두 분의 사주와 궁합 계산은 이미 끝나 사용자 메시지로 주어집니다. 당신은 해석만 합니다.
   간지, 점수, 나이를 절대 스스로 계산하거나 고쳐 쓰지 마십시오.
   주어진 표에 없는 글자를 지어내지 마십시오.
2. 주어진 궁합 점수와 판정을 뒤집지 마십시오. 다만 점수는 참고일 뿐이며 궁합은 유파마다
   기준이 다르다는 점을 총평에서 한 번 짚어 주십시오.
3. 관계를 부정하지 마십시오. 점수가 낮아도 "맞지 않는다", "헤어져야 한다",
   "만나면 안 된다" 같은 말을 절대 쓰지 마십시오. 사주는 두 사람이 어떤 구조로
   만나는지를 보여줄 뿐, 관계의 성패를 정하지 않습니다.
   낮은 점수는 "이런 부분을 의식하면 훨씬 편해집니다"로 풀어 주십시오.
4. 한쪽을 탓하지 마십시오. 어느 한 사람의 사주가 문제라는 식으로 쓰지 말고,
   두 기운이 만나 생기는 구조로 설명하십시오.
5. 명리 용어는 쓰되 처음 나올 때 쉬운 말로 풀어 주십시오.
6. 단정적인 예언을 하지 마십시오. "~합니다" 대신 "~한 경향이 있습니다",
   "~하기 쉽습니다"처럼 흐름을 말하는 어조를 쓰십시오.
7. 결혼, 출산, 이별의 시기나 여부를 단정하지 마십시오.
   성 역할에 대한 낡은 고정관념을 쓰지 마십시오. 두 분의 관계가 어떤 형태인지
   (연인, 부부, 동업, 가족, 친구) 주어지지 않았다면 특정 관계를 전제하지 말고
   두루 통하는 말로 쓰십시오.

# 문체
- 존댓말로, 상담하듯 따뜻하고 차분하게 씁니다.
- 한 문단은 세 문장 안팎으로 짧게 끊습니다.
- 근거를 밝힙니다. "두 분의 일지가 충이라" 처럼 어느 대목을 보고 말하는지 드러냅니다.
- 두 분을 부를 때는 주어진 이름을 그대로 씁니다. 이름이 없으면 '첫째 분', '둘째 분'으로 씁니다.

# 출력 형식
- 지정된 항목을 지정된 순서대로 씁니다.
- 각 항목은 "## 항목이름" 한 줄로 시작합니다. 다른 제목 형식을 쓰지 마십시오.
- 항목마다 3~4개 문단을 씁니다. 표나 목록 대신 이어지는 글로 씁니다.
- 서론이나 맺음말을 따로 붙이지 마십시오. 첫 줄부터 바로 "## 총평"으로 시작합니다.

# 명리 용어 사전
${termsForPrompt()}`

/** 한 사람의 사주를 궁합용으로 간추린다. 한 사람 풀이보다 짧게 담는다. */
function personToText(
  label: string,
  name: string | null,
  chart: SajuChart,
  analysis: Analysis,
): string {
  const who = name ? `${name} (${label})` : label
  const lines: string[] = [`## ${who}`]

  lines.push(
    `- 생년월일: 양력 ${chart.solar.year}년 ${chart.solar.month}월 ${chart.solar.day}일` +
      (chart.hourUnknown
        ? ' (태어난 시각 모름 — 시주 없음)'
        : ` ${String(chart.input.hour).padStart(2, '0')}시 ${String(chart.input.minute).padStart(2, '0')}분`),
  )
  lines.push(`- 성별: ${chart.input.gender === 'male' ? '남성' : '여성'} / 만 ${chart.age}세`)

  for (const p of chart.pillars) {
    lines.push(
      `- ${p.labelFull}: ${p.korean}(${p.hanja})` +
        ` / 천간 ${p.stem}=${p.stemElement}, 십신 ${p.stemTenGod}(${tenGodHanja(p.stemTenGod)})` +
        ` / 지지 ${p.branch}=${p.branchElement}, 십신 ${p.branchTenGod}(${tenGodHanja(p.branchTenGod)})`,
    )
  }

  lines.push(
    `- 일간: ${chart.dayMaster.stem}(${chart.dayMaster.hanja}) ${chart.dayMaster.yinYang}${chart.dayMaster.element}`,
  )
  lines.push(
    `- 오행: ${Object.entries(chart.elementCounts)
      .map(([el, n]) => `${el} ${n}`)
      .join(', ')}` +
      (chart.missingElements.length > 0 ? ` / 없는 오행: ${chart.missingElements.join(', ')}` : ''),
  )
  lines.push(
    `- 신강신약: ${analysis.strength.verdict} (${analysis.strength.score}점)` +
      ` / 득령 ${analysis.strength.hasSeason ? 'O' : 'X'}, 득지 ${analysis.strength.hasGround ? 'O' : 'X'}`,
  )
  lines.push(
    `- 용신(이로운 오행): ${analysis.yongsin.favorable.join(', ')}` +
      ` / 기신(부담되는 오행): ${analysis.yongsin.unfavorable.join(', ') || '뚜렷하지 않음'}`,
  )
  if (analysis.yongsin.missingFavorable.length > 0) {
    lines.push(`- 용신 중 원국에 없는 것: ${analysis.yongsin.missingFavorable.join(', ')}`)
  }
  if (chart.currentLuck) {
    lines.push(
      `- 지금 대운: ${chart.currentLuck.age}세부터 ${chart.currentLuck.korean}` +
        ` (${chart.currentLuck.stemTenGod}/${chart.currentLuck.branchTenGod})`,
    )
  }

  return lines.join('\n')
}

export interface CompatPromptInput {
  a: { name: string | null; chart: SajuChart; analysis: Analysis }
  b: { name: string | null; chart: SajuChart; analysis: Analysis }
  compatibility: Compatibility
  /** 두 분의 관계. 입력받지 않으면 null */
  relation: string | null
}

/** 궁합 계산 결과를 Claude 가 읽을 텍스트로 바꾼다. */
export function compatToText(input: CompatPromptInput): string {
  const { a, b, compatibility, relation } = input
  const lines: string[] = ['# 두 분의 사주와 궁합 (이미 계산된 값입니다. 그대로 사용하십시오)']

  if (relation) lines.push('', `두 분의 관계: ${relation}`)

  lines.push('', personToText('첫째 분', a.name, a.chart, a.analysis))
  lines.push('', personToText('둘째 분', b.name, b.chart, b.analysis))

  lines.push('', '## 궁합 점수')
  lines.push(`- 총점: ${compatibility.score}점 / 100점 — ${compatibility.verdict}`)
  lines.push('- 대목별 점수와 근거:')
  for (const sec of compatibility.sections) {
    lines.push(`  - ${sec.title}: ${sec.score} / ${sec.max}점`)
    for (const item of sec.items) {
      const sign = item.score >= 0 ? '+' : ''
      lines.push(`    - (${sign}${item.score}) ${item.title} — ${item.note}`)
    }
  }

  lines.push('', '## 서로 채워주는 기운')
  if (compatibility.fills.aNeedsFromB.length > 0) {
    lines.push(
      `- 첫째 분에게 이로운 ${compatibility.fills.aNeedsFromB.join(', ')} 기운을 둘째 분이 갖고 있습니다.`,
    )
  }
  if (compatibility.fills.bNeedsFromA.length > 0) {
    lines.push(
      `- 둘째 분에게 이로운 ${compatibility.fills.bNeedsFromA.join(', ')} 기운을 첫째 분이 갖고 있습니다.`,
    )
  }
  if (
    compatibility.fills.aNeedsFromB.length === 0 &&
    compatibility.fills.bNeedsFromA.length === 0
  ) {
    lines.push('- 서로의 부족한 기운을 크게 채워주는 관계는 아닙니다.')
  }

  return lines.join('\n')
}

/** 최종 사용자 메시지를 만든다. */
export function buildCompatPrompt(input: CompatPromptInput): string {
  const sectionList = COMPAT_SECTIONS.map((s, i) => `${i + 1}. ## ${s.title} — ${s.hint}`).join(
    '\n',
  )

  const hourNote =
    input.a.chart.hourUnknown || input.b.chart.hourUnknown
      ? '\n한 분 이상이 태어난 시각을 모릅니다. 시주가 필요한 대목은 단정하지 말고, 알 수 있는 범위에서만 말씀해 주십시오.\n'
      : ''

  return `${compatToText(input)}

---

위 두 사주와 궁합 계산을 아래 항목 순서대로 풀어 주십시오.

${sectionList}
${hourNote}
첫 줄부터 바로 "## 총평"으로 시작하십시오.`
}

/** 이름 입력을 다듬는다. 비어 있으면 null */
export function validateName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const n = raw.trim().slice(0, 20)
  return n.length > 0 ? n : null
}

/** 관계 입력을 다듬는다 */
export function validateRelation(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const r = raw.trim().slice(0, 20)
  return r.length > 0 ? r : null
}
