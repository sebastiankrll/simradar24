import { encodeTrackPoint } from "@sr24/db/buffer";
import type { PilotLong, TrackPoint } from "@sr24/types/interface";
import { fromLonLat } from "./utils/helpers.js";

let cached = new Map<string, Required<TrackPoint>>();

export function mapTrackPoints(pilots: PilotLong[]): Map<string, Buffer> {
	const trackPoints: Map<string, Buffer> = new Map();
	const newCached = new Map<string, Required<TrackPoint>>();

	for (const pilot of pilots) {
		if (pilot.live === "pre") continue;

		const trackPoint: Required<TrackPoint> = {
			coordinates: fromLonLat([pilot.longitude, pilot.latitude]),
			altitude_ms: roundAltitude(pilot.altitude_ms),
			altitude_agl: roundAltitude(pilot.altitude_agl),
			groundspeed: pilot.groundspeed,
			vertical_speed: roundAltitude(pilot.vertical_speed),
			heading: pilot.heading,
			color: getTrackPointColor(pilot.altitude_agl, pilot.altitude_ms),
			timestamp: pilot.last_update.getTime(),
		};
		newCached.set(pilot.id, trackPoint);

		const cachedPoint = cached.get(pilot.id);
		if (cachedPoint && !isChanged(cachedPoint, trackPoint) && pilot.live === "live") {
			continue;
		}

		const encoded = encodeTrackPoint(trackPoint);
		trackPoints.set(pilot.id, encoded);
	}

	cached = newCached;
	return trackPoints;
}

function isChanged(a: Required<TrackPoint>, b: Required<TrackPoint>): boolean {
	return (
		a.coordinates[0] !== b.coordinates[0] ||
		a.coordinates[1] !== b.coordinates[1] ||
		a.altitude_ms !== b.altitude_ms ||
		a.altitude_agl !== b.altitude_agl ||
		a.groundspeed !== b.groundspeed ||
		a.vertical_speed !== b.vertical_speed ||
		a.heading !== b.heading
	);
}

function roundAltitude(altitude: number): number {
	return Math.round(altitude / 100) * 100;
}

function getTrackPointColor(altitude_agl: number, altitude_ms: number): string {
	if (altitude_agl < 50) {
		return "#4d5f83";
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
	const hexString = `#${resultRGB.map((c) => c.toString(16).padStart(2, "0")).join("")}`;

	return hexString;
}
