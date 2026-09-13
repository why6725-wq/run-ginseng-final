/**
 * 오늘의 운세.
 *
 * 매일 들어올 이유를 만드는 기능이다. 그래서 두 가지가 중요하다.
 *  1. 매일 달라야 한다 — 오늘 일진이 바뀌니 자연히 달라진다.
 *  2. 근거가 있어야 한다 — 무작위로 뽑으면 금방 들킨다.
 *
 * 오늘 일진(그날의 간지)과 내 사주를 맞대어 계산한다.
 * 오늘 들어오는 오행이 내 용신이면 좋고 기신이면 조심할 날이다.
 * 여기에 오늘 지지와 내 지지들의 합충을 더해 점수를 낸다.
 */

import { calculateFourPillars, getTenGod, getBranchTenGod } from 'manseryeok'
import {
  HEAVENLY_STEMS,
  HEAVENLY_STEMS_HANJA,
  EARTHLY_BRANCHES,
  EARTHLY_BRANCHES_HANJA,
  getHeavenlyStemElement,
  getEarthlyBranchElement,
} from 'manseryeok'
import type { EarthlyBranch, FiveElement, HeavenlyStem, TenGod } from 'manseryeok'
import type { SajuChart } from './saju'
import type { Analysis } from './analysis'
import { josa } from './korean'

const SIX_COMBINES: [EarthlyBranch, EarthlyBranch][] = [
  ['자', '축'],
  ['인', '해'],
  ['묘', '술'],
  ['진', '유'],
  ['사', '신'],
  ['오', '미'],
]

const BRANCH_CLASHES: [EarthlyBranch, EarthlyBranch][] = [
  ['자', '오'],
  ['축', '미'],
  ['인', '신'],
  ['묘', '유'],
  ['진', '술'],
  ['사', '해'],
]

const pairIn = (table: [EarthlyBranch, EarthlyBranch][], a: EarthlyBranch, b: EarthlyBranch) =>
  table.some(([x, y]) => (x === a && y === b) || (x === b && y === a))

export interface TodayReason {
  label: string
  score: number
  tone: 'good' | 'caution' | 'neutral'
  note: string
}

export interface TodayFortune {
  /** 'YYYY-MM-DD' */
  date: string
  /** 오늘 일진 */
  dayPillar: {
    korean: string
    hanja: string
    stem: HeavenlyStem
    branch: EarthlyBranch
    stemElement: FiveElement
    branchElement: FiveElement
    stemTenGod: TenGod | '일간'
    branchTenGod: TenGod
  }
  /** 0~100 */
  score: number
  /** 점수대별 한 줄 */
  headline: string
  /** 점수가 어떻게 나왔는지 */
  reasons: TodayReason[]
  /** 오늘 이로운 방향으로 쓸 오행 */
  luckyElement: FiveElement
}

/** 시간대를 타지 않도록 한국 날짜로 'YYYY-MM-DD' 를 만든다 */
export function kstDateString(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)!.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

/**
 * 오늘의 운세를 계산한다.
 *
 * 50점에서 출발해 오늘 기운이 내게 이로우면 더하고 부담이면 뺀다.
 * 무작위 요소는 하나도 없다. 같은 사람 같은 날이면 언제 봐도 같은 값이 나온다.
 */
