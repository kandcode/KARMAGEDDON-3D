'use client'

import dynamic from 'next/dynamic'

const Experience = dynamic(
  () => import('@/components/scene/experience').then((m) => m.Experience),
  { ssr: false },
)

export default function Page() {
  return <Experience />
}
