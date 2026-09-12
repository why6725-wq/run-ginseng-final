/**
 * 12운성, 12신살, 그리고 신살과 길성.
 *
 * lib/analysis.ts 가 해석의 뼈대(신강신약·용신·합충)라면, 이 파일은 살이다.
 * 뼈대 없이 살만 붙이면 "역마살이 있으니 돌아다닌다" 같은 단편적인 말밖에 안 나온다.
 * 그래서 뼈대를 먼저 잡고 이걸 나중에 붙였다.
 *
 * 신살은 유파와 책마다 목록도 기준도 다르다. 여기서는 기준이 분명하고
 * 널리 쓰이는 것만 골랐고, 각 항목이 무엇을 기준으로 나왔는지(일간·년지·월지)를
 * 함께 돌려준다. 근거를 밝혀야 동의하거나 무시할 수 있다.
 */

import { EARTHLY_BRANCHES } from 'manseryeok'
import type { EarthlyBranch, HeavenlyStem } from 'manseryeok'
import type { SajuChart } from './saju'

const bIdx = (b: EarthlyBranch) => EARTHLY_BRANCHES.indexOf(b)

/* ------------------------------------------------------------------ */
/* 12운성 (十二運星)                                                    */
/* ------------------------------------------------------------------ */

/**
 * 일간이 각 지지에서 갖는 기운의 세기를, 사람의 한살이에 빗대 열두 단계로 나눈 것.
 * 태어나(장생) 자라고 왕성해졌다가(제왕) 기울고 사라졌다(절) 다시 잉태되는(태) 순환이다.
 */
export const STAGE_ORDER = [
  '장생',
  '목욕',
  '관대',
  '건록',
  '제왕',
  '쇠',
  '병',
  '사',
  '묘',
  '절',
  '태',
  '양',
] as const

export type Stage = (typeof STAGE_ORDER)[number]

/** 천간별 장생(長生) 자리 */
const LONG_LIFE: Record<HeavenlyStem, EarthlyBranch> = {
  갑: '해',
  을: '오',
  병: '인',
  정: '유',
  무: '인',
  기: '유',
  경: '사',
  신: '자',
  임: '신',
  계: '묘',
}

/** 양간은 순행, 음간은 역행한다 */
const YANG_STEMS: HeavenlyStem[] = ['갑', '병', '무', '경', '임']

/** 일간이 어떤 지지에서 어느 단계에 있는지 */
export function twelveStage(stem: HeavenlyStem, branch: EarthlyBranch): Stage {
  const start = bIdx(LONG_LIFE[stem])
  const here = bIdx(branch)
  const step = YANG_STEMS.includes(stem)
    ? (here - start + 12) % 12
    : (start - here + 12) % 12
  return STAGE_ORDER[step]
}

export const STAGE_NOTE: Record<Stage, string> = {
  장생: '갓 태어난 기운. 새로 시작하고 도움을 받는 자리입니다.',
  목욕: '씻기는 기운. 다듬어지는 과정이라 기복과 변덕이 따릅니다.',
  관대: '옷을 갖춰 입는 기운. 사회로 나서며 의욕이 앞서는 자리입니다.',
  건록: '제 밥벌이를 하는 기운. 가장 안정적으로 힘을 쓰는 자리입니다.',
  제왕: '가장 왕성한 기운. 힘이 넘치는 만큼 지나치기도 쉽습니다.',
  쇠: '기울기 시작하는 기운. 한풀 꺾이며 차분해집니다.',
  병: '병드는 기운. 힘이 약해지고 예민해지기 쉽습니다.',
  사: '멎은 기운. 활동보다 생각과 정리에 어울리는 자리입니다.',
  묘: '갈무리되는 기운. 안으로 거두고 저장하는 자리입니다.',
  절: '끊어진 기운. 가장 약하지만 그래서 새로 시작할 수 있는 자리입니다.',
  태: '잉태되는 기운. 아직 드러나지 않은 가능성의 자리입니다.',
  양: '길러지는 기운. 준비하고 자라나는 자리입니다.',
}

/* ------------------------------------------------------------------ */
/* 12신살 (十二神殺)                                                    */
/* ------------------------------------------------------------------ */

