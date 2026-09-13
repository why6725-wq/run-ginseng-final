'use client'

import { useState } from 'react'
import { BIRTH_PLACES, DEFAULT_PLACE, type SajuInput } from '@/lib/saju'

export interface FormState {
  year: string
  month: string
  day: string
  hour: string
  minute: string
  hourUnknown: boolean
  calendar: 'solar' | 'lunar'
  isLeapMonth: boolean
  gender: 'male' | 'female'
  place: string
  applyTrueSolarTime: boolean
  dayBoundary: 'midnight' | 'jasi' | 'splitJasi'
}

export const INITIAL_FORM: FormState = {
  year: '',
  month: '',
  day: '',
  hour: '',
  minute: '0',
  hourUnknown: false,
  calendar: 'solar',
  isLeapMonth: false,
  gender: 'male',
  place: DEFAULT_PLACE.name,
  applyTrueSolarTime: true,
  dayBoundary: 'midnight',
}

export function toInput(f: FormState): SajuInput {
  const place = BIRTH_PLACES.find((p) => p.name === f.place) ?? DEFAULT_PLACE
  return {
    year: Number(f.year),
    month: Number(f.month),
    day: Number(f.day),
    hour: f.hourUnknown || f.hour === '' ? null : Number(f.hour),
    minute: f.hourUnknown ? 0 : Number(f.minute || 0),
    calendar: f.calendar,
    isLeapMonth: f.calendar === 'lunar' && f.isLeapMonth,
    gender: f.gender,
    longitude: place.longitude,
    applyTrueSolarTime: f.applyTrueSolarTime,
    dayBoundary: f.dayBoundary,
  }
}

/** 저장해 둔 사람을 눌렀을 때 폼을 채운다 */
export function fromInput(input: SajuInput): FormState {
  const place = BIRTH_PLACES.find((p) => p.longitude === input.longitude) ?? DEFAULT_PLACE
  return {
    year: String(input.year),
    month: String(input.month),
    day: String(input.day),
    hour: input.hour === null ? '' : String(input.hour),
    minute: String(input.minute),
    hourUnknown: input.hour === null,
    calendar: input.calendar,
    isLeapMonth: input.isLeapMonth,
    gender: input.gender,
    place: place.name,
    applyTrueSolarTime: input.applyTrueSolarTime,
    dayBoundary: input.dayBoundary,
  }
}

export function isReady(f: FormState): boolean {
  return f.year !== '' && f.month !== '' && f.day !== '' && (f.hourUnknown || f.hour !== '')
}

const label = 'mb-1.5 block text-xs font-medium text-muted'

