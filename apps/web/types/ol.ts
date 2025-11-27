import type { PilotShort } from "@sk/types/vatsim";

export type PilotProperties = Omit<PilotShort, "longitude" | "latitude"> & {
	type: "pilot";
	clicked: boolean;
	hovered: boolean;
};

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
