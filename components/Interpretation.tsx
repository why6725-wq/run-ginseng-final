'use client'

import { Fragment, useMemo } from 'react'
import { ALL_TERMS } from '@/lib/terms'
import { SECTIONS } from '@/lib/prompt'
import { Term } from './Term'

/**
 * 한 글자도 빠짐없이 바로바로 화면에 뿌리되, 사람이 읽기 좋게 다듬는다.
 *
 * 1. "## 제목" 줄을 기준으로 항목을 나눠 카드로 만든다.
 * 2. 본문에 나오는 명리 용어의 첫 등장에 점선 밑줄과 설명을 붙인다.
 *
 * 2번이 "용어는 쓰되 모르는 사람도 볼 수 있게"라는 요구의 마지막 조각이다.
 * AI 도 글에서 용어를 풀어 쓰지만, 표와 같은 설명을 언제든 다시 볼 수 있게 한다.
 */

/**
 * 자동으로 밑줄을 그을 용어.
 * 오행(목·화·토·금·수)은 한 글자라 '목표', '금방' 같은 보통 낱말에도 걸려서 제외했다.
 */
const LINKABLE = Object.keys(ALL_TERMS)
  .filter((t) => t.length >= 2)
  .sort((a, b) => b.length - a.length)

const TERM_PATTERN = new RegExp(`(${LINKABLE.join('|')})`, 'g')

interface Section {
  title: string
  body: string
}

function splitSections(text: string): Section[] {
  const out: Section[] = []
  // 아직 제목이 안 나온 앞부분은 '풀이'로 묶는다 (스트리밍 도중 잠깐 생긴다)
  const parts = text.split(/^##[ \t]*/m)
  for (const [i, part] of parts.entries()) {
    if (part.trim().length === 0) continue
    if (i === 0) {
      out.push({ title: '', body: part.trim() })
      continue
    }
    const nl = part.indexOf('\n')
    if (nl === -1) {
      out.push({ title: part.trim(), body: '' })
    } else {
      out.push({ title: part.slice(0, nl).trim(), body: part.slice(nl + 1).trim() })
    }
  }
  return out
}

/** 문단 안에서 각 용어의 첫 등장에만 설명을 붙인다. */
function annotate(body: string, seen: Set<string>): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const paragraphs = body.split(/\n{2,}/)

  paragraphs.forEach((para, pi) => {
    const trimmed = para.trim()
    if (!trimmed) return

    const inner: React.ReactNode[] = []
    let last = 0
    TERM_PATTERN.lastIndex = 0
    let m: RegExpExecArray | null

    while ((m = TERM_PATTERN.exec(trimmed)) !== null) {
      const word = m[1]
      if (seen.has(word)) continue
      seen.add(word)
      if (m.index > last) inner.push(trimmed.slice(last, m.index))
      inner.push(
        <Term key={`${pi}-${m.index}`} name={word} className="font-medium text-accent">
          {word}
        </Term>,
      )
      last = m.index + word.length
    }
    if (last < trimmed.length) inner.push(trimmed.slice(last))

    nodes.push(
      <p key={pi} className="mb-3 last:mb-0">
        {inner.map((n, i) => (
          <Fragment key={i}>{n}</Fragment>
        ))}
      </p>,
    )
  })

  return nodes
}

export function Interpretation({
  text,
  streaming,
  fromCache,
}: {
  text: string
  streaming: boolean
  fromCache: boolean
}) {
  const sections = useMemo(() => splitSections(text), [text])

  // 항목 전체를 미리 보여주면 얼마나 남았는지 알 수 있어 기다리기 편하다
  const doneTitles = new Set(sections.map((s) => s.title))
  const pending = SECTIONS.filter((s) => !doneTitles.has(s.title))

  const seen = new Set<string>()

  return (
    <div className="space-y-4">
      {fromCache && (
        <p className="text-xs text-muted">
          이전에 해석한 사주라 저장해 둔 결과를 보여드립니다. 새로 받고 싶으시면 아래
          다시 풀이 버튼을 눌러 주세요.
        </p>
      )}

      {sections.map((s, i) => (
        <section
          key={i}
          className="rounded-xl border border-border bg-surface p-4 sm:p-5"
        >
          {s.title && (
            <h3 className="mb-3 border-b border-border pb-2 text-base font-semibold">
              {s.title}
            </h3>
          )}
          <div className="text-[15px] leading-[1.85] text-foreground/90">
            {annotate(s.body, seen)}
            {/* 지금 쓰고 있는 마지막 항목에 깜빡이는 커서를 붙인다 */}
            {streaming && i === sections.length - 1 && (
              <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-accent align-middle" />
            )}
          </div>
        </section>
      ))}

      {streaming &&
        pending.map((s) => (
          <section
            key={s.id}
            className="rounded-xl border border-dashed border-border p-4 sm:p-5"
          >
            <h3 className="text-base font-semibold text-muted">{s.title}</h3>
            <p className="mt-1 text-xs text-muted">차례를 기다리는 중</p>
          </section>
        ))}
    </div>
  )
}
