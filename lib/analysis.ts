/**
 * 사주 심화 분석: 지장간, 합충, 신강신약, 용신.
 *
 * lib/saju.ts 가 여덟 글자를 뽑는다면, 이 파일은 그 글자들 사이의 관계를 읽는다.
 * 실제 명리 상담은 여기서부터 시작한다. 글자만 늘어놓아서는 해석이 겉돈다.
 *
 * 주의: 신강신약과 용신은 유파마다 기준이 다르다. 그래서 결과만 내놓지 않고
 * 어느 글자에 몇 점을 줬는지 근거를 전부 함께 돌려준다. 화면에도 그대로 보여준다.
 */

import { getHeavenlyStemElement } from 'manseryeok'
import type { EarthlyBranch, FiveElement, HeavenlyStem, TenGod } from 'manseryeok'
import type { SajuChart } from './saju'
import { josa, josaAfterParen } from './korean'
import { findSpirits, voidBranchesOf, type PillarSpirits } from './spirits'

/* ------------------------------------------------------------------ */
/* 오행 상생·상극                                                       */
/* ------------------------------------------------------------------ */

/** A 가 생(生)하는 오행. 목생화, 화생토, 토생금, 금생수, 수생목 */
export const GENERATES: Record<FiveElement, FiveElement> = {
  목: '화',
  화: '토',
  토: '금',
  금: '수',
  수: '목',
}

/** A 가 극(剋)하는 오행. 목극토, 토극수, 수극화, 화극금, 금극목 */
export const CONTROLS: Record<FiveElement, FiveElement> = {
  목: '토',
  토: '수',
  수: '화',
  화: '금',
  금: '목',
}

/** A 를 생해주는 오행 (GENERATES 의 역방향) */
export const GENERATED_BY: Record<FiveElement, FiveElement> = {
  화: '목',
  토: '화',
  금: '토',
  수: '금',
  목: '수',
}

/* ------------------------------------------------------------------ */
/* 지장간 (支藏干)                                                      */
/* ------------------------------------------------------------------ */

/**
 * 지지 속에 숨어 있는 천간.
 *
 * 지지 하나는 사실 천간 두셋을 품고 있다. 겉으로는 한 글자지만 속은 여럿이다.
 * 여기(餘氣)는 지난 계절이 남긴 기운, 중기(中氣)는 삼합이 만드는 기운,
 * 정기(正氣)는 그 지지 본래의 기운이다. 괄호 안 숫자는 한 달 30일 중 차지하는 날수다.
 */
export const HIDDEN_STEMS: Record<
  EarthlyBranch,
  { stem: HeavenlyStem; role: '여기' | '중기' | '정기'; days: number }[]
> = {
  자: [
    { stem: '임', role: '여기', days: 10 },
    { stem: '계', role: '정기', days: 20 },
  ],
  축: [
    { stem: '계', role: '여기', days: 9 },
    { stem: '신', role: '중기', days: 3 },
    { stem: '기', role: '정기', days: 18 },
  ],
  인: [
    { stem: '무', role: '여기', days: 7 },
    { stem: '병', role: '중기', days: 7 },
    { stem: '갑', role: '정기', days: 16 },
  ],
  묘: [
    { stem: '갑', role: '여기', days: 10 },
    { stem: '을', role: '정기', days: 20 },
  ],
  진: [
    { stem: '을', role: '여기', days: 9 },
    { stem: '계', role: '중기', days: 3 },
    { stem: '무', role: '정기', days: 18 },
  ],
  사: [
    { stem: '무', role: '여기', days: 7 },
    { stem: '경', role: '중기', days: 7 },
    { stem: '병', role: '정기', days: 16 },
  ],
  오: [
    { stem: '병', role: '여기', days: 10 },
    { stem: '기', role: '중기', days: 9 },
    { stem: '정', role: '정기', days: 11 },
  ],
  미: [
    { stem: '정', role: '여기', days: 9 },
    { stem: '을', role: '중기', days: 3 },
    { stem: '기', role: '정기', days: 18 },
  ],
  신: [
    { stem: '무', role: '여기', days: 7 },
    { stem: '임', role: '중기', days: 7 },
    { stem: '경', role: '정기', days: 16 },
  ],
  유: [
    { stem: '경', role: '여기', days: 10 },
    { stem: '신', role: '정기', days: 20 },
  ],
  술: [
    { stem: '신', role: '여기', days: 9 },
    { stem: '정', role: '중기', days: 3 },
    { stem: '무', role: '정기', days: 18 },
  ],
  해: [
    { stem: '무', role: '여기', days: 7 },
    { stem: '갑', role: '중기', days: 7 },
    { stem: '임', role: '정기', days: 16 },
  ],
}