export const SPIRIT_ORDER = [
  '겁살',
  '재살',
  '천살',
  '지살',
  '연살',
  '월살',
  '망신',
  '장성',
  '반안',
  '역마',
  '육해',
  '화개',
] as const

export type TwelveSpirit = (typeof SPIRIT_ORDER)[number]

/** 삼합 그룹별 지살(地殺) 자리. 12신살은 여기를 기준점으로 돌아간다. */
const JISAL_OF_GROUP: [EarthlyBranch[], EarthlyBranch][] = [
  [['인', '오', '술'], '인'],
  [['신', '자', '진'], '신'],
  [['사', '유', '축'], '사'],
  [['해', '묘', '미'], '해'],
]

function jisalFor(base: EarthlyBranch): EarthlyBranch {
  return JISAL_OF_GROUP.find(([group]) => group.includes(base))![1]
}

/**
 * 기준 지지(보통 연지)에서 본 어떤 지지의 12신살.
 * 연지가 속한 삼합 그룹의 지살 자리를 기준으로 열두 자리를 센다.
 */
export function twelveSpirit(base: EarthlyBranch, branch: EarthlyBranch): TwelveSpirit {
  const step = (bIdx(branch) - bIdx(jisalFor(base)) + 3 + 12) % 12
  return SPIRIT_ORDER[step]
}

export const SPIRIT_NOTE: Record<TwelveSpirit, string> = {
  겁살: '빼앗기는 자리. 뜻밖의 손실이나 경쟁을 뜻합니다.',
  재살: '갇히는 자리. 수옥살이라고도 하며 구설과 송사를 조심합니다.',
  천살: '하늘이 주는 자리. 내 힘으로 어쩔 수 없는 일을 뜻합니다.',
  지살: '움직이는 자리. 이동과 활동, 바깥일을 뜻합니다.',
  연살: '끌리는 자리. 도화살이라고도 하며 매력과 인기를 뜻합니다.',
  월살: '마르는 자리. 고초살이라고도 하며 정체와 답답함을 뜻합니다.',
  망신: '드러나는 자리. 감추던 것이 밖으로 드러남을 뜻합니다.',
  장성: '중심에 서는 자리. 주도권과 우두머리 기질을 뜻합니다.',
  반안: '안장에 앉는 자리. 윗사람의 도움과 승진을 뜻합니다.',
  역마: '달리는 자리. 이동, 여행, 해외, 잦은 변화를 뜻합니다.',
  육해: '가로막히는 자리. 일이 더디고 방해가 따름을 뜻합니다.',
  화개: '덮는 자리. 예술과 종교, 고독과 학문을 뜻합니다.',
}

/* ------------------------------------------------------------------ */
/* 신살과 길성                                                          */
/* ------------------------------------------------------------------ */

export interface SpiritHit {
  name: string
  kind: 'lucky' | 'unlucky'
  /** 무엇을 기준으로 나왔는지 */
  basis: string
  /** 천간에 붙는지, 지지에 붙는지, 기둥 전체인지 */
  target: 'stem' | 'branch' | 'pillar'
  note: string
}

type StemTable = Partial<Record<HeavenlyStem, EarthlyBranch[]>>

