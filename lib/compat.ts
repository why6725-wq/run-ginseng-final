/**
 * 궁합(宮合).
 *
 * 두 사람의 사주를 나란히 놓고 그 사이 관계를 읽는다.
 *
 * 흔히 띠 궁합이나 일간 궁합만 보고 좋다 나쁘다를 가르지만,
 * 실제로 가장 크게 작용하는 건 "상대가 내게 부족한 기운을 채워주는가"다.
 * 그래서 용신을 채워주는지를 가장 무겁게 본다.
 *
 * 이 파일도 결과만 내놓지 않는다. 어느 대목에서 몇 점이 붙고 빠졌는지
 * 근거를 전부 함께 돌려준다. 궁합은 특히 유파마다 기준이 갈리는 영역이다.
 */

import type { EarthlyBranch, FiveElement, HeavenlyStem } from 'manseryeok'
import type { SajuChart } from './saju'
import { analyze, CONTROLS, GENERATES, type Analysis } from './analysis'
import { josa } from './korean'

/* ------------------------------------------------------------------ */
/* 두 글자 사이의 관계표 (한 사람 안의 관계와 표가 같다)                  */
/* ------------------------------------------------------------------ */

const STEM_COMBINES: [HeavenlyStem, HeavenlyStem, FiveElement][] = [
  ['갑', '기', '토'],
  ['을', '경', '금'],
  ['병', '신', '수'],
  ['정', '임', '목'],
  ['무', '계', '화'],
]

const STEM_CLASHES: [HeavenlyStem, HeavenlyStem][] = [
  ['갑', '경'],
  ['을', '신'],
  ['병', '임'],
  ['정', '계'],
]

const SIX_COMBINES: [EarthlyBranch, EarthlyBranch][] = [
  ['자', '축'],
  ['인', '해'],
  ['묘', '술'],
  ['진', '유'],
  ['사', '신'],
  ['오', '미'],
]

const TRIPLE_GROUPS: [EarthlyBranch, EarthlyBranch, EarthlyBranch, FiveElement][] = [
  ['신', '자', '진', '수'],
  ['해', '묘', '미', '목'],
  ['인', '오', '술', '화'],
  ['사', '유', '축', '금'],
]

const BRANCH_CLASHES: [EarthlyBranch, EarthlyBranch][] = [
  ['자', '오'],
  ['축', '미'],
  ['인', '신'],
  ['묘', '유'],
  ['진', '술'],
  ['사', '해'],
]

const BRANCH_HARMS: [EarthlyBranch, EarthlyBranch][] = [
  ['자', '미'],
  ['축', '오'],
  ['인', '사'],
  ['묘', '진'],
  ['신', '해'],
  ['유', '술'],
]

/** 원진(怨嗔) — 서로 미워하는 관계로 보는 짝 */
const BRANCH_RESENT: [EarthlyBranch, EarthlyBranch][] = [
  ['자', '미'],
  ['축', '오'],
  ['인', '유'],
  ['묘', '신'],
  ['진', '해'],
  ['사', '술'],
]

const pairIn = <T,>(table: [T, T][], a: T, b: T) =>
  table.some(([x, y]) => (x === a && y === b) || (x === b && y === a))

/** 합이 성립하면 그 합이 만드는 오행을 돌려준다. 아니면 null */
function stemCombineOf(a: HeavenlyStem, b: HeavenlyStem): FiveElement | null {
  const hit = STEM_COMBINES.find(
    ([x, y]) => (x === a && y === b) || (x === b && y === a),
  )
  return hit ? hit[2] : null
}

/* ------------------------------------------------------------------ */
/* 결과 타입                                                            */
/* ------------------------------------------------------------------ */

export interface CompatItem {
  /** 무엇을 본 대목인지 */
  title: string
  /** 점수에 더해지는 값. 음수면 깎인다 */
  score: number
  /** 좋게 보는 대목인지, 조심할 대목인지, 중립인지 */
  tone: 'good' | 'caution' | 'neutral'
  /** 쉬운 말 설명 */
  note: string
}

export interface CompatSection {
  key: 'yongsin' | 'dayStem' | 'dayBranch' | 'branches' | 'strength'
  title: string
  /** 이 대목의 최대 배점 */
  max: number
  /** 실제로 얻은 점수 */
  score: number
  items: CompatItem[]
}

