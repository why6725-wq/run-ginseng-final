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
import { twelveStage, type Stage } from './spirits'
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

/** 삼합 짝. 세 글자 중 둘만 만나도 기운이 맺힌다 */
const TRIPLE_PAIRS: [EarthlyBranch, EarthlyBranch][] = [
  ['신', '자'],
  ['자', '진'],
  ['신', '진'],
  ['해', '묘'],
  ['묘', '미'],
  ['해', '미'],
  ['인', '오'],
  ['오', '술'],
  ['인', '술'],
  ['사', '유'],
  ['유', '축'],
  ['사', '축'],
]

/** 형·파·해 — 충만큼 세지는 않지만 하루를 껄끄럽게 만든다 */
const FRICTIONS: [EarthlyBranch, EarthlyBranch][] = [
  // 형
  ['인', '사'],
  ['사', '신'],
  ['인', '신'],
  ['축', '술'],
  ['술', '미'],
  ['축', '미'],
  ['자', '묘'],
  // 파
  ['자', '유'],
  ['축', '진'],
  ['묘', '오'],
  ['미', '술'],
  // 해
  ['자', '미'],
  ['축', '오'],
  ['묘', '진'],
  ['신', '해'],
  ['유', '술'],
]

/** 천간합 — 오늘 천간이 내 천간과 짝을 이룬다 */
const STEM_COMBINES: [HeavenlyStem, HeavenlyStem][] = [
  ['갑', '기'],
  ['을', '경'],
  ['병', '신'],
  ['정', '임'],
  ['무', '계'],
]

/** 천간충 — 오늘 천간이 내 천간을 정면으로 친다 */
const STEM_CLASHES: [HeavenlyStem, HeavenlyStem][] = [
  ['갑', '경'],
  ['을', '신'],
  ['병', '임'],
  ['정', '계'],
]

function pairIn<T>(table: [T, T][], a: T, b: T) {
  return table.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
}

/**
 * 오늘 지지에서 내 일간이 어느 단계에 있는지(12운성)에 매기는 점수.
 *
 * 사람의 한살이에 빗댄 열두 단계다. 제왕·건록이면 기운이 가장 서고,
 * 절·묘·태면 기운이 잦아든다. 하루의 체감을 가르는 큰 요소라 폭을 넉넉히 줬다.
 */