/** 일간 기준 길성·흉살 표 */
const BY_DAY_STEM: {
  name: string
  kind: 'lucky' | 'unlucky'
  note: string
  table: StemTable
}[] = [
  {
    name: '천을귀인',
    kind: 'lucky',
    note: '가장 좋게 보는 길성입니다. 어려울 때 돕는 사람이 나타나고 흉한 일이 풀립니다.',
    table: {
      갑: ['축', '미'],
      무: ['축', '미'],
      경: ['축', '미'],
      을: ['자', '신'],
      기: ['자', '신'],
      병: ['해', '유'],
      정: ['해', '유'],
      신: ['인', '오'],
      임: ['사', '묘'],
      계: ['사', '묘'],
    },
  },
  {
    name: '태극귀인',
    kind: 'lucky',
    note: '뜻밖의 행운과 명예를 뜻합니다. 막힌 일이 크게 풀리는 자리로 봅니다.',
    table: {
      갑: ['자', '오'],
      을: ['자', '오'],
      병: ['묘', '유'],
      정: ['묘', '유'],
      무: ['진', '술', '축', '미'],
      기: ['진', '술', '축', '미'],
      경: ['인', '해'],
      신: ['인', '해'],
      임: ['사', '신'],
      계: ['사', '신'],
    },
  },
  {
    name: '문창귀인',
    kind: 'lucky',
    note: '글재주와 학문의 별입니다. 공부와 시험, 글로 하는 일에 유리합니다.',
    table: {
      갑: ['사'],
      을: ['오'],
      병: ['신'],
      무: ['신'],
      정: ['유'],
      기: ['유'],
      경: ['해'],
      신: ['자'],
      임: ['인'],
      계: ['묘'],
    },
  },
  {
    name: '정록',
    kind: 'lucky',
    note: '일간이 제 힘을 온전히 쓰는 자리입니다. 십간록, 건록이라고도 하며 자립과 밥벌이를 뜻합니다.',
    table: {
      갑: ['인'],
      을: ['묘'],
      병: ['사'],
      무: ['사'],
      정: ['오'],
      기: ['오'],
      경: ['신'],
      신: ['유'],
      임: ['해'],
      계: ['자'],
    },
  },
  {
    name: '암록',
    kind: 'lucky',
    note: '드러나지 않는 복입니다. 어려울 때 모르는 곳에서 도움이 들어옵니다.',
    table: {
      갑: ['해'],
      을: ['술'],
      병: ['신'],
      무: ['신'],
      정: ['미'],
      기: ['미'],
      경: ['사'],
      신: ['진'],
      임: ['인'],
      계: ['축'],
    },
  },
  {
    name: '금여',
    kind: 'lucky',
    note: '수레를 탄다는 뜻입니다. 배우자 복과 편안한 생활을 뜻합니다.',
    table: {
      갑: ['진'],
      을: ['사'],
      병: ['미'],
      무: ['미'],
      정: ['신'],
      기: ['신'],
      경: ['술'],
      신: ['해'],
      임: ['축'],
      계: ['인'],
    },
  },
  {
    name: '양인살',
    kind: 'unlucky',
    note: '칼날의 기운입니다. 추진력이 매우 강한 대신 과격해지기 쉽습니다.',
    table: {
      갑: ['묘'],
      병: ['오'],
      무: ['오'],
      경: ['유'],
      임: ['자'],
    },
  },
  {
    name: '홍염살',
    kind: 'unlucky',
    note: '사람을 끄는 매력의 기운입니다. 인기가 많은 대신 구설이 따르기 쉽습니다.',
    table: {
      갑: ['오'],
      을: ['오'],
      병: ['인'],
      정: ['미'],
      무: ['진'],
      기: ['진'],
      경: ['술'],
      신: ['유'],
      임: ['자'],
      계: ['신'],
    },
  },
  {
    name: '낙정관살',
    kind: 'unlucky',
    note: '우물에 빠진다는 뜻입니다. 물가와 높은 곳, 그리고 방심을 조심하라는 자리입니다.',
    table: {
      갑: ['사'],
      기: ['사'],
      을: ['자'],
      경: ['자'],
      병: ['신'],
      신: ['신'],
      정: ['술'],
      임: ['술'],
      무: ['묘'],
      계: ['묘'],
    },
  },
]

