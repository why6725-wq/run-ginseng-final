/**
 * AI 호출 모듈.
 *
 * 이 파일 하나만 교체하면 인증 방식을 바꿀 수 있도록 일부러 격리해 두었다.
 *
 * 왜 격리했는가:
 *   Anthropic 공식 문서는 "사전 승인 없이는 서드파티 개발자가 자사 제품에
 *   claude.ai 로그인이나 요금제 한도를 제공할 수 없다"고 밝히고 있다.
 *   내 컴퓨터에서 내 구독으로 나 혼자 쓰는 것은 Claude Code 를 쓰는 것과 같아
 *   문제가 없지만, 나중에 남에게 서비스하려면 API 키 방식으로 바꿔야 한다.
 *   그때 고칠 파일이 이 파일 하나가 되도록 했다.
 *
 * 인증 우선순위 (Claude Code 공식 문서의 자격증명 순서를 그대로 따른다):
 *   1. ANTHROPIC_API_KEY      — 종량제 API 키 (나중에 서비스할 때)
 *   2. CLAUDE_CODE_OAUTH_TOKEN — 구독 로그인 토큰 (지금 쓰는 방식)
 *   3. 위 둘 다 없으면, 이 컴퓨터에 이미 로그인된 Claude Code 계정
 */

import { query } from '@anthropic-ai/claude-agent-sdk'

export type AuthMode = 'api-key' | 'subscription-token' | 'local-login'

export interface AuthStatus {
  mode: AuthMode
  /** 사람이 읽을 설명 */
  label: string
  /** 구독 사용량을 쓰는지 (종량제 과금이 아닌지) */
  usesSubscription: boolean
}

export function detectAuth(): AuthStatus {
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      mode: 'api-key',
      label: 'API 키 (종량제 과금)',
      usesSubscription: false,
    }
  }
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    return {
      mode: 'subscription-token',
      label: '구독 토큰 (Claude 구독 요금제)',
      usesSubscription: true,
    }
  }
  return {
    mode: 'local-login',
    label: '이 컴퓨터의 Claude Code 로그인',
    usesSubscription: true,
  }
}

export interface StreamOptions {
  system: string
  prompt: string
  model?: string
  signal?: AbortSignal
}

/**
 * Claude 에게 물어보고, 글자가 생기는 대로 흘려보낸다.
 *
 * 도구는 전부 껐다(`tools: []`). 파일을 읽거나 명령을 실행할 이유가 없고,
 * 순수하게 글만 쓰게 하는 편이 빠르고 안전하다.
 *
 * `settingSources: []` 는 내 컴퓨터의 Claude 설정(CLAUDE.md 등)을 불러오지 않게 한다.
 * 이걸 켜두면 개인 설정이 해석문에 섞여 들어가 결과가 들쭉날쭉해진다.
 */
export async function* streamInterpretation(
  opts: StreamOptions,
): AsyncGenerator<string, void, unknown> {
  const response = query({
    prompt: opts.prompt,
    options: {
      systemPrompt: opts.system,
      model: opts.model ?? process.env.SAJU_MODEL ?? 'claude-sonnet-5',
      tools: [], // 내장 도구 전부 끄기 — 글쓰기 전용
      settingSources: [], // 로컬 Claude 설정 불러오지 않기
      maxTurns: 1,
      permissionMode: 'default',
      includePartialMessages: true, // 토큰 단위 스트리밍을 받기 위해 필요
      abortController: toController(opts.signal),
    },
  })

  let emitted = 0

  for await (const message of response) {
    // 토큰 단위 조각
    if (message.type === 'stream_event') {
      const ev = (message as { event?: unknown }).event as
        | { type?: string; delta?: { type?: string; text?: string } }
        | undefined
      if (ev?.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
        const text = ev.delta.text ?? ''
        if (text) {
          emitted += text.length
          yield text
        }
      }
      continue
    }

    // 스트리밍이 동작하지 않은 경우를 대비한 안전망.
    // 이미 흘려보낸 내용이 있으면 중복되므로 건너뛴다.
    if (message.type === 'result') {
      const result = (message as { subtype?: string; result?: string })
      if (result.subtype !== 'success') {
        throw new Error(describeFailure(result.subtype))
      }
      if (emitted === 0 && typeof result.result === 'string') {
        yield result.result
      }
    }
  }

  if (emitted === 0) {
    throw new Error('Claude 가 응답을 반환하지 않았습니다. 잠시 후 다시 시도해 주세요.')
  }
}

function toController(signal?: AbortSignal): AbortController | undefined {
  if (!signal) return undefined
  const controller = new AbortController()
  if (signal.aborted) controller.abort()
  else signal.addEventListener('abort', () => controller.abort(), { once: true })
  return controller
}

function describeFailure(subtype?: string): string {
  switch (subtype) {
    case 'error_max_turns':
      return '대화 횟수 제한에 걸렸습니다.'
    case 'error_during_execution':
      return 'Claude 실행 중 오류가 발생했습니다. 로그인 상태를 확인해 주세요.'
    default:
      return `해석에 실패했습니다 (${subtype ?? '알 수 없는 오류'}).`
  }
}
