import type { Feature } from "ol";
import type { Point } from "ol/geom";
import type { SelectOptionType } from "@/components/shared/Select/Select";
import type { FilterValues } from "@/types/zustand";
import { getMapView } from "./init";
import { setPilotFeatures } from "./pilotFeatures";

let mapFilters: Partial<Record<keyof FilterValues, SelectOptionType[]>> = {};

export function applyMapFilters(filters: Partial<Record<keyof FilterValues, SelectOptionType[]>>): void {
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
		features = features.filter((feature) => {
			const callsign = feature.get("callsign") as string | undefined;
			return mapFilters.Airline?.some((filter) => filter.value === callsign?.slice(0, 3));
		});
	}
	if (mapFilters["Aircraft Type"] && mapFilters["Aircraft Type"].length > 0) {
		features = features.filter((feature) => {
			const aircraftType = feature.get("aircraft") as string | undefined;
			return mapFilters["Aircraft Type"]?.some((filter) => aircraftType?.includes(filter.value));
		});
	}
	if (mapFilters["Aircraft Registration"] && mapFilters["Aircraft Registration"].length > 0) {
		features = features.filter((feature) => {
			const registration = feature.get("ac_reg") as string | undefined;
			return mapFilters["Aircraft Registration"]?.some((filter) => registration?.includes(filter.value));
		});
	}
	if (mapFilters.Departure && mapFilters.Departure.length > 0) {
		features = features.filter((feature) => {
			const route = feature.get("route") as string | undefined;
			return mapFilters.Departure?.some((filter) => filter.value === route?.split(" -- ")[0]);
		});
	}
	if (mapFilters.Arrival && mapFilters.Arrival.length > 0) {
		features = features.filter((feature) => {
			const route = feature.get("route") as string | undefined;
			return mapFilters.Arrival?.some((filter) => filter.value === route?.split(" -- ")[1]);
		});
	}
	if (mapFilters.Any && mapFilters.Any.length > 0) {
		features = features.filter((feature) => {
			const route = feature.get("route") as string | undefined;
			return mapFilters.Any?.some((filter) => filter.value === route?.split(" -- ")[0] || filter.value === route?.split(" -- ")[1]);
		});
	}
	if (mapFilters.Callsign && mapFilters.Callsign.length > 0) {
		features = features.filter((feature) => {
			const callsign = feature.get("callsign") as string | undefined;
			return mapFilters.Callsign?.some((filter) => callsign?.includes(filter.value));
		});
	}
	if (mapFilters.Squawk && mapFilters.Squawk.length > 0) {
		features = features.filter((feature) => {
			const squawk = feature.get("transponder") as string | undefined;
			return mapFilters.Squawk?.some((filter) => filter.value === squawk);
		});
	}
	if (mapFilters["Flight Rules"] && mapFilters["Flight Rules"].length > 0) {
		features = features.filter((feature) => {
			const flightRules = feature.get("flight_rules") as string | undefined;
			return mapFilters["Flight Rules"]?.some((filter) => filter.value === flightRules);
		});
	}

	return features;
}