/** '을계무' 처럼 한 줄로 표기한다 */
export function hiddenStemsLabel(branch: EarthlyBranch): string {
  return HIDDEN_STEMS[branch].map((h) => h.stem).join('')
}

/* ------------------------------------------------------------------ */
/* 합충형파해 (合沖刑破害)                                              */
/* ------------------------------------------------------------------ */

export type RelationKind =
  | '천간합'
  | '천간충'
  | '삼합'
  | '반합'
  | '방합'
  | '방합반합'
  | '육합'
  | '충'
  | '형'
  | '자형'
  | '파'
  | '해'

export interface Relation {
  kind: RelationKind
  /** '인신충' 처럼 부르는 이름 */
  name: string
  /** 관계에 참여한 자리. 예: ['연지', '월지'] */
  positions: string[]
  /** 참여한 글자. 예: ['인', '신'] */
  chars: string[]
  /** 합이 만들어내는 오행. 충·형·파·해는 없다 */
  produces?: FiveElement
  /** 쉬운 말 설명 */
  note: string
}

/** 천간합 — 두 천간이 서로 끌어당겨 다른 오행으로 변한다 */
const STEM_COMBINES: [HeavenlyStem, HeavenlyStem, FiveElement][] = [
  ['갑', '기', '토'],
  ['을', '경', '금'],
  ['병', '신', '수'],
  ['정', '임', '목'],
  ['무', '계', '화'],
]

/** 천간충 — 오행이 서로 극하면서 음양이 같아 정면으로 부딪친다 */
const STEM_CLASHES: [HeavenlyStem, HeavenlyStem][] = [
  ['갑', '경'],
  ['을', '신'],
  ['병', '임'],
  ['정', '계'],
]

/** 삼합 — 세 글자가 모여 하나의 큰 기운(국)을 이룬다. 가운데가 왕지(旺支) */
const TRIPLE_COMBINES: [EarthlyBranch, EarthlyBranch, EarthlyBranch, FiveElement][] = [
  ['신', '자', '진', '수'],
  ['해', '묘', '미', '목'],
  ['인', '오', '술', '화'],
  ['사', '유', '축', '금'],
]

/** 방합 — 같은 계절, 같은 방위의 세 글자 */
const DIRECTION_COMBINES: [EarthlyBranch, EarthlyBranch, EarthlyBranch, FiveElement][] = [
  ['인', '묘', '진', '목'],
  ['사', '오', '미', '화'],
  ['신', '유', '술', '금'],
  ['해', '자', '축', '수'],
]

/** 육합 — 두 글자가 짝을 이룬다 */
const SIX_COMBINES: [EarthlyBranch, EarthlyBranch, FiveElement][] = [
  ['자', '축', '토'],
  ['인', '해', '목'],
  ['묘', '술', '화'],
  ['진', '유', '금'],
  ['사', '신', '수'],
  ['오', '미', '토'],
]

/** 지지충 — 정반대에 놓여 정면으로 부딪친다 */
const BRANCH_CLASHES: [EarthlyBranch, EarthlyBranch][] = [
  ['자', '오'],
  ['축', '미'],
  ['인', '신'],
  ['묘', '유'],
  ['진', '술'],
  ['사', '해'],
]

/** 삼형 — 세 글자가 얽혀 서로를 괴롭힌다 */
const TRIPLE_PUNISH: [EarthlyBranch, EarthlyBranch, EarthlyBranch, string][] = [
  ['인', '사', '신', '무은지형'],
  ['축', '술', '미', '지세지형'],
]

/** 상형 — 두 글자끼리의 형 */
const PAIR_PUNISH: [EarthlyBranch, EarthlyBranch, string][] = [['자', '묘', '무례지형']]

/** 자형 — 같은 글자가 겹쳐 스스로를 괴롭힌다 */
const SELF_PUNISH: EarthlyBranch[] = ['진', '오', '유', '해']

/** 파 — 관계를 깨뜨린다 */
const BRANCH_BREAKS: [EarthlyBranch, EarthlyBranch][] = [
  ['자', '유'],
  ['축', '진'],
  ['인', '해'],
  ['묘', '오'],
  ['사', '신'],
  ['미', '술'],
]

