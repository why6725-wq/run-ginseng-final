/**
 * 사주 계산 모듈.
 *
 * 중요한 설계 원칙: 사주팔자 계산은 100% 이 파일(= 검증된 만세력 라이브러리)이 담당한다.
 * AI 는 여기서 나온 결과를 "읽고 해석만" 할 뿐, 절대 날짜나 간지를 직접 계산하지 않는다.
 * 언어 모델은 달력 계산에 약해서, 맡기면 틀린 사주를 그럴듯하게 써낸다.
 */

import {
  calculateFourPillars,
  getHeavenlyStemElement,
  getEarthlyBranchElement,
  getHeavenlyStemYinYang,
  getEarthlyBranchYinYang,
  getTenGod,
  getBranchTenGod,
  solarToLunar,
  lunarToSolar,
  isValidSolarDate,
  HEAVENLY_STEMS,
  HEAVENLY_STEMS_HANJA,
  EARTHLY_BRANCHES,
  EARTHLY_BRANCHES_HANJA,
  FIVE_ELEMENTS,
  TEN_GOD_HANJA,
  getSolarTermsOfYear,
} from 'manseryeok'
import type {
  DayBoundary,
  EarthlyBranch,
  FiveElement,
  Gender,
  HeavenlyStem,
  TenGod,
  YinYang,
} from 'manseryeok'

/* ------------------------------------------------------------------ */
/* 입력                                                                */
/* ------------------------------------------------------------------ */

export interface SajuInput {
  /** 양력/음력 중 사용자가 입력한 달력 기준의 연 */
  year: number
  month: number
  day: number
  /** 태어난 시각. 모르면 null */
  hour: number | null
  minute: number
  /** 'solar' = 양력, 'lunar' = 음력 */
  calendar: 'solar' | 'lunar'
  /** 음력 윤달 여부 */
  isLeapMonth: boolean
  gender: Gender
  /** 출생지 경도(동경). 진태양시 보정에 쓰인다 */
  longitude: number
  /** 진태양시 보정 적용 여부 */
  applyTrueSolarTime: boolean
  /** 밤 11시~자정 출생의 일주·시주 처리 기준 */
  dayBoundary: DayBoundary
}

/** 출생지 선택지. 경도 차이가 시주를 바꿀 수 있어 도시 단위로 제공한다. */
export const BIRTH_PLACES = [
  { name: '서울', longitude: 126.978 },
  { name: '인천', longitude: 126.705 },
  { name: '수원', longitude: 127.029 },
  { name: '춘천', longitude: 127.729 },
  { name: '강릉', longitude: 128.896 },
  { name: '대전', longitude: 127.385 },
  { name: '청주', longitude: 127.489 },
  { name: '전주', longitude: 127.148 },
  { name: '광주', longitude: 126.852 },
  { name: '목포', longitude: 126.392 },
  { name: '대구', longitude: 128.601 },
  { name: '포항', longitude: 129.365 },
  { name: '부산', longitude: 129.075 },
  { name: '울산', longitude: 129.311 },
  { name: '제주', longitude: 126.531 },
] as const

export const DEFAULT_PLACE = BIRTH_PLACES[0]

/* ------------------------------------------------------------------ */
/* 출력                                                                */
/* ------------------------------------------------------------------ */

export interface PillarView {
  /** '연' | '월' | '일' | '시' */
  label: string
  labelFull: string
  stem: HeavenlyStem
  stemHanja: string
  branch: EarthlyBranch
  branchHanja: string
  korean: string
  hanja: string
  stemElement: FiveElement
  branchElement: FiveElement
  stemYinYang: YinYang
  branchYinYang: YinYang
  /** 천간의 십신. 일주의 천간은 '일간' */
  stemTenGod: TenGod | '일간'
  /** 지지의 십신 */
  branchTenGod: TenGod
  /** 공망에 해당하는 지지인지 */
  isVoid: boolean
}

export interface LuckPillarView {
  age: number
  korean: string
  hanja: string
  stemTenGod: TenGod | '일간'
  branchTenGod: TenGod
  /** 이 대운이 시작하는 서기 연도 */
  startYear: number
  /** 현재 지나고 있는 대운인지 */
  isCurrent: boolean
}

