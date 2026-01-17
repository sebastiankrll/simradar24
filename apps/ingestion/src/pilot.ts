import { createHash } from "node:crypto";
import { rdsGetMultiple, rdsGetSingle } from "@sr24/db/redis";
import type { StaticAirport } from "@sr24/types/db";
import type { PilotDelta, PilotFlightPlan, PilotLong, PilotShort, PilotTimes } from "@sr24/types/interface";
import type { VatsimData, VatsimPilot, VatsimPilotFlightPlan, VatsimPrefile } from "@sr24/types/vatsim";
import { fromLonLat, haversineDistance } from "./utils/helpers.js";

const TAXI_TIME_MS = 5 * 60 * 1000;
const PILOT_RATINGS = [
	{
		id: 0,
		short_name: "NEW",
		long_name: "Basic Member",
	},
	{
		id: 1,
		short_name: "PPL",
		long_name: "Private Pilot License",
	},
	{
		id: 3,
		short_name: "IR",
		long_name: "Instrument Rating",
	},
	{
		id: 7,
		short_name: "CMEL",
		long_name: "Commercial Multi-Engine License",
	},
	{
		id: 15,
		short_name: "ATPL",
		long_name: "Airline Transport Pilot License",
	},
	{
		id: 31,
		short_name: "FI",
		long_name: "Flight Instructor",
	},
	{
		id: 63,
		short_name: "FE",
		long_name: "Flight Examiner",
	},
];
const MILITARY_RATINGS = [
	{
		id: 0,
		short_name: "M0",
		long_name: "No Military Rating",
	},
	{
		id: 1,
		short_name: "M1",
		long_name: "Military Pilot License",
	},
	{
		id: 3,
		short_name: "M2",
		long_name: "Military Instrument Rating",
	},
	{
		id: 7,
		short_name: "M3",
		long_name: "Military Multi-Engine Rating",
	},
	{
		id: 15,
		short_name: "M4",
		long_name: "Military Mission Ready Pilot",
	},
];

let cached: PilotLong[] = [];
let added: Required<PilotShort>[] = [];
let updated: PilotShort[] = [];

