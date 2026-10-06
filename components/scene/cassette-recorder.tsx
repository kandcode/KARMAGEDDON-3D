'use client'

import { RoundedBox } from '@react-three/drei'
import { type ThreeElements, type ThreeEvent, useFrame } from '@react-three/fiber'
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  makeCassetteTexture,
  makeGrilleTexture,
  makeGrimeTexture,
  makeLabelTexture,
  makeRoughnessTexture,
} from '@/lib/canvas-textures'
import { getTapeAudio } from '@/lib/tape-audio'
import { TAPES, TAPE_COUNT } from '@/lib/tapes'

type Mode = 'stop' | 'play' | 'rec' | 'rew' | 'ff'

const W = 0.16
const H = 0.24
const D = 0.055
const FRONT = D / 2

const BUTTONS: { id: Mode; label: string; bg: string; color: string }[] = [
  { id: 'rec', label: 'REC', bg: '#5e1210', color: '#e9d7c8' },
  { id: 'play', label: 'PLAY', bg: '#3a3935', color: '#d8d1bd' },
  { id: 'rew', label: 'REW', bg: '#3a3935', color: '#d8d1bd' },
  { id: 'ff', label: 'FF', bg: '#3a3935', color: '#d8d1bd' },
  { id: 'stop', label: 'STOP', bg: '#3a3935', color: '#d8d1bd' },
]

const REEL_SPEED: Record<Mode, number> = { stop: 0, play: 2.4, rec: 2.4, rew: -18, ff: 18 }

function setCursor(value: string) {
  document.body.style.cursor = value
}

function TapeButton({
  label,
  bg,
  color,
  x,
  latched,
  enabled,
  onPress,
}: {
  label: string
  bg: string
  color: string
  x: number
  latched: boolean
  enabled: boolean
  onPress: () => void
}) {
  const ref = useRef<THREE.Group>(null)
  const [held, setHeld] = useState(false)
  const [hovered, setHovered] = useState(false)
  const texture = useMemo(
    () => makeLabelTexture(label, { width: 128, height: 96, bg, color, font: 'bold 30px monospace' }),
    [label, bg, color],
  )

  const down = latched || held
  useFrame((_, delta) => {
    if (!ref.current) return
    const target = FRONT + (down ? 0.0005 : 0.006)
    ref.current.position.z = THREE.MathUtils.damp(ref.current.position.z, target, 30, delta)
  })

  return (
    <group
      ref={ref}
      position={[x, -0.093, FRONT + 0.006]}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        if (!enabled) return
        setHeld(true)
        onPress()
      }}
      onPointerUp={() => setHeld(false)}
      onPointerOver={(e) => {
        e.stopPropagation()
        if (!enabled) return
        setHovered(true)
        setCursor('pointer')
      }}
      onPointerOut={() => {
        setHovered(false)
        setHeld(false)
        setCursor('auto')
      }}
    >
      {/* Larger invisible hit target for touch */}
      <mesh position={[0, 0, 0.004]}>
        <boxGeometry args={[0.036, 0.04, 0.02]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <RoundedBox args={[0.025, 0.026, 0.012]} radius={0.002} smoothness={3} castShadow>
        <meshStandardMaterial color={bg} roughness={0.55} metalness={0.05} />
      </RoundedBox>
      <mesh position={[0, 0, 0.0061]}>
        <planeGeometry args={[0.023, 0.024]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.5}
          emissive={hovered && enabled ? '#401010' : '#000000'}
          emissiveIntensity={hovered && enabled ? 0.6 : 0}
        />
      </mesh>
    </group>
  )
}

function Reel({ x, speed }: { x: number; speed: React.MutableRefObject<number> }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    // Only spin when speed is non-zero (play / wind)
    if (ref.current && Math.abs(speed.current) > 0.01) {
      ref.current.rotation.z -= speed.current * delta * (x < 0 ? 1 : 1.2)
    }
  })
  // Local coords inside cassetteGroup — sits in the tape window
  return (
    <group ref={ref} position={[x, 0, 0.0015]}>
      {/* Hub disc flush with cassette face */}
      <mesh>
        <circleGeometry args={[0.012, 28]} />
        <meshStandardMaterial color="#2a2824" roughness={0.55} metalness={0.15} />
      </mesh>
      {/* Spokes */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} rotation={[0, 0, (i * Math.PI) / 3]} position={[0, 0, 0.0004]}>
          <boxGeometry args={[0.0022, 0.018, 0.0006]} />
          <meshStandardMaterial color="#0e0d0c" roughness={0.7} />
        </mesh>
      ))}
      {/* Center pin */}
      <mesh position={[0, 0, 0.0006]}>
        <circleGeometry args={[0.0038, 16]} />
        <meshStandardMaterial color="#050505" roughness={0.8} />
      </mesh>
      {/* Outer ring */}
      <mesh position={[0, 0, 0.0002]}>
        <ringGeometry args={[0.0105, 0.012, 28]} />
        <meshStandardMaterial color="#3a3834" roughness={0.5} metalness={0.2} />
      </mesh>
    </group>
  )
}

