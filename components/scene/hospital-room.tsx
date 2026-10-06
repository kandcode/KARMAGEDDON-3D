'use client'

import { Sparkles, useTexture } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { makeLabWallTexture } from '@/lib/canvas-textures'
import { FLOOR_Y, WALL_Z } from './layout'

export { WALL_Z }

function useLabWall() {
  return useMemo(() => {
    const back = makeLabWallTexture()
    back.wrapS = back.wrapT = THREE.RepeatWrapping
    back.repeat.set(0.5, 0.5)
    const side = back.clone()
    side.repeat.set(1.5, 1.5)
    side.needsUpdate = true

    // Solid wall — no window hole
    const shape = new THREE.Shape()
    shape.moveTo(-2, -0.8)
    shape.lineTo(2, -0.8)
    shape.lineTo(2, 2.2)
    shape.lineTo(-2, 2.2)
    shape.closePath()

    return { back, side, geometry: new THREE.ShapeGeometry(shape) }
  }, [])
}

function useTiledTexture(src: string, repeatX: number, repeatY: number) {
  const base = useTexture(src)
  return useMemo(() => {
    const t = base.clone()
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(repeatX, repeatY)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    t.needsUpdate = true
    return t
  }, [base, repeatX, repeatY])
}

function Desk() {
  const top = useTiledTexture('/textures/desk.png', 2, 1)
  return (
    <group>
      <mesh position={[0, -0.022, 0]} receiveShadow castShadow>
        <boxGeometry args={[1.7, 0.044, 0.9]} />
        <meshStandardMaterial map={top} roughness={0.7} metalness={0.35} />
      </mesh>
      <mesh position={[0, -0.12, 0.43]} receiveShadow>
        <boxGeometry args={[1.66, 0.15, 0.02]} />
        <meshStandardMaterial map={top} color="#8c9188" roughness={0.75} metalness={0.4} />
      </mesh>
      {[-0.8, 0.8].map((x) =>
        [-0.4, 0.4].map((z) => (
          <mesh key={`${x}${z}`} position={[x, -0.4, z]} castShadow>
            <boxGeometry args={[0.04, 0.72, 0.04]} />
            <meshStandardMaterial color="#3a3f38" roughness={0.6} metalness={0.7} />
          </mesh>
        )),
      )}
    </group>
  )
}

function Clutter() {
  return (
    <group>
      <mesh position={[-0.12, 0.0015, 0.2]} rotation={[-Math.PI / 2, 0, 0.35]} receiveShadow>
        <planeGeometry args={[0.21, 0.297]} />
        <meshStandardMaterial color="#a39b85" roughness={1} />
      </mesh>
      <mesh position={[-0.08, 0.002, 0.24]} rotation={[-Math.PI / 2, 0, -0.2]} receiveShadow>
        <planeGeometry args={[0.21, 0.297]} />
        <meshStandardMaterial color="#8f8771" roughness={1} />
      </mesh>
      <group position={[-0.68, 0, 0.28]}>
        <mesh position={[0, 0.045, 0]} castShadow>
          <cylinderGeometry args={[0.022, 0.022, 0.09, 24]} />
          <meshPhysicalMaterial
            color="#6b3510"
            roughness={0.25}
            transmission={0.4}
            thickness={0.02}
            transparent
            opacity={0.85}
          />
        </mesh>
        <mesh position={[0, 0.097, 0]} castShadow>
          <cylinderGeometry args={[0.024, 0.024, 0.016, 24]} />
          <meshStandardMaterial color="#d8d2c4" roughness={0.7} />
        </mesh>
      </group>
      <mesh position={[-0.25, 0.007, 0.32]} rotation={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[0.065, 0.013, 0.042]} />
        <meshStandardMaterial color="#1e1d1a" roughness={0.5} />
      </mesh>
    </group>
  )
}

export function HospitalRoom() {
  const wall = useLabWall()
  const floor = useTiledTexture('/textures/desk.png', 4, 4)
  const deskTarget = useMemo(() => new THREE.Object3D(), [])

  return (
    <group>
      {/* Solid back wall */}
      <mesh position={[0, 0, WALL_Z]} geometry={wall.geometry} receiveShadow>
        <meshStandardMaterial map={wall.back} color="#c3c6be" roughness={0.72} metalness={0.04} />
      </mesh>
      <mesh position={[-1.6, 0.7, 0.9]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[3, 3]} />
        <meshStandardMaterial map={wall.side} color="#b4b7ae" roughness={0.8} />
      </mesh>
      <mesh position={[1.6, 0.7, 0.9]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[3, 3]} />
        <meshStandardMaterial map={wall.side} color="#b4b7ae" roughness={0.8} />
      </mesh>
      <mesh position={[0, FLOOR_Y, 0.9]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4, 3]} />
        <meshStandardMaterial map={floor} color="#3c3a34" roughness={0.95} />
      </mesh>
      <mesh position={[0, 2.2, 0.9]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4, 3]} />
        <meshStandardMaterial color="#141412" roughness={1} />
      </mesh>
      <mesh position={[0, -0.62, WALL_Z + 0.01]}>
        <boxGeometry args={[4, 0.28, 0.02]} />
        <meshStandardMaterial color="#2d322b" roughness={0.8} />
      </mesh>

      <Desk />
      <Clutter />

      {/* Single focused beam aimed at desk (PC + recorder) */}
      <primitive object={deskTarget} position={[-0.15, 0.12, 0.05]} />
      <spotLight
        position={[0.15, 1.55, 0.85]}
        target={deskTarget}
        angle={0.42}
        penumbra={0.75}
        intensity={4.5}
        distance={5}
        decay={2}
        color="#e8d4a8"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-radius={8}
      />

      {/* Very low ambient so the rest stays dark */}
      <ambientLight intensity={0.02} color="#6a7068" />
      <hemisphereLight args={['#2a3028', '#050403', 0.04]} />

      <Sparkles
        count={50}
        scale={[1.8, 1.2, 1.2]}
        position={[0, 0.35, 0.15]}
        size={1.2}
        speed={0.08}
        opacity={0.22}
        color="#b8ae96"
      />
    </group>
  )
}
