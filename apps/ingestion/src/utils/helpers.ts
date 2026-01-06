// [lon, lat]
export function haversineDistance(start: number[], end: number[]): number {
	const R = 3440.065;
	const toRad = (d: number) => (d * Math.PI) / 180;

	const lat1Rad = toRad(start[1]);
	const lat2Rad = toRad(end[1]);
	const dLat = lat2Rad - lat1Rad;
	const dLon = toRad(end[0] - start[0]);

	const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return Math.round(R * c);
}

const R = 6378137;
const MAX_LAT = 85.0511287798;

export function fromLonLat([lon, lat]: [number, number]): [number, number] {
	lat = Math.max(Math.min(MAX_LAT, lat), -MAX_LAT);

	const x = (R * lon * Math.PI) / 180;
	const y = R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

	return [Math.round(x), Math.round(y)];
}