/** 해 — 은근히 방해한다 */
const BRANCH_HARMS: [EarthlyBranch, EarthlyBranch][] = [
  ['자', '미'],
  ['축', '오'],
  ['인', '사'],
  ['묘', '진'],
  ['신', '해'],
  ['유', '술'],
]

interface Slot<T> {
  pos: string
  char: T
}

/**
 * 사주 여덟 글자 사이의 관계를 전부 찾는다.
 *
 * 삼합이 성립하면 그 안의 반합은 따로 세지 않는다. 중복 표시는 오히려 헷갈린다.
 */
export function findRelations(chart: SajuChart): Relation[] {
  const stems: Slot<HeavenlyStem>[] = chart.pillars.map((p) => ({
    pos: `${p.label}간`,
    char: p.stem,
  }))
  const branches: Slot<EarthlyBranch>[] = chart.pillars.map((p) => ({
    pos: `${p.label}지`,
    char: p.branch,
  }))

  const out: Relation[] = []

  // --- 천간합 / 천간충 ---
  for (let i = 0; i < stems.length; i++) {
    for (let j = i + 1; j < stems.length; j++) {
      const a = stems[i]
      const b = stems[j]
      const combine = STEM_COMBINES.find(
        ([x, y]) => (x === a.char && y === b.char) || (x === b.char && y === a.char),
      )
      if (combine) {
        out.push({
          kind: '천간합',
          name: `${a.char}${b.char}합${combine[2]}`,
          positions: [a.pos, b.pos],
          chars: [a.char, b.char],
          produces: combine[2],
          note: `${a.pos}과 ${b.pos}이 서로 끌어당깁니다. 두 글자가 묶이면서 ${combine[2]}의 성질을 띠려 합니다.`,
        })
      }
      const clash = STEM_CLASHES.find(
        ([x, y]) => (x === a.char && y === b.char) || (x === b.char && y === a.char),
      )
      if (clash) {
        out.push({
          kind: '천간충',
          name: `${a.char}${b.char}충`,
          positions: [a.pos, b.pos],
          chars: [a.char, b.char],
          note: `${a.pos}과 ${b.pos}이 정면으로 부딪칩니다. 생각과 명분이 충돌하기 쉽습니다.`,
        })
      }
    }
  }

  // --- 삼합 / 방합 (세 글자) ---
  const usedInTriple = new Set<string>()

  const addTriple = (
    table: [EarthlyBranch, EarthlyBranch, EarthlyBranch, FiveElement][],
    kind: '삼합' | '방합',
  ) => {
    for (const [x, y, z, el] of table) {
      const sx = branches.find((b) => b.char === x)
      const sy = branches.find((b) => b.char === y)
      const sz = branches.find((b) => b.char === z)
      if (sx && sy && sz) {
        for (const s of [sx, sy, sz]) usedInTriple.add(`${kind}:${s.pos}`)
        out.push({
          kind,
          name: `${x}${y}${z}${kind}`,
          positions: [sx.pos, sy.pos, sz.pos],
          chars: [x, y, z],
          produces: el,
          note: `세 글자가 모여 ${el} 기운의 큰 덩어리를 이룹니다. 글자 수만 세면 ${josa(el, '이/가')} 적어 보여도, 실제로는 ${josa(el, '이/가')} 사주를 이끄는 힘이 됩니다.`,
        })
      }
    }
  }

  addTriple(TRIPLE_COMBINES, '삼합')
  addTriple(DIRECTION_COMBINES, '방합')

  // --- 반합 (삼합 중 두 글자) ---
  for (const [x, y, z, el] of TRIPLE_COMBINES) {
    const trio: EarthlyBranch[] = [x, y, z]
    const king = y // 가운데가 왕지
    for (const [a, b] of [
      [x, y],
      [y, z],
      [x, z],
    ] as [EarthlyBranch, EarthlyBranch][]) {
      const sa = branches.find((s) => s.char === a)
      const sb = branches.find((s) => s.char === b)
      if (!sa || !sb) continue
      // 세 글자가 다 있으면 이미 삼합으로 잡았다
      if (trio.every((c) => branches.some((s) => s.char === c))) continue
      const hasKing = a === king || b === king
      out.push({
        kind: hasKing ? '반합' : '방합반합',
        name: `${a}${b}반합`,
        positions: [sa.pos, sb.pos],
        chars: [a, b],
        produces: el,
        note: hasKing
          ? `${el} 삼합의 절반입니다. 왕지가 들어 있어 ${el} 기운이 제법 살아납니다.`
          : `${el} 삼합에서 가운데 글자가 빠진 모양입니다. 기운이 약하게 맺힙니다.`,
      })
    }
  }

  // --- 방합 반합 (방합 중 두 글자) ---
  for (const [x, y, z, el] of DIRECTION_COMBINES) {
    const trio: EarthlyBranch[] = [x, y, z]
    if (trio.every((c) => branches.some((s) => s.char === c))) continue
    for (const [a, b] of [
      [x, y],
      [y, z],
      [x, z],
    ] as [EarthlyBranch, EarthlyBranch][]) {
      const sa = branches.find((s) => s.char === a)
      const sb = branches.find((s) => s.char === b)
      if (!sa || !sb) continue
      // 삼합 반합으로 이미 잡힌 짝은 건너뛴다
      if (out.some((r) => r.chars.length === 2 && r.chars.includes(a) && r.chars.includes(b) && r.kind === '반합'))
        continue
      out.push({
        kind: '방합반합',
        name: `${a}${b}반합`,
        positions: [sa.pos, sb.pos],
        chars: [a, b],
        produces: el,
        note: `${el} 방합에서 한 글자가 빠진 모양입니다. ${el} 기운이 약하게 맺힙니다.`,
      })
    }
  }

  // --- 육합 / 충 / 형 / 파 / 해 (두 글자) ---
  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      const a = branches[i]
      const b = branches[j]
      const pair = (t: [EarthlyBranch, EarthlyBranch]) =>
        (t[0] === a.char && t[1] === b.char) || (t[0] === b.char && t[1] === a.char)

      const six = SIX_COMBINES.find(([x, y]) => pair([x, y]))
      if (six) {
        out.push({
          kind: '육합',
          name: `${a.char}${b.char}육합`,
          positions: [a.pos, b.pos],
          chars: [a.char, b.char],
          produces: six[2],
          note: `${a.pos}와 ${b.pos}가 짝을 이뤄 묶입니다. 두 자리의 일이 서로 얽힙니다.`,
        })
      }

      if (BRANCH_CLASHES.some(pair)) {
        out.push({
          kind: '충',
          name: `${a.char}${b.char}충`,
          positions: [a.pos, b.pos],
          chars: [a.char, b.char],
          note: `${a.pos}와 ${b.pos}가 정면으로 부딪칩니다. 두 자리가 뜻하는 일에 변동과 이동이 잦습니다.`,
        })
      }

      const punish = PAIR_PUNISH.find(([x, y]) => pair([x, y]))
      if (punish) {
        out.push({
          kind: '형',
          name: `${a.char}${b.char}형`,
          positions: [a.pos, b.pos],
          chars: [a.char, b.char],
          note: `${punish[2]}입니다. 예의나 선을 넘는 문제로 마찰이 생기기 쉽습니다.`,
        })
      }

      if (BRANCH_BREAKS.some(pair)) {
        out.push({
          kind: '파',
          name: `${a.char}${b.char}파`,
          positions: [a.pos, b.pos],
          chars: [a.char, b.char],
          note: `${a.pos}와 ${b.pos} 사이가 깨지기 쉽습니다. 진행하던 일이 중간에 틀어질 수 있습니다.`,
        })
      }

      if (BRANCH_HARMS.some(pair)) {
        out.push({
          kind: '해',
          name: `${a.char}${b.char}해`,
          positions: [a.pos, b.pos],
          chars: [a.char, b.char],
          note: `${a.pos}와 ${b.pos}가 서로를 은근히 방해합니다. 겉으로 드러나지 않는 불편이 쌓입니다.`,
        })
      }

      if (a.char === b.char && SELF_PUNISH.includes(a.char)) {
        out.push({
          kind: '자형',
          name: `${a.char}${a.char}자형`,
          positions: [a.pos, b.pos],
          chars: [a.char, b.char],
          note: '같은 글자가 겹쳐 스스로를 괴롭힙니다. 혼자 마음을 갉아먹기 쉽습니다.',
        })
      }
    }
  }

  // --- 삼형 (세 글자) ---
  for (const [x, y, z, label] of TRIPLE_PUNISH) {
    const sx = branches.find((b) => b.char === x)
    const sy = branches.find((b) => b.char === y)
    const sz = branches.find((b) => b.char === z)
    if (sx && sy && sz) {
      out.push({
        kind: '형',
        name: `${x}${y}${z}삼형`,
        positions: [sx.pos, sy.pos, sz.pos],
        chars: [x, y, z],
        note: `${label}입니다. 세 글자가 얽혀 관재나 갈등이 생기기 쉬운 구조입니다.`,
      })
    }
  }

  return out
}