export async function mapPilots(vatsimData: VatsimData): Promise<PilotLong[]> {
	const newPilotsLong: PilotLong[] = [];
	const newCached: PilotLong[] = [];
	added = [];
	updated = [];

	await Promise.all(
		vatsimData.pilots.map(async (pilot) => {
			const id = getPilotId(pilot);
			const cachedPilot = cached.find((c) => c.id === id);

			const transceiverData = vatsimData.transceivers.find((transceiver) => transceiver.callsign === pilot.callsign);
			const transceiver = transceiverData?.transceivers[0];

			const updatedFields = {
				longitude: pilot.longitude,
				latitude: pilot.latitude,
				altitude_agl: transceiver?.heightAglM ? Math.round(transceiver.heightAglM * 3.28084) : pilot.altitude,
				altitude_ms: pilot.altitude,
				groundspeed: pilot.groundspeed,
				vertical_speed: 0,
				heading: pilot.heading,
				last_update: new Date(pilot.last_updated),
				transponder: pilot.transponder.slice(0, 4),
				frequency: Number(transceiver?.frequency.toString().slice(0, 6)) || 122_800,
				qnh_i_hg: pilot.qnh_i_hg,
				qnh_mb: pilot.qnh_mb,
			};

			let pilotLong: PilotLong;
			if (cachedPilot) {
				pilotLong = { ...cachedPilot, ...updatedFields };
			} else {
				pilotLong = {
					id: id,
					cid: String(pilot.cid),
					callsign: pilot.callsign,
					aircraft: pilot.flight_plan?.aircraft_short || "A320",
					name: pilot.name,
					server: pilot.server,
					pilot_rating: PILOT_RATINGS.find((r) => r.id === pilot.pilot_rating)?.short_name || "NEW",
					military_rating: MILITARY_RATINGS.find((r) => r.id === pilot.military_rating)?.short_name || "M0",
					flight_plan: await mapPilotFlightPlan(pilot.flight_plan),
					logon_time: new Date(pilot.logon_time),
					times: null,
					live: "live",
					...updatedFields,
				};
			}

			pilotLong.vertical_speed = calculateVerticalSpeed(pilotLong, cachedPilot);
			pilotLong.times = mapPilotTimes(pilotLong, cachedPilot, pilot);

			if (cachedPilot) {
				updated.push(getPilotShort(pilotLong, cachedPilot));
			} else {
				added.push(getPilotShort(pilotLong));
			}

			newPilotsLong.push(pilotLong);
			newCached.push(pilotLong);
		}),
	);
	await Promise.all(
		vatsimData.prefiles.map(async (prefile) => {
			const id = getPilotId(prefile);

			const existsLive = newPilotsLong.some((p) => p.id === id);
			if (existsLive) return;

			const cachedPilot = cached.find((c) => c.id === id);
			if (cachedPilot?.last_update.getTime() === new Date(prefile.last_updated).getTime()) {
				newPilotsLong.push(cachedPilot);
				newCached.push(cachedPilot);
				return;
			}

			const pilotLong: PilotLong = {
				id: id,
				cid: String(prefile.cid),
				callsign: prefile.callsign,
				longitude: 0,
				latitude: 0,
				altitude_agl: 0,
				altitude_ms: 0,
				groundspeed: 0,
				vertical_speed: 0,
				heading: 0,
				aircraft: prefile.flight_plan?.aircraft_short || "A320",
				transponder: "2000",
				frequency: 122800,
				name: prefile.name,
				server: "N/A",
				pilot_rating: "NEW",
				military_rating: "M0",
				qnh_i_hg: 29.92,
				qnh_mb: 1013,
				flight_plan: await mapPilotFlightPlan(prefile.flight_plan),
				times: null,
				logon_time: new Date(prefile.last_updated),
				last_update: new Date(prefile.last_updated),
				live: "pre",
			};

			pilotLong.times = mapPilotTimes(pilotLong, cachedPilot, prefile, true);

			newPilotsLong.push(pilotLong);
			newCached.push(pilotLong);
		}),
	);

	for (const p of cached) {
		const stillOnline = newPilotsLong.some((b) => b.id === p.id);
		if (!stillOnline) {
			p.live = "off";
			newPilotsLong.push(p);
		}
	}

	cached = newCached;
	return newPilotsLong;
}

function getPilotId(pilot: VatsimPilot | VatsimPrefile): string {
	const base = `${pilot.cid}_${pilot.callsign}`;

	const plan = pilot.flight_plan;
	const variable = `${plan?.aircraft_short}_${plan?.departure}_${plan?.arrival}_${plan?.deptime}`;

	const digest = createHash("sha256")
		.update(`${base}${plan ? `_${variable}` : ""}`)
		.digest();
	const b64url = digest.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
	return b64url.slice(0, 10);
}

export function getPilotDelta(): PilotDelta {
	return {
		added,
		updated,
	};
}

