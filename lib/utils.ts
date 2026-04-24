import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatInr(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)} L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)} K`
  return `₹${n.toFixed(0)}`
}

export function formatKwh(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} GWh`
  if (n >= 1000) return `${(n / 1000).toFixed(1)} MWh`
  return `${n.toFixed(1)} kWh`
}

export function statusColor(status: string): string {
  switch (status) {
    case 'PROPOSED': return 'bg-gray-100 text-gray-800'
    case 'SHORTLISTED': return 'bg-blue-100 text-blue-800'
    case 'APPROVED': return 'bg-green-100 text-green-800'
    case 'DEPLOYED': return 'bg-lime-200 text-lime-900'
    case 'REJECTED': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export function categoryLabel(c: string): string {
  return c.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
}
