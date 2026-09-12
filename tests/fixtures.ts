/**
 * 테스트에서 함께 쓰는 값들.
 *
 * NOW 를 고정하는 것이 중요하다. 세운, 월운, 만 나이는 오늘이 언제냐에 따라 달라져서,
 * 고정하지 않으면 해가 바뀌는 순간 테스트가 통째로 깨진다.
 */

import { buildChart, validateInput, type SajuInput } from '../lib/saju'

/**
 * 테스트 기준 시각.
 *
 * 세계 어느 시간대에서 돌려도 2026년 9월로 읽히도록 정오(UTC)를 골랐다.
 * 자정으로 잡으면 시간대에 따라 날짜가 하루 밀려 월운 테스트가 흔들린다.
 */
export const NOW = new Date('2026-09-12T12:00:00Z')

/** 폼 기본값에 해당하는 입력. 테스트마다 필요한 항목만 덮어쓴다. */
export function input(over: Partial<SajuInput>): SajuInput {
  return validateInput({
    year: 1990,
    month: 5,
    day: 15,
    hour: 12,
    minute: 0,
    calendar: 'solar',
    isLeapMonth: false,
    gender: 'male',
    longitude: 126.978,
    applyTrueSolarTime: false,
    dayBoundary: 'midnight',
    ...over,
  })
}

export function chartOf(over: Partial<SajuInput>) {
  return buildChart(input(over), NOW)
}

/**
 * 기준 사주.
 *
 * 1998-08-21 08:10 양력, 여성, 서울, 진태양시 적용.
 * 이 사주의 모든 값은 시중 만세력 앱과 한 항목씩 대조해 일치를 확인했다.
 * 아래 tests/golden.test.ts 가 그 대조 결과를 그대로 못박아 둔 것이다.
 */
export const GOLDEN_INPUT: Partial<SajuInput> = {
  year: 1998,
  month: 8,
  day: 21,
  hour: 8,
  minute: 10,
  calendar: 'solar',
  gender: 'female',
  longitude: 126.978,
  applyTrueSolarTime: true,
  dayBoundary: 'midnight',
}

/** 기준 사주를 뽑아 '시주 일주 월주 연주' 순으로 뒤집은 배열도 함께 준다. */
export function goldenChart() {
  const chart = chartOf(GOLDEN_INPUT)
  return {
    chart,
    /** 연 → 시 순서 (내부 저장 순서) */
    byLabel: Object.fromEntries(chart.pillars.map((p) => [p.label, p])),
  }
}

/**
 * 일주를 율리우스일로 직접 계산한다.
 *
 * 만세력 라이브러리와 완전히 다른 방법이라, 두 값이 맞으면
 * 어느 한쪽이 조용히 틀어졌을 가능성이 매우 낮아진다.
 */
const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계']
const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해']

export function dayPillarByJulian(y: number, m: number, d: number): string {
  const a = Math.floor((14 - m) / 12)
  const yy = y + 4800 - a
  const mm = m + 12 * a - 3
  const jdn =
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045
  const idx = ((jdn + 49) % 60 + 60) % 60
  return STEMS[idx % 10] + BRANCHES[idx % 12]
}
