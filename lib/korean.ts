/**
 * 한국어 조사 처리.
 *
 * '토이 금을 생한다' 처럼 조사가 어긋나면 글이 단번에 어색해진다.
 * 오행 이름(목·화·토·금·수)을 문장에 끼워 넣는 곳이 많아 도우미로 뺐다.
 *
 * 규칙은 간단하다. 앞 글자에 받침이 있으면 '이/을/은/과', 없으면 '가/를/는/와'.
 */

const HANGUL_START = 0xac00
const HANGUL_END = 0xd7a3

/** 마지막 글자에 받침이 있는지 */
export function hasFinalConsonant(word: string): boolean {
  if (!word) return false
  const code = word.charCodeAt(word.length - 1)
  if (code < HANGUL_START || code > HANGUL_END) return false
  return (code - HANGUL_START) % 28 !== 0
}

type JosaPair = ['이', '가'] | ['을', '를'] | ['은', '는'] | ['과', '와'] | ['으로', '로']

const PAIRS: Record<string, JosaPair> = {
  '이/가': ['이', '가'],
  '을/를': ['을', '를'],
  '은/는': ['은', '는'],
  '과/와': ['과', '와'],
  '으로/로': ['으로', '로'],
}

/**
 * 단어에 알맞은 조사를 붙인다.
 *
 *   josa('토', '이/가')  ->  '토가'
 *   josa('금', '이/가')  ->  '금이'
 *   josa('수', '을/를')  ->  '수를'
 */
export function josa(word: string, kind: keyof typeof PAIRS): string {
  const [withFinal, withoutFinal] = PAIRS[kind]
  return word + (hasFinalConsonant(word) ? withFinal : withoutFinal)
}

/**
 * 괄호가 붙은 말에 조사를 붙인다. 조사는 괄호 앞 글자를 기준으로 고른다.
 *
 *   josaAfterParen('토', '인성', '과/와')  ->  '토(인성)와'
 */
export function josaAfterParen(
  word: string,
  paren: string,
  kind: keyof typeof PAIRS,
): string {
  const [withFinal, withoutFinal] = PAIRS[kind]
  return `${word}(${paren})${hasFinalConsonant(word) ? withFinal : withoutFinal}`
}
