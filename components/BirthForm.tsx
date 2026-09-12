'use client'

import { useState } from 'react'
import { BIRTH_PLACES, DEFAULT_PLACE, type SajuInput } from '@/lib/saju'
import { Term } from './Term'

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

const field =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-1 focus:ring-accent'
const label = 'mb-1.5 block text-xs font-medium text-muted'

export function BirthForm({
  value,
  onChange,
  onSubmit,
  busy,
}: {
  value: FormState
  onChange: (f: FormState) => void
  onSubmit: () => void
  busy: boolean
}) {
  const [advanced, setAdvanced] = useState(false)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    onChange({ ...value, [k]: v })

  const ready =
    value.year !== '' &&
    value.month !== '' &&
    value.day !== '' &&
    (value.hourUnknown || value.hour !== '')

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (ready && !busy) onSubmit()
      }}
    >
      {/* 양력 / 음력 */}
      <div>
        <span className={label}>달력 기준</span>
        <div className="flex gap-2">
          {(['solar', 'lunar'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => set('calendar', c)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
                value.calendar === c
                  ? 'border-accent bg-accent-soft font-medium'
                  : 'border-border bg-surface text-muted hover:border-accent/50'
              }`}
            >
              {c === 'solar' ? '양력' : '음력'}
            </button>
          ))}
        </div>
        {value.calendar === 'lunar' && (
          <label className="mt-2 flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={value.isLeapMonth}
              onChange={(e) => set('isLeapMonth', e.target.checked)}
              className="accent-[var(--accent)]"
            />
            윤달입니다
          </label>
        )}
      </div>

      {/* 생년월일 */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className={label} htmlFor="year">
            년
          </label>
          <input
            id="year"
            className={field}
            type="number"
            inputMode="numeric"
            placeholder="1990"
            min={1900}
            max={2100}
            value={value.year}
            onChange={(e) => set('year', e.target.value)}
          />
        </div>
        <div>
          <label className={label} htmlFor="month">
            월
          </label>
          <input
            id="month"
            className={field}
            type="number"
            inputMode="numeric"
            placeholder="5"
            min={1}
            max={12}
            value={value.month}
            onChange={(e) => set('month', e.target.value)}
          />
        </div>
        <div>
          <label className={label} htmlFor="day">
            일
          </label>
          <input
            id="day"
            className={field}
            type="number"
            inputMode="numeric"
            placeholder="15"
            min={1}
            max={31}
            value={value.day}
            onChange={(e) => set('day', e.target.value)}
          />
        </div>
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
            className={`${field} disabled:opacity-40`}
            type="number"
            inputMode="numeric"
            placeholder="14 (시)"
            min={0}
            max={23}
            disabled={value.hourUnknown}
            value={value.hour}
            onChange={(e) => set('hour', e.target.value)}
            aria-label="시"
          />
          <input
            className={`${field} disabled:opacity-40`}
            type="number"
            inputMode="numeric"
            placeholder="30 (분)"
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
            시각을 모르면 <Term name="시주">시주</Term>를 비우고 세 기둥으로 풀이합니다.
          </p>
        )}
      </div>

      {/* 성별 */}
      <div>
        <span className={label}>성별</span>
        <div className="flex gap-2">
          {(['male', 'female'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => set('gender', g)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
                value.gender === g
                  ? 'border-accent bg-accent-soft font-medium'
                  : 'border-border bg-surface text-muted hover:border-accent/50'
              }`}
            >
              {g === 'male' ? '남성' : '여성'}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-muted">
          <Term name="대운">대운</Term>이 앞으로 가는지 뒤로 가는지를 정하는 데 쓰입니다.
        </p>
      </div>

      {/* 출생지 */}
      <div>
        <label className={label} htmlFor="place">
          태어난 지역
        </label>
        <select
          id="place"
          className={field}
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
          지역마다 실제 태양 위치가 조금씩 달라 <Term name="시주">시주</Term>가 바뀔 수 있습니다.
        </p>
      </div>

      {/* 고급 설정 */}
      <div className="rounded-lg border border-border">
        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2.5 text-xs font-medium text-muted"
        >
          <span>계산 방식 상세 설정</span>
          <span className="text-base leading-none">{advanced ? '−' : '+'}</span>
        </button>
        {advanced && (
          <div className="space-y-3 border-t border-border p-3">
            <label className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                checked={value.applyTrueSolarTime}
                onChange={(e) => set('applyTrueSolarTime', e.target.checked)}
                className="mt-0.5 accent-[var(--accent)]"
              />
              <span>
                <strong className="font-medium">
                  <Term name="진태양시">진태양시</Term> 보정
                </strong>
                <br />
                <span className="text-muted">
                  끄면 시계에 적힌 시각을 그대로 씁니다. 켜두시길 권합니다.
                </span>
              </span>
            </label>

            <div>
              <span className={label}>
                밤 11시~자정 출생 처리 (<Term name="야자시">야자시</Term>)
              </span>
              <select
                className={field}
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

      <button
        type="submit"
        disabled={!ready || busy}
        className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? '풀이하는 중…' : '사주 풀이 보기'}
      </button>
    </form>
  )
}
