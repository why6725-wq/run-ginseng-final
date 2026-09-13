/**
 * 짧은 카드형 풀이와 오늘의 운세 문구.
 *
 * lib/prompt.ts 의 긴 풀이는 그대로 남겨 두고(자세히 보기에서 쓴다),
 * 첫 화면에는 카드 몇 장으로 끝나는 짧은 버전을 보여준다.
 *
 * 긴 글은 정확하지만 끝까지 읽는 사람이 드물다.
 * 짧은 카드가 먼저 눈에 들어오고, 더 보고 싶은 사람만 깊이 들어가는 구조가
 * 지금 사람들이 익숙해진 방식이다.
 */

import type { SajuChart } from './saju'
import type { Analysis } from './analysis'
import type { Persona } from './persona'
import type { TodayFortune } from './today'
import { chartToText } from './prompt'

/** 카드 여섯 장. 화면 순서와 같다. */
export const BRIEF_SECTIONS = [
  { id: 'personality', title: '나는 이런 사람', hint: '타고난 기질과 사람들이 보는 나' },
  { id: 'career', title: '일과 적성', hint: '어떤 일에서 힘이 나는지' },
  { id: 'money', title: '돈', hint: '돈이 들어오고 나가는 방식' },
  { id: 'love', title: '사랑', hint: '연애와 관계에서의 모습' },
  { id: 'health', title: '몸과 마음', hint: '약한 부분과 관리법' },
  { id: 'year', title: '올해', hint: '올해 흐름과 한 가지 조언' },
] as const

export const BRIEF_SYSTEM_PROMPT = `당신은 한국 전통 명리학에 정통한 상담가입니다.
사주 앱의 짧은 결과 카드를 씁니다.

# 절대 규칙
1. 사주는 이미 계산되어 주어집니다. 간지, 날짜, 나이를 스스로 계산하거나 고치지 마십시오.
   주어진 표에 없는 글자를 지어내지 마십시오.
2. 주어진 신강신약 판정과 용신을 뒤집지 마십시오. 그것을 뼈대로 삼아 일관되게 쓰십시오.
3. 단정적인 예언을 하지 마십시오. 기질과 흐름을 말하는 어조를 쓰십시오.
4. 건강은 생활 습관 조언까지만 합니다. 진단과 치료, 수명, 질병의 확정적 예측은 다루지 마십시오.
5. 신살로 겁주지 마십시오. 성 역할에 대한 낡은 고정관념을 쓰지 마십시오.

# 문체 — 이게 가장 중요합니다
- 짧게 씁니다. 한 카드는 세 문장 안쪽입니다. 절대 길게 쓰지 마십시오.
- 한 문장은 스무 자 안팎으로 끊습니다. 쉼표로 길게 잇지 마십시오.
- 존댓말을 쓰되 딱딱하지 않게, 친한 사람이 말해주듯 씁니다.
- 명리 용어를 쓸 때는 괄호 없이 바로 풀어서 말합니다.
  "일지가 상관이라" 대신 "타고난 재주를 표현하고 싶어 하는 자리라" 처럼 씁니다.
- 좋은 말만 늘어놓지 않습니다. 강점 한 가지와 조심할 점 한 가지를 함께 담습니다.
- 뻔한 말을 쓰지 마십시오. 이 사주에만 해당하는 이야기를 쓰십시오.

# 출력 형식
각 카드를 아래 형식으로 정확히 씁니다.

## 카드이름
키워드: 낱말, 낱말, 낱말
본문 두세 문장.

- 키워드 줄은 반드시 '키워드: ' 로 시작하고 낱말 세 개를 쉼표로 나눕니다.
- 낱말은 두세 글자로 짧게 씁니다.
- 본문에는 제목이나 목록을 쓰지 마십시오.
- 서론과 맺음말을 붙이지 마십시오. 첫 줄부터 바로 "## 나는 이런 사람"으로 시작합니다.`

/** 카드형 풀이 요청을 만든다 */
export function buildBriefPrompt(chart: SajuChart, persona: Persona): string {
  const sectionList = BRIEF_SECTIONS.map((s, i) => `${i + 1}. ## ${s.title} — ${s.hint}`).join(
    '\n',
  )

  return `${chartToText(chart)}

---

이 사주를 아래 여섯 카드로 짧게 풀어 주십시오.

${sectionList}

이 사주는 화면에 "${persona.title} — ${persona.subtitle}" 유형으로 소개되었습니다.
그 인상과 어긋나지 않게 써 주십시오.
${chart.hourUnknown ? '\n태어난 시각을 모르는 사주입니다. 자식과 노년에 관한 말은 하지 마십시오.\n' : ''}
다시 강조합니다. 한 카드는 세 문장 안쪽입니다. 짧게 쓰십시오.
첫 줄부터 바로 "## 나는 이런 사람"으로 시작하십시오.`
}

/* ------------------------------------------------------------------ */
/* 오늘의 운세                                                          */
/* ------------------------------------------------------------------ */