export interface Compatibility {
  /** 0~100 */
  score: number
  /** 점수대별 한 줄 요약 */
  verdict: string
  sections: CompatSection[]
  /** 서로의 용신을 채워주는가 */
  fills: {
    aNeedsFromB: FiveElement[]
    bNeedsFromA: FiveElement[]
  }
  summary: string
}

/* ------------------------------------------------------------------ */
/* 메인                                                                */
/* ------------------------------------------------------------------ */

/**
 * 두 사주의 궁합을 본다.
 *
 * 배점은 네 덩어리다. 용신 40점, 일간 20점, 일지 20점, 나머지 지지 10점,
 * 신강신약 조합 10점. 합 100점이다.
 *
 * 용신에 가장 큰 비중을 둔 이유는, 궁합에서 실제로 체감되는 것이
 * "이 사람과 있으면 편하다 / 소모된다"이고 그게 부족한 기운이 채워지느냐와
 * 가장 가깝기 때문이다.
 */
export function judgeCompatibility(
  a: SajuChart,
  b: SajuChart,
  analysisA?: Analysis,
  analysisB?: Analysis,
): Compatibility {
  const anA = analysisA ?? analyze(a)
  const anB = analysisB ?? analyze(b)

  const sections: CompatSection[] = [
    yongsinSection(a, b, anA, anB),
    dayStemSection(a, b),
    dayBranchSection(a, b),
    otherBranchSection(a, b),
    strengthSection(anA, anB),
  ]

  const raw = sections.reduce((s, sec) => s + sec.score, 0)
  const score = Math.max(0, Math.min(100, Math.round(raw)))

  const fills = {
    aNeedsFromB: anA.yongsin.favorable.filter((el) => (b.elementCounts[el] ?? 0) >= 2),
    bNeedsFromA: anB.yongsin.favorable.filter((el) => (a.elementCounts[el] ?? 0) >= 2),
  }

  return {
    score,
    verdict: verdictOf(score),
    sections,
    fills,
    summary: summaryOf(score, sections),
  }
}

function verdictOf(score: number): string {
  if (score >= 80) return '서로를 채워주는 사이'
  if (score >= 65) return '잘 맞는 편'
  if (score >= 50) return '무난한 편'
  if (score >= 35) return '노력이 필요한 사이'
  return '부딪치기 쉬운 사이'
}

function summaryOf(score: number, sections: CompatSection[]): string {
  const best = [...sections].sort((x, y) => y.score / y.max - x.score / x.max)[0]
  const worst = [...sections].sort((x, y) => x.score / x.max - y.score / y.max)[0]
  return (
    `100점 기준 ${score}점으로 ${verdictOf(score)}입니다. ` +
    `${best.title}에서 가장 잘 맞고, ${worst.title}에서 가장 신경 쓸 부분이 있습니다. ` +
    `점수는 참고일 뿐이고, 아래 항목별 근거를 직접 보시는 편이 훨씬 쓸모 있습니다.`
  )
}

/* ------------------------------------------------------------------ */
/* 1. 용신 — 서로에게 필요한 기운을 채워주는가 (40점)                    */
/* ------------------------------------------------------------------ */