export function buildTodayFortune(
  chart: SajuChart,
  analysis: Analysis,
  now: Date = new Date(),
): TodayFortune {
  const date = kstDateString(now)
  const [y, m, d] = date.split('-').map(Number)

  // 오늘 일진. 정오로 계산해 야자시 경계를 피한다.
  const today = calculateFourPillars({ year: y, month: m, day: d, hour: 12, minute: 0 })
  const stem = today.day.heavenlyStem
  const branch = today.day.earthlyBranch
  const dayStem = chart.dayMaster.stem

  const stemElement = getHeavenlyStemElement(stem)
  const branchElement = getEarthlyBranchElement(branch)

  const reasons: TodayReason[] = []
  let score = 50

  const { favorable, unfavorable } = analysis.yongsin

  // 오늘 들어오는 오행이 내 용신인지 기신인지
  for (const [el, where] of [
    [stemElement, '천간'],
    [branchElement, '지지'],
  ] as [FiveElement, string][]) {
    if (favorable.includes(el)) {
      score += 12
      reasons.push({
        label: `오늘 ${where}에 ${el} 기운`,
        score: 12,
        tone: 'good',
        note: `${josa(el, '은/는')} 나에게 이로운 기운입니다. 오늘 들어오니 하려던 일을 밀어붙이기 좋습니다.`,
      })
    } else if (unfavorable.includes(el)) {
      score -= 10
      reasons.push({
        label: `오늘 ${where}에 ${el} 기운`,
        score: -10,
        tone: 'caution',
        note: `${josa(el, '은/는')} 이미 넘치는 기운이라 오늘 더해지면 과해집니다. 무리하지 않는 편이 낫습니다.`,
      })
    }
  }

  // 오늘 지지와 내 지지들의 합충
  let combines = 0
  let clashes = 0
  for (const p of chart.pillars) {
    if (pairIn(SIX_COMBINES, branch, p.branch)) combines += 1
    if (pairIn(BRANCH_CLASHES, branch, p.branch)) clashes += 1
  }
  if (combines > 0) {
    const add = Math.min(combines * 7, 14)
    score += add
    reasons.push({
      label: `오늘 지지가 내 사주와 ${combines}군데 합`,
      score: add,
      tone: 'good',
      note: '오늘 기운이 내 자리와 맞물립니다. 사람을 만나거나 이야기를 매듭짓기 좋은 날입니다.',
    })
  }
  if (clashes > 0) {
    const cut = Math.min(clashes * 8, 16)
    score -= cut
    reasons.push({
      label: `오늘 지지가 내 사주와 ${clashes}군데 충`,
      score: -cut,
      tone: 'caution',
      note: '오늘 기운이 내 자리와 부딪칩니다. 변동이 생기기 쉬우니 큰 결정은 하루 미뤄도 좋습니다.',
    })
  }

  // 오늘 일간이 나와 같은 글자면 내 기운이 서는 날
  if (stem === dayStem) {
    score += 6
    reasons.push({
      label: '오늘 일간이 나와 같은 글자',
      score: 6,
      tone: 'good',
      note: '내 기운이 그대로 서는 날입니다. 평소보다 자기 뜻대로 움직이기 쉽습니다.',
    })
  }

  if (reasons.length === 0) {
    reasons.push({
      label: '오늘 기운이 내 사주와 크게 얽히지 않음',
      score: 0,
      tone: 'neutral',
      note: '특별히 밀어주지도 막지도 않는 날입니다. 하던 대로 하기 좋은 날입니다.',
    })
  }

  score = Math.max(5, Math.min(95, Math.round(score)))

  return {
    date,
    dayPillar: {
      korean: `${stem}${branch}`,
      hanja: `${HEAVENLY_STEMS_HANJA[HEAVENLY_STEMS.indexOf(stem)]}${EARTHLY_BRANCHES_HANJA[EARTHLY_BRANCHES.indexOf(branch)]}`,
      stem,
      branch,
      stemElement,
      branchElement,
      stemTenGod: getTenGod(dayStem, stem),
      branchTenGod: getBranchTenGod(dayStem, branch),
    },
    score,
    headline: headlineOf(score),
    reasons,
    luckyElement: favorable[0] ?? chart.dayMaster.element,
  }
}

function headlineOf(score: number): string {
  if (score >= 80) return '기운이 나를 밀어주는 날'
  if (score >= 65) return '가볍게 풀리는 날'
  if (score >= 50) return '하던 대로 하기 좋은 날'
  if (score >= 35) return '한 박자 쉬어가는 날'
  return '욕심을 내려놓는 날'
}
