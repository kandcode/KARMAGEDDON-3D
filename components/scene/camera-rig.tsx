'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { type RefObject, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { SCREEN_W } from './crt-computer'

export type Focus = 'room' | 'screen' | 'tape'

const HOME_POS = new THREE.Vector3(0.0, 0.58, 1.18)
const HOME_LOOK = new THREE.Vector3(-0.06, 0.26, -0.2)

const MAX_YAW = 0.32
const MAX_PITCH = 0.18

const FIT = {
  screen: { w: SCREEN_W, h: SCREEN_W * 0.75, margin: 1.12, speed: 3.2 },
  tape: { speed: 2.8 },
} as const

export function CameraRig({
  focus,
  screenRef,
  tapeRef,
}: {
  focus: Focus
  screenRef: RefObject<THREE.Object3D | null>
  tapeRef: RefObject<THREE.Object3D | null>
}) {
  const { camera, size, gl } = useThree()
  const look = useMemo(() => HOME_LOOK.clone(), [])
  const tmp = useMemo(() => ({ pos: new THREE.Vector3(), target: new THREE.Vector3() }), [])
  const angles = useRef({ yaw: 0, pitch: 0 })
  // Manual look target from mouse (normalized -1..1) or touch drag
  const aim = useRef({ x: 0, y: 0 })
  const touch = useRef<{ active: boolean; lx: number; ly: number; ax: number; ay: number }>({
    active: false,
    lx: 0,
    ly: 0,
    ax: 0,
    ay: 0,
  })
  const focusRef = useRef(focus)
  focusRef.current = focus

  // Touch drag → look around (only in room mode)
  useEffect(() => {
    const el = gl.domElement

    const onStart = (e: TouchEvent) => {
      if (focusRef.current !== 'room') return
      if (e.touches.length !== 1) return
      const t = e.touches[0]
      touch.current.active = true
      touch.current.lx = t.clientX
      touch.current.ly = t.clientY
      touch.current.ax = aim.current.x
      touch.current.ay = aim.current.y
    }

    const onMove = (e: TouchEvent) => {
      if (!touch.current.active || focusRef.current !== 'room') return
      if (e.touches.length !== 1) return
      e.preventDefault()
      const t = e.touches[0]
      const dx = (t.clientX - touch.current.lx) / window.innerWidth
      const dy = (t.clientY - touch.current.ly) / window.innerHeight
      // Drag right → look right; drag up → look up
      aim.current.x = THREE.MathUtils.clamp(touch.current.ax + dx * 2.2, -1, 1)
      aim.current.y = THREE.MathUtils.clamp(touch.current.ay - dy * 2.2, -1, 1)
    }

    const onEnd = () => {
      touch.current.active = false
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [gl])

  useFrame(({ pointer }, delta) => {
    const cam = camera as THREE.PerspectiveCamera

    // On desktop (no active touch), follow R3F pointer
    if (!touch.current.active && focus === 'room') {
      aim.current.x = pointer.x
      aim.current.y = pointer.y
    }

    if (focus === 'screen' && screenRef.current) {
      const fit = FIT.screen
      screenRef.current.getWorldPosition(tmp.target)
      const halfFov = THREE.MathUtils.degToRad(cam.fov / 2)
      const aspect = size.width / size.height
      const fitH = fit.h / 2 / Math.tan(halfFov)
      const fitW = fit.w / 2 / (Math.tan(halfFov) * aspect)
      // On narrow screens pull back a bit more so CRT fits
      const margin = aspect < 0.75 ? fit.margin * 1.25 : fit.margin
      const dist = Math.max(fitH, fitW) * margin

      tmp.pos.set(tmp.target.x, tmp.target.y, tmp.target.z + dist)
      const speed = fit.speed

      cam.position.x = THREE.MathUtils.damp(cam.position.x, tmp.pos.x, speed, delta)
      cam.position.y = THREE.MathUtils.damp(cam.position.y, tmp.pos.y, speed, delta)
      cam.position.z = THREE.MathUtils.damp(cam.position.z, tmp.pos.z, speed, delta)
      look.x = THREE.MathUtils.damp(look.x, tmp.target.x, speed, delta)
      look.y = THREE.MathUtils.damp(look.y, tmp.target.y, speed, delta)
      look.z = THREE.MathUtils.damp(look.z, tmp.target.z, speed, delta)
      cam.lookAt(look)
      angles.current.yaw = 0
      angles.current.pitch = 0
    } else if (focus === 'tape' && tapeRef.current) {
      tapeRef.current.getWorldPosition(tmp.target)
      // Higher / further on portrait so whole recorder is visible
      const portrait = size.height > size.width
      const height = portrait ? 0.52 : 0.42
      const pullBack = portrait ? 0.28 : 0.18

      tmp.pos.set(tmp.target.x, tmp.target.y + height, tmp.target.z + pullBack)

      const speed = FIT.tape.speed
      cam.position.x = THREE.MathUtils.damp(cam.position.x, tmp.pos.x, speed, delta)
      cam.position.y = THREE.MathUtils.damp(cam.position.y, tmp.pos.y, speed, delta)
      cam.position.z = THREE.MathUtils.damp(cam.position.z, tmp.pos.z, speed, delta)
      look.x = THREE.MathUtils.damp(look.x, tmp.target.x, speed, delta)
      look.y = THREE.MathUtils.damp(look.y, tmp.target.y, speed, delta)
      look.z = THREE.MathUtils.damp(look.z, tmp.target.z, speed, delta)
      cam.lookAt(look)
      angles.current.yaw = 0
      angles.current.pitch = 0
    } else {
      const targetYaw = aim.current.x * MAX_YAW
      const targetPitch = aim.current.y * MAX_PITCH
      angles.current.yaw = THREE.MathUtils.damp(angles.current.yaw, targetYaw, 5, delta)
      angles.current.pitch = THREE.MathUtils.damp(angles.current.pitch, targetPitch, 5, delta)

      cam.position.x = THREE.MathUtils.damp(cam.position.x, HOME_POS.x, 2.6, delta)
      cam.position.y = THREE.MathUtils.damp(cam.position.y, HOME_POS.y, 2.6, delta)
      cam.position.z = THREE.MathUtils.damp(cam.position.z, HOME_POS.z, 2.6, delta)

      const dir = new THREE.Vector3().subVectors(HOME_LOOK, HOME_POS).normalize()
      const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize()
      const up = new THREE.Vector3().crossVectors(right, dir).normalize()

      tmp.target
        .copy(HOME_LOOK)
        .addScaledVector(right, angles.current.yaw * 1.4)
        .addScaledVector(up, angles.current.pitch * 1.4)

      look.x = THREE.MathUtils.damp(look.x, tmp.target.x, 5, delta)
      look.y = THREE.MathUtils.damp(look.y, tmp.target.y, 5, delta)
      look.z = THREE.MathUtils.damp(look.z, tmp.target.z, 5, delta)
      cam.lookAt(look)
    }
  })

  return null
}
