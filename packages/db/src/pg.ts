import { PrismaPg } from "@prisma/adapter-pg";
import type { PilotLong } from "@sr24/types/interface";
import { PrismaClient } from "./generated/prisma/client.js";

const adapter = new PrismaPg({
	connectionString: `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}?schema=public`,
});
export const prisma = new PrismaClient({
	adapter,
});

// Health check
export async function pgHealthCheck(): Promise<boolean> {
	try {
		await prisma.$queryRaw`SELECT 1`;
		return true;
	} catch (err) {
		console.error("PostgreSQL health check failed:", err);
		return false;
	}
}

// Graceful shutdown
export async function pgShutdown(): Promise<void> {
	await prisma.$disconnect();
	console.log("PostgreSQL connection pool closed");
}

export async function pgUpsertPilots(pilots: PilotLong[]): Promise<void> {
	if (!pilots.length) return;

	const BATCH_SIZE = 1000;

	for (let i = 0; i < pilots.length; i += BATCH_SIZE) {
		const batch = pilots.slice(i, i + BATCH_SIZE);
		await pgUpsertPilotsBatch(batch);
	}
}

async function pgUpsertPilotsBatch(pilots: PilotLong[]): Promise<void> {
	if (pilots.length === 0) return;

	const values: string[] = [];
	const params: any[] = [];
	let idx = 0;

	for (const p of pilots) {
		if (!p.flight_plan || !p.times) {
			continue;
		}

		const baseIdx = idx * 28;
		values.push(`(
			$${baseIdx + 1}, $${baseIdx + 2}, $${baseIdx + 3}, $${baseIdx + 4}, $${baseIdx + 5},
			$${baseIdx + 6}, $${baseIdx + 7}, $${baseIdx + 8}, $${baseIdx + 9}, $${baseIdx + 10},
			$${baseIdx + 11}, $${baseIdx + 12}, $${baseIdx + 13}, $${baseIdx + 14}, $${baseIdx + 15},
			$${baseIdx + 16}, $${baseIdx + 17}, $${baseIdx + 18}, $${baseIdx + 19}, $${baseIdx + 20},
			$${baseIdx + 21}, $${baseIdx + 22}, $${baseIdx + 23}, $${baseIdx + 24}, $${baseIdx + 25}, $${baseIdx + 26},
			$${baseIdx + 27}, $${baseIdx + 28}
		)`);

		params.push(
			p.id,
			p.cid,
			p.callsign,
			p.latitude,
			p.longitude,
			p.altitude_agl,
			p.altitude_ms,
			p.groundspeed,
			p.vertical_speed,
			p.heading,
			p.aircraft,
			p.transponder,
			p.frequency,
			p.name,
			p.server,
			p.pilot_rating,
			p.military_rating,
			p.qnh_i_hg,
			p.qnh_mb,
			JSON.stringify(p.flight_plan),
			JSON.stringify(p.times),
			p.logon_time,
			p.timestamp,
			p.live,
			// ---- Indexes ----
			p.times?.sched_off_block || null,
			p.times?.sched_on_block || null,
			p.flight_plan?.departure.icao || null,
			p.flight_plan?.arrival.icao || null,
		);

		idx++;
	}

	const query = `
		INSERT INTO "Pilot" (
			pilot_id, cid, callsign, latitude, longitude, altitude_agl,
			altitude_ms, groundspeed, vertical_speed, heading, aircraft,
			transponder, frequency,
			name, server, pilot_rating, military_rating, qnh_i_hg,
			qnh_mb, flight_plan, times, logon_time, last_update, live,
			sched_off_block, sched_on_block, dep_icao, arr_icao
		)
		VALUES ${values.join(",")}
		ON CONFLICT (pilot_id) DO UPDATE SET
			cid = EXCLUDED.cid,
			callsign = EXCLUDED.callsign,
			latitude = EXCLUDED.latitude,
			longitude = EXCLUDED.longitude,
			altitude_agl = EXCLUDED.altitude_agl,
			altitude_ms = EXCLUDED.altitude_ms,
			groundspeed = EXCLUDED.groundspeed,
			vertical_speed = EXCLUDED.vertical_speed,
			heading = EXCLUDED.heading,
			aircraft = EXCLUDED.aircraft,
			transponder = EXCLUDED.transponder,
			frequency = EXCLUDED.frequency,
			name = EXCLUDED.name,
			server = EXCLUDED.server,
			pilot_rating = EXCLUDED.pilot_rating,
			military_rating = EXCLUDED.military_rating,
			qnh_i_hg = EXCLUDED.qnh_i_hg,
			qnh_mb = EXCLUDED.qnh_mb,
			flight_plan = EXCLUDED.flight_plan,
			times = EXCLUDED.times,
			logon_time = EXCLUDED.logon_time,
			last_update = EXCLUDED.last_update,
			live = EXCLUDED.live,
			sched_off_block = EXCLUDED.sched_off_block,
			sched_on_block = EXCLUDED.sched_on_block,
			dep_icao = EXCLUDED.dep_icao,
			arr_icao = EXCLUDED.arr_icao
	`;

	try {
		await prisma.$executeRawUnsafe(query, ...params);
	} catch (err) {
		console.error("Error upserting pilot batch:", err);
		throw err;
	}
}

