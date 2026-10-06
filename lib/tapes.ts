export type Cue = { start: number; end: number; text: string }

export type TapeDef = {
  id: number
  src: string
  label: string
  cues: Cue[]
}

/** Spanish subtitles timed to the English dialogue in each tape */
export const TAPES: TapeDef[] = [
  {
    id: 1,
    src: '/audio/tape_1.wav',
    label: 'CINTA 01',
    cues: [
      { start: 0.0, end: 2.0, text: 'Está bien, estamos grabando.' },
      {
        start: 2.0,
        end: 14.5,
        text: 'El monitor indica señales de latido a pesar de la ausencia de un corazón, así que vamos a hacer un mapeo neurológico usando distintos sonidos para ver si detectamos actividad más allá de su estado actual de inactividad total.',
      },
      {
        start: 19.5,
        end: 28.0,
        text: 'Bien, el pitido funciona y activa la región superior del lóbulo parietal, pero queremos activar todo el cerebro.',
      },
      { start: 34.5, end: 38.0, text: 'Bueno… no hubo actividad.' },
    ],
  },
  {
    id: 2,
    src: '/audio/tape_2.wav',
    label: 'CINTA 02',
    cues: [
      { start: 0.0, end: 2.2, text: 'Estamos grabando. Cinta dos.' },
      {
        start: 2.2,
        end: 12.5,
        text: 'Vamos a probar con frecuencias graves y tonos más agudos. Sabemos que, a pesar de la audición limitada del sujeto, le encantaba escuchar música. Esperemos que funcione.',
      },
      {
        start: 23.5,
        end: 30.0,
        text: 'Oh, wow… hay actividad. Hay actividad en la corteza frontal izquierda. ¿Cómo es posib—',
      },
    ],
  },
  {
    id: 3,
    src: '/audio/tape_3.wav',
    label: 'CINTA 03',
    cues: [
      {
        start: 0.0,
        end: 4.5,
        text: 'Prueba tres. Vamos a probar algo un poco más oscuro con este sonido.',
      },
      {
        start: 11.5,
        end: 17.5,
        text: 'Oh—no, no… se está acelerando. Esperá, apagálo—¡apagá la música! Apagalo—',
      },
    ],
  },
  {
    id: 4,
    src: '/audio/tape_4.wav',
    label: 'CINTA 04',
    cues: [],
  },
  {
    id: 5,
    src: '/audio/tape_5.wav',
    label: 'CINTA 05',
    cues: [],
  },
]

export const TAPE_COUNT = TAPES.length
