import type { DeltaTrackPoint, TrackPoint } from "@sr24/types/interface";

const TP_MASK = {
	COORDS: 1 << 0,
	ALT_MSL: 1 << 1,
	ALT_AGL: 1 << 2,
	GS: 1 << 3,
	VS: 1 << 4,
	HDG: 1 << 5,
	COLOR: 1 << 6,
} as const;

export function decodeTrackPoints(masked: (TrackPoint | DeltaTrackPoint)[]): TrackPoint[];
export function decodeTrackPoints(masked: (TrackPoint | DeltaTrackPoint)[], full: true): Required<TrackPoint>[];
export function decodeTrackPoints(masked: (TrackPoint | DeltaTrackPoint)[], full?: boolean): TrackPoint[] {
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

			last.timestamp = item.t;
		} else {
			throw new Error("First trackpoint must be full, cannot start with delta");
		}

		result.push({ ...last });
	}

	return result;
}