/** 두 개 중 하나를 고르는 토글 */
function Toggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-xl border px-3 py-2.5 text-sm transition ${
            value === o.value
              ? 'border-accent bg-accent/15 font-semibold text-accent'
              : 'border-border text-muted hover:border-accent/50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function BirthForm({
  value,
  onChange,
  onSubmit,
  busy,
  hideSubmit,
  submitLabel = '내 사주 보기',
}: {
  value: FormState
  onChange: (f: FormState) => void
  onSubmit: () => void
  busy: boolean
  /** 궁합처럼 폼이 둘일 때는 제출 단추를 바깥에 하나만 둔다 */
  hideSubmit?: boolean
  submitLabel?: string
}) {
  const [advanced, setAdvanced] = useState(false)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    onChange({ ...value, [k]: v })

  const ready = isReady(value)

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (ready && !busy) onSubmit()
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className={label}>달력</span>
          <Toggle
            value={value.calendar}
            onChange={(v) => set('calendar', v)}
            options={[
              { value: 'solar', label: '양력' },
              { value: 'lunar', label: '음력' },
            ]}
          />
        </div>
        <div>
          <span className={label}>성별</span>
          <Toggle
            value={value.gender}
            onChange={(v) => set('gender', v)}
            options={[
              { value: 'male', label: '남성' },
              { value: 'female', label: '여성' },
            ]}
          />
        </div>
      </div>

      {value.calendar === 'lunar' && (
        <label className="flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={value.isLeapMonth}
            onChange={(e) => set('isLeapMonth', e.target.checked)}
            className="accent-[var(--accent)]"
          />
          윤달입니다
        </label>
      )}

      {/* 생년월일 */}
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            { id: 'year', key: 'year', label: '년', ph: '1998', min: 1900, max: 2100 },
            { id: 'month', key: 'month', label: '월', ph: '8', min: 1, max: 12 },
            { id: 'day', key: 'day', label: '일', ph: '21', min: 1, max: 31 },
          ] as const
        ).map((f) => (
          <div key={f.id}>
            <label className={label} htmlFor={f.id}>
              {f.label}
            </label>
            <input
              id={f.id}
              className="field"
              type="number"
              inputMode="numeric"
              placeholder={f.ph}
              min={f.min}
              max={f.max}
              value={value[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
            />
          </div>
        ))}
      </div>

      {/* 태어난 시각 */}
      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className={`${label} mb-0`}>태어난 시각</span>
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <input
              type="checkbox"
              checked={value.hourUnknown}
              onChange={(e) => set('hourUnknown', e.target.checked)}
              className="accent-[var(--accent)]"
            />
            모름
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            className="field"
            type="number"
            inputMode="numeric"
            placeholder="8 (시)"
            min={0}
            max={23}
            disabled={value.hourUnknown}
            value={value.hour}
            onChange={(e) => set('hour', e.target.value)}
            aria-label="시"
          />
          <input
            className="field"
            type="number"
            inputMode="numeric"
            placeholder="10 (분)"
            min={0}
            max={59}
            disabled={value.hourUnknown}
            value={value.minute}
            onChange={(e) => set('minute', e.target.value)}
            aria-label="분"
          />
        </div>
        {value.hourUnknown && (
          <p className="mt-1.5 text-xs text-muted">
            시각을 모르면 시주를 비우고 세 기둥으로 풀이합니다.
          </p>
        )}
      </div>

      {/* 고급 설정 */}
      <div className="rounded-xl border border-border">
        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2.5 text-xs text-muted"
        >
          <span>
            태어난 지역 · 계산 방식
            {value.place !== DEFAULT_PLACE.name && (
              <span className="ml-1.5 text-accent">{value.place}</span>
            )}
          </span>
          <span className="text-base leading-none">{advanced ? '−' : '+'}</span>
        </button>
        {advanced && (
          <div className="space-y-3 border-t border-border p-3">
            <div>
              <label className={label} htmlFor={`place-${value.place}`}>
                태어난 지역
              </label>
              <select
                id={`place-${value.place}`}
                className="field"
                value={value.place}
                onChange={(e) => set('place', e.target.value)}
              >
                {BIRTH_PLACES.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-muted">
                지역마다 실제 태양 위치가 조금 달라 시주가 바뀔 수 있습니다.
              </p>
            </div>

            <label className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                checked={value.applyTrueSolarTime}
                onChange={(e) => set('applyTrueSolarTime', e.target.checked)}
                className="mt-0.5 accent-[var(--accent)]"
              />
              <span>
                <strong className="font-medium">진태양시 보정</strong>
                <br />
                <span className="text-muted">
                  우리 시계는 동경 135도 기준이라 실제 태양보다 약 30분 빠릅니다. 켜두시길
                  권합니다.
                </span>
              </span>
            </label>

            <div>
              <span className={label}>밤 11시~자정 출생 처리</span>
              <select
                className="field"
                value={value.dayBoundary}
                onChange={(e) => set('dayBoundary', e.target.value as FormState['dayBoundary'])}
              >
                <option value="midnight">자정에 날짜가 바뀐다 (가장 널리 쓰임)</option>
                <option value="jasi">밤 11시부터 다음날로 본다</option>
                <option value="splitJasi">일주는 당일, 시주만 다음날로 본다</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {!hideSubmit && (
        <button type="submit" disabled={!ready || busy} className="btn-primary w-full py-3.5">
          {busy ? '보는 중…' : submitLabel}
        </button>
      )}
    </form>
  )
}