export interface SajuChart {
  input: SajuInput
  /** 시각을 모르는 경우 시주를 제외한다 */
  hourUnknown: boolean
  /** 실제 계산에 쓰인 양력 날짜 */
  solar: { year: number; month: number; day: number }
  /** 대응하는 음력 날짜 */
  lunar: { year: number; month: number; day: number; isLeapMonth: boolean }
  /** 표에 표시할 기둥. 시각을 모르면 3개, 알면 4개 */
  pillars: PillarView[]
  dayMaster: {
    stem: HeavenlyStem
    hanja: string
    element: FiveElement
    yinYang: YinYang
  }
  /** 오행별 글자 수. 시각을 모르면 6글자, 알면 8글자 기준 */
  elementCounts: Record<FiveElement, number>
  /** 사주에 아예 없는 오행 */
  missingElements: FiveElement[]
  /** 가장 많은 오행 */
  dominantElement: FiveElement
  /** 십신 분포 (천간+지지 전체) */
  tenGodCounts: Record<string, number>
  voidBranches: EarthlyBranch[]
  luckPillars: LuckPillarView[]
  luckForward: boolean
  luckStartAge: number
  currentLuck: LuckPillarView | null
  /** 올해의 세운 */
  yearlyLuck: {
    year: number
    korean: string
    hanja: string
    stemTenGod: TenGod | '일간'
    branchTenGod: TenGod
  }
  /** 만 나이 */
  age: number
  /** 입춘 기준으로 사주 연도가 달력 연도와 다른 경우의 안내 */
  notes: string[]
}

/* ------------------------------------------------------------------ */
/* 내부 도우미                                                          */
/* ------------------------------------------------------------------ */

const stemHanja = (s: HeavenlyStem) => HEAVENLY_STEMS_HANJA[HEAVENLY_STEMS.indexOf(s)]
const branchHanja = (b: EarthlyBranch) => EARTHLY_BRANCHES_HANJA[EARTHLY_BRANCHES.indexOf(b)]

export const tenGodHanja = (g: TenGod | '일간') =>
  g === '일간' ? '日干' : TEN_GOD_HANJA[g]

/** 시각을 모를 때 쓰는 대표 시각. 정오라 야자시 문제도 피한다. */
const UNKNOWN_HOUR = 12
const UNKNOWN_MINUTE = 0

/* ------------------------------------------------------------------ */
/* 메인                                                                */
/* ------------------------------------------------------------------ */