/* ------------------------------------------------------------------ */
/* 신강신약 (身强身弱)                                                  */
/* ------------------------------------------------------------------ */

/**
 * 자리마다 힘의 크기가 다르다. 월지가 압도적으로 세고, 천간은 지지보다 가볍다.
 * 합쳐서 100 이 되도록 맞췄다. 일간 자신은 기준점이므로 점수에서 뺀다.
 */
const POSITION_WEIGHT: Record<string, number> = {
  월지: 32,
  일지: 16,
  시지: 11,
  연지: 11,
  월간: 12,
  시간: 10,
  연간: 8,
}

/** 시각을 모르면 시주가 없으므로, 남은 자리로 100을 다시 나눈다 */
function normalizedWeights(positions: string[]): Record<string, number> {
  const total = positions.reduce((s, p) => s + (POSITION_WEIGHT[p] ?? 0), 0)
  const out: Record<string, number> = {}
  for (const p of positions) out[p] = ((POSITION_WEIGHT[p] ?? 0) / total) * 100
  return out
}

/** 일간에서 본 오행의 역할. 십신 열 가지를 오행 단위 다섯으로 묶은 것이다. */
export type DayRole = '비겁' | '인성' | '식상' | '재성' | '관성'

export function elementRole(day: FiveElement, el: FiveElement): DayRole {
  if (el === day) return '비겁'
  if (GENERATED_BY[day] === el) return '인성'
  if (GENERATES[day] === el) return '식상'
  if (CONTROLS[day] === el) return '재성'
  return '관성'
}

