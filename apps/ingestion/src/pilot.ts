import { rdsGetMultiple } from "@sk/db/redis";
import type { StaticAirport } from "@sk/types/db";
import type {
	PilotFlightPlan,
	PilotLong,
	PilotTimes,
	VatsimData,
	VatsimPilot,
	VatsimPilotFlightPlan,
} from "@sk/types/vatsim";
import { haversineDistance } from "./utils/index.js";

const TAXI_TIME_MS = 5 * 60 * 1000;
let cachedPilots: PilotLong[] = [];

export async function mapPilots(
	latestVatsimData: VatsimData,
): Promise<PilotLong[]> {
	const pilotsLong: PilotLong[] = latestVatsimData.pilots.map((pilot) => {
		const uid = `${pilot.cid}_${pilot.callsign}_${pilot.logon_time}`;
		const cachedPilot = cachedPilots.find((c) => c.uid === uid);

		const transceiverData = latestVatsimData.transceivers.find(
			(transceiver) => transceiver.callsign === pilot.callsign,
		);
		const transceiver = transceiverData?.transceivers[0];

		const updatedFields = {
			latitude: pilot.latitude,
			longitude: pilot.longitude,
			altitude_agl: transceiver?.heightAglM
				? Math.round(transceiver.heightAglM * 3.28084)
				: pilot.altitude,
			altitude_ms: transceiver?.heightMslM
				? Math.round(transceiver.heightMslM * 3.28084)
				: pilot.altitude,
			groundspeed: pilot.groundspeed,
			vertical_speed: 0,
			heading: pilot.heading,
			timestamp: new Date(pilot.last_updated),
			transponder: pilot.flight_plan?.assigned_transponder
				? Number(pilot.flight_plan?.assigned_transponder)
				: 2000,
			frequency:
				Number(transceiver?.frequency.toString().slice(0, 6)) || 122_800,
			qnh_i_hg: pilot.qnh_i_hg,
			qnh_mb: pilot.qnh_mb,
		};

		let pilotLong: PilotLong;
		if (cachedPilot) {
			// hit cache, use cache
			pilotLong = { ...cachedPilot, ...updatedFields };
			// console.log("Hit cache!")
		} else {
			// cache missed, re-create
			pilotLong = {
				uid: `${pilot.cid}_${pilot.callsign}_${pilot.logon_time}`,
				cid: pilot.cid,
				callsign: pilot.callsign,
				aircraft: pilot.flight_plan?.aircraft_short || "A320",
				name: pilot.name,
				server: pilot.server,
				pilot_rating: pilot.pilot_rating,
				military_rating: pilot.military_rating,
				flight_plan: mapPilotFlightPlan(pilot.flight_plan),
				departure: pilot.flight_plan?.departure || null,
				arrival: pilot.flight_plan?.arrival || null,
				logon_time: new Date(pilot.logon_time),
				times: null,
				...updatedFields,
			};
			// console.log("Missed cache, re-creating...")
		}

		pilotLong.vertical_speed = calculateVerticalSpeed(pilotLong, cachedPilot);
		pilotLong.times = mapPilotTimes(pilotLong, cachedPilot, pilot);

		return pilotLong;
	});

	// Fetch airport coordinates for flight time estimation and store in PilotLong to minimize DB access
	const icaos = getUniqueAirports(pilotsLong);
	const airports = (await rdsGetMultiple(
		"static_airport",
		icaos,
	)) as (StaticAirport | null)[];

	for (const pilot of pilotsLong) {
		const fp = pilot.flight_plan;
		if (!fp) continue;

		if (!fp.departure.latitude) {
			const depInfo = airports.find((a) => a?.id === fp.departure.icao);
			fp.departure.latitude = Number(depInfo?.latitude);
			fp.departure.longitude = Number(depInfo?.longitude);

			const arrInfo = airports.find((a) => a?.id === fp.arrival.icao);
			fp.arrival.latitude = Number(arrInfo?.latitude);
			fp.arrival.longitude = Number(arrInfo?.longitude);
		}
	}

	cachedPilots = pilotsLong;
	// console.log(pilotsLong[0])
	return pilotsLong;
}

function calculateVerticalSpeed(
	current: PilotLong,
	cache: PilotLong | undefined,
): number {
	if (!cache) return 0;

	const prevTime = new Date(cache.timestamp).getTime();
	const currTime = new Date(current.timestamp).getTime();
	const diffSeconds = (currTime - prevTime) / 1000;

	// Avoid divide-by-zero or extremely small timestamp differences
	if (diffSeconds < 1) return 0;

	const deltaFeet = current.altitude_ms - cache.altitude_ms;
	const vs = (deltaFeet / diffSeconds) * 60;

	return Math.round(vs);
}

