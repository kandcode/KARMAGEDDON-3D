import * as THREE from 'three'

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function finish(canvas: HTMLCanvasElement, srgb = true) {
  const texture = new THREE.CanvasTexture(canvas)
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

export function makeGrimeTexture(base: string, seed = 7, size = 512) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const rand = seededRandom(seed)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)

  for (let i = 0; i < 60; i++) {
    const x = rand() * size
    const y = rand() * size
    const r = 10 + rand() * 80
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(20,16,10,${0.12 + rand() * 0.2})`)
    g.addColorStop(1, 'rgba(20,16,10,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }

  for (let i = 0; i < 4000; i++) {
    const v = rand() > 0.5 ? 255 : 0
    ctx.fillStyle = `rgba(${v},${v},${v},${rand() * 0.06})`
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2)
  }

  ctx.lineCap = 'round'
  for (let i = 0; i < 90; i++) {
    ctx.strokeStyle = `rgba(230,225,210,${rand() * 0.08})`
    ctx.lineWidth = rand() * 1.2
    ctx.beginPath()
    const x = rand() * size
    const y = rand() * size
    ctx.moveTo(x, y)
    ctx.lineTo(x + (rand() - 0.5) * 80, y + (rand() - 0.5) * 30)
    ctx.stroke()
  }
  return finish(canvas)
}

export function makeLabWallTexture(size = 1024) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const rand = seededRandom(1337)
  const half = size / 2

  ctx.fillStyle = '#e2e2db'
  ctx.fillRect(0, 0, size, size)

  const wrapped = (x: number, y: number, r: number, draw: (px: number, py: number) => void) => {
    for (const dx of [-size, 0, size]) {
      for (const dy of [-size, 0, size]) {
        const px = x + dx
        const py = y + dy
        if (px + r < 0 || px - r > size || py + r < 0 || py - r > size) continue
        draw(px, py)
      }
    }
  }
  const blob = (x: number, y: number, r: number, rgb: string, alpha: number) =>
    wrapped(x, y, r, (px, py) => {
      const g = ctx.createRadialGradient(px, py, 0, px, py, r)
      g.addColorStop(0, `rgba(${rgb},${alpha})`)
      g.addColorStop(1, `rgba(${rgb},0)`)
      ctx.fillStyle = g
      ctx.fillRect(px - r, py - r, r * 2, r * 2)
    })

  for (let i = 0; i < 55; i++) {
    const light = rand() > 0.5
    blob(rand() * size, rand() * size, 60 + rand() * 220, light ? '255,255,250' : '92,90,76', light ? 0.05 + rand() * 0.06 : 0.03 + rand() * 0.05)
  }

  for (const seamY of [0, half, size]) {
    const g = ctx.createLinearGradient(0, seamY - 140, 0, seamY)
    g.addColorStop(0, 'rgba(105,98,78,0)')
    g.addColorStop(1, 'rgba(105,98,78,0.09)')
    ctx.fillStyle = g
    ctx.fillRect(0, seamY - 140, size, 140)
  }

  for (let i = 0; i < 9; i++) {
    const x = rand() * size
    const y = rand() * size
    const r = 40 + rand() * 120
    blob(x, y, r, '165,138,88', 0.05 + rand() * 0.05)
    wrapped(x, y, r, (px, py) => {
      ctx.strokeStyle = `rgba(128,104,62,${0.05 + rand() * 0.05})`
      ctx.lineWidth = 2 + rand() * 2
      ctx.beginPath()
      const steps = 28
      for (let s = 0; s <= steps; s++) {
        const a = (s / steps) * Math.PI * 2
        const rr = r * (0.82 + Math.sin(a * 3 + x) * 0.07 + rand() * 0.06)
        const qx = px + Math.cos(a) * rr
        const qy = py + Math.sin(a) * rr * 0.85
        if (s === 0) ctx.moveTo(qx, qy)
        else ctx.lineTo(qx, qy)
      }
      ctx.stroke()
    })
  }

  for (let i = 0; i < 55; i++) {
    const x = rand() * size
    const y0 = (rand() > 0.5 ? 0 : half) + rand() * 12
    const len = 40 + rand() * 260
    const w = 1 + rand() * 2.5
    const g = ctx.createLinearGradient(0, y0, 0, y0 + len)
    g.addColorStop(0, `rgba(118,104,74,${0.08 + rand() * 0.1})`)
    g.addColorStop(1, 'rgba(118,104,74,0)')
    ctx.fillStyle = g
    ctx.fillRect(x, y0, w, len)
  }

  ctx.lineCap = 'round'
  for (let i = 0; i < 90; i++) {
    ctx.strokeStyle = `rgba(58,56,48,${rand() * 0.08})`
    ctx.lineWidth = 1 + rand() * 2.5
    const x = rand() * size
    const y = rand() * size
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + (rand() - 0.5) * 70, y + (rand() - 0.5) * 12)
    ctx.stroke()
  }

  for (let i = 0; i < 28; i++) {
    const x = rand() * size
    const y = rand() * size
    const r = 1 + rand() * 3
    ctx.fillStyle = 'rgba(70,68,60,0.35)'
    ctx.beginPath()
    ctx.arc(x, y, r + 0.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(175,172,160,0.9)'
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  for (const s of [0, half, size]) {
    ctx.fillStyle = 'rgba(72,72,64,0.45)'
    ctx.fillRect(s - 1, 0, 2, size)
    ctx.fillRect(0, s - 1, size, 2)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillRect(s + 1, 0, 1, size)
    ctx.fillRect(0, s + 1, size, 1)
  }
  for (const x of [0, half, size]) {
    for (const y of [0, half, size]) {
      for (const [ox, oy] of [
        [14, 14],
        [-14, 14],
        [14, -14],
        [-14, -14],
      ]) {
        ctx.fillStyle = 'rgba(128,126,116,0.85)'
        ctx.beginPath()
        ctx.arc(x + ox, y + oy, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(40,38,32,0.6)'
        ctx.fillRect(x + ox - 2.5, y + oy - 0.5, 5, 1)
      }
    }
  }

  for (let i = 0; i < 26000; i++) {
    const v = rand() > 0.5 ? 255 : 0
    ctx.fillStyle = `rgba(${v},${v},${v},${rand() * 0.045})`
    ctx.fillRect(rand() * size, rand() * size, 1, 1)
  }

  return finish(canvas)
}



export function makeRoughnessTexture(seed = 3, size = 256) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const rand = seededRandom(seed)
  ctx.fillStyle = '#b8b8b8'
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 40; i++) {
    const x = rand() * size
    const y = rand() * size
    const r = 8 + rand() * 50
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    const shade = rand() > 0.5 ? 255 : 90
    g.addColorStop(0, `rgba(${shade},${shade},${shade},0.5)`)
    g.addColorStop(1, `rgba(${shade},${shade},${shade},0)`)
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  return finish(canvas, false)
}

export function makeLabelTexture(
  text: string,
  opts: {
    width?: number
    height?: number
    bg?: string
    color?: string
    font?: string
    sub?: string
  } = {},
) {
  const { width = 256, height = 64, bg = '#1a1a1a', color = '#cfc8b4', font = 'bold 30px monospace', sub } = opts
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = color
  ctx.font = font
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, width / 2, sub ? height * 0.38 : height / 2)
  if (sub) {
    ctx.globalAlpha = 0.7
    ctx.font = `${Math.round(height * 0.2)}px monospace`
    ctx.fillText(sub, width / 2, height * 0.75)
    ctx.globalAlpha = 1
  }
  const rand = seededRandom(text.length * 31 + 5)
  for (let i = 0; i < 600; i++) {
    ctx.fillStyle = `rgba(0,0,0,${rand() * 0.25})`
    ctx.fillRect(rand() * width, rand() * height, 1 + rand() * 3, 1 + rand() * 2)
  }
  return finish(canvas)
}

export function makeGrilleTexture(size = 256) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#2b2a27'
  ctx.fillRect(0, 0, size, size)
  const step = 14
  for (let y = step / 2; y < size; y += step) {
    for (let x = step / 2; x < size; x += step) {
      const dx = x - size / 2
      const dy = y - size / 2
      if (Math.sqrt(dx * dx + dy * dy) > size / 2 - 10) continue
      ctx.fillStyle = '#050505'
      ctx.beginPath()
      ctx.arc(x, y, 3.6, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  const rand = seededRandom(99)
  for (let i = 0; i < 30; i++) {
    const x = rand() * size
    const y = rand() * size
    const r = 10 + rand() * 40
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, 'rgba(120,110,90,0.12)')
    g.addColorStop(1, 'rgba(120,110,90,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  return finish(canvas)
}

export function makeCassetteTexture() {
  const width = 512
  const height = 280
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#141312'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#b9ad8f'
  ctx.fillRect(30, 18, width - 60, 70)
  ctx.fillStyle = '#7a1a14'
  ctx.fillRect(30, 18, width - 60, 12)
  ctx.fillStyle = '#2a241c'
  ctx.font = 'italic 26px monospace'
  ctx.fillText('karmageddon project', 50, 70)
  // Tape window recess
  ctx.fillStyle = '#060605'
  ctx.beginPath()
  ctx.roundRect(150, 120, width - 300, 90, 20)
  ctx.fill()
  // Brown tape strip between reels
  ctx.fillStyle = '#3b2617'
  ctx.fillRect(200, 145, width - 400, 40)
  // Circular wells for the two reels (aligned with 3D hubs)
  const reelY = 165
  const reelR = 38
  for (const reelX of [195, width - 195]) {
    ctx.beginPath()
    ctx.arc(reelX, reelY, reelR, 0, Math.PI * 2)
    ctx.fillStyle = '#0a0908'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(reelX, reelY, reelR - 4, 0, Math.PI * 2)
    ctx.strokeStyle = '#2a2824'
    ctx.lineWidth = 3
    ctx.stroke()
  }
  const rand = seededRandom(11)
  for (let i = 0; i < 1500; i++) {
    ctx.fillStyle = `rgba(0,0,0,${rand() * 0.3})`
    ctx.fillRect(rand() * width, rand() * height, 2, 2)
  }
  return finish(canvas)
}