/**
 * 역할마다 일간에게 보태는 정도(0~1). 자리 점수에 이 값을 곱한다.
 *
 * 예전에는 비겁과 인성이면 자리 점수를 통째로 주고 나머지는 0을 줬다.
 * 그런데 일곱 자리가 다섯 역할에 고루 흩어지니, 점수를 받는 자리는 평균 다섯 중 둘뿐이라
 * 점수가 40 근처에 깔렸다. 신약 기준이 40 미만이라 절반 넘는 사주가 신약으로 몰렸다.
 *
 * 실제 명리는 그렇게 딱 잘라 보지 않는다. 식상은 내 기운을 쓰는 것이지 빼앗기는 게 아니고,
 * 재성은 내가 쥐는 대상이며, 관성이라야 나를 정면으로 누른다. 눌리는 정도가 저마다 다르다.
 * 그래서 역할마다 다른 비율을 준다. 다섯 값의 평균이 0.5라 점수가 가운데로 모인다.
 */
const ROLE_CREDIT: Record<DayRole, number> = {
  비겁: 1,
  인성: 0.9,
  식상: 0.3,
  재성: 0.2,
  관성: 0.1,
}

/** 지지 속 천간 하나가 차지하는 몫과 그 역할 */
export interface HiddenPart {
  stem: HeavenlyStem
  element: FiveElement
  role: DayRole
  /** 한 달 30일 중 차지하는 날수 */
  days: number
}

/**
 * 지지 한 글자가 일간에게 보태는 정도.
 *
 * 지지는 겉으로 한 글자지만 속에 천간을 두셋 품고 있다(지장간).
 * 겉 글자가 남이어도 속에 내 편이 앉아 있을 수 있고, 그 반대도 있다.
 * 그래서 지장간이 차지하는 날수만큼 무게를 나눠 평균을 낸다.
 */
function branchCredit(day: FiveElement, branch: EarthlyBranch): { credit: number; parts: HiddenPart[] } {
  const parts: HiddenPart[] = HIDDEN_STEMS[branch].map((h) => {
    const element = getHeavenlyStemElement(h.stem)
    return { stem: h.stem, element, role: elementRole(day, element), days: h.days }
  })
  const total = parts.reduce((s, p) => s + p.days, 0)
  const credit = parts.reduce((s, p) => s + ROLE_CREDIT[p.role] * p.days, 0) / total
  return { credit, parts }
}

