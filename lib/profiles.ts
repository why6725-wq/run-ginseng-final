/**
 * 저장해 둔 사람들 (브라우저 쪽).
 *
 * 나, 배우자, 부모를 목록에 담아두고 골라 쓴다.
 * 궁합을 볼 때 두 명 생년월일을 매번 치는 게 번거로워서 넣었다.
 *
 * 서버나 데이터베이스는 쓰지 않는다. 로컬 전용 도구라
 * 브라우저 저장소 하나면 충분하고, 생년월일이 밖으로 나갈 일도 없다.
 */

import type { SajuInput } from './saju'

const KEY = 'saju.profiles.v1'
const MAX = 20

export interface Profile {
  id: string
  name: string
  input: SajuInput
  /** 저장한 시각 (정렬용) */
  savedAt: number
}

function safeParse(raw: string | null): Profile[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (p): p is Profile =>
        p &&
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        typeof p.savedAt === 'number' &&
        p.input &&
        typeof p.input.year === 'number',
    )
  } catch {
    return []
  }
}

/*
 * 화면이 저장소를 구독할 수 있게 아주 작은 보관소를 둔다.
 *
 * 목록을 매번 새로 만들어 돌려주면 리액트가 "바뀌었다"고 착각해 무한히 다시 그린다.
 * 그래서 내용이 실제로 바뀔 때만 새 배열을 만들고, 아니면 같은 것을 돌려준다.
 */
const EMPTY: Profile[] = []
let cache: Profile[] | null = null
const listeners = new Set<() => void>()

function readFromStorage(): Profile[] {
  if (typeof window === 'undefined') return EMPTY
  try {
    const list = safeParse(window.localStorage.getItem(KEY))
    return list.length === 0 ? EMPTY : list.sort((a, b) => b.savedAt - a.savedAt)
  } catch {
    // 시크릿 모드나 저장소 차단 시 조용히 빈 목록으로 간다
    return EMPTY
  }
}

export function loadProfiles(): Profile[] {
  if (cache === null) cache = readFromStorage()
  return cache
}

/** 화면이 목록 변화를 구독한다 */
export function subscribeProfiles(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** 서버에서 그릴 때는 항상 빈 목록이다. 브라우저 저장소를 읽을 수 없기 때문이다. */
export function serverProfiles(): Profile[] {
  return EMPTY
}

function write(list: Profile[]): Profile[] {
  const trimmed = list.slice(0, MAX)
  try {
    window.localStorage.setItem(KEY, JSON.stringify(trimmed))
  } catch {
    // 저장이 안 되어도 화면 동작은 막지 않는다
  }
  cache = trimmed.length === 0 ? EMPTY : trimmed
  for (const fn of listeners) fn()
  return cache
}

/** 같은 이름이 있으면 덮어쓴다. 이름이 곧 식별자인 셈이다. */
export function saveProfile(name: string, input: SajuInput): Profile[] {
  const clean = name.trim().slice(0, 20)
  if (!clean) return loadProfiles()

  const list = loadProfiles().filter((p) => p.name !== clean)
  const profile: Profile = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: clean,
    input,
    savedAt: Date.now(),
  }
  return write([profile, ...list])
}

export function removeProfile(id: string): Profile[] {
  return write(loadProfiles().filter((p) => p.id !== id))
}

/** 이미 저장된 사람인지 (이름 기준) */
export function findByName(name: string): Profile | null {
  const clean = name.trim()
  return loadProfiles().find((p) => p.name === clean) ?? null
}
