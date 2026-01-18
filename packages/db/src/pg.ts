import { deflateSync } from "node:zlib";
import { PrismaPg } from "@prisma/adapter-pg";
import type { PilotLong } from "@sr24/types/interface";
import { PrismaClient } from "./generated/prisma/client.js";
import { rdsGetTrackPoints } from "./redis.js";

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

	const transactions = [];

	for (const p of pilots) {
		if (p.live === "live" || !p.flight_plan || !p.times) continue;

		try {
			const buffers: Buffer[] = await rdsGetTrackPoints(p.id, true);
			if (buffers.length === 0) continue;

			const blob = Buffer.concat(buffers);
			const compressed = deflateSync(blob);
			transactions.push(
				prisma.trackpoint.upsert({
					where: { id: p.id },
					update: { points: compressed, created_at: new Date() },
					create: { id: p.id, points: compressed, created_at: new Date() },
				}),
			);
		} catch (err) {
			console.error(`Error upserting trackpoints for pilot ${p.id}:`, err);
		}
	}

	if (transactions.length > 0) {
		await prisma.$transaction(transactions);
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

		const baseIdx = idx * 29;
		values.push(`(
			$${baseIdx + 1}, $${baseIdx + 2}, $${baseIdx + 3}, $${baseIdx + 4}, $${baseIdx + 5},
			$${baseIdx + 6}, $${baseIdx + 7}, $${baseIdx + 8}, $${baseIdx + 9}, $${baseIdx + 10},
			$${baseIdx + 11}, $${baseIdx + 12}, $${baseIdx + 13}, $${baseIdx + 14}, $${baseIdx + 15},
			$${baseIdx + 16}, $${baseIdx + 17}, $${baseIdx + 18}, $${baseIdx + 19}, $${baseIdx + 20},
			$${baseIdx + 21}, $${baseIdx + 22}, $${baseIdx + 23}, $${baseIdx + 24}, $${baseIdx + 25}, $${baseIdx + 26},
			$${baseIdx + 27}, $${baseIdx + 28}, $${baseIdx + 29}
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
			p.last_update,
			p.live,
			// ---- Indexes ----
			p.times.sched_off_block || null,
			p.times.sched_on_block || null,
			p.flight_plan.departure.icao || null,
			p.flight_plan.arrival.icao || null,
			p.flight_plan.ac_reg || null,
		);

		idx++;
	}

	if (values.length === 0) {
		return;
	}

	const query = `
		INSERT INTO "Pilot" (
			id, cid, callsign, latitude, longitude, altitude_agl,
			altitude_ms, groundspeed, vertical_speed, heading, aircraft,
			transponder, frequency,
			name, server, pilot_rating, military_rating, qnh_i_hg,
			qnh_mb, flight_plan, times, logon_time, last_update, live,
			sched_off_block, sched_on_block, dep_icao, arr_icao, ac_reg
		)
		VALUES ${values.join(",")}
		ON CONFLICT (id) DO UPDATE SET
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
			arr_icao = EXCLUDED.arr_icao,
            ac_reg = EXCLUDED.ac_reg
	`;

	try {
		await prisma.$executeRawUnsafe(query, ...params);
	} catch (err) {
		console.error("Error upserting pilot batch:", err);
		throw err;
	}
}

export async function pgDeleteStalePilots(): Promise<void> {
	try {
		await prisma.pilot.deleteMany({
			where: {
				OR: [
					{ last_update: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
					{ live: "pre", last_update: { lt: new Date(Date.now() - 3 * 60 * 60 * 1000) } },
				],
			},
		});

		const pilots = await prisma.pilot.findMany({
			where: {
				live: "live",
				last_update: { lt: new Date(Date.now() - 120 * 1000) },
			},
			select: { id: true },
		});

		if (pilots.length === 0) return;

		await prisma.pilot.updateMany({
			where: {
				id: { in: pilots.map((p) => p.id) },
			},
			data: {
				live: "off",
			},
		});

		const transactions = [];

		for (const p of pilots) {
			try {
				const id = p.id;
				const buffers: Buffer[] = await rdsGetTrackPoints(id, true);
				if (buffers.length === 0) continue;

				const blob = Buffer.concat(buffers);
				const compressed = deflateSync(blob);
				transactions.push(
					prisma.trackpoint.upsert({
						where: { id: id },
						update: { points: compressed, created_at: new Date() },
						create: { id: id, points: compressed, created_at: new Date() },
					}),
				);
			} catch (err) {
				console.error(`Error upserting trackpoints for pilot ${p.id}:`, err);
			}
		}

		if (transactions.length > 0) {
			await prisma.$transaction(transactions);
		}
	} catch (err) {
		console.error("Error cleaning up stale pilots:", err);
		throw err;
	}
}