export interface StrengthRow {
  position: string
  char: string
  hanja: string
  element: FiveElement
  tenGod: TenGod | '일간'
  /** 일간에서 본 역할 */
  role: DayRole
  /** 이 자리가 일간에게 보태는 비율 0~1 */
  credit: number
  /** 실제로 더해진 점수 = weight × credit */
  points: number
  /** 절반 넘게 보태면 일간 편으로 본다 */
  helps: boolean
  /** 왜 그만큼 보태는지 */
  reason: string
  /** 지지라면 지장간 내역. 천간이면 빈 배열 */
  hidden: HiddenPart[]
  weight: number
}

export interface Strength {
  /** 0~100. 클수록 신강 */
  score: number
  /** '신약' | '중화' | '신강' */
  verdict: '신약' | '중화' | '신강'
  rows: StrengthRow[]
  /** 월지가 일간을 돕는가 */
  hasSeason: boolean
  /** 일지가 일간을 돕는가 */
  hasGround: boolean
  /** 일간과 같은 편의 오행 (비겁 + 인성) */
  allyElements: FiveElement[]
  summary: string
}

/** 역할마다 왜 그만큼 보태는지 한 줄로 풀어 쓴다 */
function roleReason(day: FiveElement, el: FiveElement, role: DayRole): string {
  switch (role) {
    case '비겁':
      return `일간과 같은 ${el}이라 힘을 그대로 보탭니다`
    case '인성':
      return `${josa(el, '이/가')} ${josa(day, '을/를')} 생(生)해 일간을 거의 그대로 돕습니다`
    case '식상':
      return `일간이 ${josa(el, '을/를')} 생하느라 기운을 내보냅니다. 빼앗기는 건 아니라 조금은 남습니다`
    case '재성':
      return `일간이 ${josa(el, '을/를')} 극해 쥐는 자리입니다. 다스리는 데 힘이 들어갑니다`
    case '관성':
      return `${josa(el, '이/가')} ${josa(day, '을/를')} 극해 일간을 정면으로 누릅니다`
  }
}

/**
 * 신강신약을 매긴다.
 *
 * 자리마다 점수(weight)를 주고, 그 자리가 일간에게 얼마나 보태는지(credit, 0~1)를 곱해 더한다.
 * 다섯 역할에 매긴 비율의 평균이 정확히 0.5라, 50점이 어느 쪽으로도 기울지 않은 한가운데다.
 * 거기서 56점 이상이면 신강, 44점 이하면 신약, 45~55는 중화로 본다.
 *
 * credit 은 두 가지로 정해진다.
 *  - 천간은 그 글자의 역할(비겁·인성·식상·재성·관성)에 매긴 비율을 그대로 쓴다.
 *  - 지지는 속에 품은 천간(지장간)마다 역할을 따져 날수만큼 무게를 나눠 평균을 낸다.
 *
 * 이 기준은 유파마다 다르다. 그래서 점수만 내놓지 않고 rows 에 근거를 전부 담아
 * 화면과 AI 프롬프트에서 "어느 글자에 몇 점을 줬는지"를 그대로 보여준다.
 */
