import { buildChart, validateInput } from '../lib/saju'
import { buildUserPrompt } from '../lib/prompt'

const now = new Date('2026-09-12T00:00:00+09:00')

function show(label: string, raw: unknown) {
  console.log('\n' + '='.repeat(70))
  console.log(label)
  console.log('='.repeat(70))
  const chart = buildChart(validateInput(raw), now)
  console.log('사주 :', chart.pillars.map(p => `${p.labelFull} ${p.korean}(${p.hanja})`).join('  '))
  console.log('일간 :', `${chart.dayMaster.stem}(${chart.dayMaster.hanja}) ${chart.dayMaster.yinYang}${chart.dayMaster.element}`)
  console.log('십신 :', chart.pillars.map(p => `${p.label}[${p.stemTenGod}/${p.branchTenGod}]`).join(' '))
  console.log('오행 :', JSON.stringify(chart.elementCounts), '없는것:', chart.missingElements.join(',') || '없음')
  console.log('공망 :', chart.voidBranches.join(','))
  console.log('나이 :', chart.age + '세')
  console.log('대운 :', chart.luckForward ? '순행' : '역행', `${chart.luckStartAge}세 시작`,
    '| 현재:', chart.currentLuck ? `${chart.currentLuck.age}세 ${chart.currentLuck.korean}(${chart.currentLuck.stemTenGod}/${chart.currentLuck.branchTenGod})` : '대운 전')
  console.log('세운 :', `${chart.yearlyLuck.year} ${chart.yearlyLuck.korean} ${chart.yearlyLuck.stemTenGod}/${chart.yearlyLuck.branchTenGod}`)
  if (chart.notes.length) console.log('안내 :\n  - ' + chart.notes.join('\n  - '))
  return chart
}

show('A. 양력 1990-05-15 14:30 남성 서울, 진태양시 적용', {
  year: 1990, month: 5, day: 15, hour: 14, minute: 30,
  calendar: 'solar', gender: 'male', longitude: 126.978, applyTrueSolarTime: true,
})

show('B. 시각 모름 (시주 없음)', {
  year: 1990, month: 5, day: 15, hour: null, minute: 0,
  calendar: 'solar', gender: 'female', longitude: 126.978, applyTrueSolarTime: true,
})

show('C. 입춘 전 출생 — 연주가 전년도가 되어야 함 (1988-02-04)', {
  year: 1988, month: 2, day: 4, hour: 10, minute: 0,
  calendar: 'solar', gender: 'male', longitude: 126.978, applyTrueSolarTime: true,
})

show('D. 음력 입력 + 윤달 아님 (음력 1990-04-21)', {
  year: 1990, month: 4, day: 21, hour: 14, minute: 30,
  calendar: 'lunar', isLeapMonth: false, gender: 'male', longitude: 126.978, applyTrueSolarTime: true,
})

show('E. 서머타임 기간 출생 (1988-07-15 12:00 부산)', {
  year: 1988, month: 7, day: 15, hour: 12, minute: 0,
  calendar: 'solar', gender: 'female', longitude: 129.075, applyTrueSolarTime: true,
})

show('F. 최근 출생 (2024-12-25 17:05)', {
  year: 2024, month: 12, day: 25, hour: 17, minute: 5,
  calendar: 'solar', gender: 'male', longitude: 126.978, applyTrueSolarTime: true,
})

console.log('\n\n' + '='.repeat(70))
console.log('AI 에게 전달될 프롬프트 (케이스 A)')
console.log('='.repeat(70))
const a = buildChart(validateInput({
  year: 1990, month: 5, day: 15, hour: 14, minute: 30,
  calendar: 'solar', gender: 'male', longitude: 126.978, applyTrueSolarTime: true,
}), now)
console.log(buildUserPrompt(a))

console.log('\n\n=== 잘못된 입력 처리 ===')
for (const bad of [
  { label: '존재하지 않는 날짜', v: { year: 2023, month: 2, day: 30, hour: 1, minute: 0, calendar: 'solar' } },
  { label: '범위 밖 연도', v: { year: 1800, month: 1, day: 1, hour: 1, minute: 0, calendar: 'solar' } },
  { label: '잘못된 시각', v: { year: 1990, month: 1, day: 1, hour: 25, minute: 0, calendar: 'solar' } },
]) {
  try {
    buildChart(validateInput(bad.v), now)
    console.log(`${bad.label}: 통과해버림 <- 문제`)
  } catch (e) {
    console.log(`${bad.label}: 거부됨 — ${(e as Error).message}`)
  }
}