function yongsinSection(
  a: SajuChart,
  b: SajuChart,
  anA: Analysis,
  anB: Analysis,
): CompatSection {
  const items: CompatItem[] = []
  const MAX = 40
  let score = 0

  const check = (
    me: SajuChart,
    other: SajuChart,
    anMe: Analysis,
    meLabel: string,
    otherLabel: string,
  ) => {
    for (const el of anMe.yongsin.favorable) {
      const mine = me.elementCounts[el] ?? 0
      const theirs = other.elementCounts[el] ?? 0
      // 내게 부족한 용신을 상대가 넉넉히 갖고 있으면 크게 좋다
      if (mine === 0 && theirs >= 2) {
        score += 10
        items.push({
          title: `${otherLabel}이 ${meLabel}의 ${el} 기운을 채워줌`,
          score: 10,
          tone: 'good',
          note: `${meLabel}에게 이로운 ${josa(el, '은/는')} 사주에 하나도 없는데 ${otherLabel}은 ${theirs}개를 갖고 있습니다. 곁에 있는 것만으로 부족한 기운이 채워지는 관계입니다.`,
        })
      } else if (mine <= 1 && theirs >= 2) {
        score += 6
        items.push({
          title: `${otherLabel}이 ${meLabel}의 ${el} 기운을 보태줌`,
          score: 6,
          tone: 'good',
          note: `${meLabel}에게 이로운 ${el} 기운이 부족한 편인데 ${otherLabel}이 넉넉히 갖고 있어 보탬이 됩니다.`,
        })
      }
    }

    // 상대가 내 기신을 잔뜩 갖고 있으면 부담이 된다
    for (const el of anMe.yongsin.unfavorable) {
      const theirs = other.elementCounts[el] ?? 0
      if (theirs >= 3) {
        score -= 5
        items.push({
          title: `${otherLabel}의 ${el} 기운이 ${meLabel}에게 부담`,
          score: -5,
          tone: 'caution',
          note: `${meLabel}에게 이미 넘치는 ${josa(el, '을/를')} ${otherLabel}이 ${theirs}개나 갖고 있습니다. 함께 있으면 그 기운이 더 강해져 피로해지기 쉽습니다.`,
        })
      }
    }
  }

  check(a, b, anA, '첫째 분', '둘째 분')
  check(b, a, anB, '둘째 분', '첫째 분')

  if (items.length === 0) {
    items.push({
      title: '서로의 기운에 큰 영향을 주지 않음',
      score: 0,
      tone: 'neutral',
      note: '한쪽이 다른 쪽의 부족한 기운을 크게 채워주지도, 넘치는 기운을 더하지도 않습니다. 무난한 대신 극적인 끌림도 덜한 편입니다.',
    })
  }

  // 절반을 기본으로 깔고 가감한다. 채워줄 게 없다고 나쁜 궁합은 아니기 때문이다.
  return { key: 'yongsin', title: '기운을 채워주는가', max: MAX, score: clamp(MAX / 2 + score, 0, MAX), items }
}

/* ------------------------------------------------------------------ */
/* 2. 일간 — 두 사람의 '나' 글자 사이 관계 (20점)                        */
/* ------------------------------------------------------------------ */

function dayStemSection(a: SajuChart, b: SajuChart): CompatSection {
  const MAX = 20
  const sa = a.dayMaster.stem
  const sb = b.dayMaster.stem
  const ea = a.dayMaster.element
  const eb = b.dayMaster.element
  const items: CompatItem[] = []
  let score = MAX / 2

  const made = stemCombineOf(sa, sb)
  if (made) {
    score += 8
    items.push({
      title: `${sa}${sb}합 — 서로 끌어당김`,
      score: 8,
      tone: 'good',
      note: `두 분의 일간이 천간합을 이룹니다. 처음부터 서로에게 끌리고 오래 붙어 있어도 편한 관계입니다. 두 글자가 묶이며 ${made}의 성질을 띱니다.`,
    })
  } else if (pairIn(STEM_CLASHES, sa, sb)) {
    score -= 6
    items.push({
      title: `${sa}${sb}충 — 정면으로 부딪침`,
      score: -6,
      tone: 'caution',
      note: '두 분의 일간이 정면으로 부딪칩니다. 생각과 방식이 자주 어긋나기 쉬우니, 서로의 판단을 설득하려 들기보다 다름을 인정하는 편이 낫습니다.',
    })
  }

  if (ea === eb) {
    score += 2
    items.push({
      title: `둘 다 ${ea} 일간 — 닮은 사람들`,
      score: 2,
      tone: 'neutral',
      note: `두 분 모두 ${ea}의 기운을 타고났습니다. 말이 잘 통하고 가치관이 비슷한 대신, 같은 약점을 공유하고 경쟁하기도 쉽습니다.`,
    })
  } else if (GENERATES[ea] === eb) {
    score += 5
    items.push({
      title: `${ea}생${eb} — 첫째 분이 둘째 분을 북돋움`,
      score: 5,
      tone: 'good',
      note: `첫째 분의 ${ea} 기운이 둘째 분의 ${eb}를 살려줍니다. 챙겨주고 밀어주는 쪽이 자연스럽게 정해집니다. 다만 한쪽만 계속 주면 지칠 수 있습니다.`,
    })
  } else if (GENERATES[eb] === ea) {
    score += 5
    items.push({
      title: `${eb}생${ea} — 둘째 분이 첫째 분을 북돋움`,
      score: 5,
      tone: 'good',
      note: `둘째 분의 ${eb} 기운이 첫째 분의 ${ea}를 살려줍니다. 챙겨주고 밀어주는 쪽이 자연스럽게 정해집니다. 다만 한쪽만 계속 주면 지칠 수 있습니다.`,
    })
  } else if (CONTROLS[ea] === eb || CONTROLS[eb] === ea) {
    score -= 3
    const [strong, weak] = CONTROLS[ea] === eb ? ['첫째 분', '둘째 분'] : ['둘째 분', '첫째 분']
    items.push({
      title: '일간끼리 극하는 관계',
      score: -3,
      tone: 'caution',
      note: `${strong}의 기운이 ${josa(weak, '을/를')} 누르는 모양입니다. 주도권이 한쪽으로 쏠리기 쉬우니, ${josa(weak, '이/가')} 자기 목소리를 낼 자리를 의식적으로 만드는 것이 중요합니다.`,
    })
  }

  return { key: 'dayStem', title: '두 사람의 기질', max: MAX, score: clamp(score, 0, MAX), items }
}

