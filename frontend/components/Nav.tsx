'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/analyze',      label: 'Analyze' },
  { href: '/leaderboard',  label: 'Leaderboard' },
  { href: '/species',      label: 'Species' },
  { href: '/benchmark',    label: 'Benchmark' },
  { href: '/integrations', label: 'Integrations' },
  { href: '/simulator',    label: 'Simulator' },
  { href: '/docs',         label: 'Docs Mode' },
]

export default function Nav() {
  const path = usePathname()
  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-[var(--border)]"
      style={{ background: 'rgba(7,8,10,0.92)', backdropFilter: 'blur(12px)' }}>
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="font-mono text-[var(--sig-green)] text-xl font-bold">Δ</span>
          <span className="font-display font-bold text-[var(--white)] tracking-tight">
            Show<span className="text-[var(--sig-purple)]">Receipts</span>
          </span>
        </Link>
        <div className="flex items-center gap-1 overflow-x-auto">
          {LINKS.map(l => (
            <Link key={l.href} href={l.href}
              className="text-xs font-mono px-3 py-1.5 rounded-lg transition-all whitespace-nowrap"
              style={{
                color: path === l.href ? 'var(--white)' : 'var(--muted)',
                background: path === l.href ? 'rgba(0,232,122,0.1)' : 'transparent',
                border: path === l.href ? '1px solid rgba(0,232,122,0.2)' : '1px solid transparent',
              }}>
              {l.label}
            </Link>
          ))}
          <Link href="/analyze"
            className="ml-2 text-xs font-mono font-bold px-3 py-1.5 rounded-lg flex-shrink-0"
            style={{ background: 'var(--sig-green)', color: 'var(--bg)' }}>
            Try it →
          </Link>
        </div>
      </div>
    </nav>
  )
}
