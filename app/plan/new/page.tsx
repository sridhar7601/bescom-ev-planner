'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Loader2 } from 'lucide-react'

export default function NewPlan() {
  const router = useRouter()
  const [budgetCr, setBudgetCr] = useState(5)
  const [minPayback, setMinPayback] = useState(6)
  const [targetCount, setTargetCount] = useState(15)
  const [district, setDistrict] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<null | { totalInvestment: number; totalRevenueYr1Inr: number; totalPincodesCovered: number; proposals: unknown[] }>(null)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setRunning(true)
    setError(null)
    try {
      const res = await fetch('/api/plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetInr: budgetCr * 10_000_000,
          minPaybackMonths: minPayback,
          targetCount,
          focusDistrict: district || undefined,
          replaceExisting: true,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Generate Charging Plan</h1>
      <p className="text-slate-500 mb-8">Configure constraints; the greedy optimizer will propose the best sites.</p>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <Slider label="Budget" value={budgetCr} min={1} max={20} step={0.5} onChange={setBudgetCr} display={`₹${budgetCr.toFixed(1)} Cr`} />
        <Slider label="Minimum Payback (months)" value={minPayback} min={3} max={24} step={1} onChange={setMinPayback} display={`${minPayback} months`} />
        <Slider label="Target Proposal Count" value={targetCount} min={5} max={30} step={1} onChange={setTargetCount} display={`${targetCount} sites`} />

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Focus District (optional)</label>
          <input
            type="text"
            value={district}
            onChange={e => setDistrict(e.target.value)}
            placeholder="e.g., Bengaluru Urban"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
          />
        </div>

        <button
          onClick={run}
          disabled={running}
          className="w-full flex items-center justify-center gap-2 py-3 bg-lime-500 text-white rounded-lg font-medium hover:bg-lime-600 disabled:bg-lime-300"
        >
          {running ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
          {running ? 'Running optimizer…' : 'Run Optimization'}
        </button>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
      </div>

      {result && (
        <div className="mt-6 bg-white rounded-xl border border-lime-300 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Plan Generated</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Metric label="Proposals" value={result.proposals.length.toString()} />
            <Metric label="Total CAPEX" value={`₹${(result.totalInvestment / 10_000_000).toFixed(2)} Cr`} />
            <Metric label="Revenue Yr 1" value={`₹${(result.totalRevenueYr1Inr / 10_000_000).toFixed(2)} Cr`} />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/map')}
              className="flex-1 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50"
            >
              View on Map
            </button>
            <button
              onClick={() => router.push('/proposals')}
              className="flex-1 py-2 bg-lime-500 text-white rounded-lg text-sm font-medium hover:bg-lime-600"
            >
              View All Proposals
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Slider({ label, value, min, max, step, onChange, display }: { label: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void; display: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <span className="text-sm font-bold text-lime-700">{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full accent-lime-500" />
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500 font-medium">{label}</div>
      <div className="text-xl font-bold text-slate-900">{value}</div>
    </div>
  )
}
