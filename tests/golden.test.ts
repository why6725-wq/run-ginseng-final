/**
 * 기준 사주 대조 시험.
 *
 * 1998-08-21 08:10 양력, 여성, 서울.
 * 아래 값은 전부 시중 만세력 앱의 화면과 한 항목씩 눈으로 대조해 일치를 확인한 것이다.
 * 그 확인을 여기 못박아 둔다. 앞으로 표를 잘못 건드리면 이 파일이 먼저 깨진다.
 *
 * 사주 사이트에서 가장 무서운 실패는 화면이 멀쩡히 뜨고 AI가 틀린 값으로
 * 그럴듯한 글을 쓰는 것이다. 그걸 막는 게 이 파일의 목적이다.
 */

import { describe, it, expect } from 'vitest'
import { getSolarTermsOfYear } from 'manseryeok'
import { analyze } from '../lib/analysis'
import { goldenChart } from './fixtures'

const { chart, byLabel } = goldenChart()
const analysis = analyze(chart)

describe('기준 사주: 1998-08-21 08:10 여성 서울', () => {
  it('양력과 음력이 맞는다', () => {
    expect(chart.solar).toEqual({ year: 1998, month: 8, day: 21 })
    expect(chart.lunar).toEqual({ year: 1998, month: 6, day: 30, isLeapMonth: false })
  })

  it('만 나이가 맞는다', () => {
    expect(chart.age).toBe(28)
  })

  it('팔자 여덟 글자가 맞는다', () => {
    expect(byLabel['연'].korean).toBe('무인')
    expect(byLabel['월'].korean).toBe('경신')
    expect(byLabel['일'].korean).toBe('경자')
    expect(byLabel['시'].korean).toBe('경진')
  })

  it('한자 표기가 맞는다', () => {
    expect(byLabel['연'].hanja).toBe('戊寅')
    expect(byLabel['월'].hanja).toBe('庚申')
    expect(byLabel['일'].hanja).toBe('庚子')
    expect(byLabel['시'].hanja).toBe('庚辰')
  })

  it('일간이 경, 양금이다', () => {
    expect(chart.dayMaster).toMatchObject({
      stem: '경',
      hanja: '庚',
      element: '금',
      yinYang: '양',
    })
  })

  it('천간 십신이 맞는다', () => {
    expect(byLabel['연'].stemTenGod).toBe('편인')
    expect(byLabel['월'].stemTenGod).toBe('비견')
    expect(byLabel['일'].stemTenGod).toBe('일간')
    expect(byLabel['시'].stemTenGod).toBe('비견')
  })

  it('지지 십신이 맞는다', () => {
    expect(byLabel['연'].branchTenGod).toBe('편재')
    expect(byLabel['월'].branchTenGod).toBe('비견')
    expect(byLabel['일'].branchTenGod).toBe('상관')
    expect(byLabel['시'].branchTenGod).toBe('편인')
  })

  it('오행 분포가 맞는다', () => {
    expect(chart.elementCounts).toEqual({ 목: 1, 화: 0, 토: 2, 금: 4, 수: 1 })
    expect(chart.missingElements).toEqual(['화'])
    expect(chart.dominantElement).toBe('금')
  })

  it('지장간이 맞는다', () => {
    const label = Object.fromEntries(
      analysis.hiddenStems.map((h) => [h.position, h.label]),
    )
    expect(label['연주']).toBe('무병갑')
    expect(label['월주']).toBe('무임경')
    expect(label['일주']).toBe('임계')
    expect(label['시주']).toBe('을계무')
  })

  it('공망이 일주 기준과 연주 기준 모두 맞는다', () => {
    expect(chart.voidBranches).toEqual(['진', '사'])
    expect(analysis.yearVoidBranches).toEqual(['신', '유'])
    // 시지 진이 일주 기준 공망, 월지 신이 연주 기준 공망에 해당한다
    expect(byLabel['시'].isVoid).toBe(true)
    expect(analysis.yearVoidBranches).toContain(byLabel['월'].branch)
  })
})

