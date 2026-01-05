import { rdsGetSingle, rdsSetSingle } from "@sr24/db/redis";
import type { ControllerLong, DashboardData, DashboardHistory, DashboardStats } from "@sr24/types/interface";
import type { VatsimData, VatsimEvent, VatsimEventData } from "@sr24/types/vatsim";
import axios from "axios";

const VATSIM_EVENT_URL = "https://my.vatsim.net/api/v2/events/latest";
const VATSIM_EVENT_INTERVAL = 60 * 60 * 1000;
const VATSIM_HISTORY_INTERVAL = 10 * 60 * 1000;
const MAX_HISTORY_HOURS = 24 * 7;

let events: VatsimEvent[] = [];
let history: DashboardHistory[] = [];

export async function updateDashboardData(vatsimData: VatsimData, controllers: ControllerLong[]): Promise<DashboardData> {
	const events = await getDashboardEvents();
	const stats = getDashboardStats(vatsimData, controllers);
	const history = await getDashboardHistory(vatsimData, controllers);

	return {
		events,
		stats,
		history,
	};
}

let lastEventUpdateTimestamp: Date | null = null;

async function getDashboardEvents(): Promise<VatsimEvent[]> {
	if (lastEventUpdateTimestamp && Date.now() - lastEventUpdateTimestamp.getTime() < VATSIM_EVENT_INTERVAL) {
		return events;
	}
	lastEventUpdateTimestamp = new Date();

	const response = await axios.get<VatsimEventData>(VATSIM_EVENT_URL);
	const vatsimEvents = response.data.data;

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 3);

	events = vatsimEvents.filter((event) => {
		const eventDate = new Date(event.start_time);
		return eventDate >= today && eventDate < tomorrow;
	});
	return events;
}

function getDashboardStats(vatsimData: VatsimData, controllersLong: ControllerLong[]): DashboardStats {
	const pilots = new Set(vatsimData.pilots.map((p) => p.cid)).size;
	const controllers = new Set(controllersLong.map((c) => c.cid)).size;
	const supervisors = new Set(controllersLong.filter((c) => c.facility === 0 || c.facility === 1).map((c) => c.cid)).size;

	const _airports = Array.from(
		vatsimData.pilots.reduce((acc, pilot) => {
			if (pilot.flight_plan) {
				const departure = pilot.flight_plan.departure;
				const arrival = pilot.flight_plan.arrival;
				const depData = acc.get(departure) || { departures: 0, arrivals: 0 };
				const arrData = acc.get(arrival) || { departures: 0, arrivals: 0 };
				acc.set(departure, { ...depData, departures: depData.departures + 1 });
				acc.set(arrival, { ...arrData, arrivals: arrData.arrivals + 1 });
			}
			return acc;
		}, new Map<string, { departures: number; arrivals: number }>()),
	).map(([icao, counts]) => ({ icao, departures: counts.departures, arrivals: counts.arrivals }));

	const busiestAirports = _airports.sort((a, b) => b.departures + b.arrivals - (a.departures + a.arrivals)).slice(0, 5);

	const quietestAirports = _airports.sort((a, b) => a.departures + a.arrivals - (b.departures + b.arrivals)).slice(0, 5);

	const _routes = Array.from(
		vatsimData.pilots.reduce((acc, pilot) => {
			if (pilot.flight_plan) {
				const routeKey = `${pilot.flight_plan.departure}-${pilot.flight_plan.arrival}`;
				acc.set(routeKey, (acc.get(routeKey) || 0) + 1);
			}
			return acc;
		}, new Map<string, number>()),
	).map(([route, count]) => ({ route, count }));

	const busiestRoutes = _routes.sort((a, b) => b.count - a.count).slice(0, 5);

	const quietestRoutes = _routes.sort((a, b) => a.count - b.count).slice(0, 5);

	const _aircrafts = Array.from(
		vatsimData.pilots.reduce((acc, pilot) => {
			if (pilot.flight_plan?.aircraft_short) {
				acc.set(pilot.flight_plan.aircraft_short, (acc.get(pilot.flight_plan.aircraft_short) || 0) + 1);
			}
			return acc;
		}, new Map<string, number>()),
	).map(([aircraft, count]) => ({ aircraft, count }));

	const busiestAircrafts = _aircrafts.sort((a, b) => b.count - a.count).slice(0, 5);

	const rarestAircrafts = _aircrafts.sort((a, b) => a.count - b.count).slice(0, 5);

	const _controllers = controllersLong.map((c) => ({ callsign: c.callsign, count: c.connections }));

	const busiestControllers = _controllers.sort((a, b) => b.count - a.count).slice(0, 5);

	const quietestControllers = _controllers.sort((a, b) => a.count - b.count).slice(0, 5);

	return {
		pilots,
		controllers,
		supervisors,
		busiestAirports,
		quietestAirports,
		busiestRoutes,
		quietestRoutes,
		busiestAircrafts,
		rarestAircrafts,
		busiestControllers,
		quietestControllers,
	};
}

let lastHistoryUpdateTimestamp: Date | null = null;

async function getDashboardHistory(vatsimData: VatsimData, controllersLong: ControllerLong[]): Promise<DashboardHistory[]> {
	if (history.length === 0) {
		history = (await rdsGetSingle("dashboard:history")) || [];
	}

	const now = Date.now();
	if (lastHistoryUpdateTimestamp && now - lastHistoryUpdateTimestamp.getTime() < VATSIM_HISTORY_INTERVAL) {
		return history;
	}
	lastHistoryUpdateTimestamp = new Date();

	history.push({ t: new Date(), v: { pilots: vatsimData.pilots.length, controllers: controllersLong.length } });
	const cutoff = now - MAX_HISTORY_HOURS * 60 * 60 * 1000;
	history = history.filter((entry) => new Date(entry.t).getTime() >= cutoff);

	rdsSetSingle("dashboard:history", history);
	return history;
}