export function getPilotShort(p: PilotLong): Required<PilotShort>;
export function getPilotShort(p: PilotLong, c: PilotLong): PilotShort;
export function getPilotShort(p: PilotLong, c?: PilotLong): PilotShort {
	if (!c) {
		return {
			id: p.id,
			callsign: p.callsign,
			coordinates: fromLonLat([p.longitude, p.latitude]),
			altitude_agl: p.altitude_agl,
			altitude_ms: p.altitude_ms,
			groundspeed: p.groundspeed,
			vertical_speed: p.vertical_speed,
			heading: p.heading,
			aircraft: p.aircraft,
			transponder: p.transponder,
			frequency: p.frequency,
			route: `${p.flight_plan?.departure.icao || "N/A"} ${p.flight_plan?.arrival.icao || "N/A"}`,
			flight_rules: p.flight_plan?.flight_rules || "IFR",
			ac_reg: p.flight_plan?.ac_reg || null,
		};
	} else {
		const pilotShort: PilotShort = { id: p.id };

		if (p.longitude !== c.longitude || p.latitude !== c.latitude) pilotShort.coordinates = fromLonLat([p.longitude, p.latitude]);
		if (p.altitude_agl !== c.altitude_agl) pilotShort.altitude_agl = p.altitude_agl;
		if (p.altitude_ms !== c.altitude_ms) pilotShort.altitude_ms = p.altitude_ms;
		if (p.groundspeed !== c.groundspeed) pilotShort.groundspeed = p.groundspeed;
		if (p.vertical_speed !== c.vertical_speed) pilotShort.vertical_speed = p.vertical_speed;
		if (p.heading !== c.heading) pilotShort.heading = p.heading;
		if (p.callsign !== c.callsign) pilotShort.callsign = p.callsign;
		if (p.aircraft !== c.aircraft) pilotShort.aircraft = p.aircraft;
		if (p.transponder !== c.transponder) pilotShort.transponder = p.transponder;
		if (p.frequency !== c.frequency) pilotShort.frequency = p.frequency;
		if (p.flight_plan?.departure.icao !== c.flight_plan?.departure.icao || p.flight_plan?.arrival.icao !== c.flight_plan?.arrival.icao) {
			pilotShort.route = `${p.flight_plan?.departure.icao || "N/A"} ${p.flight_plan?.arrival.icao || "N/A"}`;
		}
		if (p.flight_plan?.flight_rules !== c.flight_plan?.flight_rules) pilotShort.flight_rules = p.flight_plan?.flight_rules || "IFR";
		if (p.flight_plan?.ac_reg !== c.flight_plan?.ac_reg) pilotShort.ac_reg = p.flight_plan?.ac_reg || null;

		return pilotShort;
	}
}

function calculateVerticalSpeed(current: PilotLong, cache: PilotLong | undefined): number {
	if (!cache) return 0;

	const prevTime = new Date(cache.last_update).getTime();
	const currTime = new Date(current.last_update).getTime();
	const diffSeconds = (currTime - prevTime) / 1000;

	// Avoid divide-by-zero or extremely small timestamp differences
	if (diffSeconds < 1) return 0;

	const deltaFeet = current.altitude_ms - cache.altitude_ms;
	const vs = (deltaFeet / diffSeconds) * 60;

	return Math.round(vs);
}

async function mapPilotFlightPlan(fp?: VatsimPilotFlightPlan): Promise<PilotFlightPlan | null> {
	if (!fp) return null;

	const airports = (await rdsGetMultiple("static_airport", [fp.departure, fp.arrival])) as (StaticAirport | null)[];

	const plan: PilotFlightPlan = {
		flight_rules: fp.flight_rules === "I" ? "IFR" : "VFR",
		ac_reg: await extractAircraftRegistration(fp.remarks),
		departure: { icao: fp.departure },
		arrival: { icao: fp.arrival },
		alternate: { icao: fp.alternate },
		filed_tas: Number(fp.cruise_tas),
		filed_altitude: Number(fp.altitude),
		enroute_time: parseStrToSeconds(fp.enroute_time),
		fuel_time: parseStrToSeconds(fp.fuel_time),
		remarks: fp.remarks,
		route: fp.route,
		revision_id: fp.revision_id,
	};

	if (airports[0]) {
		plan.departure.latitude = Number(airports[0]?.latitude);
		plan.departure.longitude = Number(airports[0]?.longitude);
	}

	if (airports[1]) {
		plan.arrival.latitude = Number(airports[1]?.latitude);
		plan.arrival.longitude = Number(airports[1]?.longitude);
	}

	return plan;
}

async function extractAircraftRegistration(remarks: string): Promise<string | null> {
	const match = remarks.match(/REG\/([A-Z0-9]+)/i);
	if (!match?.[1]) return null;
	const reg = match[1].toUpperCase();

	let aircraft = await rdsGetSingle(`static_fleet:${reg}`);
	if (aircraft) return reg;

	if (reg.length > 1) {
		const format1 = `${reg[0]}-${reg.slice(1)}`;
		aircraft = await rdsGetSingle(`static_fleet:${format1}`);
		if (aircraft) return format1;
	}

	if (reg.length > 2) {
		const format2 = `${reg.slice(0, 2)}-${reg.slice(2)}`;
		aircraft = await rdsGetSingle(`static_fleet:${format2}`);
		if (aircraft) return format2;
	}

	return reg;
}