/* ------------------------------------------------------------------ */
/* 3. 일지 — 배우자 자리끼리의 관계 (20점)                               */
/* ------------------------------------------------------------------ */

function dayBranchSection(a: SajuChart, b: SajuChart): CompatSection {
  const MAX = 20
  const ba = a.pillars.find((p) => p.label === '일')!.branch
  const bb = b.pillars.find((p) => p.label === '일')!.branch
  const items: CompatItem[] = []
  let score = MAX / 2

  if (pairIn(SIX_COMBINES, ba, bb)) {
    score += 8
    items.push({
      title: `${ba}${bb}육합 — 배우자 자리끼리 묶임`,
      score: 8,
      tone: 'good',
      note: '두 분의 배우자 자리가 짝을 이룹니다. 궁합에서 가장 좋게 보는 형태 중 하나로, 함께 사는 일상이 잘 맞물립니다.',
    })
  }

  const triple = TRIPLE_GROUPS.find((g) => g.slice(0, 3).includes(ba) && g.slice(0, 3).includes(bb))
  if (triple && ba !== bb) {
    score += 6
    items.push({
      title: `${ba}${bb}반합 — 같은 기운을 이룸`,
      score: 6,
      tone: 'good',
      note: `두 분의 배우자 자리가 ${triple[3]} 기운으로 묶입니다. 바라보는 방향이 같아 함께 뭔가를 해나가기 좋습니다.`,
    })
  }

  if (pairIn(BRANCH_CLASHES, ba, bb)) {
    score -= 8
    items.push({
      title: `${ba}${bb}충 — 배우자 자리가 부딪침`,
      score: -8,
      tone: 'caution',
      note: '두 분의 배우자 자리가 정면으로 부딪칩니다. 함께 사는 방식에서 마찰이 잦기 쉬우니, 생활 규칙을 미리 말로 정해두는 편이 도움이 됩니다. 다만 충은 변화를 만드는 힘이기도 해서, 서로를 자극해 성장시키는 관계가 되기도 합니다.',
    })
  }

  if (pairIn(BRANCH_RESENT, ba, bb)) {
    score -= 4
    items.push({
      title: `${ba}${bb}원진 — 이유 없이 거슬림`,
      score: -4,
      tone: 'caution',
      note: '딱히 큰 잘못이 없는데도 상대의 사소한 습관이 거슬리기 쉬운 조합입니다. 알고 있으면 넘길 수 있는 부분이니, 미워서가 아니라 기운이 그렇다고 보시면 됩니다.',
    })
  }

  if (ba === bb) {
    score += 2
    items.push({
      title: '배우자 자리가 같은 글자',
      score: 2,
      tone: 'neutral',
      note: '두 분의 배우자 자리가 같습니다. 원하는 생활의 모습이 비슷해 편안한 대신, 서로 채워주기보다 닮은 부분이 강해집니다.',
    })
  }

  if (items.length === 0) {
    items.push({
      title: '배우자 자리에 뚜렷한 관계가 없음',
      score: 0,
      tone: 'neutral',
      note: '두 분의 배우자 자리가 특별히 끌어당기지도 부딪치지도 않습니다. 관계의 성패가 사주보다 서로의 노력에 더 달린 조합입니다.',
    })
  }

  return { key: 'dayBranch', title: '배우자 자리', max: MAX, score: clamp(score, 0, MAX), items }
}

/* ------------------------------------------------------------------ */
/* 4. 나머지 지지 — 전반적인 어울림 (10점)                               */
/* ------------------------------------------------------------------ */

