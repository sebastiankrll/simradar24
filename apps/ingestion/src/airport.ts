import type { AirportLong, PilotLong } from "@sk/types/vatsim";

export function mapAirports(pilotsLong: PilotLong[]): AirportLong[] {
	const airportRecord: Record<string, AirportLong> = {};
	const routeRecord: Record<string, Map<string, number>> = {};

	for (const pilotLong of pilotsLong) {
		if (!pilotLong.flight_plan?.departure.icao) continue;

		const departure = pilotLong.flight_plan.departure;
		const arrival = pilotLong.flight_plan.arrival;

		// Add airport if not existing already
		if (!airportRecord[departure.icao]) {
			airportRecord[departure.icao] = initAirportRecord(departure.icao);
		}

		if (!airportRecord[arrival.icao]) {
			airportRecord[arrival.icao] = initAirportRecord(arrival.icao);
		}

		const depTraffic = airportRecord[departure.icao].dep_traffic;
		depTraffic.traffic_count++;

		const depDelay = calculateDepartureDelay(pilotLong);
		if (depDelay !== 0) {
			depTraffic.flights_delayed++;
			depTraffic.average_delay = Math.round((depTraffic.average_delay * (depTraffic.flights_delayed - 1) + depDelay) / depTraffic.flights_delayed);
		}

		const arrTraffic = airportRecord[arrival.icao].arr_traffic;
		arrTraffic.traffic_count++;

		const arrDelay = calculateArrivalDelay(pilotLong);
		if (arrDelay !== 0) {
			arrTraffic.flights_delayed++;
			arrTraffic.average_delay = Math.round((arrTraffic.average_delay * (arrTraffic.flights_delayed - 1) + arrDelay) / arrTraffic.flights_delayed);
		}

		const setRoute = (icao: string, route: string) => {
			if (!routeRecord[icao]) routeRecord[icao] = new Map();

			const current = routeRecord[icao].get(route) || 0;
			routeRecord[icao].set(route, current + 1);
		};

		const route = `${departure.icao}-${arrival.icao}`;
		setRoute(departure.icao, route);
		setRoute(arrival.icao, route);
	}

	// Get busiest and total routes
	for (const icao of Object.keys(routeRecord)) {
		const routes = routeRecord[icao];
		if (!routes) continue;

		let busiestRoute = "-";
		let maxFlights = 0;

		routes.forEach((count, route) => {
			if (count > maxFlights) {
				maxFlights = count;
				busiestRoute = route;
			}
		});

		airportRecord[icao].busiest_route = busiestRoute;
		airportRecord[icao].total_routes = routes.size;
	}

	const airportsLong = Object.values(airportRecord);
	// console.log(airportsLong[0])

	return airportsLong;
}

function initAirportRecord(icao: string): AirportLong {
	return {
		icao: icao,
		dep_traffic: { traffic_count: 0, average_delay: 0, flights_delayed: 0 },
		arr_traffic: { traffic_count: 0, average_delay: 0, flights_delayed: 0 },
		busiest_route: "",
		total_routes: 0,
	};
}

function calculateDepartureDelay(pilot: PilotLong): number {
	if (!pilot.times?.off_block) return 0;
	const times = pilot.times;
	const delay_min = (times.off_block.getTime() - times.sched_off_block.getTime()) / 1000 / 60;

	return Math.min(Math.max(delay_min, 0), 120);
}

function calculateArrivalDelay(pilot: PilotLong): number {
	if (!pilot.times?.on_block) return 0;
	const times = pilot.times;
	const delay_min = (times.on_block.getTime() - times.sched_on_block.getTime()) / 1000 / 60;

	return Math.min(Math.max(delay_min, 0), 120);
}