function mapPilotTimes(
	current: PilotLong,
	cache: PilotLong | undefined,
	vatsimPilot: VatsimPilot | VatsimPrefile,
	prefile?: boolean,
): PilotTimes | null {
	if (!vatsimPilot.flight_plan?.deptime) return null;

	const sched_off_block = parseStrToDate(vatsimPilot.flight_plan.deptime);
	const enrouteTimeMs = parseStrToSeconds(vatsimPilot.flight_plan.enroute_time) * 1000;
	const sched_on_block = new Date(sched_off_block.getTime() + enrouteTimeMs + TAXI_TIME_MS * 2);

	if (!cache?.times || prefile) {
		return {
			sched_off_block: roundDateTo5Min(sched_off_block),
			off_block: sched_off_block,
			lift_off: new Date(sched_off_block.getTime() + TAXI_TIME_MS),
			touch_down: new Date(sched_off_block.getTime() + TAXI_TIME_MS + enrouteTimeMs),
			sched_on_block: roundDateTo5Min(sched_on_block),
			on_block: sched_on_block,
			state: estimateInitState(current),
			stop_counter: 0,
		};
	}

	let { off_block, lift_off, touch_down, on_block, state, stop_counter } = cache.times;

	const now = new Date();

	// Not moving, @"Boarding", behind scheduled off blocks
	if (current.groundspeed === 0 && cache.times.state === "Boarding" && cache.times.off_block < now) {
		// estimate 5 mins into the future
		off_block = new Date(now.getTime() + 5 * 60 * 1000);
		on_block = new Date(off_block.getTime() + enrouteTimeMs + TAXI_TIME_MS * 2);
	}

	// Started moving, @"Boarding"
	if (current.groundspeed > 0 && cache.times.state === "Boarding") {
		off_block = now;
		on_block = new Date(off_block.getTime() + enrouteTimeMs + TAXI_TIME_MS * 2);
		state = "Taxi Out";
	}

	// Lift-Off / Climbing, @"Taxi Out"
	if (current.vertical_speed > 100 && cache.times.state === "Taxi Out") {
		lift_off = now;
		on_block = new Date(lift_off.getTime() + enrouteTimeMs + TAXI_TIME_MS);
		state = "Climb";
	}

	// Stop climbing, @"Climb"
	if (current.vertical_speed < 500 && cache.times.state === "Climb") {
		touch_down = estimateTouchdown(current) ?? touch_down;
		on_block = new Date(touch_down.getTime() + TAXI_TIME_MS);
		state = "Cruise";
	}

	// Descent, @"Cruise"
	if (current.vertical_speed < -500 && cache.times.state === "Cruise") {
		touch_down = estimateTouchdown(current) ?? touch_down;
		on_block = new Date(touch_down.getTime() + TAXI_TIME_MS);
		state = "Descent";
	}

	// Touchdown, @"Descent"
	if (current.vertical_speed > -100 && current.altitude_agl < 200 && cache.times.state === "Descent") {
		touch_down = now;
		on_block = new Date(touch_down.getTime() + TAXI_TIME_MS);
		state = "Taxi In";
	}

	// Moving, @"Taxi In"
	if (current.groundspeed > 0 && cache.times.state === "Taxi In") {
		stop_counter = 0;
	}

	// Moving, @"Taxi In", past scheduled on blocks
	if (cache.times.state !== "Taxi In" && on_block.getTime() < now.getTime()) {
		on_block = new Date(now.getTime() + TAXI_TIME_MS);
	}

	// Not moving, @"Taxi In"
	if (current.groundspeed === 0 && cache.times.state === "Taxi In") {
		if (stop_counter > 5) {
			on_block = now;
			state = "On Block";
		} else {
			stop_counter++;
		}
	}

	return {
		sched_off_block: roundDateTo5Min(sched_off_block),
		off_block,
		lift_off,
		touch_down,
		sched_on_block: roundDateTo5Min(sched_on_block),
		on_block,
		state,
		stop_counter,
	};
}

