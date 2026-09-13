/**
 * 분포 시험.
 *
 * 한 사주만 놓고 보면 멀쩡한데, 수백 개를 돌려 보면 판정이 한쪽으로 쏠려 있을 수 있다.
 * 실제로 처음 만든 배점은 절반 넘는 사주를 신약으로 몰았고, 오늘의 운세는 절반이
 * 50점대에 뭉쳐 매일 봐도 늘 같은 말이 나왔다. 눈으로는 잡히지 않던 문제였다.
 *
 * 그래서 표본을 만들어 놓고 쏠림을 자동으로 잡는다.
 * 여기 걸리면 "틀렸다"기보다 "사람들이 보기에 재미없어졌다"는 뜻이다.
 *
 * 사람이 눈으로 보려면 scripts/distribution.mts 를 돌리면 된다.
 */

import { describe, it, expect } from 'vitest'
import { analyze } from '../lib/analysis'
import { buildTodayFortune } from '../lib/today'
import { buildPersona } from '../lib/persona'
import { chartOf, NOW } from './fixtures'

/** 1960~2005년에 걸쳐 날짜와 시각을 고루 흩은 표본 */
const CHARTS = (() => {
  const out = []
  for (let year = 1960; year <= 2005; year += 1) {
    for (const [month, day] of [
      [1, 8],
      [3, 21],
      [5, 5],
      [7, 17],
      [9, 29],
      [11, 12],
    ] as [number, number][]) {
      out.push(
        chartOf({
          year,
          month,
          day,
          hour: (year * 7 + month * 5 + day) % 24,
          minute: (day * 13) % 60,
          gender: year % 2 ? 'male' : 'female',
          applyTrueSolarTime: true,
        }),
      )
    }
  }
  return out
})()

const share = (n: number, total: number) => n / total

describe('신강신약 분포', () => {
  const verdicts = CHARTS.map((c) => analyze(c).strength.verdict)
  const scores = CHARTS.map((c) => analyze(c).strength.score)
  const n = verdicts.length

  it('표본이 충분히 많다', () => {
    expect(n).toBeGreaterThan(250)
  })

  it('세 판정 가운데 어느 하나도 절반을 넘지 않는다', () => {
    for (const v of ['신강', '중화', '신약']) {
      const pct = share(verdicts.filter((x) => x === v).length, n)
      expect(pct, `${v} ${(pct * 100).toFixed(1)}%`).toBeLessThan(0.5)
    }
  })

  it('세 판정이 모두 15% 이상 나온다', () => {
    for (const v of ['신강', '중화', '신약']) {
      const pct = share(verdicts.filter((x) => x === v).length, n)
      expect(pct, `${v} ${(pct * 100).toFixed(1)}%`).toBeGreaterThan(0.15)
    }
  })

  it('평균이 한가운데인 50점 근처에 온다', () => {
    const mean = scores.reduce((a, b) => a + b, 0) / n
    expect(mean, `평균 ${mean.toFixed(1)}점`).toBeGreaterThan(45)
    expect(mean, `평균 ${mean.toFixed(1)}점`).toBeLessThan(55)
  })

  it('점수가 양쪽 끝까지 벌어진다', () => {
    expect(Math.min(...scores)).toBeLessThan(30)
    expect(Math.max(...scores)).toBeGreaterThan(70)
  })
})

describe('오늘의 운세 분포', () => {
  // 한 사람의 하루만 보면 폭을 알 수 없다. 사주마다 이레씩 본다
  const scores: number[] = []
  const headlines: string[] = []
  for (const chart of CHARTS) {
    const a = analyze(chart)
    for (let i = 0; i < 7; i += 1) {
      const f = buildTodayFortune(chart, a, new Date(NOW.getTime() + i * 86400000))
      scores.push(f.score)
      headlines.push(f.headline)
    }
  }
  const n = scores.length

  it('한 점수대에 3분의 1 넘게 뭉치지 않는다', () => {
    const buckets = new Map<number, number>()
    for (const s of scores) {
      const b = Math.floor(s / 10) * 10
      buckets.set(b, (buckets.get(b) ?? 0) + 1)
    }
    for (const [b, count] of buckets) {
      const pct = share(count, n)
      expect(pct, `${b}점대가 ${(pct * 100).toFixed(1)}%`).toBeLessThan(0.34)
    }
  })

  it('아주 좋은 날과 아주 나쁜 날이 실제로 나온다', () => {
    expect(share(scores.filter((s) => s >= 80).length, n)).toBeGreaterThan(0.02)
    expect(share(scores.filter((s) => s < 30).length, n)).toBeGreaterThan(0.02)
  })

  it('사분위가 충분히 벌어져 날마다 다르게 읽힌다', () => {
    const sorted = [...scores].sort((a, b) => a - b)
    const q = (p: number) => sorted[Math.floor((sorted.length - 1) * p)]
    expect(q(0.75) - q(0.25), `사분위 폭 ${q(0.75) - q(0.25)}`).toBeGreaterThan(15)
  })

  it('다섯 한 줄이 모두 쓰이고, 하나가 절반을 먹지 않는다', () => {
    const counts = new Map<string, number>()
    for (const h of headlines) counts.set(h, (counts.get(h) ?? 0) + 1)
    expect(counts.size).toBe(5)
    for (const [h, count] of counts) {
      const pct = share(count, n)
      expect(pct, `"${h}" ${(pct * 100).toFixed(1)}%`).toBeLessThan(0.5)
      expect(pct, `"${h}" ${(pct * 100).toFixed(1)}%`).toBeGreaterThan(0.02)
    }
  })

  it('겁주는 쪽으로 기울지 않는다', () => {
    // 나쁜 날이 절반을 넘으면 매일 들어올 이유가 없어진다
    const bad = share(scores.filter((s) => s < 45).length, n)
    expect(bad, `45점 미만이 ${(bad * 100).toFixed(1)}%`).toBeLessThan(0.45)
  })
})

describe('유형 별명 분포', () => {
  const titles = CHARTS.map((c) => buildPersona(c, analyze(c)).title)

  it('서른 별명이 모두 쓰인다', () => {
    expect(new Set(titles).size).toBe(30)
  })

  it('한 별명이 10%를 넘지 않는다', () => {
    const counts = new Map<string, number>()
    for (const t of titles) counts.set(t, (counts.get(t) ?? 0) + 1)
    for (const [t, count] of counts) {
      const pct = share(count, titles.length)
      expect(pct, `"${t}" ${(pct * 100).toFixed(1)}%`).toBeLessThan(0.1)
    }
  })
})