/** 월지 기준 */
const BY_MONTH_BRANCH: {
  name: string
  kind: 'lucky' | 'unlucky'
  note: string
  target: 'stem' | 'branch'
  table: Partial<Record<EarthlyBranch, (HeavenlyStem | EarthlyBranch)[]>>
}[] = [
  {
    name: '천덕귀인',
    kind: 'lucky',
    target: 'stem',
    note: '하늘이 돕는 별입니다. 흉한 일을 덜어주고 인덕이 따릅니다.',
    table: {
      인: ['정'],
      묘: ['신'],
      진: ['임'],
      사: ['신'],
      오: ['해'],
      미: ['갑'],
      신: ['계'],
      유: ['인'],
      술: ['병'],
      해: ['을'],
      자: ['사'],
      축: ['경'],
    },
  },
  {
    name: '월덕귀인',
    kind: 'lucky',
    target: 'stem',
    note: '달이 돕는 별입니다. 천덕귀인과 함께 흉을 덜어주는 자리로 봅니다.',
    table: {
      인: ['병'],
      오: ['병'],
      술: ['병'],
      신: ['임'],
      자: ['임'],
      진: ['임'],
      사: ['경'],
      유: ['경'],
      축: ['경'],
      해: ['갑'],
      묘: ['갑'],
      미: ['갑'],
    },
  },
  {
    name: '황은대사',
    kind: 'lucky',
    target: 'branch',
    note: '임금의 사면이라는 뜻입니다. 큰 잘못이나 곤경이 용서되고 풀린다고 봅니다.',
    table: {
      인: ['술'],
      묘: ['축'],
      진: ['인'],
      사: ['사'],
      오: ['유'],
      미: ['묘'],
      신: ['자'],
      유: ['오'],
      술: ['해'],
      해: ['진'],
      자: ['신'],
      축: ['미'],
    },
  },
]

/** 기둥 자체가 특정 간지일 때 붙는 살 */
const PILLAR_SPIRITS: { name: string; kind: 'unlucky'; note: string; pillars: string[] }[] = [
  {
    name: '괴강살',
    kind: 'unlucky',
    note: '우두머리의 기운입니다. 카리스마와 결단력이 매우 강한 대신 극단으로 치닫기 쉽습니다.',
    pillars: ['경진', '경술', '임진', '임술', '무술'],
  },
  {
    name: '백호대살',
    kind: 'unlucky',
    note: '피를 보는 기운으로 봅니다. 사고와 급한 일을 조심하라는 뜻이며, 강한 추진력으로도 나타납니다.',
    pillars: ['갑진', '을미', '병술', '정축', '무진', '임술', '계축'],
  },
]

/** 글자 자체에 붙는 살 */
const CHAR_SPIRITS: {
  name: string
  kind: 'unlucky'
  note: string
  stems: HeavenlyStem[]
  branches: EarthlyBranch[]
}[] = [
  {
    name: '현침살',
    kind: 'unlucky',
    note: '바늘처럼 뾰족한 글자입니다. 예리하고 섬세한 재주를 뜻하며, 말이 날카로워지기 쉽습니다.',
    stems: ['갑', '신'],
    branches: ['묘', '오', '신', '미'],
  },
]

export interface PillarSpirits {
  /** '연' | '월' | '일' | '시' */
  label: string
  labelFull: string
  stage: Stage
  stageNote: string
  spirit: TwelveSpirit
  spiritNote: string
  hits: SpiritHit[]
}

/**
 * 기둥마다 12운성, 12신살, 그리고 해당하는 신살을 모두 찾는다.
 *
 * 12운성은 일간을 기준으로, 12신살은 연지를 기준으로 본다.
 * 신살은 표마다 기준이 달라(일간·월지·기둥·글자) 각 항목에 기준을 적어 돌려준다.
 */
