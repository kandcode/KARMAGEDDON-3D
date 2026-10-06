'use client'

import { useProgress } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { TAPES } from '@/lib/tapes'
import { CameraRig, type Focus } from './camera-rig'
import { CassetteRecorder } from './cassette-recorder'
import { CrtComputer } from './crt-computer'
import { CrtTerminal } from './crt-terminal'
import { HospitalRoom } from './hospital-room'

function Loader() {
  const { active, progress } = useProgress()
  if (!active) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#050504]">
      <p className="font-mono text-xs tracking-[0.4em] text-[#8b8574]">{`CARGANDO · ${Math.round(progress)}%`}</p>
    </div>
  )
}

const HINT_BASE =
  'pointer-events-none absolute left-1/2 z-30 max-w-[92vw] -translate-x-1/2 [text-shadow:0_1px_3px_#000] text-center font-mono text-[10px] tracking-[0.2em] text-[#8b8574]/75 sm:text-[11px] sm:tracking-[0.35em]'

const NAV_BTN =
  'flex-1 rounded border border-[#8b8574]/45 bg-black/75 px-3 py-3 font-mono text-[11px] tracking-[0.2em] text-[#cfc8b4] backdrop-blur-sm active:border-[#ff3b2a] active:text-[#ff3b2a]'

