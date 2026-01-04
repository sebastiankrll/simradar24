import type { DecodedTrackPoint, DeltaTrackPoint, TrackPoint } from "@sr24/types/interface";

const TRACKPOINT_SIZE = 25;

export function encodeTrackPoint(tp: Required<TrackPoint>): Buffer {
	const buf = Buffer.allocUnsafe(TRACKPOINT_SIZE);

	const [x, y] = tp.coordinates;
	buf.writeInt32BE(x, 0);
	buf.writeInt32BE(y, 4);

	buf.writeInt16BE(tp.altitude_ms / 100, 8);
	buf.writeInt16BE(tp.altitude_agl / 100, 10);

	buf.writeInt16BE(tp.groundspeed, 12);
	buf.writeInt16BE(tp.vertical_speed, 14);
	buf.writeUInt16BE(tp.heading, 16);
	const color = tp.color;
	const rgb = parseInt(color.slice(1), 16);
	buf.writeUInt8((rgb >> 16) & 0xff, 18);
	buf.writeUInt8((rgb >> 8) & 0xff, 19);
	buf.writeUInt8(rgb & 0xff, 20);

	buf.writeUInt32BE(Math.floor(tp.timestamp / 1000), 21);

	return buf;
}

export function parseTrackPointBuffer(buf: Buffer): Buffer[] {
	const buffers: Buffer[] = [];
	for (let i = 0; i < buf.length; i += TRACKPOINT_SIZE) {
		buffers.push(buf.slice(i, i + TRACKPOINT_SIZE));
	}
	return buffers;
}

const TP_MASK = {
	COORDS: 1 << 0,
	ALT_MSL: 1 << 1,
	ALT_AGL: 1 << 2,
	GS: 1 << 3,
	VS: 1 << 4,
	HDG: 1 << 5,
	COLOR: 1 << 6,
} as const;

export function decodeTrackpoints(buffers: Buffer[]): (TrackPoint | DeltaTrackPoint)[];
export function decodeTrackpoints(buffers: Buffer[], full: true): (Required<TrackPoint> | DeltaTrackPoint)[];
export function decodeTrackpoints(buffers: Buffer[], full?: boolean): (TrackPoint | DeltaTrackPoint)[] {
	const result: (TrackPoint | DeltaTrackPoint)[] = [];
	let prev: DecodedTrackPoint | null = null;

	for (const buf of buffers) {
		const curr = decodeTrackPoint(buf);

		if (!prev) {
			const short: TrackPoint = {
				coordinates: [curr.x, curr.y],
				altitude_ms: curr.alt_msl * 100,
				groundspeed: curr.gs,
				color: `#${curr.color.toString(16).padStart(6, "0")}`,
				timestamp: curr.ts * 1000,
			};
			if (full) {
				result.push({ ...short, altitude_agl: curr.alt_agl * 100, vertical_speed: curr.vs, heading: curr.hdg });
			} else {
				result.push(short);
			}
		} else {
			let mask = 0;
			const values: number[] = [];

			if (curr.x !== prev.x || curr.y !== prev.y) {
				mask |= TP_MASK.COORDS;
				values.push(curr.x, curr.y);
			}
			if (curr.alt_msl !== prev.alt_msl) {
				mask |= TP_MASK.ALT_MSL;
				values.push(curr.alt_msl);
			}
			if (curr.alt_agl !== prev.alt_agl && full) {
				mask |= TP_MASK.ALT_AGL;
				values.push(curr.alt_agl);
			}
			if (curr.gs !== prev.gs) {
				mask |= TP_MASK.GS;
				values.push(curr.gs);
			}
			if (curr.vs !== prev.vs && full) {
				mask |= TP_MASK.VS;
				values.push(curr.vs);
			}
			if (curr.hdg !== prev.hdg && full) {
				mask |= TP_MASK.HDG;
				values.push(curr.hdg);
			}
			if (curr.color !== prev.color) {
				mask |= TP_MASK.COLOR;
				values.push(curr.color);
			}

			result.push({
				m: mask,
				v: values,
				t: curr.ts,
			});
		}

		prev = curr;
	}

	return result;
}

function decodeTrackPoint(buf: Buffer): DecodedTrackPoint {
	return {
		x: buf.readInt32BE(0),
		y: buf.readInt32BE(4),
		alt_msl: buf.readInt16BE(8),
		alt_agl: buf.readInt16BE(10),
		gs: buf.readInt16BE(12),
		vs: buf.readInt16BE(14),
		hdg: buf.readUInt16BE(16),
		color: (buf.readUInt8(18) << 16) | (buf.readUInt8(19) << 8) | buf.readUInt8(20),
		ts: buf.readUInt32BE(21),
	};
}
