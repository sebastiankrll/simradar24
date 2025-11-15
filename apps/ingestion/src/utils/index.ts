// [lat, long]
export function haversineDistance(start: number[], end: number[]): number {
    const R = 3440.065
    const toRad = (d: number) => d * Math.PI / 180

    const lat1Rad = toRad(start[0])
    const lat2Rad = toRad(end[0])
    const dLat = lat2Rad - lat1Rad
    const dLon = toRad(end[1] - start[1])

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1Rad) * Math.cos(lat2Rad) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return Math.round(R * c)
}