export function buildChart(input: SajuInput, now: Date = new Date()): SajuChart {
  const hourUnknown = input.hour === null

  // 음력 입력이면 양력으로 바꿔 실제 사용한 양력 날짜를 화면에 보여준다.
  const solar =
    input.calendar === 'lunar'
      ? lunarToSolar(input.year, input.month, input.day, input.isLeapMonth)
      : { year: input.year, month: input.month, day: input.day }

  if (!isValidSolarDate(solar.year, solar.month, solar.day)) {
    throw new Error('존재하지 않는 날짜입니다. 생년월일을 다시 확인해 주세요.')
  }

  const lunar = solarToLunar(solar.year, solar.month, solar.day)

  const detail = calculateFourPillars({
    year: solar.year,
    month: solar.month,
    day: solar.day,
    hour: hourUnknown ? UNKNOWN_HOUR : (input.hour as number),
    minute: hourUnknown ? UNKNOWN_MINUTE : input.minute,
    gender: input.gender,
    dayBoundary: input.dayBoundary,
    trueSolarTime: input.applyTrueSolarTime
      ? { longitude: input.longitude, applyEquationOfTime: true, applyHistoricalDst: true }
      : undefined,
  })

  const dayStem = detail.day.heavenlyStem
  const voidBranches = detail.voidBranches

  const makePillar = (
    label: string,
    labelFull: string,
    stem: HeavenlyStem,
    branch: EarthlyBranch,
    isDayPillar: boolean,
  ): PillarView => ({
    label,
    labelFull,
    stem,
    stemHanja: stemHanja(stem),
    branch,
    branchHanja: branchHanja(branch),
    korean: `${stem}${branch}`,
    hanja: `${stemHanja(stem)}${branchHanja(branch)}`,
    stemElement: getHeavenlyStemElement(stem),
    branchElement: getEarthlyBranchElement(branch),
    stemYinYang: getHeavenlyStemYinYang(stem),
    branchYinYang: getEarthlyBranchYinYang(branch),
    stemTenGod: isDayPillar ? '일간' : getTenGod(dayStem, stem),
    branchTenGod: getBranchTenGod(dayStem, branch),
    isVoid: voidBranches.includes(branch),
  })

  const pillars: PillarView[] = [
    makePillar('연', '연주', detail.year.heavenlyStem, detail.year.earthlyBranch, false),
    makePillar('월', '월주', detail.month.heavenlyStem, detail.month.earthlyBranch, false),
    makePillar('일', '일주', detail.day.heavenlyStem, detail.day.earthlyBranch, true),
  ]
  if (!hourUnknown) {
    pillars.push(
      makePillar('시', '시주', detail.hour.heavenlyStem, detail.hour.earthlyBranch, false),
    )
  }

  // 오행 분포 — 표시되는 기둥만 센다 (시각을 모르면 6글자 기준)
  const elementCounts = Object.fromEntries(
    FIVE_ELEMENTS.map((e) => [e, 0]),
  ) as Record<FiveElement, number>
  for (const p of pillars) {
    elementCounts[p.stemElement] += 1
    elementCounts[p.branchElement] += 1
  }

  const missingElements = FIVE_ELEMENTS.filter((e) => elementCounts[e] === 0)
  const dominantElement = FIVE_ELEMENTS.reduce((a, b) =>
    elementCounts[b] > elementCounts[a] ? b : a,
  )

  // 십신 분포 — 일간 자신은 제외
  const tenGodCounts: Record<string, number> = {}
  for (const p of pillars) {
    if (p.stemTenGod !== '일간') {
      tenGodCounts[p.stemTenGod] = (tenGodCounts[p.stemTenGod] ?? 0) + 1
    }
    tenGodCounts[p.branchTenGod] = (tenGodCounts[p.branchTenGod] ?? 0) + 1
  }

  // 만 나이
  const age = calcAge(solar, now)

  // 대운
  const info = detail.luckPillars
  const luckPillars: LuckPillarView[] = (info?.pillars ?? []).map((p) => {
    const startYear = solar.year + p.age
    return {
      age: p.age,
      korean: p.korean,
      hanja: `${stemHanja(p.pillar.heavenlyStem)}${branchHanja(p.pillar.earthlyBranch)}`,
      stemTenGod: getTenGod(dayStem, p.pillar.heavenlyStem),
      branchTenGod: getBranchTenGod(dayStem, p.pillar.earthlyBranch),
      startYear,
      isCurrent: false,
    }
  })

  // 현재 대운 = 시작 나이가 만 나이 이하인 것 중 가장 늦게 시작한 것
  let currentLuck: LuckPillarView | null = null
  for (const p of luckPillars) {
    if (p.age <= age) currentLuck = p
  }
  if (currentLuck) currentLuck.isCurrent = true

  // 세운 — 올해의 연주를 구한다. 6월 1일은 입춘을 확실히 지난 시점이라 안전하다.
  const thisYear = now.getFullYear()
  const yearly = calculateFourPillars({
    year: thisYear,
    month: 6,
    day: 1,
    hour: 12,
    minute: 0,
  })
  const yearlyLuck = {
    year: thisYear,
    korean: `${yearly.year.heavenlyStem}${yearly.year.earthlyBranch}`,
    hanja: `${stemHanja(yearly.year.heavenlyStem)}${branchHanja(yearly.year.earthlyBranch)}`,
    stemTenGod: getTenGod(dayStem, yearly.year.heavenlyStem) as TenGod | '일간',
    branchTenGod: getBranchTenGod(dayStem, yearly.year.earthlyBranch),
  }

  // 안내 문구
  const notes: string[] = []
  const sajuYearIndex = HEAVENLY_STEMS.indexOf(detail.year.heavenlyStem)
  const calendarYearStem = HEAVENLY_STEMS[(solar.year + 6) % 10]
  if (HEAVENLY_STEMS[sajuYearIndex] !== calendarYearStem) {
    const ipchun = getSolarTermsOfYear(solar.year).find((t) => t.name === '입춘')
    const when = ipchun ? formatKst(ipchun.date) : ''
    notes.push(
      `사주의 해는 양력 1월 1일이 아니라 입춘에 바뀝니다. ${solar.year}년 입춘은 ${when}이라, ` +
        `이 생일은 아직 ${solar.year - 1}년의 기운에 속합니다. 그래서 연주가 ${detail.yearString}입니다.`,
    )
  }
  if (hourUnknown) {
    notes.push(
      '태어난 시각을 모르셔서 시주를 비웠습니다. 나머지 세 기둥으로 해석하며, 자식운과 노년운은 정확도가 떨어집니다.',
    )
  }
  if (input.applyTrueSolarTime) {
    notes.push(
      '진태양시를 적용했습니다. 우리 시계는 동경 135도 기준이고 한국은 그보다 서쪽이라, 시계 시각보다 실제 태양은 약 30분 늦습니다. 이 보정으로 시주가 한 칸 바뀌기도 합니다.',
    )
  }
  if (input.calendar === 'lunar') {
    notes.push(
      `음력 ${input.year}년 ${input.month}월 ${input.day}일${input.isLeapMonth ? ' (윤달)' : ''}은 양력 ${solar.year}년 ${solar.month}월 ${solar.day}일입니다.`,
    )
  }

  return {
    input,
    hourUnknown,
    solar,
    lunar,
    pillars,
    dayMaster: {
      stem: dayStem,
      hanja: stemHanja(dayStem),
      element: getHeavenlyStemElement(dayStem),
      yinYang: getHeavenlyStemYinYang(dayStem),
    },
    elementCounts,
    missingElements,
    dominantElement,
    tenGodCounts,
    voidBranches,
    luckPillars,
    luckForward: info?.forward ?? true,
    luckStartAge: info?.startAge ?? 0,
    currentLuck,
    yearlyLuck,
    age,
    notes,
  }
}