describe('기준 사주: 대운·세운·월운', () => {
  it('대운이 역행이고 4세에 시작한다', () => {
    expect(chart.luckForward).toBe(false)
    expect(chart.luckStartAge).toBe(4)
  })

  it('대운 여섯 기둥의 간지와 나이가 맞는다', () => {
    expect(chart.luckPillars.slice(0, 6).map((p) => `${p.age} ${p.korean}`)).toEqual([
      '4 기미',
      '14 무오',
      '24 정사',
      '34 병진',
      '44 을묘',
      '54 갑인',
    ])
  })

  it('대운 천간 십신이 맞는다', () => {
    expect(chart.luckPillars.slice(0, 6).map((p) => p.stemTenGod)).toEqual([
      '정인',
      '편인',
      '정관',
      '편관',
      '정재',
      '편재',
    ])
  })

  it('28세는 24세에 시작한 정사 대운을 지나고 있다', () => {
    expect(chart.currentLuck?.korean).toBe('정사')
    expect(chart.currentLuck?.age).toBe(24)
  })

  it('2026년 세운이 병오이고 편관·정관이다', () => {
    expect(chart.yearlyLuck).toMatchObject({
      year: 2026,
      korean: '병오',
      hanja: '丙午',
      stemTenGod: '편관',
      branchTenGod: '정관',
    })
  })

  it('2026년 월운 열두 달이 맞는다', () => {
    expect(chart.monthlyLuck.map((m) => m.korean)).toEqual([
      '기축',
      '경인',
      '신묘',
      '임진',
      '계사',
      '갑오',
      '을미',
      '병신',
      '정유',
      '무술',
      '기해',
      '경자',
    ])
  })

  it('9월이 이번 달로 표시된다', () => {
    expect(chart.monthlyLuck.filter((m) => m.isCurrent).map((m) => m.month)).toEqual([9])
  })
})

describe('기준 사주: 신강신약과 용신', () => {
  it('71점 신강이다', () => {
    // 비교한 상용 만세력 앱도 70점 신강으로 본다
    expect(analysis.strength.score).toBe(71)
    expect(analysis.strength.verdict).toBe('신강')
  })

  it('자리마다 배점 중 얼마를 가져갔는지가 맞는다', () => {
    const got = Object.fromEntries(
      analysis.strength.rows.map((r) => [r.position, [r.role, r.points, r.weight]]),
    )
    expect(got).toEqual({
      연간: ['인성', 7.2, 8], // 무 토가 금을 생한다
      연지: ['재성', 3.7, 11], // 인 목. 속의 무(인성)만 조금 보탠다
      월간: ['비겁', 12, 12], // 경 금. 배점을 전부 가져간다
      월지: ['비겁', 26, 32], // 신 금. 속의 임(식상)이 조금 깎는다
      일지: ['식상', 4.8, 16], // 자 수. 속까지 전부 수라 덜 가져간다
      시간: ['비겁', 10, 10],
      시지: ['인성', 6.9, 11], // 진 토. 속의 을·계가 깎는다
    })
  })

  it('득령했고 득지하지 못했다', () => {
    expect(analysis.strength.hasSeason).toBe(true)
    expect(analysis.strength.hasGround).toBe(false)
  })

  it('자리별 배점 합이 정확히 100이다', () => {
    const total = analysis.strength.rows.reduce((s, r) => s + r.weight, 0)
    expect(total).toBeCloseTo(100, 5)
  })

  it('일간을 돕는 자리와 덜어내는 자리가 맞는다', () => {
    const helps = Object.fromEntries(
      analysis.strength.rows.map((r) => [r.position, r.helps]),
    )
    expect(helps).toEqual({
      연간: true, // 무 토, 토생금
      연지: false, // 인 목, 금극목
      월간: true, // 경 금
      월지: true, // 신 금
      일지: false, // 자 수, 금생수로 힘이 빠짐
      시간: true, // 경 금
      시지: true, // 진 토
    })
  })

  it('용신이 수·목·화이고 기신이 토·금이다', () => {
    expect(analysis.yongsin.favorable).toEqual(['수', '목', '화'])
    expect(analysis.yongsin.unfavorable).toEqual(['토', '금'])
  })

  it('용신 가운데 화가 원국에 없다', () => {
    expect(analysis.yongsin.missingFavorable).toEqual(['화'])
  })

  it('가을에 화가 없어 조후 조언이 붙는다', () => {
    expect(analysis.yongsin.seasonNote).toContain('가을')
    expect(analysis.yongsin.seasonNote).toContain('화')
  })
})

