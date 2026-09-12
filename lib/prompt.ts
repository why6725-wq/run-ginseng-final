/**
 * AI 해석 프롬프트 구성.
 *
 * 핵심 원칙 두 가지.
 *  1. Claude 에게 계산을 시키지 않는다. 이미 계산된 사주를 "사실"로 못박아 넘긴다.
 *  2. 용어는 쓰되 반드시 풀어 쓰게 한다. 용어 정의를 같이 넘겨 표와 설명이 어긋나지 않게 한다.
 */

import type { SajuChart } from './saju'
import { tenGodHanja } from './saju'
import { analyze, hiddenStemsLabel } from './analysis'
import { josa } from './korean'
import { termsForPrompt } from './terms'

/** 해석 항목. 화면의 카드 순서와 같다. */
export const SECTIONS = [
  { id: 'overall', title: '총평', hint: '사주 전체의 큰 그림과 이 사람을 한마디로 요약' },
  { id: 'personality', title: '성격', hint: '타고난 기질, 강점과 약점, 사람들과 지내는 방식' },
  { id: 'career', title: '직업운', hint: '맞는 일의 성격, 조직 생활과 독립 중 어느 쪽인지, 적성 분야' },
  { id: 'wealth', title: '재물운', hint: '돈이 들어오고 나가는 방식, 저축과 투자 성향, 주의할 점' },
  { id: 'love', title: '연애운', hint: '연애할 때의 모습, 끌리는 상대, 반복되기 쉬운 패턴' },
  { id: 'marriage', title: '결혼운', hint: '배우자 자리로 본 인연의 모습, 결혼 생활에서 신경 쓸 부분, 시기' },
  { id: 'health', title: '건강', hint: '오행의 치우침으로 본 약한 부분과 생활 관리법' },
  { id: 'luck', title: '대운 흐름', hint: '10년 단위 큰 흐름, 지금 대운의 의미, 앞으로의 변화' },
  { id: 'year', title: '올해 운세', hint: '올해 세운이 내 사주와 만나 만드는 분위기와 조언' },
] as const

export type SectionId = (typeof SECTIONS)[number]['id']

export const SYSTEM_PROMPT = `당신은 한국 전통 명리학(사주팔자)에 정통한 상담가입니다.

# 절대 규칙
1. 사주팔자는 이미 정확히 계산되어 사용자 메시지로 주어집니다. 당신은 그 결과를 해석만 합니다.
   간지, 날짜, 나이, 대운 수치를 절대 스스로 계산하거나 고쳐 쓰지 마십시오.
   주어진 표에 없는 글자를 지어내지 마십시오.
2. 명리 용어는 적극적으로 사용하되, 처음 쓸 때 반드시 쉬운 말로 풀어 주십시오.
   예: "정관(正官), 나를 다스리는 규율의 기운입니다" 처럼 용어 뒤에 바로 설명을 붙입니다.
   같은 용어를 두 번째로 쓸 때는 설명을 반복하지 않습니다.
3. 용어 정의는 아래 사전을 따릅니다. 사전과 다른 뜻으로 쓰지 마십시오.
3-1. 해석의 뼈대는 신강신약과 용신입니다. 오행 개수만 세어 말하지 말고, 주어진 신강신약
   판정과 용신을 기준으로 모든 항목을 일관되게 풀어 주십시오. 주어진 점수와 판정을
   뒤집지 마십시오. 다만 신강신약은 유파마다 기준이 다르다는 점을 총평에서 한 번만
   짚어 주십시오.
3-2. 합충 관계가 주어졌다면 반드시 반영하십시오. 특히 삼합이나 방합이 있으면 글자 수만
   세었을 때와 실제 기운의 세기가 달라집니다. 충이나 형이 있으면 그 자리가 뜻하는
   영역에 변동이 있다는 뜻으로 읽어 주십시오.
4. 단정적인 예언을 하지 마십시오. "~합니다" 대신 "~한 경향이 있습니다", "~하기 쉽습니다"처럼
   기질과 흐름을 말하는 어조를 쓰십시오.
5. 건강은 생활 습관 조언까지만 합니다. 진단이나 치료를 말하지 마십시오.
   수명, 죽음, 질병의 확정적 예측, 임신 가능 여부는 다루지 마십시오.
6. 성별이나 결혼 여부를 두고 낡은 고정관념을 쓰지 마십시오. 배우자 자리를 해석할 때도
   특정 성 역할을 전제하지 말고, 관계의 성질로 설명하십시오.

# 문체
- 존댓말로, 상담하듯 따뜻하고 차분하게 씁니다.
- 한 문단은 세 문장 안팎으로 짧게 끊습니다.
- 좋은 점과 조심할 점을 함께 말합니다. 나쁜 말만 늘어놓거나 칭찬만 하지 않습니다.
- 근거를 밝힙니다. "월지가 편관이라" 처럼 표의 어느 글자를 보고 말하는지 드러냅니다.

# 출력 형식
- 지정된 항목을 지정된 순서대로 씁니다.
- 각 항목은 "## 항목이름" 한 줄로 시작합니다. 다른 제목 형식을 쓰지 마십시오.
- 항목마다 3~5개 문단을 씁니다. 표나 목록 대신 이어지는 글로 씁니다.
- 서론이나 맺음말을 따로 붙이지 마십시오. 첫 줄부터 바로 "## 총평"으로 시작합니다.

# 명리 용어 사전
${termsForPrompt()}`

