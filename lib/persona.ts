/**
 * 사주 유형 — 별명과 키워드.
 *
 * "경금 일간에 신강한 사주입니다"는 정확하지만 아무 느낌이 없다.
 * "벼려진 무쇠, 기준을 세우는 사람"은 부정확하지 않으면서 바로 와닿는다.
 * 첫 화면에서 사람을 붙잡는 건 후자다.
 *
 * 중요한 건 이게 지어낸 말이 아니라는 점이다.
 * 일간의 오행과 음양, 신강신약 판정에서 그대로 나온다.
 * 같은 사주면 언제 봐도 같은 별명이 나온다.
 */

import type { FiveElement, HeavenlyStem, TenGod } from 'manseryeok'
import type { SajuChart } from './saju'
import type { Analysis } from './analysis'

export interface Persona {
  /** '벼려진 무쇠' */
  title: string
  /** '기준을 세우는 사람' */
  subtitle: string
  /** 두세 문장 설명 */
  line: string
  /** 해시태그로 보여줄 키워드 */
  keywords: string[]
  /** 일간 오행 */
  element: FiveElement
  /** 카드 배경에 쓸 두 색 */
  gradient: [string, string]
}

/**
 * 천간 열 개 × 신강·중화·신약 세 가지 = 서른 가지.
 *
 * 신약을 부정적으로 쓰지 않았다. 약한 게 나쁜 게 아니라
 * 그 자리에 맞는 쓰임이 따로 있다고 보는 것이 명리의 관점이다.
 */