function useIsCoarsePointer() {
  const [coarse, setCoarse] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const update = () => setCoarse(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return coarse
}

export function Experience() {
  const [focus, setFocus] = useState<Focus>('room')
  const [tapeIndex, setTapeIndex] = useState(0)
  const [playTime, setPlayTime] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  /** Delay fullscreen terminal so the camera zoom to the CRT is visible on mobile */
  const [screenOverlay, setScreenOverlay] = useState(false)
  const screenRef = useRef<THREE.Object3D>(null)
  const tapeRef = useRef<THREE.Object3D>(null)
  const isTouch = useIsCoarsePointer()

  const exitFocus = useCallback(() => {
    setScreenOverlay(false)
    setFocus('room')
  }, [])

  useEffect(() => {
    if (focus === 'room') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exitFocus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focus, exitFocus])

  // On mobile, wait for camera approach before covering with fullscreen terminal
  useEffect(() => {
    if (!(isTouch && focus === 'screen')) {
      setScreenOverlay(false)
      return
    }
    const id = window.setTimeout(() => setScreenOverlay(true), 900)
    return () => window.clearTimeout(id)
  }, [isTouch, focus])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const subtitle = useMemo(() => {
    if (playTime == null) return null
    const cues = TAPES[tapeIndex]?.cues ?? []
    return cues.find((c) => playTime >= c.start && playTime < c.end)?.text ?? null
  }, [playTime, tapeIndex])

  const tapeLabel = TAPES[tapeIndex]?.label ?? 'CINTA'
  const mobileScreen = isTouch && focus === 'screen' && screenOverlay

  return (
    <main className="relative h-dvh w-full touch-none overflow-hidden bg-[#050504] select-none">
      <h1 className="sr-only">KARMAGEDDON</h1>
      <Canvas
        shadows={!isTouch}
        dpr={isTouch ? [1, 1.5] : [1, 2]}
        camera={{ position: [0, 0.58, 1.18], fov: isTouch ? 50 : 45, near: 0.01, far: 20 }}
        gl={{
          antialias: !isTouch,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.85,
          powerPreference: 'high-performance',
        }}
        style={{ touchAction: 'none' }}
        onPointerMissed={() => {
          document.body.style.cursor = 'auto'
        }}
      >
        <color attach="background" args={['#020201']} />
        <fog attach="fog" args={['#020201', 1.8, 4.5]} />
        <Suspense fallback={null}>
          <HospitalRoom />
          <CrtComputer
            position={[0.12, 0, -0.15]}
            active={focus === 'screen'}
            onActivate={() => setFocus((f) => (f === 'room' ? 'screen' : f))}
            onExit={exitFocus}
            screenRef={screenRef}
            hideTerminal={isTouch}
          />
          <CassetteRecorder
            position={[-0.46, 0, 0.08]}
            rotation={[0, 0.38, 0]}
            active={focus === 'tape'}
            onActivate={() => setFocus((f) => (f === 'room' ? 'tape' : f))}
            focusRef={tapeRef}
            tapeIndex={tapeIndex}
            onTapeChange={setTapeIndex}
            onPlayTime={setPlayTime}
            onPlayingChange={setPlaying}
          />
        </Suspense>
        <CameraRig focus={focus} screenRef={screenRef} tapeRef={tapeRef} />
      </Canvas>

      <div aria-hidden="true" className="scene-vignette pointer-events-none absolute inset-0 z-20" />
      <div aria-hidden="true" className="scene-grain pointer-events-none absolute -inset-[50%] z-20" />

      {mobileScreen && (
        <div className="absolute inset-0 z-40 flex flex-col bg-[#050504]">
          <CrtTerminal active onExit={exitFocus} fullscreen />
        </div>
      )}

      {/* Subtitles — sit above the bottom hint */}
      {subtitle && !mobileScreen && (
        <div className="pointer-events-none absolute bottom-16 left-1/2 z-30 w-[min(92vw,42rem)] -translate-x-1/2 px-3 text-center sm:bottom-14">
          <p className="font-mono text-[12px] leading-relaxed tracking-wide text-[#e8dfc8] [text-shadow:0_1px_4px_#000,0_0_12px_rgba(0,0,0,0.8)] sm:text-[13px]">
            {subtitle}
          </p>
        </div>
      )}

      {focus === 'tape' && (
        <div className="pointer-events-none absolute left-3 top-3 z-30 font-mono text-[10px] leading-relaxed tracking-[0.2em] text-[#8b8574]/90 [text-shadow:0_1px_3px_#000] sm:left-5 sm:top-5 sm:text-[11px] sm:tracking-[0.3em]">
          <p className="text-[#ff3b2a]/80">● {tapeLabel}</p>
          <p>{playing ? 'REPRODUCIENDO…' : 'LISTA'}</p>
          <p className="mt-2 opacity-70">FF · SIGUIENTE</p>
          <p className="opacity-70">REW · ANTERIOR</p>
        </div>
      )}

      {focus !== 'room' && !mobileScreen && (
        <button
          type="button"
          onClick={exitFocus}
          className="absolute right-3 top-3 z-30 rounded border border-[#8b8574]/40 bg-black/60 px-3 py-2 font-mono text-[11px] tracking-[0.25em] text-[#cfc8b4] backdrop-blur-sm active:border-[#ff3b2a] active:text-[#ff3b2a] sm:right-5 sm:top-5"
        >
          VOLVER
        </button>
      )}

      {isTouch && focus === 'room' && (
        <div className="absolute bottom-4 left-0 right-0 z-30 flex gap-3 px-4 pb-[env(safe-area-inset-bottom)]">
          <button type="button" className={NAV_BTN} onClick={() => setFocus('tape')}>
            GRABADORA
          </button>
          <button type="button" className={NAV_BTN} onClick={() => setFocus('screen')}>
            COMPUTADORA
          </button>
        </div>
      )}

      {focus === 'room' && (
        <p className={`${HINT_BASE} bottom-24 sm:bottom-5`}>
          {isTouch
            ? 'ARRÁSTRA PARA MIRAR · O USÁ LOS BOTONES'
            : 'CLICK EN EL TECLADO · CLICK EN LA GRABADORA'}
        </p>
      )}
      {focus === 'screen' && !mobileScreen && (
        <p className={`${HINT_BASE} bottom-4 sm:bottom-5`}>
          {isTouch ? 'ACERCANDO…' : 'ESCRIBE PARA INGRESAR COMANDOS · ESC PARA VOLVER'}
        </p>
      )}
      {/* Tape hint — very bottom so subtitles don't cover it */}
      {focus === 'tape' && (
        <p className={`${HINT_BASE} bottom-3 sm:bottom-5`}>
          {isTouch
            ? 'PLAY · REPRODUCIR · FF/REW · CAMBIAR CINTA'
            : 'PLAY · REPRODUCIR · FF/REW · CAMBIAR CINTA · ESC PARA VOLVER'}
        </p>
      )}

      <Loader />
    </main>
  )
}