/** 절입 시각을 '2월 4일 23시 43분' 형태의 한국 시각으로 표기한다. */
function formatKst(date: Date): string {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('month')}월 ${get('day')}일 ${get('hour')}시 ${get('minute')}분`
}

function calcAge(
  solar: { year: number; month: number; day: number },
  now: Date,
): number {
  let age = now.getFullYear() - solar.year
  const hadBirthday =
    now.getMonth() + 1 > solar.month ||
    (now.getMonth() + 1 === solar.month && now.getDate() >= solar.day)
  if (!hadBirthday) age -= 1
  return Math.max(age, 0)
}

/* ------------------------------------------------------------------ */
/* 입력 검증                                                            */
/* ------------------------------------------------------------------ */

export function validateInput(raw: unknown): SajuInput {
  const v = raw as Partial<SajuInput>
  const err = (m: string) => {
    throw new Error(m)
  }

  const year = Number(v.year)
  const month = Number(v.month)
  const day = Number(v.day)

  if (!Number.isInteger(year) || year < 1900 || year > 2100)
    err('연도는 1900년에서 2100년 사이로 입력해 주세요.')
  if (!Number.isInteger(month) || month < 1 || month > 12) err('월은 1에서 12 사이여야 합니다.')
  if (!Number.isInteger(day) || day < 1 || day > 31) err('일은 1에서 31 사이여야 합니다.')

  const hour = v.hour === null || v.hour === undefined ? null : Number(v.hour)
  if (hour !== null && (!Number.isInteger(hour) || hour < 0 || hour > 23))
    err('시는 0에서 23 사이여야 합니다.')

  const minute = Number(v.minute ?? 0)
  if (!Number.isInteger(minute) || minute < 0 || minute > 59)
    err('분은 0에서 59 사이여야 합니다.')

  const calendar = v.calendar === 'lunar' ? 'lunar' : 'solar'
  const gender: Gender = v.gender === 'female' ? 'female' : 'male'

  const longitude = Number(v.longitude ?? DEFAULT_PLACE.longitude)
  if (!Number.isFinite(longitude) || longitude < 124 || longitude > 132)
    err('출생지 경도가 한반도 범위를 벗어났습니다.')

  const dayBoundary: DayBoundary =
    v.dayBoundary === 'jasi' || v.dayBoundary === 'splitJasi' ? v.dayBoundary : 'midnight'

  return {
    year,
    month,
    day,
    hour,
    minute,
    calendar,
    isLeapMonth: Boolean(v.isLeapMonth),
    gender,
    longitude,
    applyTrueSolarTime: v.applyTrueSolarTime !== false,
    dayBoundary,
  }
}
