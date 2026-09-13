'use client'

import { useCallback, useRef, useState } from 'react'
import type { SajuInput } from '@/lib/saju'
import { MAX_QUESTION_LENGTH, type QnaTurn } from '@/lib/followup'
import { readSse } from '@/lib/sse'
import { Term } from './Term'

/**
 * 해석을 읽고 난 뒤 이어서 묻는 자리.
 *
 * 아홉 항목을 읽다 보면 자연히 묻고 싶은 게 생긴다.
 * 계산된 사주와 방금 읽은 해석을 그대로 문맥에 얹어 보내므로,
 * 앞에서 한 말과 어긋나지 않는 답이 나온다.
 *
 * 무엇을 물어야 할지 막막한 분을 위해 질문 보기를 함께 띄운다.
 */
export function FollowUp({
  input,
  interpretation,
  suggestions,
}: {
  /** 서버가 사주를 다시 계산할 수 있도록 입력을 그대로 넘긴다 */
  input: SajuInput
  /** 앞서 보여준 아홉 항목 해석 전문 */
  interpretation: string
  /** 무엇을 물을지 막막한 분을 위한 질문 보기 */
  suggestions: string[]
}) {
  const [history, setHistory] = useState<QnaTurn[]>([])
  const [question, setQuestion] = useState('')
  const [pending, setPending] = useState<{ question: string; answer: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const ask = useCallback(
    async (text: string) => {
      const q = text.trim()
      if (!q || busy) return

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setQuestion('')
      setError(null)
      setBusy(true)
      setPending({ question: q, answer: '' })
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)

      let answer = ''
      try {
        const res = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input, interpretation, history, question: q }),
          signal: controller.signal,
        })

        await readSse(res, {
          onDelta: (t) => {
            answer += t
            setPending({ question: q, answer })
          },
          onError: (m) => setError(m),
        })

        if (answer.trim()) {
          setHistory((h) => [...h, { question: q, answer }])
          setPending(null)
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setError(e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.')
        }
        // 답이 일부라도 왔으면 버리지 않고 남긴다
        if (answer.trim()) {
          setHistory((h) => [...h, { question: q, answer }])
          setPending(null)
        }
      } finally {
        setBusy(false)
      }
    },
    [busy, history, input, interpretation],
  )

  const unused = suggestions.filter(
    (s) => !history.some((h) => h.question === s) && s !== pending?.question,
  )

  return (
    <div className="space-y-4">
      {/* 지금까지의 문답 */}
      {history.map((t, i) => (
        <QnaBlock key={i} question={t.question} answer={t.answer} />
      ))}

      {pending && (
        <QnaBlock question={pending.question} answer={pending.answer} streaming={busy} />
      )}

      {error && (
        <div className="rounded-xl border border-fire/40 bg-fire/10 p-3 text-sm text-fire">
          {error}
        </div>
      )}

      {/* 질문 보기 */}
      {unused.length > 0 && (
        <div>
          <p className="mb-2 text-xs text-muted">
            {history.length === 0 ? '이런 걸 물어보실 수 있습니다.' : '다른 질문도 있습니다.'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unused.slice(0, 4).map((s) => (
              <button
                key={s}
                type="button"
                disabled={busy}
                onClick={() => ask(s)}
                className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 입력 */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          ask(question)
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={question}
          maxLength={MAX_QUESTION_LENGTH}
          disabled={busy}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="궁금한 점을 물어보세요"
          aria-label="후속 질문"
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || question.trim().length === 0}
          className="shrink-0 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? '답하는 중' : '묻기'}
        </button>
      </form>

      <p className="text-xs leading-relaxed text-muted">
        계산된 <Term name="일주">사주</Term>와 위 풀이를 그대로 참고해 답합니다. 질문을
        주고받을 때마다 구독 사용량을 씁니다.
      </p>

      <div ref={endRef} />
    </div>
  )
}

function QnaBlock({
  question,
  answer,
  streaming,
}: {
  question: string
  answer: string
  streaming?: boolean
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-accent/15 px-3.5 py-2.5 text-sm leading-relaxed">
          {question}
        </p>
      </div>
      <div className="rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-3">
        {answer ? (
          <div className="text-[15px] leading-[1.85] text-foreground/85">
            {answer
              .split(/\n{2,}/)
              .filter((p) => p.trim())
              .map((p, i, arr) => (
                <p key={i} className="mb-3 last:mb-0">
                  {p.trim()}
                  {streaming && i === arr.length - 1 && (
                    <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-accent align-middle" />
                  )}
                </p>
              ))}
          </div>
        ) : (
          <p className="text-sm text-muted">사주를 다시 들여다보고 있습니다.</p>
        )}
      </div>
    </div>
  )
}