/** 사주 계산 결과를 Claude 가 읽을 텍스트로 바꾼다. */
export function chartToText(chart: SajuChart): string {
  const lines: string[] = []

  const genderLabel = chart.input.gender === 'male' ? '남성' : '여성'
  lines.push('# 계산된 사주 (이미 검증된 값입니다. 그대로 사용하십시오)')
  lines.push('')
  lines.push('## 기본 정보')
  lines.push(
    `- 생년월일: 양력 ${chart.solar.year}년 ${chart.solar.month}월 ${chart.solar.day}일` +
      ` (음력 ${chart.lunar.year}년 ${chart.lunar.month}월 ${chart.lunar.day}일${chart.lunar.isLeapMonth ? ' 윤달' : ''})`,
  )
  lines.push(
    `- 태어난 시각: ${
      chart.hourUnknown
        ? '모름 (시주 없음. 자식운과 노년운은 단정하지 말 것)'
        : `${String(chart.input.hour).padStart(2, '0')}시 ${String(chart.input.minute).padStart(2, '0')}분`
    }`,
  )
  lines.push(`- 성별: ${genderLabel}`)
  lines.push(`- 만 나이: ${chart.age}세`)
  lines.push(
    `- 진태양시 보정: ${chart.input.applyTrueSolarTime ? `적용 (동경 ${chart.input.longitude}도 기준)` : '미적용'}`,
  )
  lines.push('')

  lines.push('## 사주팔자')
  for (const p of chart.pillars) {
    lines.push(
      `- ${p.labelFull}: ${p.korean} (${p.hanja})` +
        ` / 천간 ${p.stem}=${p.stemElement}·${p.stemYinYang}, 십신 ${p.stemTenGod}(${tenGodHanja(p.stemTenGod)})` +
        ` / 지지 ${p.branch}=${p.branchElement}·${p.branchYinYang}, 십신 ${p.branchTenGod}(${tenGodHanja(p.branchTenGod)})` +
        ` / 지장간 ${hiddenStemsLabel(p.branch)}` +
        (p.isVoid ? ' / 공망' : ''),
    )
  }
  lines.push('')

  lines.push('## 일간 (이 사람 자신)')
  lines.push(
    `- ${chart.dayMaster.stem}(${chart.dayMaster.hanja}) — ${chart.dayMaster.yinYang}${chart.dayMaster.element}`,
  )
  lines.push('')

  lines.push(`## 오행 분포 (전체 ${chart.pillars.length * 2}글자 기준)`)
  for (const [el, n] of Object.entries(chart.elementCounts)) {
    lines.push(`- ${el}: ${n}개`)
  }
  if (chart.missingElements.length > 0) {
    lines.push(`- 없는 오행: ${chart.missingElements.join(', ')}`)
  } else {
    lines.push('- 없는 오행: 없음 (오행을 모두 갖춤)')
  }
  lines.push(`- 가장 많은 오행: ${chart.dominantElement}`)
  lines.push('')

  lines.push('## 십신 분포 (일간 제외)')
  const sorted = Object.entries(chart.tenGodCounts).sort((a, b) => b[1] - a[1])
  for (const [g, n] of sorted) lines.push(`- ${g}: ${n}개`)
  lines.push('')

  const analysis = analyze(chart)

  lines.push('## 신강신약 (해석의 뼈대. 여기서 출발하십시오)')
  lines.push(`- 판정: ${analysis.strength.verdict} (${analysis.strength.score}점 / 100점 만점)`)
  lines.push(`- 기준: 61점 이상 신강, 40점 미만 신약, 그 사이는 중화`)
  lines.push(`- 득령(월지가 일간을 돕는가): ${analysis.strength.hasSeason ? '득령했다' : '득령하지 못했다'}`)
  lines.push(`- 득지(일지가 일간을 돕는가): ${analysis.strength.hasGround ? '득지했다' : '득지하지 못했다'}`)
  lines.push('- 자리별 근거:')
  for (const r of analysis.strength.rows) {
    lines.push(
      `  - ${r.position} ${r.char}(${r.hanja}) ${r.element} ${r.tenGod} / ${r.weight}점 / ` +
        `${r.helps ? '일간을 도움' : '일간의 힘을 덜어냄'} — ${r.reason}`,
    )
  }
  lines.push('')

  lines.push('## 용신 (억부 기준)')
  lines.push(`- 이로운 오행: ${analysis.yongsin.favorable.join(', ')}`)
  lines.push(
    `- 부담이 되는 오행: ${analysis.yongsin.unfavorable.join(', ') || '뚜렷하지 않음'}`,
  )
  lines.push(`- 근거: ${analysis.yongsin.reason}`)
  if (analysis.yongsin.missingFavorable.length > 0) {
    lines.push(
      `- 주의: 이로운 오행 가운데 ${josa(analysis.yongsin.missingFavorable.join(', '), '이/가')} 원국에 하나도 없습니다. ` +
        `대운이나 세운에서 이 기운이 들어올 때가 중요한 전환점이 됩니다.`,
    )
  }
  if (analysis.yongsin.seasonNote) {
    lines.push(`- 조후 참고: ${analysis.yongsin.seasonNote}`)
  }
  lines.push('')

  lines.push('## 글자 사이의 관계 (합충형파해)')
  if (analysis.relations.length === 0) {
    lines.push('- 뚜렷한 합이나 충이 없습니다. 글자들이 서로 간섭하지 않고 제 역할을 합니다.')
  } else {
    for (const r of analysis.relations) {
      lines.push(
        `- [${r.kind}] ${r.name}: ${r.positions.join(' + ')}` +
          (r.produces ? ` → ${r.produces} 기운` : '') +
          ` — ${r.note}`,
      )
    }
  }
  lines.push('')

  lines.push('## 공망')
  lines.push(`- ${chart.voidBranches.join(', ')}`)
  lines.push('')

  lines.push('## 대운 (10년 단위 큰 흐름)')
  lines.push(
    `- 진행 방향: ${chart.luckForward ? '순행' : '역행'} / 첫 대운 시작 나이: ${chart.luckStartAge}세`,
  )
  for (const p of chart.luckPillars) {
    lines.push(
      `- ${p.age}세부터 (${p.startYear}년~): ${p.korean}(${p.hanja})` +
        ` 천간 십신 ${p.stemTenGod}, 지지 십신 ${p.branchTenGod}` +
        (p.isCurrent ? '  <== 지금 지나는 대운' : ''),
    )
  }
  lines.push('')

  lines.push('## 세운 (올해)')
  lines.push(
    `- ${chart.yearlyLuck.year}년: ${chart.yearlyLuck.korean}(${chart.yearlyLuck.hanja})` +
      ` 천간 십신 ${chart.yearlyLuck.stemTenGod}, 지지 십신 ${chart.yearlyLuck.branchTenGod}`,
  )

  return lines.join('\n')
}

/** 최종 사용자 메시지를 만든다. */
export function buildUserPrompt(chart: SajuChart): string {
  const sectionList = SECTIONS.map((s, i) => `${i + 1}. ## ${s.title} — ${s.hint}`).join('\n')

  const hourNote = chart.hourUnknown
    ? '\n태어난 시각을 모르는 사주입니다. 시주가 필요한 대목(자식, 노년)은 단정하지 말고, 세 기둥으로 알 수 있는 범위에서만 말씀해 주십시오.\n'
    : ''

  // 빈 문자열을 filter 로 거르면 문단 구분까지 사라지므로 템플릿으로 직접 조립한다.
  return `${chartToText(chart)}

---

위 사주를 아래 항목 순서대로 해석해 주십시오.

${sectionList}
${hourNote}
첫 줄부터 바로 "## 총평"으로 시작하십시오.`
}
