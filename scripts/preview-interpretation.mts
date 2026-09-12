import { buildChart, validateInput } from '../lib/saju'
import { buildUserPrompt, SYSTEM_PROMPT, SECTIONS } from '../lib/prompt'
import { streamInterpretation } from '../lib/ai'

const chart = buildChart(validateInput({
  year: 1990, month: 5, day: 15, hour: 14, minute: 30,
  calendar: 'solar', gender: 'male', longitude: 126.978, applyTrueSolarTime: true,
}))

const t0 = Date.now()
let out = ''
let firstTokenMs = 0
for await (const p of streamInterpretation({
  system: SYSTEM_PROMPT,
  prompt: buildUserPrompt(chart),
})) {
  if (!firstTokenMs) firstTokenMs = Date.now() - t0
  out += p
}
const totalMs = Date.now() - t0

console.log(out)
console.log('\n' + '='.repeat(70))
console.log('첫 글자까지:', (firstTokenMs / 1000).toFixed(1) + '초  / 전체:', (totalMs / 1000).toFixed(1) + '초')
console.log('글자 수:', out.length)

const found = [...out.matchAll(/^##[ \t]*(.+)$/gm)].map(m => m[1].trim())
console.log('\n항목 검증:')
for (const s of SECTIONS) {
  console.log(`  ${found.includes(s.title) ? 'O' : 'X'} ${s.title}`)
}
const extra = found.filter(f => !SECTIONS.some(s => s.title === f))
if (extra.length) console.log('  예상 밖 제목:', extra.join(', '))
console.log('첫 줄:', JSON.stringify(out.split('\n')[0]))

// 표에 없는 간지를 지어내지 않았는지 확인
console.log('\n사주 글자 일치 확인: 표의 기둥 =', chart.pillars.map(p => p.korean).join(' '))
