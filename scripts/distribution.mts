/**
 * 분포 점검.
 *
 * 사주 수백 개를 만들어 신강신약 판정과 오늘의 운세 점수가
 * 한쪽으로 쏠리지 않는지 눈으로 확인한다.
 *
 *   npx tsx scripts/distribution.mts
 *
 * 판정 기준을 손볼 때마다 돌려 본다. 자동 검사는 tests/distribution.test.ts 에 있다.
 */

import { buildChart, validateInput } from '../lib/saju'
import { analyze } from '../lib/analysis'
import { buildTodayFortune } from '../lib/today'
import { buildPersona } from '../lib/persona'

const NOW = new Date('2026-09-12T12:00:00Z')

/** 1960~2005년에 걸쳐 날짜와 시각을 고루 흩어 표본을 만든다 */
function samples() {
  const out = []
  for (let year = 1960; year <= 2005; year += 1) {
    for (const [month, day] of [
      [1, 8],
      [3, 21],
      [5, 5],
      [7, 17],
      [9, 29],
      [11, 12],
    ] as [number, number][]) {
      const hour = (year * 7 + month * 5 + day) % 24
      out.push(
        buildChart(
          validateInput({
            year,
            month,
            day,
            hour,
            minute: (day * 13) % 60,
            calendar: 'solar',
            gender: year % 2 ? 'male' : 'female',
            longitude: 126.978,
            applyTrueSolarTime: true,
          }),
          NOW,
        ),
      )
    }
  }
  return out
}

function histogram(title: string, counts: Map<string, number>, total: number) {
  console.log(`\n${title} (표본 ${total}개)`)
  const keys = [...counts.keys()].sort()
  for (const k of keys) {
    const n = counts.get(k)!
    const pct = (n / total) * 100
    console.log(`  ${k.padEnd(8)} ${String(n).padStart(4)}  ${pct.toFixed(1).padStart(5)}%  ${'█'.repeat(Math.round(pct / 2))}`)
  }
}

const charts = samples()
const total = charts.length

const verdicts = new Map<string, number>()
const scoreBuckets = new Map<string, number>()
const todayBuckets = new Map<string, number>()
const headlines = new Map<string, number>()
const personas = new Map<string, number>()

let strengthSum = 0
let todaySum = 0
const todayScores: number[] = []

for (const chart of charts) {
  const a = analyze(chart)
  verdicts.set(a.strength.verdict, (verdicts.get(a.strength.verdict) ?? 0) + 1)
  strengthSum += a.strength.score
  const sb = `${Math.floor(a.strength.score / 10) * 10}대`
  scoreBuckets.set(sb, (scoreBuckets.get(sb) ?? 0) + 1)

  const p = buildPersona(chart, a)
  personas.set(p.title, (personas.get(p.title) ?? 0) + 1)

  // 한 사람의 하루가 아니라 여러 날을 봐야 점수 폭이 보인다
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(NOW.getTime() + i * 86400000)
    const f = buildTodayFortune(chart, a, day)
    todayScores.push(f.score)
    todaySum += f.score
    const tb = `${Math.floor(f.score / 10) * 10}대`
    todayBuckets.set(tb, (todayBuckets.get(tb) ?? 0) + 1)
    headlines.set(f.headline, (headlines.get(f.headline) ?? 0) + 1)
  }
}

histogram('신강신약 판정', verdicts, total)
histogram('신강신약 점수대', scoreBuckets, total)
console.log(`  평균 ${(strengthSum / total).toFixed(1)}점`)

histogram('오늘의 운세 점수대', todayBuckets, todayScores.length)
const sorted = [...todayScores].sort((a, b) => a - b)
const q = (p: number) => sorted[Math.floor((sorted.length - 1) * p)]
console.log(
  `  평균 ${(todaySum / todayScores.length).toFixed(1)}점 / 최저 ${sorted[0]} / 하위25% ${q(0.25)} / 중앙 ${q(0.5)} / 상위25% ${q(0.75)} / 최고 ${sorted[sorted.length - 1]}`,
)
const biggest = Math.max(...todayBuckets.values()) / todayScores.length
console.log(`  가장 큰 점수대가 전체의 ${(biggest * 100).toFixed(1)}%`)

histogram('오늘의 운세 한 줄', headlines, todayScores.length)

console.log(`\n유형 별명 (${personas.size}종, 표본 ${total}개)`)
const top = [...personas.entries()].sort((a, b) => b[1] - a[1])
console.log(`  가장 흔한 별명: ${top[0][0]} ${((top[0][1] / total) * 100).toFixed(1)}%`)
console.log(`  가장 드문 별명: ${top[top.length - 1][0]} ${((top[top.length - 1][1] / total) * 100).toFixed(1)}%`)