export const TODAY_SYSTEM_PROMPT = `당신은 한국 전통 명리학에 정통한 상담가입니다.
사주 앱의 "오늘의 운세" 한 토막을 씁니다.

# 절대 규칙
1. 오늘 일진과 점수는 이미 계산되어 주어집니다. 숫자나 간지를 고치지 마십시오.
2. 주어진 점수와 어긋나는 말을 하지 마십시오. 점수가 낮으면 낮은 대로,
   높으면 높은 대로 결이 맞아야 합니다.
3. 단정적인 예언을 하지 마십시오. 사고, 질병, 죽음, 금전적 손실을 예고하지 마십시오.
4. 점수가 낮아도 겁주지 마십시오. "조심하라"가 아니라 "이런 날이니 이렇게 쓰면 좋다"로
   풀어 주십시오. 오늘 하루를 망칠 말을 쓰면 안 됩니다.

# 문체
- 아주 짧게 씁니다. 두세 문장이 전부입니다.
- 한 문장은 스무 자 안팎입니다.
- 친한 사람이 아침에 건네는 말처럼 씁니다.
- 명리 용어를 쓰지 마십시오. 오늘 무엇을 하면 좋은지만 말하십시오.

# 출력 형식
- 제목이나 목록 없이 문장만 씁니다.
- 마지막 문장은 오늘 해볼 만한 구체적인 행동 하나로 끝냅니다.`

/** 오늘의 운세 요청을 만든다 */
export function buildTodayPrompt(
  chart: SajuChart,
  analysis: Analysis,
  fortune: TodayFortune,
  persona: Persona,
): string {
  const lines: string[] = []

  lines.push('# 이분의 사주 (요약)')
  lines.push(`- 유형: ${persona.title} — ${persona.subtitle}`)
  lines.push(
    `- 일간: ${chart.dayMaster.stem}(${chart.dayMaster.hanja}) ${chart.dayMaster.yinYang}${chart.dayMaster.element}`,
  )
  lines.push(`- 신강신약: ${analysis.strength.verdict} (${analysis.strength.score}점)`)
  lines.push(`- 이로운 오행: ${analysis.yongsin.favorable.join(', ')}`)
  lines.push(
    `- 부담되는 오행: ${analysis.yongsin.unfavorable.join(', ') || '뚜렷하지 않음'}`,
  )
  lines.push('')

  lines.push('# 오늘')
  lines.push(`- 날짜: ${fortune.date}`)
  lines.push(
    `- 오늘 일진: ${fortune.dayPillar.korean}(${fortune.dayPillar.hanja})` +
      ` / 천간 ${fortune.dayPillar.stemElement}, 지지 ${fortune.dayPillar.branchElement}` +
      ` / 나와의 관계 ${fortune.dayPillar.stemTenGod}·${fortune.dayPillar.branchTenGod}`,
  )
  lines.push(`- 계산된 점수: ${fortune.score}점 / 100점 — ${fortune.headline}`)
  lines.push('- 점수가 이렇게 나온 이유:')
  for (const r of fortune.reasons) {
    lines.push(`  - (${r.score >= 0 ? '+' : ''}${r.score}) ${r.label} — ${r.note}`)
  }
  lines.push('')
  lines.push(
    `위 내용을 바탕으로 오늘 하루에 대해 두세 문장으로 짧게 써 주십시오.` +
      ` 마지막은 오늘 해볼 만한 행동 하나로 끝내 주십시오.`,
  )

  return lines.join('\n')
}

/* ------------------------------------------------------------------ */
/* 카드 파싱                                                            */
/* ------------------------------------------------------------------ */

export interface BriefCard {
  title: string
  keywords: string[]
  body: string
}

/**
 * AI 가 쓴 글을 카드로 쪼갠다.
 *
 * 스트리밍 도중에도 불려서 아직 덜 온 카드도 그려야 하므로,
 * 형식이 완전하지 않아도 최대한 살려 쓴다.
 */
export function parseBriefCards(text: string): BriefCard[] {
  const out: BriefCard[] = []
  const parts = text.split(/^##[ \t]*/m)

  for (const [i, part] of parts.entries()) {
    if (i === 0 || part.trim().length === 0) continue

    const nl = part.indexOf('\n')
    const title = (nl === -1 ? part : part.slice(0, nl)).trim()
    const rest = nl === -1 ? '' : part.slice(nl + 1)

    const keywords: string[] = []
    const bodyLines: string[] = []
    for (const line of rest.split('\n')) {
      const m = line.match(/^\s*키워드\s*[:：]\s*(.+)$/)
      if (m) {
        keywords.push(
          ...m[1]
            .split(/[,、·]/)
            .map((k) => k.trim().replace(/^#/, ''))
            .filter(Boolean),
        )
      } else if (line.trim()) {
        bodyLines.push(line.trim())
      }
    }

    out.push({ title, keywords: keywords.slice(0, 4), body: bodyLines.join(' ') })
  }

  return out
}
