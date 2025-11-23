import type { FIRFeature, SimAwareTraconFeature, StaticAirport } from "@sk/types/db";
import type { ControllerShort, PilotShort } from "@sk/types/vatsim";

export type PilotProperties = Omit<PilotShort, "longitude" | "latitude"> & {
	type: "pilot";
	clicked: boolean;
	hovered: boolean;
};

export interface AirportProperties extends StaticAirport {
	type: "airport";
	clicked: boolean;
	hovered: boolean;
}

export interface ControllerWithFeature extends ControllerShort {
	feature: FIRFeature | SimAwareTraconFeature | undefined;
}
