'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import 'leaflet/dist/leaflet.css'

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const CircleMarker = dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false })

interface PincodeRow { id: string; pincode: string; area: string; lat: number; lng: number; evAdoptionIndex: number; peakDemandMW: number; availableCapacityMW: number }
interface HotspotRow { id: string; lat: number; lng: number; demandScore: number; source: string; notes?: string | null }
interface StationRow { id: string; name: string; operator: string; lat: number; lng: number; portCount: number; category: string; dailyUtilization: number }
interface ProposalRow { id: string; lat: number; lng: number; area: string; pincode: string; category: string; siteScore: number; paybackMonths: number; status: string; recommendedPorts: number }

function pincodeColor(idx: number): string {
  if (idx >= 0.75) return '#84cc16'
  if (idx >= 0.55) return '#a3e635'
  if (idx >= 0.4) return '#facc15'
  if (idx >= 0.25) return '#fb923c'
  return '#94a3b8'
}

export default function MapClient({ pincodes, hotspots, stations, proposals }: {
  pincodes: PincodeRow[]
  hotspots: HotspotRow[]
  stations: StationRow[]
  proposals: ProposalRow[]
}) {
  const [showPincodes, setShowPincodes] = useState(true)
  const [showHotspots, setShowHotspots] = useState(true)
  const [showStations, setShowStations] = useState(true)
  const [showProposals, setShowProposals] = useState(true)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-5 h-fit">
        <h2 className="font-semibold text-slate-900 mb-4">Layers</h2>
        <div className="space-y-3">
          <LayerToggle label="Pincode EV Adoption" active={showPincodes} onClick={() => setShowPincodes(v => !v)} swatch="#84cc16" count={pincodes.length} />
          <LayerToggle label="Demand Hotspots" active={showHotspots} onClick={() => setShowHotspots(v => !v)} swatch="#f97316" count={hotspots.length} />
          <LayerToggle label="Existing Chargers" active={showStations} onClick={() => setShowStations(v => !v)} swatch="#3b82f6" count={stations.length} />
          <LayerToggle label="Proposed Sites" active={showProposals} onClick={() => setShowProposals(v => !v)} swatch="#84cc16" ring count={proposals.length} />
        </div>
        <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500">
          <div className="font-medium text-slate-700 mb-2">Legend</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-lime-500 inline-block" /> High EV adoption ≥ 0.75</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-lime-400 inline-block" /> Medium-high 0.55 – 0.75</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> Medium 0.40 – 0.55</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block" /> Low 0.25 – 0.40</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-slate-400 inline-block" /> Emerging &lt; 0.25</div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ height: '680px' }}>
        <MapContainer center={[12.97, 77.59]} zoom={11} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution='&copy; OpenStreetMap' url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
          {showPincodes && pincodes.map(p => (
            <CircleMarker key={`pc-${p.id}`} center={[p.lat, p.lng]} radius={14} pathOptions={{ color: pincodeColor(p.evAdoptionIndex), fillColor: pincodeColor(p.evAdoptionIndex), fillOpacity: 0.35, weight: 1 }}>
              <Popup>
                <div className="text-sm">
                  <div className="font-medium">{p.area} ({p.pincode})</div>
                  <div className="text-xs text-slate-600 mt-1">EV Adoption: {(p.evAdoptionIndex * 100).toFixed(0)}%</div>
                  <div className="text-xs text-slate-600">Peak Demand: {p.peakDemandMW} MW</div>
                  <div className="text-xs text-slate-600">Capacity Headroom: {p.availableCapacityMW} MW</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
          {showHotspots && hotspots.map(h => (
            <CircleMarker key={`ht-${h.id}`} center={[h.lat, h.lng]} radius={Math.max(4, h.demandScore * 10)} pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.4, weight: 1 }}>
              <Popup>
                <div className="text-sm">
                  <div className="font-medium">Demand Hotspot</div>
                  <div className="text-xs text-slate-600 mt-1">Score: {(h.demandScore * 100).toFixed(0)}%</div>
                  <div className="text-xs text-slate-600">Source: {h.source.replace(/_/g, ' ')}</div>
                  {h.notes && <div className="text-xs text-slate-600 mt-1">{h.notes}</div>}
                </div>
              </Popup>
            </CircleMarker>
          ))}
          {showStations && stations.map(s => (
            <CircleMarker key={`st-${s.id}`} center={[s.lat, s.lng]} radius={6} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.7, weight: 2 }}>
              <Popup>
                <div className="text-sm">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-slate-600 mt-1">Operator: {s.operator}</div>
                  <div className="text-xs text-slate-600">Ports: {s.portCount} · Category: {s.category.replace(/_/g, ' ')}</div>
                  <div className="text-xs text-slate-600">Utilization: {(s.dailyUtilization * 100).toFixed(0)}%</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
          {showProposals && proposals.map(p => (
            <CircleMarker key={`pr-${p.id}`} center={[p.lat, p.lng]} radius={10} pathOptions={{ color: '#65a30d', fillColor: '#bef264', fillOpacity: 0.9, weight: 3 }}>
              <Popup>
                <div className="text-sm">
                  <div className="font-medium">Proposed Charger</div>
                  <div className="text-xs text-slate-600 mt-1">{p.area} ({p.pincode})</div>
                  <div className="text-xs text-slate-600">{p.category.replace(/_/g, ' ')} · {p.recommendedPorts} ports</div>
                  <div className="text-xs text-slate-600 mt-1">Score: {(p.siteScore * 100).toFixed(0)}% · Payback: {p.paybackMonths}mo</div>
                  <div className="text-xs mt-1"><span className="font-medium">Status:</span> {p.status}</div>
                  <Link href={`/proposals/${p.id}`} className="text-xs text-lime-700 hover:underline mt-1 inline-block">View details →</Link>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}

function LayerToggle({ label, active, onClick, swatch, ring, count }: { label: string; active: boolean; onClick: () => void; swatch: string; ring?: boolean; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between p-2 rounded-lg border text-left ${active ? 'border-lime-300 bg-lime-50' : 'border-slate-200 bg-white'}`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`w-3 h-3 rounded-full inline-block ${ring ? 'ring-2 ring-offset-1 ring-lime-500' : ''}`}
          style={{ background: swatch }}
        />
        <span className={`text-sm ${active ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>{label}</span>
      </div>
      <span className="text-xs text-slate-500">{count}</span>
    </button>
  )
}