function mapPilotFlightPlan(
	fp?: VatsimPilotFlightPlan,
): PilotFlightPlan | null {
	if (!fp) return null;
	return {
		flight_rules: fp.flight_rules === "I" ? "IFR" : "VFR",
		ac_reg: extractAircraftRegistration(fp.remarks),
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
}

function extractAircraftRegistration(remarks: string): string | null {
	const match = remarks.match(/REG\/([A-Z0-9]+)/i);
	return match?.[1] ?? null;
}

function mapPilotTimes(
	current: PilotLong,
	cache: PilotLong | undefined,
	vatsimPilot: VatsimPilot,
): PilotTimes | null {
	if (!vatsimPilot.flight_plan?.deptime) return null;

	const sched_off_block = parseStrToDate(vatsimPilot.flight_plan.deptime);
	const enrouteTimeMs =
		parseStrToSeconds(vatsimPilot.flight_plan.enroute_time) * 1000;
	const sched_on_block = new Date(
		sched_off_block.getTime() + enrouteTimeMs + TAXI_TIME_MS * 2,
	);

	if (!cache?.times) {
		return {
			sched_off_block: roundDateTo5Min(sched_off_block),
			off_block: sched_off_block,
			lift_off: new Date(sched_off_block.getTime() + TAXI_TIME_MS),
			touch_down: new Date(
				sched_off_block.getTime() + TAXI_TIME_MS + enrouteTimeMs,
			),
			sched_on_block: roundDateTo5Min(sched_on_block),
			on_block: sched_on_block,
			state: estimateInitState(current),
			stop_counter: 0,
		};
	}

	let { off_block, lift_off, touch_down, on_block, state, stop_counter } =
		cache.times;

	const now = new Date();

	// Not moving, @"Boarding", behind scheduled off blocks
	if (
		current.groundspeed === 0 &&
		cache.times.state === "Boarding" &&
		cache.times.off_block < now
	) {
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
	if (
		current.vertical_speed > -100 &&
		current.altitude_agl < 200 &&
		cache.times.state === "Descent"
	) {
		touch_down = now;
		on_block = new Date(touch_down.getTime() + TAXI_TIME_MS);
		state = "Taxi In";
	}

	// Moving, @"Taxi In"
	if (current.groundspeed > 0 && cache.times.state === "Taxi In") {
		stop_counter = 0;
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

function estimateInitState(current: PilotLong): string {
	if (
		!current.flight_plan?.departure.latitude ||
		!current.flight_plan?.departure.longitude ||
		!current.flight_plan?.arrival.latitude ||
		!current.flight_plan?.arrival.longitude
	)
		return "Cruise";

	const departureCoordinates = [
		current.flight_plan.departure.latitude,
		current.flight_plan.departure.longitude,
	];
	const arrivalCoordinates = [
		current.flight_plan.arrival.latitude,
		current.flight_plan.arrival.longitude,
	];
	const currentCoordinates = [current.latitude, current.longitude];

	const distToDeparture = haversineDistance(
		departureCoordinates,
		currentCoordinates,
	);
	const distToArrival = haversineDistance(
		currentCoordinates,
		arrivalCoordinates,
	);

	// Not moving, closer to departure airport
	if (current.groundspeed === 0 && distToDeparture <= distToArrival)
		return "Boarding";

	// Moving on ground, closer to departure airport
	if (
		current.groundspeed > 0 &&
		current.vertical_speed < 100 &&
		distToDeparture <= distToArrival
	)
		return "Taxi Out";

	// Climbing
	if (current.vertical_speed > 500) return "Climb";

	// Cruising
	if (current.vertical_speed < 100 && current.vertical_speed > -100)
		return "Cruise";

	// Descending
	if (current.vertical_speed < -500) return "Descend";

	// Moving on ground, closer to arrival airport
	if (
		current.groundspeed > 0 &&
		current.vertical_speed < 100 &&
		distToDeparture > distToArrival
	)
		return "Taxi In";

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

	const departureCoordinates = [
		current.flight_plan.departure.latitude,
		current.flight_plan.departure.longitude,
	];
	const arrivalCoordinates = [
		current.flight_plan.arrival.latitude,
		current.flight_plan.arrival.longitude,
	];
	const currentCoordinates = [current.latitude, current.longitude];

	// Multiply with 1.1 to account for non direct routing (temporary until Navigraph)
	const distToDeparture =
		haversineDistance(departureCoordinates, currentCoordinates) * 1.1;
	const distToArrival =
		haversineDistance(currentCoordinates, arrivalCoordinates) * 1.1;
	const distTotal = distToDeparture + distToArrival;
	const distanceRemaining = distToDeparture / distTotal;

	const timeForRemainingDistance =
		distanceRemaining * current.flight_plan.enroute_time * 1000;

	// Time needed to loose energy. Covers airport fly-overs
	const timeToLooseEnergy =
		((current.groundspeed - 100) / 1 + current.altitude_agl / 25) * 1000; // Time needed for 1 kt/s deacceleration and 25 ft/s (1500 ft/min) descent rate

	return timeToLooseEnergy > timeForRemainingDistance
		? new Date(Date.now() + timeToLooseEnergy)
		: new Date(Date.now() + timeForRemainingDistance);
}

function getUniqueAirports(pilotsLong: PilotLong[]): string[] {
	const icaoSet = new Set<string>();

	for (const pilot of pilotsLong) {
		const fp = pilot.flight_plan;
		if (!fp) continue;

		if (!fp.departure.latitude) icaoSet.add(fp.departure.icao);
		if (!fp.arrival.latitude) icaoSet.add(fp.arrival.icao);
	}

	return Array.from(icaoSet);
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

	const target = new Date(
		Date.UTC(
			now.getUTCFullYear(),
			now.getUTCMonth(),
			now.getUTCDate(),
			hours,
			minutes,
			0,
			0,
		),
	);

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