const PERSONAS: Record<HeavenlyStem, Record<'신강' | '중화' | '신약', Omit<Persona, 'keywords' | 'element' | 'gradient'>>> = {
  갑: {
    신강: {
      title: '뻗어가는 아름드리',
      subtitle: '앞장서는 사람',
      line: '위로 곧게 자라는 큰 나무의 기운입니다. 방향이 정해지면 뒤돌아보지 않고 나아갑니다. 다만 너무 곧아서 휘어야 할 때 부러지기 쉽습니다.',
    },
    중화: {
      title: '곧게 자란 나무',
      subtitle: '중심을 지키는 사람',
      line: '한쪽으로 치우치지 않고 반듯하게 선 나무입니다. 무리하지 않으면서도 제 자리를 지킵니다. 주변이 흔들려도 기준이 흔들리지 않습니다.',
    },
    신약: {
      title: '볕을 찾는 새싹',
      subtitle: '때를 고르는 사람',
      line: '아직 여린 만큼 환경을 잘 살피는 기운입니다. 무턱대고 밀어붙이기보다 볕 드는 자리를 찾아 자랍니다. 시기를 고르는 감각이 좋습니다.',
    },
  },
  을: {
    신강: {
      title: '얽혀 오르는 덩굴',
      subtitle: '기어이 뚫는 사람',
      line: '벽이 있으면 타고 오르는 덩굴의 기운입니다. 정면으로 부수지 않고 돌아서 기어이 도달합니다. 겉은 부드러운데 속은 질깁니다.',
    },
    중화: {
      title: '바람에 눕는 풀',
      subtitle: '부드럽게 버티는 사람',
      line: '거센 바람에 몸을 눕혔다가 지나가면 다시 서는 풀입니다. 맞서지 않아 꺾이지 않습니다. 유연함이 곧 힘인 유형입니다.',
    },
    신약: {
      title: '기대어 자라는 넝쿨',
      subtitle: '사람을 얻는 사람',
      line: '혼자 서기보다 곁을 빌려 자라는 기운입니다. 사람을 잘 만나는 것이 곧 실력이 됩니다. 도움을 청하는 일을 부끄러워하지 않으면 멀리 갑니다.',
    },
  },
  병: {
    신강: {
      title: '한낮의 태양',
      subtitle: '판을 밝히는 사람',
      line: '가리는 것 없이 사방을 비추는 기운입니다. 어디 있든 눈에 띄고 분위기를 만듭니다. 다만 너무 뜨거우면 곁이 지칠 수 있습니다.',
    },
    중화: {
      title: '고른 볕',
      subtitle: '두루 비추는 사람',
      line: '뜨겁지도 차지도 않게 골고루 닿는 햇볕입니다. 특별히 애쓰지 않아도 주변이 편안해집니다. 균형 감각이 뛰어납니다.',
    },
    신약: {
      title: '구름 사이 햇살',
      subtitle: '아껴 쓰는 사람',
      line: '늘 환하지는 않아도 필요할 때 비추는 기운입니다. 에너지를 모았다가 결정적일 때 씁니다. 과시하지 않아 오래갑니다.',
    },
  },
  정: {
    신강: {
      title: '타오르는 화롯불',
      subtitle: '오래 데우는 사람',
      line: '크게 번지지 않지만 꺼지지 않는 불입니다. 가까이 있는 사람을 오래 따뜻하게 합니다. 한번 붙으면 좀처럼 놓지 않습니다.',
    },
    중화: {
      title: '흔들림 없는 등불',
      subtitle: '곁을 지키는 사람',
      line: '바람이 불어도 제 밝기를 지키는 등불입니다. 요란하지 않게 자기 몫을 합니다. 믿고 맡길 만한 유형입니다.',
    },
    신약: {
      title: '바람 앞의 촛불',
      subtitle: '섬세하게 살피는 사람',
      line: '작은 변화에도 먼저 반응하는 예민한 기운입니다. 남이 못 보는 결을 읽어냅니다. 자기를 지킬 울타리만 있으면 재능이 됩니다.',
    },
  },
  무: {
    신강: {
      title: '우뚝한 산',
      subtitle: '흔들리지 않는 사람',
      line: '무슨 일이 있어도 자리를 뜨지 않는 산의 기운입니다. 주변이 기대는 버팀목이 됩니다. 다만 한번 굳으면 바꾸기가 어렵습니다.',
    },
    중화: {
      title: '너른 들',
      subtitle: '품는 사람',
      line: '이것저것 다 받아내는 넓은 땅입니다. 사람이 모이고 이야기가 쌓입니다. 중재와 조율에 능합니다.',
    },
    신약: {
      title: '갓 쌓은 둑',
      subtitle: '차곡차곡 쌓는 사람',
      line: '아직 단단해지는 중인 기운입니다. 서두르지 않고 한 겹씩 올립니다. 시간을 들일수록 무너지지 않는 것을 만듭니다.',
    },
  },
  기: {
    신강: {
      title: '기름진 논밭',
      subtitle: '길러내는 사람',
      line: '무엇을 심어도 잘 자라는 땅의 기운입니다. 사람이든 일이든 키워내는 데 재주가 있습니다. 다만 내 것을 챙기는 일에는 서툽니다.',
    },
    중화: {
      title: '손질한 텃밭',
      subtitle: '꾸준한 사람',
      line: '매일 조금씩 돌본 흔적이 쌓인 땅입니다. 눈에 띄는 도약보다 끊기지 않는 반복이 무기입니다. 결국 남는 쪽입니다.',
    },
    신약: {
      title: '갈아엎은 밭',
      subtitle: '다시 시작하는 사람',
      line: '비어 있어 무엇이든 새로 심을 수 있는 기운입니다. 한 번 접고 다시 여는 일에 겁이 없습니다. 전환이 빠릅니다.',
    },
  },
  경: {
    신강: {
      title: '벼려진 무쇠',
      subtitle: '기준을 세우는 사람',
      line: '단단하게 담금질된 쇠의 기운입니다. 옳고 그름이 분명하고 한번 정하면 굽히지 않습니다. 다만 그 기준을 남에게도 들이대면 부딪칩니다.',
    },
    중화: {
      title: '잘 벼린 칼',
      subtitle: '끊고 맺는 사람',
      line: '필요할 때 정확히 잘라내는 기운입니다. 미련을 오래 두지 않아 뒤가 깔끔합니다. 결단이 필요한 자리에서 빛납니다.',
    },
    신약: {
      title: '다듬어지는 원석',
      subtitle: '벼려지는 사람',
      line: '아직 거칠지만 그만큼 가능성이 남은 기운입니다. 부딪치고 깎이면서 모양이 잡힙니다. 지금의 고생이 나중의 날이 됩니다.',
    },
  },
  신: {
    신강: {
      title: '날 선 보석',
      subtitle: '빈틈을 보는 사람',
      line: '작은 흠도 놓치지 않는 예리한 기운입니다. 완성도에 대한 기준이 높습니다. 그 눈이 자신을 향하면 스스로를 깎아냅니다.',
    },
    중화: {
      title: '정교한 세공',
      subtitle: '다듬는 사람',
      line: '거친 것을 매만져 쓸 만하게 만드는 기운입니다. 손끝이 야무지고 마무리가 깔끔합니다. 맡기면 안심되는 유형입니다.',
    },
    신약: {
      title: '갓 캐낸 옥',
      subtitle: '갈고닦는 사람',
      line: '아직 빛을 내지 않은 원석의 기운입니다. 조용히 실력을 쌓다가 어느 순간 드러납니다. 알아봐 주는 사람을 만나면 크게 달라집니다.',
    },
  },
  임: {
    신강: {
      title: '너른 바다',
      subtitle: '다 받아내는 사람',
      line: '무엇이 흘러들어와도 품는 큰 물의 기운입니다. 생각의 폭이 넓고 사람을 가리지 않습니다. 다만 속을 알 수 없다는 말을 듣기도 합니다.',
    },
    중화: {
      title: '흐르는 큰 강',
      subtitle: '두루 닿는 사람',
      line: '막히면 돌아가며 끝내 바다에 닿는 기운입니다. 여러 곳에 발을 걸치고도 흐름을 잃지 않습니다. 적응이 빠릅니다.',
    },
    신약: {
      title: '여울지는 개울',
      subtitle: '길을 내는 사람',
      line: '양은 적어도 쉬지 않고 흐르는 물입니다. 작은 힘으로 오래 파고들어 길을 만듭니다. 끈기가 곧 재능입니다.',
    },
  },
  계: {
    신강: {
      title: '내리는 장맛비',
      subtitle: '스며드는 사람',
      line: '요란하지 않게 구석구석 적시는 기운입니다. 티 나지 않게 영향을 남깁니다. 다만 오래 머물면 눅눅해지니 환기가 필요합니다.',
    },
    중화: {
      title: '이른 아침 이슬',
      subtitle: '살피는 사람',
      line: '작고 맑지만 꼭 필요한 곳에 맺히는 기운입니다. 눈치가 빠르고 배려가 자연스럽습니다. 사람 마음을 잘 읽습니다.',
    },
    신약: {
      title: '옅은 안개',
      subtitle: '조용히 번지는 사람',
      line: '있는 듯 없는 듯하지만 어느새 온 자리를 감싸는 기운입니다. 앞에 나서지 않고도 분위기를 바꿉니다. 은근한 힘이 있습니다.',
    },
  },
}

