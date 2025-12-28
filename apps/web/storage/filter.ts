import type { SelectOptionType } from "@/components/Select/Select";
import { dxFindAircrafts, dxFindAirlines, dxFindAirports } from "./dexie";

export async function getFilterValues(filter: string, value: string): Promise<SelectOptionType[]> {
	if (filter === "Airline") {
		const results = await dxFindAirlines(value, 10);
		return results.map((airline) => ({ value: airline.id, label: airline.name }));
	} else if (filter === "Aircraft Type") {
		const results = await dxFindAircrafts(value, 10);
		return results.map((aircraft) => ({ value: aircraft.icao, label: aircraft.name }));
	} else if (filter === "Any" || filter === "Departure" || filter === "Arrival") {
		const results = await dxFindAirports(value, 10);
		return results.map((airport) => ({ value: airport.id, label: airport.name }));
	}
	return [];
}