export function judgeStrength(chart: SajuChart): Strength {
  const dayElement = chart.dayMaster.element
  const allyElements = [dayElement, GENERATED_BY[dayElement]] // 비겁 + 인성

  interface Slot {
    position: string
    char: string
    hanja: string
    element: FiveElement
    tenGod: TenGod | '일간'
    isBranch: boolean
    branch?: EarthlyBranch
  }

  const slots: Slot[] = []

  for (const p of chart.pillars) {
    // 일간 자신은 기준점이라 점수에서 뺀다
    if (p.label !== '일') {
      slots.push({
        position: `${p.label}간`,
        char: p.stem,
        hanja: p.stemHanja,
        element: p.stemElement,
        tenGod: p.stemTenGod,
        isBranch: false,
      })
    }
    slots.push({
      position: `${p.label}지`,
      char: p.branch,
      hanja: p.branchHanja,
      element: p.branchElement,
      tenGod: p.branchTenGod,
      isBranch: true,
      branch: p.branch,
    })
  }

  const weights = normalizedWeights(slots.map((s) => s.position))

  const rows: StrengthRow[] = slots.map((s) => {
    const role = elementRole(dayElement, s.element)
    const weight = Math.round(weights[s.position] * 10) / 10

    let credit: number
    let hidden: HiddenPart[]
    let reason: string

    if (s.isBranch) {
      const c = branchCredit(dayElement, s.branch!)
      credit = c.credit
      hidden = c.parts
      const allies = hidden.filter((h) => h.role === '비겁' || h.role === '인성')
      const mix = hidden.map((h) => `${h.stem}(${h.role})`).join('·')
      reason =
        allies.length > 0 && allies.length < hidden.length
          ? `${roleReason(dayElement, s.element, role)}. 다만 속에 ${mix}를 품어 절반은 다르게 셉니다`
          : `${roleReason(dayElement, s.element, role)}. 속에 품은 ${mix}도 같은 결입니다`
    } else {
      credit = ROLE_CREDIT[role]
      hidden = []
      reason = roleReason(dayElement, s.element, role)
    }

    return {
      position: s.position,
      char: s.char,
      hanja: s.hanja,
      element: s.element,
      tenGod: s.tenGod,
      role,
      credit: Math.round(credit * 100) / 100,
      points: Math.round(weight * credit * 10) / 10,
      helps: credit >= 0.5,
      reason,
      hidden,
      weight,
    }
  })

  const score = Math.round(rows.reduce((sum, r) => sum + r.points, 0))
  const verdict: Strength['verdict'] = score >= 56 ? '신강' : score <= 44 ? '신약' : '중화'

  const monthRow = rows.find((r) => r.position === '월지')
  const dayGroundRow = rows.find((r) => r.position === '일지')
  const hasSeason = monthRow?.helps ?? false
  const hasGround = dayGroundRow?.helps ?? false

  const summary =
    `${chart.dayMaster.stem}(${chart.dayMaster.hanja}) 일간이 ` +
    `${hasSeason ? '태어난 달의 기운을 얻었고' : '태어난 달의 기운을 얻지 못했고'}, ` +
    `${hasGround ? '앉은 자리도 일간 편입니다' : '앉은 자리는 일간 편이 아닙니다'}. ` +
    `자리마다 일간을 얼마나 보태는지 따져 더하면 ${score}점으로 ${verdict}으로 봅니다.`

  return { score, verdict, rows, hasSeason, hasGround, allyElements, summary }
}

/* ------------------------------------------------------------------ */
/* 용신 (用神)                                                          */
/* ------------------------------------------------------------------ */

export interface Yongsin {
  /** 나에게 이로운 오행 */
  favorable: FiveElement[]
  /** 나에게 부담이 되는 오행 */
  unfavorable: FiveElement[]
  /** 억부(抑扶) 기준의 설명 */
  reason: string
  /** 계절로 본 조후(調候) 조언. 해당 없으면 null */
  seasonNote: string | null
  /** 용신에 해당하는데 사주에 없는 오행 */
  missingFavorable: FiveElement[]
}

/**
 * 억부용신(抑扶用神)을 정한다.
 *
 * 신강하면 덜어내는 오행이, 신약하면 보태는 오행이 이롭다는 가장 기본 원리를 쓴다.
 * 명리에는 조후, 병약, 통관 등 다른 기준도 있어 결론이 갈릴 수 있다.
 * 그래서 계절로 본 조후 조언을 따로 덧붙여, 두 기준이 엇갈리면 그것도 드러나게 했다.
 */
