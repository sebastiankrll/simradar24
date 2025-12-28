import type { Feature } from "ol";
import type { Point } from "ol/geom";
import type { SelectOptionType } from "@/components/Select/Select";
import type { FilterValues } from "@/types/zustand";
import { getMapView } from "./init";
import { setPilotFeatures } from "./pilotFeatures";

let mapFilters: Partial<Record<keyof FilterValues, SelectOptionType[] | number[]>> = {};

export function applyMapFilters(filters: typeof mapFilters): void {
	mapFilters = filters;
	const view = getMapView();
	if (!view) return;

	const extent = view.calculateExtent();
	const zoom = view.getZoom() || 0;
	setPilotFeatures(extent, zoom);
}

export function filterPilotFeatures(features: Feature<Point>[]): Feature<Point>[] {
	if (Object.keys(mapFilters).length === 0) return features;

	if (mapFilters.Airline && mapFilters.Airline.length > 0) {
		const filters = mapFilters.Airline as SelectOptionType[];
		features = features.filter((feature) => {
			const callsign = feature.get("callsign") as string | undefined;
			return filters?.some((filter) => filter.value === callsign?.slice(0, 3));
		});
	}
	if (mapFilters["Aircraft Type"] && mapFilters["Aircraft Type"].length > 0) {
		const filters = mapFilters["Aircraft Type"] as SelectOptionType[];
		features = features.filter((feature) => {
			const aircraftType = feature.get("aircraft") as string | undefined;
			return filters?.some((filter) => aircraftType?.includes(filter.value));
		});
	}
	if (mapFilters["Aircraft Registration"] && mapFilters["Aircraft Registration"].length > 0) {
		const filters = mapFilters["Aircraft Registration"] as SelectOptionType[];
		features = features.filter((feature) => {
			const registration = feature.get("ac_reg") as string | undefined;
			return filters?.some((filter) => registration?.includes(filter.value));
		});
	}
	if (mapFilters.Departure && mapFilters.Departure.length > 0) {
		const filters = mapFilters.Departure as SelectOptionType[];
		features = features.filter((feature) => {
			const route = feature.get("route") as string | undefined;
			return filters?.some((filter) => filter.value === route?.split(" -- ")[0]);
		});
	}
	if (mapFilters.Arrival && mapFilters.Arrival.length > 0) {
		const filters = mapFilters.Arrival as SelectOptionType[];
		features = features.filter((feature) => {
			const route = feature.get("route") as string | undefined;
			return filters?.some((filter) => filter.value === route?.split(" -- ")[1]);
		});
	}
	if (mapFilters.Any && mapFilters.Any.length > 0) {
		const filters = mapFilters.Any as SelectOptionType[];
		features = features.filter((feature) => {
			const route = feature.get("route") as string | undefined;
			return filters?.some((filter) => filter.value === route?.split(" -- ")[0] || filter.value === route?.split(" -- ")[1]);
		});
	}
	if (mapFilters.Callsign && mapFilters.Callsign.length > 0) {
		const filters = mapFilters.Callsign as SelectOptionType[];
		features = features.filter((feature) => {
			const callsign = feature.get("callsign") as string | undefined;
			return filters?.some((filter) => callsign?.includes(filter.value));
		});
	}
	if (mapFilters.Squawk && mapFilters.Squawk.length > 0) {
		const filters = mapFilters.Squawk as SelectOptionType[];
		features = features.filter((feature) => {
			const squawk = feature.get("transponder") as string | undefined;
			return filters?.some((filter) => filter.value === squawk);
		});
	}
	if (mapFilters["Flight Rules"] && mapFilters["Flight Rules"].length > 0) {
		const filters = mapFilters["Flight Rules"] as SelectOptionType[];
		features = features.filter((feature) => {
			const flightRules = feature.get("flight_rules") as string | undefined;
			return filters?.some((filter) => filter.value === flightRules);
		});
	}
	if (mapFilters["Barometric Altitude"] && mapFilters["Barometric Altitude"].length > 0) {
		const [min, max] = mapFilters["Barometric Altitude"] as number[];
		features = features.filter((feature) => {
			const altitude = feature.get("altitude_ms") as number | undefined;
			return altitude !== undefined && altitude >= min && altitude <= max;
		});
	}
	if (mapFilters.Groundspeed && mapFilters.Groundspeed.length > 0) {
		const [min, max] = mapFilters.Groundspeed as number[];
		features = features.filter((feature) => {
			const groundspeed = feature.get("groundspeed") as number | undefined;
			return groundspeed !== undefined && groundspeed >= min && groundspeed <= max;
		});
	}

	return features;
}
