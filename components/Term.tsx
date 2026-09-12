'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ALL_TERMS } from '@/lib/terms'

/**
 * 명리 용어에 점선 밑줄을 긋고, 마우스를 올리거나 누르면 설명을 띄운다.
 *
 * 요구사항이 "용어는 쓰되 모르는 사람도 알아볼 수 있게"이므로,
 * 표에는 용어를 그대로 쓰되 설명을 언제든 꺼내볼 수 있게 했다.
 *
 * 설명 상자는 화면 맨 위 층(포털)에 그린다.
 * 만세력 표는 좌우로 스크롤되는 상자 안에 있어서, 그 안에 그리면 설명이 잘려 버린다.
 */

const WIDTH = 288 // 설명 상자 너비(px). 화면 밖으로 넘치지 않게 계산에 쓴다.
const MARGIN = 8

export function Term({
  name,
  children,
  className = '',
}: {
  name: string
  children?: React.ReactNode
  className?: string
}) {
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const entry = ALL_TERMS[name]

  const place = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()

    // 좌우로 화면을 벗어나지 않게 가둔다
    const half = WIDTH / 2
    const wanted = r.left + r.width / 2
    const left = Math.min(
      Math.max(wanted, half + MARGIN),
      window.innerWidth - half - MARGIN,
    )

    // 아래 공간이 부족하면 위로 띄운다
    const below = window.innerHeight - r.bottom
    const above = below < 180 && r.top > below

    setPos({ top: above ? r.top - MARGIN : r.bottom + MARGIN, left, above })
  }, [])

  const open = pos !== null
  const close = useCallback(() => setPos(null), [])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    // 스크롤하면 위치가 어긋나므로 닫는다
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open, close])

  // 사전에 없는 말이면 그냥 글자로 보여준다
  if (!entry) return <span className={className}>{children ?? name}</span>

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`term ${className}`}
        aria-expanded={open}
        onClick={() => (open ? close() : place())}
        onMouseEnter={place}
        onMouseLeave={close}
        onFocus={place}
        onBlur={close}
      >
        {children ?? name}
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <span
            role="tooltip"
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              width: WIDTH,
              transform: `translate(-50%, ${pos.above ? '-100%' : '0'})`,
            }}
            className="pointer-events-none z-[100] block rounded-lg border border-border bg-surface p-3 text-left text-xs leading-relaxed font-normal text-foreground shadow-xl"
          >
            <span className="mb-1 block font-semibold">
              {name} <span className="hanja text-muted">{entry.hanja}</span>
            </span>
            <span className="block text-muted">{entry.long}</span>
          </span>,
          document.body,
        )}
    </>
  )
}
