'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

const TRANSITIONS: Record<string, string[]> = {
  PROPOSED: ['SHORTLISTED', 'REJECTED'],
  SHORTLISTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['DEPLOYED', 'REJECTED'],
  DEPLOYED: [],
  REJECTED: ['PROPOSED'],
}

export default function StatusActions({ proposalId, currentStatus }: { proposalId: string; currentStatus: string }) {
  const [busy, setBusy] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const next = TRANSITIONS[currentStatus] ?? []

  async function setStatus(status: string) {
    setBusy(true)
    try {
      await fetch(`/api/proposals/${proposalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      startTransition(() => router.refresh())
    } finally {
      setBusy(false)
    }
  }

  if (next.length === 0) return <span className="text-xs text-slate-400">No further actions</span>

  return (
    <div className="flex gap-2">
      {next.map(s => (
        <button
          key={s}
          disabled={busy || isPending}
          onClick={() => setStatus(s)}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
        >
          → {s}
        </button>
      ))}
    </div>
  )
}
