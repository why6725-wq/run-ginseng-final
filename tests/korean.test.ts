/**
 * 조사 처리 시험.
 *
 * '토이 금을 생한다' 같은 문장이 한 번 나가면 글 전체가 어설퍼 보인다.
 * 오행 이름을 문장에 끼워 넣는 곳이 많아 따로 확인한다.
 */

import { describe, it, expect } from 'vitest'
import { hasFinalConsonant, josa, josaAfterParen } from '../lib/korean'

describe('받침 판별', () => {
  it('받침이 있는 글자를 알아본다', () => {
    for (const w of ['목', '금', '강', '인', '신강', '용신']) {
      expect(hasFinalConsonant(w), w).toBe(true)
    }
  })

  it('받침이 없는 글자를 알아본다', () => {
    for (const w of ['화', '토', '수', '나', '세', '비', '자']) {
      expect(hasFinalConsonant(w), w).toBe(false)
    }
  })

  it('여러 글자면 마지막 글자만 본다', () => {
    // '대운'은 끝 글자 '운'에 ㄴ 받침이 있다
    expect(hasFinalConsonant('대운')).toBe(true)
    // '세운', '기신'도 마찬가지
    expect(hasFinalConsonant('세운')).toBe(true)
    expect(hasFinalConsonant('기신')).toBe(true)
    // 앞에 받침이 있어도 끝 글자에 없으면 없는 것이다
    expect(hasFinalConsonant('신강수')).toBe(false)
  })

  it('한글이 아니면 받침 없음으로 본다', () => {
    expect(hasFinalConsonant('')).toBe(false)
    expect(hasFinalConsonant('abc')).toBe(false)
    expect(hasFinalConsonant('庚')).toBe(false)
  })
})

describe('오행 이름에 조사 붙이기', () => {
  it('이/가 를 올바로 고른다', () => {
    expect(josa('목', '이/가')).toBe('목이')
    expect(josa('화', '이/가')).toBe('화가')
    expect(josa('토', '이/가')).toBe('토가')
    expect(josa('금', '이/가')).toBe('금이')
    expect(josa('수', '이/가')).toBe('수가')
  })

  it('을/를 을 올바로 고른다', () => {
    expect(josa('목', '을/를')).toBe('목을')
    expect(josa('화', '을/를')).toBe('화를')
    expect(josa('토', '을/를')).toBe('토를')
    expect(josa('금', '을/를')).toBe('금을')
    expect(josa('수', '을/를')).toBe('수를')
  })

  it('은/는 과 과/와 도 올바로 고른다', () => {
    expect(josa('금', '은/는')).toBe('금은')
    expect(josa('수', '은/는')).toBe('수는')
    expect(josa('금', '과/와')).toBe('금과')
    expect(josa('토', '과/와')).toBe('토와')
  })

  it('여러 오행을 이어 쓸 때는 마지막 글자를 따른다', () => {
    expect(josa('수, 목, 화', '이/가')).toBe('수, 목, 화가')
    expect(josa('토, 금', '이/가')).toBe('토, 금이')
  })
})

describe('괄호가 붙은 말에 조사 붙이기', () => {
  it('괄호 앞 글자를 기준으로 고른다', () => {
    expect(josaAfterParen('토', '인성', '과/와')).toBe('토(인성)와')
    expect(josaAfterParen('금', '비겁', '은/는')).toBe('금(비겁)은')
    expect(josaAfterParen('화', '관성', '이/가')).toBe('화(관성)가')
    expect(josaAfterParen('수', '식상', '이/가')).toBe('수(식상)가')
  })
})
