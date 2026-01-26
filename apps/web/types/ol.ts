import type { PilotShort } from "@sr24/types/interface";

export interface PilotProperties extends PilotShort {
	type: "pilot";
	vx?: number;
	vy?: number;
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
