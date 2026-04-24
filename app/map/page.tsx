import { prisma } from '@/lib/db'
import MapClient from './MapClient'

export default async function MapPage() {
  const [pincodes, hotspots, stations, proposals] = await Promise.all([
    prisma.pincode.findMany(),
    prisma.demandHotspot.findMany(),
    prisma.chargingStation.findMany({ include: { pincode: { select: { pincode: true, area: true } } } }),
    prisma.chargerProposal.findMany({ include: { pincode: { select: { pincode: true, area: true } } } }),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Bengaluru EV Charging Map</h1>
      <p className="text-slate-500 mb-6">
        Pincode EV-adoption overlay · demand hotspots · existing chargers · proposed sites
      </p>
      <MapClient
        pincodes={pincodes.map(p => ({
          id: p.id,
          pincode: p.pincode,
          area: p.area,
          lat: p.lat,
          lng: p.lng,
          evAdoptionIndex: p.evAdoptionIndex,
          peakDemandMW: p.peakDemandMW,
          availableCapacityMW: p.availableCapacityMW,
        }))}
        hotspots={hotspots}
        stations={stations.map(s => ({
          id: s.id,
          name: s.name,
          operator: s.operator,
          lat: s.lat,
          lng: s.lng,
          portCount: s.portCount,
          category: s.category,
          dailyUtilization: s.dailyUtilization,
        }))}
        proposals={proposals.map(p => ({
          id: p.id,
          lat: p.proposedLat,
          lng: p.proposedLng,
          area: p.pincode.area,
          pincode: p.pincode.pincode,
          category: p.category,
          siteScore: p.siteScore,
          paybackMonths: p.paybackMonths,
          status: p.status,
          recommendedPorts: p.recommendedPorts,
        }))}
      />
    </div>
  )
}