describe('기준 사주: 합충', () => {
  const names = analysis.relations.map((r) => r.name)

  it('신자진삼합, 인진반합, 인신충 셋을 찾는다', () => {
    expect(names.sort()).toEqual(['신자진삼합', '인신충', '인진반합'])
  })

  it('신자진삼합이 수 기운을 만들고 월·일·시지가 참여한다', () => {
    const s = analysis.relations.find((r) => r.name === '신자진삼합')!
    expect(s.kind).toBe('삼합')
    expect(s.produces).toBe('수')
    expect(s.positions.sort()).toEqual(['시지', '월지', '일지'].sort())
  })

  it('인신충이 연지와 월지 사이에 있다', () => {
    const c = analysis.relations.find((r) => r.name === '인신충')!
    expect(c.kind).toBe('충')
    expect(c.positions.sort()).toEqual(['연지', '월지'].sort())
  })

  it('삼합이 성립했으므로 그 안의 반합을 중복해서 세지 않는다', () => {
    // 신자, 자진, 신진 어느 것도 따로 잡히면 안 된다
    expect(names).not.toContain('신자반합')
    expect(names).not.toContain('자진반합')
    expect(names).not.toContain('신진반합')
  })
})

describe('기준 사주: 12운성·12신살·신살', () => {
  const byPillar = Object.fromEntries(analysis.spirits.map((s) => [s.label, s]))

  it('12운성이 맞는다', () => {
    expect(byPillar['연'].stage).toBe('절')
    expect(byPillar['월'].stage).toBe('건록')
    expect(byPillar['일'].stage).toBe('사')
    expect(byPillar['시'].stage).toBe('양')
  })

  it('12신살이 맞는다', () => {
    expect(byPillar['연'].spirit).toBe('지살')
    expect(byPillar['월'].spirit).toBe('역마')
    expect(byPillar['일'].spirit).toBe('재살')
    expect(byPillar['시'].spirit).toBe('월살')
  })

  it('기둥별 신살이 맞는다', () => {
    const names = (label: string) => byPillar[label].hits.map((h) => h.name).sort()
    expect(names('연')).toEqual(['역마살', '태극귀인'])
    expect(names('월')).toEqual(['역마살', '정록', '현침살'])
    expect(names('일')).toEqual(['낙정관살', '황은대사'])
    expect(names('시')).toEqual(['괴강살', '화개살'])
  })

  it('길성과 흉살이 제대로 갈린다', () => {
    const kinds = Object.fromEntries(
      analysis.spirits.flatMap((s) => s.hits.map((h) => [h.name, h.kind])),
    )
    expect(kinds['태극귀인']).toBe('lucky')
    expect(kinds['정록']).toBe('lucky')
    expect(kinds['황은대사']).toBe('lucky')
    expect(kinds['괴강살']).toBe('unlucky')
    expect(kinds['낙정관살']).toBe('unlucky')
  })

  it('모든 신살이 근거를 달고 나온다', () => {
    for (const s of analysis.spirits) {
      for (const h of s.hits) {
        expect(h.basis, `${s.labelFull} ${h.name}`).toBeTruthy()
        expect(h.note, `${s.labelFull} ${h.name}`).toBeTruthy()
      }
    }
  })
})

describe('기준 사주: 절기', () => {
  it('1998년 입추 절입이 8월 8일 02시 20분 (한국시)이다', () => {
    const ipchu = getSolarTermsOfYear(1998).find((t) => t.name === '입추')!
    const kst = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(ipchu.date)
    const get = (t: string) => kst.find((p) => p.type === t)?.value
    expect([get('month'), get('day'), get('hour'), get('minute')]).toEqual([
      '8',
      '8',
      '02',
      '20',
    ])
  })
})
