import { Airport, AirportTraffic, VatsimData } from "./types/vatsim.js";

export function mapAirports(vatsimData: VatsimData): void {
    const airportRecord: Record<string, Airport> = {}
    const routeRecord: Record<string, Map<string, number>> = {}

    for (const pilot of vatsimData.pilots) {
        if (!pilot.flight_plan?.departure) continue

        const departure = pilot.flight_plan.departure
        const arrival = pilot.flight_plan.arrival
        const delay = 0 // TODO: Get delay from PilotLong and not VatsimData

        // Add airport if not existing already
        if (!airportRecord[departure]) {
            airportRecord[departure] = initAirportRecord(departure)
        }

        if (!airportRecord[arrival]) {
            airportRecord[arrival] = initAirportRecord(arrival)
        }

        const dep_traffic = airportRecord[departure].dep_traffic
        dep_traffic.traffic_count++
        if (delay > 0 && delay < 120 * 60) {
            dep_traffic.flights_delayed++
            dep_traffic.average_delay = ((dep_traffic.average_delay * (dep_traffic.flights_delayed - 1)) + delay) / dep_traffic.flights_delayed
        }

        const arr_traffic = airportRecord[arrival].arr_traffic
        arr_traffic.traffic_count++
        if (delay > 0 && delay < 120 * 60) {
            arr_traffic.flights_delayed++
            arr_traffic.average_delay = ((arr_traffic.average_delay * (arr_traffic.flights_delayed - 1)) + delay) / arr_traffic.flights_delayed
        }

        const setRoute = (icao: string, route: string) => {
            if (!routeRecord[icao]) routeRecord[icao] = new Map()

            const current = routeRecord[icao].get(route) || 0
            routeRecord[icao].set(route, current + 1)
        }

        const route = `${departure}-${arrival}`
        setRoute(departure, route)
        setRoute(arrival, route)
    }

    // Get busiest and total routes
    for (const icao of Object.keys(routeRecord)) {
        const routes = routeRecord[icao]
        if (!routes) return

        let busiestRoute = "-"
        let maxFlights = 0

        routes.forEach((count, route) => {
            if (count > maxFlights) {
                maxFlights = count
                busiestRoute = route
            }
        })

        airportRecord[icao]!.busiest_route = busiestRoute
        airportRecord[icao]!.total_routes = routes.size
    }

    const airports = Object.values(airportRecord)

    // console.log(airports[0])
}

function initAirportRecord(icao: string): Airport {
    return {
        icao: icao,
        dep_traffic: { traffic_count: 0, average_delay: 0, flights_delayed: 0 },
        arr_traffic: { traffic_count: 0, average_delay: 0, flights_delayed: 0 },
        busiest_route: "",
        total_routes: 0,
    }
}

function mapAirportTraffic(): AirportTraffic { // TODO: Calculate airport traffic
    return {
        traffic_count: 0,
        average_delay: 0,
        flights_delayed: 0
    }
}