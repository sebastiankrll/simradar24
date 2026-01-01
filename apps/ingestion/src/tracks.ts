import type { PilotLong, TrackPoint } from "@sr24/types/interface";
import { fromLonLat } from "./utils/helpers.js";

let cached: Map<string, TrackPoint> = new Map();

export function mapTrackPointsLong(pilots: PilotLong[]): Map<string, TrackPoint> {
	const trackPointsLong: Map<string, TrackPoint> = new Map();
	const newCached: Map<string, TrackPoint> = new Map();

	for (const pilot of pilots) {
		const trackPointLong: TrackPoint = {
			coordinates: fromLonLat([pilot.longitude, pilot.latitude]),
			altitude_ms: roundAltitude(pilot.altitude_ms),
			altitude_agl: roundAltitude(pilot.altitude_agl),
			groundspeed: pilot.groundspeed,
			vertical_speed: roundAltitude(pilot.vertical_speed),
			heading: pilot.heading,
			color: getTrackPointColor(pilot.altitude_agl, pilot.altitude_ms),
			timestamp: pilot.timestamp,
		};
		newCached.set(pilot.id, trackPointLong);

		const cachedTrackPoint = cached.get(pilot.id);
		if (!cachedTrackPoint) {
			trackPointsLong.set(pilot.id, trackPointLong);
			continue;
		}

		if (
			cachedTrackPoint.coordinates[0] === trackPointLong.coordinates[0] &&
			cachedTrackPoint.coordinates[1] === trackPointLong.coordinates[1] &&
			cachedTrackPoint.altitude_ms === trackPointLong.altitude_ms &&
			cachedTrackPoint.groundspeed === trackPointLong.groundspeed
		) {
			continue;
		}

		const minimalTrackPoint: TrackPoint = { coordinates: trackPointLong.coordinates, timestamp: trackPointLong.timestamp };
		if (cachedTrackPoint.altitude_ms !== trackPointLong.altitude_ms) minimalTrackPoint.altitude_ms = trackPointLong.altitude_ms;
		if (cachedTrackPoint.altitude_agl !== trackPointLong.altitude_agl) minimalTrackPoint.altitude_agl = trackPointLong.altitude_agl;
		if (cachedTrackPoint.groundspeed !== trackPointLong.groundspeed) minimalTrackPoint.groundspeed = trackPointLong.groundspeed;
		if (cachedTrackPoint.vertical_speed !== trackPointLong.vertical_speed) minimalTrackPoint.vertical_speed = trackPointLong.vertical_speed;
		if (cachedTrackPoint.heading !== trackPointLong.heading) minimalTrackPoint.heading = trackPointLong.heading;
		if (cachedTrackPoint.color !== trackPointLong.color) minimalTrackPoint.color = trackPointLong.color;

		if (Object.keys(minimalTrackPoint).length > 2) {
			trackPointsLong.set(pilot.id, minimalTrackPoint);
		}
	}

	cached = newCached;
	return trackPointsLong;
}

export function mapTrackPointsShort(trackPointsLong: Map<string, TrackPoint>): Map<string, TrackPoint> {
	const trackPointsShort: Map<string, TrackPoint> = new Map();
	for (const [id, trackPointLong] of trackPointsLong) {
		trackPointsShort.set(id, getTrackPointShort(trackPointLong));
	}

	return trackPointsShort;
}

function getTrackPointShort(trackPointLong: TrackPoint): TrackPoint {
	const trackPointShort: TrackPoint = { coordinates: trackPointLong.coordinates, timestamp: trackPointLong.timestamp };
	if (trackPointLong.altitude_ms !== undefined) trackPointShort.altitude_ms = trackPointLong.altitude_ms;
	if (trackPointLong.groundspeed !== undefined) trackPointShort.groundspeed = trackPointLong.groundspeed;
	if (trackPointLong.color !== undefined) trackPointShort.color = trackPointLong.color;
	return trackPointShort;
}

function roundAltitude(altitude: number): number {
	return Math.round(altitude / 100) * 100;
}

function getTrackPointColor(altitude_agl: number, altitude_ms: number): string {
	if (altitude_agl < 50) {
		return "#4d5f83ff";
	}

	const degrees = (300 / 50000) * altitude_ms + 60;
	const colorSectors = [
		{ color: "red", angle: 0, rgb: [255, 0, 0] },
		{ color: "yellow", angle: 60, rgb: [255, 255, 0] },
		{ color: "green", angle: 120, rgb: [0, 255, 0] },
		{ color: "cyan", angle: 180, rgb: [0, 255, 255] },
		{ color: "blue", angle: 240, rgb: [0, 0, 255] },
		{ color: "magenta", angle: 300, rgb: [255, 0, 255] },
		{ color: "red", angle: 360, rgb: [255, 0, 0] },
	];

	let lowerBoundIndex = 0;
	for (let i = 0; i < colorSectors.length; i++) {
		if (degrees < colorSectors[i].angle) {
			lowerBoundIndex = i - 1;
			break;
		}
	}

	const lowerBound = colorSectors[lowerBoundIndex];
	const upperBound = colorSectors[lowerBoundIndex + 1];
	const interpolationFactor = (degrees - lowerBound.angle) / (upperBound.angle - lowerBound.angle);

	const resultRGB = [];
	for (let i = 0; i < 3; i++) {
		resultRGB[i] = Math.round(lowerBound.rgb[i] + interpolationFactor * (upperBound.rgb[i] - lowerBound.rgb[i]));
	}
	const hexString = `#${resultRGB.map((c) => c.toString(16).padStart(2, "0")).join("")}ff`;

	return hexString;
}
