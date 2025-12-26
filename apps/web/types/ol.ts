import type { PilotShort } from "@sr24/types/vatsim";
import type { Coordinate } from "ol/coordinate";

export interface PilotProperties extends Required<PilotShort> {
	type: "pilot";
	coord3857: Coordinate;
	clicked: boolean;
	hovered: boolean;
}

export interface AirportProperties {
	type: "airport";
	size: "s" | "m" | "l";
	clicked: boolean;
	hovered: boolean;
}

export interface ControllerLabelProperties {
	type: "fir" | "tracon";
	label: string;
	clicked: boolean;
	hovered: boolean;
}

export interface AirportLabelProperties {
	type: "airport";
	size: "s" | "m" | "l";
	offset: number;
}