const STAGE_SCORE: Record<Stage, number> = {
  제왕: 10,
  건록: 9,
  관대: 6,
  장생: 6,
  양: 2,
  목욕: 0,
  쇠: -1,
  태: -4,
  병: -6,
  사: -7,
  묘: -8,
  절: -9,
}

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

  /** 점수를 더하면서 왜 그랬는지도 같이 적는다. 근거 없는 점수는 하나도 남기지 않는다 */
  const add = (label: string, points: number, note: string) => {
    score += points
    reasons.push({
      label,
      score: Math.round(points),
      tone: points > 0 ? 'good' : points < 0 ? 'caution' : 'neutral',
      note,
    })
  }

  const { favorable, unfavorable } = analysis.yongsin

  // 이미 셋 이상 가진 오행은 더 들어와도 반갑지 않다.
  // 중화 사주는 뚜렷한 기신이 없어 깎이는 일이 없는데, 이 규칙이 그 빈자리를 메운다.
  const overElements = (Object.entries(chart.elementCounts) as [FiveElement, number][])
    .filter(([, n]) => n >= 3)
    .map(([el]) => el)

  // --- 1. 오늘 들어오는 오행이 내 용신인지 기신인지 ---
  for (const [el, where, w] of [
    [stemElement, '천간', 10],
    [branchElement, '지지', 12],
  ] as [FiveElement, string, number][]) {
    if (favorable.includes(el)) {
      add(
        `오늘 ${where}에 ${el} 기운`,
        w,
        `${josa(el, '은/는')} 나에게 이로운 기운입니다. 오늘 들어오니 하려던 일을 밀어붙이기 좋습니다.`,
      )
    } else if (unfavorable.includes(el)) {
      add(
        `오늘 ${where}에 ${el} 기운`,
        -w,
        `${josa(el, '은/는')} 이미 넘치는 기운이라 오늘 더해지면 과해집니다. 무리하지 않는 편이 낫습니다.`,
      )
    } else if (overElements.includes(el)) {
      add(
        `오늘 ${where}에 ${el} 기운`,
        -7,
        `사주에 ${el}이 ${chart.elementCounts[el]}개나 있는데 오늘 또 들어옵니다. 한쪽으로 쏠리기 쉬운 하루입니다.`,
      )
    }
  }

  // --- 2. 오늘 지지에서 내 일간이 어느 단계에 있는가 (12운성) ---
  const stage = twelveStage(dayStem, branch)
  const stagePoints = STAGE_SCORE[stage]
  if (stagePoints !== 0) {
    add(
      `오늘 자리에서 내 일간이 ${stage}`,
      stagePoints,
      stagePoints > 0
        ? `${dayStem} 일간이 ${branch}에서 ${stage}입니다. 기운이 서 있는 자리라 몸도 마음도 따라옵니다.`
        : `${dayStem} 일간이 ${branch}에서 ${stage}입니다. 기운이 잦아드는 자리라 쉽게 지칩니다.`,
    )
  }

  // --- 3. 오늘 천간과 내 천간들의 합충 ---
  const myStems = chart.pillars.map((p) => p.stem)
  const combinedStem = myStems.find((s) => pairIn(STEM_COMBINES, stem, s))
  if (combinedStem) {
    add(
      `오늘 천간 ${josa(stem, '이/가')} 내 ${josa(combinedStem, '과/와')} 합`,
      7,
      '오늘 기운이 내 생각과 손을 잡습니다. 말로 풀어야 할 일을 꺼내기 좋습니다.',
    )
  }
  const clashedStem = myStems.find((s) => pairIn(STEM_CLASHES, stem, s))
  if (clashedStem) {
    add(
      `오늘 천간 ${josa(stem, '이/가')} 내 ${josa(clashedStem, '과/와')} 충`,
      -8,
      '오늘 기운이 내 생각과 정면으로 부딪칩니다. 고집을 세우면 말이 거칠어지기 쉽습니다.',
    )
  }

  // --- 4. 오늘 지지와 내 지지들의 합충. 가까운 자리일수록 세게 친다 ---
  const nearness = (label: string) => (label === '일' ? 1.5 : label === '월' ? 1.25 : 1)

  let combineSum = 0
  let clashSum = 0
  let frictionSum = 0
  const combineAt: string[] = []
  const clashAt: string[] = []
  const frictionAt: string[] = []

  // 한 자리는 한 가지로만 센다. 사신처럼 합이면서 형인 짝이 있는데,
  // 같은 자리에 더하고 빼기를 함께 보여주면 읽는 사람만 헷갈린다. 센 쪽을 남긴다.
  for (const p of chart.pillars) {
    const near = nearness(p.label)
    if (pairIn(BRANCH_CLASHES, branch, p.branch)) {
      clashSum += 8 * near
      clashAt.push(`${p.label}지`)
    } else if (pairIn(SIX_COMBINES, branch, p.branch) || pairIn(TRIPLE_PAIRS, branch, p.branch)) {
      combineSum += 6 * near
      combineAt.push(`${p.label}지`)
    } else if (pairIn(FRICTIONS, branch, p.branch)) {
      frictionSum += 4 * near
      frictionAt.push(`${p.label}지`)
    }
  }

  if (combineSum > 0) {
    add(
      `오늘 지지가 내 ${combineAt.join('·')}와 합`,
      Math.min(combineSum, 16),
      '오늘 기운이 내 자리와 맞물립니다. 사람을 만나거나 이야기를 매듭짓기 좋은 날입니다.',
    )
  }
  if (clashSum > 0) {
    add(
      `오늘 지지가 내 ${clashAt.join('·')}와 충`,
      -Math.min(clashSum, 20),
      '오늘 기운이 내 자리와 부딪칩니다. 변동이 생기기 쉬우니 큰 결정은 하루 미뤄도 좋습니다.',
    )
  }
  if (frictionSum > 0) {
    add(
      `오늘 지지가 내 ${frictionAt.join('·')}와 형·파·해`,
      -Math.min(frictionSum, 8),
      '크게 부딪치진 않아도 은근히 껄끄러운 자리입니다. 사소한 마찰이 쌓이지 않게 한 번씩 넘어가 주십시오.',
    )
  }

  // --- 5. 오늘 일진이 내 일주와 겹치는가 ---
  if (stem === dayStem && branch === chart.pillars.find((p) => p.label === '일')?.branch) {
    add(
      '오늘 일진이 내 일주와 같은 간지',
      7,
      '예순 날에 한 번 오는, 내 일주가 그대로 돌아오는 날입니다. 나답게 움직이기 가장 좋습니다.',
    )
  } else if (stem === dayStem) {
    add(
      '오늘 일간이 나와 같은 글자',
      5,
      '내 기운이 그대로 서는 날입니다. 평소보다 자기 뜻대로 움직이기 쉽습니다.',
    )
  }

  // --- 6. 공망 ---
  if (chart.voidBranches.includes(branch)) {
    add(
      `오늘 지지 ${josa(branch, '이/가')} 내 공망`,
      -5,
      '공망은 비어 있는 자리입니다. 들이는 힘에 비해 남는 게 적으니, 오늘은 벌이기보다 마무리에 쓰는 편이 낫습니다.',
    )
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

/**
 * 점수대별 한 줄.
 *
 * 경계는 실제로 나온 점수 분포에 맞춰 잡았다(scripts/distribution.mts).
 * 대략 위에서부터 10% / 20% / 40% / 20% / 10% 로 나뉜다.
 * 좋은 날만 잔뜩 나오면 믿지 않고, 나쁜 날만 나오면 다시 들어오지 않는다.
 */
function headlineOf(score: number): string {
  if (score >= 75) return '기운이 나를 밀어주는 날'
  if (score >= 62) return '가볍게 풀리는 날'
  if (score >= 45) return '하던 대로 하기 좋은 날'
  if (score >= 30) return '한 박자 쉬어가는 날'
  return '욕심을 내려놓는 날'
}