function RecLight({ mode }: { mode: Mode }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  const light = useRef<THREE.PointLight>(null)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const intensity = mode === 'rec' ? (Math.sin(t * 7) > -0.2 ? 9 : 1.5) : 2.4 + Math.sin(t * 1.4) * 0.6
    if (mat.current) mat.current.emissiveIntensity = intensity
    if (light.current) light.current.intensity = intensity * 0.012
  })
  return (
    <group position={[0.055, 0.103, FRONT]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.0075, 0.0075, 0.003, 20]} />
        <meshStandardMaterial color="#111" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.002]}>
        <sphereGeometry args={[0.005, 16, 16]} />
        <meshStandardMaterial ref={mat} color="#ff1a10" emissive="#ff1a10" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <pointLight ref={light} color="#ff2010" distance={0.25} decay={2} position={[0, 0, 0.01]} />
    </group>
  )
}

type Props = ThreeElements['group'] & {
  active: boolean
  onActivate: () => void
  focusRef: RefObject<THREE.Object3D | null>
  tapeIndex: number
  onTapeChange: (index: number) => void
  onPlayTime: (t: number | null) => void
  onPlayingChange: (playing: boolean) => void
}

export function CassetteRecorder({
  active,
  onActivate,
  focusRef,
  tapeIndex,
  onTapeChange,
  onPlayTime,
  onPlayingChange,
  ...props
}: Props) {
  const [mode, setMode] = useState<Mode>('stop')
  const [hovered, setHovered] = useState(false)
  const [swapping, setSwapping] = useState(false)
  const speed = useRef(0)
  const modeRef = useRef<Mode>('stop')
  const cassetteGroup = useRef<THREE.Group>(null)
  const tapeIndexRef = useRef(tapeIndex)
  tapeIndexRef.current = tapeIndex

  const textures = useMemo(() => {
    const body = makeGrimeTexture('#2c2b28', 21)
    const rough = makeRoughnessTexture(5)
    return {
      body,
      rough,
      grille: makeGrilleTexture(),
      cassette: makeCassetteTexture(),
    }
  }, [])

  // Preload all tapes once
  useEffect(() => {
    getTapeAudio().preload(TAPES.map((t) => t.src))
  }, [])

  useFrame((_, delta) => {
    speed.current = THREE.MathUtils.damp(speed.current, REEL_SPEED[modeRef.current], 4, delta)

    // Cassette eject / insert animation (slides out then in)
    if (cassetteGroup.current) {
      const targetZ = swapping ? FRONT + 0.04 : FRONT + 0.0008
      const targetY = swapping ? -0.02 : -0.03
      cassetteGroup.current.position.z = THREE.MathUtils.damp(cassetteGroup.current.position.z, targetZ, 8, delta)
      cassetteGroup.current.position.y = THREE.MathUtils.damp(cassetteGroup.current.position.y, targetY, 8, delta)
    }
  })

  const apply = (next: Mode) => {
    modeRef.current = next
    setMode(next)
  }

  const stopPlayback = () => {
    getTapeAudio().stopAll()
    apply('stop')
    onPlayTime(null)
    onPlayingChange(false)
  }

  const startPlay = () => {
    const tape = TAPES[tapeIndexRef.current]
    apply('play')
    onPlayingChange(true)
    getTapeAudio().playFile(
      tape.src,
      (t) => onPlayTime(t),
      () => {
        apply('stop')
        onPlayTime(null)
        onPlayingChange(false)
      },
    )
  }

  const changeTape = (dir: 1 | -1) => {
    if (swapping) return
    const audio = getTapeAudio()
    audio.stopAll()
    onPlayTime(null)
    onPlayingChange(false)

    setSwapping(true)
    apply(dir === 1 ? 'ff' : 'rew')
    audio.click()
    audio.swap()
    audio.wind(0.85)

    // Mid-swap: switch index (cassette is "out")
    window.setTimeout(() => {
      const next = (tapeIndexRef.current + dir + TAPE_COUNT) % TAPE_COUNT
      onTapeChange(next)
    }, 350)

    // Finish: stop spinning, ready to play
    window.setTimeout(() => {
      setSwapping(false)
      apply('stop')
    }, 900)
  }

  const press = (id: Mode) => {
    const audio = getTapeAudio()
    audio.click()

    if (id === 'stop') {
      stopPlayback()
      return
    }

    if (id === 'rec') {
      // REC is dead — only mechanical noise, no recording
      if (mode === 'play') stopPlayback()
      apply('rec')
      audio.record()
      window.setTimeout(() => {
        if (modeRef.current === 'rec') apply('stop')
      }, 2500)
      return
    }

    if (id === 'play') {
      if (mode === 'play') return
      if (swapping) return
      startPlay()
      return
    }

    if (id === 'ff') {
      changeTape(1)
      return
    }

    if (id === 'rew') {
      changeTape(-1)
      return
    }
  }

  const onBodyClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (!active) onActivate()
  }

  return (
    <group {...props}>
      <object3D ref={focusRef} position={[0, 0.02, 0.1]} />

      <group position={[0, D / 2, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh
          position={[0, 0, 0]}
          onClick={onBodyClick}
          onPointerOver={(e) => {
            e.stopPropagation()
            if (active) return
            setHovered(true)
            setCursor('pointer')
          }}
          onPointerOut={() => {
            setHovered(false)
            setCursor('auto')
          }}
        >
          <boxGeometry args={[W + 0.02, H + 0.02, D + 0.02]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        <RoundedBox args={[W, H, D]} radius={0.012} smoothness={4} castShadow receiveShadow>
          <meshStandardMaterial
            map={textures.body}
            roughnessMap={textures.rough}
            roughness={0.75}
            metalness={0.1}
            emissive={hovered && !active ? '#ff1a10' : '#000000'}
            emissiveIntensity={hovered && !active ? 0.08 : 0}
          />
        </RoundedBox>

        <mesh position={[0, 0.052, FRONT + 0.0006]}>
          <circleGeometry args={[0.038, 40]} />
          <meshStandardMaterial map={textures.grille} roughness={0.85} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.052, FRONT]}>
          <torusGeometry args={[0.039, 0.0018, 8, 48]} />
          <meshStandardMaterial color="#141412" metalness={0.5} roughness={0.5} />
        </mesh>

        {/* Cassette window — animates on swap */}
        <group ref={cassetteGroup} position={[0, -0.03, FRONT + 0.0008]}>
          <mesh>
            <planeGeometry args={[0.122, 0.064]} />
            <meshStandardMaterial map={textures.cassette} roughness={0.85} />
          </mesh>
          {/* Reels embedded in the cassette window (local space) */}
          <Reel x={-0.028} speed={speed} />
          <Reel x={0.028} speed={speed} />
        </group>

        {[
          [0, 0.004, 0.13, 0.004],
          [0, -0.064, 0.13, 0.004],
          [-0.063, -0.03, 0.004, 0.072],
          [0.063, -0.03, 0.004, 0.072],
        ].map(([x, y, w, h], i) => (
          <mesh key={i} position={[x, y, FRONT + 0.003]} castShadow>
            <boxGeometry args={[w, h, 0.006]} />
            <meshStandardMaterial color="#1b1a18" roughness={0.6} metalness={0.2} />
          </mesh>
        ))}
        <mesh position={[0, -0.03, FRONT + 0.0058]}>
          <planeGeometry args={[0.122, 0.064]} />
          <meshPhysicalMaterial
            color="#6b6150"
            transparent
            opacity={0.28}
            roughness={0.35}
            metalness={0}
            clearcoat={1}
            clearcoatRoughness={0.4}
          />
        </mesh>

        <RecLight mode={mode} />

        {BUTTONS.map((b, i) => (
          <TapeButton
            key={b.id}
            label={b.label}
            bg={b.bg}
            color={b.color}
            x={-0.056 + i * 0.028}
            latched={(mode === b.id && b.id !== 'stop') || (swapping && (b.id === 'ff' || b.id === 'rew') && mode === b.id)}
            enabled={active && !swapping}
            onPress={() => press(b.id)}
          />
        ))}

        <mesh position={[W / 2 + 0.002, 0.03, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.008, 24]} />
          <meshStandardMaterial color="#1c1b19" roughness={0.6} metalness={0.3} />
        </mesh>
        <mesh position={[-0.055, 0.115, FRONT + 0.0004]}>
          <circleGeometry args={[0.003, 12]} />
          <meshStandardMaterial color="#050505" />
        </mesh>
      </group>
    </group>
  )
}
