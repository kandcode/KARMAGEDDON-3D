type Ended = () => void
type TimeCallback = (t: number) => void

class TapeAudio {
  private ctx: AudioContext | null = null
  private noiseBuffer: AudioBuffer | null = null
  private stoppables: AudioScheduledSourceNode[] = []
  private gains: GainNode[] = []
  private cache = new Map<string, AudioBuffer>()
  private element: HTMLAudioElement | null = null
  private raf = 0
  private onTime: TimeCallback | null = null
  private onEndedCb: Ended | null = null

  private ensure() {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new Ctor()
      const length = this.ctx.sampleRate * 2
      this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate)
      const data = this.noiseBuffer.getChannelData(0)
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  private async decode(src: string): Promise<AudioBuffer> {
    const hit = this.cache.get(src)
    if (hit) return hit
    const res = await fetch(src)
    const data = await res.arrayBuffer()
    const buf = await this.ensure().decodeAudioData(data.slice(0))
    this.cache.set(src, buf)
    return buf
  }

  /** Mechanical button click */
  click() {
    const ctx = this.ensure()
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 2200
    bp.Q.value = 1.4
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.45, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
    src.connect(bp).connect(g).connect(ctx.destination)
    src.start(t)
    src.stop(t + 0.08)

    const thunk = ctx.createOscillator()
    thunk.frequency.setValueAtTime(140, t)
    thunk.frequency.exponentialRampToValueAtTime(50, t + 0.05)
    const tg = ctx.createGain()
    tg.gain.setValueAtTime(0.22, t)
    tg.gain.exponentialRampToValueAtTime(0.001, t + 0.07)
    thunk.connect(tg).connect(ctx.destination)
    thunk.start(t)
    thunk.stop(t + 0.08)
  }

  /** Eject / insert cassette clunk */
  swap() {
    const ctx = this.ensure()
    const t = ctx.currentTime

    // Plastic eject
    const n1 = ctx.createBufferSource()
    n1.buffer = this.noiseBuffer
    n1.playbackRate.value = 1.4
    const bp1 = ctx.createBiquadFilter()
    bp1.type = 'bandpass'
    bp1.frequency.value = 900
    bp1.Q.value = 0.8
    const g1 = ctx.createGain()
    g1.gain.setValueAtTime(0.5, t)
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
    n1.connect(bp1).connect(g1).connect(ctx.destination)
    n1.start(t)
    n1.stop(t + 0.14)

    // Body thump
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(90, t)
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.1)
    const og = ctx.createGain()
    og.gain.setValueAtTime(0.35, t)
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.14)
    osc.connect(og).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.15)

    // Insert click a moment later
    const n2 = ctx.createBufferSource()
    n2.buffer = this.noiseBuffer
    n2.playbackRate.value = 2.2
    const bp2 = ctx.createBiquadFilter()
    bp2.type = 'highpass'
    bp2.frequency.value = 2500
    const g2 = ctx.createGain()
    g2.gain.setValueAtTime(0.35, t + 0.28)
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.38)
    n2.connect(bp2).connect(g2).connect(ctx.destination)
    n2.start(t + 0.28)
    n2.stop(t + 0.4)
  }

  private motor(freq: number, level: number, duration: number) {
    const ctx = this.ensure()
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = freq
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = freq * 3
    const g = ctx.createGain()
    g.gain.value = level
    osc.connect(lp).connect(g).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duration)
    this.stoppables.push(osc)
    this.gains.push(g)
  }

  /** Fast wind sound (REW / FF spin) */
  wind(duration = 0.9, onEnded?: Ended) {
    this.stopFx()
    this.ensure()
    this.motor(380, 0.025, duration)
    const ctx = this.ensure()
    const end = ctx.createConstantSource()
    end.offset.value = 0
    end.connect(ctx.destination)
    end.onended = () => onEnded?.()
    end.start()
    end.stop(ctx.currentTime + duration)
    this.stoppables.push(end)
  }

  /** REC still only does the dead mechanical + faint motor, no real recording */
  record() {
    this.stopAll()
    this.click()
    this.motor(90, 0.01, 2.5)
  }

  stopFx() {
    for (const n of this.stoppables) {
      try {
        n.stop()
      } catch {
        /* already stopped */
      }
    }
    this.stoppables = []
    this.gains = []
  }

  stopPlayback() {
    if (this.raf) {
      cancelAnimationFrame(this.raf)
      this.raf = 0
    }
    if (this.element) {
      this.element.pause()
      this.element.currentTime = 0
      this.element.onended = null
      this.element.ontimeupdate = null
      this.element = null
    }
    this.onTime = null
    this.onEndedCb = null
  }

  stopAll() {
    this.stopFx()
    this.stopPlayback()
  }

  /**
   * Play a real tape file. Reports time via onTime for subtitles.
   * Uses HTMLAudioElement so we get reliable currentTime without decoding delay on first play.
   */
  playFile(src: string, onTime: TimeCallback, onEnded: Ended) {
    this.stopAll()
    this.ensure()

    const el = new Audio(src)
    el.preload = 'auto'
    this.element = el
    this.onTime = onTime
    this.onEndedCb = onEnded

    const tick = () => {
      if (!this.element) return
      this.onTime?.(this.element.currentTime)
      this.raf = requestAnimationFrame(tick)
    }

    el.onended = () => {
      if (this.raf) cancelAnimationFrame(this.raf)
      this.raf = 0
      this.onEndedCb?.()
    }

    void el.play().then(() => {
      this.raf = requestAnimationFrame(tick)
    }).catch(() => {
      onEnded()
    })
  }

  /** Preload all tape files so first PLAY is instant */
  preload(srcs: string[]) {
    for (const src of srcs) {
      void this.decode(src).catch(() => {})
      const a = new Audio()
      a.preload = 'auto'
      a.src = src
    }
  }
}

let singleton: TapeAudio | null = null

export function getTapeAudio() {
  if (!singleton) singleton = new TapeAudio()
  return singleton
}
