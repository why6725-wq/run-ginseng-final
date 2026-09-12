/**
 * 서버가 흘려보내는 조각을 읽는 도우미 (브라우저 쪽).
 *
 * 해석과 후속 질문 두 군데서 같은 방식으로 읽어서 한 곳으로 뺐다.
 *
 * SSE(Server-Sent Events)는 서버가 연결을 열어둔 채 조각을 계속 밀어넣는 방식이다.
 * 메시지는 빈 줄로 구분되고, 각 줄은 'event: 이름' 또는 'data: 내용' 형태다.
 */

export interface SseHandlers {
  /** 글자 조각이 도착했을 때 */
  onDelta: (text: string) => void
  /** 저장해 둔 결과를 돌려받았을 때 */
  onCached?: () => void
  /** 서버가 오류를 알려왔을 때 */
  onError?: (message: string) => void
}

/**
 * 응답 본문을 끝까지 읽으며 이벤트마다 알맞은 처리를 부른다.
 *
 * 응답이 실패했거나 본문이 없으면 예외를 던진다.
 */
export async function readSse(res: Response, handlers: SseHandlers): Promise<void> {
  if (!res.ok || !res.body) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail?.error ?? '요청에 실패했습니다.')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // 빈 줄이 메시지 구분자다. 마지막 조각은 아직 덜 온 것이라 남겨둔다.
    const chunks = buffer.split('\n\n')
    buffer = chunks.pop() ?? ''

    for (const chunk of chunks) {
      let event = 'message'
      let data = ''
      for (const line of chunk.split('\n')) {
        if (line.startsWith('event: ')) event = line.slice(7).trim()
        else if (line.startsWith('data: ')) data += line.slice(6)
      }
      if (!data) continue

      let payload: { text?: string; message?: string }
      try {
        payload = JSON.parse(data)
      } catch {
        continue // 깨진 조각은 건너뛴다
      }

      if (event === 'delta' && payload.text) handlers.onDelta(payload.text)
      else if (event === 'cached') handlers.onCached?.()
      else if (event === 'error') handlers.onError?.(payload.message ?? '알 수 없는 오류')
    }
  }
}