export function pickYongsin(chart: SajuChart, strength: Strength): Yongsin {
  const day = chart.dayMaster.element
  const output = GENERATES[day] // 식상 — 내가 생하는 것
  const wealth = CONTROLS[day] // 재성 — 내가 극하는 것
  const officer = findOfficer(day) // 관성 — 나를 극하는 것
  const resource = GENERATED_BY[day] // 인성 — 나를 생하는 것
  const peer = day // 비겁

  let favorable: FiveElement[]
  let unfavorable: FiveElement[]
  let reason: string

  if (strength.verdict === '신강') {
    favorable = [output, wealth, officer]
    unfavorable = [resource, peer]
    reason =
      `일간이 강하니 힘을 덜어내는 쪽이 이롭습니다. ` +
      `기운을 밖으로 내보내는 ${output}(식상), 다스릴 대상이 되는 ${wealth}(재성), ` +
      `나를 잡아주는 ${josaAfterParen(officer, '관성', '이/가')} 도움이 됩니다. ` +
      `반대로 더 보태는 ${josaAfterParen(resource, '인성', '과/와')} ${josaAfterParen(peer, '비겁', '은/는')} 과해지기 쉽습니다.`
  } else if (strength.verdict === '신약') {
    favorable = [resource, peer]
    unfavorable = [output, wealth, officer]
    reason =
      `일간이 약하니 힘을 보태는 쪽이 이롭습니다. ` +
      `나를 생해주는 ${josaAfterParen(resource, '인성', '과/와')} 같은 편인 ${josaAfterParen(peer, '비겁', '이/가')} 도움이 됩니다. ` +
      `반대로 기운을 빼는 ${output}(식상), ${wealth}(재성), ${josaAfterParen(officer, '관성', '은/는')} 부담이 됩니다.`
  } else {
    favorable = [output, wealth]
    unfavorable = []
    reason =
      `강하지도 약하지도 않은 중화에 가깝습니다. ` +
      `한쪽으로 크게 기울지 않았으니, 사주에서 부족한 오행을 채우는 방향이 무난합니다.`
  }

  // 중복 제거
  favorable = [...new Set(favorable)]
  unfavorable = [...new Set(unfavorable)].filter((e) => !favorable.includes(e))

  const missingFavorable = favorable.filter((e) => (chart.elementCounts[e] ?? 0) === 0)

  return {
    favorable,
    unfavorable,
    reason,
    seasonNote: seasonAdvice(chart),
    missingFavorable,
  }
}

/** 나를 극하는 오행을 찾는다 (관성) */
function findOfficer(day: FiveElement): FiveElement {
  return (Object.keys(CONTROLS) as FiveElement[]).find((e) => CONTROLS[e] === day)!
}

/**
 * 조후(調候) — 계절의 춥고 더움을 고르는 관점.
 *
 * 겨울에 태어났는데 불이 없으면 춥고, 여름에 태어났는데 물이 없으면 메마르다.
 * 억부와 결론이 다를 수 있어 참고로만 덧붙인다.
 */
function seasonAdvice(chart: SajuChart): string | null {
  const monthBranch = chart.pillars.find((p) => p.label === '월')?.branch
  if (!monthBranch) return null

  const winter: EarthlyBranch[] = ['해', '자', '축']
  const summer: EarthlyBranch[] = ['사', '오', '미']
  const autumn: EarthlyBranch[] = ['신', '유', '술']

  const fire = chart.elementCounts['화'] ?? 0
  const water = chart.elementCounts['수'] ?? 0

  if (winter.includes(monthBranch) && fire === 0) {
    return '겨울에 태어났는데 사주에 화(火)가 없습니다. 조후로 보면 따뜻하게 덥혀줄 화 기운이 절실합니다.'
  }
  if (summer.includes(monthBranch) && water === 0) {
    return '여름에 태어났는데 사주에 수(水)가 없습니다. 조후로 보면 열기를 식혀줄 수 기운이 절실합니다.'
  }
  if (autumn.includes(monthBranch) && fire === 0) {
    return '가을에 태어났는데 사주에 화(火)가 없습니다. 가을 금은 단단하기만 하고 쓰임이 안 나오니, 조후로 보면 화 기운이 금을 벼려주는 역할을 합니다.'
  }
  return null
}

/* ------------------------------------------------------------------ */
/* 전체 묶음                                                            */
/* ------------------------------------------------------------------ */

export interface Analysis {
  hiddenStems: { position: string; branch: EarthlyBranch; label: string; detail: string }[]
  relations: Relation[]
  strength: Strength
  yongsin: Yongsin
  /** 기둥별 12운성, 12신살, 신살 */
  spirits: PillarSpirits[]
  /** 연주 기준 공망. 일주 기준은 chart.voidBranches 에 있다 */
  yearVoidBranches: EarthlyBranch[]
}

export function analyze(chart: SajuChart): Analysis {
  const strength = judgeStrength(chart)
  return {
    hiddenStems: chart.pillars.map((p) => ({
      position: p.labelFull,
      branch: p.branch,
      label: hiddenStemsLabel(p.branch),
      detail: HIDDEN_STEMS[p.branch]
        .map((h) => `${h.stem}(${h.role} ${h.days}일)`)
        .join(', '),
    })),
    relations: findRelations(chart),
    strength,
    yongsin: pickYongsin(chart, strength),
    spirits: findSpirits(chart),
    yearVoidBranches: (() => {
      const y = chart.pillars.find((p) => p.label === '연')!
      return voidBranchesOf(y.stem, y.branch)
    })(),
  }
}

