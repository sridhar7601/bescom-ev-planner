import { point, distance } from '@turf/turf'

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return distance(point([lng1, lat1]), point([lng2, lat2]), { units: 'kilometers' })
}

export function pointsWithinKm(
  center: { lat: number; lng: number },
  candidates: Array<{ lat: number; lng: number }>,
  km: number,
): number {
  return candidates.filter(c => haversineKm(center.lat, center.lng, c.lat, c.lng) <= km).length
}

export function minDistanceKm(
  target: { lat: number; lng: number },
  others: Array<{ lat: number; lng: number }>,
): number {
  if (others.length === 0) return Infinity
  return Math.min(...others.map(o => haversineKm(target.lat, target.lng, o.lat, o.lng)))
}