/** 오행별 카드 색. 요즘 쓰는 톤으로 골랐다. */
const GRADIENTS: Record<FiveElement, [string, string]> = {
  목: ['#34d399', '#0f766e'],
  화: ['#fb7185', '#be123c'],
  토: ['#fbbf24', '#b45309'],
  금: ['#a5b4fc', '#4f46e5'],
  수: ['#60a5fa', '#1d4ed8'],
}

/** 십신별 한 단어 키워드 */
const TEN_GOD_KEYWORD: Record<TenGod, string> = {
  비견: '자존심',
  겁재: '승부욕',
  식신: '여유',
  상관: '재치',
  편재: '스케일',
  정재: '알뜰함',
  편관: '위기대응',
  정관: '책임감',
  편인: '직관',
  정인: '배움',
}

/** 오행별 한 단어 키워드 */
const ELEMENT_KEYWORD: Record<FiveElement, string> = {
  목: '성장',
  화: '열정',
  토: '안정',
  금: '원칙',
  수: '지혜',
}

/**
 * 사주에서 유형을 뽑는다.
 *
 * 별명은 일간과 신강신약에서, 키워드는 십신 분포와 용신, 사주의 특징에서 나온다.
 * 전부 계산된 값이라 같은 사주면 언제나 같은 결과가 나온다.
 */
export function buildPersona(chart: SajuChart, analysis: Analysis): Persona {
  const stem = chart.dayMaster.stem
  const verdict = analysis.strength.verdict
  const base = PERSONAS[stem][verdict]

  const keywords: string[] = []

  // 가장 많은 십신 두 개
  const topGods = Object.entries(chart.tenGodCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([g]) => TEN_GOD_KEYWORD[g as TenGod])
    .filter(Boolean)
  keywords.push(...topGods)

  // 일간 오행
  keywords.push(ELEMENT_KEYWORD[chart.dayMaster.element])

  // 사주의 특징
  if (chart.missingElements.length >= 2) keywords.push('치우침')
  else if (chart.missingElements.length === 0) keywords.push('균형')

  const samhap = analysis.relations.find((r) => r.kind === '삼합')
  if (samhap) keywords.push(`${samhap.produces}기운`)

  const clash = analysis.relations.find((r) => r.kind === '충')
  if (clash) keywords.push('변화')

  if (analysis.spirits.some((s) => s.hits.some((h) => h.name === '역마살'))) {
    keywords.push('역마')
  }
  if (analysis.spirits.some((s) => s.hits.some((h) => h.kind === 'lucky'))) {
    const lucky = analysis.spirits.flatMap((s) => s.hits).find((h) => h.kind === 'lucky')!
    keywords.push(lucky.name)
  }

  return {
    ...base,
    keywords: [...new Set(keywords)].slice(0, 6),
    element: chart.dayMaster.element,
    gradient: GRADIENTS[chart.dayMaster.element],
  }
}

/** 화면과 공유 카드에서 함께 쓰는 오행 색 */
export function elementGradient(el: FiveElement): [string, string] {
  return GRADIENTS[el]
}
