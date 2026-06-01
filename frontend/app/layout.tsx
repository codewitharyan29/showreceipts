import type { Metadata } from 'next'
import './globals.css'
import Nav from '@/components/Nav'

export const metadata: Metadata = {
  title: 'ShowReceipts — DELTA | Did a human think?',
  description: 'DELTA measures epistemic contribution of PR descriptions. Not "is this AI?" but "did a human actually think here?"',
  openGraph: {
    title: 'ShowReceipts — DELTA',
    description: 'Detect low-effort AI content by measuring human thought, not AI authorship.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="scanline" aria-hidden="true" />
        <Nav />
        <main className="pt-14">
          {children}
        </main>
      </body>
    </html>
  )
}