function estimateInitState(current: PilotLong): PilotTimes["state"] {
	if (
		!current.flight_plan?.departure.latitude ||
		!current.flight_plan?.departure.longitude ||
		!current.flight_plan?.arrival.latitude ||
		!current.flight_plan?.arrival.longitude
	)
		return "Cruise";

	const departureCoordinates = [current.flight_plan.departure.longitude, current.flight_plan.departure.latitude];
	const arrivalCoordinates = [current.flight_plan.arrival.longitude, current.flight_plan.arrival.latitude];

	const distToDeparture = haversineDistance(departureCoordinates, [current.longitude, current.latitude]);
	const distToArrival = haversineDistance([current.longitude, current.latitude], arrivalCoordinates);

	// Not moving, closer to departure airport
	if (current.groundspeed === 0 && distToDeparture <= distToArrival) return "Boarding";

	// Moving on ground, closer to departure airport
	if (current.groundspeed > 0 && current.altitude_agl < 100 && current.altitude_agl < 500 && distToDeparture <= distToArrival) return "Taxi Out";

	// Climbing
	if (current.vertical_speed > 500 && current.altitude_agl > 500) return "Climb";

	// Cruising
	if (current.vertical_speed < 500 && current.vertical_speed > -500 && current.altitude_agl > 2000) return "Cruise";

	// Descending
	if (current.vertical_speed < -500 && current.altitude_agl > 500) return "Descent";

	// Moving on ground, closer to arrival airport
	if (current.groundspeed > 0 && current.vertical_speed < 100 && distToDeparture > distToArrival) return "Taxi In";

	return "Cruise";
}

function estimateTouchdown(current: PilotLong): Date | null {
	if (
		!current.flight_plan?.departure.latitude ||
		!current.flight_plan?.departure.longitude ||
		!current.flight_plan?.arrival.latitude ||
		!current.flight_plan?.arrival.longitude
	)
		return null;

	const departureCoordinates = [current.flight_plan.departure.longitude, current.flight_plan.departure.latitude];
	const arrivalCoordinates = [current.flight_plan.arrival.longitude, current.flight_plan.arrival.latitude];

	// Multiply with 1.1 to account for non direct routing (temporary until Navigraph)
	const distToDeparture = haversineDistance(departureCoordinates, [current.longitude, current.latitude]) * 1.1;
	const distToArrival = haversineDistance([current.longitude, current.latitude], arrivalCoordinates) * 1.1;
	const distTotal = distToDeparture + distToArrival;

	const fractionRemaining = distToArrival / distTotal;
	const timeForRemainingDistance = fractionRemaining * current.flight_plan.enroute_time * 1000;

	// Time needed to lose energy. Covers airport fly-overs
	const timeToLooseEnergy = ((current.groundspeed - 100) / 1 + current.altitude_agl / 25) * 1000;

	return timeToLooseEnergy > timeForRemainingDistance ? new Date(Date.now() + timeToLooseEnergy) : new Date(Date.now() + timeForRemainingDistance);
}

// "0325" ==> 12,300 seconds
function parseStrToSeconds(time: string): number {
	const hours = Number(time.slice(0, 2));
	const minutes = Number(time.slice(2, 4));

	return hours * 3600 + minutes * 60;
}

// "0020" ==> 2025-11-14T00:20:00.000Z (next day)
function parseStrToDate(time: string): Date {
	const hours = Number(time.slice(0, 2));
	const minutes = Number(time.slice(2, 4));
	const now = new Date();

	const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hours, minutes, 0, 0));

	// If target time has already passed today, assume next day
	// TODO: Revise
	// if (target.getTime() < now.getTime()) {
	//     target.setUTCDate(target.getUTCDate() + 1)
	// }

	return target;
}

function roundDateTo5Min(date: Date): Date {
	const newDate = new Date(date.getTime());
	const minutes = newDate.getMinutes();

	const remainder = minutes % 5;

	if (remainder !== 0) {
		newDate.setMinutes(minutes + (5 - remainder));
	}

	newDate.setSeconds(0);
	newDate.setMilliseconds(0);

	return newDate;
}
