/**
 * 카드 여섯 장을 실제로 뽑아 눈으로 읽어보는 용도.
 *
 *   npx tsx scripts/preview-brief.mts          세 사람 모두
 *   npx tsx scripts/preview-brief.mts 표본B    한 사람만
 *
 * 지시문을 고칠 때마다 돌려서, 표 해설로 돌아가지 않았는지 확인한다.
 * 한 사람만 보는 쪽은 한 군데만 고쳐놓고 빨리 확인할 때 쓴다.
 *
 * 글이 잘 나왔는지는 자동으로 검사할 수 없다. 사람이 읽어야 안다.
 * 읽을 때 보는 것:
 *  - 문장이 명리 용어로 시작하지 않는가 (시작하면 표 해설로 돌아간 것)
 *  - 카드마다 "어 맞네" 할 만한 구체적인 장면이 하나씩 있는가
 *  - 성격 딱지만 늘어놓지 않았는가
 *  - 다치거나 사고 난다는 식의 말이 없는가
 */
import { buildChart, validateInput } from '../lib/saju'
import { analyze } from '../lib/analysis'
import { buildPersona } from '../lib/persona'
import { BRIEF_SYSTEM_PROMPT, buildBriefPrompt, parseBriefCards } from '../lib/brief'
import { streamInterpretation } from '../lib/ai'

/** 신강·중화·신약이 하나씩 섞이도록 골랐다. 한 유형만 보면 치우친 걸 못 본다. */
const PEOPLE = [
  { name: '송주현', year: 1998, month: 8, day: 21, hour: 8, minute: 10, gender: 'female' as const },
  { name: '표본A', year: 1985, month: 3, day: 14, hour: 22, minute: 0, gender: 'male' as const },
  { name: '표본B', year: 2001, month: 11, day: 2, hour: 5, minute: 30, gender: 'female' as const },
]

const only = process.argv[2]
const picked = only ? PEOPLE.filter((p) => p.name === only) : PEOPLE
if (picked.length === 0) {
  console.error(`"${only}" 를 찾지 못했습니다. 고를 수 있는 이름: ${PEOPLE.map((p) => p.name).join(', ')}`)
  process.exit(1)
}

for (const p of picked) {
  const chart = buildChart(
    validateInput({ ...p, calendar: 'solar', longitude: 126.978, applyTrueSolarTime: true }),
  )
  const a = analyze(chart)
  const persona = buildPersona(chart, a)

  console.log('\n' + '='.repeat(70))
  console.log(`${p.name} — ${persona.title} / ${persona.subtitle}`)
  console.log(`${chart.pillars.map((x) => x.korean).join(' ')} / ${a.strength.verdict} ${a.strength.score}점`)
  console.log('='.repeat(70))

  let out = ''
  for await (const t of streamInterpretation({
    system: BRIEF_SYSTEM_PROMPT,
    prompt: buildBriefPrompt(chart, persona),
  })) out += t

  for (const c of parseBriefCards(out)) {
    console.log(`\n[${c.title}]  ${c.keywords.join(' · ')}`)
    console.log(c.body)
  }
}
