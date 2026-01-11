import type { StaticAirline, StaticAirport } from "@sr24/types/db";
import type { PilotLong } from "@sr24/types/interface";

export type QueryResult = {
	airlines: StaticAirline[];
	airports: StaticAirport[];
	pilots: PilotResult;
};

export type PilotResult = {
	live: PilotLong[];
	offline: PilotLong[];
};

export type Match = {
	name?: string;
};

export type PilotMatch = {
	callsign?: string;
	departure?: string;
	arrival?: string;
	cid?: string;
	name?: string;
};