function otherBranchSection(a: SajuChart, b: SajuChart): CompatSection {
  const MAX = 10
  const items: CompatItem[] = []
  let combines = 0
  let clashes = 0
  let harms = 0

  for (const pa of a.pillars) {
    for (const pb of b.pillars) {
      // 일지끼리는 앞에서 따로 봤으므로 건너뛴다
      if (pa.label === '일' && pb.label === '일') continue
      if (pairIn(SIX_COMBINES, pa.branch, pb.branch)) combines += 1
      if (pairIn(BRANCH_CLASHES, pa.branch, pb.branch)) clashes += 1
      if (pairIn(BRANCH_HARMS, pa.branch, pb.branch)) harms += 1
    }
  }

  let score = MAX / 2
  if (combines > 0) {
    const add = Math.min(combines * 1.5, 5)
    score += add
    items.push({
      title: `합이 ${combines}군데`,
      score: add,
      tone: 'good',
      note: '두 사주의 여러 자리가 서로 맞물립니다. 겹치는 생활 영역이 많아 함께 보내는 시간이 편안한 편입니다.',
    })
  }
  if (clashes > 0) {
    const cut = Math.min(clashes * 1.5, 5)
    score -= cut
    items.push({
      title: `충이 ${clashes}군데`,
      score: -cut,
      tone: 'caution',
      note: '두 사주의 여러 자리가 부딪칩니다. 변화가 잦고 자극이 많은 관계라, 안정을 원한다면 의식적으로 규칙을 만드는 편이 낫습니다.',
    })
  }
  if (harms > 0) {
    const cut = Math.min(harms, 3)
    score -= cut
    items.push({
      title: `해가 ${harms}군데`,
      score: -cut,
      tone: 'caution',
      note: '겉으로 크게 드러나지 않는 불편이 쌓이기 쉬운 자리가 있습니다. 쌓아두지 말고 그때그때 말로 푸는 것이 좋습니다.',
    })
  }
  if (items.length === 0) {
    items.push({
      title: '나머지 자리는 조용함',
      score: 0,
      tone: 'neutral',
      note: '배우자 자리 밖에서는 서로 크게 간섭하지 않습니다. 각자의 영역이 잘 지켜지는 조합입니다.',
    })
  }

  return { key: 'branches', title: '전반적인 어울림', max: MAX, score: clamp(score, 0, MAX), items }
}

/* ------------------------------------------------------------------ */
/* 5. 신강신약 조합 (10점)                                              */
/* ------------------------------------------------------------------ */

function strengthSection(anA: Analysis, anB: Analysis): CompatSection {
  const MAX = 10
  const va = anA.strength.verdict
  const vb = anB.strength.verdict
  const items: CompatItem[] = []
  let score = MAX / 2

  if (va === '신강' && vb === '신강') {
    score -= 2
    items.push({
      title: '두 분 다 신강',
      score: -2,
      tone: 'caution',
      note: '둘 다 주관이 뚜렷하고 힘이 셉니다. 서로 존중하면 강한 동반자가 되지만, 주도권을 두고 부딪치기도 쉽습니다. 각자의 영역을 나눠두면 훨씬 편해집니다.',
    })
  } else if (va === '신약' && vb === '신약') {
    score -= 1
    items.push({
      title: '두 분 다 신약',
      score: -1,
      tone: 'caution',
      note: '둘 다 주변에 잘 맞추는 성향이라 다툼은 적습니다. 다만 결정을 미루다 일이 흐지부지되기 쉬우니, 누가 정할지를 미리 정해두면 좋습니다.',
    })
  } else if (va === '중화' || vb === '중화') {
    score += 3
    items.push({
      title: '한쪽이 중화',
      score: 3,
      tone: 'good',
      note: '한 분이 균형 잡힌 편이라 관계 전체의 무게중심을 잡아줍니다. 갈등이 생겨도 쉽게 회복되는 조합입니다.',
    })
  } else {
    score += 4
    items.push({
      title: '한쪽은 신강, 한쪽은 신약',
      score: 4,
      tone: 'good',
      note: '한 분이 끌고 한 분이 맞춰주는 모양이라 역할이 자연스럽게 나뉩니다. 다만 맞춰주는 쪽이 혼자 참지 않도록, 이끄는 쪽이 먼저 물어봐 주는 것이 중요합니다.',
    })
  }

  return { key: 'strength', title: '힘의 균형', max: MAX, score: clamp(score, 0, MAX), items }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.round(Math.max(lo, Math.min(hi, v)) * 10) / 10
}
