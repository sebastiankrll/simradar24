import type { StaticAirport } from "@sr24/types/db";
import type { PilotLong, PilotShort, TrackPoint } from "@sr24/types/interface";
import { fromLonLat } from "ol/proj";
import { MapService } from "@/lib/map/MapService";
import { getCachedAirport } from "@/storage/cache";

export const mapService = new MapService();

let airports: StaticAirport[] = [];
let pilotId: string = "";

export async function init(pilot: PilotLong, trackPoints: Required<TrackPoint>[]): Promise<void> {
	airports = await initAirports(pilot);

	mapService.setFeatures({ airports, trackPoints, pilots: [getPilotShort(pilot, trackPoints[0])], sunTime: new Date(trackPoints[0].timestamp) });
	mapService.setClickedFeature("pilot", pilot.id, true);
	mapService.fitFeatures({ airports: airports.map((a) => a.id), rememberView: false });

	pilotId = pilot.id;
}

export function fitRouteToView(): void {
	if (airports.length < 2) return;
	mapService.fitFeatures({ airports: airports.map((a) => a.id), rememberView: false });
}

export function followPilot(follow: boolean): void {
	if (follow) {
		mapService.followPilot({ rememberView: false });
	} else {
		mapService.unfollowPilot();
	}
}

export function updatePilot(trackPoint: Required<TrackPoint> | undefined): void {
	if (!trackPoint) return;

	const pilotShort: PilotShort = {
		id: pilotId,
		coordinates: trackPoint.coordinates,
		altitude_ms: trackPoint.altitude_ms,
		altitude_agl: trackPoint.altitude_agl,
		groundspeed: trackPoint.groundspeed,
		vertical_speed: trackPoint.vertical_speed,
		heading: trackPoint.heading,
	};
	const delta = { updated: [pilotShort], added: [] };
	mapService.updateFeatures({ pilots: delta, sunTime: new Date(trackPoint.timestamp) });
}

function getPilotShort(pilot: PilotLong, trackPoint: Required<TrackPoint> | undefined): Required<PilotShort> {
	return {
		id: pilot.id,
		callsign: pilot.callsign,
		coordinates: trackPoint?.coordinates || (fromLonLat([pilot.longitude, pilot.latitude]) as [number, number]),
		altitude_ms: trackPoint?.altitude_ms || pilot.altitude_ms,
		altitude_agl: trackPoint?.altitude_agl || pilot.altitude_agl,
		groundspeed: trackPoint?.groundspeed || pilot.groundspeed,
		vertical_speed: trackPoint?.vertical_speed || pilot.vertical_speed,
		heading: trackPoint?.heading || pilot.heading,
		aircraft: pilot.aircraft,
		transponder: pilot.transponder,
		frequency: pilot.frequency,
		route: pilot.flight_plan ? `${pilot.flight_plan.departure.icao} ${pilot.flight_plan.arrival.icao}` : "N/A",
		flight_rules: pilot.flight_plan?.flight_rules || "IFR",
		ac_reg: pilot.flight_plan?.ac_reg || "A320",
	};
}

async function initAirports(pilot: PilotLong): Promise<StaticAirport[]> {
	if (!pilot.flight_plan) return [];

	return (await Promise.all([getCachedAirport(pilot.flight_plan.departure.icao), getCachedAirport(pilot.flight_plan.arrival.icao)])).filter(
		(a) => a !== null,
	);
}
