export type KeyKind = 'key' | 'space' | 'enter' | 'back'

let ctx: AudioContext | null = null
let buffer: AudioBuffer | null = null
let loading: Promise<AudioBuffer> | null = null
let master: GainNode | null = null

async function loadBuffer(ac: AudioContext): Promise<AudioBuffer> {
  if (buffer) return buffer
  if (!loading) {
    loading = fetch('/audio/click.mp3')
      .then((r) => r.arrayBuffer())
      .then((data) => ac.decodeAudioData(data))
      .then((decoded) => {
        buffer = decoded
        return decoded
      })
      .catch((err) => {
        loading = null
        throw err
      })
  }
  return loading
}

function ensure() {
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = 0.7
    master.connect(ctx.destination)
    void loadBuffer(ctx)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return { ctx, master: master! }
}

export function playKeySound(kind: KeyKind = 'key') {
  const { ctx, master } = ensure()
  const t = ctx.currentTime

  // Slight pitch / rate variation so rapid typing doesn't sound identical
  let rate = 0.95 + Math.random() * 0.12
  let gain = 0.85 + Math.random() * 0.15

  if (kind === 'space' || kind === 'enter') {
    rate *= 0.88 // heavier keys sound lower
    gain *= 1.05
  } else if (kind === 'back') {
    rate *= 1.08
    gain *= 0.9
  }

  const play = (buf: AudioBuffer) => {
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.playbackRate.value = rate
    const g = ctx.createGain()
    g.gain.setValueAtTime(gain, t)
    // Fade out early so fast typing doesn't stack muddy tails
    const dur = Math.min(buf.duration / rate, 0.22)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    src.connect(g).connect(master)
    src.start(t)
    src.stop(t + dur + 0.02)
  }

  if (buffer) {
    play(buffer)
  } else {
    void loadBuffer(ctx).then(play).catch(() => {})
  }
}
