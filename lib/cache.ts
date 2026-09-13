/**
 * 해석 결과 캐시.
 *
 * 같은 생년월일시를 다시 넣으면 Claude 를 또 부르지 않고 저장해 둔 글을 돌려준다.
 * 구독 사용량을 아끼고, 두 번째부터는 결과가 즉시 뜬다.
 *
 * 로컬 전용이라 데이터베이스 없이 파일 한 개로 처리한다.
 * 저장 위치는 프로젝트 안의 .cache 폴더이며 git 에는 올라가지 않는다.
 */

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { SajuInput } from './saju'

const CACHE_DIR = path.join(process.cwd(), '.cache', 'interpretations')

/**
 * 해석 방식이 바뀌면 이 숫자를 올린다.
 *
 * 프롬프트나 계산 항목을 고쳤는데 이 값을 그대로 두면, 예전 방식으로 쓴 글이
 * 캐시에서 그대로 나와 바뀐 게 없어 보인다. 고칠 때마다 올려야 한다.
 *
 * v2: 신강신약·용신·지장간·합충을 해석에 반영하기 시작함
 * v3: 12운성·12신살·신살·연주 공망·월운을 추가함
 * v4: 카드형 짧은 풀이와 오늘의 운세를 추가함
 */
const PROMPT_VERSION = 4

/** 입력이 같으면 같은 키가 나오도록 한다. 해석이 달라지는 요소만 넣는다. */
export function cacheKey(input: SajuInput, year: number): string {
  const material = JSON.stringify({
    v: PROMPT_VERSION,
    y: input.year,
    m: input.month,
    d: input.day,
    h: input.hour,
    mi: input.minute,
    cal: input.calendar,
    leap: input.isLeapMonth,
    g: input.gender,
    lon: input.longitude,
    tst: input.applyTrueSolarTime,
    db: input.dayBoundary,
    // 세운(올해 운세)이 들어가므로 해가 바뀌면 다시 해석해야 한다
    year,
  })
  return createHash('sha256').update(material).digest('hex').slice(0, 32)
}

/**
 * 궁합 캐시 키.
 *
 * 두 사람의 순서가 바뀌어도 같은 궁합이므로 키를 정렬해 같게 만든다.
 * 그래야 A-B 로 본 뒤 B-A 로 봐도 다시 묻지 않는다.
 */
export function compatCacheKey(
  a: SajuInput,
  b: SajuInput,
  relation: string | null,
  year: number,
): string {
  const one = (i: SajuInput) =>
    JSON.stringify({
      y: i.year,
      m: i.month,
      d: i.day,
      h: i.hour,
      mi: i.minute,
      cal: i.calendar,
      leap: i.isLeapMonth,
      g: i.gender,
      lon: i.longitude,
      tst: i.applyTrueSolarTime,
      db: i.dayBoundary,
    })
  const pair = [one(a), one(b)].sort()
  const material = JSON.stringify({ v: PROMPT_VERSION, kind: 'compat', pair, relation, year })
  return createHash('sha256').update(material).digest('hex').slice(0, 32)
}

/** 카드형 짧은 풀이 캐시 키 */
export function briefCacheKey(input: SajuInput, year: number): string {
  return hashOf({ v: PROMPT_VERSION, kind: 'brief', input: shape(input), year })
}

/** 오늘의 운세 캐시 키. 날짜가 바뀌면 자연히 새로 받는다. */
export function todayCacheKey(input: SajuInput, date: string): string {
  return hashOf({ v: PROMPT_VERSION, kind: 'today', input: shape(input), date })
}

/** 해석이 달라지는 입력 항목만 추린다 */
function shape(i: SajuInput) {
  return {
    y: i.year, m: i.month, d: i.day, h: i.hour, mi: i.minute,
    cal: i.calendar, leap: i.isLeapMonth, g: i.gender,
    lon: i.longitude, tst: i.applyTrueSolarTime, db: i.dayBoundary,
  }
}

function hashOf(material: unknown): string {
  return createHash('sha256').update(JSON.stringify(material)).digest('hex').slice(0, 32)
}

export async function readCache(key: string): Promise<string | null> {
  try {
    const text = await readFile(path.join(CACHE_DIR, `${key}.txt`), 'utf8')
    return text.length > 0 ? text : null
  } catch {
    return null
  }
}

export async function writeCache(key: string, text: string): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true })
    await writeFile(path.join(CACHE_DIR, `${key}.txt`), text, 'utf8')
  } catch {
    // 캐시 저장 실패는 치명적이지 않다. 다음번에 다시 해석하면 그만이다.
  }
}
