'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { playKeySound } from '@/lib/key-audio'

export const SCREEN_PX_W = 640
export const SCREEN_PX_H = 480
export const KARMAGEDDON_URL = 'https://kandcode.github.io/KARMAGEDDON/'

const PAGE_VIEWPORT_W = 1024
const MAX_LINES = 13
const MAX_INPUT = 52

type Mode = 'terminal' | 'karmageddon'

const INTRO = [
  'Escribe "karmageddon" para entrar al sistema.',
  '',
]

export function CrtTerminal({
  active,
  onExit,
  fullscreen = false,
}: {
  active: boolean
  onExit: () => void
  /** Mobile: fill the viewport instead of the tiny CRT Html surface */
  fullscreen?: boolean
}) {
  const [lines, setLines] = useState<string[]>(INTRO)
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<Mode>('terminal')
  const inputRef = useRef('')
  const hiddenRef = useRef<HTMLInputElement>(null)
  const prevLen = useRef(0)

  const updateInput = useCallback((next: string) => {
    inputRef.current = next
    setInput(next)
  }, [])

  const submit = useCallback(() => {
    const raw = inputRef.current
    const command = raw.trim().toLowerCase()
    updateInput('')
    prevLen.current = 0
    if (hiddenRef.current) hiddenRef.current.value = ''
    if (command === 'clear') {
      setLines([...INTRO])
      return
    }
    if (command === 'karmageddon') {
      setLines((prev) => [...prev, `> ${raw}`].slice(-MAX_LINES))
      setMode('karmageddon')
      return
    }
    const response = command === '' ? [] : [`${raw.trim()}: not found`]
    setLines((prev) => [...prev, `> ${raw}`, ...response].slice(-MAX_LINES))
  }, [updateInput])

  useEffect(() => {
    if (!active || mode !== 'terminal') return
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement === hiddenRef.current) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.isComposing || e.keyCode === 229) return
      if (e.key === 'Escape') return
      if (e.key === 'Enter') {
        e.preventDefault()
        playKeySound('enter')
        submit()
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        playKeySound('back')
        updateInput(inputRef.current.slice(0, -1))
      } else if (e.key.length === 1) {
        e.preventDefault()
        playKeySound(e.key === ' ' ? 'space' : 'key')
        updateInput((inputRef.current + e.key).slice(0, MAX_INPUT))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, mode, submit, updateInput])

  useEffect(() => {
    if (!active || mode !== 'terminal') return
    const id = window.setTimeout(() => {
      hiddenRef.current?.focus({ preventScroll: true })
    }, 250)
    return () => window.clearTimeout(id)
  }, [active, mode])

  const onHiddenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.slice(0, MAX_INPUT)
    const prev = prevLen.current
    if (v.length > prev) playKeySound(v.endsWith(' ') ? 'space' : 'key')
    else if (v.length < prev) playKeySound('back')
    prevLen.current = v.length
    updateInput(v)
  }

  const onHiddenKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      playKeySound('enter')
      submit()
    }
  }

  const shellClass = fullscreen
    ? 'crt-screen relative flex h-full w-full flex-col overflow-hidden select-none bg-[#0a0202]'
    : 'crt-screen relative overflow-hidden select-none'

  const shellStyle = fullscreen
    ? undefined
    : { width: SCREEN_PX_W, height: SCREEN_PX_H }

  return (
    <div
      className={shellClass}
      style={shellStyle}
      aria-label="CRT terminal"
      onClick={() => {
        if (active && mode === 'terminal') hiddenRef.current?.focus({ preventScroll: true })
      }}
    >
      <input
        ref={hiddenRef}
        type="text"
        inputMode="text"
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="go"
        value={input}
        onChange={onHiddenChange}
        onKeyDown={onHiddenKeyDown}
        className="pointer-events-none absolute opacity-0"
        style={{ left: 0, top: 0, width: 1, height: 1 }}
        aria-hidden="true"
        tabIndex={active && mode === 'terminal' ? 0 : -1}
      />

      {mode === 'karmageddon' ? (
        fullscreen ? (
          <div className="absolute inset-0 flex flex-col bg-black">
            <div className="flex shrink-0 items-center justify-end gap-2 border-b border-[#ff3b2a]/30 bg-black/90 px-3 py-2">
              <button
                type="button"
                onClick={() => setMode('terminal')}
                className="crt-button"
              >
                TERMINAL
              </button>
              <button type="button" onClick={onExit} className="crt-button">
                EXIT
              </button>
            </div>
            <iframe
              src={KARMAGEDDON_URL}
              title="KARMAGEDDON"
              className="min-h-0 w-full flex-1 border-0 bg-black"
              allow="autoplay; fullscreen"
            />
          </div>
        ) : (
          <div className="absolute inset-0 overflow-hidden bg-black">
            <iframe
              src={KARMAGEDDON_URL}
              title="KARMAGEDDON"
              scrolling="no"
              className="absolute left-0 top-0 origin-top-left border-0 bg-black"
              style={{
                width: PAGE_VIEWPORT_W,
                height: PAGE_VIEWPORT_W * (SCREEN_PX_H / SCREEN_PX_W),
                transform: `scale(${SCREEN_PX_W / PAGE_VIEWPORT_W})`,
              }}
              allow="autoplay; fullscreen"
            />
          </div>
        )
      ) : (
        <div
          className={
            fullscreen
              ? 'crt-text absolute inset-0 flex flex-col px-5 pt-14 pb-6 font-mono text-[16px] leading-[1.5] sm:px-10 sm:text-[19px]'
              : 'crt-text absolute inset-0 flex flex-col px-10 pt-10 pb-8 font-mono text-[19px] leading-[1.45]'
          }
        >
          <div className="mt-2 flex flex-1 flex-col justify-end overflow-hidden">
            {lines.map((line, i) => (
              <p key={i} className="whitespace-pre-wrap break-all">
                {line}
              </p>
            ))}
            <p className="whitespace-pre-wrap break-all">
              {'> '}
              {input}
              <span className="crt-cursor" aria-hidden="true" />
            </p>
          </div>
        </div>
      )}

      {!fullscreen && <div className="crt-overlay pointer-events-none absolute inset-0" aria-hidden="true" />}

      {active && !(fullscreen && mode === 'karmageddon') && (
        <div className={`absolute z-10 flex gap-2 ${fullscreen ? 'right-3 top-3' : 'right-5 top-4'}`}>
          {mode === 'karmageddon' && (
            <button type="button" onClick={() => setMode('terminal')} className="crt-button">
              TERMINAL
            </button>
          )}
          <button type="button" onClick={onExit} className="crt-button">
            EXIT
          </button>
        </div>
      )}
    </div>
  )
}