export async function pgFindAirportFlights(
	icao: string,
	direction: "dep" | "arr",
	limit: number,
	cursor?: string,
	backwards?: boolean,
): Promise<PilotLong[]> {
	try {
		const dirCol = direction === "dep" ? "dep_icao" : "arr_icao";
		const timeCol = direction === "dep" ? "sched_off_block" : "sched_on_block";

		const where: any = {
			[dirCol]: icao,
			[timeCol]: { not: null },
		};
		if (!cursor) {
			where[timeCol] = { gte: new Date() };
		}

		const results = await prisma.pilot.findMany({
			take: backwards ? -(limit + 1) : limit + 1,
			skip: cursor ? 1 : 0,
			cursor: cursor
				? {
						pilot_id: cursor,
					}
				: undefined,
			where,
			orderBy: {
				[timeCol]: "asc",
			},
		});

		const pilots: PilotLong[] = results.map((r) => ({
			id: r.pilot_id,
			cid: r.cid,
			callsign: r.callsign,
			latitude: r.latitude,
			longitude: r.longitude,
			altitude_agl: r.altitude_agl,
			altitude_ms: r.altitude_ms,
			groundspeed: r.groundspeed,
			vertical_speed: r.vertical_speed,
			heading: r.heading,
			aircraft: r.aircraft,
			transponder: r.transponder,
			frequency: r.frequency,
			name: r.name,
			server: r.server,
			pilot_rating: r.pilot_rating,
			military_rating: r.military_rating,
			qnh_i_hg: r.qnh_i_hg,
			qnh_mb: r.qnh_mb,
			flight_plan: r.flight_plan as any,
			times: r.times as any,
			logon_time: r.logon_time,
			timestamp: r.last_update,
			live: r.live,
		}));

		return pilots;
	} catch (err) {
		console.error("Error fetching airport pilots:", err);
		throw err;
	}
}

export async function pgDeleteStalePilots(): Promise<void> {
	try {
		const deleted = await prisma.pilot.deleteMany({
			where: {
				last_update: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
			},
		});

		const updated = await prisma.pilot.updateMany({
			where: {
				live: true,
				last_update: { lt: new Date(Date.now() - 120 * 1000) },
			},
			data: {
				live: false,
			},
		});

		if (deleted.count > 0) {
			console.log(`🗑️  Deleted ${deleted.count} stale pilots`);
		}
		if (updated.count > 0) {
			console.log(`♻️  Marked ${updated.count} pilots as not live`);
		}
	} catch (err) {
		console.error("Error cleaning up stale pilots:", err);
		throw err;
	}
}
