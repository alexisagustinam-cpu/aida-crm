import type { Metadata } from 'next'
import { Archivo, Instrument_Serif, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const archivo = Archivo({ subsets: ['latin'], variable: '--font-archivo', display: 'swap' })
const instrument = Instrument_Serif({ subsets: ['latin'], variable: '--font-instrument', weight: '400', style: ['normal', 'italic'], display: 'swap' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', weight: ['400', '500'], display: 'swap' })

export const metadata: Metadata = {
  title: 'AIDA · CRM',
  description: 'CRM interno de AIDA Digital Solutions.',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${archivo.variable} ${instrument.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  )
}
