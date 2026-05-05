import type { Metadata } from 'next'
import './globals.css'
import { TopNav } from '@/components/top-nav'

export const metadata: Metadata = {
  title: 'ChargeSense AI — EV Charging Planning for BESCOM',
  description: 'Demand-driven, feeder-constrained EV charger siting + AI peak-shift scheduling.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <TopNav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
        <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-xs text-slate-500">
          ChargeSense AI · BESCOM EV Charging Planning · PanIIT AI for Bharat 2026
        </footer>
      </body>
    </html>
  )
}
