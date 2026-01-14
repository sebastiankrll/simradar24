import type { DeltaTrackPoint, TrackPoint } from "@sr24/types/interface";
import Stroke from "ol/style/Stroke";

const TP_MASK = {
	COORDS: 1 << 0,
	ALT_MSL: 1 << 1,
	ALT_AGL: 1 << 2,
	GS: 1 << 3,
	VS: 1 << 4,
	HDG: 1 << 5,
	COLOR: 1 << 6,
} as const;

export function decodeTrackPoints(masked: (TrackPoint | DeltaTrackPoint)[] | undefined): TrackPoint[];
export function decodeTrackPoints(masked: (TrackPoint | DeltaTrackPoint)[] | undefined, full: true): Required<TrackPoint>[];
export function decodeTrackPoints(masked: (TrackPoint | DeltaTrackPoint)[] | undefined, full?: boolean): TrackPoint[] {
	if (!masked) return [];

	const result: TrackPoint[] = [];
	let last: TrackPoint | null = null;

	for (const item of masked) {
		if ("coordinates" in item) {
			last = { ...item };
		} else if (last) {
			let i = 0;

			if (item.m & TP_MASK.COORDS) last.coordinates = [item.v[i++], item.v[i++]];
			if (item.m & TP_MASK.ALT_MSL) last.altitude_ms = item.v[i++] * 100;
			if (item.m & TP_MASK.ALT_AGL && full) last.altitude_agl = item.v[i++] * 100;
			if (item.m & TP_MASK.GS) last.groundspeed = item.v[i++];
			if (item.m & TP_MASK.VS && full) last.vertical_speed = item.v[i++];
			if (item.m & TP_MASK.HDG && full) last.heading = item.v[i++];
			if (item.m & TP_MASK.COLOR) last.color = `#${item.v[i++].toString(16).padStart(6, "0")}`;

			last.timestamp = item.t * 1000;
		} else {
			throw new Error("First trackpoint must be full, cannot start with delta");
		}

		result.push({ ...last });
	}

	return result;
}

export function getStroke(start: TrackPoint, end: TrackPoint): Stroke {
	if (end.timestamp - start.timestamp > 60000) {
		return new Stroke({
			color: "rgba(152, 156, 178, 0.8)",
			width: 3,
			lineDash: [5, 8],
			lineCap: "square",
		});
	}
	return new Stroke({
		color: start.color,
		width: 3,
	});
}
