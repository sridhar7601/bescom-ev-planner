import type { Metadata } from 'next'
import Link from 'next/link'
import { Zap, LayoutDashboard, Map as MapIcon, List, Plus } from 'lucide-react'
import './globals.css'

export const metadata: Metadata = {
  title: 'ChargeSense AI — EV Charging Planning for BESCOM',
  description: 'Demand-driven, feeder-constrained EV charger siting with explainable ROI projections.',
}

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/map', label: 'Map', icon: MapIcon },
  { href: '/proposals', label: 'Proposals', icon: List },
  { href: '/plan/new', label: 'New Plan', icon: Plus },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-lime-500 rounded-lg flex items-center justify-center">
                <Zap className="text-white" size={20} />
              </div>
              <div>
                <div className="font-bold text-lg text-slate-900">ChargeSense AI</div>
                <div className="text-xs text-slate-500">BESCOM EV Charging Planner</div>
              </div>
            </Link>
            <nav className="flex gap-1">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-lime-50 hover:text-lime-700"
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      </body>
    </html>
  )
}
