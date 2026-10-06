'use client'

import { Html, RoundedBox } from '@react-three/drei'
import { type ThreeElements, useFrame } from '@react-three/fiber'
import { type RefObject, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { makeGrimeTexture, makeRoughnessTexture } from '@/lib/canvas-textures'
import { CrtTerminal, SCREEN_PX_W } from './crt-terminal'

export const SCREEN_W = 0.27
const SCREEN_Y = 0.262
const CASE_FRONT = 0.15
const HTML_UNITS_PER_PX = 1 / 40

type Props = ThreeElements['group'] & {
  active: boolean
  onActivate: () => void
  onExit: () => void
  screenRef: RefObject<THREE.Object3D | null>
  /** When true, CRT Html terminal is hidden (mobile uses fullscreen overlay) */
  hideTerminal?: boolean
}

function Keyboard({ onActivate, active, material }: { onActivate: () => void; active: boolean; material: THREE.Material }) {
  const keys = useRef<THREE.InstancedMesh>(null)
  const [hovered, setHovered] = useState(false)
  const cols = 15
  const rows = 5
  const pitch = 0.0265

  useLayoutEffect(() => {
    const mesh = keys.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    let i = 0
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c - (cols - 1) / 2) * pitch + (r % 2) * 0.005
        const z = (r - (rows - 1) / 2) * pitch + 0.008
        m.makeTranslation(x, 0.034 + r * -0.0012, z)
        mesh.setMatrixAt(i++, m)
      }
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [])

  const highlight = hovered && !active

  return (
    <group
      position={[0, 0, 0.33]}
      rotation={[0.07, 0, 0]}
      onClick={(e) => {
        e.stopPropagation()
        if (!active) onActivate()
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        if (active) return
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = 'auto'
      }}
    >
      <RoundedBox args={[0.44, 0.03, 0.17]} radius={0.008} smoothness={3} position={[0, 0.015, 0]} castShadow receiveShadow>
        <primitive object={material} attach="material" />
      </RoundedBox>
      <instancedMesh ref={keys} args={[undefined, undefined, cols * rows]} castShadow>
        <boxGeometry args={[0.022, 0.012, 0.022]} />
        <meshStandardMaterial
          color="#6f685a"
          roughness={0.8}
          emissive="#ff1a10"
          emissiveIntensity={highlight ? 0.12 : 0}
        />
      </instancedMesh>
      <mesh position={[0, 0.034, 0.008 + 3 * pitch]} castShadow>
        <boxGeometry args={[0.16, 0.012, 0.022]} />
        <meshStandardMaterial color="#6f685a" roughness={0.8} emissive="#ff1a10" emissiveIntensity={highlight ? 0.12 : 0} />
      </mesh>
    </group>
  )
}

function Cable() {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.12, 0.012, 0.25),
      new THREE.Vector3(0.18, 0.006, 0.16),
      new THREE.Vector3(0.24, 0.006, 0.02),
      new THREE.Vector3(0.2, 0.01, -0.2),
      new THREE.Vector3(0.1, 0.1, -0.3),
    ])
    return new THREE.TubeGeometry(curve, 48, 0.004, 8, false)
  }, [])
  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial color="#1a1916" roughness={0.7} />
    </mesh>
  )
}

function ScreenGlow({ active }: { active: boolean }) {
  const light = useRef<THREE.PointLight>(null)
  useFrame(({ clock }) => {
    if (!light.current) return
    const t = clock.getElapsedTime()
    light.current.intensity = (active ? 0.5 : 0.35) + Math.sin(t * 50) * 0.02 + (Math.random() > 0.985 ? -0.15 : 0)
  })
  return <pointLight ref={light} color="#ff2a1a" distance={1.4} decay={2} position={[0, SCREEN_Y, CASE_FRONT + 0.12]} />
}

export function CrtComputer({ active, onActivate, onExit, screenRef, hideTerminal = false, ...props }: Props) {
  const materials = useMemo(() => {
    const rough = makeRoughnessTexture(13)
    return {
      shell: new THREE.MeshStandardMaterial({
        map: makeGrimeTexture('#8d846f', 41),
        roughnessMap: rough,
        roughness: 0.8,
        metalness: 0.05,
      }),
      keyboard: new THREE.MeshStandardMaterial({
        map: makeGrimeTexture('#7f7765', 77),
        roughnessMap: rough,
        roughness: 0.85,
      }),
    }
  }, [])

  const htmlScale = SCREEN_W / (SCREEN_PX_W * HTML_UNITS_PER_PX)

  return (
    <group {...props}>
      <mesh position={[0, 0.015, 0]} castShadow receiveShadow material={materials.shell}>
        <boxGeometry args={[0.26, 0.03, 0.24]} />
      </mesh>
      <mesh position={[0, 0.045, 0]} castShadow material={materials.shell}>
        <cylinderGeometry args={[0.06, 0.08, 0.03, 24]} />
      </mesh>

      <RoundedBox args={[0.42, 0.37, 0.2]} radius={0.014} smoothness={4} position={[0, 0.245, 0.05]} castShadow receiveShadow>
        <primitive object={materials.shell} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.34, 0.3, 0.2]} radius={0.03} smoothness={4} position={[0, 0.25, -0.12]} castShadow receiveShadow>
        <primitive object={materials.shell} attach="material" />
      </RoundedBox>
      <RoundedBox args={[0.22, 0.19, 0.1]} radius={0.02} smoothness={3} position={[0, 0.25, -0.24]} castShadow>
        <primitive object={materials.shell} attach="material" />
      </RoundedBox>

      {[-0.08, -0.04, 0, 0.04, 0.08].map((x) => (
        <mesh key={x} position={[x, 0.431, 0]}>
          <boxGeometry args={[0.025, 0.002, 0.12]} />
          <meshStandardMaterial color="#1b1915" roughness={0.9} />
        </mesh>
      ))}

      <mesh position={[0, SCREEN_Y, CASE_FRONT + 0.0008]}>
        <planeGeometry args={[0.34, 0.265]} />
        <meshStandardMaterial color="#14130f" roughness={0.9} />
      </mesh>
      <mesh position={[0, SCREEN_Y, CASE_FRONT + 0.0015]}>
        <planeGeometry args={[0.29, 0.22]} />
        <meshStandardMaterial color="#0c0202" emissive="#2a0303" emissiveIntensity={0.6} roughness={0.2} />
      </mesh>

      <object3D ref={screenRef} position={[0, SCREEN_Y, CASE_FRONT + 0.003]} />

      {!hideTerminal && (
        <Html
          transform
          position={[0, SCREEN_Y, CASE_FRONT + 0.003]}
          scale={htmlScale}
          zIndexRange={[10, 0]}
          pointerEvents={active ? 'auto' : 'none'}
        >
          <CrtTerminal active={active} onExit={onExit} />
        </Html>
      )}

      {[0.09, 0.13].map((x) => (
        <mesh key={x} position={[x, 0.098, CASE_FRONT + 0.006]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.009, 0.01, 0.012, 20]} />
          <meshStandardMaterial color="#2a2722" roughness={0.6} metalness={0.2} />
        </mesh>
      ))}
      <mesh position={[0.165, 0.098, CASE_FRONT + 0.002]}>
        <sphereGeometry args={[0.0035, 12, 12]} />
        <meshStandardMaterial color="#ff2010" emissive="#ff2010" emissiveIntensity={4} toneMapped={false} />
      </mesh>

      <ScreenGlow active={active} />
      <Keyboard onActivate={onActivate} active={active} material={materials.keyboard} />
      <Cable />
    </group>
  )
}