export function findSpirits(chart: SajuChart): PillarSpirits[] {
  const dayStem = chart.dayMaster.stem
  const yearBranch = chart.pillars.find((p) => p.label === '연')!.branch
  const dayBranch = chart.pillars.find((p) => p.label === '일')!.branch
  const monthBranch = chart.pillars.find((p) => p.label === '월')!.branch

  return chart.pillars.map((p) => {
    const hits: SpiritHit[] = []

    // 일간 기준
    for (const t of BY_DAY_STEM) {
      if (t.table[dayStem]?.includes(p.branch)) {
        hits.push({
          name: t.name,
          kind: t.kind,
          basis: `일간 ${dayStem} 기준`,
          target: 'branch',
          note: t.note,
        })
      }
    }

    // 월지 기준
    for (const t of BY_MONTH_BRANCH) {
      const targets = t.table[monthBranch] ?? []
      const matched =
        t.target === 'stem'
          ? targets.includes(p.stem as HeavenlyStem)
          : targets.includes(p.branch)
      if (matched) {
        hits.push({
          name: t.name,
          kind: t.kind,
          basis: `월지 ${monthBranch} 기준`,
          target: t.target,
          note: t.note,
        })
      }
    }

    // 기둥 간지 자체
    for (const t of PILLAR_SPIRITS) {
      if (t.pillars.includes(p.korean)) {
        hits.push({
          name: t.name,
          kind: t.kind,
          basis: `${p.labelFull}가 ${p.korean}`,
          target: 'pillar',
          note: t.note,
        })
      }
    }

    // 글자 자체
    for (const t of CHAR_SPIRITS) {
      if (t.stems.includes(p.stem)) {
        hits.push({
          name: t.name,
          kind: t.kind,
          basis: `${p.stem} 글자`,
          target: 'stem',
          note: t.note,
        })
      }
      if (t.branches.includes(p.branch)) {
        hits.push({
          name: t.name,
          kind: t.kind,
          basis: `${p.branch} 글자`,
          target: 'branch',
          note: t.note,
        })
      }
    }

    // 12신살 가운데 특히 자주 쓰는 셋은 신살 목록에도 함께 올린다
    const fromYear = twelveSpirit(yearBranch, p.branch)
    const fromDay = twelveSpirit(dayBranch, p.branch)
    for (const [base, label, spirit] of [
      [yearBranch, '연지', fromYear],
      [dayBranch, '일지', fromDay],
    ] as [EarthlyBranch, string, TwelveSpirit][]) {
      if (spirit === '역마' || spirit === '화개' || spirit === '연살') {
        const name = spirit === '연살' ? '도화살' : `${spirit}살`
        if (!hits.some((h) => h.name === name)) {
          hits.push({
            name,
            kind: 'unlucky',
            basis: `${label} ${base} 기준`,
            target: 'branch',
            note: SPIRIT_NOTE[spirit],
          })
        }
      }
    }

    return {
      label: p.label,
      labelFull: p.labelFull,
      stage: twelveStage(dayStem, p.branch),
      stageNote: STAGE_NOTE[twelveStage(dayStem, p.branch)],
      spirit: fromYear,
      spiritNote: SPIRIT_NOTE[fromYear],
      hits: mergeByName(hits),
    }
  })
}

/**
 * 같은 이름의 신살을 하나로 합친다.
 *
 * 한 기둥에서 같은 신살이 두 갈래로 걸릴 수 있다.
 * 예를 들어 갑오(甲午) 기둥은 천간 갑과 지지 오가 모두 현침 글자라
 * 현침살이 두 번 잡힌다. 화면에 같은 이름이 나란히 뜨면 잘못된 것처럼 보이므로
 * 하나로 합치되, 어느 글자에서 나왔는지는 근거에 모두 남긴다.
 */
function mergeByName(hits: SpiritHit[]): SpiritHit[] {
  const out: SpiritHit[] = []
  for (const h of hits) {
    const found = out.find((m) => m.name === h.name)
    if (found) {
      if (!found.basis.includes(h.basis)) found.basis += `, ${h.basis}`
    } else {
      out.push({ ...h })
    }
  }
  return out
}

/* ------------------------------------------------------------------ */
/* 연주 기준 공망                                                       */
/* ------------------------------------------------------------------ */

/**
 * 육십갑자에서 한 순(旬)은 열 개다. 천간은 열이고 지지는 열둘이라
 * 짝을 채우지 못하고 남는 지지 둘이 생기는데, 그것이 공망이다.
 *
 * 일주 기준 공망은 만세력 라이브러리가 주지만, 연주 기준도 함께 보는 유파가 많아
 * 여기서 직접 구한다.
 */
export function voidBranchesOf(stem: HeavenlyStem, branch: EarthlyBranch): EarthlyBranch[] {
  const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계']
  const s = STEMS.indexOf(stem)
  const b = bIdx(branch)
  // 순의 첫 글자(갑)까지 거슬러 올라간 만큼 지지도 되돌린다
  const headBranch = (b - s + 12) % 12
  return [EARTHLY_BRANCHES[(headBranch + 10) % 12], EARTHLY_BRANCHES[(headBranch + 11) % 12]]
}
