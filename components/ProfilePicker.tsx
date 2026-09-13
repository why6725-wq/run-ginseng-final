'use client'

import { useState, useSyncExternalStore } from 'react'
import {
  loadProfiles,
  removeProfile,
  saveProfile,
  serverProfiles,
  subscribeProfiles,
} from '@/lib/profiles'
import type { SajuInput } from '@/lib/saju'

/**
 * 저장해 둔 사람 목록.
 *
 * 나, 배우자, 부모를 담아두고 눌러서 불러온다.
 * 궁합을 볼 때 두 명 생년월일을 매번 치는 게 번거로워 넣었다.
 *
 * 브라우저에만 저장한다. 서버로 보내지 않으니 생년월일이 밖으로 나갈 일이 없다.
 */
export function ProfilePicker({
  onPick,
  compact,
}: {
  onPick: (input: SajuInput, name: string) => void
  /** 궁합 화면처럼 자리가 좁을 때 */
  compact?: boolean
}) {
  // 브라우저 저장소를 그대로 구독한다. 서버에서 그릴 때는 빈 목록으로 시작한다.
  const profiles = useSyncExternalStore(subscribeProfiles, loadProfiles, serverProfiles)

  if (profiles.length === 0) return null

  return (
    <div className={compact ? '' : 'mb-4'}>
      <p className="mb-2 text-xs font-medium text-muted">저장해 둔 사람</p>
      <div className="flex flex-wrap gap-1.5">
        {profiles.map((p) => (
          <span
            key={p.id}
            className="group flex items-center gap-1 rounded-full border border-border bg-surface-2 pl-3 pr-1 text-xs"
          >
            <button
              type="button"
              onClick={() => onPick(p.input, p.name)}
              className="py-1.5 font-medium transition hover:text-accent"
            >
              {p.name}
            </button>
            <button
              type="button"
              aria-label={`${p.name} 지우기`}
              onClick={() => removeProfile(p.id)}
              className="flex h-5 w-5 items-center justify-center rounded-full text-muted transition hover:bg-fire/20 hover:text-fire"
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * 결과를 본 뒤 이 사람을 저장하는 단추.
 *
 * 미리 저장하라고 하면 아무도 안 한다.
 * 결과를 보고 마음에 들 때 저장하는 흐름이 자연스럽다.
 */
export function SaveProfileButton({
  input,
  defaultName,
}: {
  input: SajuInput
  defaultName?: string | null
}) {
  const [name, setName] = useState(defaultName ?? '')
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)

  if (saved) {
    return (
      <p className="text-center text-xs text-muted">
        <strong className="text-accent">{name}</strong> 님으로 저장했습니다. 다음에 이름만
        누르면 바로 불러옵니다.
      </p>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-border px-4 py-2.5 text-sm text-muted transition hover:border-accent hover:text-accent"
      >
        이 사주 저장해 두기
      </button>
    )
  }

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        saveProfile(name, input)
        setSaved(true)
      }}
    >
      <input
        className="field flex-1"
        value={name}
        maxLength={20}
        autoFocus
        placeholder="이름 (예: 나, 엄마)"
        onChange={(e) => setName(e.target.value)}
      />
      <button type="submit" disabled={!name.trim()} className="btn-primary shrink-0 px-4 text-sm">
        저장
      </button>
    </form>
  )
}
