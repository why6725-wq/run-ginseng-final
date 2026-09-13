'use client'

import { useCallback, useRef, useState } from 'react'
import type { Persona } from '@/lib/persona'
import type { SajuChart } from '@/lib/saju'

/**
 * 공유용 세로 카드.
 *
 * 인스타 스토리 규격(1080×1920)으로 그려서 이미지로 내려받는다.
 * 사람들이 결과를 퍼 나르는 이유가 되는 부분이라, 화면에서 그냥 캡처하는 것보다
 * 목적에 맞게 새로 그리는 편이 낫다.
 *
 * 서버를 거치지 않고 브라우저 캔버스에서 바로 그린다.
 * 생년월일이 밖으로 나갈 일이 없고, 글꼴도 보는 사람 기기 것을 그대로 쓴다.
 */
export function ShareCard({
  persona,
  chart,
  name,
}: {
  persona: Persona
  chart: SajuChart
  name?: string | null
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const draw = useCallback((): HTMLCanvasElement | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const W = 1080
    const H = 1920
    canvas.width = W
    canvas.height = H

    const [from, to] = persona.gradient

    // 배경 — 밤하늘 위에 오행 색을 얹는다
    ctx.fillStyle = '#0b0a18'
    ctx.fillRect(0, 0, W, H)

    const g = ctx.createLinearGradient(0, 0, W, H)
    g.addColorStop(0, from)
    g.addColorStop(1, to)
    ctx.globalAlpha = 0.9
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    ctx.globalAlpha = 1

    // 위쪽 빛 번짐
    const glow = ctx.createRadialGradient(W * 0.8, H * 0.12, 0, W * 0.8, H * 0.12, W * 0.7)
    glow.addColorStop(0, 'rgba(255,255,255,0.28)')
    glow.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, W, H)

    const sans =
      "'Pretendard', -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif"
    const serif = "'Apple SD Gothic Neo', 'Noto Serif KR', 'Batang', serif"

    ctx.textAlign = 'center'
    let y = 400

    if (name) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      ctx.font = `500 42px ${sans}`
      ctx.fillText(`${name} 님의 사주`, W / 2, y)
      y += 90
    } else {
      y += 30
    }

    // 부제
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.font = `600 48px ${sans}`
    ctx.fillText(persona.subtitle, W / 2, y)
    y += 110

    // 별명 — 가장 크게
    ctx.fillStyle = '#ffffff'
    ctx.font = `800 104px ${sans}`
    ctx.fillText(persona.title, W / 2, y)
    y += 120

    // 키워드
    ctx.font = `600 40px ${sans}`
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    const tags = persona.keywords.slice(0, 4).map((k) => `#${k}`)
    const gap = 28
    const widths = tags.map((t) => ctx.measureText(t).width + 48)
    const totalW = widths.reduce((a, b) => a + b, 0) + gap * (tags.length - 1)
    let x = (W - totalW) / 2
    for (const [i, tag] of tags.entries()) {
      const w = widths[i]
      ctx.fillStyle = 'rgba(0,0,0,0.22)'
      roundRect(ctx, x, y - 44, w, 68, 34)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.fillText(tag, x + w / 2, y)
      x += w + gap
    }
    y += 150

    // 설명
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.font = `400 42px ${sans}`
    y = wrapText(ctx, persona.line, W / 2, y, W - 200, 66)
    // 글자 수에 따라 남는 공간이 달라지므로, 여덟 글자를 아래쪽 고정 위치에 놓는다
    y = Math.max(y + 120, 1360)

    // 여덟 글자
    const cols = chart.pillars.length + (chart.hourUnknown ? 1 : 0)
    const boxW = 170
    const boxH = 230
    const boxGap = 24
    const startX = (W - (boxW * cols + boxGap * (cols - 1))) / 2
    const labels = [...chart.pillars.map((p) => p.labelFull), ...(chart.hourUnknown ? ['시주'] : [])]

    for (let i = 0; i < cols; i++) {
      const bx = startX + i * (boxW + boxGap)
      ctx.fillStyle = 'rgba(0,0,0,0.22)'
      roundRect(ctx, bx, y, boxW, boxH, 28)
      ctx.fill()

      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.font = `500 28px ${sans}`
      ctx.fillText(labels[i], bx + boxW / 2, y + 48)

      const p = chart.pillars[i]
      ctx.fillStyle = '#ffffff'
      ctx.font = `700 62px ${serif}`
      ctx.fillText(p ? p.stemHanja : '?', bx + boxW / 2, y + 126)
      ctx.fillText(p ? p.branchHanja : '?', bx + boxW / 2, y + 196)
    }
    y += boxH + 120

    // 맨 아래 문구
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = `500 34px ${sans}`
    ctx.fillText('내 사주 보러 가기', W / 2, H - 140)
    ctx.font = `400 28px ${sans}`
    ctx.fillText('오락과 참고용입니다', W / 2, H - 90)

    return canvas
  }, [persona, chart, name])

  const download = useCallback(async () => {
    setBusy(true)
    setDone(false)
    try {
      const canvas = draw()
      if (!canvas) return

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png'),
      )
      if (!blob) return

      const file = new File([blob], `사주-${persona.title}.png`, { type: 'image/png' })

      // 휴대폰에서는 공유 시트를 띄우는 편이 자연스럽다
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: persona.title })
        setDone(true)
        return
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      URL.revokeObjectURL(url)
      setDone(true)
    } catch {
      // 사용자가 공유를 취소한 경우도 여기로 온다. 조용히 넘긴다.
    } finally {
      setBusy(false)
    }
  }, [draw, persona.title])

  return (
    <>
      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="btn-primary w-full px-4 py-3 text-sm"
      >
        {busy ? '만드는 중…' : done ? '카드 다시 받기' : '공유 카드 만들기'}
      </button>
      <p className="mt-2 text-center text-xs text-muted">
        인스타 스토리에 올릴 수 있는 세로 이미지로 저장됩니다.
      </p>
      <canvas ref={canvasRef} className="hidden" aria-hidden />
    </>
  )
}

/** 둥근 네모. 구형 브라우저에도 있는 그리기만 쓴다. */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

/** 글자를 폭에 맞춰 줄바꿈하며 그린다. 마지막 y 를 돌려준다. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(' ')
  let line = ''
  let cur = y
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, cx, cur)
      line = w
      cur += lineHeight
    } else {
      line = test
    }
  }
  if (line) {
    ctx.fillText(line, cx, cur)
    cur += lineHeight
  }
  return cur
}
