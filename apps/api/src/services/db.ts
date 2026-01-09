import { inflateSync } from "node:zlib";
import { decodeTrackpoints, parseTrackPointBuffer } from "@sr24/db/buffer";
import { prisma } from "@sr24/db/pg";
import type { Prisma } from "../../../../packages/db/src/generated/prisma/index.js";

export async function getPilotsByAirport(icao: string, direction?: string, limit?: string, cursor?: string, backwards?: string) {
	const normalizedDirection = (direction || "dep").toLowerCase() === "arr" ? "arr" : "dep";
	const normalizedLimit = Number(limit || 20);
	const normalizedBackwards = backwards === "true";

	const dirCol = normalizedDirection === "dep" ? "dep_icao" : "arr_icao";
	const timeCol = normalizedDirection === "dep" ? "sched_off_block" : "sched_on_block";

	const where: any = {
		[dirCol]: icao.toUpperCase(),
		[timeCol]: { not: null },
	};
	if (!cursor) {
		where[timeCol] = { gte: new Date() };
	}

	return await prisma.pilot.findMany({
		take: normalizedBackwards ? -(normalizedLimit + 1) : normalizedLimit + 1,
		skip: cursor ? 1 : 0,
		cursor: cursor
			? {
					id: cursor,
				}
			: undefined,
		where,
		orderBy: {
			[timeCol]: "asc",
		},
		select: {
			id: true,
			callsign: true,
			aircraft: true,
			flight_plan: true,
			times: true,
			live: true,
		},
	});
}

async function searchPilots(where: Prisma.PilotWhereInput) {
	const [livePilots, offlinePilots] = await Promise.all([
		prisma.pilot.findMany({
			where: {
				...where,
				live: "live",
			},
			orderBy: {
				callsign: "asc",
			},
			select: {
				id: true,
				callsign: true,
				flight_plan: true,
				aircraft: true,
				live: true,
			},
			take: 10,
		}),

		prisma.pilot.findMany({
			where: {
				...where,
				live: {
					in: ["off", "pre"],
				},
			},
			orderBy: {
				callsign: "asc",
			},
			distinct: ["callsign"],
			select: {
				id: true,
				callsign: true,
				flight_plan: true,
				aircraft: true,
				live: true,
			},
			take: 10,
		}),
	]);

	return {
		live: livePilots,
		offline: offlinePilots,
	};
}

export async function searchPilotsByAll(query: string) {
	const where: Prisma.PilotWhereInput = {
		OR: [
			{ callsign: { contains: query.toUpperCase() } },
			{ dep_icao: { contains: query.toUpperCase() } },
			{ arr_icao: { contains: query.toUpperCase() } },
			{ cid: { contains: query } },
			{ name: { contains: query, mode: "insensitive" } },
		],
	};
	return await searchPilots(where);
}

export async function searchPilotsByAirline(query: string) {
	const where: Prisma.PilotWhereInput = {
		callsign: { contains: query.toUpperCase() },
	};
	return await searchPilots(where);
}

export async function searchPilotsByRoute(dep: string, arr: string) {
	const where: Prisma.PilotWhereInput = {
		AND: [{ dep_icao: dep.toUpperCase() }, { arr_icao: arr.toUpperCase() }],
	};
	return await searchPilots(where);
}

export async function getFlightsByCallsign(callsign: string, limit?: string, cursor?: string) {
	return await prisma.pilot.findMany({
		where: {
			callsign,
		},
		orderBy: {
			sched_off_block: "desc",
		},
		take: Number(limit || 20),
		...(cursor && {
			skip: 1,
			cursor: {
				id: cursor,
			},
		}),
		select: {
			id: true,
			callsign: true,
			aircraft: true,
			flight_plan: true,
			times: true,
			live: true,
		},
	});
}

export async function getFlightsByRegistration(registration: string, limit?: string, cursor?: string) {
	return await prisma.pilot.findMany({
		where: {
			ac_reg: registration,
		},
		orderBy: {
			sched_off_block: "desc",
		},
		take: Number(limit || 20),
		...(cursor && {
			skip: 1,
			cursor: {
				id: cursor,
			},
		}),
		select: {
			id: true,
			callsign: true,
			aircraft: true,
			flight_plan: true,
			times: true,
			live: true,
		},
	});
}

export async function getPilotReplay(id: string) {
	const pilot = await prisma.pilot.findUnique({
		where: { id },
	});
	if (!pilot) {
		return null;
	}

	const trackPoint = await prisma.trackpoint.findUnique({
		where: { id },
	});

	const compressed = trackPoint?.points;
	if (!compressed) return { pilot };

	const blob = inflateSync(compressed);
	const buffers = parseTrackPointBuffer(blob);
	const trackPoints = decodeTrackpoints(buffers, true);

	return { pilot, trackPoints };
}

export async function getUserSettings(cid: bigint) {
	return await prisma.user.findUnique({
		where: { cid },
		select: { settings: true },
	});
}

export async function setUserSettings(cid: bigint, settings: any) {
	return await prisma.user.upsert({
		where: { cid },
		update: { settings },
		create: { cid, settings },
	});
}
