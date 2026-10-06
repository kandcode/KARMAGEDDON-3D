import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { VT323 } from 'next/font/google'
import './globals.css'

const vt323 = VT323({ weight: '400', subsets: ['latin'], variable: '--font-terminal' })

export const metadata: Metadata = {
  title: 'KARMAGEDDON',
  description: 'KARMAGEDDON — un escritorio abandonado, un CRT y una grabadora de cintas.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#050504',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${vt323.variable} bg-[#050504]`}>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
